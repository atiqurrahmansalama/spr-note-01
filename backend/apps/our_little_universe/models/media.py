"""Private Media Assets & Security Audit Trail Models."""
import uuid
from django.db import models
from django.utils import timezone
from apps.our_little_universe.core.storage import PrivateUniverseStorage
from .foundation import UniverseSpace


class UniverseMediaAsset(models.Model):
    CATEGORY_CHOICES = (
        ("welcome", "Welcome"),
        ("memory", "Memory"),
        ("letter", "Letter"),
        ("audio", "Audio"),
        ("gift", "Gift"),
        ("general", "General"),
    )
    MEDIA_TYPE_CHOICES = (
        ("image", "Image"),
        ("audio", "Audio"),
        ("video", "Video"),
        ("document", "Document"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="media_assets",
    )
    uploaded_by_user_id = models.BigIntegerField(null=True, blank=True)
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=40, choices=CATEGORY_CHOICES, default="general")
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPE_CHOICES, default="image")
    file = models.FileField(
        upload_to="assets/%Y/%m/",
        storage=PrivateUniverseStorage(),
    )
    mime_type = models.CharField(max_length=100, blank=True, default="")
    file_size = models.PositiveBigIntegerField(default=0)
    is_private = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_media_assets"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["space", "category"], name="olu_media_space_cat_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.media_type})"


class UniverseAccessAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    actor_user_id = models.BigIntegerField(null=True, blank=True)
    event_type = models.CharField(max_length=60)
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_access_audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["space", "-created_at"], name="olu_audit_space_created_idx"),
        ]

    def __str__(self):
        return f"{self.event_type} @ {self.created_at}"
