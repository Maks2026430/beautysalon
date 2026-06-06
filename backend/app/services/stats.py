"""Admin statistics: revenue, master utilization, top services, funnel."""
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.redis import redis_client
from app.models import Appointment, Master
from app.schemas.admin import (
    Funnel,
    MasterUtilization,
    MastersLoad,
    RevenuePoint,
    RevenueStats,
    TopService,
)

# Statuses that count as realized/booked revenue.
REVENUE_STATUSES = ("confirmed", "completed")


def _working_minutes(master: Master, date_from: date, date_to: date) -> float:
    """Total scheduled working minutes for a master over the date range."""
    per_weekday: dict[int, float] = defaultdict(float)
    for sch in master.schedules:
        if sch.day_of_week is not None and sch.start_time and sch.end_time:
            mins = (
                datetime.combine(date.min, sch.end_time)
                - datetime.combine(date.min, sch.start_time)
            ).total_seconds() / 60
            per_weekday[sch.day_of_week] += mins
    total = 0.0
    d = date_from
    while d <= date_to:
        total += per_weekday.get(d.weekday(), 0.0)
        d += timedelta(days=1)
    return total


def funnel_incr(bucket: str) -> None:
    """Increment a daily funnel counter (bucket = 'started' | 'completed')."""
    key = f"funnel:{bucket}:{date.today().isoformat()}"
    redis_client.incr(key)
    redis_client.expire(key, 60 * 60 * 24 * 120)  # keep ~4 months


def _appointments_in_range(db: Session, date_from: date, date_to: date) -> list[Appointment]:
    start_dt = datetime.combine(date_from, time.min)
    end_dt = datetime.combine(date_to, time.min) + timedelta(days=1)
    return list(
        db.scalars(
            select(Appointment).where(
                Appointment.starts_at >= start_dt, Appointment.starts_at < end_dt
            )
        ).all()
    )


def revenue_stats(db: Session, date_from: date, date_to: date) -> RevenueStats:
    """Realized revenue total, daily series (zero-filled), and top services."""
    appts = _appointments_in_range(db, date_from, date_to)

    rev_by_date: dict[date, float] = defaultdict(float)
    top: dict = defaultdict(lambda: {"count": 0, "revenue": 0.0, "name": ""})
    revenue_total = 0.0

    for a in appts:
        if a.status in REVENUE_STATUSES:
            price = float(a.price or 0)
            rev_by_date[a.starts_at.date()] += price
            revenue_total += price
            t = top[a.service_id]
            t["count"] += 1
            t["revenue"] += price
            t["name"] = a.service.name

    series: list[RevenuePoint] = []
    d = date_from
    while d <= date_to:
        series.append(RevenuePoint(date=d, amount=round(rev_by_date.get(d, 0.0), 2)))
        d += timedelta(days=1)

    top_services = [
        TopService(name=t["name"], count=t["count"], revenue=round(t["revenue"], 2))
        for t in sorted(top.values(), key=lambda x: x["count"], reverse=True)[:5]
    ]

    return RevenueStats(
        date_from=date_from,
        date_to=date_to,
        revenue_total=round(revenue_total, 2),
        revenue_series=series,
        top_services=top_services,
    )


def masters_load(db: Session, date_from: date, date_to: date) -> MastersLoad:
    """Per-master utilization: booked minutes / scheduled working minutes."""
    appts = _appointments_in_range(db, date_from, date_to)

    booked_minutes: dict = defaultdict(float)
    for a in appts:
        if a.status in REVENUE_STATUSES:
            booked_minutes[a.master_id] += (a.ends_at - a.starts_at).total_seconds() / 60

    utilization: list[MasterUtilization] = []
    for m in db.scalars(select(Master).where(Master.is_active.is_(True))).all():
        working = _working_minutes(m, date_from, date_to)
        pct = round(booked_minutes.get(m.id, 0.0) / working * 100, 1) if working else 0.0
        utilization.append(MasterUtilization(master=m.name, percent=min(pct, 100.0)))

    return MastersLoad(date_from=date_from, date_to=date_to, masters=utilization)


def funnel_stats(db: Session, date_from: date, date_to: date) -> Funnel:
    """Bot funnel: started/completed (Redis daily counters) + booked (appointments)."""
    start_dt = datetime.combine(date_from, time.min)
    end_dt = datetime.combine(date_to, time.min) + timedelta(days=1)

    started = completed = 0
    d = date_from
    while d <= date_to:
        started += int(redis_client.get(f"funnel:started:{d.isoformat()}") or 0)
        completed += int(redis_client.get(f"funnel:completed:{d.isoformat()}") or 0)
        d += timedelta(days=1)
    booked = (
        db.scalar(
            select(func.count())
            .select_from(Appointment)
            .where(Appointment.created_at >= start_dt, Appointment.created_at < end_dt)
        )
        or 0
    )
    return Funnel(started=started, completed=completed, booked=int(booked))
