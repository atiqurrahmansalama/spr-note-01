
from core.serializers.academy import (
    ClassSectionSerializer, ClassPeriodSlotSerializer,
    StudentClassSerializer, StudentGroupSerializer, SessionSerializer
)
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
    TenantTaxonomySetting,
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

class AcademicInstitutionSerializer(serializers.ModelSerializer):
    total_students_count = serializers.SerializerMethodField()
    total_classes_count = serializers.SerializerMethodField()
    total_staff_count = serializers.SerializerMethodField()
    logo_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    slug = serializers.CharField(required=False, allow_blank=True)

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

    def validate(self, attrs):
        logo_url = attrs.get('logo_url')
        if logo_url:
            val_str = str(logo_url).strip()
            if val_str.startswith('data:'):
                attrs['logo_data'] = val_str
                attrs['logo_url'] = None
            elif not (val_str.startswith('http://') or val_str.startswith('https://')):
                attrs['logo_data'] = val_str
                attrs['logo_url'] = None

        if 'postal_code' in attrs and not attrs.get('post_code'):
            attrs['post_code'] = attrs['postal_code']
        elif 'post_code' in attrs and not attrs.get('postal_code'):
            attrs['postal_code'] = attrs['post_code']

        if 'slug' in attrs and attrs.get('slug'):
            slug_val = attrs['slug']
            # Check unique against other institutions
            inst_id = getattr(self.instance, 'id', None)
            qs = AcademicInstitution.objects.filter(slug=slug_val)
            if inst_id:
                qs = qs.exclude(id=inst_id)
            if qs.exists():
                raise serializers.ValidationError({"slug": "This web slug identifier is already in use by another institution."})

        return attrs

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


class InstitutionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = InstitutionCategory
        fields = ['id', 'name', 'code', 'description', 'order', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_code(self, value):
        if value:
            return value.upper().strip()
        return value


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


class AcademicBranchSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=AcademicInstitution.objects.all(), required=False, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    in_charge_name = serializers.CharField(source='in_charge_staff.user.name', read_only=True, default='')
    in_charge_phone = serializers.CharField(source='in_charge_staff.user.phone_number', read_only=True, default='')
    in_charge_email = serializers.CharField(source='in_charge_staff.user.email', read_only=True, default='')
    in_charge_avatar = serializers.CharField(source='in_charge_staff.user.avatar_url', read_only=True, default='')
    in_charge_designation = serializers.CharField(source='in_charge_staff.designation', read_only=True, default='')
    total_students = serializers.SerializerMethodField()
    total_classes = serializers.SerializerMethodField()
    total_sections = serializers.SerializerMethodField()
    total_staff = serializers.SerializerMethodField()

    class Meta:
        model = AcademicBranch
        fields = [
            'id', 'institution', 'institution_name',
            'branch_name', 'branch_code', 'branch_type',
            'in_charge_staff', 'in_charge_name', 'in_charge_phone', 'in_charge_email', 'in_charge_avatar', 'in_charge_designation',
            'contact_phone', 'contact_email', 'address', 'district', 'division',
            'is_active', 'is_deleted',
            'total_students', 'total_classes', 'total_sections', 'total_staff',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'institution_name',
            'in_charge_name', 'in_charge_phone', 'in_charge_email', 'in_charge_avatar', 'in_charge_designation',
            'total_students', 'total_classes', 'total_sections', 'total_staff'
        ]

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_students(self, obj):
        from core.models import Student
        return Student.objects.filter(branch=obj, is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_classes(self, obj):
        from core.models import StudentClass
        return StudentClass.objects.filter(sections__branch=obj, sections__is_deleted=False, is_deleted=False).distinct().count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_sections(self, obj):
        return obj.sections.filter(is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_total_staff(self, obj):
        from core.models import StaffProfile
        return StaffProfile.objects.filter(
            Q(institution=obj.institution) & (
                Q(managed_branches=obj) |
                Q(managed_sections__branch=obj)
            )
        ).distinct().count()


class AcademicDepartmentSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=AcademicInstitution.objects.all(), required=False, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    branch = serializers.PrimaryKeyRelatedField(queryset=AcademicBranch.objects.all(), required=False, allow_null=True)
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True, default='')
    department_head_name = serializers.CharField(source='department_head.name', read_only=True, default='')
    department_head_phone = serializers.CharField(source='department_head.phone_number', read_only=True, default='')
    classes_count = serializers.SerializerMethodField()
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = AcademicDepartment
        fields = [
            'id', 'institution', 'institution_name', 'branch', 'branch_name', 'name', 'code', 'department_head',
            'department_head_name', 'department_head_phone',
            'has_quran_tracker', 'order_rank', 'is_active', 'is_deleted',
            'classes_count', 'students_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'classes_count', 'students_count', 'institution_name', 'branch_name']

    def validate(self, attrs):
        inst = attrs.get('institution') or getattr(self.instance, 'institution', None)
        branch = attrs.get('branch')
        if branch and inst and branch.institution_id != inst.id:
            raise serializers.ValidationError({
                "branch": f"The selected branch '{branch.branch_name}' does not belong to the institution '{inst.name}'."
            })
        return attrs

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


class AddressSerializer(serializers.ModelSerializer):
    address_type = serializers.CharField(required=False, default='PRESENT', allow_blank=True)
    postal_code = serializers.CharField(source='post_code', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Address
        fields = [
            'id', 'address_type', 'street_address', 'post_office', 
            'post_code', 'postal_code', 'thana_or_upazila', 'district', 'division', 'country',
            'latitude', 'longitude', 'map_place_id'
        ]


class TenantTaxonomySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenantTaxonomySetting
        fields = ['id', 'institution', 'taxonomy_key', 'data', 'version', 'updated_at', 'created_at']
        read_only_fields = ['id', 'version', 'updated_at', 'created_at']


