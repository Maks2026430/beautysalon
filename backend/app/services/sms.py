"""SMS sending (SMSC.ru) and OTP code lifecycle (Redis-backed)."""
import logging
import random

import httpx

from app.core.config import settings
from app.core.redis import redis_client

logger = logging.getLogger(__name__)

SMSC_URL = "https://smsc.ru/sys/send.php"


def send_sms(phone: str, text: str) -> bool:
    """Send an SMS via SMSC. In dev (no credentials) just log it and return False."""
    if not settings.sms_enabled:
        logger.warning("SMS disabled (no SMSC creds). To %s: %s", phone, text)
        return False
    try:
        resp = httpx.get(
            SMSC_URL,
            params={
                "login": settings.SMSC_LOGIN,
                "psw": settings.SMSC_PASSWORD,
                "phones": phone,
                "mes": text,
                "sender": settings.SMSC_SENDER,
                "fmt": 3,  # JSON response
            },
            timeout=10,
        )
        data = resp.json()
        if "error" in data:
            logger.error("SMSC error for %s: %s", phone, data)
            return False
        return True
    except Exception:  # noqa: BLE001
        logger.exception("SMSC request failed for %s", phone)
        return False


def _otp_key(phone: str) -> str:
    return f"otp:{phone}"


def generate_otp(phone: str) -> str:
    code = "".join(random.choices("0123456789", k=settings.OTP_LENGTH))
    redis_client.set(_otp_key(phone), code, ex=settings.OTP_TTL)
    return code


def send_otp(phone: str) -> tuple[bool, str]:
    """Generate + send an OTP. Returns (sent_via_sms, code)."""
    code = generate_otp(phone)
    sent = send_sms(phone, f"Код подтверждения Lumière: {code}")
    return sent, code


def verify_otp(phone: str, code: str) -> bool:
    stored = redis_client.get(_otp_key(phone))
    if stored is None or stored != code:
        return False
    redis_client.delete(_otp_key(phone))  # single use
    return True
