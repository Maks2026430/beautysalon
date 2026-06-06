"""FastAPI auth dependencies — extract and validate the bearer token."""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import JWTError, decode_token
from app.models import Staff, User

_bearer = HTTPBearer(auto_error=True)
_credentials_error = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="invalid_token",
    headers={"WWW-Authenticate": "Bearer"},
)


def _access_payload(creds: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    try:
        payload = decode_token(creds.credentials)
    except JWTError:
        raise _credentials_error
    if payload.get("type") != "access":
        raise _credentials_error
    return payload


def _subject_uuid(payload: dict) -> uuid.UUID:
    try:
        return uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise _credentials_error


def get_current_staff(
    payload: dict = Depends(_access_payload),
    db: Session = Depends(get_db),
) -> Staff:
    if payload.get("kind") != "staff":
        raise _credentials_error
    staff = db.get(Staff, _subject_uuid(payload))
    if staff is None:
        raise _credentials_error
    return staff


def require_admin(staff: Staff = Depends(get_current_staff)) -> Staff:
    if staff.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="admin_required")
    return staff


def get_current_client(
    payload: dict = Depends(_access_payload),
    db: Session = Depends(get_db),
) -> User:
    if payload.get("kind") != "client":
        raise _credentials_error
    user = db.get(User, _subject_uuid(payload))
    if user is None:
        raise _credentials_error
    return user
