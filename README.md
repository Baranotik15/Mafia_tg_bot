# Mafia Telegram Bot

Telegram бот для игры в Мафию с поддержкой Mini App.

## Требования

- Python 3.10+
- Telegram бот (получить токен у [@BotFather](https://t.me/BotFather))

## Установка

```powershell
# Клонировать репозиторий
git clone <repo-url>
cd Mafia_tg_bot

# Создать виртуальное окружение
python -m venv venv
.\venv\Scripts\Activate.ps1

# Установить зависимости
pip install -r requirements.txt

# Создать .env файл
copy .env.example .env
# Открыть .env и вставить свои значения
```

## Настройка .env

```env
BOT_TOKEN=your_telegram_bot_token_here
WEBAPP_URL=https://your-domain.com
```

## Запуск

```powershell
python bot.py
```
