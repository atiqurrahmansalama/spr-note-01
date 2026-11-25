from rest_framework import serializers
from apps.our_little_universe.core.storage import create_media_stream_token
from apps.our_little_universe.models.media import UniverseMediaAsset
from apps.our_little_universe.models.story import (
    UniverseStoryChapter,
    UniverseStoryComparison,
    UniverseStoryMilestone,
    UniverseStoryProfile,
    UniverseStorySpecialDate,
)


def _build_asset_stream_url(asset_id, request):
    if not asset_id or not request or not request.user.is_authenticated:
        return None
    token = create_media_stream_token(str(asset_id), request.user.id)
    return f"/api/v1/universe/media/{asset_id}/stream/?token={token}"


class UniverseStoryProfileSerializer(serializers.ModelSerializer):
    cover_asset_id = serializers.UUIDField(required=False, allow_null=True)
    cover_url = serializers.SerializerMethodField()
    beginning_asset_id = serializers.UUIDField(required=False, allow_null=True)
    beginning_url = serializers.SerializerMethodField()

    class Meta:
        model = UniverseStoryProfile
        fields = [
            "id",
            "hero_title",
            "hero_subtitle",
            "hero_badge",
            "couple_names",
            "relationship_start_date",
            "meeting_place",
            "our_song_title",
            "signature_quote",
            "beginning_eyebrow",
            "beginning_story",
            "beginning_asset_id",
            "beginning_url",
            "cover_asset_id",
            "cover_url",
            "profile_facts",
            "updated_at",
        ]
        read_only_fields = ["id", "cover_url", "beginning_url", "updated_at"]

    def get_cover_url(self, obj):
        return _build_asset_stream_url(obj.cover_asset_id, self.context.get("request"))

    def get_beginning_url(self, obj):
        return _build_asset_stream_url(obj.beginning_asset_id, self.context.get("request"))

    def _validate_space_asset(self, value, label):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseMediaAsset.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError(f"{label} does not belong to this universe space.")
        return value

    def validate_cover_asset_id(self, value):
        return self._validate_space_asset(value, "Cover photo")

    def validate_beginning_asset_id(self, value):
        return self._validate_space_asset(value, "Beginning photo")

    def validate_profile_facts(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("profile_facts must be a list of objects.")
        cleaned = []
        for idx, item in enumerate(value[:40]):
            if not isinstance(item, dict):
                continue
            label = str(item.get("label") or "").strip()[:80]
            val = str(item.get("value") or "").strip()[:300]
            if not label and not val:
                continue
            cleaned.append(
                {
                    "id": str(item.get("id") or f"fact-{idx + 1}")[:60],
                    "label": label or "Detail",
                    "value": val or "-",
                    "category": str(item.get("category") or "Story")[:50],
                    "icon_name": str(item.get("icon_name") or "heart")[:40],
                }
            )
        return cleaned


class UniverseStoryChapterSerializer(serializers.ModelSerializer):
    cover_asset_id = serializers.UUIDField(required=False, allow_null=True)
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = UniverseStoryChapter
        fields = [
            "id",
            "chapter_number",
            "title",
            "subtitle",
            "summary",
            "cover_asset_id",
            "cover_url",
            "accent_token",
            "is_published",
            "is_locked",
            "surprise_title",
            "surprise_message",
            "surprise_stars",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "cover_url", "created_at", "updated_at"]

    def get_cover_url(self, obj):
        return _build_asset_stream_url(obj.cover_asset_id, self.context.get("request"))

    def validate_cover_asset_id(self, value):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseMediaAsset.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError("Cover photo does not belong to this universe space.")
        return value


class UniverseStoryMilestoneSerializer(serializers.ModelSerializer):
    chapter_id = serializers.UUIDField(required=False, allow_null=True)
    photo_asset_id = serializers.UUIDField(required=False, allow_null=True)
    photo_url = serializers.SerializerMethodField()
    audio_asset_id = serializers.UUIDField(required=False, allow_null=True)
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = UniverseStoryMilestone
        fields = [
            "id",
            "chapter_id",
            "entry_type",
            "event_date",
            "title",
            "subtitle",
            "badge",
            "location",
            "description",
            "icon_name",
            "color_token",
            "photo_asset_id",
            "photo_url",
            "audio_asset_id",
            "audio_url",
            "is_favorite",
            "is_published",
            "is_locked",
            "surprise_note",
            "surprise_stars",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "photo_url", "audio_url", "created_at", "updated_at"]

    def get_photo_url(self, obj):
        return _build_asset_stream_url(obj.photo_asset_id, self.context.get("request"))

    def get_audio_url(self, obj):
        return _build_asset_stream_url(obj.audio_asset_id, self.context.get("request"))

    def validate_chapter_id(self, value):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseStoryChapter.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError("Selected chapter does not belong to this universe space.")
        return value

    def validate_photo_asset_id(self, value):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseMediaAsset.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError("Selected photo does not belong to this universe space.")
        return value

    def validate_audio_asset_id(self, value):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseMediaAsset.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError("Selected audio does not belong to this universe space.")
        return value


class UniverseStoryComparisonSerializer(serializers.ModelSerializer):
    then_asset_id = serializers.UUIDField(required=False, allow_null=True)
    then_url = serializers.SerializerMethodField()
    now_asset_id = serializers.UUIDField(required=False, allow_null=True)
    now_url = serializers.SerializerMethodField()

    class Meta:
        model = UniverseStoryComparison
        fields = [
            "id",
            "title",
            "caption",
            "then_label",
            "now_label",
            "then_date",
            "now_date",
            "then_asset_id",
            "then_url",
            "now_asset_id",
            "now_url",
            "is_published",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "then_url", "now_url", "created_at", "updated_at"]

    def get_then_url(self, obj):
        return _build_asset_stream_url(obj.then_asset_id, self.context.get("request"))

    def get_now_url(self, obj):
        return _build_asset_stream_url(obj.now_asset_id, self.context.get("request"))

    def validate_then_asset_id(self, value):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseMediaAsset.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError("Then photo does not belong to this universe space.")
        return value

    def validate_now_asset_id(self, value):
        if not value:
            return None
        space = self.context.get("space")
        if space and not UniverseMediaAsset.objects.filter(id=value, space=space).exists():
            raise serializers.ValidationError("Now photo does not belong to this universe space.")
        return value


class UniverseStorySpecialDateSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniverseStorySpecialDate
        fields = [
            "id",
            "title",
            "event_date",
            "category",
            "notes",
            "repeats_yearly",
            "is_published",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
