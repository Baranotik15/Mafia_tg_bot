from django.db import models


class Card(models.Model):
    slug        = models.SlugField(max_length=64, unique=True)
    name        = models.CharField(max_length=128, default='')
    score       = models.IntegerField(default=1)
    fixed_count = models.BooleanField(default=False)

    def __str__(self):
        fixed = 'фіксовано' if self.fixed_count else 'змінний'
        return f'[{self.slug}] {self.name or "—"} | очки: {self.score} | лічильник: {fixed}'


class Player(models.Model):
    telegram_id     = models.BigIntegerField(unique=True)
    username        = models.CharField(max_length=64)
    score           = models.IntegerField(default=0)
    packs           = models.IntegerField(default=1)
    hammers         = models.IntegerField(default=5)
    collected_cards = models.ManyToManyField(Card, blank=True, related_name='owners')
    slot1           = models.ForeignKey(Card, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    slot2           = models.ForeignKey(Card, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    slot3           = models.ForeignKey(Card, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')

    class Meta:
        ordering = ['-score']

    def __str__(self):
        return f'{self.username} ({self.score})'
