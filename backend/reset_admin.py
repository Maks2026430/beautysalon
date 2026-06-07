"""Сброс (или создание) пароля администратора.

Запуск внутри контейнера backend:
    python reset_admin.py 'новый-пароль'
Без аргумента берёт пароль из настройки ADMIN_PASSWORD (.env).

В отличие от seed.py, этот скрипт ОБНОВЛЯЕТ пароль у уже существующего админа
(seed создаёт админа только если его нет и пароль не трогает).
"""
import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import Staff


def main() -> None:
    new_password = sys.argv[1] if len(sys.argv) > 1 else settings.ADMIN_PASSWORD
    db = SessionLocal()
    try:
        admin = db.scalar(select(Staff).where(Staff.email == settings.ADMIN_EMAIL))
        if admin is None:
            admin = Staff(
                email=settings.ADMIN_EMAIL,
                name=settings.ADMIN_NAME,
                role="admin",
                password_hash=hash_password(new_password),
            )
            db.add(admin)
            action = "создан"
        else:
            admin.password_hash = hash_password(new_password)
            action = "обновлён"
        db.commit()
        print("=" * 48)
        print(f"Админ {action}.")
        print(f"  Логин:  {settings.ADMIN_EMAIL}")
        print(f"  Пароль: {new_password}")
        print("=" * 48)
    finally:
        db.close()


if __name__ == "__main__":
    main()
