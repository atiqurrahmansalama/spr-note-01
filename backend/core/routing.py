from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'^ws/attendance/(?P<tenant_id>[^/]+)/$', consumers.AttendanceLiveConsumer.as_asgi()),
    re_path(r'^ws/notifications/(?P<tenant_id>[^/]+)/$', consumers.SystemNotificationConsumer.as_asgi()),
]
