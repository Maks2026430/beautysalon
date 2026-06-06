"""Client dashboard home aggregate (spec 6.2 «Главная»)."""
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.deps import get_current_client
from app.models import Appointment, DiscountOffer, Service, User
from app.schemas.dashboard import DashboardOffer, DashboardOut
from app.services.booking import ACTIVE_STATUSES

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardOut)
def dashboard(
    user: User = Depends(get_current_client), db: Session = Depends(get_db)
) -> DashboardOut:
    now = datetime.utcnow()

    upcoming = db.scalar(
        select(Appointment)
        .where(
            Appointment.user_id == user.id,
            Appointment.status.in_(ACTIVE_STATUSES),
            Appointment.starts_at >= now,
        )
        .order_by(Appointment.starts_at)
        .limit(1)
    )

    # Most recent appointment overall → powers the "Записаться снова" shortcut.
    last_appointment = db.scalar(
        select(Appointment)
        .where(Appointment.user_id == user.id)
        .order_by(Appointment.starts_at.desc())
        .limit(1)
    )

    offer_row = db.scalar(
        select(DiscountOffer)
        .where(
            DiscountOffer.user_id == user.id,
            DiscountOffer.used.is_(False),
            DiscountOffer.expires_at > now,
        )
        .order_by(DiscountOffer.created_at.desc())
        .limit(1)
    )
    offer = None
    if offer_row is not None:
        svc = db.get(Service, offer_row.service_id)
        offer = DashboardOffer(
            service_id=offer_row.service_id,
            service_name=svc.name if svc else None,
            expires_at=offer_row.expires_at,
        )

    return DashboardOut(upcoming=upcoming, last_appointment=last_appointment, offer=offer)
