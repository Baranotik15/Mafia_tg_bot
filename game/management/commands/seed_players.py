from django.core.management.base import BaseCommand
from game.models import Player

SEED_DATA = [
    # (telegram_id, username, score, packs)
    (100001, 'ShadowMaster', 50, 7),
    (100002, 'DarkKnight99',  45, 3),
    (100003, 'NightOwl',      40, 5),
    (100004, 'IronWolf',      35, 2),
    (100005, 'CrimsonAce',    29, 4),
    (100006, 'RedPhoenix',    24, 1),
]


class Command(BaseCommand):
    help = 'Seed database with test players'

    def handle(self, *args, **options):
        created = 0
        for tg_id, name, score, packs in SEED_DATA:
            _, was_created = Player.objects.update_or_create(
                telegram_id=tg_id,
                defaults={'username': name, 'score': score, 'packs': packs},
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created {created}, total {Player.objects.count()} players.'
        ))
