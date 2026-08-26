web: gunicorn core.wsgi:application --bind 0.0.0.0:$PORT --workers 3 --timeout 120
worker: celery -A core worker -l info --concurrency=4
beat: celery -A core beat -l info
release: python backend/manage.py migrate --noinput
