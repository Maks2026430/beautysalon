from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "beauty_salon",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Europe/Moscow",
    enable_utc=True,
)

# Ensure the task module is imported so tasks register with the worker.
celery_app.autodiscover_tasks(["worker"])

# Reminders are scheduled per-appointment via apply_async(eta=...) in
# worker.tasks.schedule_for_appointment, so no periodic beat schedule is needed.
