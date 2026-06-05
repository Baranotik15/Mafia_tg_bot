# Mafia Telegram Mini App

Telegram Mini App — карткова колекційна гра в стилі Мафії з адмін-панеллю для ведення ігрових подій.

---

## Архітектура

Два незалежних процеси:

| Процес | Опис |
|---|---|
| **`bot.py`** | aiogram 3 — відкриває Mini App, підтримує розсилку для адмінів |
| **Django** (`mafia_web` + `game`) | Веб-додаток, REST API, робота з БД |

### Моделі БД

**`Card`** — карточка гри:
- `slug` — унікальний ідентифікатор
- `name` — назва картки
- `score` — кількість балів за одне спрацювання
- `fixed_count` — якщо `True`, лічильник заблокований на 1

**`Player`** — гравець:
- `telegram_id`, `username`, `score`, `packs`, `hammers`
- `collected_cards` — M2M до `Card`
- `slot1`, `slot2`, `slot3` — вибрані картки у слоти

**`EventResult`** — збережений результат завершеної події:
- `event_number` — номер події (1–16)
- `winners` — список `[{slug, count}, ...]`
- `awards` — нараховані бали `{telegram_id: points}`

---

## Локальна розробка

### Вимоги
- Python 3.11+
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
DEV_PLAYER_ID=123456789
ADMIN_IDS=123456789,987654321
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

### Сервіси

```
db      — PostgreSQL 16
web     — Django + Gunicorn (порт 8000)
bot     — aiogram polling
nginx   — проксі (порт 80/443)
```

При старті `web` автоматично виконує `migrate` і `collectstatic`.

### Перший деплой

```bash
git clone <repo-url>
cd Mafia_tg_bot

cp .env.example .env
nano .env

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
ADMIN_IDS=871773167,979661127
```

### Деплой оновлень

```bash
./deploy.sh
```

Скрипт виконує: `git pull` → `docker compose up -d --build` → чекає healthcheck → `seed_cards` → `nginx reload`.

### Корисні команди

```bash
# Логи
docker compose logs -f web
docker compose logs -f bot

# Переглянути події в адмінці
docker compose exec web python manage.py shell -c \
  "from game.models import EventResult; [print(r) for r in EventResult.objects.all()]"

# Додати паки гравцю
docker compose exec web python manage.py shell -c \
  "from game.models import Player; p = Player.objects.get(username='USERNAME'); p.packs += 5; p.save()"

# Переглянути всі гравці та їх бали
docker compose exec web python manage.py shell -c \
  "from game.models import Player; [print(p.username, p.score) for p in Player.objects.order_by('-score')]"
```

---

## Адмін-панель (iMafia)

Кнопка iMafia у навігації видима **тільки адмінам** (задається через `ADMIN_IDS` у `.env`).

### Функції адмін-панелі (веб)

- **16 ігрових подій** — кожна відкривається у деталь-панелі
- **Чекбокси карточок** — відмічаєш які картки перемогли
- **Лічильник × N** — скільки разів ця ситуація повторилась (мінімум 1)
- **Картки з `fixed_count`** — лічильник заблокований на 1
- **Завершити подію** — нараховує `card.score × count` балів гравцям у яких ця карта в слоті
- **Скасувати розрахунок** — повертає всі нараховані бали, подія знову доступна
- Завершені події **тускніють і перекреслюються** в сітці

### Функції адмін-бота

Адміни отримують кнопку **📢 Розсилка** у чаті з ботом.

Розсилка підтримує: текст, фото, відео, GIF, документи (з підписом).

```
/broadcast  або  кнопка 📢 Розсилка
→ надіслати повідомлення або медіа
→ підтвердити: ✅ Надіслати всім / ❌ Скасувати
→ бот повідомляє: надіслано N / помилки M
```

---

## Логи та бекапи

### Логи подій

Файл: `logs/events.log`

Записується при кожному завершенні або скасуванні події:

```
────────────────────────────────────────────────
[05.06.2026 14:30:15] ЗАВЕРШЕННЯ ПОДІЇ №3
  Адмін: Rusliash (ID: 871773167)
  Переможні картки:
    • Видалення × 2
    • Чиста перемога × 1
  Нараховано балів:
    • cubaodessa (ID: 979661127) → +12 балів
  Всього отримали нарахування: 1 гравців
────────────────────────────────────────────────
```

### Бекапи БД

Директорія: `backups/`  
Формат: `backup_MM_DD_HH_MM.sql` (або `.sqlite3` для локалки)  
Максимум: **10 бекапів** — при 11-му найстаріший видаляється автоматично.

---

## Карточки

### Формат у `seed_cards.py`

```python
CARDS = [
    {'slug': 'executioner', 'name': 'Видалення',  'score': 3, 'fixed_count': False},
    {'slug': 'dry_win',     'name': 'Чиста перемога', 'score': 6, 'fixed_count': True},
]
```

- `fixed_count: True` — лічильник в адмінці заблокований (завжди ×1)
- `fixed_count: False` — адмін може збільшити лічильник

### Як додати нову карточку

1. Поклади зображення у `game/static/game/img/carts/{slug}.webp`
2. Додай запис у `CARDS` в `seed_cards.py`
3. Задеплой:

```bash
./deploy.sh
```

### Структура статики

```
game/static/game/img/
├── carts/          — зображення карточок ({slug}.webp)
├── frames/         — рамки frame-bronze/silver/gold.webp
├── pucks/          — іконки на сторінці паків
├── button/         — кнопки навігації
├── liderbord/      — аватари лідерборду
├── bg.webp         — фон
├── bg-frame.webp   — декоративна рамка
├── divider.webp    — розділювач
└── hummer.webp     — іконка молотка
```

> Всі зображення у форматі **WebP** (PNG не використовуються).

---

## HTTPS (обов'язково для Telegram Mini App)

**Варіант 1 — AWS ALB + ACM** (рекомендовано):
- SSL-термінація на балансувальнику, nginx слухає HTTP:80

**Варіант 2 — Certbot на хості**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```
