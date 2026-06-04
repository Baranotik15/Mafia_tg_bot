#!/bin/bash
set -e

APP_DIR="/home/rtopal/Mafia_tg_bot"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Rebuilding and restarting containers..."
docker compose up -d --build

echo "==> Waiting for web container to be healthy..."
until [ "$(docker compose ps -q web | xargs docker inspect -f '{{.State.Health.Status}}')" = "healthy" ]; do
    echo "   ... waiting"
    sleep 3
done

echo "==> Seeding cards..."
docker compose exec -T web python manage.py seed_cards

echo "==> Reloading nginx..."
docker compose exec -T nginx nginx -s reload

echo ""
echo "Deploy done. Services:"
docker compose ps
