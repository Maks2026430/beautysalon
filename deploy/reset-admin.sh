#!/usr/bin/env bash
# Сброс пароля и (опционально) смена email администратора.
#   bash deploy/reset-admin.sh 'пароль'                 — только пароль
#   bash deploy/reset-admin.sh 'пароль' 'email@домен'   — пароль + новый логин
#
# Также синхронизирует .env, чтобы сидер при следующем запуске не пересоздал
# старого админа.
set -e
PW="$1"
EMAIL="$2"

sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=${PW}|" .env
if [ -n "$EMAIL" ]; then
  sed -i "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=${EMAIL}|" .env
  docker compose exec -T backend python reset_admin.py "$PW" "$EMAIL"
else
  docker compose exec -T backend python reset_admin.py "$PW"
fi
