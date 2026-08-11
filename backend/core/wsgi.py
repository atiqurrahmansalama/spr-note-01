"""
WSGI config for core project.

It exposes the WSGI callable as a module-level variable named ``application``.
Also exposes ``app`` for Vercel Serverless Function deployment.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

application = get_wsgi_application()

# Exposed Vercel Serverless Function Handler
app = application
