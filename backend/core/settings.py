import os
import importlib
import importlib.util
import dj_database_url
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file if present
load_dotenv(BASE_DIR / ".env")

# Logs Directory Creation
LOGS_DIR = BASE_DIR / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)


# Security Headers & Env Configuration
SECRET_KEY = os.getenv("SECRET_KEY", os.getenv("DJANGO_SECRET_KEY", "insecure-dev-key-change-in-production-min-50-characters-long"))
DEBUG = os.getenv("DEBUG", os.getenv("DJANGO_DEBUG", "False")).lower() in ("true", "1", "t")

# Dynamic Allowed Hosts (Safe environment extraction)
_raw_allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
if _raw_allowed_hosts.strip() == "*":
    ALLOWED_HOSTS = ["*"] if DEBUG else ["localhost", "127.0.0.1", "[::1]"]
else:
    ALLOWED_HOSTS = [h.strip() for h in _raw_allowed_hosts.split(",") if h.strip()]
if "localhost" not in ALLOWED_HOSTS and DEBUG:
    ALLOWED_HOSTS.extend(["localhost", "127.0.0.1", "[::1]"])

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = "core.User"

INSTALLED_APPS = []

# Optional ASGI Daphne & Channels (if installed in environment)
if importlib.util.find_spec("daphne") is not None:
    INSTALLED_APPS.append("daphne")

if importlib.util.find_spec("channels") is not None:
    INSTALLED_APPS.append("channels")

INSTALLED_APPS += [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party packages
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "storages",

    # Internal apps
    "core",
]

MIDDLEWARE = [
    "core.middleware.RequestCorrelationMiddleware",  # Correlation ID (Must be 1st)
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # Static files (must be 2nd)
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core.middleware.UserActivityMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ROOT_URLCONF = "urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"



# Database Configuration
# Primary: PostgreSQL (via DATABASE_URL or individual POSTGRES_* environment variables)
# Fallback: Local Developer SQLite only if USE_SQLITE=True is explicitly specified

USE_SQLITE = os.getenv("USE_SQLITE", "False").lower() in ("true", "1", "t")
DATABASE_URL = os.getenv("DATABASE_URL")
DB_SSL_REQUIRE = os.getenv("DB_SSL_REQUIRE", "False").lower() in ("true", "1", "t")
DB_CONN_MAX_AGE = int(os.getenv("DB_CONN_MAX_AGE", "600"))

if DATABASE_URL and not USE_SQLITE:
    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=DB_CONN_MAX_AGE,
            conn_health_checks=True,
            ssl_require=DB_SSL_REQUIRE,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# REST Framework Configurations
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "core.authentication.FlexibleJWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.AllowAny",
    ),
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "DEFAULT_THROTTLING_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLING_RATES": {
        "anon": "10/minute",
        "user": "200/minute",
        "sms_scope": "3/minute",
    }
}

# OpenAPI / Swagger Settings (drf-spectacular)
SPECTACULAR_SETTINGS = {
    'TITLE': 'Suffah Hifz Management System API',
    'DESCRIPTION': 'Comprehensive REST API documentation for Web, Android, and iOS clients.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SWAGGER_UI_SETTINGS': {
        'deepLinking': True,
        'persistAuthorization': True,
        'displayOperationId': True,
    },
    'COMPONENT_SPLIT_PATCH': True,
    'COMPONENT_SPLIT_REQUEST': True,
}

# SimpleJWT Settings (Hardened Lifetimes & Token Rotation)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", "60"))),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv("JWT_REFRESH_TOKEN_LIFETIME_DAYS", "14"))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Static & Media files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles_build', 'static')
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Production Cloud Object Storage (AWS S3 / Cloudflare R2 / DigitalOcean Spaces)
USE_S3 = os.getenv("USE_S3", "False").lower() in ("true", "1", "t")
if USE_S3:
    AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_STORAGE_BUCKET_NAME = os.getenv("AWS_STORAGE_BUCKET_NAME", "")
    AWS_S3_ENDPOINT_URL = os.getenv("AWS_S3_ENDPOINT_URL", None)
    AWS_S3_REGION_NAME = os.getenv("AWS_S3_REGION_NAME", "auto")
    AWS_S3_CUSTOM_DOMAIN = os.getenv("AWS_S3_CUSTOM_DOMAIN", None)
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }
else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# Celery & Asynchronous Background Task Queue
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://localhost:6379/0"))
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Asia/Dhaka'
# When CELERY_ALWAYS_EAGER is True (or in local dev/tests without Redis), tasks run synchronously in-process
CELERY_TASK_ALWAYS_EAGER = os.getenv("CELERY_ALWAYS_EAGER", "False").lower() in ("true", "1", "t") or DEBUG

# Redis & In-Memory High Performance Caching Layer
REDIS_URL = os.getenv("REDIS_URL", os.getenv("CACHE_URL", ""))
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "IGNORE_EXCEPTIONS": True,
            },
            "KEY_PREFIX": "spr_note",
            "TIMEOUT": 300,
        }
    }
else:
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "spr_note_local_cache",
            "TIMEOUT": 300,
        }
    }

# Django Channels Real-Time WebSocket Layer
if "channels" in INSTALLED_APPS:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer" if (REDIS_URL and not DEBUG) else "channels.layers.InMemoryChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL] if (REDIS_URL and not DEBUG) else [],
            },
        },
    }

# Sentry & System APM Observability (Production Ready)
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN and not DEBUG and importlib.util.find_spec("sentry_sdk") is not None:
    try:
        sentry_sdk = importlib.import_module("sentry_sdk")
        django_integ = importlib.import_module("sentry_sdk.integrations.django").DjangoIntegration
        celery_integ = importlib.import_module("sentry_sdk.integrations.celery").CeleryIntegration
        redis_integ = importlib.import_module("sentry_sdk.integrations.redis").RedisIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                django_integ(),
                celery_integ(),
                redis_integ(),
            ],
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", "0.2")),
            send_default_pii=False,
            environment=os.getenv("ENVIRONMENT", "production"),
        )
    except Exception as _sentry_err:
        pass

# CORS Configuration
from corsheaders.defaults import default_headers

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-tenant-id',
    'x-device-id',
    'x-app-version',
    'x-csrftoken',
]

# In production, restrict to explicit frontend domain URLs
CORS_ALLOWED_ORIGINS_STR = os.getenv("CORS_ALLOWED_ORIGINS", "")
if CORS_ALLOWED_ORIGINS_STR:
    CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ALLOWED_ORIGINS_STR.split(",") if o.strip()]
    CORS_ALLOW_ALL_ORIGINS = False
else:
    # Explicit safe development origins (No wildcard allowed)
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    CORS_ALLOW_ALL_ORIGINS = False

SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin-allow-popups'


# Baseline & Production Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

if not DEBUG:
    SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1", "t")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "31536000"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# Logging & Observability
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "correlation": {
            "()": "core.logging_formatters.CorrelationLogFilter",
        },
    },
    "formatters": {
        "verbose": {
            "format": "[{asctime}] [{levelname}] [req:{request_id}] [tenant:{tenant_id}] [{name}:{lineno}] - {message}",
            "style": "{",
        },
        "json": {
            "()": "core.logging_formatters.StructuredJsonLogFormatter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if os.getenv("STRUCTURED_LOGGING", "False").lower() in ("true", "1") or not DEBUG else "verbose",
            "filters": ["correlation"],
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "django.request": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "core": {
            "handlers": ["console"],
            "level": "DEBUG",
            "propagate": False,
        },
    },
}

# SMTP Email & IAM System Configuration
EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.console.EmailBackend" if DEBUG else "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", 587))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", f"Suffah Hifz LMS <{EMAIL_HOST_USER or 'noreply@suffahhifz.com'}>")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
GOOGLE_OAUTH_CLIENT_ID = os.getenv("GOOGLE_OAUTH_CLIENT_ID", os.getenv("VITE_GOOGLE_CLIENT_ID", ""))
GOOGLE_OAUTH_CLIENT_SECRET = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET", "")

# Reverse proxy SSL termination settings for Vercel / Railway
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
USE_X_FORWARDED_HOST = True
USE_X_FORWARDED_PORT = True