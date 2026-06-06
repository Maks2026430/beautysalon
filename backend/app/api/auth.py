"""Authentication: staff (email+password) and clients (phone+OTP), JWT tokens.

Access token → JSON body. Refresh token → httpOnly cookie (spec 6.1).
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_client, get_current_staff
from app.core.security import (
    JWTError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from app.models import Staff, User
from app.schemas.auth import (
    AccessToken,
    OtpRequest,
    OtpRequestResponse,
    OtpVerifyRequest,
    StaffLoginRequest,
    StaffOut,
    UserOut,
)
from app.services import sms

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_COOKIE = "refresh_token"


def _set_refresh_cookie(response: Response, sub: str, kind: str, role: str) -> None:
    token = create_refresh_token(sub, kind, role)
    response.set_cookie(
        REFRESH_COOKIE,
        token,
        max_age=settings.JWT_REFRESH_TTL,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/",
    )


def _issue(response: Response, sub: str, kind: str, role: str) -> AccessToken:
    _set_refresh_cookie(response, sub, kind, role)
    return AccessToken(access_token=create_access_token(sub, kind, role))


# ─── Staff ───────────────────────────────────────────────────────────
@router.post("/staff/login", response_model=AccessToken)
def staff_login(
    body: StaffLoginRequest, response: Response, db: Session = Depends(get_db)
) -> AccessToken:
    staff = db.scalar(select(Staff).where(Staff.email == body.email))
    if staff is None or not verify_password(body.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")
    return _issue(response, str(staff.id), "staff", staff.role)


@router.get("/staff/me", response_model=StaffOut)
def staff_me(staff: Staff = Depends(get_current_staff)) -> Staff:
    return staff


# ─── Client (phone + OTP) ────────────────────────────────────────────
@router.post("/request-otp", response_model=OtpRequestResponse)
def otp_request(body: OtpRequest) -> OtpRequestResponse:
    sent, code = sms.send_otp(body.phone)
    # Expose the code only in dev mode (no SMSC creds) so the flow is testable.
    return OtpRequestResponse(sent=sent, debug_code=None if settings.sms_enabled else code)


@router.post("/verify-otp", response_model=AccessToken)
def otp_verify(
    body: OtpVerifyRequest, response: Response, db: Session = Depends(get_db)
) -> AccessToken:
    if not sms.verify_otp(body.phone, body.code):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_code")

    user = db.scalar(select(User).where(User.phone == body.phone))
    if user is None:  # first login → create profile automatically (spec 6.1)
        user = User(phone=body.phone, name=body.name)
        db.add(user)
        db.commit()
        db.refresh(user)
    elif body.name and not user.name:
        user.name = body.name
        db.commit()

    return _issue(response, str(user.id), "client", "client")


@router.get("/me", response_model=UserOut)
def client_me(user: User = Depends(get_current_client)) -> User:
    return user


# ─── Refresh / logout ────────────────────────────────────────────────
@router.post("/refresh", response_model=AccessToken)
def refresh(request: Request, response: Response) -> AccessToken:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_refresh")
    try:
        payload = decode_token(token)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token")
    # Rotate: issue a fresh access token and a new refresh cookie.
    return _issue(response, payload["sub"], payload.get("kind", "client"), payload.get("role", "client"))


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(REFRESH_COOKIE, path="/")
    return {"ok": True}
