"""Foundation & Access Models (Space, Membership, Module Registry, Progress)."""
import uuid
from django.db import models


class UniverseSpace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=80, unique=True, default="our-little-universe")
    title = models.CharField(max_length=150, default="Our Little Universe")
    subtitle = models.CharField(
        max_length=255,
        default="A private galaxy of our memories & stories",
    )
    owner_user_id = models.BigIntegerField(db_index=True)
    recipient_name = models.CharField(max_length=120, default="My Favorite Person")
    landing_eyebrow = models.CharField(max_length=120, default="A Private Sanctuary Awaits")
    landing_cta_label = models.CharField(max_length=80, default="Unseal Our Universe")
    welcome_greeting = models.CharField(
        max_length=200,
        default="Welcome to Our Little Universe",
    )
    welcome_subtitle = models.TextField(
        default="Every star is a memory. Every story is a piece of us.",
    )
    welcome_animation_enabled = models.BooleanField(default=True)
    countdown_title = models.CharField(
        max_length=150,
        default="Until Our Next Special Moment",
    )
    special_date = models.DateTimeField(null=True, blank=True)
    secret_pin_hash = models.CharField(max_length=255, blank=True, default="")
    pin_enabled = models.BooleanField(default=True)
    pin_hint = models.CharField(max_length=200, blank=True, default="")
    active_theme_id = models.CharField(max_length=40, default="velvet-rose")
    ambient_track_title = models.CharField(max_length=150, default="Starlight Lullaby")
    ambient_track_asset_id = models.UUIDField(null=True, blank=True)
    dashboard_greeting = models.CharField(max_length=200, default="Explore Our Little Universe")
    dashboard_message = models.TextField(
        default="Every planet holds a piece of our story. Wander freely through every world."
    )
    featured_badge = models.CharField(max_length=60, default="Featured Moment")
    featured_title = models.CharField(max_length=160, default="The First Hello")
    featured_subtitle = models.CharField(
        max_length=240,
        default="Revisit the chapter where everything quietly shifted.",
    )
    featured_route = models.CharField(max_length=120, default="/story")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_universe_spaces"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.slug})"


class UniverseMember(models.Model):
    ROLE_OWNER = "OWNER"
    ROLE_RECIPIENT = "RECIPIENT"
    ROLE_CHOICES = (
        (ROLE_OWNER, "Owner"),
        (ROLE_RECIPIENT, "Recipient"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="members",
    )
    user_id = models.BigIntegerField(db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_RECIPIENT)
    display_name = models.CharField(max_length=120, blank=True, default="")
    is_active = models.BooleanField(default=True)
    last_entered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_universe_members"
        unique_together = [("space", "user_id")]
        indexes = [
            models.Index(fields=["user_id", "is_active"], name="olu_member_user_active_idx"),
            models.Index(fields=["space", "role"], name="olu_member_space_role_idx"),
        ]

    def __str__(self):
        return f"{self.display_name or self.user_id} [{self.role}]"


class UniverseModuleRegistry(models.Model):
    UNLOCK_MANUAL = "manual"
    UNLOCK_DATE = "date"
    UNLOCK_PROGRESS = "progress"
    UNLOCK_PIN = "pin"
    UNLOCK_CODE = "code"
    UNLOCK_RULE_CHOICES = (
        (UNLOCK_MANUAL, "Manual"),
        (UNLOCK_DATE, "Date"),
        (UNLOCK_PROGRESS, "Progress"),
        (UNLOCK_PIN, "PIN"),
        (UNLOCK_CODE, "Secret Code"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="modules",
    )
    module_key = models.CharField(max_length=50)
    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=255, blank=True, default="")
    route_path = models.CharField(max_length=120)
    icon_name = models.CharField(max_length=60, default="sparkles")
    sort_order = models.PositiveIntegerField(default=0)
    is_enabled = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)
    unlock_rule_type = models.CharField(
        max_length=30,
        choices=UNLOCK_RULE_CHOICES,
        default=UNLOCK_MANUAL,
    )
    unlock_rule_config = models.JSONField(default=dict, blank=True)
    badge_text = models.CharField(max_length=60, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_module_registry"
        unique_together = [("space", "module_key")]
        ordering = ["sort_order", "module_key"]
        indexes = [
            models.Index(fields=["space", "is_enabled", "sort_order"], name="olu_mod_space_enabled_idx"),
        ]

    def __str__(self):
        return f"{self.module_key} ({'enabled' if self.is_enabled else 'disabled'})"


class UniverseProgress(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="progress_records",
    )
    user_id = models.BigIntegerField(db_index=True)
    entry_unlocked = models.BooleanField(default=False)
    entry_unlocked_at = models.DateTimeField(null=True, blank=True)
    pin_verified_at = models.DateTimeField(null=True, blank=True)
    collected_stars = models.PositiveIntegerField(default=0)
    unlocked_modules = models.JSONField(default=list, blank=True)
    discovered_clues = models.JSONField(default=list, blank=True)
    unlocked_surprises = models.JSONField(default=list, blank=True)
    completed_milestones = models.JSONField(default=list, blank=True)
    last_visited_route = models.CharField(max_length=120, default="/welcome")
    failed_pin_attempts = models.PositiveIntegerField(default=0)
    pin_locked_until = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_user_progress"
        unique_together = [("space", "user_id")]
        indexes = [
            models.Index(fields=["space", "user_id"], name="olu_progress_space_user_idx"),
        ]

    def __str__(self):
        return f"Progress<{self.user_id}> stars={self.collected_stars}"
