"""Booking logic: free-slot computation, creation, and cancellation.

Times are stored and compared as naive UTC throughout.
"""
from datetime import date, datetime, time, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Appointment, Master, Service, User

ACTIVE_STATUSES = ("pending", "confirmed")
CANCEL_CUTOFF = timedelta(hours=2)   # can't cancel later than 2h before (spec 6.2)
AVAILABILITY_DAYS = 14
FIRST_VISIT_DISCOUNT = 20            # «Скидка 20% на первое посещение»


def _require_service(db: Session, service_id) -> Service:
    svc = db.get(Service, service_id)
    if svc is None or not svc.is_active:
        raise HTTPException(status_code=404, detail="service_not_found")
    return svc


def _require_master(db: Session, master_id) -> Master:
    m = db.get(Master, master_id)
    if m is None or not m.is_active:
        raise HTTPException(status_code=404, detail="master_not_found")
    return m


def _active_appointments(db: Session, master_id, window_start, window_end) -> list[Appointment]:
    stmt = select(Appointment).where(
        Appointment.master_id == master_id,
        Appointment.status.in_(ACTIVE_STATUSES),
        Appointment.starts_at < window_end,
        Appointment.ends_at > window_start,
    )
    return list(db.scalars(stmt).all())


def _overlaps(start: datetime, end: datetime, existing: list[Appointment]) -> bool:
    return any(a.starts_at < end and a.ends_at > start for a in existing)


def available_slots(db: Session, master_id, service_id, days: int = AVAILABILITY_DAYS):
    """Return (service, [slot_start, ...]) for free slots over the next `days`."""
    service = _require_service(db, service_id)
    master = _require_master(db, master_id)
    duration = timedelta(minutes=service.duration_minutes)

    now = datetime.utcnow()
    window_end = now + timedelta(days=days)
    existing = _active_appointments(db, master.id, now, window_end)

    by_weekday: dict[int, list] = {}
    for sch in master.schedules:
        if sch.day_of_week is not None and sch.start_time and sch.end_time:
            by_weekday.setdefault(sch.day_of_week, []).append(sch)

    slots: list[datetime] = []
    for offset in range(days + 1):
        day = (now + timedelta(days=offset)).date()
        for sch in by_weekday.get(day.weekday(), []):
            slot_start = datetime.combine(day, sch.start_time)
            day_end = datetime.combine(day, sch.end_time)
            while slot_start + duration <= day_end:
                slot_end = slot_start + duration
                if slot_start > now and not _overlaps(slot_start, slot_end, existing):
                    slots.append(slot_start)
                slot_start = slot_end  # back-to-back slots of the service length
    slots.sort()
    return service, slots


def master_free_slots(
    db: Session, master_id, date_from: date, date_to: date, duration_minutes: int = 30
) -> list[datetime]:
    """Free slot start times for a master across [date_from, date_to] (inclusive),
    stepping by `duration_minutes` within the master's working hours.

    Used by GET /masters/{id}/slots. Past times and overlaps with active
    appointments are excluded.
    """
    master = _require_master(db, master_id)
    duration = timedelta(minutes=duration_minutes)

    now = datetime.utcnow()
    window_start = datetime.combine(date_from, time.min)
    window_end = datetime.combine(date_to, time.min) + timedelta(days=1)
    existing = _active_appointments(db, master.id, max(window_start, now), window_end)

    by_weekday: dict[int, list] = {}
    for sch in master.schedules:
        if sch.day_of_week is not None and sch.start_time and sch.end_time:
            by_weekday.setdefault(sch.day_of_week, []).append(sch)

    slots: list[datetime] = []
    day = date_from
    while day <= date_to:
        for sch in by_weekday.get(day.weekday(), []):
            slot_start = datetime.combine(day, sch.start_time)
            day_end = datetime.combine(day, sch.end_time)
            while slot_start + duration <= day_end:
                slot_end = slot_start + duration
                if slot_start > now and not _overlaps(slot_start, slot_end, existing):
                    slots.append(slot_start)
                slot_start = slot_end
        day += timedelta(days=1)
    slots.sort()
    return slots


def _within_schedule(master: Master, start: datetime, end: datetime) -> bool:
    for sch in master.schedules:
        if sch.day_of_week == start.weekday() and sch.start_time and sch.end_time:
            day = start.date()
            if datetime.combine(day, sch.start_time) <= start and end <= datetime.combine(day, sch.end_time):
                return True
    return False


def create_appointment(db: Session, user: User, master_id, service_id, starts_at: datetime) -> Appointment:
    service = _require_service(db, service_id)
    master = _require_master(db, master_id)

    # Normalize to naive UTC if a tz-aware value arrived.
    if starts_at.tzinfo is not None:
        starts_at = starts_at.astimezone(tz=None).replace(tzinfo=None)

    now = datetime.utcnow()
    if starts_at <= now:
        raise HTTPException(status_code=400, detail="slot_in_past")

    ends_at = starts_at + timedelta(minutes=service.duration_minutes)

    if not _within_schedule(master, starts_at, ends_at):
        raise HTTPException(status_code=400, detail="outside_working_hours")

    existing = _active_appointments(db, master.id, starts_at, ends_at)
    if _overlaps(starts_at, ends_at, existing):
        raise HTTPException(status_code=409, detail="slot_taken")

    # Первое посещение (нет ни одной прошлой записи) → скидка 20%.
    prior = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.user_id == user.id)
    )
    is_first_visit = not prior
    price = float(service.price)
    if is_first_visit:
        price = round(price * (100 - FIRST_VISIT_DISCOUNT) / 100, 2)

    appt = Appointment(
        user_id=user.id,
        master_id=master.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status="confirmed",
        price=price,
        discount_applied=is_first_visit,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Fire-and-forget SMS (immediate + 24h/2h reminders) via Celery.
    from worker.tasks import schedule_for_appointment

    schedule_for_appointment(appt)
    return appt


def cancel_appointment(db: Session, user: User, appointment_id) -> Appointment:
    appt = db.get(Appointment, appointment_id)
    if appt is None or appt.user_id != user.id:
        raise HTTPException(status_code=404, detail="appointment_not_found")
    if appt.status not in ACTIVE_STATUSES:
        raise HTTPException(status_code=400, detail="not_cancellable")
    if appt.starts_at - datetime.utcnow() < CANCEL_CUTOFF:
        raise HTTPException(status_code=400, detail="cancel_too_late")

    appt.status = "cancelled"
    db.commit()
    db.refresh(appt)

    from worker.tasks import send_appointment_cancelled

    send_appointment_cancelled.delay(str(appt.id))
    return appt
