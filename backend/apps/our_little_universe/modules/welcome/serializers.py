from rest_framework import serializers
from apps.our_little_universe.core.storage import create_media_stream_token
from apps.our_little_universe.models.foundation import (
    UniverseSpace,
    UniverseModuleRegistry,
    UniverseProgress,
)


class UniverseSpacePublicSerializer(serializers.ModelSerializer):
    """Safe space configuration returned to both OWNER and RECIPIENT (excludes PIN hash)."""
    has_pin_configured = serializers.SerializerMethodField()
    ambient_track_url = serializers.SerializerMethodField()

    class Meta:
        model = UniverseSpace
        fields = [
            "id",
            "slug",
            "title",
            "subtitle",
            "recipient_name",
            "landing_eyebrow",
            "landing_cta_label",
            "welcome_greeting",
            "welcome_subtitle",
            "welcome_animation_enabled",
            "countdown_title",
            "special_date",
            "pin_enabled",
            "pin_hint",
            "has_pin_configured",
            "active_theme_id",
            "ambient_track_title",
            "ambient_track_asset_id",
            "ambient_track_url",
            "dashboard_greeting",
            "dashboard_message",
            "featured_badge",
            "featured_title",
            "featured_subtitle",
            "featured_route",
            "updated_at",
        ]

    def get_has_pin_configured(self, obj):
        return bool(obj.secret_pin_hash)

    def get_ambient_track_url(self, obj):
        request = self.context.get("request")
        if not obj.ambient_track_asset_id or not request or not request.user.is_authenticated:
            return None
        token = create_media_stream_token(str(obj.ambient_track_asset_id), request.user.id)
        return f"/api/v1/universe/media/{obj.ambient_track_asset_id}/stream/?token={token}"


class UniverseModuleRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = UniverseModuleRegistry
        fields = [
            "id",
            "module_key",
            "title",
            "subtitle",
            "route_path",
            "icon_name",
            "sort_order",
            "is_enabled",
            "is_locked",
            "unlock_rule_type",
            "unlock_rule_config",
            "badge_text",
            "updated_at",
        ]


class UniverseProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniverseProgress
        fields = [
            "id",
            "entry_unlocked",
            "entry_unlocked_at",
            "pin_verified_at",
            "collected_stars",
            "unlocked_modules",
            "discovered_clues",
            "unlocked_surprises",
            "completed_milestones",
            "last_visited_route",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "entry_unlocked",
            "entry_unlocked_at",
            "pin_verified_at",
            "collected_stars",
            "unlocked_modules",
            "discovered_clues",
            "unlocked_surprises",
            "completed_milestones",
            "updated_at",
        ]
