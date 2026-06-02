import asyncio
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher
from aiogram.types import Message, MenuButtonWebApp, WebAppInfo
from aiogram.filters import CommandStart

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://example.com")

if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в .env файле")

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()


@dp.message(CommandStart())
async def start(message: Message):
    await message.answer(
        f"👋 Добро пожаловать, {message.from_user.first_name}!\n\n"
        f"🎭 <b>Мафия</b> — классическая игра на доверие и обман.\n\n"
        f"Нажми кнопку <b>🎮 Играть</b> слева от поля ввода 👇",
        parse_mode="HTML",
    )


async def main():
    await bot.set_my_commands([])
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text="🎮 Играть",
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    )
    print("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
