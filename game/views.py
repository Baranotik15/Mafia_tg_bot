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

from .models import Card, EventResult, Player


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
        # fallback для web.telegram.org де initData може бути порожнім
        raw = request.POST.get('unsafe_user', '')
        if raw:
            try:
                user_data = json.loads(raw)
            except (ValueError, TypeError):
                user_data = None
        if not user_data:
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
    hammer_count = player.hammers if player else 0
    slots = []
    slotted_ids = set()
    for i in [1, 2, 3]:
        card = getattr(player, f'slot{i}') if player else None
        slots.append({'position': i, 'card': card})
        if card:
            slotted_ids.add(card.id)
    inventory_cards = list(player.collected_cards.exclude(id__in=slotted_ids)) if player else []
    return render(request, 'game/index.html', {
        'inventory_cards': inventory_cards,
        'slots': slots,
        'hammer_count': hammer_count,
    })


def admin_events(request):
    cards = list(Card.objects.values('slug', 'name', 'score', 'fixed_count'))
    completed = {
        r.event_number: r.winners
        for r in EventResult.objects.all()
    }
    return render(request, 'game/admin_events.html', {
        'event_range': range(1, 17),
        'cards_json': json.dumps(cards, ensure_ascii=False),
        'completed_json': json.dumps(completed, ensure_ascii=False),
    })


@csrf_exempt
@require_POST
def finish_event(request):
    from django.db.models import Q
    data = json.loads(request.body)
    event_num = data.get('event')
    winners = data.get('winners', [])

    if EventResult.objects.filter(event_number=event_num).exists():
        return JsonResponse({'error': 'already_completed'}, status=400)

    awarded = {}
    for item in winners:
        slug = item.get('slug')
        count = max(1, int(item.get('count', 1)))
        try:
            card = Card.objects.get(slug=slug)
        except Card.DoesNotExist:
            continue
        points = card.score * count
        players = Player.objects.filter(Q(slot1=card) | Q(slot2=card) | Q(slot3=card))
        for player in players:
            player.score += points
            player.save(update_fields=['score'])
            awarded[str(player.telegram_id)] = awarded.get(str(player.telegram_id), 0) + points

    EventResult.objects.create(event_number=event_num, winners=winners, awards=awarded)
    return JsonResponse({'ok': True, 'awarded': awarded})


@csrf_exempt
@require_POST
def cancel_event(request):
    from django.db.models import F
    data = json.loads(request.body)
    event_num = data.get('event')
    try:
        result = EventResult.objects.get(event_number=event_num)
    except EventResult.DoesNotExist:
        return JsonResponse({'error': 'not_found'}, status=404)
    for tid_str, points in result.awards.items():
        Player.objects.filter(telegram_id=int(tid_str)).update(score=F('score') - points)
    result.delete()
    return JsonResponse({'ok': True})


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


@csrf_exempt
@require_POST
def set_slot(request):
    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'player_not_found'}, status=404)
    data = json.loads(request.body)
    position = data.get('position')
    slug = data.get('slug')
    if position not in [1, 2, 3]:
        return JsonResponse({'error': 'invalid_position'}, status=400)
    try:
        card = player.collected_cards.get(slug=slug)
    except Card.DoesNotExist:
        return JsonResponse({'error': 'card_not_in_collection'}, status=400)
    if player.hammers <= 0:
        return JsonResponse({'error': 'no_hammers'}, status=400)
    old_card = getattr(player, f'slot{position}')
    setattr(player, f'slot{position}', card)
    player.hammers -= 1
    player.save(update_fields=[f'slot{position}', 'hammers'])
    return JsonResponse({
        'ok': True,
        'hammers': player.hammers,
        'old_slug': old_card.slug if old_card else None,
    })


@csrf_exempt
@require_POST
def clear_slot(request):
    player = get_current_player(request)
    if not player:
        return JsonResponse({'error': 'player_not_found'}, status=404)
    data = json.loads(request.body)
    position = data.get('position')
    if position not in [1, 2, 3]:
        return JsonResponse({'error': 'invalid_position'}, status=400)
    if getattr(player, f'slot{position}') is None:
        return JsonResponse({'error': 'slot_empty'}, status=400)
    if player.hammers <= 0:
        return JsonResponse({'error': 'no_hammers'}, status=400)
    setattr(player, f'slot{position}', None)
    player.hammers -= 1
    player.save(update_fields=[f'slot{position}', 'hammers'])
    return JsonResponse({'ok': True, 'hammers': player.hammers})


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
    missing = CARDS_PER_PACK - len(drawn)
    hammers_earned = 1 + missing
    player.hammers += hammers_earned
    player.save(update_fields=['packs', 'hammers'])
    return JsonResponse({
        'packs_left': player.packs,
        'hammers': player.hammers,
        'hammers_earned': hammers_earned,
        'cards': [{'slug': c.slug} for c in drawn],
        'collection_full': False,
    })
