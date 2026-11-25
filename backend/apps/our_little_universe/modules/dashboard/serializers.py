from rest_framework import serializers
from apps.our_little_universe.models.dashboard import (
    UniverseAchievement,
    UniverseDailySurprise,
)


class UniverseDailySurpriseSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniverseDailySurprise
        fields = [
            "id",
            "title",
            "message",
            "surprise_type",
            "reward_stars",
            "scheduled_date",
            "action_route",
            "is_active",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UniverseAchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = UniverseAchievement
        fields = [
            "id",
            "achievement_key",
            "title",
            "description",
            "badge_label",
            "icon_name",
            "points",
            "rule_type",
            "rule_target",
            "is_active",
            "sort_order",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
