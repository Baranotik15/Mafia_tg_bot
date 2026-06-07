import asyncio
import os
import django

from dotenv import load_dotenv

load_dotenv()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mafia_web.settings')
django.setup()

import logging

from asgiref.sync import sync_to_async
from game.models import Player, PromoCode

promo_logger = logging.getLogger('game.events')

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


class CreatePromo(StatesGroup):
    waiting_code  = State()
    waiting_packs = State()


class DeletePlayer(StatesGroup):
    waiting_number  = State()
    waiting_confirm = State()


def _is_admin(user_id: int) -> bool:
    return user_id in ADMIN_IDS


ADMIN_KEYBOARD = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text='📢 Розсилка')],
        [KeyboardButton(text='🎟 Промокод')],
        [KeyboardButton(text='👥 Список Игроков')],
        [KeyboardButton(text='🗑 Видалити гравця')],
    ],
    resize_keyboard=True,
    one_time_keyboard=False,
)


@dp.message(CommandStart())
async def start(message: Message):
    is_admin = _is_admin(message.from_user.id)
    await message.answer(
        'Ласкаво просимо, ' + message.from_user.first_name + '!\n'
        'Вітаю у фентезі боті для турніру Red Crab! Ось правила фентезі:\n\n'
        'У грі є 20 карт подій.\n'
        'Кожен учасник отримує стартовий пак.\n'
        'У кожному паку: 4 випадкові карти + 2 якорі.\n\n'
        'Відкрий пак, обери карти та постав їх у 3 слоти:\n'
        '2 звичайні слоти та 1 слот ×2.\n'
        'Карта в слоті ×2 приносить подвоєні очки.\n\n'
        'Після кожної гри бали нараховуються за ті події, які відбулися в грі та збіглися з картами у твоїх слотах.\n\n'
        'Карти в слотах можна змінювати між будь-якими іграми.\n'
        'Для заміни однієї карти потрібен 1 якір.\n\n'
        'Додаткові паки можна отримати за промокодом.\n'
        'Промокод видається за донат $5 = 1 пак',
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


@dp.message(F.text == '👥 Список Игроков')
@dp.message(Command('players'))
async def cmd_players(message: Message):
    if not _is_admin(message.from_user.id):
        return

    @sync_to_async
    def get_players():
        return list(Player.objects.order_by('-score').values('username', 'first_name', 'score', 'packs'))

    players = await get_players()
    if not players:
        await message.answer('Гравців ще немає.')
        return

    lines = ['<b>👥 Список гравців:</b>\n']
    for i, p in enumerate(players, 1):
        first = p['first_name'] or '—'
        user  = f'@{p["username"]}' if p['username'] else '—'
        lines.append(f'{i}. {first} | {user} — <b>{p["score"]}</b> ⭐  |  паків: {p["packs"]}')

    text = '\n'.join(lines)
    if len(text) > 4096:
        text = text[:4090] + '\n...'

    await message.answer(text, parse_mode='HTML')


@dp.message(Command('backfill_names'))
async def cmd_backfill_names(message: Message):
    if not _is_admin(message.from_user.id):
        return

    @sync_to_async
    def get_empty():
        return list(Player.objects.filter(first_name='').values_list('telegram_id', flat=True))

    @sync_to_async
    def save_name(telegram_id, first_name):
        Player.objects.filter(telegram_id=telegram_id).update(first_name=first_name)

    ids = await get_empty()
    if not ids:
        await message.answer('✅ Всі гравці вже мають імена.')
        return

    await message.answer(f'⏳ Заповнюю імена для {len(ids)} гравців...')
    ok = failed = 0
    for tid in ids:
        try:
            chat = await bot.get_chat(tid)
            if chat.first_name:
                await save_name(tid, chat.first_name)
                ok += 1
        except Exception:
            failed += 1

    await message.answer(
        f'✅ Готово!\nОновлено: <b>{ok}</b>\nНе вдалось: <b>{failed}</b>',
        parse_mode='HTML',
    )


@dp.message(F.text == '🗑 Видалити гравця')
@dp.message(Command('delete_player'))
async def cmd_delete_player(message: Message, state: FSMContext):
    if not _is_admin(message.from_user.id):
        return

    @sync_to_async
    def get_players():
        return list(Player.objects.order_by('-score').values('username', 'first_name', 'telegram_id'))

    players = await get_players()
    if not players:
        await message.answer('Гравців ще немає.')
        return

    await state.update_data(players=players)
    await state.set_state(DeletePlayer.waiting_number)
    await message.answer(
        f'🗑 <b>Видалення гравця</b>\n\nВведіть порядковий номер гравця зі списку (1–{len(players)}):',
        parse_mode='HTML',
    )


@dp.message(DeletePlayer.waiting_number)
async def delete_player_number(message: Message, state: FSMContext):
    data = await state.get_data()
    players = data['players']
    try:
        num = int(message.text.strip())
        if not (1 <= num <= len(players)):
            raise ValueError
    except ValueError:
        await message.answer(f'❌ Введіть число від 1 до {len(players)}:')
        return

    player = players[num - 1]
    name = player['first_name'] or player['username'] or '—'
    await state.update_data(delete_num=num, delete_tid=player['telegram_id'], delete_name=name)
    await state.set_state(DeletePlayer.waiting_confirm)
    await message.answer(
        f'⚠️ Ви точно хочете видалити гравця?\n\n'
        f'#{num} <b>{name}</b>\n'
        f'Telegram ID: <code>{player["telegram_id"]}</code>\n\n'
        f'Введіть <b>видалити</b> для підтвердження або будь-що інше для скасування.',
        parse_mode='HTML',
    )


@dp.message(DeletePlayer.waiting_confirm)
async def delete_player_confirm(message: Message, state: FSMContext):
    data = await state.get_data()
    await state.clear()

    if message.text.strip().lower() != 'видалити':
        await message.answer('❌ Видалення скасовано.')
        return

    tid  = data['delete_tid']
    name = data['delete_name']
    num  = data['delete_num']

    deleted, _ = await sync_to_async(Player.objects.filter(telegram_id=tid).delete)()
    if deleted:
        await message.answer(
            f'✅ Гравця <b>#{num} {name}</b> (ID: <code>{tid}</code>) видалено.',
            parse_mode='HTML',
        )
    else:
        await message.answer('❌ Гравця не знайдено, можливо вже видалений.')


@dp.message(F.text == '🎟 Промокод')
@dp.message(Command('promo'))
async def cmd_create_promo(message: Message, state: FSMContext):
    if not _is_admin(message.from_user.id):
        return
    await state.set_state(CreatePromo.waiting_code)
    await message.answer(
        '🎟 <b>Створення промокоду</b>\n\nВведіть назву промокоду (без пробілів):',
        parse_mode='HTML',
    )


@dp.message(CreatePromo.waiting_code)
async def receive_promo_code(message: Message, state: FSMContext):
    code = message.text.strip().upper()
    if not code or ' ' in code:
        await message.answer('❌ Код не може містити пробіли. Спробуйте ще раз:')
        return
    exists = await sync_to_async(PromoCode.objects.filter(code=code).exists)()
    if exists:
        await message.answer(f'❌ Промокод <code>{code}</code> вже існує. Введіть інший:', parse_mode='HTML')
        return
    await state.update_data(promo_code=code)
    await state.set_state(CreatePromo.waiting_packs)
    await message.answer(
        f'✅ Код: <code>{code}</code>\n\nВведіть кількість паків (від 1 до 100):',
        parse_mode='HTML',
    )


@dp.message(CreatePromo.waiting_packs)
async def receive_promo_packs(message: Message, state: FSMContext):
    try:
        packs = int(message.text.strip())
        if not (1 <= packs <= 100):
            raise ValueError
    except ValueError:
        await message.answer('❌ Введіть число від 1 до 100:')
        return
    data = await state.get_data()
    code = data['promo_code']
    admin_id   = message.from_user.id
    admin_name = message.from_user.username or message.from_user.first_name or f'ID:{admin_id}'
    await sync_to_async(PromoCode.objects.create)(code=code, packs=packs, created_by=admin_id)
    await state.clear()
    SEP = '─' * 48
    promo_logger.info(
        f'{SEP}\n'
        f'ПРОМОКОД СТВОРЕНО\n'
        f'  Адмін: {admin_name} (ID: {admin_id})\n'
        f'  Код: {code}\n'
        f'  Паків: {packs}\n'
        f'{SEP}'
    )
    pack_word = 'пак' if packs == 1 else ('паки' if packs < 5 else 'паків')
    await message.answer(
        f'✅ Промокод створено!\n\n'
        f'Код: <code>{code}</code>\n'
        f'Паків: <b>{packs} {pack_word}</b>\n\n'
        f'Гравці вводять його у розділі «Паки» в Mini App.',
        parse_mode='HTML',
    )


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
