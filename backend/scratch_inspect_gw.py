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

# 1. Debug token
dbg = requests.get(f"https://graph.facebook.com/debug_token?input_token={token}&access_token={token}")
print("Debug Token:", json.dumps(dbg.json(), indent=2))

# 2. Me
me = requests.get("https://graph.facebook.com/v21.0/me?fields=id,name", headers={"Authorization": f"Bearer {token}"})
print("Me:", json.dumps(me.json(), indent=2))

# 3. Phone number
p_url = f"https://graph.facebook.com/v21.0/{phone_id}?fields=id,display_phone_number,verified_name,code_verification_status,quality_rating,platform_type,status"
p_res = requests.get(p_url, headers={"Authorization": f"Bearer {token}"})
print("Phone info:", json.dumps(p_res.json(), indent=2))
