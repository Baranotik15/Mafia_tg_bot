from django.core.management.base import BaseCommand
from game.models import Card

CARDS = [
    {'slug': 'executioner',   'name': 'Видалення',       'score': 3, 'fixed_count': False},
    {'slug': 'dry_win',       'name': 'Чиста перемога',  'score': 6, 'fixed_count': True},
    {'slug': 'sheriff_kill',  'name': 'Вбивство шерифа', 'score': 2, 'fixed_count': True},
    {'slug': 'three_on_three','name': '3в3',             'score': 5, 'fixed_count': True},
    {'slug': 'know_the_pain', 'name': 'Пізнай біль',     'score': 5, 'fixed_count': False},
    {'slug': 'handsome',       'name': 'Красень',        'score': 8, 'fixed_count': False},
    {'slug': 'Texas_Massacre', 'name': 'Техаська Різанина','score': 3, 'fixed_count': False},
    {'slug': 'finally',        'name': 'Нарешті',        'score': 5, 'fixed_count': True},
    {'slug': 'without_blast',     'name': 'Без баласту', 'score': 4, 'fixed_count': True},
    {'slug': 'shot_in_the_knee',  'name': 'Постріл у коліно', 'score': 5, 'fixed_count': False},
    {'slug': 'for_distribution',  'name': 'Під Роздачу', 'score': 12, 'fixed_count': True},
    {'slug': 'triplet',           'name': 'Триплет',       'score': 12,  'fixed_count': False},
    {'slug': 'third_wheel',       'name': 'Третій зайвий', 'score': 2,   'fixed_count': True},
    {'slug': 'Three_in_a_row',    'name': 'Три в ряд',     'score': 1,   'fixed_count': True},
    {'slug': 'friendly_fire',     'name': 'Френдліфаер',   'score': 10,  'fixed_count': False},
    {'slug': 'wholesale_offer',   'name': 'Оптова пропозиція', 'score': 8,   'fixed_count': False},
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
