"""
Helpdesk & Notifications Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.notifications import (
    NotificationGatewayConfig,
    NotificationTemplate,
    NotificationTriggerRule,
    InAppNotification,
    NotificationDispatchLog,
)
from core.models.helpdesk import (
    HelpdeskTicket,
    TicketMessage,
    InstitutionalCommunication,
    SystemBugReport,
)

__all__ = [
    'NotificationGatewayConfig',
    'NotificationTemplate',
    'NotificationTriggerRule',
    'InAppNotification',
    'NotificationDispatchLog',
    'HelpdeskTicket',
    'TicketMessage',
    'InstitutionalCommunication',
    'SystemBugReport',
]
