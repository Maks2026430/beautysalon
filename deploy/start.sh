#!/usr/bin/env bash
# Запуск салон-сайта БЕЗ встроенного nginx-контейнера.
# Порты 80/443 на этом сервере заняты системным nginx хоста, который проксирует
# домен на контейнеры (см. docker-compose.override.yml и deploy/lumieresalon.ru.conf).
set -e
docker compose up -d db redis backend worker frontend
echo "--- статус контейнеров ---"
docker compose ps
