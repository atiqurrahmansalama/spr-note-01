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

class ClassSectionSerializer(serializers.ModelSerializer):
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_class_code = serializers.CharField(source='student_class.code', read_only=True, default='')
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True, default='')
    branch_code = serializers.CharField(source='branch.branch_code', read_only=True, default='')
    class_teacher_name = serializers.CharField(source='class_teacher.user.name', read_only=True, default='')
    class_teacher_phone = serializers.CharField(source='class_teacher.user.phone_number', read_only=True, default='')
    class_teacher_avatar = serializers.CharField(source='class_teacher.user.avatar_url', read_only=True, default='')
    enrolled_students = serializers.SerializerMethodField()
    capacity_percentage = serializers.SerializerMethodField()

    class Meta:
        model = ClassSection
        fields = [
            'id', 'student_class', 'student_class_name', 'student_class_code',
            'branch', 'branch_name', 'branch_code',
            'section_name', 'section_type', 'room_number', 'max_capacity',
            'class_teacher', 'class_teacher_name', 'class_teacher_phone', 'class_teacher_avatar',
            'is_active', 'is_deleted',
            'enrolled_students', 'capacity_percentage',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'student_class_name', 'student_class_code',
            'branch_name', 'branch_code',
            'class_teacher_name', 'class_teacher_phone', 'class_teacher_avatar',
            'enrolled_students', 'capacity_percentage'
        ]

    @extend_schema_field(OpenApiTypes.INT)
    def get_enrolled_students(self, obj):
        from core.models import Student
        return Student.objects.filter(section=obj, is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_capacity_percentage(self, obj):
        if not obj.max_capacity or obj.max_capacity <= 0:
            return 0.0
        enrolled = self.get_enrolled_students(obj)
        return round(min(100.0, (enrolled / obj.max_capacity) * 100), 1)


class ClassPeriodSlotSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=AcademicInstitution.objects.all(), required=False, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    branch_name = serializers.CharField(source='branch.branch_name', read_only=True, default='')
    department_name = serializers.SerializerMethodField()
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    teacher = serializers.PrimaryKeyRelatedField(queryset=StaffProfile.objects.all(), required=False, allow_null=True)
    teacher_name = serializers.SerializerMethodField()
    teacher_designation = serializers.CharField(source='teacher.designation', read_only=True, default='')

    class Meta:
        model = ClassPeriodSlot
        fields = [
            'id', 'institution', 'institution_name',
            'branch', 'branch_name',
            'department', 'department_name',
            'student_class', 'student_class_name',
            'teacher', 'teacher_name', 'teacher_designation',
            'period_name', 'slot_type', 'period_order',
            'start_time', 'end_time', 'duration_minutes',
            'effective_from', 'effective_to', 'deleted_at', 'history_log',
            'is_active', 'is_deleted',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'deleted_at',
            'institution_name', 'branch_name', 'department_name', 'student_class_name',
            'teacher_name', 'teacher_designation'
        ]

    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        if obj.student_class and obj.student_class.department:
            return obj.student_class.department.name
        return ''

    def get_teacher_name(self, obj):
        if obj.teacher:
            if obj.teacher.user:
                return obj.teacher.user.name or obj.teacher.user.name_en or f"{obj.teacher.user.first_name} {obj.teacher.user.last_name}".strip()
            return obj.teacher.employee_id or f"Teacher #{obj.teacher.id}"
        return ""

    def validate(self, attrs):
        if attrs.get('student_class') and not attrs.get('department'):
            if getattr(attrs['student_class'], 'department', None):
                attrs['department'] = attrs['student_class'].department
        start_time = attrs.get('start_time') or (self.instance.start_time if self.instance else None)
        end_time = attrs.get('end_time') or (self.instance.end_time if self.instance else None)
        if start_time and end_time:
            import datetime
            t1 = datetime.datetime.combine(datetime.date.today(), start_time)
            t2 = datetime.datetime.combine(datetime.date.today(), end_time)
            if t2 < t1:
                t2 += datetime.timedelta(days=1)
            diff = (t2 - t1).total_seconds() / 60
            attrs['duration_minutes'] = max(1, int(diff))
        return attrs


class StudentClassSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=AcademicInstitution.objects.all(), required=False, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    department = serializers.PrimaryKeyRelatedField(queryset=AcademicDepartment.objects.all(), required=True, allow_null=False)
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

    def validate(self, attrs):
        dept = attrs.get('department') or getattr(self.instance, 'department', None)
        if not dept:
            raise serializers.ValidationError({"department": "An Academic Department is strictly required for every class."})
        inst = attrs.get('institution') or getattr(self.instance, 'institution', None)
        if inst and dept.institution_id and inst.id != dept.institution_id:
            raise serializers.ValidationError({
                "department": f"Selected department '{dept.name}' does not belong to institution '{inst.name}'."
            })
        return attrs

    def create(self, validated_data):
        dept = validated_data.get('department')
        if dept and dept.institution and not validated_data.get('institution'):
            validated_data['institution'] = dept.institution
        return super().create(validated_data)

    @extend_schema_field(OpenApiTypes.INT)
    def get_student_count(self, obj):
        return obj.students.filter(is_deleted=False).count()

    @extend_schema_field(OpenApiTypes.INT)
    def get_group_count(self, obj):
        return obj.groups.filter(is_deleted=False).count()


class StudentGroupSerializer(serializers.ModelSerializer):
    institution = serializers.PrimaryKeyRelatedField(queryset=AcademicInstitution.objects.all(), required=False, allow_null=True)
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    student_class = serializers.PrimaryKeyRelatedField(queryset=StudentClass.objects.all(), required=True, allow_null=False)
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

    def validate(self, attrs):
        s_class = attrs.get('student_class') or getattr(self.instance, 'student_class', None)
        if not s_class:
            raise serializers.ValidationError({"student_class": "A Parent Academic Class is strictly required for every group."})
        inst = attrs.get('institution') or getattr(self.instance, 'institution', None)
        if inst and s_class.institution_id and inst.id != s_class.institution_id:
            raise serializers.ValidationError({
                "student_class": f"Selected class '{s_class.name}' does not belong to institution '{inst.name}'."
            })
        return attrs

    def create(self, validated_data):
        s_class = validated_data.get('student_class')
        if s_class and s_class.institution and not validated_data.get('institution'):
            validated_data['institution'] = s_class.institution
        return super().create(validated_data)

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


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'


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

