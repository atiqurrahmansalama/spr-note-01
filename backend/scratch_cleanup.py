import os
import sys
import django

sys.path.insert(0, os.path.abspath('.'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.notifications import NotificationGatewayConfig, NotificationDispatchLog

NotificationGatewayConfig.objects.filter(gateway_type='TELEGRAM', api_key='@SPRNoteDemoBot').delete()
print("Cleaned up test telegram gateway.")
