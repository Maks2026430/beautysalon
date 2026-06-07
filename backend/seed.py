"""Idempotent database seed: services, masters (+ schedules), and an admin.

Run inside the backend container after migrations:
    python seed.py
Re-running is safe — rows are upserted by their stable `slug` (or email).
"""
import logging
from datetime import time

from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import Master, MasterSchedule, Service, Staff
from app.services.price_list import SERVICES

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

# Салон работает 09:00–21:00 по Москве. Время в БД хранится как «UTC», а
# фронтенд и SMS показывают его в Europe/Moscow (+3 часа), поэтому для
# отображения 09:00–21:00 МСК храним 06:00–18:00. Дни недели 0..6 = Пн..Вс.
WORK_START = time(6, 0)
WORK_END = time(18, 0)


def _schedule(days_off: list[int]) -> list[dict]:
    """Рабочая неделя 09:00–21:00 МСК, кроме выходных дней (days_off)."""
    return [
        {"day_of_week": d, "start_time": WORK_START, "end_time": WORK_END}
        for d in range(7)
        if d not in days_off
    ]

MASTERS = [
    {
        "slug": "m-anna",
        "name": "Анна Северова",
        "specializations": ["Уход за лицом"],
        "bio": "12 лет в эстетической косметологии, эксперт по уходовым программам и пилингам.",
        "rating": 4.9,
        "photo_url": "/masters/3.png",
        "days_off": [2, 6],  # Ср, Вс
    },
    {
        "slug": "m-irina",
        "name": "Ирина Власова",
        "specializations": ["Массаж"],
        "bio": "Сертифицированный мастер скульптурного и релакс-массажа, автор авторских техник.",
        "rating": 5.0,
        "photo_url": "/masters/2.png",
        "days_off": [0, 6],  # Пн, Вс
    },
    {
        "slug": "m-katya",
        "name": "Екатерина Лиман",
        "specializations": ["Ногтевой сервис"],
        "bio": "Финалист конкурсов nail-art, создаёт идеальную форму и стойкое покрытие.",
        "rating": 4.8,
        "photo_url": "/masters/5.jpg",
        "days_off": [1, 4],  # Вт, Пт
    },
    {
        "slug": "m-marina",
        "name": "Марина Дольская",
        "specializations": ["Аппаратная косметология"],
        "bio": "Работает на аппаратах RF, IPL и карбоновом лазере, эксперт по anti-age программам.",
        "rating": 4.9,
        "photo_url": "/masters/6.png",
        "days_off": [3, 6],  # Чт, Вс
    },
    {
        "slug": "m-sofia",
        "name": "София Зеленова",
        "specializations": ["Волосы и причёски"],
        "bio": "Стилист-колорист, мастер сложных окрашиваний и причёсок для любого случая.",
        "rating": 4.9,
        "photo_url": "/masters/1.png",
        "days_off": [0, 3],  # Пн, Чт
    },
    {
        "slug": "m-polina",
        "name": "Полина Зорина",
        "specializations": ["Брови и ресницы"],
        "bio": "Создаёт идеальную форму бровей и выразительный взгляд: ламинирование и наращивание ресниц.",
        "rating": 4.8,
        "photo_url": "/masters/4.jpg",
        "days_off": [2, 5],  # Ср, Сб
    },
    {
        "slug": "m-alina",
        "name": "Алина Морозова",
        "specializations": ["Депиляция"],
        "bio": "Деликатная депиляция воском и шугарингом с гладким и долгим результатом.",
        "rating": 4.9,
        "photo_url": "/masters/7.jpg",
        "days_off": [1, 4],  # Вт, Пт
    },
    {
        "slug": "m-darya",
        "name": "Дарья Кравцова",
        "specializations": ["Волосы и причёски"],
        "bio": "Колорист и мастер стрижек: сложные окрашивания, уход и восстановление волос.",
        "rating": 4.9,
        "photo_url": "/masters/8.png",
        "days_off": [5, 6],  # Сб, Вс
    },
]


def seed_services(db) -> None:
    for s in SERVICES:
        svc = db.scalar(select(Service).where(Service.slug == s["id"]))
        if svc is None:
            svc = Service(slug=s["id"])
            db.add(svc)
        svc.name = s["name"]
        svc.category = s["category"]
        svc.description = s["description"]
        svc.price = s["price"]
        svc.duration_minutes = s["duration_minutes"]
        svc.is_active = True
    logger.info("seeded %d services", len(SERVICES))


def seed_masters(db) -> None:
    for m in MASTERS:
        master = db.scalar(select(Master).where(Master.slug == m["slug"]))
        if master is None:
            master = Master(slug=m["slug"])
            db.add(master)
        master.name = m["name"]
        master.specializations = m["specializations"]
        master.bio = m["bio"]
        master.rating = m["rating"]
        master.photo_url = m["photo_url"]
        master.is_active = True
        # Replace schedules each run so they stay in sync (cascade delete-orphan).
        master.schedules.clear()
        for slot in _schedule(m["days_off"]):
            master.schedules.append(MasterSchedule(**slot))
    logger.info("seeded %d masters", len(MASTERS))


def seed_admin(db) -> None:
    admin = db.scalar(select(Staff).where(Staff.email == settings.ADMIN_EMAIL))
    if admin is None:
        db.add(
            Staff(
                email=settings.ADMIN_EMAIL,
                password_hash=hash_password(settings.ADMIN_PASSWORD),
                name=settings.ADMIN_NAME,
                role="admin",
            )
        )
        logger.info("created admin %s", settings.ADMIN_EMAIL)
    else:
        logger.info("admin %s already exists — left unchanged", settings.ADMIN_EMAIL)


def main() -> None:
    db = SessionLocal()
    try:
        seed_services(db)
        seed_masters(db)
        seed_admin(db)
        db.commit()
        logger.info("seed complete")
    finally:
        db.close()


if __name__ == "__main__":
    main()
