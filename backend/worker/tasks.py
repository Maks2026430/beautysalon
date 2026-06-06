"""Celery SMS tasks for appointments (spec 6.3).

Reminders are scheduled with `apply_async(eta=...)`; the task re-checks the
appointment's status and the user's notify flags at send time, so a cancelled
appointment (or a user who turned reminders off) simply skips — no revoke needed.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app.core.db import SessionLocal
from app.models import Appointment
from app.services import sms
from worker.celery_app import celery_app

ACTIVE = ("pending", "confirmed")
MSK = timezone(timedelta(hours=3))  # display salon-local time in SMS


def _fmt_date(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).astimezone(MSK).strftime("%d.%m.%Y")


def _fmt_time(dt: datetime) -> str:
    return dt.replace(tzinfo=timezone.utc).astimezone(MSK).strftime("%H:%M")


def _get(db, appointment_id: str) -> Appointment | None:
    return db.get(Appointment, uuid.UUID(str(appointment_id)))


@celery_app.task(name="worker.tasks.send_appointment_created")
def send_appointment_created(appointment_id: str) -> None:
    db = SessionLocal()
    try:
        appt = _get(db, appointment_id)
        if appt is None:
            return
        text = (
            f"Вы записаны к {appt.master.name} на {_fmt_date(appt.starts_at)} "
            f"в {_fmt_time(appt.starts_at)}. Услуга: {appt.service.name}"
        )
        sms.send_sms(appt.user.phone, text)
    finally:
        db.close()


@celery_app.task(name="worker.tasks.send_reminder")
def send_reminder(appointment_id: str, kind: str) -> None:
    db = SessionLocal()
    try:
        appt = _get(db, appointment_id)
        if appt is None or appt.status not in ACTIVE:
            return
        if kind == "24h":
            if not appt.user.notify_24h:
                return
            text = f"Напоминаем о визите завтра в {_fmt_time(appt.starts_at)}. Мастер: {appt.master.name}"
        else:  # "2h"
            if not appt.user.notify_2h:
                return
            text = "Ваш визит через 2 часа. Ждём вас!"
        sms.send_sms(appt.user.phone, text)
    finally:
        db.close()


@celery_app.task(name="worker.tasks.send_appointment_cancelled")
def send_appointment_cancelled(appointment_id: str) -> None:
    db = SessionLocal()
    try:
        appt = _get(db, appointment_id)
        if appt is None:
            return
        sms.send_sms(appt.user.phone, f"Ваша запись на {_fmt_date(appt.starts_at)} отменена.")
    finally:
        db.close()


def schedule_for_appointment(appt: Appointment) -> None:
    """Enqueue the immediate confirmation + the 24h / 2h reminders."""
    appointment_id = str(appt.id)
    send_appointment_created.delay(appointment_id)

    starts = appt.starts_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    for kind, delta in (("24h", timedelta(hours=24)), ("2h", timedelta(hours=2))):
        eta = starts - delta
        if eta > now:
            send_reminder.apply_async((appointment_id, kind), eta=eta)
