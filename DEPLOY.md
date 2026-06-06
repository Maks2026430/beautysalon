# Деплой на VPS

Стек поднимается через Docker Compose (`db`, `redis`, `backend`, `worker`, `frontend`, `nginx`).
Сервис `backend` на старте сам выполняет миграции и сидирование:

```
alembic upgrade head && python seed.py && uvicorn app.main:app ...
```

— поэтому отдельный шаг сидирования не нужен, всё поднимается одной командой.

## Что такое «засеять базу» (простыми словами)

**База данных** — это «картотека» сайта: в ней лежат услуги, мастера, записи
клиентов, учётка администратора. Сайт показывает посетителям то, что лежит в
картотеке, а не то, что написано в коде.

**«Засеять базу»** (англ. *seed* — «семя») — это один раз разложить по картотеке
стартовый набор карточек: все услуги (уход за лицом, аппаратная косметология,
массаж, ногти, волосы, брови и ресницы, депиляция), мастеров и администратора.

**Вручную делать ничего не нужно.** При запуске сайта контейнер `backend`
**сам** выполняет засев — это зашито в `docker-compose.yml`
(`alembic upgrade head && python seed.py && uvicorn …`). Засев «умный»: добавляет
новое и обновляет изменившееся, ничего не дублируя и не удаляя (узнаёт карточки
по внутреннему артикулу — `slug`). Поэтому при каждом деплое и обновлении новые
услуги и мастера подтягиваются автоматически.

**Как убедиться, что сработало:** в логах `backend` будут строки
`seeded 25 services` и `seeded 7 masters` (см. шаг 4), а на лендинге появятся
все категории услуг.

> Пересевать вручную нужно **только** если поменяли прайс/мастеров, но сайт при
> этом не перезапускали. Тогда: `docker compose exec backend python seed.py`

## Предусловия

- Linux-VPS с Docker Engine + плагином Compose (`docker compose version`).
- Домен с A-записью на IP сервера.
- Открытые порты **80** и **443**.

## 1. Код на сервер

```bash
git clone <repo> beautysalon && cd beautysalon
# или scp/rsync рабочей копии
```

## 2. Файл `.env`

```bash
cp .env.example .env
```

Заполнить реальными значениями:

| Переменная | Значение |
|---|---|
| `POSTGRES_PASSWORD` | надёжный пароль БД |
| `JWT_SECRET` | случайная строка ~64 символа |
| `OPENAI_API_KEY` | ключ OpenAI / ProxyAPI (без него AI-консультант работает в режиме rule-based fallback) |
| `OPENAI_MODEL` | `gpt-4o-mini` (по умолчанию) |
| `OPENAI_BASE_URL` | пусто = официальный OpenAI; для ProxyAPI — `https://api.proxyapi.ru/openai/v1` |
| `NEXT_PUBLIC_API_URL` | `https://ВАШ_ДОМЕН/api` |
| `FRONTEND_URL` | `https://ВАШ_ДОМЕН` |
| `COOKIE_SECURE` | `true` (за HTTPS — иначе refresh-cookie не сохранится) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | учётка администратора (создаётся сидом при первом старте) |
| `SMSC_LOGIN` / `SMSC_PASSWORD` | *(опц.)* реальная отправка SMS. Без них OTP возвращает `debug_code`, а SMS-напоминания отключены |

> ⚠️ `NEXT_PUBLIC_API_URL` — **build-arg фронтенда**, инлайнится при сборке образа.
> Сменили домен → пересоберите сервис `frontend` (`docker compose build frontend`).

## 3. TLS

nginx терминирует HTTPS и редиректит 80 → 443.

1. В `nginx/nginx.conf` заменить `server_name yourdomain.ru;` на ваш домен.
2. Положить сертификаты в `nginx/certs/`:
   - `fullchain.pem`
   - `privkey.pem`

Выпуск через Let's Encrypt (standalone, при остановленном nginx):

```bash
docker compose stop nginx 2>/dev/null || true
sudo certbot certonly --standalone -d ВАШ_ДОМЕН
sudo cp /etc/letsencrypt/live/ВАШ_ДОМЕН/fullchain.pem nginx/certs/
sudo cp /etc/letsencrypt/live/ВАШ_ДОМЕН/privkey.pem  nginx/certs/
```

> Примечание: ACME-webroot `/var/www/certbot` в `nginx.conf` не примонтирован в compose,
> поэтому webroot-выдача «из коробки» не работает — используйте `--standalone` (как выше)
> и копируйте сертификаты в `nginx/certs/`. Для самой первой проверки допустим
> самоподписанный сертификат (curl с `-k`).

## 4. Запуск

```bash
docker compose up --build -d
docker compose logs -f backend
```

В логах `backend` дождаться:

```
alembic ... upgrade ... head
seeded 25 services
seeded 7 masters
seed complete
Uvicorn running on http://0.0.0.0:8000
```

## 5. Приёмочная проверка

```bash
curl -k https://ВАШ_ДОМЕН/api/health      # {"status":"ok"}
curl -k https://ВАШ_ДОМЕН/api/services     # засеянные услуги
curl -k https://ВАШ_ДОМЕН/api/masters      # засеянные мастера
```

Через браузер:

- **Лендинг** — карточки услуг/мастеров приходят из БД (`/services`, `/masters`), не из статики.
- **AI-бот** (виджет справа внизу): пройти подбор → результат **стримится** (SSE) →
  «Сохранить предложение» → вход по телефону (код виден как `debug_code`, если SMS не настроены)
  → скидка появляется в `/dashboard`.
- **Личный кабинет** `/login` → `/dashboard`: записи, слоты, профиль.
- **Админка** `/admin` (логин из `ADMIN_EMAIL`/`ADMIN_PASSWORD`): расписание, клиенты,
  CRUD мастеров/услуг (удаление → 409, если есть связанные записи; тогда снять «Активен»),
  CRUD сотрудников, три раздела статистики (revenue / funnel / masters-load).

## Полезные команды

```bash
docker compose ps                          # статус сервисов
docker compose logs -f backend worker      # логи
docker compose exec backend python seed.py # пересеять справочники (идемпотентно)
docker compose exec backend alembic upgrade head      # миграции вручную
docker compose exec backend alembic revision --autogenerate -m "msg"
docker compose down                        # остановить (добавьте -v, чтобы удалить тома БД/Redis)
```

## Обновление версии

```bash
git pull
docker compose up --build -d   # backend сам прогонит alembic upgrade head + seed
```

Если менялись `NEXT_PUBLIC_*`, пересоберите фронт: `docker compose build frontend && docker compose up -d frontend`.
