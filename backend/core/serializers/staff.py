
from core.serializers.institutions import AddressSerializer, AcademicBranchSerializer, AcademicDepartmentSerializer
from core.serializers.academy import StudentClassSerializer, ClassSectionSerializer, StudentGroupSerializer
from core.serializers.iam import UserAdminSerializer
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
    ActivityLog, TeacherProfile, GuardianProfile, StaffOnboardingToken
)
from core.services import get_scoped_tenant_id

User = get_user_model()

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
            'rank_order',
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
            from core.services import StaffOnboardingService
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


class StaffOnboardingTokenSerializer(serializers.ModelSerializer):
    institution_name = serializers.CharField(source='institution.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = StaffOnboardingToken
        fields = [
            'id',
            'institution',
            'institution_name',
            'token',
            'title',
            'staff_type',
            'designation',
            'rank_order',
            'department',
            'department_name',
            'max_applications',
            'applied_count',
            'expires_at',
            'is_active',
            'auto_approve',
            'include_payroll',
            'created_by',
            'created_by_name',
            'is_valid',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'institution', 'token', 'applied_count', 'created_by', 'created_at', 'updated_at']


class StaffOnboardingApplicationSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True, default='')

    # Core User Identity
    name = serializers.CharField(max_length=150)
    bangla_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    email = serializers.EmailField(required=False, allow_blank=True, default='')
    phone_number = serializers.CharField(max_length=20)
    user_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    gender = serializers.CharField(max_length=20, required=False, default='MALE')
    dob = serializers.DateField(required=False, allow_null=True)
    nid_no = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    blood_group = serializers.CharField(max_length=10, required=False, allow_blank=True, default='')
    emergency_contact = serializers.CharField(max_length=32, required=False, allow_blank=True, default='')
    photo_url = serializers.CharField(required=False, allow_blank=True, default='')

    # Staff Role & Hierarchy
    staff_type = serializers.ChoiceField(choices=StaffProfile.STAFF_TYPE_CHOICES, default='TEACHING')
    designation = serializers.CharField(max_length=100)
    rank_order = serializers.IntegerField(default=99)
    department = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    employment_status = serializers.ChoiceField(choices=StaffProfile.EMPLOYMENT_STATUS_CHOICES, default='PERMANENT')
    joining_date = serializers.DateField(required=False, default=timezone.localdate)

    # Academic & Duty
    highest_degree = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    specialization = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    max_daily_periods = serializers.IntegerField(default=4, required=False)

    # Address
    address = serializers.CharField(required=False, allow_blank=True, default='')
    division = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    district = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    upazila_thana = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')
    perm_address = serializers.CharField(required=False, allow_blank=True, default='')
    perm_division = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    perm_district = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    perm_upazila = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    perm_postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True, default='')

    # Payroll & Banking
    salary_type = serializers.ChoiceField(choices=StaffProfile.SALARY_TYPE_CHOICES, default='MONTHLY_FIXED')
    base_salary = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=Decimal('0.00'))
    bank_name = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    bank_account_no = serializers.CharField(max_length=64, required=False, allow_blank=True, default='')
    mobile_banking_no = serializers.CharField(max_length=32, required=False, allow_blank=True, default='')

