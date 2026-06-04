from django.http import HttpResponse
from django.conf import settings

_OPEN_IN_TG = (
    '<!doctype html><html><head><meta charset="utf-8">'
    '<meta name="viewport" content="width=device-width,initial-scale=1">'
    '<title>Mafia</title><style>'
    'body{margin:0;display:flex;align-items:center;justify-content:center;'
    'height:100vh;background:#111;color:#fff;font-family:sans-serif;text-align:center}'
    '</style></head><body>'
    '<div><p>Відкрийте застосунок через Telegram</p>'
    '<a href="https://t.me/" style="color:#5b9bd5">Відкрити Telegram</a></div>'
    '</body></html>'
)

_SKIP_PATHS = {'/auth/'}


class TelegramAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path not in _SKIP_PATHS:
            has_session = bool(request.session.get('telegram_id'))
            has_dev = settings.DEBUG and getattr(settings, 'DEV_PLAYER_ID', None)
            if not has_session and not has_dev:
                return HttpResponse(_OPEN_IN_TG, status=403, content_type='text/html')
        return self.get_response(request)
