import hashlib
import hmac
import json
import random
from urllib.parse import parse_qsl, unquote

from django.conf import settings
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from .models import Card, Player


def _validate_init_data(init_data: str) -> dict | None:
    params = dict(parse_qsl(init_data, keep_blank_values=True))
    hash_value = params.pop('hash', None)
    if not hash_value or not settings.BOT_TOKEN:
        return None
    data_check_string = '\n'.join(f'{k}={v}' for k, v in sorted(params.items()))
    secret_key = hmac.new(b'WebAppData', settings.BOT_TOKEN.encode(), hashlib.sha256).digest()
    computed = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(computed, hash_value):
        return None
    raw_user = params.get('user')
    return json.loads(unquote(raw_user)) if raw_user else {}


@csrf_exempt
@require_POST
def auth(request):
    init_data = request.POST.get('init_data', '')
    user_data = _validate_init_data(init_data)
    if user_data is None:
        return JsonResponse({'ok': False, 'error': 'invalid_init_data'}, status=403)

    telegram_id = user_data.get('id')
    if not telegram_id:
        return JsonResponse({'ok': False, 'error': 'no_user_id'}, status=400)

    username = user_data.get('username') or user_data.get('first_name', f'user_{telegram_id}')
    player, _ = Player.objects.get_or_create(
        telegram_id=telegram_id,
        defaults={'username': username},
    )
    if player.username != username:
        player.username = username
        player.save(update_fields=['username'])

    new_session = request.session.get('telegram_id') != telegram_id
    request.session['telegram_id'] = telegram_id
    return JsonResponse({'ok': True, 'new_session': new_session})


def get_current_player(request):
    telegram_id = request.session.get('telegram_id')
    if not telegram_id and settings.DEBUG:
        telegram_id = settings.DEV_PLAYER_ID or None
    if not telegram_id:
        return None
    return Player.objects.filter(telegram_id=telegram_id).first()


def index(request):
    player = get_current_player(request)
    inventory_cards = list(player.collected_cards.all()) if player else []
    active_slots = [None, None, None]
    hammer_count = player.hammers if player else 0
    return render(request, 'game/index.html', {
        'inventory_cards': inventory_cards,
        'active_slots': active_slots,
        'hammer_count': hammer_count,
    })


def packs(request):
    player = get_current_player(request)
    pack_count = player.packs if player else 0
    return render(request, 'game/packs.html', {'pack_count': pack_count})


def leaders(request):
    me = get_current_player(request)
    all_players = list(Player.objects.order_by('-score'))
    ranked = [
        {'rank': i + 1, 'name': p.username, 'score': p.score, 'telegram_id': p.telegram_id}
        for i, p in enumerate(all_players)
    ]
    top3_raw = ranked[:3]
    top3 = top3_raw + [None] * (3 - len(top3_raw))
    rest_raw = ranked[3:10]
    rest = rest_raw + [None] * (7 - len(rest_raw))
    if me:
        my_entry = next((p for p in ranked if p['telegram_id'] == me.telegram_id), None)
        current_player = my_entry or {'rank': '—', 'name': me.username, 'score': me.score}
    else:
        current_player = {'rank': '—', 'name': 'Ви', 'score': 0}
    return render(request, 'game/leaders.html', {
        'top3': top3,
        'rest': rest,
        'current_player': current_player,
    })


CARDS_PER_PACK = 3


@csrf_exempt
@require_POST
def open_pack(request):
    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'player_not_found'}, status=404)
    if player.packs <= 0:
        return JsonResponse({'error': 'no_packs'}, status=400)

    owned_ids = set(player.collected_cards.values_list('id', flat=True))
    available = list(Card.objects.exclude(id__in=owned_ids))

    player.packs -= 1

    if not available:
        player.hammers += 3
        player.save(update_fields=['packs', 'hammers'])
        return JsonResponse({
            'packs_left': player.packs,
            'hammers': player.hammers,
            'cards': [],
            'collection_full': True,
        })

    drawn = random.sample(available, min(CARDS_PER_PACK, len(available)))
    player.collected_cards.add(*drawn)
    player.hammers += 1
    player.save(update_fields=['packs', 'hammers'])
    return JsonResponse({
        'packs_left': player.packs,
        'hammers': player.hammers,
        'cards': [{'name': c.name, 'rarity': c.rarity, 'slug': c.slug} for c in drawn],
        'collection_full': False,
    })
