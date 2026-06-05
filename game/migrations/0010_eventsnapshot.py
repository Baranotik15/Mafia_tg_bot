from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0009_promocode'),
    ]

    operations = [
        migrations.CreateModel(
            name='EventSnapshot',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('event_number', models.IntegerField(unique=True)),
                ('slots', models.JSONField(default=dict)),
                ('taken_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
