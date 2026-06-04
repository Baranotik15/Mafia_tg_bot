# Mafia Telegram Mini App

Telegram Mini App — карткова колекційна гра в стилі Мафії.

## Архітектура

Два незалежних процеси:
- **`bot.py`** — aiogram 3, відкриває Mini App у Telegram
- **Django** (`mafia_web` + `game`) — веб-додаток, API, БД

## Локальна розробка

### Вимоги
- Python 3.10+
- Токен бота від [@BotFather](https://t.me/BotFather)

### Встановлення

```powershell
git clone <repo-url>
cd Mafia_tg_bot

python -m venv venv
.\venv\Scripts\Activate.ps1

pip install -r requirements.txt

copy .env.example .env
# Відредагуй .env
```

### .env для локальної розробки

```env
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=http://localhost:8000
SECRET_KEY=django-dev-secret-key
DEBUG=True
DB_ENGINE=sqlite
DEV_PLAYER_ID=1
```

### Запуск

```powershell
# Міграції (перший раз і після змін моделей)
python manage.py migrate

# Заповнити карточки в БД
python manage.py seed_cards

# Запустити веб-сервер
python manage.py runserver

# Запустити бота (в окремому терміналі)
python bot.py
```

---

## Продакшен (EC2 + Docker)

### Перший деплой

```bash
# На EC2
git clone <repo-url>
cd Mafia_tg_bot

cp .env.example .env
nano .env  # вписати значення (див. нижче)

docker compose up -d
docker compose exec web python manage.py seed_cards
```

### .env для продакшену

```env
BOT_TOKEN=your_telegram_bot_token
WEBAPP_URL=https://your-domain.com
SECRET_KEY=your-secret-key-here
DEBUG=False
DB_ENGINE=postgres
DB_NAME=mafia
DB_USER=postgres
DB_PASSWORD=your_db_password
DB_HOST=db
DB_PORT=5432
```

### Оновлення після змін у коді

```bash
git pull && docker compose up -d --build
```

### Корисні команди

```bash
# Логи
docker compose logs -f web
docker compose logs -f bot

# Додати паки гравцю
docker compose exec web python manage.py shell -c \
  "from game.models import Player; p = Player.objects.get(username='USERNAME'); p.packs += 5; p.save(); print(p.packs)"

# Переглянути карточки в БД
docker compose exec web python manage.py shell -c \
  "from game.models import Card; print(list(Card.objects.values_list('slug', flat=True)))"
```

---

## Карточки

### Як додати нову карточку

1. Поклади зображення у `game/static/game/img/carts/`
   - Назва файлу = slug, наприклад: `sheriff.png`
2. Додай slug у `game/management/commands/seed_cards.py`:
```python
SLUGS = [
    'executioner',
    'sheriff',  # ← новий
]
```
3. Закомить і задеплой:
```bash
git pull && docker compose up -d --build
docker compose exec web python manage.py seed_cards
```

### Структура папок зі статикою

```
game/static/game/img/
├── carts/          ← зображення карточок ({slug}.png)
├── frames/         ← рамки (bronze/silver/gold)
├── pucks/          ← іконки на сторінці паків
├── button/         ← кнопки навігації
├── bg.png          ← фон
├── bg-frame.png    ← рамка інтерфейсу
└── hummer.png      ← іконка молотка
```

---

## HTTPS (обов'язково для Telegram Mini App)

Варіант 1 — **Cloudflare** (найпростіше):
- Перенеси NS домену на Cloudflare
- SSL вмикається автоматично

Варіант 2 — **Certbot** на EC2:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
