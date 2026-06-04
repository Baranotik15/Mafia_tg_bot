from django.conf import settings


def admin_context(request):
    telegram_id = request.session.get('telegram_id')
    if not telegram_id and settings.DEBUG:
        telegram_id = settings.DEV_PLAYER_ID
    is_admin = bool(telegram_id and int(telegram_id) in settings.ADMIN_IDS)
    return {'is_admin': is_admin}
