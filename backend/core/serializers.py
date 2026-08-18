from datetime import datetime, date
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
    AcademicInstitution,
    TeacherProfile,
    GuardianProfile,
    UserDevice,
    Student,
    AcademicDepartment,
    StudentClass,
    StudentDetail,
    StudentGroup,
    StudentAcademicHistory,
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
    StaffProfile,
    TeacherDetail,
    GeneralStaffDetail,
    TeacherAssignment,
    GeneralStaffDuty,
    StaffAttendance,
    StaffLeaveRequest,
    AcademicCalendarEvent,
    InstitutionalTask,
    AttendanceSessionSlot,
    StudentAttendance,
    AttendancePolicySetting,
    DynamicPeriodSlot,
    TeacherRoutineSchedule,
    TeacherPeriodAttendanceRecord,
    GateEntryExitLog,
    AdHocHeadcountSession,
    BiometricDevice,
    RawAttendancePunchLog,
    DocumentTemplateConfig,
    NotificationGatewayConfig,
    NotificationTemplate,
    NotificationTriggerRule,
    InAppNotification,
    NotificationDispatchLog,
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


# ─────────────────────────────────────────────────────────────
# CORE ENTITY SERIALIZERS
# ─────────────────────────────────────────────────────────────

class AcademicInstitutionSerializer(serializers.ModelSerializer):
    total_students_count = serializers.SerializerMethodField()
    total_classes_count = serializers.SerializerMethodField()
    total_staff_count = serializers.SerializerMethodField()

    class Meta:
        model = AcademicInstitution
        fields = [
            'id', 'name', 'bangla_name', 'slug', 'institution_type',
            'eiin_or_reg_no', 'logo_url', 'logo_data', 'phone', 'email', 'address',
            'division', 'district', 'upazila_thana', 'post_code', 'postal_code', 'street_address',
            'latitude', 'longitude', 'map_place_id',
            'is_verified', 'is_active', 'is_deleted',
            'total_students_count', 'total_classes_count', 'total_staff_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_students_count', 'total_classes_count', 'total_staff_count']

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_students_count(self, obj):
        from core.models import Student
        return Student.objects.filter(institution=obj, is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_classes_count(self, obj):
        from core.models import StudentClass
        return StudentClass.objects.filter(institution=obj, is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_staff_count(self, obj):
        from core.models import User
        return User.objects.filter(institution=obj, is_active=True).count()


class InstitutionOnboardingSerializer(serializers.Serializer):
    # Step 1: Basic Details
    name = serializers.CharField(max_length=200, required=True)
    bangla_name = serializers.CharField(max_length=250, required=False, allow_blank=True, default='')
    institution_type = serializers.ChoiceField(
        choices=AcademicInstitution.INSTITUTION_TYPE_CHOICES,
        default='MADRASA'
    )
    eiin_or_reg_no = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=30, required=True)

    # Step 2: Branding & Address
    slug = serializers.SlugField(max_length=100, required=True)
    logo_url = serializers.URLField(required=False, allow_null=True, allow_blank=True)
    logo_data = serializers.CharField(required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    address = serializers.CharField(required=False, allow_blank=True, default='')
    division = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    district = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    upazila_thana = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    post_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    street_address = serializers.CharField(required=False, allow_blank=True, default='')
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    map_place_id = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    # Step 3: Admin & Presets
    admin_name = serializers.CharField(max_length=150, required=True)
    admin_phone = serializers.CharField(max_length=20, required=True)
    admin_email = serializers.EmailField(required=False, allow_blank=True, default='')
    admin_password = serializers.CharField(write_only=True, required=True, min_length=6)
    preset_type = serializers.ChoiceField(
        choices=[('HIFZ', 'Hifz Focus'), ('GENERAL', 'General School'), ('BOTH', 'Dual Curriculum / Comprehensive')],
        default='HIFZ'
    )

    def validate_slug(self, value):
        val = str(value).lower().strip()
        if AcademicInstitution.objects.filter(slug=val).exists():
            raise serializers.ValidationError("An institution with this web identifier (slug) already exists.")
        return val

    def validate_admin_phone(self, value):
        phone_clean = str(value).strip()
        if User.objects.filter(phone_number=phone_clean).exists():
            raise serializers.ValidationError("A user account with this phone number already exists.")
        return phone_clean

    def validate_admin_email(self, value):
        if value:
            email_clean = str(value).strip().lower()
            if User.objects.filter(email__iexact=email_clean).exists():
                raise serializers.ValidationError("A user account with this email address already exists.")
            return email_clean
        return ''

    def create(self, validated_data):
        from core.models import AcademicDepartment

        name = validated_data['name']
        bangla_name = validated_data.get('bangla_name', '')
        slug = validated_data['slug']
        institution_type = validated_data.get('institution_type', 'MADRASA')
        eiin_or_reg_no = validated_data.get('eiin_or_reg_no', '')
        phone = validated_data['phone']
        logo_url = validated_data.get('logo_url') or None
        logo_data = validated_data.get('logo_data', '')
        email = validated_data.get('email', '')
        division = validated_data.get('division', '')
        district = validated_data.get('district', '')
        upazila_thana = validated_data.get('upazila_thana', '')
        post_code = validated_data.get('post_code') or validated_data.get('postal_code', '')
        postal_code = validated_data.get('postal_code') or post_code
        street_address = validated_data.get('street_address', '')
        address = validated_data.get('address', '')
        latitude = validated_data.get('latitude')
        longitude = validated_data.get('longitude')
        map_place_id = validated_data.get('map_place_id', '')
        if not address and (street_address or upazila_thana or district or division):
            parts = [p for p in [street_address, upazila_thana, district, division] if p]
            address = ", ".join(parts)

        admin_name = validated_data['admin_name']
        admin_phone = validated_data['admin_phone']
        admin_email = validated_data.get('admin_email', '')
        admin_password = validated_data['admin_password']
        preset_type = validated_data.get('preset_type', 'HIFZ')

        with transaction.atomic():
            # 1. Create Institution
            institution = AcademicInstitution.objects.create(
                name=name,
                bangla_name=bangla_name,
                slug=slug,
                institution_type=institution_type,
                eiin_or_reg_no=eiin_or_reg_no,
                phone=phone,
                email=email,
                address=address,
                division=division,
                district=district,
                upazila_thana=upazila_thana,
                post_code=post_code,
                postal_code=postal_code,
                street_address=street_address,
                latitude=latitude,
                longitude=longitude,
                map_place_id=map_place_id,
                logo_url=logo_url,
                logo_data=logo_data,
                is_verified=True,
                is_active=True,
            )

            # 2. Create Admin User
            admin_user = User.objects.create_user(
                phone_number=admin_phone,
                email=admin_email or None,
                name=admin_name,
                password=admin_password,
                user_type='ADMIN',
                institution=institution,
                is_active=True,
            )

            # 3. Seed Preset Departments
            if preset_type == 'HIFZ':
                AcademicDepartment.objects.create(
                    institution=institution,
                    name="Hifzul Quran Department",
                    code="HIFZ",
                    has_quran_tracker=True,
                    order_rank=1,
                    is_active=True,
                )
                AcademicDepartment.objects.create(
                    institution=institution,
                    name="Nazera & Noorani Department",
                    code="NAZERA",
                    has_quran_tracker=True,
                    order_rank=2,
                    is_active=True,
                )
            elif preset_type == 'GENERAL':
                AcademicDepartment.objects.create(
                    institution=institution,
                    name="Primary & General Education",
                    code="GEN-PRI",
                    has_quran_tracker=False,
                    order_rank=1,
                    is_active=True,
                )
            elif preset_type == 'BOTH':
                AcademicDepartment.objects.create(
                    institution=institution,
                    name="Hifzul Quran Department",
                    code="HIFZ",
                    has_quran_tracker=True,
                    order_rank=1,
                    is_active=True,
                )
                AcademicDepartment.objects.create(
                    institution=institution,
                    name="Nazera & Noorani Department",
                    code="NAZERA",
                    has_quran_tracker=True,
                    order_rank=2,
                    is_active=True,
                )
                AcademicDepartment.objects.create(
                    institution=institution,
                    name="General Education Department",
                    code="GEN",
                    has_quran_tracker=False,
                    order_rank=3,
                    is_active=True,
                )

            # 4. Seed Default Document Templates
            from core.services import seed_default_document_templates
            seed_default_document_templates(institution)

            return {
                'institution': AcademicInstitutionSerializer(institution).data,
                'admin_user': {
                    'id': admin_user.id,
                    'name': admin_user.name,
                    'phone_number': admin_user.phone_number,
                    'email': admin_user.email,
                    'user_type': admin_user.user_type,
                }
            }


class AcademicDepartmentSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    department_head_name = serializers.CharField(source='department_head.name', read_only=True, default='')
    department_head_phone = serializers.CharField(source='department_head.phone_number', read_only=True, default='')
    classes_count = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = AcademicDepartment
        fields = [
            'id', 'institution', 'institution_name', 'name', 'code', 'department_head',
            'department_head_name', 'department_head_phone',
            'has_quran_tracker', 'order_rank', 'is_active', 'is_deleted',
            'classes_count', 'students_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'classes_count', 'students_count', 'institution_name']

    @extend_schema_field(OpenApiTypes.INT)
    def get_classes_count(self, obj):
        return obj.classes.filter(is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_students_count(self, obj):
        from core.models import Student
        return Student.objects.filter(
            student_class__department=obj,
            is_deleted=False
        ).count()


class StudentClassSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    department_code = serializers.CharField(source='department.code', read_only=True, default='')
    has_quran_tracker = serializers.BooleanField(source='department.has_quran_tracker', read_only=True, default=False)
    class_teacher_name = serializers.CharField(source='class_teacher.name', read_only=True, default='')
    class_teacher_phone = serializers.CharField(source='class_teacher.phone_number', read_only=True, default='')
    student_count = serializers.SerializerMethodField()
    group_count = serializers.SerializerMethodField()

    class Meta:
        model = StudentClass
        fields = [
            'id', 'institution', 'institution_name', 'department', 'department_name', 'department_code', 'has_quran_tracker',
            'name', 'code', 'department_type',
            'class_teacher', 'class_teacher_name', 'class_teacher_phone',
            'order_rank', 'is_active', 'is_deleted',
            'student_count', 'group_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'student_count', 'group_count',
            'institution_name', 'department_name', 'department_code', 'has_quran_tracker'
        ]

    @extend_schema_field(OpenApiTypes.INT)
    def get_student_count(self, obj):
        return obj.students.filter(is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_group_count(self, obj):
        return obj.groups.filter(is_deleted=False).count()


class StudentGroupSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_class_code = serializers.CharField(source='student_class.code', read_only=True, default='')
    department_type = serializers.CharField(source='student_class.department_type', read_only=True, default='HIFZ')
    mentor_teacher_name = serializers.CharField(source='mentor_teacher.name', read_only=True, default='')
    mentor_teacher_phone = serializers.CharField(source='mentor_teacher.phone_number', read_only=True, default='')
    student_count = serializers.SerializerMethodField()
    available_seats = serializers.SerializerMethodField()
    capacity_percentage = serializers.SerializerMethodField()

    class Meta:
        model = StudentGroup
        fields = [
            'id', 'institution', 'institution_name', 'name', 'student_class', 'student_class_name', 'student_class_code',
            'department_type', 'mentor_teacher', 'mentor_teacher_name', 'mentor_teacher_phone',
            'capacity', 'is_active', 'is_deleted', 'student_count', 'available_seats',
            'capacity_percentage', 'created_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'institution_name', 'student_count', 'available_seats', 'capacity_percentage']

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'group_name' in mutable_data and 'name' not in mutable_data:
            mutable_data['name'] = mutable_data['group_name']
        return super().to_internal_value(mutable_data)

    @extend_schema_field(OpenApiTypes.INT)
    def get_student_count(self, obj):
        from core.models import Student
        return Student.objects.filter(
            Q(student_group=obj) | Q(group_name__iexact=obj.name),
            is_deleted=False
        ).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_available_seats(self, obj):
        if obj.capacity <= 0:
            return 999
        count = self.get_student_count(obj)
        return max(0, obj.capacity - count)

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_capacity_percentage(self, obj):
        if obj.capacity <= 0:
            return 0.0
        count = self.get_student_count(obj)
        return round(min(100.0, (count / obj.capacity) * 100), 1)


class StudentAcademicHistorySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name_en', read_only=True, default='')
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True, default='')
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')
    transferred_by_name = serializers.CharField(source='transferred_by.name', read_only=True, default='')

    class Meta:
        model = StudentAcademicHistory
        fields = [
            'id', 'student', 'student_name', 'student_uniq_id',
            'student_class', 'student_class_name',
            'student_group', 'student_group_name',
            'start_date', 'end_date', 'is_current',
            'transition_reason', 'transferred_by', 'transferred_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StudentTransferAcademicSerializer(serializers.Serializer):
    target_class_id = serializers.UUIDField(required=False, allow_null=True)
    target_group_id = serializers.IntegerField(required=False, allow_null=True)
    transition_date = serializers.DateField(required=False, allow_null=True)
    transition_reason = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        if not attrs.get('target_class_id') and not attrs.get('target_group_id'):
            raise serializers.ValidationError("At least one destination (target_class_id or target_group_id) must be specified.")
        return attrs


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


class StudentSerializer(serializers.ModelSerializer):
    # Nested detail serializer
    details = StudentDetailSerializer(required=False, allow_null=True)

    # Class & Group relationships
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')

    # Backward compatibility aliases for legacy API consumers & frontend
    name = serializers.CharField(source='name_en', required=False, allow_blank=True, allow_null=True)
    roll = serializers.IntegerField(source='roll_number', required=False, allow_null=True)
    unique_id = serializers.CharField(source='uniq_id', required=False, allow_blank=True, allow_null=True)
    group = serializers.CharField(source='group_name', required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'institution', 'institution_name', 'uniq_id', 'unique_id',
            'roll_number', 'roll',
            'name_en', 'name',
            'student_class', 'student_class_name',
            'student_group', 'student_group_name',
            'group_name', 'group',
            'admission_date', 'status', 'is_active', 'is_deleted',
            'education_status', 'target_status',
            'details',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'uniq_id': {'required': False, 'allow_null': True},
            'roll_number': {'required': False, 'allow_null': True},
            'name_en': {'required': False, 'allow_null': True},
            'student_class': {'required': False, 'allow_null': True},
            'student_group': {'required': False, 'allow_null': True},
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
    mistake_details = serializers.SerializerMethodField()
    stuck_details   = serializers.SerializerMethodField()

    # ── Report Status (Nested & Flattened) ────────────────────
    status_info = ReportStatusSerializer(read_only=True)
    report_status = ReportStatusSerializer(source='status_info', read_only=True)
    is_edited = serializers.SerializerMethodField()
    edit_time = serializers.SerializerMethodField()
    edited_at = serializers.SerializerMethodField()
    is_locked = serializers.SerializerMethodField()
    lock_time = serializers.SerializerMethodField()
    is_deleted = serializers.SerializerMethodField()
    delete_time = serializers.SerializerMethodField()

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
    report_date   = serializers.SerializerMethodField()
    generate_date = serializers.SerializerMethodField()
    formattedDate = serializers.SerializerMethodField()
    formattedTime = serializers.SerializerMethodField()

    class Meta:
        model = StudentDailyReport
        fields = [
            'id', 'report_unique_id', 'date', 'date_time', 'report_date', 'generate_date',
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
            'mistake_details',
            'stuck_details',
            'created_by',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'report_unique_id']

    # ── Computed status fields ────────────────────────────────

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_edited(self, obj):
        st = getattr(obj, 'status_info', None)
        return st.is_edited if st else False

    @extend_schema_field(OpenApiTypes.STR)
    def get_edit_time(self, obj):
        st = getattr(obj, 'status_info', None)
        return st.edit_time.strftime("%Y-%m-%d %H:%M:%S") if (st and st.edit_time) else None

    @extend_schema_field(OpenApiTypes.STR)
    def get_edited_at(self, obj):
        return self.get_edit_time(obj)

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_locked(self, obj):
        st = getattr(obj, 'status_info', None)
        return st.is_locked if st else False

    @extend_schema_field(OpenApiTypes.STR)
    def get_lock_time(self, obj):
        st = getattr(obj, 'status_info', None)
        return st.lock_time.strftime("%Y-%m-%d %H:%M:%S") if (st and st.lock_time) else None

    @extend_schema_field(OpenApiTypes.BOOL)
    def get_is_deleted(self, obj):
        st = getattr(obj, 'status_info', None)
        return st.is_deleted if st else False

    @extend_schema_field(OpenApiTypes.STR)
    def get_delete_time(self, obj):
        st = getattr(obj, 'status_info', None)
        return st.delete_time.strftime("%Y-%m-%d %H:%M:%S") if (st and st.delete_time) else None

    # ── Computed compat fields ───────────────────────────────

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_mistake_details(self, obj):
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
    def get_report_date(self, obj):
        dt = obj.date or obj.created_at
        return dt.strftime("%Y-%m-%d") if dt else ""

    @extend_schema_field(OpenApiTypes.STR)
    def get_generate_date(self, obj):
        dt = obj.created_at or obj.date
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
            if isinstance(date_val, datetime):
                mutable_data['date'] = date_val
            elif isinstance(date_val, date):
                mutable_data['date'] = datetime.combine(date_val, timezone.now().time())
            elif isinstance(date_val, str) and date_val.strip():
                clean_str = date_val.strip()
                parsed_dt = None
                try:
                    from dateutil import parser
                    parsed_dt = parser.parse(clean_str)
                except Exception:
                    for fmt in ["%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y", "%Y/%m/%d", "%d.%m.%Y"]:
                        try:
                            parsed_dt = datetime.strptime(clean_str, fmt)
                            break
                        except ValueError:
                            pass
                if parsed_dt:
                    if parsed_dt.time() == datetime.min.time():
                        now_time = timezone.now().time()
                        parsed_dt = datetime.combine(parsed_dt.date(), now_time)
                    mutable_data['date'] = timezone.make_aware(parsed_dt) if timezone.is_naive(parsed_dt) else parsed_dt
                else:
                    mutable_data['date'] = timezone.now()
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
                try:
                    student_obj = Student.objects.filter(name_en__iexact=name_clean).first()
                    if not student_obj:
                        max_roll = Student.objects.aggregate(Max('roll_number'))['roll_number__max'] or 0
                        req = self.context.get('request')
                        user = getattr(req, 'user', None) if req else None
                        student_obj = Student.objects.create(
                            name_en=name_clean,
                            name=name_clean,
                            group_name=group_val,
                            roll_number=max_roll + 1,
                            created_by=user if (user and user.is_authenticated) else None,
                        )
                    mutable_data['student'] = student_obj.pk
                    mutable_data['student_name'] = student_obj.name_en or name_clean
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"[ReportSerializer] Auto-student lookup/create failed for '{name_clean}': {e}."
                    )
                    try:
                        fallback = Student.objects.filter(name_en__icontains=name_clean).first()
                        if fallback:
                            mutable_data['student'] = fallback.pk
                            mutable_data['student_name'] = fallback.name_en or name_clean
                        else:
                            from rest_framework.exceptions import ValidationError
                            raise ValidationError(
                                {'student': f"Could not find or create student '{name_clean}'. Please add the student first."}
                            )
                    except Exception:
                        from rest_framework.exceptions import ValidationError
                        raise ValidationError(
                            {'student': f"Could not find or create student '{name_clean}'. Please add the student first."}
                        )

        return super().to_internal_value(mutable_data)

    # ── Internal helpers ─────────────────────────────────────

    def _safe_int(self, val, default=0):
        try:
            return int(val)
        except (TypeError, ValueError):
            return default

    def _parse_legacy_errors(self, report, mistakes_input, stucks_input):
        """Parse old frontend format (mistake_details/stuck_details arrays) into ReportErrorDetail."""
        def _process(items, error_type):
            count = 0
            for item in items:
                if not isinstance(item, dict):
                    continue
                juz  = str(item.get('juz', '')).strip()
                page = str(item.get('page', '')).strip()
                ayahs = item.get('ayahs', [])

                valid_ayahs = [
                    ((a.get('value') or a.get('ayah') or '') if isinstance(a, dict) else str(a)).strip()
                    for a in (ayahs if isinstance(ayahs, list) else [])
                ]
                valid_ayahs = [a for a in valid_ayahs if a]

                if valid_ayahs:
                    for a_val in valid_ayahs:
                        ReportErrorDetail.objects.create(
                            report=report,
                            type=error_type,
                            juz=self._safe_int(juz),
                            page=self._safe_int(page),
                            ayah=self._safe_int(a_val),
                        )
                        count += 1
                elif page:
                    line_val = str(item.get('line') or item.get('ayah') or '').strip()
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
            validated_data['student_name'] = student_obj.name_en or student_obj.name or 'Student'

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

        report.refresh_from_db()
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
            'post_code', 'postal_code', 'thana_or_upazila', 'district', 'division', 'country',
            'latitude', 'longitude', 'map_place_id'
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
            'latitude', 'longitude', 'map_place_id',
            'admission_mode', 'status', 'group_name', 'roll_number', 'education_status',
            'student_class', 'student_group'
        ]

    @transaction.atomic
    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request and request.user.is_authenticated else None
        scoped_inst_id = get_scoped_tenant_id(request) if request else None

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
        if scoped_inst_id and not validated_data.get('institution_id'):
            validated_data['institution_id'] = scoped_inst_id

        # Auto sync class name / relation
        student_class = validated_data.get('student_class')
        if student_class and not validated_data.get('education_status'):
            validated_data['education_status'] = student_class.name
        elif not student_class and validated_data.get('education_status'):
            inst = validated_data.get('institution') or getattr(user, 'institution', None)
            if inst:
                cls_obj = StudentClass.objects.filter(institution=inst, name__iexact=validated_data['education_status']).first()
                if cls_obj:
                    validated_data['student_class'] = cls_obj

        # Auto generate class roll number if not provided
        if not validated_data.get('roll_number') or validated_data.get('roll_number') <= 0:
            filter_kwargs = {'is_deleted': False}
            if scoped_inst_id:
                filter_kwargs['institution_id'] = scoped_inst_id
            if validated_data.get('student_class'):
                filter_kwargs['student_class'] = validated_data.get('student_class')
            elif validated_data.get('education_status'):
                filter_kwargs['education_status'] = validated_data.get('education_status')
            
            max_roll = Student.objects.filter(**filter_kwargs).aggregate(Max('roll_number'))['roll_number__max'] or 0
            validated_data['roll_number'] = max_roll + 1

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
    academic_history = StudentAcademicHistorySerializer(many=True, read_only=True)

    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')

    completed_juz_count = serializers.SerializerMethodField()
    active_juz = serializers.SerializerMethodField()
    recent_error_average = serializers.SerializerMethodField()
    quran_progress = serializers.SerializerMethodField()
    department_type = serializers.SerializerMethodField()

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
            'latitude', 'longitude', 'map_place_id',
            'academic_detail', 'guardian_detail', 'documents', 'academic_history', 'admission_mode', 
            'status', 'student_class', 'student_class_name', 'student_group', 'student_group_name',
            'group_name', 'created_at', 'updated_at', 'education_status',
            'present_address_data', 'permanent_address_data', 'academic_data', 'guardian_data',
            'completed_juz_count', 'active_juz', 'recent_error_average', 'quran_progress', 'department_type'
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

    def get_quran_progress(self, obj):
        initial = 0
        try:
            if hasattr(obj, 'details') and obj.details:
                initial = obj.details.initial_completed_juz or 0
        except Exception:
            pass

        juz_statuses = {i: "upcoming" for i in range(1, 31)}
        for i in range(1, min(initial + 1, 31)):
            juz_statuses[i] = "completed"

        # Fetch portions
        from core.models import ReportPortion
        portions = ReportPortion.objects.filter(report__student=obj).select_related('report').order_by('report__date')
        
        for p in portions:
            session_type = str(p.report.session_name or '').upper()
            for j in range(p.start_juz, p.end_juz + 1):
                if 1 <= j <= 30:
                    if j <= initial:
                        continue
                    if 'SABQ' in session_type or 'SABAQ' in session_type:
                        if juz_statuses[j] == "upcoming":
                            juz_statuses[j] = "in_progress"
                    elif 'SABQI' in session_type or 'MANZIL' in session_type or 'PORTION' in session_type:
                        juz_statuses[j] = "completed"
                    else:
                        if juz_statuses[j] == "upcoming":
                            juz_statuses[j] = "in_progress"

        max_completed = initial
        for j, status in juz_statuses.items():
            if status == "completed":
                max_completed = max(max_completed, j)
        for i in range(1, max_completed + 1):
            juz_statuses[i] = "completed"

        return [{"juz": i, "status": juz_statuses[i]} for i in range(1, 31)]

    def get_completed_juz_count(self, obj):
        progress = self.get_quran_progress(obj)
        return sum(1 for item in progress if item["status"] == "completed")

    def get_active_juz(self, obj):
        progress = self.get_quran_progress(obj)
        return [item["juz"] for item in progress if item["status"] == "in_progress"]

    def get_recent_error_average(self, obj):
        reports = obj.daily_reports.all().order_by('-date')[:10]
        if not reports:
            return 0.0
        total_errors = sum((r.total_mistake + r.total_stuck) for r in reports)
        return round(total_errors / len(reports), 2)

    def get_department_type(self, obj):
        group = str(obj.group_name or '').upper()
        if any(w in group for w in ['HIFZ', 'NAZERA', 'SABAQ', 'QURAN', 'HALQA']):
            return 'HIFZ'
        if any(w in group for w in ['GENERAL', 'CLASS', 'KINDERGARTEN', 'PRIMARY']):
            return 'GENERAL'
        return 'HIFZ'


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


# ==============================================================================
# 🎯 6. ENTERPRISE TEACHER & STAFF MANAGEMENT SERIALIZERS
# ==============================================================================

class TeacherDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherDetail
        fields = [
            'highest_degree',
            'specialization',
            'max_daily_periods',
            'can_review_reports'
        ]


class GeneralStaffDetailSerializer(serializers.ModelSerializer):
    reporting_to_name = serializers.CharField(source='reporting_to.user.name', read_only=True, default='')
    reporting_to_employee_id = serializers.CharField(source='reporting_to.employee_id', read_only=True, default='')

    class Meta:
        model = GeneralStaffDetail
        fields = [
            'assigned_zone',
            'reporting_to',
            'reporting_to_name',
            'reporting_to_employee_id',
            'duty_scope',
            'shift_type'
        ]


class StaffProfileSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True, default='')
    user_phone = serializers.CharField(source='user.phone_number', read_only=True, default='')
    user_email = serializers.CharField(source='user.email', read_only=True, default='')
    user_avatar = serializers.CharField(source='user.avatar_url', read_only=True, default='')
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    employee_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    teacher_detail = TeacherDetailSerializer(required=False, allow_null=True)
    general_detail = GeneralStaffDetailSerializer(required=False, allow_null=True)
    active_assignments_count = serializers.SerializerMethodField()
    active_duties_count = serializers.SerializerMethodField()

    class Meta:
        model = StaffProfile
        fields = [
            'id',
            'user',
            'user_name',
            'user_phone',
            'user_email',
            'user_avatar',
            'institution',
            'institution_name',
            'employee_id',
            'staff_type',
            'designation',
            'department',
            'department_name',
            'employment_status',
            'joining_date',
            'nid_no',
            'emergency_contact',
            'blood_group',
            'address',
            'division',
            'district',
            'upazila_thana',
            'postal_code',
            'latitude',
            'longitude',
            'map_place_id',
            'salary_type',
            'base_salary',
            'bank_account_no',
            'bank_name',
            'mobile_banking_no',
            'is_active',
            'is_deleted',
            'teacher_detail',
            'general_detail',
            'active_assignments_count',
            'active_duties_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'department_name', 'created_at', 'updated_at', 'active_assignments_count', 'active_duties_count']

    @extend_schema_field(OpenApiTypes.INT)
    def get_active_assignments_count(self, obj):
        return obj.assignments.filter(is_active=True).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_active_duties_count(self, obj):
        return obj.duties.filter(is_active=True).count()

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'user_id' in data and 'user' not in data:
            data['user'] = data.pop('user_id')
        return super().to_internal_value(data)

    def validate(self, attrs):
        staff_type = attrs.get('staff_type') or (self.instance.staff_type if self.instance else 'TEACHING')
        employee_id = attrs.get('employee_id')
        institution = attrs.get('institution') or (self.instance.institution if self.instance else None)

        if employee_id:
            qs = StaffProfile.objects.filter(employee_id=employee_id, is_deleted=False)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"employee_id": f"Employee ID '{employee_id}' is already assigned."})

        return attrs

    def create(self, validated_data):
        teacher_data = validated_data.pop('teacher_detail', None)
        general_data = validated_data.pop('general_detail', None)

        if not validated_data.get('employee_id'):
            from .services import StaffOnboardingService
            validated_data['employee_id'] = StaffOnboardingService.generate_employee_id(
                validated_data.get('institution'),
                validated_data.get('staff_type', 'TEACHING')
            )

        with transaction.atomic():
            staff = StaffProfile.objects.create(**validated_data)

            if staff.staff_type == 'TEACHING':
                td = teacher_data or {}
                TeacherDetail.objects.create(staff=staff, **td)
            else:
                gd = general_data or {}
                GeneralStaffDetail.objects.create(staff=staff, **gd)

            return staff

    def update(self, instance, validated_data):
        teacher_data = validated_data.pop('teacher_detail', None)
        general_data = validated_data.pop('general_detail', None)

        with transaction.atomic():
            old_staff_type = instance.staff_type
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.save()

            # Handle type migration or detail sync
            if instance.staff_type == 'TEACHING':
                if hasattr(instance, 'general_detail'):
                    instance.general_detail.delete()
                td_obj, _ = TeacherDetail.objects.get_or_create(staff=instance)
                if teacher_data:
                    for k, v in teacher_data.items():
                        setattr(td_obj, k, v)
                    td_obj.save()
            else:
                if hasattr(instance, 'teacher_detail'):
                    instance.teacher_detail.delete()
                gd_obj, _ = GeneralStaffDetail.objects.get_or_create(staff=instance)
                if general_data:
                    for k, v in general_data.items():
                        setattr(gd_obj, k, v)
                    gd_obj.save()

            return instance


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.user.name', read_only=True, default='')
    teacher_phone = serializers.CharField(source='teacher.user.phone_number', read_only=True, default='')
    teacher_employee_id = serializers.CharField(source='teacher.employee_id', read_only=True, default='')
    class_name = serializers.CharField(source='assigned_class.name', read_only=True, default='')
    group_name = serializers.CharField(source='assigned_group.name', read_only=True, default='')
    session_name = serializers.CharField(source='session.name', read_only=True, default='')

    class Meta:
        model = TeacherAssignment
        fields = [
            'id',
            'teacher',
            'teacher_name',
            'teacher_phone',
            'teacher_employee_id',
            'assigned_class',
            'class_name',
            'assigned_group',
            'group_name',
            'session',
            'session_name',
            'role_in_class',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'teacher_name', 'teacher_phone', 'teacher_employee_id', 'class_name', 'group_name', 'session_name', 'created_at', 'updated_at']

    def validate(self, attrs):
        teacher = attrs.get('teacher') or (self.instance.teacher if self.instance else None)
        assigned_class = attrs.get('assigned_class') or (self.instance.assigned_class if self.instance else None)
        assigned_group = attrs.get('assigned_group') or (self.instance.assigned_group if self.instance else None)

        if not teacher:
            raise serializers.ValidationError({"teacher": "Teacher staff profile is required."})

        if teacher.staff_type != 'TEACHING':
            raise serializers.ValidationError({"teacher": "Only staff members with 'TEACHING' staff type can receive academic class assignments."})

        # Cross-tenant security validation
        if assigned_class and teacher.institution_id:
            if assigned_class.institution_id and str(assigned_class.institution_id) != str(teacher.institution_id):
                raise serializers.ValidationError({"assigned_class": "Cross-tenant violation: Assigned class belongs to a different academic institution."})

        if assigned_group and teacher.institution_id:
            if assigned_group.institution_id and str(assigned_group.institution_id) != str(teacher.institution_id):
                raise serializers.ValidationError({"assigned_group": "Cross-tenant violation: Assigned group belongs to a different academic institution."})

        if assigned_class and assigned_group:
            if assigned_group.student_class_id and str(assigned_group.student_class_id) != str(assigned_class.id):
                raise serializers.ValidationError({"assigned_group": "Selected group does not belong to the chosen class."})

        return attrs


class GeneralStaffDutySerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.name', read_only=True, default='')
    staff_phone = serializers.CharField(source='staff.user.phone_number', read_only=True, default='')
    staff_employee_id = serializers.CharField(source='staff.employee_id', read_only=True, default='')
    designation = serializers.CharField(source='staff.designation', read_only=True, default='')

    class Meta:
        model = GeneralStaffDuty
        fields = [
            'id',
            'staff',
            'staff_name',
            'staff_phone',
            'staff_employee_id',
            'designation',
            'duty_title',
            'duty_description',
            'effective_from',
            'effective_to',
            'priority',
            'is_active',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'staff_name', 'staff_phone', 'staff_employee_id', 'designation', 'created_at', 'updated_at']

    def validate(self, attrs):
        staff = attrs.get('staff') or (self.instance.staff if self.instance else None)
        effective_from = attrs.get('effective_from') or (self.instance.effective_from if self.instance else None)
        effective_to = attrs.get('effective_to') or (self.instance.effective_to if self.instance else None)

        if effective_from and effective_to and effective_to < effective_from:
            raise serializers.ValidationError({"effective_to": "Duty expiration date cannot be earlier than the start date."})

        return attrs


class StaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.name', read_only=True, default='')
    staff_employee_id = serializers.CharField(source='staff.employee_id', read_only=True, default='')
    staff_designation = serializers.CharField(source='staff.designation', read_only=True, default='')
    staff_type = serializers.CharField(source='staff.staff_type', read_only=True, default='')

    class Meta:
        model = StaffAttendance
        fields = [
            'id',
            'staff',
            'staff_name',
            'staff_employee_id',
            'staff_designation',
            'staff_type',
            'date',
            'in_time',
            'out_time',
            'status',
            'device_ip',
            'source',
            'remarks',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'staff_name', 'staff_employee_id', 'staff_designation', 'staff_type', 'created_at', 'updated_at']


class StaffBulkPunchSerializer(serializers.Serializer):
    date = serializers.DateField(default=timezone.now)
    records = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
        help_text="List of objects: [{'staff_id': '...', 'status': 'PRESENT', 'in_time': '08:30', 'out_time': '16:30', 'remarks': ''}]"
    )


class StaffLeaveRequestSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.user.name', read_only=True, default='')
    staff_phone = serializers.CharField(source='staff.user.phone_number', read_only=True, default='')
    staff_employee_id = serializers.CharField(source='staff.employee_id', read_only=True, default='')
    staff_designation = serializers.CharField(source='staff.designation', read_only=True, default='')
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True, default='')
    duration_days = serializers.SerializerMethodField()

    class Meta:
        model = StaffLeaveRequest
        fields = [
            'id',
            'staff',
            'staff_name',
            'staff_phone',
            'staff_employee_id',
            'staff_designation',
            'leave_type',
            'start_date',
            'end_date',
            'reason',
            'status',
            'approved_by',
            'approved_by_name',
            'admin_remarks',
            'action_date',
            'duration_days',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'staff_name', 'staff_phone', 'staff_employee_id', 'staff_designation', 'approved_by', 'approved_by_name', 'action_date', 'duration_days', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.INT)
    def get_duration_days(self, obj):
        if obj.start_date and obj.end_date:
            return max(1, (obj.end_date - obj.start_date).days + 1)
        return 1

    def validate(self, attrs):
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        end_date = attrs.get('end_date') or (self.instance.end_date if self.instance else None)

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "Leave end date cannot be earlier than start date."})

        return attrs


class StaffLeaveActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'REJECTED'])
    admin_remarks = serializers.CharField(required=False, allow_blank=True, default='')


class StaffInviteSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    staff_type = serializers.ChoiceField(choices=StaffProfile.STAFF_TYPE_CHOICES, default='TEACHING')
    designation = serializers.CharField(max_length=100)
    department_id = serializers.UUIDField(required=False, allow_null=True)
    role_id = serializers.IntegerField(required=False, allow_null=True)
    employee_id = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    highest_degree = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    specialization = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')


# =============================================================================
# 🎯 ATTENDANCE, CALENDAR & TASK ECOSYSTEM SERIALIZERS
# =============================================================================

class AcademicCalendarEventSerializer(serializers.ModelSerializer):
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, default='')
    duration_days = serializers.SerializerMethodField()

    class Meta:
        model = AcademicCalendarEvent
        fields = [
            'id',
            'institution',
            'title',
            'description',
            'event_type',
            'event_type_display',
            'start_date',
            'end_date',
            'duration_days',
            'affects_students',
            'affects_staff',
            'is_residential_active',
            'color_code',
            'created_by',
            'created_by_name',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'created_by', 'created_by_name', 'duration_days', 'is_deleted', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.INT)
    def get_duration_days(self, obj):
        if obj.start_date and obj.end_date:
            return max(1, (obj.end_date - obj.start_date).days + 1)
        return 1

    def validate(self, attrs):
        start_date = attrs.get('start_date') or (self.instance.start_date if self.instance else None)
        end_date = attrs.get('end_date') or (self.instance.end_date if self.instance else None)

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be earlier than start date."})

        return attrs


class InstitutionalTaskSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.name', read_only=True, default='')
    created_by_name = serializers.CharField(source='created_by.name', read_only=True, default='')

    class Meta:
        model = InstitutionalTask
        fields = [
            'id',
            'institution',
            'title',
            'description',
            'due_date',
            'due_time',
            'priority',
            'priority_display',
            'status',
            'status_display',
            'category',
            'category_display',
            'assigned_to',
            'assigned_to_name',
            'is_completed',
            'completed_at',
            'created_by',
            'created_by_name',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'assigned_to_name', 'created_by', 'created_by_name', 'is_deleted', 'created_at', 'updated_at']


class AttendanceSessionSlotSerializer(serializers.ModelSerializer):
    slot_type_display = serializers.CharField(source='get_slot_type_display', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    class_name = serializers.CharField(source='student_class.name', read_only=True, default='')

    class Meta:
        model = AttendanceSessionSlot
        fields = [
            'id',
            'institution',
            'name',
            'slot_type',
            'slot_type_display',
            'department',
            'department_name',
            'student_class',
            'class_name',
            'start_time',
            'end_time',
            'late_cutoff_time',
            'order_rank',
            'is_active',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'slot_type_display', 'department_name', 'class_name', 'is_deleted', 'created_at', 'updated_at']


class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True, default='')
    student_roll = serializers.IntegerField(source='student.roll_number', read_only=True, default=0)
    student_class_name = serializers.CharField(source='student.student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student.student_group.name', read_only=True, default='')
    session_slot_name = serializers.CharField(source='session_slot.name', read_only=True, default='')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    marked_by_name = serializers.CharField(source='marked_by.name', read_only=True, default='')

    class Meta:
        model = StudentAttendance
        fields = [
            'id',
            'student',
            'student_name',
            'student_roll',
            'student_class_name',
            'student_group_name',
            'session_slot',
            'session_slot_name',
            'date',
            'status',
            'status_display',
            'in_time',
            'marked_by',
            'marked_by_name',
            'source',
            'remarks',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'student_name',
            'student_roll',
            'student_class_name',
            'student_group_name',
            'session_slot_name',
            'status_display',
            'marked_by',
            'marked_by_name',
            'created_at',
            'updated_at',
        ]


class BulkStudentAttendanceRecordItemSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=StudentAttendance.ATTENDANCE_STATUS_CHOICES, default='PRESENT')
    in_time = serializers.TimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


class BulkStudentAttendancePunchSerializer(serializers.Serializer):
    date = serializers.DateField()
    session_slot_id = serializers.UUIDField(required=False, allow_null=True)
    class_id = serializers.IntegerField(required=False, allow_null=True)
    group_id = serializers.IntegerField(required=False, allow_null=True)
    override_holiday = serializers.BooleanField(default=False)
    records = BulkStudentAttendanceRecordItemSerializer(many=True)


class AttendancePolicySettingSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    default_mode_display = serializers.CharField(source='get_default_mode_display', read_only=True)

    class Meta:
        model = AttendancePolicySetting
        fields = [
            'id',
            'institution',
            'institution_name',
            'weekend_days',
            'default_mode',
            'default_mode_display',
            'default_late_cutoff_time',
            'auto_excuse_holidays',
            'auto_notify_absent',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'default_mode_display', 'created_at', 'updated_at']


class DynamicPeriodSlotSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    department_name = serializers.CharField(source='department.name', read_only=True, default='')
    class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    slot_type_display = serializers.CharField(source='get_slot_type_display', read_only=True)

    class Meta:
        model = DynamicPeriodSlot
        fields = [
            'id',
            'institution',
            'institution_name',
            'department',
            'department_name',
            'student_class',
            'class_name',
            'slot_type',
            'slot_type_display',
            'period_name',
            'period_order',
            'start_time',
            'end_time',
            'late_grace_minutes',
            'is_active',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'department_name', 'class_name', 'slot_type_display', 'created_at', 'updated_at']


class TeacherRoutineScheduleSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    teacher_name = serializers.SerializerMethodField()
    period_slot_name = serializers.CharField(source='period_slot.period_name', read_only=True, default='')
    period_order = serializers.IntegerField(source='period_slot.period_order', read_only=True, default=1)
    period_start_time = serializers.TimeField(source='period_slot.start_time', read_only=True, default=None)
    period_end_time = serializers.TimeField(source='period_slot.end_time', read_only=True, default=None)
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')

    class Meta:
        model = TeacherRoutineSchedule
        fields = [
            'id',
            'institution',
            'institution_name',
            'teacher',
            'teacher_name',
            'period_slot',
            'period_slot_name',
            'period_order',
            'period_start_time',
            'period_end_time',
            'student_class',
            'student_class_name',
            'student_group',
            'student_group_name',
            'subject_or_kitab_name',
            'day_of_week',
            'room_number',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'teacher_name', 'period_slot_name', 'period_order', 'period_start_time', 'period_end_time', 'student_class_name', 'student_group_name', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_teacher_name(self, obj):
        if not obj.teacher:
            return ""
        return obj.teacher.name_en or getattr(obj.teacher, 'name_bn', '') or (obj.teacher.user.phone_number if obj.teacher.user else f"Teacher #{obj.teacher.id}")


class TeacherPeriodAttendanceRecordSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    teacher_name = serializers.SerializerMethodField()
    substitute_teacher_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    schedule_details = TeacherRoutineScheduleSerializer(source='schedule', read_only=True)
    marked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = TeacherPeriodAttendanceRecord
        fields = [
            'id',
            'institution',
            'institution_name',
            'schedule',
            'schedule_details',
            'teacher',
            'teacher_name',
            'substitute_teacher',
            'substitute_teacher_name',
            'date',
            'status',
            'status_display',
            'is_conducted',
            'remarks',
            'marked_by',
            'marked_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'teacher_name', 'substitute_teacher_name', 'status_display', 'schedule_details', 'marked_by_name', 'created_at', 'updated_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_teacher_name(self, obj):
        if not obj.teacher:
            return ""
        return obj.teacher.name_en or (obj.teacher.user.phone_number if obj.teacher.user else f"Teacher #{obj.teacher.id}")

    @extend_schema_field(OpenApiTypes.STR)
    def get_substitute_teacher_name(self, obj):
        if not obj.substitute_teacher:
            return ""
        return obj.substitute_teacher.name_en or (obj.substitute_teacher.user.phone_number if obj.substitute_teacher.user else f"Teacher #{obj.substitute_teacher.id}")

    @extend_schema_field(OpenApiTypes.STR)
    def get_marked_by_name(self, obj):
        if not obj.marked_by:
            return ""
        return obj.marked_by.username or obj.marked_by.phone_number or f"User #{obj.marked_by.id}"


class TeacherMatrixBulkUpdateItemSerializer(serializers.Serializer):
    schedule_id = serializers.UUIDField()
    date = serializers.DateField()
    status = serializers.ChoiceField(choices=TeacherPeriodAttendanceRecord.STATUS_CHOICES, default='PRESENT')
    substitute_teacher_id = serializers.IntegerField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


class TeacherMatrixBulkUpdateSerializer(serializers.Serializer):
    records = TeacherMatrixBulkUpdateItemSerializer(many=True)


class GateEntryExitLogSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    student_name = serializers.CharField(source='student.name', read_only=True, default='')
    student_roll = serializers.IntegerField(source='student.roll_number', read_only=True, default=0)
    student_class_name = serializers.CharField(source='student.student_class.name', read_only=True, default='')
    staff_name = serializers.CharField(source='staff.name_en', read_only=True, default='')
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GateEntryExitLog
        fields = [
            'id',
            'institution',
            'institution_name',
            'student',
            'student_name',
            'student_roll',
            'student_class_name',
            'staff',
            'staff_name',
            'person_name',
            'barcode_or_rfid',
            'punch_time',
            'direction',
            'direction_display',
            'gate_pass_reason',
            'device_name',
            'recorded_by',
            'recorded_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'student_name', 'student_roll', 'student_class_name', 'staff_name', 'direction_display', 'recorded_by_name', 'created_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_recorded_by_name(self, obj):
        if not obj.recorded_by:
            return ""
        return obj.recorded_by.username or obj.recorded_by.phone_number or f"User #{obj.recorded_by.id}"


class AdHocHeadcountSessionSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')
    conducted_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AdHocHeadcountSession
        fields = [
            'id',
            'institution',
            'institution_name',
            'title',
            'date_time',
            'student_class',
            'student_class_name',
            'student_group',
            'student_group_name',
            'conducted_by',
            'conducted_by_name',
            'total_expected',
            'total_verified',
            'verified_student_ids',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'student_class_name', 'student_group_name', 'conducted_by_name', 'created_at']

    @extend_schema_field(OpenApiTypes.STR)
    def get_conducted_by_name(self, obj):
        if not obj.conducted_by:
            return ""
        return obj.conducted_by.username or obj.conducted_by.phone_number or f"User #{obj.conducted_by.id}"


class BiometricDeviceSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    device_type_display = serializers.CharField(source='get_device_type_display', read_only=True)

    class Meta:
        model = BiometricDevice
        fields = [
            'id',
            'institution',
            'institution_name',
            'device_name',
            'device_serial',
            'device_ip',
            'port',
            'device_type',
            'device_type_display',
            'location',
            'api_key_or_token',
            'last_heartbeat',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'device_type_display', 'created_at', 'updated_at']


class RawAttendancePunchLogSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source='device.device_name', read_only=True, default='')
    matched_student_name = serializers.CharField(source='matched_student.name', read_only=True, default='')
    matched_teacher_name = serializers.CharField(source='matched_teacher.name_en', read_only=True, default='')
    punch_type_display = serializers.CharField(source='get_punch_type_display', read_only=True)

    class Meta:
        model = RawAttendancePunchLog
        fields = [
            'id',
            'device',
            'device_name',
            'user_pin_or_card',
            'punch_timestamp',
            'punch_type',
            'punch_type_display',
            'raw_payload',
            'is_processed',
            'matched_student',
            'matched_student_name',
            'matched_teacher',
            'matched_teacher_name',
            'processing_notes',
            'created_at',
        ]
        read_only_fields = ['id', 'device_name', 'matched_student_name', 'matched_teacher_name', 'punch_type_display', 'created_at']


class StudentPeriodRollCallItemSerializer(serializers.Serializer):
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=StudentAttendance.ATTENDANCE_STATUS_CHOICES, default='PRESENT')
    in_time = serializers.TimeField(required=False, allow_null=True)
    out_time = serializers.TimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


class StudentPeriodRollCallSerializer(serializers.Serializer):
    date = serializers.DateField()
    period_slot_id = serializers.UUIDField()
    class_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    group_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    taken_by_teacher_id = serializers.IntegerField(required=False, allow_null=True)
    substitute_teacher_id = serializers.IntegerField(required=False, allow_null=True)
    records = StudentPeriodRollCallItemSerializer(many=True)


class DocumentTemplateConfigSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    orientation_display = serializers.CharField(source='get_orientation_display', read_only=True)
    page_size_display = serializers.CharField(source='get_page_size_display', read_only=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True)

    class Meta:
        model = DocumentTemplateConfig
        fields = [
            'id',
            'institution',
            'institution_name',
            'document_type',
            'document_type_display',
            'template_name',
            'is_default',
            'orientation',
            'orientation_display',
            'page_size',
            'page_size_display',
            'layout_config',
            'is_deleted',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'institution', 'institution_name', 'created_at', 'updated_at']

    def validate_template_name(self, value):
        if not value or not str(value).strip():
            raise serializers.ValidationError("Template name cannot be empty.")
        return str(value).strip()


# ==============================================================================
# NOTIFICATION ECOSYSTEM SERIALIZERS
# ==============================================================================

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