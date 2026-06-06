import uuid

from pydantic import BaseModel, EmailStr, Field


class AccessToken(BaseModel):
    """Access token returned in the body; the refresh token rides in an
    httpOnly cookie (spec 6.1) and is never exposed to JS."""

    access_token: str
    token_type: str = "bearer"


class StaffLoginRequest(BaseModel):
    email: EmailStr
    password: str


class OtpRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)


class OtpRequestResponse(BaseModel):
    sent: bool
    # Returned ONLY in dev mode (no SMSC credentials) so the flow is testable.
    debug_code: str | None = None


class OtpVerifyRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=20)
    code: str
    name: str | None = None


class StaffOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None
    role: str

    model_config = {"from_attributes": True}


class UserOut(BaseModel):
    id: uuid.UUID
    phone: str
    name: str | None
    notify_24h: bool
    notify_2h: bool

    model_config = {"from_attributes": True}
