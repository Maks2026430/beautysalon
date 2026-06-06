import uuid
from datetime import datetime, time

from pydantic import BaseModel


class ServiceOut(BaseModel):
    id: uuid.UUID
    slug: str | None
    name: str
    category: str | None
    description: str | None
    price: float
    duration_minutes: int

    model_config = {"from_attributes": True}


class ScheduleOut(BaseModel):
    day_of_week: int | None
    start_time: time | None
    end_time: time | None

    model_config = {"from_attributes": True}


class MasterOut(BaseModel):
    id: uuid.UUID
    slug: str | None
    name: str
    bio: str | None
    photo_url: str | None
    specializations: list[str] | None
    rating: float | None
    schedules: list[ScheduleOut] = []

    model_config = {"from_attributes": True}


class MasterSlots(BaseModel):
    master_id: str
    slots: list[datetime]
