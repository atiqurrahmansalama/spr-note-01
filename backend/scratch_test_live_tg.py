import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.notifications import NotificationGatewayConfig
from core.notifications import ping_gateway, send_telegram_via_provider

tg_gw = NotificationGatewayConfig.objects.filter(gateway_type='TELEGRAM').first()
if tg_gw:
    # Update default sender to user's chat id
    tg_gw.sender_id_or_phone = "6327840544"
    tg_gw.save(update_fields=['sender_id_or_phone'])

    res = send_telegram_via_provider(
        tg_gw,
        "6327840544",
        "Assalamu Alaikum! Congratulations, your SPR Note Telegram Notification Gateway is successfully connected and working perfectly!",
        title="SPR Note Notification Hub"
    )
    print("Live Send Result:", json.dumps(res, indent=2))
