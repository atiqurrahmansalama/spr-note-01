import os
import sys
import django
import json

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import AcademicInstitution, User
from core.models.notifications import NotificationGatewayConfig, NotificationDispatchLog
from core.notifications import ping_gateway, dispatch_notification, send_telegram_via_provider

inst = AcademicInstitution.objects.first()
admin_user = User.objects.filter(is_superuser=True).first()

print(f"Institution: {inst.name} (ID: {inst.id})")
print(f"Admin User: {admin_user.username if admin_user else 'None'}")

# 1. Test Telegram gateway creation / retrieval
tg_gw, created = NotificationGatewayConfig.objects.get_or_create(
    institution=inst,
    gateway_type='TELEGRAM',
    provider_name='TELEGRAM_BOT',
    defaults={
        "api_key": "@SPRNoteDemoBot",
        "api_secret_or_token": "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ",
        "sender_id_or_phone": "@spr_updates",
        "is_active": True,
    }
)
print(f"Telegram Gateway ID: {tg_gw.id} (Created: {created})")

# 2. Test Ping Gateway (will gracefully test endpoint / error handling with demo token)
ping_res = ping_gateway(tg_gw)
print("Ping Result:", json.dumps(ping_res, indent=2))

# 3. Test Dispatch Notification via Telegram Channel
dispatch_res = dispatch_notification(
    institution=inst,
    event_type="GENERAL_BROADCAST",
    recipient_user=admin_user,
    recipient_identifier="@spr_demo_channel",
    forced_channels=['TELEGRAM', 'IN_APP'],
    custom_message="Assalamu Alaikum! This is a test broadcast via Telegram Bot Gateway.",
    custom_title="SPR Note Telegram Test Broadcast",
)
print("Dispatch Result:", json.dumps(dispatch_res, indent=2, default=str))

# 4. Check Dispatch Logs
latest_log = NotificationDispatchLog.objects.filter(institution=inst, channel='TELEGRAM').first()
if latest_log:
    print(f"Latest Telegram Log: [{latest_log.status}] to {latest_log.recipient_identifier} | Title: {latest_log.message_title} | Error: {latest_log.error_reason}")
else:
    print("No Telegram dispatch log found.")
