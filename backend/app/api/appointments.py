"""Client appointment endpoints (spec 6.2 «Мои записи»)."""
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_client
from app.models import Appointment, User
from app.schemas.appointment import (
    AppointmentOut,
    AvailabilityResponse,
    CreateAppointmentRequest,
)
from app.services import booking

router = APIRouter(prefix="/appointments", tags=["appointments"])

ACTIVE = booking.ACTIVE_STATUSES


@router.get("/my", response_model=list[AppointmentOut])
def my(
    user: User = Depends(get_current_client), db: Session = Depends(get_db)
) -> list[Appointment]:
    """All of the current user's appointments, newest first (spec «Мои записи»)."""
    stmt = (
        select(Appointment)
        .where(Appointment.user_id == user.id)
        .order_by(Appointment.starts_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/upcoming", response_model=list[AppointmentOut])
def upcoming(
    user: User = Depends(get_current_client), db: Session = Depends(get_db)
) -> list[Appointment]:
    now = datetime.utcnow()
    stmt = (
        select(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.status.in_(ACTIVE),
            Appointment.starts_at >= now,
        )
        .order_by(Appointment.starts_at)
    )
    return list(db.scalars(stmt).all())


@router.get("/history", response_model=list[AppointmentOut])
def history(
    user: User = Depends(get_current_client), db: Session = Depends(get_db)
) -> list[Appointment]:
    now = datetime.utcnow()
    # Past visits or anything no longer active (cancelled/completed).
    stmt = (
        select(Appointment)
        .where(
            Appointment.user_id == user.id,
            (Appointment.starts_at < now) | (Appointment.status.notin_(ACTIVE)),
        )
        .order_by(Appointment.starts_at.desc())
    )
    return list(db.scalars(stmt).all())


@router.get("/availability", response_model=AvailabilityResponse)
def availability(
    master_id: str = Query(...),
    service_id: str = Query(...),
    _: User = Depends(get_current_client),
    db: Session = Depends(get_db),
) -> AvailabilityResponse:
    service, slots = booking.available_slots(db, master_id, service_id)
    return AvailabilityResponse(
        service_id=service.id,
        duration_minutes=service.duration_minutes,
        slots=slots,
    )


@router.post("", response_model=AppointmentOut, status_code=201)
def create(
    body: CreateAppointmentRequest,
    user: User = Depends(get_current_client),
    db: Session = Depends(get_db),
) -> Appointment:
    return booking.create_appointment(db, user, body.master_id, body.service_id, body.starts_at)


@router.delete("/{appointment_id}", response_model=AppointmentOut)
def cancel(
    appointment_id: str,
    user: User = Depends(get_current_client),
    db: Session = Depends(get_db),
) -> Appointment:
    """Cancel (soft) the user's appointment — no later than 2h before (spec 6.2)."""
    return booking.cancel_appointment(db, user, appointment_id)
