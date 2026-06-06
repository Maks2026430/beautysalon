"""Password hashing and JWT helpers.

Two principal kinds share one token format, distinguished by the `kind` claim:
- staff  — email + password login, role 'admin' | 'staff'
- client — phone + OTP login, role 'client'
"""
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"


def _pw_bytes(password: str) -> bytes:
    # bcrypt hashes at most 72 bytes; truncate to stay within the limit.
    return password.encode("utf-8")[:72]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_pw_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(_pw_bytes(password), password_hash.encode("utf-8"))
    except ValueError:
        return False


def _create_token(sub: str, kind: str, role: str, token_type: str, ttl: int) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": sub,
        "kind": kind,
        "role": role,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=ALGORITHM)


def create_access_token(sub: str, kind: str, role: str) -> str:
    return _create_token(sub, kind, role, "access", settings.JWT_ACCESS_TTL)


def create_refresh_token(sub: str, kind: str, role: str) -> str:
    return _create_token(sub, kind, role, "refresh", settings.JWT_REFRESH_TTL)


def decode_token(token: str) -> dict[str, Any]:
    """Raises JWTError on invalid/expired tokens."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


__all__ = [
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "JWTError",
]
