"""Public catalog endpoints — services and masters from the database."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.models import Master, Service
from app.schemas.catalog import MasterOut, MasterSlots, ServiceOut
from app.services import booking

router = APIRouter(tags=["catalog"])


@router.get("/services", response_model=list[ServiceOut])
def list_services(
    category: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[Service]:
    stmt = select(Service).where(Service.is_active.is_(True))
    if category:
        stmt = stmt.where(Service.category == category)
    stmt = stmt.order_by(Service.category, Service.name)
    return list(db.scalars(stmt).all())


@router.get("/masters", response_model=list[MasterOut])
def list_masters(
    specialization: str | None = Query(None),
    db: Session = Depends(get_db),
) -> list[Master]:
    stmt = (
        select(Master)
        .where(Master.is_active.is_(True))
        .options(selectinload(Master.schedules))
        .order_by(Master.name)
    )
    if specialization:
        # PG ARRAY containment: keep masters whose specializations include the value.
        stmt = stmt.where(Master.specializations.contains([specialization]))
    return list(db.scalars(stmt).all())


@router.get("/masters/{master_id}/slots", response_model=MasterSlots)
def master_slots(
    master_id: str,
    date_from: date = Query(default_factory=date.today),
    date_to: date = Query(default_factory=lambda: date.today() + timedelta(days=13)),
    duration_minutes: int = Query(30, ge=5, le=480),
    db: Session = Depends(get_db),
) -> MasterSlots:
    if date_to < date_from:
        raise HTTPException(status_code=400, detail="invalid_date_range")
    slots = booking.master_free_slots(db, master_id, date_from, date_to, duration_minutes)
    return MasterSlots(master_id=master_id, slots=slots)
