"""Module 04 — Our Story Models (Profile, Chapters, Timeline/Firsts, Comparisons, Special Dates, Interactions)."""
import uuid
from django.db import models
from .foundation import UniverseSpace
from .media import UniverseMediaAsset


class UniverseStoryProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.OneToOneField(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="story_profile",
    )
    hero_title = models.CharField(max_length=160, default="Our Story Together")
    hero_subtitle = models.CharField(
        max_length=280,
        default="The unforgettable chapters, firsts, and shared smiles that built our universe.",
    )
    hero_badge = models.CharField(max_length=60, default="Our Story Hub")
    couple_names = models.CharField(max_length=140, default="Two Hearts, One Galaxy")
    relationship_start_date = models.DateField(null=True, blank=True)
    meeting_place = models.CharField(max_length=160, blank=True, default="Cafe Starlight")
    our_song_title = models.CharField(max_length=150, blank=True, default="Starlight Lullaby")
    signature_quote = models.TextField(
        blank=True,
        default="In every sky and every season, my favorite chapter is still us.",
    )
    beginning_eyebrow = models.CharField(max_length=80, blank=True, default="Our Beginning")
    beginning_story = models.TextField(
        blank=True,
        default="Every beautiful story has a beginning. This is ours — a quiet moment that turned into a lifetime of shared mornings, laughter, and constellations.",
    )
    beginning_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_beginning_photos",
    )
    cover_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_profile_covers",
    )
    profile_facts = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_story_profiles"

    def __str__(self):
        return f"StoryProfile<{self.hero_title}>"


class UniverseStoryChapter(models.Model):
    """OS-06 Interactive Story Chapters grouping timeline memories & unlocking optional surprises."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="story_chapters",
    )
    chapter_number = models.PositiveIntegerField(default=1)
    title = models.CharField(max_length=180)
    subtitle = models.CharField(max_length=220, blank=True, default="")
    summary = models.TextField(blank=True, default="")
    cover_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_chapter_covers",
    )
    accent_token = models.CharField(max_length=30, default="accent")
    is_published = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)
    surprise_title = models.CharField(max_length=160, blank=True, default="")
    surprise_message = models.TextField(blank=True, default="")
    surprise_stars = models.PositiveIntegerField(default=10)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_story_chapters"
        ordering = ["chapter_number", "sort_order", "created_at"]
        indexes = [
            models.Index(
                fields=["space", "is_published", "sort_order"],
                name="olu_story_ch_space_pub_idx",
            ),
        ]

    def __str__(self):
        return f"Chapter {self.chapter_number}: {self.title}"


class UniverseStoryMilestone(models.Model):
    ENTRY_TIMELINE = "timeline"
    ENTRY_FIRST = "first"
    ENTRY_TYPE_CHOICES = (
        (ENTRY_TIMELINE, "Timeline Chapter"),
        (ENTRY_FIRST, "Our First"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="story_milestones",
    )
    chapter = models.ForeignKey(
        UniverseStoryChapter,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="milestones",
    )
    entry_type = models.CharField(
        max_length=20,
        choices=ENTRY_TYPE_CHOICES,
        default=ENTRY_TIMELINE,
    )
    event_date = models.DateField()
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=200, blank=True, default="")
    badge = models.CharField(max_length=80, blank=True, default="")
    location = models.CharField(max_length=150, blank=True, default="")
    description = models.TextField(blank=True, default="")
    icon_name = models.CharField(max_length=50, default="heart")
    color_token = models.CharField(max_length=30, default="accent")
    photo_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_milestone_photos",
    )
    audio_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_milestone_audio",
    )
    is_favorite = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False)
    surprise_note = models.TextField(blank=True, default="")
    surprise_stars = models.PositiveIntegerField(default=0)
    sort_order = models.PositiveIntegerField(default=0)
    created_by_user_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_story_milestones"
        ordering = ["event_date", "sort_order", "created_at"]
        indexes = [
            models.Index(
                fields=["space", "entry_type", "event_date"],
                name="olu_story_ms_space_type_idx",
            ),
        ]

    def __str__(self):
        return f"{self.entry_type}: {self.title} ({self.event_date})"


class UniverseStoryComparison(models.Model):
    """OS-08 Then & Now visual photo & memory comparisons."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="story_comparisons",
    )
    title = models.CharField(max_length=180)
    caption = models.TextField(blank=True, default="")
    then_label = models.CharField(max_length=60, default="Then")
    now_label = models.CharField(max_length=60, default="Now")
    then_date = models.CharField(max_length=60, blank=True, default="")
    now_date = models.CharField(max_length=60, blank=True, default="")
    then_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_then_comparisons",
    )
    now_asset = models.ForeignKey(
        UniverseMediaAsset,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="story_now_comparisons",
    )
    is_published = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_story_comparisons"
        ordering = ["sort_order", "created_at"]


class UniverseStorySpecialDate(models.Model):
    """OS-09 Special Dates & Recurring Milestones."""
    CAT_ANNIVERSARY = "anniversary"
    CAT_FIRST = "first"
    CAT_CELEBRATION = "celebration"
    CAT_MILESTONE = "milestone"
    CATEGORY_CHOICES = (
        (CAT_ANNIVERSARY, "Anniversary"),
        (CAT_FIRST, "First Moment"),
        (CAT_CELEBRATION, "Celebration"),
        (CAT_MILESTONE, "Milestone"),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="story_special_dates",
    )
    title = models.CharField(max_length=180)
    event_date = models.DateField()
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default=CAT_ANNIVERSARY,
    )
    notes = models.TextField(blank=True, default="")
    repeats_yearly = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_story_special_dates"
        ordering = ["event_date", "sort_order"]


class UniverseStoryInteraction(models.Model):
    """Tracks per-member Story chapter completions & unlocked story surprises."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    space = models.ForeignKey(
        UniverseSpace,
        on_delete=models.CASCADE,
        related_name="story_interactions",
    )
    user_id = models.BigIntegerField()
    completed_chapter_ids = models.JSONField(default=list, blank=True)
    unlocked_milestone_ids = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "our_little_universe"
        db_table = "olu_story_interactions"
        constraints = [
            models.UniqueConstraint(
                fields=["space", "user_id"],
                name="uniq_olu_story_interaction_user",
            ),
        ]
