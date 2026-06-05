import asyncio
import os
import django

from dotenv import load_dotenv

load_dotenv()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mafia_web.settings')
django.setup()

from asgiref.sync import sync_to_async
from game.models import Player

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
    Message,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
    WebAppInfo,
)

BOT_TOKEN = os.getenv('BOT_TOKEN')
WEBAPP_URL = os.getenv('WEBAPP_URL', 'https://example.com')
ADMIN_IDS  = {int(x) for x in os.getenv('ADMIN_IDS', '').split(',') if x.strip()}

if not BOT_TOKEN:
    raise ValueError('BOT_TOKEN не найден в .env файле')

bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher()


class Broadcast(StatesGroup):
    waiting_content = State()
    waiting_confirm = State()


def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


ADMIN_KEYBOARD = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text='📢 Розсилка')]],
    resize_keyboard=True,
    one_time_keyboard=False,
)


@dp.message(CommandStart())
async def start(message: Message):
    is_admin = _is_admin(message.from_user.id)
    await message.answer(
        f'👋 Добро пожаловать, {message.from_user.first_name}!\n\n'
        f'🎭 <b>Мафия</b> — классическая игра на доверие и обман.\n\n'
        f'Нажми кнопку <b>🕵️‍♂️ Играть</b> слева от поля ввода 👇',
        parse_mode='HTML',
        reply_markup=ADMIN_KEYBOARD if is_admin else ReplyKeyboardRemove(),
    )


@dp.message(F.text == '📢 Розсилка')
@dp.message(Command('broadcast'))
async def cmd_broadcast(message: Message, state: FSMContext):
    if not _is_admin(message.from_user.id):
        return
    await state.set_state(Broadcast.waiting_content)
    await message.answer(
        '📢 <b>Розсилка</b>\n\nНадішліть повідомлення для всіх гравців.\n'
        'Можна текст, фото, відео або GIF (підпис до медіа також підтримується).',
        parse_mode='HTML',
    )


@dp.message(Broadcast.waiting_content)
async def receive_content(message: Message, state: FSMContext):
    data = {}
    if message.text:
        data['text'] = message.text
    elif message.photo:
        data['type'] = 'photo'
        data['file_id'] = message.photo[-1].file_id
        data['caption'] = message.caption or ''
    elif message.animation:
        data['type'] = 'animation'
        data['file_id'] = message.animation.file_id
        data['caption'] = message.caption or ''
    elif message.video:
        data['type'] = 'video'
        data['file_id'] = message.video.file_id
        data['caption'] = message.caption or ''
    elif message.document:
        data['type'] = 'document'
        data['file_id'] = message.document.file_id
        data['caption'] = message.caption or ''
    else:
        await message.answer('❌ Непідтримуваний тип. Спробуйте ще раз:')
        return

    await state.update_data(broadcast=data)
    await state.set_state(Broadcast.waiting_confirm)

    count = await sync_to_async(Player.objects.count)()
    keyboard = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text='✅ Надіслати всім', callback_data='bc_confirm'),
        InlineKeyboardButton(text='❌ Скасувати',      callback_data='bc_cancel'),
    ]])
    await message.answer(
        f'Розіслати це повідомлення <b>{count}</b> гравцям?',
        parse_mode='HTML',
        reply_markup=keyboard,
    )


@dp.callback_query(F.data == 'bc_confirm', Broadcast.waiting_confirm)
async def do_broadcast(callback: CallbackQuery, state: FSMContext):
    state_data = await state.get_data()
    bc = state_data.get('broadcast', {})
    await state.clear()

    await callback.message.edit_text('⏳ Надсилаю...')

    user_ids = await sync_to_async(list)(Player.objects.values_list('telegram_id', flat=True))
    sent = failed = 0

    for tid in user_ids:
        try:
            if 'text' in bc:
                await bot.send_message(tid, bc['text'])
            elif bc.get('type') == 'photo':
                await bot.send_photo(tid, bc['file_id'], caption=bc.get('caption') or None)
            elif bc.get('type') == 'animation':
                await bot.send_animation(tid, bc['file_id'], caption=bc.get('caption') or None)
            elif bc.get('type') == 'video':
                await bot.send_video(tid, bc['file_id'], caption=bc.get('caption') or None)
            elif bc.get('type') == 'document':
                await bot.send_document(tid, bc['file_id'], caption=bc.get('caption') or None)
            sent += 1
        except Exception:
            failed += 1

    await callback.message.edit_text(
        f'✅ Розсилку завершено!\n\nНадіслано: <b>{sent}</b>\nПомилки: <b>{failed}</b>',
        parse_mode='HTML',
    )


@dp.callback_query(F.data == 'bc_cancel', Broadcast.waiting_confirm)
async def cancel_broadcast(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    await callback.message.edit_text('❌ Розсилку скасовано.')


async def main():
    await bot.set_my_commands([])
    await bot.set_chat_menu_button(
        menu_button=MenuButtonWebApp(
            text='🕵️‍♂️ Играть',
            web_app=WebAppInfo(url=WEBAPP_URL),
        )
    )
    print('Бот запущен...')
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())
