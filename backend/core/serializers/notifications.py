import json
import uuid
from datetime import datetime, date, timedelta
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.db.models import Max, Q, Count, Avg, Sum
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes

from core.models import (
    User, UserRole, RoleActionPermission, AcademicInstitution, InstitutionCategory,
    AcademicBranch, AcademicDepartment, Address, StudentClass, ClassSection,
    ClassPeriodSlot, StudentGroup, Session, SavedMessage, Student, StudentDetail,
    StudentAcademicHistory, StudentDailyReport, ReportPortion, ReportErrorDetail,
    ReportStatus, UserNotificationPreference, UserSecurity, AppSectionCategory,
    AppSection, RoleSectionPermission, GroupSectionPermission, UserSectionOverride,
    FeatureFlagAuditLog, UserPasskey, QRSessionTicket, SystemSetting,
    StudentAcademicDetail, StudentGuardian, StudentDocument, RoleInviteToken,
    StaffProfile, TeacherDetail, GeneralStaffDetail, TeacherAssignment,
    GeneralStaffDuty, StaffAttendance, StaffLeaveRequest, AcademicCalendarEvent,
    InstitutionalTask, AttendanceSessionSlot, StudentAttendance, DynamicPeriodSlot,
    TeacherRoutineSchedule, TeacherPeriodAttendanceRecord, GateEntryExitLog,
    AdHocHeadcountSession, BiometricDevice, RawAttendancePunchLog,
    AttendancePolicySetting, DocumentTemplateConfig, NotificationGatewayConfig,
    NotificationTemplate, NotificationTriggerRule, InAppNotification,
    NotificationDispatchLog, UserSession, UserDevice, UserLoginLog, UserActivityLog,
    ActivityLog, TeacherProfile, GuardianProfile
)
from core.services import get_scoped_tenant_id

User = get_user_model()

class SavedMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedMessage
        fields = '__all__'

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'comment' in mutable_data and 'text' not in mutable_data:
            mutable_data['text'] = mutable_data['comment']
        return super().to_internal_value(mutable_data)


class NotificationGatewayConfigSerializer(serializers.ModelSerializer):
    gateway_type_display = serializers.CharField(source='get_gateway_type_display', read_only=True)
    provider_name_display = serializers.CharField(source='get_provider_name_display', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    api_secret_or_token = serializers.CharField(write_only=True, required=False, allow_blank=True)
    is_secret_configured = serializers.SerializerMethodField()

    class Meta:
        model = NotificationGatewayConfig
        fields = [
            'id',
            'institution',
            'institution_name',
            'gateway_type',
            'gateway_type_display',
            'provider_name',
            'provider_name_display',
            'api_key',
            'api_secret_or_token',
            'is_secret_configured',
            'sender_id_or_phone',
            'api_url',
            'port',
            'use_tls_ssl',
            'is_active',
            'extra_headers_or_params',
            'balance_cache',
            'last_ping_status',
            'last_ping_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'last_ping_status', 'last_ping_at', 'created_at', 'updated_at']

    def get_is_secret_configured(self, obj):
        return bool(obj.api_secret_or_token)

    def update(self, instance, validated_data):
        secret = validated_data.pop('api_secret_or_token', None)
        if secret:
            instance.api_secret_or_token = secret
        return super().update(instance, validated_data)


class NotificationTemplateSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)

    class Meta:
        model = NotificationTemplate
        fields = [
            'id',
            'institution',
            'institution_name',
            'name',
            'event_type',
            'event_type_display',
            'subject',
            'body',
            'available_tags',
            'is_system_default',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'created_at', 'updated_at']

    def validate_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Template title cannot be empty.")
        return str(value).strip()

    def validate_body(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Message template body cannot be empty.")
        return str(value).strip()


class NotificationTriggerRuleSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = NotificationTriggerRule
        fields = [
            'id',
            'institution',
            'event_type',
            'event_type_display',
            'channels',
            'is_enabled',
            'template',
            'template_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'event_type_display', 'template_name', 'created_at', 'updated_at']


class InAppNotificationSerializer(serializers.ModelSerializer):
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    recipient_name = serializers.CharField(source='recipient.username', read_only=True)

    class Meta:
        model = InAppNotification
        fields = [
            'id',
            'institution',
            'recipient',
            'recipient_name',
            'title',
            'message',
            'notification_type',
            'notification_type_display',
            'action_url',
            'is_read',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'institution', 'recipient', 'recipient_name', 'read_at', 'created_at']


class NotificationDispatchLogSerializer(serializers.ModelSerializer):
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recipient_name = serializers.CharField(source='recipient_user.username', read_only=True, default='')

    class Meta:
        model = NotificationDispatchLog
        fields = [
            'id',
            'institution',
            'channel',
            'channel_display',
            'event_type',
            'recipient_identifier',
            'recipient_user',
            'recipient_name',
            'message_title',
            'message_body',
            'status',
            'status_display',
            'provider_response',
            'error_reason',
            'dispatched_at',
        ]
        read_only_fields = ['id', 'institution', 'dispatched_at']


class ManualBroadcastSerializer(serializers.Serializer):
    target_audience = serializers.ChoiceField(
        choices=['ALL', 'STUDENTS', 'CLASS', 'TEACHERS', 'STAFF'],
        default='ALL'
    )
    class_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    channels = serializers.ListField(
        child=serializers.ChoiceField(choices=['IN_APP', 'SMS', 'WHATSAPP', 'EMAIL']),
        default=['IN_APP']
    )
    title = serializers.CharField(max_length=200, default='Institutional Announcement')
    message = serializers.CharField(required=True)
    notification_type = serializers.ChoiceField(
        choices=['INFO', 'WARNING', 'SUCCESS', 'ALERT'],
        default='INFO'
    )
    action_url = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_message(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Broadcast message cannot be empty.")
        return str(value).strip()
