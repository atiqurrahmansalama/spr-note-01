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

class TeacherProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherProfile
        fields = ['id', 'name_bn', 'name_en', 'designation', 'address']


class GuardianProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuardianProfile
        fields = ['id', 'name_bn', 'name_en', 'students']


class UserDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDevice
        fields = ['id', 'device_token', 'device_type', 'updated_at']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'] = serializers.CharField(required=False, allow_blank=True)
        self.fields['phone_number'] = serializers.CharField(required=False, allow_blank=True)
        self.fields['email'] = serializers.CharField(required=False, allow_blank=True)

    def to_internal_value(self, data):
        mutable = data.copy() if hasattr(data, 'copy') else dict(data)
        raw_identifier = mutable.get("phone_number") or mutable.get("username") or mutable.get("email") or mutable.get("phone")
        if raw_identifier:
            identifier = str(raw_identifier).strip()
            if "@" in identifier:
                try:
                    user_obj = User.objects.get(email__iexact=identifier)
                    identifier = user_obj.phone_number
                except User.DoesNotExist:
                    pass
            else:
                try:
                    user_obj = User.objects.get(phone_number=identifier)
                    identifier = user_obj.phone_number
                except User.DoesNotExist:
                    try:
                        user_obj = User.objects.filter(Q(first_name__iexact=identifier) | Q(last_name__iexact=identifier)).first()
                        if user_obj and user_obj.phone_number:
                            identifier = user_obj.phone_number
                    except Exception:
                        pass

            mutable[self.username_field] = identifier
            mutable['username'] = identifier
            mutable['phone_number'] = identifier

        return super().to_internal_value(mutable)

    def validate(self, attrs):
        phone_input = attrs.get("phone_number") or attrs.get("phone") or attrs.get("username")
        if phone_input:
            phone_clean = str(phone_input).strip()
            if "@" in phone_clean:
                try:
                    user_obj = User.objects.get(email__iexact=phone_clean)
                    attrs[self.username_field] = user_obj.phone_number
                except User.DoesNotExist:
                    attrs[self.username_field] = phone_clean
            else:
                attrs[self.username_field] = phone_clean

        data = super().validate(attrs)

        teacher_data = None
        if hasattr(self.user, 'teacher_profile'):
            teacher_data = TeacherProfileSerializer(self.user.teacher_profile).data

        guardian_data = None
        if hasattr(self.user, 'guardian_profile'):
            guardian_data = GuardianProfileSerializer(self.user.guardian_profile).data

        role_obj = getattr(self.user, 'role', None)
        if role_obj:
            perms_obj = getattr(role_obj, 'action_permissions', None)
            perms_dict = {
                'can_create_student': perms_obj.can_create_student,
                'can_edit_student': perms_obj.can_edit_student,
                'can_delete_report': perms_obj.can_delete_report,
                'can_export_reports': perms_obj.can_export_reports,
                'can_manage_users': perms_obj.can_manage_users,
            } if perms_obj else {}
            role_data = {
                'id': role_obj.id,
                'name': role_obj.name,
                'code': role_obj.code,
                'description': role_obj.description,
                'hierarchy_level': role_obj.hierarchy_level,
                'color_theme': role_obj.color_theme,
                'is_system_role': role_obj.is_system_role,
                'action_permissions': perms_dict,
            }
        else:
            role_data = {
                'id': None,
                'name': self.user.get_user_type_display() if hasattr(self.user, 'get_user_type_display') else self.user.user_type,
                'code': self.user.user_type,
                'color_theme': 'purple' if self.user.user_type == 'GUARDIAN' else 'blue',
            }

        data['user'] = {
            'id': self.user.id,
            'phone_number': self.user.phone_number,
            'username': self.user.phone_number,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'user_type': self.user.user_type,
            'role': role_data,
            'role_info': role_data,
            'avatar_url': self.user.avatar_url,
            'is_email_verified': getattr(self.user, 'is_email_verified', False),
            'auth_provider': getattr(self.user, 'auth_provider', 'email'),
            'is_active': self.user.is_active,
            'teacher_profile': teacher_data,
            'guardian_profile': guardian_data,
            'date_joined': self.user.date_joined.strftime("%Y-%m-%d") if self.user.date_joined else "",
        }
        return data


class GoogleOAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    access_token = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    credential = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    code = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    redirect_uri = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate(self, attrs):
        id_token = (attrs.get('id_token') or '').strip()
        access_token = (attrs.get('access_token') or '').strip()
        credential = (attrs.get('credential') or '').strip()
        code = (attrs.get('code') or '').strip()

        if not id_token and not access_token and not credential and not code:
            raise serializers.ValidationError("Either code, id_token, access_token, or credential must be provided.")
        return attrs


class RegisterSerializer(serializers.ModelSerializer):
    phone_number = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'phone_number', 'password', 'first_name', 'last_name']

    def validate_email(self, value):
        email_clean = value.strip().lower()
        if User.objects.filter(email__iexact=email_clean).exists():
            raise serializers.ValidationError("An account with this email address already exists.")
        return email_clean

    def create(self, validated_data):
        password = validated_data.pop('password')
        phone = validated_data.get('phone_number') or f"user_{uuid.uuid4().hex[:10]}"
        user = User.objects.create_user(
            phone_number=phone,
            password=password,
            is_email_verified=False,
            auth_provider='email',
            **validated_data
        )
        return user


class VerifyEmailSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.UUIDField(required=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class RoleActionPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoleActionPermission
        fields = [
            'can_create_student',
            'can_edit_student',
            'can_delete_report',
            'can_export_reports',
            'can_manage_users',
        ]


class UserRoleSerializer(serializers.ModelSerializer):
    action_permissions = RoleActionPermissionSerializer(required=False)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = UserRole
        fields = [
            'id',
            'name',
            'code',
            'description',
            'hierarchy_level',
            'color_theme',
            'is_system_role',
            'created_at',
            'user_count',
            'action_permissions',
        ]
        read_only_fields = ['id', 'created_at', 'user_count']

    @extend_schema_field(OpenApiTypes.INT)
    def get_user_count(self, obj):
        return obj.users.count() if hasattr(obj, 'users') else 0

    def validate_code(self, value):
        val = str(value).upper().strip().replace(' ', '_')
        return val

    def create(self, validated_data):
        permissions_data = validated_data.pop('action_permissions', None)
        role = UserRole.objects.create(**validated_data)
        if permissions_data:
            RoleActionPermission.objects.create(role=role, **permissions_data)
        else:
            RoleActionPermission.objects.create(role=role)
        return role

    def update(self, instance, validated_data):
        permissions_data = validated_data.pop('action_permissions', None)
        for attr, value in validated_data.items():
            if attr == 'code' and instance.is_system_role:
                continue
            setattr(instance, attr, value)
        instance.save()

        if permissions_data is not None:
            perm_obj, _ = RoleActionPermission.objects.get_or_create(role=instance)
            for p_attr, p_val in permissions_data.items():
                setattr(perm_obj, p_attr, p_val)
            perm_obj.save()
        return instance


class UserAdminSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    role = serializers.SerializerMethodField()
    role_info = serializers.SerializerMethodField()
    formatted_created_at = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
            'institution',
            'institution_name',
            'phone_number',
            'email',
            'name',
            'first_name',
            'last_name',
            'name_bn',
            'user_type',
            'role',
            'role_info',
            'auth_provider',
            'is_email_verified',
            'avatar_url',
            'assigned_group',
            'is_active',
            'is_deactivated',
            'date_joined',
            'formatted_created_at',
            'password',
        ]
        read_only_fields = ['id', 'formatted_created_at', 'institution_name']
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'phone_number': {'required': False, 'allow_null': True, 'allow_blank': True},
            'email': {'required': False, 'allow_null': True, 'allow_blank': True},
        }

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_role(self, obj):
        if obj.role:
            perms_obj = getattr(obj.role, 'action_permissions', None)
            perms_dict = {
                'can_create_student': perms_obj.can_create_student,
                'can_edit_student': perms_obj.can_edit_student,
                'can_delete_report': perms_obj.can_delete_report,
                'can_export_reports': perms_obj.can_export_reports,
                'can_manage_users': perms_obj.can_manage_users,
            } if perms_obj else {}
            return {
                'id': obj.role.id,
                'name': obj.role.name,
                'code': obj.role.code,
                'description': obj.role.description,
                'hierarchy_level': obj.role.hierarchy_level,
                'color_theme': obj.role.color_theme,
                'is_system_role': obj.role.is_system_role,
                'action_permissions': perms_dict,
            }
        return {
            'id': None,
            'name': obj.get_user_type_display() if hasattr(obj, 'get_user_type_display') else obj.user_type,
            'code': obj.user_type,
            'description': '',
            'hierarchy_level': 5,
            'color_theme': 'purple' if obj.user_type == 'GUARDIAN' else 'blue',
            'is_system_role': False,
            'action_permissions': {},
        }

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_role_info(self, obj):
        return self.get_role(obj)

    @extend_schema_field(OpenApiTypes.STR)
    def get_formatted_created_at(self, obj):
        if hasattr(obj, 'date_joined') and obj.date_joined:
            return obj.date_joined.strftime("%b %d, %Y")
        return "--"

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        phone = validated_data.get('phone_number') or f"user_{uuid.uuid4().hex[:10]}"
        validated_data['phone_number'] = phone
        user_type = validated_data.get('user_type')
        if user_type and 'role' not in validated_data:
            role_obj = UserRole.objects.filter(code__iexact=user_type).first()
            if role_obj:
                validated_data['role'] = role_obj
        user = User.objects.create_user(password=password, **validated_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user_type = validated_data.get('user_type')
        if user_type:
            role_obj = UserRole.objects.filter(code__iexact=user_type).first()
            if role_obj:
                instance.role = role_obj

        name_input = validated_data.get('name')
        first_name = validated_data.get('first_name')
        last_name = validated_data.get('last_name')

        if first_name is not None:
            instance.first_name = first_name
        if last_name is not None:
            instance.last_name = last_name

        if name_input:
            instance.name = name_input
            if not instance.first_name and not instance.last_name:
                parts = name_input.split(' ', 1)
                instance.first_name = parts[0]
                instance.last_name = parts[1] if len(parts) > 1 else ''
        else:
            instance.name = f"{instance.first_name or ''} {instance.last_name or ''}".strip()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()

        # Direct SQL update fallback to guarantee DB synchronization
        User.objects.filter(id=instance.id).update(
            name=instance.name,
            first_name=instance.first_name,
            last_name=instance.last_name,
            email=instance.email,
            avatar_url=instance.avatar_url
        )
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    first_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    name_bn = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    assigned_group = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    institution_bangla_name = serializers.CharField(source='institution.bangla_name', read_only=True, default='')
    institution_slug = serializers.CharField(source='institution.slug', read_only=True, default='')
    institution_details = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'email', 'first_name', 'last_name',
            'name_bn', 'avatar_url', 'user_type', 'assigned_group',
            'institution', 'institution_name', 'institution_bangla_name', 'institution_slug',
            'institution_details',
        ]
        read_only_fields = ['id', 'phone_number', 'user_type', 'institution', 'institution_name', 'institution_bangla_name', 'institution_slug', 'institution_details']

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_institution_details(self, obj):
        if obj.institution:
            return {
                'id': str(obj.institution.id),
                'name': obj.institution.name,
                'bangla_name': obj.institution.bangla_name,
                'slug': obj.institution.slug,
                'institution_type': obj.institution.institution_type,
                'logo_url': obj.institution.logo_url,
                'phone': obj.institution.phone,
                'email': obj.institution.email,
                'address': obj.institution.address,
                'district': obj.institution.district,
                'is_verified': obj.institution.is_verified,
            }
        return None


class UserLoginLogSerializer(serializers.ModelSerializer):
    timestamp_formatted = serializers.SerializerMethodField()

    class Meta:
        model = UserLoginLog
        fields = ['id', 'status', 'timestamp', 'timestamp_formatted', 'ip_address', 'country', 'city']

    @extend_schema_field(OpenApiTypes.STR)
    def get_timestamp_formatted(self, obj):
        return obj.timestamp.strftime("%Y-%m-%d %I:%M %p") if obj.timestamp else "--"


class UserActivityLogSerializer(serializers.ModelSerializer):
    timestamp_formatted = serializers.SerializerMethodField()

    class Meta:
        model = UserActivityLog
        fields = ['id', 'status', 'timestamp', 'timestamp_formatted']

    @extend_schema_field(OpenApiTypes.STR)
    def get_timestamp_formatted(self, obj):
        return obj.timestamp.strftime("%Y-%m-%d %I:%M %p") if obj.timestamp else "--"


class UserActivitySummarySerializer(serializers.ModelSerializer):
    unique_key              = serializers.CharField(read_only=True)
    role                    = serializers.CharField(read_only=True)
    formatted_created_at    = serializers.CharField(read_only=True)
    total_lifetime_activity = serializers.CharField(read_only=True)
    recent_login_logs       = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'unique_key', 'phone_number', 'email', 'role',
            'formatted_created_at', 'total_lifetime_activity', 'recent_login_logs',
        ]

    @extend_schema_field(UserLoginLogSerializer(many=True))
    def get_recent_login_logs(self, obj):
        return UserLoginLogSerializer(obj.login_logs.all()[:5], many=True).data


class UserSessionSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source='user.phone_number', read_only=True)
    user_type = serializers.CharField(source='user.user_type', read_only=True)
    device_name = serializers.SerializerMethodField()
    is_current = serializers.SerializerMethodField()
    login_at_formatted = serializers.SerializerMethodField()
    last_activity_formatted = serializers.SerializerMethodField()

    class Meta:
        model = UserSession
        fields = [
            'id',
            'user',
            'user_phone',
            'user_type',
            'device_type',
            'device_info',
            'device_name',
            'ip_address',
            'login_at',
            'login_at_formatted',
            'last_activity',
            'last_activity_formatted',
            'logout_at',
            'total_duration_minutes',
            'is_active',
            'is_current',
        ]

    def get_device_name(self, obj):
        if obj.device_info and obj.device_info != 'Unknown Device':
            return obj.device_info
        ua = str(obj.user_agent or '').lower()
        if not ua:
            return f"{obj.device_type.capitalize() if obj.device_type else 'Web'} Device"

        os_name = "Desktop"
        if "windows nt 10.0" in ua or "windows nt 11.0" in ua:
            os_name = "Windows 10/11"
        elif "macintosh" in ua or "mac os x" in ua:
            os_name = "macOS"
        elif "iphone" in ua:
            os_name = "iPhone"
        elif "ipad" in ua:
            os_name = "iPad"
        elif "android" in ua:
            os_name = "Android Mobile"
        elif "linux" in ua:
            os_name = "Linux PC"

        browser_name = "Browser"
        if "edg" in ua:
            browser_name = "Microsoft Edge"
        elif "chrome" in ua and "chromium" not in ua and "edg" not in ua:
            browser_name = "Google Chrome"
        elif "firefox" in ua:
            browser_name = "Mozilla Firefox"
        elif "safari" in ua and "chrome" not in ua:
            browser_name = "Apple Safari"
        elif "opera" in ua or "opr" in ua:
            browser_name = "Opera"

        return f"{browser_name} on {os_name}"

    def get_is_current(self, obj):
        current_jti = self.context.get('current_jti')
        if current_jti and obj.refresh_token_jti == current_jti:
            return True
        latest_session_id = self.context.get('latest_session_id')
        if latest_session_id and obj.id == latest_session_id:
            return True
        return False

    def get_login_at_formatted(self, obj):
        return obj.login_at.strftime("%b %d, %Y - %I:%M %p") if obj.login_at else "--"

    def get_last_activity_formatted(self, obj):
        if not obj.last_activity:
            return "Active now"
        delta = timezone.now() - obj.last_activity
        if delta.total_seconds() < 60:
            return "Active now"
        elif delta.total_seconds() < 3600:
            mins = int(delta.total_seconds() // 60)
            return f"{mins} min{'s' if mins > 1 else ''} ago"
        elif delta.total_seconds() < 86400:
            hours = int(delta.total_seconds() // 3600)
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        else:
            days = int(delta.total_seconds() // 86400)
            return f"{days} day{'s' if days > 1 else ''} ago"


class ActivityLogSerializer(serializers.ModelSerializer):
    user_phone = serializers.CharField(source='user.phone_number', read_only=True, default=None)

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'user',
            'user_phone',
            'action_name',
            'endpoint',
            'http_method',
            'ip_address',
            'timestamp',
        ]


class UserNotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserNotificationPreference
        fields = ['id', 'email_notifications', 'push_notifications', 'sms_notifications']


class UserSecuritySerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSecurity
        fields = ['id', 'is_2fa_enabled', 'two_factor_secret', 'backup_codes']
        read_only_fields = ['two_factor_secret', 'backup_codes']


class RoleInviteTokenSerializer(serializers.ModelSerializer):
    target_role_name = serializers.CharField(source='target_role.name', read_only=True)
    target_role_code = serializers.CharField(source='target_role.code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    is_active = serializers.BooleanField(default=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = RoleInviteToken
        fields = [
            'id', 'token', 'title', 'target_role', 'target_role_name', 
            'target_role_code', 'max_uses', 'used_count', 'expires_at', 
            'is_active', 'created_by', 'created_by_name', 'created_at', 'is_valid'
        ]
        read_only_fields = ['id', 'token', 'used_count', 'created_by', 'created_at', 'is_valid']

