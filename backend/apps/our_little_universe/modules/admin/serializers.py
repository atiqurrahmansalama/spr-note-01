from rest_framework import serializers
from core.models import User
from apps.our_little_universe.core.storage import create_media_stream_token
from apps.our_little_universe.models.foundation import UniverseSpace, UniverseMember
from apps.our_little_universe.models.media import UniverseMediaAsset, UniverseAccessAuditLog


class UniverseSpaceAdminUpdateSerializer(serializers.ModelSerializer):
    new_secret_pin = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
        max_length=24,
    )

    class Meta:
        model = UniverseSpace
        fields = [
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
            "active_theme_id",
            "ambient_track_title",
            "ambient_track_asset_id",
            "dashboard_greeting",
            "dashboard_message",
            "featured_badge",
            "featured_title",
            "featured_subtitle",
            "featured_route",
            "new_secret_pin",
        ]


class UniverseMemberSerializer(serializers.ModelSerializer):
    email = serializers.SerializerMethodField()

    class Meta:
        model = UniverseMember
        fields = [
            "id",
            "user_id",
            "email",
            "role",
            "display_name",
            "is_active",
            "last_entered_at",
            "created_at",
        ]

    def get_email(self, obj):
        users_map = self.context.get("users_map") or {}
        user = users_map.get(obj.user_id) or User.objects.filter(id=obj.user_id).only("email").first()
        return user.email if user else ""


class RecipientProvisionSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    display_name = serializers.CharField(required=True, max_length=120)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True, min_length=6)
    is_active = serializers.BooleanField(default=True)


class UniverseMediaAssetSerializer(serializers.ModelSerializer):
    stream_url = serializers.SerializerMethodField()

    class Meta:
        model = UniverseMediaAsset
        fields = [
            "id",
            "title",
            "category",
            "media_type",
            "mime_type",
            "file_size",
            "is_private",
            "stream_url",
            "created_at",
        ]
        read_only_fields = ["id", "mime_type", "file_size", "is_private", "stream_url", "created_at"]

    def get_stream_url(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        token = create_media_stream_token(str(obj.id), request.user.id)
        return f"/api/v1/universe/media/{obj.id}/stream/?token={token}"


class UniverseAccessAuditLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = UniverseAccessAuditLog
        fields = ["id", "event_type", "actor_name", "detail", "ip_address", "created_at"]

    def get_actor_name(self, obj):
        if not obj.actor_user_id:
            return "System"
        users_map = self.context.get("users_map") or {}
        actor = (
            users_map.get(obj.actor_user_id)
            or User.objects.filter(id=obj.actor_user_id).only("name", "email", "phone_number").first()
        )
        if not actor:
            return f"User #{obj.actor_user_id}"
        return actor.name or actor.email or actor.phone_number or f"User #{obj.actor_user_id}"
