"""Сброс пароля и (опционально) смена email администратора.

Запуск внутри контейнера backend:
    python reset_admin.py 'новый-пароль'                  # только пароль
    python reset_admin.py 'новый-пароль' 'email@домен'    # пароль + новый логин

Без аргументов берёт ADMIN_EMAIL/ADMIN_PASSWORD из .env. В отличие от seed.py,
скрипт ОБНОВЛЯЕТ существующего админа (seed создаёт его только если отсутствует
и пароль не меняет). При смене email переименовывает текущего админа, не плодя
дубликаты.
"""
import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.db import SessionLocal
from app.core.security import hash_password
from app.models import Staff


def main() -> None:
    new_password = sys.argv[1] if len(sys.argv) > 1 else settings.ADMIN_PASSWORD
    new_email = sys.argv[2] if len(sys.argv) > 2 else settings.ADMIN_EMAIL

    db = SessionLocal()
    try:
        # Сначала ищем по новому email, иначе подхватываем любого существующего
        # админа (переименование), иначе создаём нового.
        admin = db.scalar(select(Staff).where(Staff.email == new_email))
        if admin is None:
            admin = db.scalar(select(Staff).where(Staff.role == "admin"))
        if admin is None:
            admin = Staff(name=settings.ADMIN_NAME, role="admin")
            db.add(admin)
            action = "создан"
        else:
            action = "обновлён"
        admin.email = new_email
        admin.password_hash = hash_password(new_password)
        db.commit()
        print("=" * 48)
        print(f"Админ {action}.")
        print(f"  Логин:  {new_email}")
        print(f"  Пароль: {new_password}")
        print("=" * 48)
    finally:
        db.close()


if __name__ == "__main__":
    main()
