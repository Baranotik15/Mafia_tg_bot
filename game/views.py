from django.shortcuts import render


def packs(request):
    return render(request, 'game/packs.html', {'pack_count': 3})


def leaders(request):
    all_players = [
        {'rank': 1,  'name': 'ShadowMaster', 'score': 15230},
        {'rank': 2,  'name': 'DarkKnight99',  'score': 12480},
        {'rank': 3,  'name': 'NightOwl',      'score': 9760},
        {'rank': 4,  'name': 'IronWolf',      'score': 8340},
        {'rank': 5,  'name': 'CrimsonAce',    'score': 7120},
        {'rank': 6,  'name': 'RedPhoenix',    'score': 6450},
        {'rank': 7,  'name': 'GhostBlade',    'score': 5280},
        {'rank': 8,  'name': 'StormRider',    'score': 4890},
        {'rank': 9,  'name': 'BlazeWolf',     'score': 3760},
        {'rank': 10, 'name': 'VoidWalker',    'score': 3120},
    ]
    current_player = {'rank': 12, 'name': 'YouPlayer', 'score': 2340}
    return render(request, 'game/leaders.html', {
        'top3': all_players[:3],
        'rest': all_players[3:],
        'current_player': current_player,
    })


def index(request):
    inventory_cards = [
        {'name': 'Шериф',     'icon': '⭐', 'value': '2.4', 'rarity': 'legendary', 'description': 'Страж закона в тёмном городе. Ведёт тайное следствие.'},
        {'name': 'Мафия',     'icon': '🔫', 'value': '1.8', 'rarity': 'rare',      'description': 'Тень в ночи. Не знает пощады и не оставляет следов.'},
        {'name': 'Доктор',    'icon': '💊', 'value': '1.6', 'rarity': 'rare',      'description': 'Единственный, кто может спасти жертву прошлой ночи.'},
        {'name': 'Детектив',  'icon': '🔍', 'value': '1.4', 'rarity': 'uncommon',  'description': 'Каждую ночь проверяет одного жителя города.'},
        {'name': 'Маньяк',    'icon': '🔪', 'value': '2.0', 'rarity': 'epic',      'description': 'Действует один против всех. Цель — остаться последним.'},
        {'name': 'Мирный',    'icon': '🕊',  'value': '1.0', 'rarity': 'common',    'description': 'Простой житель. Сила его — в голосе на собрании.'},
        {'name': 'Путана',    'icon': '💃', 'value': '1.5', 'rarity': 'uncommon',  'description': 'Блокирует действие одного игрока за ночь.'},
        {'name': 'Снайпер',   'icon': '🎯', 'value': '1.9', 'rarity': 'epic',      'description': 'Один выстрел в игре. Промах — потеря способности навсегда.'},
        {'name': 'Адвокат',   'icon': '⚖',  'value': '1.3', 'rarity': 'common',    'description': 'Защищает от проверки детектива. Скрывает правду.'},
        {'name': 'Крёстный',  'icon': '👑', 'value': '2.8', 'rarity': 'legendary', 'description': 'Глава мафии, невидимый в тени. Управляет всеми нитями.'},
        {'name': 'Комиссар',  'icon': '🏛',  'value': '1.7', 'rarity': 'rare',      'description': 'Может ликвидировать одного бандита за ночь.'},
        {'name': 'Телохран.', 'icon': '🛡',  'value': '1.5', 'rarity': 'uncommon',  'description': 'Встаёт под удар вместо выбранного игрока.'},
    ]
    active_slots = [
        {'name': 'Детектив', 'icon': '🔍', 'frame': 'bronze', 'value': '1.4'},
        {'name': 'Мафия',    'icon': '🔫', 'frame': 'silver', 'value': '1.8'},
        {'name': 'Шериф',    'icon': '⭐', 'frame': 'gold',   'value': '2.4'},
    ]

    return render(request, 'game/index.html', {
        'inventory_cards': inventory_cards,
        'active_slots': active_slots,
        'hammer_count': 5,
    })
