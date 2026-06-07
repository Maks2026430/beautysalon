#!/usr/bin/env bash
# Сброс пароля администратора. Использование:
#   bash deploy/reset-admin.sh 'новый-пароль'
# Без аргумента возьмёт ADMIN_PASSWORD из .env.
docker compose exec -T backend python reset_admin.py "$1"
