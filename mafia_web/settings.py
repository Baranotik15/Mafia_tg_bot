from pathlib import Path
import logging.handlers
import os
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-dev-secret-key-change-in-production')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

DEBUG = os.getenv('DEBUG', 'True') == 'True'

DEV_PLAYER_ID = int(os.getenv('DEV_PLAYER_ID', 0)) if DEBUG else None

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'game',
]

BOT_TOKEN  = os.getenv('BOT_TOKEN', '')
ADMIN_IDS  = {int(x) for x in os.getenv('ADMIN_IDS', '').split(',') if x.strip()}

_db_engine = os.getenv('DB_ENGINE', 'sqlite')

if _db_engine == 'postgres':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME':     os.getenv('DB_NAME',     'mafia'),
            'USER':     os.getenv('DB_USER',     'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', ''),
            'HOST':     os.getenv('DB_HOST',     'localhost'),
            'PORT':     os.getenv('DB_PORT',     '5432'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
]

ROOT_URLCONF = 'mafia_web.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'game.context_processors.admin_context',
            ],
        },
    },
]

WSGI_APPLICATION = 'mafia_web.wsgi.application'

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage'

SESSION_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True

LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)

class _ColorFormatter(logging.Formatter):
    _YELLOW = '\033[33m'
    _GREEN  = '\033[32m'
    _RESET  = '\033[0m'

    def format(self, record):
        msg = super().format(record)
        if 'ПРОМОКОД' in msg:
            return f'{self._YELLOW}{msg}{self._RESET}'
        if 'ЗАВЕРШЕННЯ' in msg or 'СКАСУВАННЯ' in msg or 'СТАРТ ПОДІЇ' in msg:
            return f'{self._GREEN}{msg}{self._RESET}'
        return msg


LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'readable': {
            'format': '[{asctime}] {message}',
            'style': '{',
            'datefmt': '%d.%m.%Y %H:%M:%S',
        },
        'color_console': {
            '()': lambda: _ColorFormatter(
                fmt='[%(asctime)s] %(message)s',
                datefmt='%d.%m.%Y %H:%M:%S',
            ),
        },
    },
    'handlers': {
        'events_file': {
            'class': 'logging.handlers.WatchedFileHandler',
            'filename': str(LOGS_DIR / 'events.log'),
            'formatter': 'readable',
            'encoding': 'utf-8',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'color_console',
        },
    },
    'loggers': {
        'game.events': {
            'handlers': ['events_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
