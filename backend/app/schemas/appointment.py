import uuid
from datetime import datetime

from pydantic import BaseModel


class MiniMaster(BaseModel):
    id: uuid.UUID
    name: str
    photo_url: str | None = None

    model_config = {"from_attributes": True}


class MiniService(BaseModel):
    id: uuid.UUID
    name: str
    category: str | None = None
    duration_minutes: int

    model_config = {"from_attributes": True}


class AppointmentOut(BaseModel):
    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    status: str
    price: float | None
    discount_applied: bool
    master: MiniMaster
    service: MiniService

    model_config = {"from_attributes": True}


class CreateAppointmentRequest(BaseModel):
    master_id: uuid.UUID
    service_id: uuid.UUID
    starts_at: datetime


class AvailabilityResponse(BaseModel):
    service_id: uuid.UUID
    duration_minutes: int
    slots: list[datetime]
