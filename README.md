# Lumière — платформа салона красоты

Веб-платформа для салона красоты: лендинг с AI-консультантом, личный кабинет
клиента и админ-панель (CRM). Весь стек поднимается одной командой через Docker
Compose.

## Возможности

- **Лендинг** — услуги и мастера, отзывы, контакты; адаптивная вёрстка, SEO
  (Open Graph, sitemap, structured data Schema.org).
- **AI-консультант** — пошаговый подбор процедуры с потоковым (SSE) ответом и
  персональной скидкой 20% на первое посещение. Без ключа OpenAI работает
  на встроенных правилах.
- **Личный кабинет** — запись на свободные слоты, история визитов, отмена,
  профиль, SMS-напоминания (за 24 ч / 2 ч).
- **Админ-панель (CRM)** — расписание, клиенты, мастера и услуги, сотрудники,
  статистика (выручка, воронка, загрузка мастеров). Роли `admin` / `staff`.

## Стек

| Слой | Технологии |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic |
| Фоновые задачи | Celery + Redis (SMS-напоминания) |
| Данные | PostgreSQL, Redis |
| Инфраструктура | Docker Compose, nginx (TLS, reverse proxy) |

## Архитектура

```
            ┌─────────┐
  Браузер → │  nginx  │ → /api/* → FastAPI (backend)
            │  (TLS)  │ → /*     → Next.js (frontend)
            └─────────┘
                          backend ↔ PostgreSQL, Redis
                          worker  ↔ Redis (Celery), PostgreSQL
```

`nginx` терминирует HTTPS и разделяет трафик: запросы `/api/*` идут на FastAPI
(префикс `/api` срезается), остальное — на Next.js. Подробнее — в
[`CLAUDE.md`](CLAUDE.md).

## Быстрый старт

```bash
cp .env.example .env        # заполнить секреты (см. таблицу в DEPLOY.md)
docker compose up --build   # собрать и поднять весь стек
```

Сервис `backend` на старте сам выполняет миграции и засев справочников
(`alembic upgrade head && python seed.py`). После запуска:

- Лендинг — `http://localhost` (или ваш домен).
- Личный кабинет — `/login` → `/dashboard`.
- Админка — `/admin` (логин из `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

## Разработка

```bash
# Frontend
cd frontend && npm install && npm run dev      # http://localhost:3000

# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload                  # http://localhost:8000
celery -A worker.celery_app worker --beat --loglevel=info
```

## Деплой на VPS

Пошаговая инструкция (TLS, домен, переменные окружения, приёмочная
проверка) — в [`DEPLOY.md`](DEPLOY.md).

## Структура репозитория

```
backend/    FastAPI: api/ models/ schemas/ services/ + worker/ (Celery)
frontend/   Next.js: app/ (landing, dashboard, admin) components/ lib/
nginx/      Конфиг reverse proxy + папка для TLS-сертификатов
docker-compose.yml
```
