from django.core.management.base import BaseCommand
from game.models import Card

CARDS = [
    {'slug': 'executioner',   'name': 'Зачистка',       'score': 6, 'fixed_count': False},
    {'slug': 'sanitary_day',  'name': 'Санітарний день', 'score': 8, 'fixed_count': False},
    {'slug': 'burned',        'name': 'Спалився',        'score': 2, 'fixed_count': False},
    {'slug': 'no_chance',     'name': 'Безшансова',      'score': 5, 'fixed_count': False},
    {'slug': 'know_the_pain', 'name': 'Пізнай біль',     'score': 5, 'fixed_count': False},
    {'slug': 'handsome',       'name': 'Красень',        'score': 8, 'fixed_count': False},
    {'slug': 'Texas_Massacre', 'name': 'Техаська Різанина','score': 3, 'fixed_count': False},
    {'slug': 'finally',        'name': 'Нарешті',        'score': 5, 'fixed_count': False},
    {'slug': 'without_blast',     'name': 'Без баласту', 'score': 4, 'fixed_count': False},
    {'slug': 'shot_in_the_knee',  'name': 'Постріл у коліно', 'score': 5, 'fixed_count': False},
    {'slug': 'for_distribution',  'name': 'Під Роздачу', 'score': 12, 'fixed_count': False},
    {'slug': 'triplet',           'name': 'Триплет',       'score': 12,  'fixed_count': False},
    {'slug': 'third_wheel',       'name': 'Третій зайвий', 'score': 2,   'fixed_count': False},
    {'slug': 'Three_in_a_row',    'name': 'Три в ряд',     'score': 1,   'fixed_count': False},
    {'slug': 'friendly_fire',     'name': 'Френдліфаер',   'score': 10,  'fixed_count': False},
    {'slug': 'wholesale_offer',   'name': 'Оптова пропозиція', 'score': 8,   'fixed_count': False},
    {'slug': 'stormed',           'name': 'Штормило',      'score': 3,   'fixed_count': False},
    {'slug': '3_finger_armor',    'name': 'Броня в 3 пальці',  'score': 5,   'fixed_count': False},
    {'slug': 'lector',            'name': 'Лектор',         'score': 3,   'fixed_count': False},
    {'slug': 'on_the_teeth',      'name': 'На зубах',       'score': 20,  'fixed_count': False},
]


class Command(BaseCommand):
    help = 'Seed database with cards'

    def handle(self, *args, **options):
        slugs = [c['slug'] for c in CARDS]
        removed = Card.objects.exclude(slug__in=slugs).delete()
        created = 0
        for data in CARDS:
            card, is_new = Card.objects.get_or_create(slug=data['slug'])
            card.name = data['name']
            card.score = data['score']
            card.fixed_count = data['fixed_count']
            card.save(update_fields=['name', 'score', 'fixed_count'])
            if is_new:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f'Done. Removed {removed[0]}, created {created}, total {Card.objects.count()} cards.'
        ))
