import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.notifications import NotificationGatewayConfig
from core.notifications import ping_gateway

tg_gw = NotificationGatewayConfig.objects.filter(gateway_type='TELEGRAM').first()
res = ping_gateway(tg_gw)
print("Ping Result:", json.dumps(res, indent=2))
