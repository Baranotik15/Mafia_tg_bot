# Mafia Telegram Mini App — Production Setup Guide

## Requirements

- Ubuntu 22.04+ (or any Linux), 1+ GB RAM
- Docker 24+, Docker Compose v2+
- Ports 80 / 443 open
- A public domain with DNS A record → server IP (required for Telegram Mini App)

---

## 1. Server Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# Clone the repo
git clone <repo-url> Mafia_tg_bot && cd Mafia_tg_bot
```

---

## 2. BotFather Setup

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` → save the **bot token**
2. `/setdomain` → set your domain (e.g. `game.example.com`) — required for Mini App to open
3. The bot sets the menu button automatically on startup

---

## 3. HTTPS

Telegram Mini App **requires HTTPS**. Choose one:

**Option A — AWS ALB + ACM (recommended on EC2)**
- Create an Application Load Balancer, attach a free ACM certificate
- ALB listens on HTTPS:443, proxies to EC2:80 — no nginx changes needed

**Option B — Certbot**
```bash
sudo apt install certbot -y
docker compose stop nginx
sudo certbot certonly --standalone -d your-domain.com
```

Then add to `nginx/nginx.conf`:
```nginx
listen 443 ssl;
ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

The `/etc/letsencrypt` volume mount is already in `docker-compose.yml`.

---

## 4. Configure `.env`

```bash
cp .env.example .env
nano .env
```

```env
BOT_TOKEN=1234567890:AAF...           # from BotFather
WEBAPP_URL=https://your-domain.com    # public HTTPS URL

SECRET_KEY=<random 50+ char string>   # generate: python3 -c "import secrets; print(secrets.token_urlsafe(50))"
DEBUG=False

DB_ENGINE=postgres
DB_NAME=mafia
DB_USER=postgres
DB_PASSWORD=<strong password>
DB_HOST=db
DB_PORT=5432

# Comma-separated Telegram IDs — these users see the iMafia admin button
# Find your ID: message @userinfobot in Telegram
ADMIN_IDS=your_telegram_id,another_admin_id
```

---

## 5. Deploy

Same command for both first run and all future updates:

```bash
./deploy.sh
```

The script runs: `git pull` → `docker compose up -d --build` → waits for healthcheck → `seed_cards` → `nginx reload`.

Migrations and `collectstatic` run automatically inside the container on startup.

Check everything is up:
```bash
docker compose ps
# Expected: db, web, bot, nginx — all running
```

---

## 6. Verify

```bash
curl -I https://your-domain.com     # should return 200 or 302
docker compose logs bot             # should print "Бот запущен..."
```

Open the bot in Telegram → press **🕵️‍♂️ Играть** → Mini App should open.

---

## 7. Admin Panel

Set admin Telegram IDs in `ADMIN_IDS` in `.env`. After changes:
```bash
docker compose up -d   # no rebuild needed for .env changes
```

| Where | Feature |
|---|---|
| Mini App → iMafia button | 16 game events: finish / cancel with score calculation |
| Telegram bot | 📢 Broadcast button — send message/photo/video/GIF to all players |

**Broadcast flow:**
```
Press 📢 Broadcast (or /broadcast) → send text or media → confirm ✅ → bot reports sent/failed count
```

---

## 8. Logs & Backups

**Event log** — `logs/events.log`:
```bash
tail -f logs/events.log
```

Written automatically on every event finish/cancel with admin name, cards, and points awarded.

**DB backups** — `backups/`:
- Auto-created on every score change
- Format: `backup_MM_DD_HH_MM.sql`
- Max 10 kept, oldest deleted automatically

```bash
ls -lh backups/

# Restore
docker compose exec -T db psql -U postgres mafia < backups/backup_06_05_14_30.sql
```

---

## 9. Useful Commands

```bash
# ── Players ───────────────────────────────────────────────────────────
# List all players by score
docker compose exec web python manage.py shell -c \
  "from game.models import Player; [print(p.username, p.score) for p in Player.objects.order_by('-score')]"

# Set player score
docker compose exec web python manage.py shell -c \
  "from game.models import Player; p = Player.objects.get(username='USERNAME'); p.score = 100; p.save()"

# Add packs to player
docker compose exec web python manage.py shell -c \
  "from game.models import Player; p = Player.objects.get(username='USERNAME'); p.packs += 5; p.save()"

# ── Events ────────────────────────────────────────────────────────────
# List completed events
docker compose exec web python manage.py shell -c \
  "from game.models import EventResult; [print(r) for r in EventResult.objects.all()]"

# Reset all events
docker compose exec web python manage.py shell -c \
  "from game.models import EventResult; EventResult.objects.all().delete()"

# ── Containers ────────────────────────────────────────────────────────
docker compose ps
docker compose logs -f web
docker compose logs -f bot
docker compose restart web

# Shell access
docker compose exec web bash
docker compose exec db psql -U postgres mafia
```

---

## 10. Adding New Cards

1. Add image to `game/static/game/img/carts/{slug}.webp` (WebP with transparent background)
2. Add entry to `game/management/commands/seed_cards.py`:

```python
CARDS = [
    # ...existing cards...
    {
        'slug': 'new_card',      # unique latin identifier
        'name': 'Card Name',     # shown in admin panel
        'score': 4,              # points per occurrence
        'fixed_count': False,    # True = counter locked at 1
    },
]
```

3. Commit, push, deploy:
```bash
git add . && git commit -m "feat: add new card" && git push
./deploy.sh
```

---

## 11. Troubleshooting

```bash
# Web not starting
docker compose logs web --tail=50

# Bot not responding — check token in .env
docker compose logs bot --tail=20

# Migration error
docker compose exec web python manage.py migrate --run-syncdb

# Check DB connection
docker compose exec web python manage.py shell -c \
  "from django.db import connection; connection.ensure_connection(); print('DB OK')"

# Full reset (WARNING: deletes all data)
docker compose down -v && ./deploy.sh
```
