"""Admin / CRM API (spec 7). Read = any staff; write = admin only."""
import csv
import io
from datetime import date, datetime, time, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_staff, require_admin
from app.core.security import hash_password
from app.models import (
    Appointment,
    DiscountOffer,
    Master,
    MasterSchedule,
    Service,
    Staff,
    User,
)
from app.schemas.admin import (
    APPOINTMENT_STATUSES,
    STAFF_ROLES,
    AppointmentAdminOut,
    ClientDetail,
    ClientListItem,
    ClientOffer,
    Funnel,
    ImportResult,
    MasterAdminOut,
    MasterCreate,
    MastersLoad,
    MasterScheduleReplace,
    MasterUpdate,
    RevenueStats,
    ServiceAdminOut,
    ServiceCreate,
    ServiceImport,
    ServiceUpdate,
    StaffCreate,
    StaffUpdate,
    StatusUpdate,
)
from app.schemas.auth import StaffOut
from app.services import stats as stats_service

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Schedule ────────────────────────────────────────────────────────
@router.get("/appointments", response_model=list[AppointmentAdminOut])
def list_appointments(
    date_from: date = Query(default_factory=date.today),
    date_to: date = Query(default_factory=date.today),
    master_id: str | None = Query(None),
    _: object = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> list[Appointment]:
    start = datetime.combine(date_from, time.min)
    end = datetime.combine(date_to, time.min) + timedelta(days=1)
    stmt = select(Appointment).where(
        Appointment.starts_at >= start, Appointment.starts_at < end
    )
    if master_id:
        stmt = stmt.where(Appointment.master_id == master_id)
    stmt = stmt.order_by(Appointment.starts_at)
    return list(db.scalars(stmt).all())


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentAdminOut)
def update_status(
    appointment_id: str,
    body: StatusUpdate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Appointment:
    if body.status not in APPOINTMENT_STATUSES:
        raise HTTPException(status_code=400, detail="invalid_status")
    appt = db.get(Appointment, appointment_id)
    if appt is None:
        raise HTTPException(status_code=404, detail="appointment_not_found")
    became_cancelled = body.status == "cancelled" and appt.status != "cancelled"
    appt.status = body.status
    db.commit()
    db.refresh(appt)
    if became_cancelled:
        from worker.tasks import send_appointment_cancelled

        send_appointment_cancelled.delay(str(appt.id))
    return appt


# ─── Clients ─────────────────────────────────────────────────────────
@router.get("/clients", response_model=list[ClientListItem])
def list_clients(
    q: str | None = Query(None),
    _: object = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> list[ClientListItem]:
    stmt = (
        select(User, func.count(Appointment.id))
        .outerjoin(Appointment, Appointment.user_id == User.id)
        .group_by(User.id)
        .order_by(User.created_at.desc())
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(User.name.ilike(like) | User.phone.ilike(like))
    return [
        ClientListItem(
            id=user.id,
            name=user.name,
            phone=user.phone,
            visits_count=count,
            created_at=user.created_at,
        )
        for user, count in db.execute(stmt).all()
    ]


@router.get("/clients/{client_id}", response_model=ClientDetail)
def client_detail(
    client_id: str,
    _: object = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> ClientDetail:
    user = db.get(User, client_id)
    if user is None:
        raise HTTPException(status_code=404, detail="client_not_found")

    appts = list(
        db.scalars(
            select(Appointment)
            .where(Appointment.user_id == user.id)
            .order_by(Appointment.starts_at.desc())
        ).all()
    )

    offer = None
    row = db.scalar(
        select(DiscountOffer)
        .where(
            DiscountOffer.user_id == user.id,
            DiscountOffer.used.is_(False),
            DiscountOffer.expires_at > datetime.utcnow(),
        )
        .order_by(DiscountOffer.created_at.desc())
        .limit(1)
    )
    if row is not None:
        svc = db.get(Service, row.service_id)
        offer = ClientOffer(
            service_id=row.service_id,
            service_name=svc.name if svc else None,
            expires_at=row.expires_at,
        )

    return ClientDetail(
        id=user.id,
        name=user.name,
        phone=user.phone,
        birth_date=user.birth_date,
        notify_24h=user.notify_24h,
        notify_2h=user.notify_2h,
        created_at=user.created_at,
        appointments=[AppointmentAdminOut.model_validate(a) for a in appts],
        offer=offer,
    )


# ─── Masters ─────────────────────────────────────────────────────────
@router.get("/masters", response_model=list[MasterAdminOut])
def admin_list_masters(
    _: object = Depends(get_current_staff), db: Session = Depends(get_db)
) -> list[Master]:
    return list(db.scalars(select(Master).order_by(Master.name)).all())


@router.post("/masters", response_model=MasterAdminOut, status_code=201)
def create_master(
    body: MasterCreate, _: object = Depends(require_admin), db: Session = Depends(get_db)
) -> Master:
    master = Master(
        name=body.name,
        specializations=body.specializations,
        bio=body.bio,
        photo_url=body.photo_url,
        rating=body.rating,
        slug=body.slug,
        is_active=True,
    )
    db.add(master)
    db.commit()
    db.refresh(master)
    return master


@router.patch("/masters/{master_id}", response_model=MasterAdminOut)
def update_master(
    master_id: str,
    body: MasterUpdate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Master:
    master = db.get(Master, master_id)
    if master is None:
        raise HTTPException(status_code=404, detail="master_not_found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(master, field, value)
    db.commit()
    db.refresh(master)
    return master


@router.put("/masters/{master_id}/schedule", response_model=MasterAdminOut)
def replace_schedule(
    master_id: str,
    body: MasterScheduleReplace,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Master:
    master = db.get(Master, master_id)
    if master is None:
        raise HTTPException(status_code=404, detail="master_not_found")
    master.schedules.clear()
    for iv in body.intervals:
        master.schedules.append(
            MasterSchedule(
                day_of_week=iv.day_of_week, start_time=iv.start_time, end_time=iv.end_time
            )
        )
    db.commit()
    db.refresh(master)
    return master


@router.delete("/masters/{master_id}", status_code=204)
def delete_master(
    master_id: str,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    master = db.get(Master, master_id)
    if master is None:
        raise HTTPException(status_code=404, detail="master_not_found")
    has_appts = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.master_id == master_id)
    )
    if has_appts:
        # Keep history intact — deactivate instead of breaking the FK.
        raise HTTPException(status_code=409, detail="master_has_appointments")
    db.delete(master)  # schedules cascade
    db.commit()


# ─── Services ────────────────────────────────────────────────────────
@router.get("/services", response_model=list[ServiceAdminOut])
def admin_list_services(
    _: object = Depends(get_current_staff), db: Session = Depends(get_db)
) -> list[Service]:
    return list(db.scalars(select(Service).order_by(Service.category, Service.name)).all())


@router.post("/services", response_model=ServiceAdminOut, status_code=201)
def create_service(
    body: ServiceCreate, _: object = Depends(require_admin), db: Session = Depends(get_db)
) -> Service:
    service = Service(**body.model_dump())
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.patch("/services/{service_id}", response_model=ServiceAdminOut)
def update_service(
    service_id: str,
    body: ServiceUpdate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Service:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="service_not_found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    db.commit()
    db.refresh(service)
    return service


@router.post("/services/import", response_model=ImportResult)
def import_services(
    body: ServiceImport, _: object = Depends(require_admin), db: Session = Depends(get_db)
) -> ImportResult:
    rows: list[dict] = []
    if body.csv:
        reader = csv.DictReader(io.StringIO(body.csv))
        for r in reader:
            rows.append(
                {
                    "name": (r.get("name") or "").strip(),
                    "category": (r.get("category") or "").strip() or None,
                    "description": (r.get("description") or "").strip() or None,
                    "price": float(r["price"]),
                    "duration_minutes": int(r["duration_minutes"]),
                    "slug": (r.get("slug") or "").strip() or None,
                }
            )
    elif body.items:
        rows = [i.model_dump() for i in body.items]
    else:
        raise HTTPException(status_code=400, detail="empty_import")

    created = updated = 0
    for r in rows:
        if not r.get("name"):
            continue
        existing = None
        if r.get("slug"):
            existing = db.scalar(select(Service).where(Service.slug == r["slug"]))
        if existing is None:
            existing = db.scalar(select(Service).where(Service.name == r["name"]))
        if existing is None:
            db.add(Service(**{k: v for k, v in r.items() if v is not None or k in ("category", "description")}))
            created += 1
        else:
            for field in ("name", "category", "description", "price", "duration_minutes", "slug"):
                if field in r and r[field] is not None:
                    setattr(existing, field, r[field])
            updated += 1
    db.commit()
    return ImportResult(created=created, updated=updated)


@router.delete("/services/{service_id}", status_code=204)
def delete_service(
    service_id: str,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    service = db.get(Service, service_id)
    if service is None:
        raise HTTPException(status_code=404, detail="service_not_found")
    has_appts = db.scalar(
        select(func.count()).select_from(Appointment).where(Appointment.service_id == service_id)
    )
    if has_appts:
        # Referenced by appointments — deactivate (is_active=False) instead.
        raise HTTPException(status_code=409, detail="service_in_use")
    db.delete(service)
    db.commit()


# ─── Staff ───────────────────────────────────────────────────────────
@router.get("/staff", response_model=list[StaffOut])
def list_staff(
    _: object = Depends(require_admin), db: Session = Depends(get_db)
) -> list[Staff]:
    return list(db.scalars(select(Staff).order_by(Staff.email)).all())


@router.post("/staff", response_model=StaffOut, status_code=201)
def create_staff(
    body: StaffCreate, _: object = Depends(require_admin), db: Session = Depends(get_db)
) -> Staff:
    if body.role not in STAFF_ROLES:
        raise HTTPException(status_code=400, detail="invalid_role")
    if db.scalar(select(Staff).where(Staff.email == body.email)):
        raise HTTPException(status_code=409, detail="email_taken")
    staff = Staff(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.patch("/staff/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: str,
    body: StaffUpdate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Staff:
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(status_code=404, detail="staff_not_found")
    if body.role is not None:
        if body.role not in STAFF_ROLES:
            raise HTTPException(status_code=400, detail="invalid_role")
        staff.role = body.role
    if body.name is not None:
        staff.name = body.name
    if body.password is not None:
        staff.password_hash = hash_password(body.password)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/staff/{staff_id}", status_code=204)
def delete_staff(
    staff_id: str,
    current: Staff = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    if str(current.id) == staff_id:
        raise HTTPException(status_code=400, detail="cannot_delete_self")
    staff = db.get(Staff, staff_id)
    if staff is None:
        raise HTTPException(status_code=404, detail="staff_not_found")
    db.delete(staff)
    db.commit()


# ─── Stats ───────────────────────────────────────────────────────────
def _default_from() -> date:
    return date.today() - timedelta(days=29)


@router.get("/stats/revenue", response_model=RevenueStats)
def stats_revenue(
    date_from: date = Query(default_factory=_default_from),
    date_to: date = Query(default_factory=date.today),
    _: object = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> RevenueStats:
    return stats_service.revenue_stats(db, date_from, date_to)


@router.get("/stats/funnel", response_model=Funnel)
def stats_funnel(
    date_from: date = Query(default_factory=_default_from),
    date_to: date = Query(default_factory=date.today),
    _: object = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> Funnel:
    return stats_service.funnel_stats(db, date_from, date_to)


@router.get("/stats/masters-load", response_model=MastersLoad)
def stats_masters_load(
    date_from: date = Query(default_factory=_default_from),
    date_to: date = Query(default_factory=date.today),
    _: object = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> MastersLoad:
    return stats_service.masters_load(db, date_from, date_to)
