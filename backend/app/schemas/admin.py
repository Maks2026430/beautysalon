import uuid
from datetime import date, datetime, time

from pydantic import BaseModel, EmailStr, Field

from app.schemas.appointment import MiniMaster, MiniService

APPOINTMENT_STATUSES = ("pending", "confirmed", "completed", "cancelled", "no_show")
STAFF_ROLES = ("admin", "staff")


# ─── Schedule ────────────────────────────────────────────────────────
class ClientMini(BaseModel):
    id: uuid.UUID
    name: str | None
    phone: str

    model_config = {"from_attributes": True}


class AppointmentAdminOut(BaseModel):
    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    status: str
    price: float | None
    user: ClientMini
    master: MiniMaster
    service: MiniService

    model_config = {"from_attributes": True}


class StatusUpdate(BaseModel):
    status: str = Field(..., description="|".join(APPOINTMENT_STATUSES))


# ─── Clients ─────────────────────────────────────────────────────────
class ClientListItem(BaseModel):
    id: uuid.UUID
    name: str | None
    phone: str
    visits_count: int
    created_at: datetime | None


class ClientOffer(BaseModel):
    service_id: uuid.UUID
    service_name: str | None
    expires_at: datetime


class ClientDetail(BaseModel):
    id: uuid.UUID
    name: str | None
    phone: str
    birth_date: date | None
    notify_24h: bool
    notify_2h: bool
    created_at: datetime | None
    appointments: list[AppointmentAdminOut]
    offer: ClientOffer | None


# ─── Masters ─────────────────────────────────────────────────────────
class ScheduleInterval(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time


class MasterCreate(BaseModel):
    name: str
    specializations: list[str] = []
    bio: str | None = None
    photo_url: str | None = None
    rating: float | None = None
    slug: str | None = None


class MasterUpdate(BaseModel):
    name: str | None = None
    specializations: list[str] | None = None
    bio: str | None = None
    photo_url: str | None = None
    rating: float | None = None
    is_active: bool | None = None


class MasterScheduleReplace(BaseModel):
    intervals: list[ScheduleInterval]


class MasterAdminOut(BaseModel):
    id: uuid.UUID
    slug: str | None
    name: str
    bio: str | None
    photo_url: str | None
    specializations: list[str] | None
    rating: float | None
    is_active: bool
    schedules: list[ScheduleInterval] = []

    model_config = {"from_attributes": True}


# ─── Services ────────────────────────────────────────────────────────
class ServiceCreate(BaseModel):
    name: str
    category: str | None = None
    description: str | None = None
    price: float
    duration_minutes: int
    slug: str | None = None
    is_active: bool = True


class ServiceUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    description: str | None = None
    price: float | None = None
    duration_minutes: int | None = None
    is_active: bool | None = None


class ServiceAdminOut(BaseModel):
    id: uuid.UUID
    slug: str | None
    name: str
    category: str | None
    description: str | None
    price: float
    duration_minutes: int
    is_active: bool

    model_config = {"from_attributes": True}


class ServiceImport(BaseModel):
    # Provide either a CSV string or a list of items (JSON). Upsert by slug/name.
    csv: str | None = None
    items: list[ServiceCreate] | None = None


class ImportResult(BaseModel):
    created: int
    updated: int


# ─── Stats ───────────────────────────────────────────────────────────
class RevenuePoint(BaseModel):
    date: date
    amount: float


class TopService(BaseModel):
    name: str
    count: int
    revenue: float


class MasterUtilization(BaseModel):
    master: str
    percent: float


class Funnel(BaseModel):
    started: int
    completed: int
    booked: int


class RevenueStats(BaseModel):
    date_from: date
    date_to: date
    revenue_total: float
    revenue_series: list[RevenuePoint]
    top_services: list[TopService]


class MastersLoad(BaseModel):
    date_from: date
    date_to: date
    masters: list[MasterUtilization]


# ─── Staff (admin CRUD) ──────────────────────────────────────────────
class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str | None = None
    role: str = Field("staff", description="admin|staff")


class StaffUpdate(BaseModel):
    name: str | None = None
    role: str | None = Field(None, description="admin|staff")
    password: str | None = Field(None, min_length=6)
