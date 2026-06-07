from django.db import models


class Card(models.Model):
    slug        = models.SlugField(max_length=64, unique=True)
    name        = models.CharField(max_length=128, default='')
    score       = models.IntegerField(default=1)
    fixed_count = models.BooleanField(default=False)

    def __str__(self):
        fixed = 'фіксовано' if self.fixed_count else 'змінний'
        return f'[{self.slug}] {self.name or "—"} | очки: {self.score} | лічильник: {fixed}'


class EventSnapshot(models.Model):
    event_number = models.IntegerField(unique=True)
    # {str(telegram_id): [slot1_slug_or_null, slot2_slug_or_null, slot3_slug_or_null]}
    slots        = models.JSONField(default=dict)
    taken_at     = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Снепшот події {self.event_number} | {self.taken_at:%Y-%m-%d %H:%M}'


class EventResult(models.Model):
    event_number = models.IntegerField(unique=True)
    winners      = models.JSONField(default=list)   # [{slug, count}, ...]
    awards       = models.JSONField(default=dict)   # {str(telegram_id): points}
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Подія {self.event_number} | {self.completed_at:%Y-%m-%d %H:%M}'


class PromoCode(models.Model):
    code       = models.CharField(max_length=64, unique=True)
    packs      = models.IntegerField()
    created_by = models.BigIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.code} | {self.packs} паків | від {self.created_by}'


class Player(models.Model):
    telegram_id     = models.BigIntegerField(unique=True)
    username        = models.CharField(max_length=64)
    first_name      = models.CharField(max_length=64, blank=True, default='')
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
