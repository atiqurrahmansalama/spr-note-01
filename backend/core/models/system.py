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


class AcademySectionOverride(models.Model):
    institution = models.ForeignKey('core.AcademicInstitution', on_delete=models.CASCADE, related_name='section_overrides')
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='academy_overrides')
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('institution', 'section')

    def __str__(self):
        return f"Academy [{self.institution_id}] -> {self.section.section_key}: {self.is_enabled}"


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
        ('ACADEMY', 'Academy Override'),
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


class FeatureUsageSummary(models.Model):
    """
    Enterprise Aggregated Feature Usage Analytics.
    Stores rollups of endpoint & feature usage per day to guide product roadmap decisions
    without retaining millions of raw high-frequency HTTP request logs in the hot database.
    """
    date = models.DateField(db_index=True)
    action_name = models.CharField(max_length=150, db_index=True)
    endpoint = models.CharField(max_length=255, db_index=True)
    http_method = models.CharField(max_length=10, default='GET')
    hit_count = models.PositiveIntegerField(default=0)
    unique_users_count = models.PositiveIntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('date', 'action_name', 'endpoint', 'http_method')
        ordering = ['-date', '-hit_count']
        verbose_name = "Feature Usage Summary"
        verbose_name_plural = "Feature Usage Summaries"
        indexes = [
            models.Index(fields=['date', 'action_name'], name='idx_feat_usage_date_act'),
            models.Index(fields=['-hit_count'], name='idx_feat_usage_hit_count'),
        ]

    def __str__(self):
        return f"{self.date} | {self.action_name} ({self.hit_count} hits, {self.unique_users_count} users)"


class DataMutationOutbox(models.Model):
    """
    Enterprise Change Data Capture (CDC) & Write-Behind Outbox Queue.
    Enables instant sub-millisecond local execution while safely queueing mutations
    for non-blocking streaming replication to remote Supabase PostgreSQL.
    """
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('SYNCING', 'Syncing'),
        ('SYNCED', 'Synced'),
        ('FAILED', 'Failed'),
    )

    OPERATION_CHOICES = (
        ('INSERT', 'Insert'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    )

    mutation_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    table_name = models.CharField(max_length=150, db_index=True)
    record_pk = models.CharField(max_length=150, db_index=True)
    operation = models.CharField(max_length=10, choices=OPERATION_CHOICES)
    payload = models.JSONField(default=dict, blank=True)
    tenant_id = models.CharField(max_length=100, db_index=True, null=True, blank=True)
    status = models.CharField(max_length=20, default='PENDING', choices=STATUS_CHOICES, db_index=True)
    retry_count = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = "Data Mutation Outbox"
        verbose_name_plural = "Data Mutation Outbox Entries"
        indexes = [
            models.Index(fields=['status', 'created_at'], name='idx_outbox_status_created'),
            models.Index(fields=['tenant_id', 'status'], name='idx_outbox_tenant_status'),
            models.Index(fields=['table_name', 'record_pk'], name='idx_outbox_table_pk'),
        ]

    def __str__(self):
        return f"[{self.status}] {self.operation} on {self.table_name}#{self.record_pk} (Mutation: {self.mutation_id})"


class AppRelease(models.Model):
    """
    Enterprise Application Version & Release Management.
    Governs multi-platform releases, SemVer handshake, mandatory force-update gating,
    and structured changelogs for Web, Android, iOS, and Desktop wrappers.
    """
    RELEASE_CHANNEL_CHOICES = (
        ('STABLE', 'Stable Production'),
        ('BETA', 'Beta Preview'),
        ('ALPHA', 'Internal Alpha'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    version = models.CharField(max_length=32, unique=True, db_index=True)
    build_number = models.PositiveIntegerField(default=1, db_index=True)
    channel = models.CharField(max_length=20, choices=RELEASE_CHANNEL_CHOICES, default='STABLE')
    is_critical_update = models.BooleanField(
        default=False,
        help_text="Triggers hard blocking update gate if client is below min_supported_version"
    )
    min_supported_version = models.CharField(max_length=32, default="1.0.0")
    min_supported_build = models.PositiveIntegerField(default=1)

    # Platform Targets & Distribution Links
    web_active = models.BooleanField(default=True)
    android_apk_url = models.URLField(blank=True, default='')
    desktop_installer_url = models.URLField(blank=True, default='')
    ios_testflight_url = models.URLField(blank=True, default='')

    # Release Notes & Structured Changelog
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, default='')
    changelog_features = models.JSONField(default=list, blank=True)
    changelog_improvements = models.JSONField(default=list, blank=True)
    changelog_fixes = models.JSONField(default=list, blank=True)
    changelog_security = models.JSONField(default=list, blank=True)

    # Publishing Metadata
    published_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='published_releases'
    )
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-build_number', '-created_at']
        verbose_name = "App Release"
        verbose_name_plural = "App Releases"
        indexes = [
            models.Index(fields=['is_published', 'channel', '-build_number'], name='idx_rel_pub_chan_bld'),
            models.Index(fields=['version'], name='idx_rel_ver'),
        ]

    def __str__(self):
        status = "Published" if self.is_published else "Draft"
        return f"v{self.version} ({self.build_number}) [{self.channel}] - {status}"



