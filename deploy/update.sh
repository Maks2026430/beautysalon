#!/usr/bin/env bash
# Обновить сайт на сервере: забрать свежий код из GitHub и пересобрать контейнеры.
#
#   bash deploy/update.sh            # обновить весь стек (frontend + backend + worker)
#   bash deploy/update.sh frontend  # пересобрать только указанный сервис (быстрее)
#
# Запускать на сервере (VPS), где работает прод. Порты 80/443 заняты системным
# nginx хоста — поэтому nginx-контейнер не поднимаем (см. deploy/start.sh).
set -e

echo "--- забираю свежий код из GitHub ---"
git pull

SERVICES="${*:-frontend backend worker}"
echo "--- пересобираю и перезапускаю: ${SERVICES} ---"
docker compose up -d --build ${SERVICES}

echo "--- статус контейнеров ---"
docker compose ps
