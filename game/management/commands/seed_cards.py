from django.core.management.base import BaseCommand
from game.models import Card

CARDS = [
    # legendary (3)
    ('sheriff',      'Шериф',        'legendary', 'Страж закона в тёмном городе. Ведёт тайное следствие.'),
    ('godfather',    'Хрещений',     'legendary', 'Глава мафії, невидимий у тіні. Керує всіма нитками.'),
    ('mayor',        'Мер',          'legendary', 'Його голос на виборах рахується двічі.'),
    # epic (3)
    ('maniac',       'Маньяк',       'epic',      'Діє один проти всіх. Ціль — залишитися останнім.'),
    ('sniper',       'Снайпер',      'epic',      'Один постріл у грі. Промах — втрата здатності назавжди.'),
    ('jester',       'Блазень',      'epic',      'Мета — бути вигнаним містом. Перемагає наодинці.'),
    # rare (5)
    ('mafia',        'Мафія',        'rare',      'Тінь у ночі. Не знає жалю і не залишає слідів.'),
    ('doctor',       'Доктор',       'rare',      'Єдиний, хто може врятувати жертву минулої ночі.'),
    ('commissar',    'Комісар',      'rare',      'Може ліквідувати одного бандита за ніч.'),
    ('priest',       'Священик',     'rare',      'Захищає одного гравця від смерті раз за гру.'),
    ('executioner',  'Кат',          'rare',      'Мусить домогтися вигнання своєї жертви містом.'),
    # uncommon (5)
    ('detective',    'Детектив',     'uncommon',  'Щоночі перевіряє одного жителя міста.'),
    ('bodyguard',    'Охоронець',    'uncommon',  'Встає під удар замість обраного гравця.'),
    ('prostitute',   'Путана',       'uncommon',  'Блокує дію одного гравця за ніч.'),
    ('spy',          'Шпигун',       'uncommon',  'Дізнається роль будь-якого гравця раз за гру.'),
    ('janitor',      'Двірник',      'uncommon',  'Прибирає тіло, приховуючи роль убитого.'),
    # common (4)
    ('lawyer',       'Адвокат',      'common',    'Захищає від перевірки детектива. Приховує правду.'),
    ('civilian',     'Мирний',       'common',    'Простий житель. Сила його — в голосі на зборах.'),
    ('framer',       'Провокатор',   'common',    'Підставляє невинного гравця під перевірку.'),
    ('survivor',     'Виживший',     'common',    'Просто хоче вижити до кінця гри будь-якою ціною.'),
]

KEEP_SLUGS = {slug for slug, *_ in CARDS}


class Command(BaseCommand):
    help = 'Seed database with 20 unique cards'

    def handle(self, *args, **options):
        # Remove cards not in the new list
        removed = Card.objects.exclude(slug__in=KEEP_SLUGS).delete()

        created = 0
        for slug, name, rarity, desc in CARDS:
            _, was_created = Card.objects.update_or_create(
                slug=slug,
                defaults={'name': name, 'rarity': rarity, 'description': desc},
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(
            f'Done. Removed {removed[0]}, created {created}, total {Card.objects.count()} cards.'
        ))
