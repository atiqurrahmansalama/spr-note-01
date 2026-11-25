"""Module 03 — Love Universe Dashboard Models (Daily Surprises & Achievements)."""
import uuid
from django.db import models
from .foundation import UniverseSpace


class UniverseDailySurprise(models.Model):
    TYPE_NOTE = "note"
    TYPE_QUOTE = "quote"
    TYPE_CLUE = "clue"
    TYPE_REWARD = "reward"
    TYPE_CHOICES = (
        (TYPE_NOTE, "Love Note"),
        (TYPE_QUOTE, "Romantic Quote"),
        (TYPE_CLUE, "Secret Clue"),
        (TYPE_REWARD, "Star Reward"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="daily_surprises",
    )
    title = models.CharField(max_length=160)
    message = models.TextField()
    surprise_type = models.CharField(max_length=30, choices=TYPE_CHOICES, default=TYPE_NOTE)
    reward_stars = models.PositiveIntegerField(default=5)
    scheduled_date = models.DateField(null=True, blank=True)
    action_route = models.CharField(max_length=120, blank=True, default="")
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_daily_surprises"
        ordering = ["sort_order", "created_at"]
        indexes = [
            models.Index(
                fields=["space", "is_active", "scheduled_date"],
                name="olu_surprise_space_date_idx",
            ),
        ]

    def __str__(self):
        return f"DailySurprise<{self.title}>"


class UniverseAchievement(models.Model):
    RULE_ENTRY = "entry_unlocked"
    RULE_STARS = "stars_min"
    RULE_SURPRISES = "surprises_min"
    RULE_CHAPTERS = "story_chapters_min"
    RULE_MODULES = "modules_visited_min"
    RULE_MANUAL = "manual"
    RULE_CHOICES = (
        (RULE_ENTRY, "Entry Unlocked"),
        (RULE_STARS, "Minimum Stars Collected"),
        (RULE_SURPRISES, "Daily Surprises Opened"),
        (RULE_CHAPTERS, "Story Chapters Published"),
        (RULE_MODULES, "Universe Worlds Explored"),
        (RULE_MANUAL, "Manual / Owner Awarded"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="achievements",
    )
    achievement_key = models.CharField(max_length=60)
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=255)
    badge_label = models.CharField(max_length=60, default="Unlocked")
    icon_name = models.CharField(max_length=50, default="award")
    points = models.PositiveIntegerField(default=10)
    rule_type = models.CharField(max_length=30, choices=RULE_CHOICES, default=RULE_MANUAL)
    rule_target = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_achievements"
        unique_together = [("space", "achievement_key")]
        ordering = ["sort_order", "achievement_key"]
        indexes = [
            models.Index(fields=["space", "is_active", "sort_order"], name="olu_ach_space_idx"),
        ]

    def __str__(self):
        return f"Achievement<{self.achievement_key}>"
