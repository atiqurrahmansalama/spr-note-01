from .iam import User
from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

class AppSectionCategory(models.Model):
    key = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'title']
        verbose_name_plural = "App Section Categories"

    def __str__(self):
        return f"{self.title} ({self.key})"


class AppSection(models.Model):
    category = models.ForeignKey(AppSectionCategory, on_delete=models.CASCADE, related_name='sections')
    section_key = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    is_globally_enabled = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    is_parent = models.BooleanField(default=False, help_text="True if this is a master category menu")
    parent_key = models.CharField(max_length=100, null=True, blank=True, help_text="Key of parent section")

    class Meta:
        ordering = ['category__order', 'order', 'title']

    def __str__(self):
        return f"{self.title} [{self.section_key}] (Global: {self.is_globally_enabled})"


class RoleSectionPermission(models.Model):
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='role_permissions')
    role = models.CharField(max_length=50, choices=User.USER_TYPE_CHOICES)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('section', 'role')

    def __str__(self):
        return f"Role [{self.role}] -> {self.section.section_key}: {self.is_enabled}"


class GroupSectionPermission(models.Model):
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='group_permissions')
    group_id = models.CharField(max_length=100)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('section', 'group_id')

    def __str__(self):
        return f"Group [{self.group_id}] -> {self.section.section_key}: {self.is_enabled}"


class UserSectionOverride(models.Model):
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='section_overrides')
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='user_overrides')
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'section')

    def __str__(self):
        return f"User [{self.user.phone_number or self.user.id}] -> {self.section.section_key}: {self.is_enabled}"


class FeatureFlagAuditLog(models.Model):
    SCOPE_TYPE_CHOICES = (
        ('GLOBAL', 'Global Default'),
        ('ROLE', 'Role Permission'),
        ('GROUP', 'Group Permission'),
        ('USER', 'User Override'),
    )

    changed_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True)
    scope_type = models.CharField(max_length=20, choices=SCOPE_TYPE_CHOICES)
    target_identifier = models.CharField(max_length=150)
    section_key = models.CharField(max_length=100)
    previous_state = models.BooleanField()
    new_state = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"AuditLog [{self.scope_type} - {self.target_identifier}] {self.section_key}: {self.previous_state} -> {self.new_state}"


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(default='')
    description = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return f"{self.key} = {self.value}"

    @classmethod
    def get_val(cls, key, default=''):
        try:
            setting = cls.objects.filter(key=key).first()
            if setting and setting.value:
                return setting.value
        except Exception:
            pass
        return default

    @classmethod
    def set_val(cls, key, value, description=''):
        setting, _ = cls.objects.get_or_create(key=key)
        setting.value = str(value)
        if description:
            setting.description = description
        setting.save()
        return setting


class AuditLog(models.Model):
    """
    Enterprise Immutable Audit Trail Model.
    Captures complete actor, tenant, action, resource, before/after diffs, and network/device telemetry.
    """
    ACTION_CHOICES = (
        ('CREATE', 'Created Resource'),
        ('UPDATE', 'Updated Resource'),
        ('DELETE', 'Deleted Resource'),
        ('RESTORE', 'Restored Resource'),
        ('PROMOTE', 'Promoted Student'),
        ('TRANSFER', 'Transferred Student/Staff'),
        ('STATUS_CHANGE', 'Status Changed'),
        ('BULK_MARK', 'Bulk Marked Attendance'),
        ('EVALUATE', 'Evaluated Sabaq/Lesson'),
        ('PUBLISH', 'Published Results/Routine'),
        ('CONFIG_CHANGE', 'Configuration Changed'),
        ('LOGIN', 'User Logged In'),
        ('EXPORT', 'Data Exported'),
        ('IMPORT', 'Data Imported'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='audit_logs',
        null=True,
        blank=True,
        db_index=True
    )
    actor = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_actions'
    )
    actor_name = models.CharField(max_length=150, blank=True, default='')
    actor_phone = models.CharField(max_length=32, blank=True, default='')
    actor_role = models.CharField(max_length=64, blank=True, default='')
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    resource_type = models.CharField(max_length=100, db_index=True)
    resource_id = models.CharField(max_length=100, db_index=True)
    resource_name = models.CharField(max_length=255, blank=True, default='')
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    changes_summary = models.TextField(blank=True, default='')
    reason = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    device_metadata = models.JSONField(null=True, blank=True)
    request_id = models.CharField(max_length=64, db_index=True, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"
        indexes = [
            models.Index(fields=['institution', '-created_at'], name='idx_audit_inst_created'),
            models.Index(fields=['resource_type', 'resource_id'], name='idx_audit_resource'),
            models.Index(fields=['actor', '-created_at'], name='idx_audit_actor_created'),
            models.Index(fields=['action', '-created_at'], name='idx_audit_action_created'),
        ]

    def __str__(self):
        actor_disp = self.actor_name or (self.actor.phone_number if self.actor else "System")
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else 'NEW'}] {actor_disp} {self.action} {self.resource_type}#{self.resource_id}"


