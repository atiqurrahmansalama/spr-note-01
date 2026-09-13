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

# Check assigned WABAs for system user
res1 = requests.get(f"https://graph.facebook.com/v21.0/122098487313477356/assigned_whatsapp_business_accounts", headers=headers)
print("Assigned WABAs:", json.dumps(res1.json(), indent=2))

# Check businesses for system user / token
res2 = requests.get(f"https://graph.facebook.com/v21.0/122098487313477356/businesses", headers=headers)
print("Businesses:", json.dumps(res2.json(), indent=2))

# Check app's WABAs
res3 = requests.get(f"https://graph.facebook.com/v21.0/1635732544888294/whatsapp_business_accounts", headers=headers)
print("App WABAs:", json.dumps(res3.json(), indent=2))
