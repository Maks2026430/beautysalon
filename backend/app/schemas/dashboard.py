import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.appointment import AppointmentOut


class DashboardOffer(BaseModel):
    service_id: uuid.UUID
    service_name: str | None
    expires_at: datetime


class DashboardOut(BaseModel):
    upcoming: AppointmentOut | None
    last_appointment: AppointmentOut | None
    offer: DashboardOffer | None
