from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

class SavedMessage(models.Model):
    text = models.TextField()
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_messages'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text[:30]


class NotificationGatewayConfig(models.Model):
    GATEWAY_TYPE_CHOICES = (
        ('SMS', 'SMS Gateway Provider'),
        ('WHATSAPP', 'WhatsApp Cloud API'),
        ('SMTP_EMAIL', 'SMTP Email Server'),
        ('PUSH_FCM', 'Firebase Push Notification (FCM)'),
    )

    PROVIDER_CHOICES = (
        ('SSL_WIRELESS', 'SSL Wireless (Bangladesh)'),
        ('GREENWEB', 'Greenweb SMS Gateway'),
        ('TWILIO', 'Twilio Global SMS / Messaging'),
        ('BULK_SMS_BD', 'BulkSMS BD Provider'),
        ('WHATSAPP_META', 'Meta WhatsApp Business Cloud API'),
        ('SMTP_CUSTOM', 'Custom SMTP Email Server'),
        ('GENERIC_REST', 'Custom REST Webhook Gateway'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='notification_gateways'
    )
    gateway_type = models.CharField(max_length=20, choices=GATEWAY_TYPE_CHOICES, default='SMS', db_index=True)
    provider_name = models.CharField(max_length=40, choices=PROVIDER_CHOICES, default='SSL_WIRELESS')
    api_key = models.CharField(max_length=255, blank=True, default='')
    api_secret_or_token = models.TextField(blank=True, default='')
    sender_id_or_phone = models.CharField(max_length=100, blank=True, default='')
    api_url = models.CharField(max_length=255, blank=True, default='')
    port = models.IntegerField(default=587, null=True, blank=True)
    use_tls_ssl = models.BooleanField(default=True)
    is_active = models.BooleanField(default=False)
    extra_headers_or_params = models.JSONField(default=dict, blank=True)
    balance_cache = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, default=0.00)
    last_ping_status = models.CharField(max_length=50, blank=True, default='UNTESTED')
    last_ping_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['gateway_type', 'provider_name']
        verbose_name = "Notification Gateway Config"
        verbose_name_plural = "Notification Gateway Configs"

    def __str__(self):
        return f"{self.get_gateway_type_display()} ({self.get_provider_name_display()}) - {self.institution.name}"


class NotificationTemplate(models.Model):
    EVENT_TYPE_CHOICES = (
        ('STUDENT_ABSENT', 'Student Absent / Unexcused Alert'),
        ('STUDENT_LATE', 'Student Late Arrival Alert'),
        ('GATE_BUNK_ALERT', 'Gate Discrepancy & Bunk Alert'),
        ('NEW_ADMISSION', 'Student Admission Confirmation Voucher'),
        ('DAILY_REPORT_SAVED', 'Daily Recitation Progress Report'),
        ('STAFF_LEAVE_ACTION', 'Staff Leave Desk Notice'),
        ('GENERAL_BROADCAST', 'General Institutional Announcement'),
        ('CUSTOM', 'Custom Template'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='notification_templates'
    )
    name = models.CharField(max_length=150)
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES, default='CUSTOM', db_index=True)
    subject = models.CharField(max_length=255, blank=True, default='')
    body = models.TextField()
    available_tags = models.JSONField(default=list, blank=True)
    is_system_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_system_default', 'name']
        verbose_name = "Notification Template"
        verbose_name_plural = "Notification Templates"

    def __str__(self):
        return f"{self.name} [{self.get_event_type_display()}] - {self.institution.name}"


class NotificationTriggerRule(models.Model):
    EVENT_TYPE_CHOICES = (
        ('STUDENT_ABSENT', 'Student Absent / Unexcused Alert'),
        ('STUDENT_LATE', 'Student Late Arrival Alert'),
        ('GATE_BUNK_ALERT', 'Gate Entry/Exit Discrepancy & Bunk Alert'),
        ('NEW_ADMISSION', 'Student Admission Confirmation'),
        ('DAILY_REPORT_SAVED', 'Daily Recitation Report Generated'),
        ('STAFF_LEAVE_ACTION', 'Staff Leave Applied / Approved'),
        ('INSTITUTIONAL_ANNOUNCEMENT', 'General Institutional Announcement'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='notification_triggers'
    )
    event_type = models.CharField(max_length=40, choices=EVENT_TYPE_CHOICES, db_index=True)
    channels = models.JSONField(
        default=list,
        blank=True,
        help_text="List of active channels e.g. ['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL']"
    )
    is_enabled = models.BooleanField(default=True)
    template = models.ForeignKey(
        NotificationTemplate,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='trigger_rules'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['event_type']
        constraints = [
            models.UniqueConstraint(
                fields=['institution', 'event_type'],
                name='unique_institution_notification_trigger'
            )
        ]
        verbose_name = "Notification Trigger Rule"
        verbose_name_plural = "Notification Trigger Rules"

    def __str__(self):
        return f"{self.get_event_type_display()} Trigger ({', '.join(self.channels)}) - {self.institution.name}"


class InAppNotification(models.Model):
    NOTIFICATION_TYPE_CHOICES = (
        ('INFO', 'Information'),
        ('WARNING', 'Warning / Notice'),
        ('SUCCESS', 'Success / Verified'),
        ('ALERT', 'Critical Alert'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='in_app_notifications'
    )
    recipient = models.ForeignKey('core.User',
        on_delete=models.CASCADE,
        related_name='in_app_notifications',
        db_index=True
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES, default='INFO')
    action_url = models.CharField(max_length=255, blank=True, default='')
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "In-App Notification"
        verbose_name_plural = "In-App Notifications"

    def __str__(self):
        return f"[{self.notification_type}] {self.title} to {self.recipient.username} (Read: {self.is_read})"


class NotificationDispatchLog(models.Model):
    CHANNEL_CHOICES = (
        ('IN_APP', 'In-App Bell Dropdown'),
        ('SMS', 'SMS Gateway Provider'),
        ('WHATSAPP', 'WhatsApp Cloud API'),
        ('EMAIL', 'SMTP Email Server'),
        ('PUSH_FCM', 'Firebase Push Notification'),
    )

    STATUS_CHOICES = (
        ('QUEUED', 'Queued'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed'),
        ('SIMULATED', 'Simulated (Dev Mode)'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='notification_dispatch_logs'
    )
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='SMS', db_index=True)
    event_type = models.CharField(max_length=50, blank=True, default='', db_index=True)
    recipient_identifier = models.CharField(max_length=150)
    recipient_user = models.ForeignKey('core.User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dispatched_notifications'
    )
    message_title = models.CharField(max_length=200, blank=True, default='')
    message_body = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SENT', db_index=True)
    provider_response = models.JSONField(default=dict, blank=True)
    error_reason = models.TextField(blank=True, default='')
    dispatched_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-dispatched_at']
        verbose_name = "Notification Dispatch Log"
        verbose_name_plural = "Notification Dispatch Logs"

    def __str__(self):
        return f"[{self.channel}] to {self.recipient_identifier} - {self.status} at {self.dispatched_at}"
