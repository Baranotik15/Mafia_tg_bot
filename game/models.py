from django.db import models


class Card(models.Model):
    slug = models.SlugField(max_length=64, unique=True)

    def __str__(self):
        return self.slug


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
