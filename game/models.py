from django.db import models

RARITY_CHOICES = [
    ('common',    'Common'),
    ('uncommon',  'Uncommon'),
    ('rare',      'Rare'),
    ('epic',      'Epic'),
    ('legendary', 'Legendary'),
]

RARITY_FRAME = {
    'common':    'bronze',
    'uncommon':  'bronze',
    'rare':      'silver',
    'epic':      'silver',
    'legendary': 'gold',
}

RARITY_VALUE = {
    'common':    1.0,
    'uncommon':  1.3,
    'rare':      1.6,
    'epic':      2.0,
    'legendary': 2.5,
}


class Card(models.Model):
    slug        = models.SlugField(max_length=64, unique=True)
    name        = models.CharField(max_length=64)
    rarity      = models.CharField(max_length=16, choices=RARITY_CHOICES, default='common')
    description = models.TextField(blank=True)

    @property
    def frame(self):
        return RARITY_FRAME.get(self.rarity, 'bronze')

    @property
    def value(self):
        return RARITY_VALUE.get(self.rarity, 1.0)

    def __str__(self):
        return f'{self.name} ({self.rarity})'


class Player(models.Model):
    telegram_id     = models.BigIntegerField(unique=True)
    username        = models.CharField(max_length=64)
    score           = models.IntegerField(default=0)
    packs           = models.IntegerField(default=1)
    hammers         = models.IntegerField(default=5)
    collected_cards = models.ManyToManyField(Card, blank=True, related_name='owners')

    class Meta:
        ordering = ['-score']

    def __str__(self):
        return f'{self.username} ({self.score})'
