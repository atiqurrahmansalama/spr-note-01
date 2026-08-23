
from core.serializers.academy import DynamicPeriodSlotSerializer, TeacherRoutineScheduleSerializer
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
    period_slot_id = serializers.CharField(required=False, allow_null=True)
    session_slot_id = serializers.CharField(required=False, allow_null=True)
    status = serializers.ChoiceField(choices=StudentAttendance.ATTENDANCE_STATUS_CHOICES, default='PRESENT')
    in_time = serializers.TimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default='')


class BulkStudentAttendancePunchSerializer(serializers.Serializer):
    date = serializers.DateField()
    period_slot_id = serializers.CharField(required=False, allow_null=True)
    session_slot_id = serializers.CharField(required=False, allow_null=True)
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

