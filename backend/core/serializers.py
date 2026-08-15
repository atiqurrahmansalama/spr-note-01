from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
import uuid
from django.db.models import Max, Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from .models import (
    TeacherProfile,
    GuardianProfile,
    UserDevice,
    Student,
    StudentDetail,
    StudentGroup,
    Session,
    SavedMessage,
    StudentDailyReport,
    ReportStatus,
    ReportPortion,
    ReportErrorDetail,
    UserLoginLog,
    UserActivityLog,
    UserSession,
    UserRole,
    RoleActionPermission,
    ActivityLog,
    UserNotificationPreference,
    UserSecurity,
    EmailVerificationToken,
    PasswordResetToken,
    Address,
    StudentAcademicDetail,
    StudentGuardian,
    StudentDocument,
    RoleInviteToken,
)


User = get_user_model()


# ─────────────────────────────────────────────────────────────
# AUTH SERIALIZERS
# ─────────────────────────────────────────────────────────────

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
    role = serializers.SerializerMethodField()
    role_info = serializers.SerializerMethodField()
    formatted_created_at = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
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
        read_only_fields = ['id', 'formatted_created_at']
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


# ─────────────────────────────────────────────────────────────
# CORE ENTITY SERIALIZERS
# ─────────────────────────────────────────────────────────────

class StudentGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGroup
        fields = '__all__'

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'group_name' in mutable_data and 'name' not in mutable_data:
            mutable_data['name'] = mutable_data['group_name']
        return super().to_internal_value(mutable_data)


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'


class SavedMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedMessage
        fields = '__all__'

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'comment' in mutable_data and 'text' not in mutable_data:
            mutable_data['text'] = mutable_data['comment']
        return super().to_internal_value(mutable_data)


class StudentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDetail
        fields = [
            'id', 'name_bn', 'photo', 'category', 'date_of_birth',
            'blood_group', 'father_name', 'mother_name',
            'guardian_name', 'guardian_relation', 'guardian_phone',
            'emergency_phone', 'cur_address', 'per_address',
            'initial_completed_juz',
        ]
        extra_kwargs = {
            f: {'required': False, 'allow_null': True}
            for f in fields if f != 'id'
        }


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    first_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    last_name = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    name_bn = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    assigned_group = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'phone_number', 'email', 'first_name', 'last_name',
            'name_bn', 'avatar_url', 'user_type', 'assigned_group',
        ]
        read_only_fields = ['id', 'phone_number', 'user_type']







class StudentSerializer(serializers.ModelSerializer):
    # Nested detail serializer
    details = StudentDetailSerializer(required=False, allow_null=True)

    # Backward compatibility aliases for legacy API consumers & frontend
    name = serializers.CharField(source='name_en', required=False, allow_blank=True, allow_null=True)
    roll = serializers.IntegerField(source='roll_number', required=False, allow_null=True)
    unique_id = serializers.CharField(source='uniq_id', required=False, allow_blank=True, allow_null=True)
    group = serializers.CharField(source='group_name', required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'uniq_id', 'unique_id',
            'roll_number', 'roll',
            'name_en', 'name',
            'group_name', 'group',
            'admission_date', 'status', 'is_active',
            'education_status', 'target_status',
            'details',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'uniq_id': {'required': False, 'allow_null': True},
            'roll_number': {'required': False, 'allow_null': True},
            'name_en': {'required': False, 'allow_null': True},
            'group_name': {'required': False, 'allow_null': True},
            'status': {'required': False, 'allow_null': True},
            'education_status': {'required': False, 'allow_null': True},
            'target_status': {'required': False, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
        }

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Handle legacy keys (label/name -> name_en, sub/group -> group_name, roll -> roll_number, unique_id -> uniq_id)
        if 'label' in mutable_data and 'name_en' not in mutable_data and 'name' not in mutable_data:
            mutable_data['name_en'] = mutable_data['label']
        if 'name' in mutable_data and 'name_en' not in mutable_data:
            mutable_data['name_en'] = mutable_data['name']

        if 'sub' in mutable_data and 'group_name' not in mutable_data and 'group' not in mutable_data:
            mutable_data['group_name'] = mutable_data['sub']
        if 'group' in mutable_data and 'group_name' not in mutable_data:
            mutable_data['group_name'] = mutable_data['group']

        if 'roll' in mutable_data and 'roll_number' not in mutable_data:
            mutable_data['roll_number'] = mutable_data['roll']

        if 'unique_id' in mutable_data and 'uniq_id' not in mutable_data:
            mutable_data['uniq_id'] = mutable_data['unique_id']

        return super().to_internal_value(mutable_data)

    @transaction.atomic
    def create(self, validated_data):
        details_data = validated_data.pop('details', None)

        group_val = (
            validated_data.get('group_name')
            or self.initial_data.get('group')
            or self.initial_data.get('sub')
            or 'General Group'
        )
        validated_data['group_name'] = group_val

        name_val = (
            validated_data.get('name_en')
            or self.initial_data.get('name')
            or self.initial_data.get('label')
        )
        if name_val and str(name_val).strip():
            validated_data['name_en'] = str(name_val).strip()

        # Deduplication Guard: Only merge if no explicit roll_number, uniq_id, or is_new flag is set
        is_explicit = (
            self.initial_data.get('is_new')
            or self.initial_data.get('id')
            or self.initial_data.get('uniq_id')
            or validated_data.get('roll_number') is not None
            or self.initial_data.get('roll_number') is not None
        )

        if not is_explicit:
            existing_student = Student.objects.filter(
                name_en__iexact=validated_data.get('name_en', ''),
                group_name__iexact=group_val
            ).first()

            if existing_student:
                if details_data and isinstance(details_data, dict):
                    detail_obj, _ = StudentDetail.objects.get_or_create(student=existing_student)
                    for k, v in details_data.items():
                        setattr(detail_obj, k, v)
                    detail_obj.save()
                return existing_student

        if 'roll_number' not in validated_data or validated_data['roll_number'] is None:
            max_roll = Student.objects.filter(group_name=group_val).aggregate(Max('roll_number'))['roll_number__max'] or 0
            validated_data['roll_number'] = max_roll + 1

        student = Student.objects.create(**validated_data)

        # Automatically create linked StudentDetail
        details_kwargs = details_data if isinstance(details_data, dict) else {}
        if 'created_by' in validated_data:
            details_kwargs['created_by'] = validated_data['created_by']
        StudentDetail.objects.get_or_create(student=student, defaults=details_kwargs)

        return student

    @transaction.atomic
    def update(self, instance, validated_data):
        details_data = validated_data.pop('details', None)

        group_val = validated_data.get('group_name') or self.initial_data.get('group')
        if group_val:
            validated_data['group_name'] = group_val

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if details_data is not None and isinstance(details_data, dict):
            detail_obj, _ = StudentDetail.objects.get_or_create(student=instance)
            if not detail_obj.created_by and instance.created_by:
                detail_obj.created_by = instance.created_by
                detail_obj.save(update_fields=['created_by'])
            for attr, val in details_data.items():
                setattr(detail_obj, attr, val)
            detail_obj.save()

        return instance


# ─────────────────────────────────────────────────────────────
# NORMALIZED REPORT CHILD SERIALIZERS
# ─────────────────────────────────────────────────────────────

class ReportPortionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportPortion
        fields = [
            'id',
            'start_juz', 'start_page', 'start_surah_number', 'start_ayah',
            'end_juz',   'end_page',   'end_surah_number',   'end_ayah',
        ]
        extra_kwargs = {
            'start_surah_number': {'required': False, 'allow_null': True},
            'end_surah_number':   {'required': False, 'allow_null': True},
            'start_ayah':         {'required': False},
            'end_ayah':           {'required': False},
        }


class ReportErrorDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportErrorDetail
        fields = ['id', 'type', 'juz', 'page', 'surah_number', 'ayah']
        extra_kwargs = {
            'surah_number': {'required': False, 'allow_null': True},
            'ayah':         {'required': False},
        }


class ReportStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportStatus
        fields = [
            'id',
            'is_edited', 'edit_time',
            'is_locked', 'lock_time',
            'is_deleted', 'delete_time',
            'created_at', 'updated_at',
        ]


# ─────────────────────────────────────────────────────────────
# MAIN REPORT SERIALIZER
# ─────────────────────────────────────────────────────────────

class StudentDailyReportSerializer(serializers.ModelSerializer):
    # ── Normalized nested (writable) ────────────────────────
    portions = ReportPortionSerializer(many=True, required=False, default=list)
    error_details = ReportErrorDetailSerializer(many=True, required=False, default=list)

    # ── Backward-compat computed fields (read-only) ──────────
    # Frontend still expects `mistake_details` and `stuck_details` arrays.
    # These are filtered views over error_details — no separate DB tables.
    mistake_details = serializers.SerializerMethodField()
    stuck_details   = serializers.SerializerMethodField()

    # ── Report Status (Nested & Flattened) ────────────────────
    status_info = ReportStatusSerializer(read_only=True)
    report_status = ReportStatusSerializer(source='status_info', read_only=True)
    is_edited = serializers.BooleanField(source='status_info.is_edited', read_only=True, default=False)
    edit_time = serializers.DateTimeField(source='status_info.edit_time', read_only=True, allow_null=True)
    edited_at = serializers.DateTimeField(source='status_info.edit_time', read_only=True, allow_null=True)
    is_locked = serializers.BooleanField(source='status_info.is_locked', read_only=True, default=False)
    lock_time = serializers.DateTimeField(source='status_info.lock_time', read_only=True, allow_null=True)
    is_deleted = serializers.BooleanField(source='status_info.is_deleted', read_only=True, default=False)
    delete_time = serializers.DateTimeField(source='status_info.delete_time', read_only=True, allow_null=True)

    # ── Related info ─────────────────────────────────────────
    student_details = StudentSerializer(source='student', read_only=True)
    student_name = serializers.CharField(required=False, allow_blank=True)
    student_group = serializers.CharField(source='student.group_name', read_only=True)
    date = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", required=False)
    student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(), required=False, allow_null=True
    )
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    updated_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)

    # ── Display helpers ───────────────────────────────────────
    date_time     = serializers.SerializerMethodField()
    formattedDate = serializers.SerializerMethodField()
    formattedTime = serializers.SerializerMethodField()

    class Meta:
        model = StudentDailyReport
        fields = [
            'id', 'report_unique_id', 'date', 'date_time',
            'formattedDate', 'formattedTime',
            'student', 'student_name', 'student_group', 'student_details',
            'session_name',
            'total_page',
            'total_mistake', 'total_stuck',
            'score', 'status', 'teacher_id',
            'is_edited', 'edit_time', 'edited_at',
            'is_locked', 'lock_time',
            'is_deleted', 'delete_time',
            'status_info',
            'report_status',
            'comment',
            'juz_and_pages',
            'portions',
            'error_details',
            'mistake_details',   # computed from error_details where type='Mistake'
            'stuck_details',     # computed from error_details where type='Stuck'
            'created_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'report_unique_id']

    # ── Computed compat fields ───────────────────────────────

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_mistake_details(self, obj):
        """Returns mistake entries from error_details (type='Mistake')."""
        items = [
            ed for ed in obj.error_details.all()
            if ed.type == 'Mistake'
        ]
        return [
            {'id': ed.id, 'juz': str(ed.juz), 'page': str(ed.page), 'ayah': str(ed.ayah)}
            for ed in items
        ]

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_stuck_details(self, obj):
        """Returns stuck entries from error_details (type='Stuck')."""
        items = [
            ed for ed in obj.error_details.all()
            if ed.type == 'Stuck'
        ]
        return [
            {'id': ed.id, 'juz': str(ed.juz), 'page': str(ed.page), 'ayah': str(ed.ayah)}
            for ed in items
        ]

    @extend_schema_field(OpenApiTypes.STR)
    def get_date_time(self, obj):
        dt = obj.date or obj.created_at
        return dt.strftime("%Y-%m-%d %I:%M:%S %p") if dt else ""

    @extend_schema_field(OpenApiTypes.STR)
    def get_formattedDate(self, obj):
        dt = obj.date or obj.created_at
        return dt.strftime("%b %d, %Y") if dt else ""

    @extend_schema_field(OpenApiTypes.STR)
    def get_formattedTime(self, obj):
        dt = obj.date or obj.created_at
        return dt.strftime("%I:%M %p") if dt else ""

    # ── Input pre-processing ─────────────────────────────────

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        date_val = mutable_data.get('report_date') or mutable_data.get('date')
        if date_val:
            if isinstance(date_val, str):
                if 'T' in date_val or ' ' in date_val:
                    mutable_data['date'] = date_val
                else:
                    now_time = timezone.now().time()
                    mutable_data['date'] = f"{date_val} {now_time.strftime('%H:%M:%S')}"
        else:
            mutable_data['date'] = timezone.now()

        if 'session_name' not in mutable_data and 'session' in mutable_data:
            mutable_data['session_name'] = mutable_data['session']

        student_input = mutable_data.get('student') or mutable_data.get('student_name')
        if student_input:
            if isinstance(student_input, int):
                pass
            elif isinstance(student_input, str) and student_input.isdigit():
                mutable_data['student'] = int(student_input)
            elif isinstance(student_input, str):
                name_clean = student_input.strip()
                group_val = (
                    mutable_data.get('subject_course')
                    or mutable_data.get('group_name')
                    or 'General Group'
                )
                student_obj = Student.objects.filter(name_en__iexact=name_clean).first()
                if not student_obj:
                    max_roll = Student.objects.aggregate(Max('roll_number'))['roll_number__max'] or 0
                    student_obj = Student.objects.create(
                        name_en=name_clean,
                        group_name=group_val,
                        roll_number=max_roll + 1,
                    )
                mutable_data['student'] = student_obj.pk
                mutable_data['student_name'] = student_obj.name_en

        return super().to_internal_value(mutable_data)

    # ── Internal helpers ─────────────────────────────────────

    def _safe_int(self, val, default=0):
        try:
            return int(val)
        except (TypeError, ValueError):
            return default

    def _parse_legacy_errors(self, report, mistakes_input, stucks_input):
        """Parse old frontend format (mistake_details/stuck_details arrays) into ReportErrorDetail."""
        tot_mistakes = 0
        tot_stucks = 0

        def _process(items, error_type):
            count = 0
            for item in items:
                if not isinstance(item, dict):
                    continue
                juz  = str(item.get('juz', '')).strip()
                page = str(item.get('page', '')).strip()
                ayahs = item.get('ayahs', [])

                if isinstance(ayahs, list) and len(ayahs) > 0:
                    for a in ayahs:
                        val = (a.get('value') or a.get('ayah') or '') if isinstance(a, dict) else str(a)
                        val = str(val).strip()
                        if val or juz or page:
                            ReportErrorDetail.objects.create(
                                report=report,
                                type=error_type,
                                juz=self._safe_int(juz),
                                page=self._safe_int(page),
                                ayah=self._safe_int(val),
                            )
                            count += 1
                else:
                    line_val = str(item.get('line') or item.get('ayah') or '').strip()
                    if juz or page or line_val:
                        ReportErrorDetail.objects.create(
                            report=report,
                            type=error_type,
                            juz=self._safe_int(juz),
                            page=self._safe_int(page),
                            ayah=self._safe_int(line_val),
                        )
                        count += 1
            return count

        tot_mistakes = _process(mistakes_input, 'Mistake')
        tot_stucks   = _process(stucks_input,   'Stuck')
        return tot_mistakes, tot_stucks

    def _create_normalized_errors(self, report, error_details_data):
        """Create ReportErrorDetail rows from new v2 payload."""
        mistakes, stucks = 0, 0
        for item in error_details_data:
            ed = ReportErrorDetail.objects.create(report=report, **item)
            if ed.type == 'Mistake':
                mistakes += 1
            else:
                stucks += 1
        return mistakes, stucks

    def _create_portions(self, report, portions_data):
        for item in portions_data:
            ReportPortion.objects.create(report=report, **item)

    # ── CREATE ───────────────────────────────────────────────

    @transaction.atomic
    def create(self, validated_data):
        portions_data = validated_data.pop('portions', [])
        error_details_data = validated_data.pop('error_details', [])

        initial = self.initial_data or {}
        client_uid = initial.get('report_unique_id')
        if client_uid:
            existing = StudentDailyReport.objects.filter(report_unique_id=client_uid).first()
            if existing:
                return existing
            validated_data['report_unique_id'] = str(client_uid).strip()

        mistakes_input = initial.get('mistake_details') or initial.get('mistakes') or []
        stucks_input   = initial.get('stuck_details')   or initial.get('stucks')   or []

        student_obj = validated_data.get('student')
        if student_obj and not validated_data.get('student_name'):
            validated_data['student_name'] = student_obj.name

        report = StudentDailyReport.objects.create(**validated_data)
        ReportStatus.objects.get_or_create(report=report)

        if portions_data:
            self._create_portions(report, portions_data)

        if error_details_data:
            tot_mistakes, tot_stucks = self._create_normalized_errors(report, error_details_data)
        elif mistakes_input or stucks_input:
            tot_mistakes, tot_stucks = self._parse_legacy_errors(report, mistakes_input, stucks_input)
        else:
            tot_mistakes = validated_data.get('total_mistake', 0)
            tot_stucks   = validated_data.get('total_stuck', 0)

        report.total_mistake = tot_mistakes
        report.total_stuck   = tot_stucks
        report.save(update_fields=['total_mistake', 'total_stuck'])

        return report

    # ── UPDATE ───────────────────────────────────────────────

    @transaction.atomic
    def update(self, instance, validated_data):
        # Auto-Lock Enforcement
        status_obj = getattr(instance, 'status_info', None) or getattr(instance, 'report_status', None)
        if status_obj and status_obj.is_locked:
            request = self.context.get('request')
            user = getattr(request, 'user', None) if request else None
            is_admin = user and (
                user.is_superuser or
                user.is_staff or
                getattr(user, 'user_type', None) in ['SUPER_ADMIN', 'ADMIN']
            )
            if not is_admin:
                raise PermissionDenied("This report is locked and cannot be modified by non-admin users.")

        portions_data      = validated_data.pop('portions', None)
        error_details_data = validated_data.pop('error_details', None)

        initial = self.initial_data or {}
        mistakes_input = initial.get('mistake_details') or initial.get('mistakes') or None
        stucks_input   = initial.get('stuck_details')   or initial.get('stucks')   or None

        # Pop status fields if passed directly
        validated_data.pop('is_edited', None)
        validated_data.pop('edited_at', None)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        # Update ReportStatus
        status_obj, _ = ReportStatus.objects.get_or_create(report=instance)
        status_obj.is_edited = True
        status_obj.edit_time = timezone.now()
        status_obj.save()

        if portions_data is not None:
            instance.portions.all().delete()
            self._create_portions(instance, portions_data)

        if error_details_data is not None:
            instance.error_details.all().delete()
            tot_mistakes, tot_stucks = self._create_normalized_errors(instance, error_details_data)
            instance.total_mistake = tot_mistakes
            instance.total_stuck   = tot_stucks
            instance.save(update_fields=['total_mistake', 'total_stuck'])

        elif mistakes_input is not None or stucks_input is not None:
            instance.error_details.all().delete()
            tot_mistakes, tot_stucks = self._parse_legacy_errors(
                instance, mistakes_input or [], stucks_input or []
            )
            instance.total_mistake = tot_mistakes
            instance.total_stuck   = tot_stucks
            instance.save(update_fields=['total_mistake', 'total_stuck'])

        return instance


# ─────────────────────────────────────────────────────────────
# USER ACTIVITY SERIALIZERS
# ─────────────────────────────────────────────────────────────

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


# 🎯 Unified Address Serializer
class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'id', 'address_type', 'street_address', 'post_office', 
            'post_code', 'thana_or_upazila', 'district', 'division', 'country'
        ]


# 🎯 Student Guardian Details Serializer
class StudentGuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGuardian
        fields = [
            'id', 'father_name', 'father_phone', 'father_occupation',
            'mother_name', 'mother_phone', 'mother_occupation', 'primary_guardian_name',
            'primary_guardian_phone', 'guardian_relation', 'guardian_nid',
            'emergency_contact_phone'
        ]


# 🎯 Student Academic Detail Serializer
class StudentAcademicDetailSerializer(serializers.ModelSerializer):
    class_or_group_id = serializers.PrimaryKeyRelatedField(
        queryset=StudentGroup.objects.all(),
        source='class_or_group',
        required=False,
        allow_null=True
    )
    class_or_group_name = serializers.CharField(source='class_or_group.name', read_only=True)

    class Meta:
        model = StudentAcademicDetail
        fields = [
            'id', 'session_year', 'class_or_group_id', 'class_or_group_name',
            'roll_number', 'admission_date', 'previous_school_name', 'previous_school_address', 'tc_number'
        ]


# 🎯 Student Document Upload Serializer
class StudentDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentDocument
        fields = ['id', 'doc_type', 'file', 'title', 'uploaded_at']


# 🎯 Unified Admission Master Serializer (Supports Quick & Full Modes)
class StudentAdmissionSerializer(serializers.ModelSerializer):
    present_address_data = AddressSerializer(write_only=True, required=False, allow_null=True)
    permanent_address_data = AddressSerializer(write_only=True, required=False, allow_null=True)
    academic_data = StudentAcademicDetailSerializer(write_only=True, required=False, allow_null=True)
    guardian_data = StudentGuardianSerializer(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Student
        fields = [
            'id', 'name', 'bangla_name', 'student_id_card_number', 'gender', 'dob',
            'blood_group', 'birth_certificate_no', 'nid_no', 'photo', 'present_address_data',
            'permanent_address_data', 'academic_data', 'guardian_data',
            'admission_mode', 'status', 'group_name', 'roll_number', 'education_status'
        ]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        present_address_data = validated_data.pop('present_address_data', None)
        permanent_address_data = validated_data.pop('permanent_address_data', None)
        academic_data = validated_data.pop('academic_data', None)
        guardian_data = validated_data.pop('guardian_data', None)

        # Create Addresses if supplied
        present_address = None
        if present_address_data:
            present_address = Address.objects.create(created_by=user, **present_address_data)

        permanent_address = None
        if permanent_address_data:
            permanent_address = Address.objects.create(created_by=user, **permanent_address_data)

        # Create Student
        validated_data['present_address'] = present_address
        validated_data['permanent_address'] = permanent_address
        if user:
            validated_data['created_by'] = user
        
        student = Student.objects.create(**validated_data)

        # Create StudentAcademicDetail (always exists, blank defaults if not in payload)
        academic_kwargs = academic_data if academic_data else {}
        academic_kwargs['student'] = student
        academic_kwargs['created_by'] = user
        StudentAcademicDetail.objects.create(**academic_kwargs)

        # Create StudentGuardian (always exists, blank defaults if not in payload)
        guardian_kwargs = guardian_data if guardian_data else {}
        guardian_kwargs['student'] = student
        guardian_kwargs['created_by'] = user
        StudentGuardian.objects.create(**guardian_kwargs)

        return student


# 🎯 Comprehensive Student Profile Serializer (Read & Deep Update)
class StudentFullProfileSerializer(serializers.ModelSerializer):
    present_address = AddressSerializer(read_only=True)
    permanent_address = AddressSerializer(read_only=True)
    academic_detail = StudentAcademicDetailSerializer(read_only=True)
    guardian_detail = StudentGuardianSerializer(read_only=True)
    documents = StudentDocumentSerializer(many=True, read_only=True)

    present_address_data = AddressSerializer(write_only=True, required=False, allow_null=True)
    permanent_address_data = AddressSerializer(write_only=True, required=False, allow_null=True)
    academic_data = StudentAcademicDetailSerializer(write_only=True, required=False, allow_null=True)
    guardian_data = StudentGuardianSerializer(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Student
        fields = [
            'id', 'uniq_id', 'roll_number', 'name', 'name_en', 'bangla_name', 
            'student_id_card_number', 'gender', 'dob', 'blood_group', 
            'birth_certificate_no', 'nid_no', 'photo', 'present_address', 'permanent_address', 
            'academic_detail', 'guardian_detail', 'documents', 'admission_mode', 
            'status', 'group_name', 'created_at', 'updated_at', 'education_status',
            'present_address_data', 'permanent_address_data', 'academic_data', 'guardian_data'
        ]

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None

        present_address_data = validated_data.pop('present_address_data', None)
        permanent_address_data = validated_data.pop('permanent_address_data', None)
        academic_data = validated_data.pop('academic_data', None)
        guardian_data = validated_data.pop('guardian_data', None)

        # Update core student fields
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        # Deep Update present address
        if present_address_data is not None:
            if instance.present_address:
                for k, v in present_address_data.items():
                    setattr(instance.present_address, k, v)
                instance.present_address.save()
            else:
                addr = Address.objects.create(created_by=user, **present_address_data)
                instance.present_address = addr
                instance.save(update_fields=['present_address'])

        # Deep Update permanent address
        if permanent_address_data is not None:
            if instance.permanent_address:
                for k, v in permanent_address_data.items():
                    setattr(instance.permanent_address, k, v)
                instance.permanent_address.save()
            else:
                addr = Address.objects.create(created_by=user, **permanent_address_data)
                instance.permanent_address = addr
                instance.save(update_fields=['permanent_address'])

        # Deep Update academic details
        if academic_data is not None:
            academic_detail, _ = StudentAcademicDetail.objects.get_or_create(student=instance, defaults={'created_by': user})
            for k, v in academic_data.items():
                setattr(academic_detail, k, v)
            academic_detail.save()

        # Deep Update guardian details
        if guardian_data is not None:
            guardian_detail, _ = StudentGuardian.objects.get_or_create(student=instance, defaults={'created_by': user})
            for k, v in guardian_data.items():
                setattr(guardian_detail, k, v)
            guardian_detail.save()

        return instance


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