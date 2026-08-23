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

