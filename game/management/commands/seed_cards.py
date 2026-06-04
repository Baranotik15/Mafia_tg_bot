from django.core.management.base import BaseCommand
from game.models import Card

SLUGS = [
    'executioner',
    'dry_win',
    'sheriff_kill',
    'three_on_three',
]


class Command(BaseCommand):
    help = 'Seed database with 20 cards'

    def handle(self, *args, **options):
        removed = Card.objects.exclude(slug__in=SLUGS).delete()
        created = sum(
            1 for slug in SLUGS
            if Card.objects.get_or_create(slug=slug)[1]
        )
        self.stdout.write(self.style.SUCCESS(
            f'Done. Removed {removed[0]}, created {created}, total {Card.objects.count()} cards.'
        ))
