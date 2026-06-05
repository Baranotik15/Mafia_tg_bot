from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0006_player_slot1_player_slot2_player_slot3'),
    ]

    operations = [
        migrations.AddField(
            model_name='card',
            name='name',
            field=models.CharField(max_length=128, default=''),
        ),
        migrations.AddField(
            model_name='card',
            name='score',
            field=models.IntegerField(default=1),
        ),
        migrations.AddField(
            model_name='card',
            name='fixed_count',
            field=models.BooleanField(default=False),
        ),
    ]
