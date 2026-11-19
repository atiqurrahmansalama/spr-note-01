"""
Helpdesk & Notifications Module Routing Table.
Provides RESTful endpoints for notifications, gateways, templates, triggers,
dispatch logs, and manual broadcasts.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    InAppNotificationViewSet,
    NotificationGatewayViewSet,
    NotificationTemplateViewSet,
    NotificationTriggerRuleViewSet,
    NotificationDispatchLogViewSet,
    ManualBroadcastViewSet,
)

router = SimpleRouter()
router.register(r'in-app', InAppNotificationViewSet, basename='notifications-in-app')
router.register(r'gateways', NotificationGatewayViewSet, basename='notifications-gateways')
router.register(r'templates', NotificationTemplateViewSet, basename='notifications-templates')
router.register(r'triggers', NotificationTriggerRuleViewSet, basename='notifications-triggers')
router.register(r'logs', NotificationDispatchLogViewSet, basename='notifications-logs')
router.register(r'broadcast', ManualBroadcastViewSet, basename='notifications-broadcast')

urlpatterns = [
    path('', include(router.urls)),
]
