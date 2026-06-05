from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0007_card_name_card_score_card_fixed_count'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventResult',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('event_number', models.IntegerField(unique=True)),
                ('winners', models.JSONField(default=list)),
                ('awards', models.JSONField(default=dict)),
                ('completed_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
