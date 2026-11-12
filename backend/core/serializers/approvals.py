from rest_framework import serializers
from core.models import ApprovalRequest, ApprovalActionLog


class ApprovalActionLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalActionLog
        fields = [
            "id",
            "action",
            "from_status",
            "to_status",
            "notes",
            "metadata",
            "actor",
            "actor_name",
            "created_at",
        ]

    def get_actor_name(self, obj):
        if not obj.actor:
            return "System"
        return obj.actor.name or obj.actor.username or obj.actor.phone_number


class ApprovalRequestListSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ApprovalRequest
        fields = [
            "id",
            "tracking_code",
            "institution",
            "domain",
            "source_mode",
            "form_mode",
            "status",
            "applicant_name",
            "email",
            "phone_number",
            "summary_meta",
            "effective_date",
            "target_model",
            "target_object_id",
            "submitted_by",
            "submitted_by_name",
            "reviewed_by",
            "reviewed_by_name",
            "reviewed_at",
            "rejection_reason",
            "admin_remarks",
            "created_at",
            "updated_at",
        ]

    def get_submitted_by_name(self, obj):
        if not obj.submitted_by:
            return None
        return obj.submitted_by.name or obj.submitted_by.username or obj.submitted_by.phone_number

    def get_reviewed_by_name(self, obj):
        if not obj.reviewed_by:
            return None
        return obj.reviewed_by.name or obj.reviewed_by.username or obj.reviewed_by.phone_number


class ApprovalRequestDetailSerializer(ApprovalRequestListSerializer):
    action_logs = ApprovalActionLogSerializer(many=True, read_only=True)

    class Meta(ApprovalRequestListSerializer.Meta):
        fields = ApprovalRequestListSerializer.Meta.fields + [
            "payload",
            "reviewer_overrides",
            "source_token_type",
            "source_token_id",
            "action_logs",
        ]


class ApprovalDecisionSerializer(serializers.Serializer):
    overrides = serializers.DictField(required=False, default=dict)
    admin_remarks = serializers.CharField(required=False, allow_blank=True, default="")
    rejection_reason = serializers.CharField(required=False, allow_blank=True, default="")
    effective_date = serializers.DateField(required=False, allow_null=True)

