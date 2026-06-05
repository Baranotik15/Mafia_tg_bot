from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('game', '0008_eventresult'),
    ]

    operations = [
        migrations.CreateModel(
            name='PromoCode',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False)),
                ('code', models.CharField(max_length=64, unique=True)),
                ('packs', models.IntegerField()),
                ('created_by', models.BigIntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
