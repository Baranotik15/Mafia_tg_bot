from pathlib import Path
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

BOT_TOKEN = os.getenv('BOT_TOKEN', '')

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
            ],
        },
    },
]

WSGI_APPLICATION = 'mafia_web.wsgi.application'

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

SESSION_COOKIE_SAMESITE = 'None'
SESSION_COOKIE_SECURE = True
