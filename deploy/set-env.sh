#!/usr/bin/env bash
# Установить значение переменной в .env и перезапустить backend + worker.
#
#   bash deploy/set-env.sh OPENAI_API_KEY 'значение'
#   bash deploy/set-env.sh OPENAI_API_KEY            # спросит значение (удобно для длинных ключей)
#
# Перезапускает только backend и worker — этого достаточно для ключей AI и SMS.
set -e
KEY="$1"
VALUE="$2"

if [ -z "$KEY" ]; then
  echo "Использование: bash deploy/set-env.sh ИМЯ_ПЕРЕМЕННОЙ [значение]"
  exit 1
fi
if [ -z "$VALUE" ]; then
  read -r -p "Введите значение для ${KEY}: " VALUE
fi

if grep -q "^${KEY}=" .env; then
  sed -i "s|^${KEY}=.*|${KEY}=${VALUE}|" .env
else
  echo "${KEY}=${VALUE}" >> .env
fi

echo "Сохранено: ${KEY}=$(grep "^${KEY}=" .env | head -1 | cut -d= -f2-)"
docker compose up -d backend worker
echo "backend и worker перезапущены."
