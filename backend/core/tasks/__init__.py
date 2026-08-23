"""
Core Celery & Background Async Task Suite
Provides async job processing for bulk notifications, report compilations, and biometric punches.
"""
from .notifications import (
    send_bulk_sms_task,
    dispatch_push_notification_task,
    send_email_notification_task,
)
from .attendance import (
    process_biometric_punches_task,
    generate_daily_attendance_summary_task,
)
from .reports import (
    compile_custom_report_task,
)

__all__ = [
    'send_bulk_sms_task',
    'dispatch_push_notification_task',
    'send_email_notification_task',
    'process_biometric_punches_task',
    'generate_daily_attendance_summary_task',
    'compile_custom_report_task',
]
