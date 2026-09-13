import os
import sys
import django
import requests
import json

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.notifications import NotificationGatewayConfig

tg_gw = NotificationGatewayConfig.objects.filter(gateway_type='TELEGRAM').first()
if tg_gw:
    print(f"Gateway ID: {tg_gw.id}")
    print(f"Provider: {tg_gw.provider_name}, Active: {tg_gw.is_active}")
    print(f"ApiKey (Username): {tg_gw.api_key}")
    print(f"Sender (Chat/Channel): {tg_gw.sender_id_or_phone}")
    token = (tg_gw.api_secret_or_token or tg_gw.api_key or "").strip()
    
    # 1. Get Me (Bot details)
    me = requests.get(f"https://api.telegram.org/bot{token}/getMe")
    print("Bot info (getMe):", json.dumps(me.json(), indent=2))
    
    # 2. Get Updates (Check if user has messaged or started the bot)
    updates = requests.get(f"https://api.telegram.org/bot{token}/getUpdates")
    print("Recent Updates (getUpdates):", json.dumps(updates.json(), indent=2))
else:
    print("No Telegram gateway configured yet.")
