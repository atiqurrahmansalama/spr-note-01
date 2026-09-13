import os
import sys
import django
import requests
import json

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.notifications import NotificationGatewayConfig

c = NotificationGatewayConfig.objects.filter(gateway_type='WHATSAPP').first()
token = (c.api_secret_or_token or "").strip()
if token.startswith("Bearer "):
    token = token.replace("Bearer ", "", 1).strip()
phone_id = (c.api_key or c.sender_id_or_phone or "").strip()

headers = {"Authorization": f"Bearer {token}"}

# Check phone number registration & certificate
res = requests.get(f"https://graph.facebook.com/v21.0/{phone_id}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,status,throughput,is_pin_enabled,account_mode", headers=headers)
print("Phone Extended Info:", json.dumps(res.json(), indent=2))
