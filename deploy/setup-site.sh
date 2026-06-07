#!/usr/bin/env bash
# Подключение домена lumieresalon.ru к СИСТЕМНОМУ nginx хоста + HTTPS.
# Существующие сайты на сервере не затрагиваются (добавляется отдельный блок).
set -e

DOMAIN="lumieresalon.ru"
EMAIL="admin@lumieresalon.ru"

echo "==> 1/4 Устанавливаю серверный блок в /etc/nginx/conf.d/"
cp "deploy/${DOMAIN}.conf" "/etc/nginx/conf.d/${DOMAIN}.conf"

echo "==> 2/4 Проверяю конфигурацию nginx и применяю (мягкая перезагрузка)"
nginx -t
systemctl reload nginx

echo "==> 3/4 Ставлю плагин certbot для nginx"
apt-get install -y python3-certbot-nginx

echo "==> 4/4 Выпускаю сертификат Let's Encrypt и включаю HTTPS-редирект"
certbot --nginx -d "${DOMAIN}" --redirect --non-interactive --agree-tos -m "${EMAIL}"

echo "==> Готово. Открывайте https://${DOMAIN}"
