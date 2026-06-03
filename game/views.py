import random
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .models import Player, Card


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

    if not available:
        return JsonResponse({'error': 'collection_full'}, status=400)

    player.packs -= 1

    if not available:
        # Колекція повна — +3 молотки
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


def get_current_player(request):
    # TODO: в продакшені — парсити Telegram initData
    user_id = request.GET.get('user_id') or (settings.DEV_PLAYER_ID if settings.DEBUG else None)
    if not user_id:
        return None
    return Player.objects.filter(telegram_id=user_id).first()


def index(request):
    player = get_current_player(request)
    inventory_cards = list(player.collected_cards.all()) if player else []
    active_slots = [None, None, None]  # TODO: зберігати в БД
    hammer_count = player.hammers if player else 0

    return render(request, 'game/index.html', {
        'inventory_cards': inventory_cards,
        'active_slots': active_slots,
        'hammer_count': hammer_count,
    })
