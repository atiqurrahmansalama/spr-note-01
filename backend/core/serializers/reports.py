
from core.serializers.students import StudentSerializer
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
    ActivityLog, TeacherProfile, GuardianProfile,
    AcademicGoal, DailyLessonPlan, LessonEvaluation, HomeworkAssignment, HomeworkSubmission
)
from core.services import get_scoped_tenant_id

User = get_user_model()

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


class AcademicGoalSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name_en', read_only=True)
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True)

    class Meta:
        model = AcademicGoal
        fields = [
            'id',
            'institution',
            'branch',
            'student',
            'student_name',
            'student_uniq_id',
            'subject_name',
            'target_title',
            'target_type',
            'start_point',
            'target_point',
            'current_progress',
            'progress_percentage',
            'target_daily_pace',
            'start_date',
            'target_end_date',
            'actual_completion_date',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class LessonEvaluationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name_en', read_only=True)
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True)
    student_class_name = serializers.CharField(source='student.student_class.name', read_only=True)

    class Meta:
        model = LessonEvaluation
        fields = [
            'id',
            'lesson_plan',
            'student',
            'student_name',
            'student_uniq_id',
            'student_class_name',
            'evaluation_date',
            'evaluation_status',
            'score',
            'max_score',
            'total_mistakes',
            'total_stucks',
            'fluency_rating',
            'teacher_remarks',
            'is_synced_to_parent',
            'parent_viewed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailyLessonPlanSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='academic_class.name', read_only=True)
    section_name = serializers.CharField(source='section.section_name', read_only=True)
    group_name = serializers.CharField(source='student_group.group_name', read_only=True)
    evaluations = LessonEvaluationSerializer(many=True, read_only=True)
    total_evaluations = serializers.IntegerField(source='evaluations.count', read_only=True)
    period_order = serializers.IntegerField(source='period_slot.period_order', read_only=True)
    start_time = serializers.TimeField(source='period_slot.start_time', read_only=True)
    end_time = serializers.TimeField(source='period_slot.end_time', read_only=True)

    class Meta:
        model = DailyLessonPlan
        fields = [
            'id',
            'institution',
            'branch',
            'academic_class',
            'class_name',
            'section',
            'section_name',
            'student_group',
            'group_name',
            'subject_name',
            'curriculum_book_id',
            'curriculum_book_name',
            'period_slot',
            'period_name',
            'period_order',
            'start_time',
            'end_time',
            'teacher',
            'teacher_name',
            'lesson_date',
            'lesson_title',
            'lesson_topic',
            'start_unit',
            'end_unit',
            'lesson_instructions',
            'assigned_scope',
            'targeted_students',
            'attachment_url',
            'is_active',
            'evaluations',
            'total_evaluations',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HomeworkSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name_en', read_only=True)
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True)
    homework_title = serializers.CharField(source='homework.title', read_only=True)

    class Meta:
        model = HomeworkSubmission
        fields = [
            'id',
            'homework',
            'homework_title',
            'student',
            'student_name',
            'student_uniq_id',
            'submitted_at',
            'submission_content',
            'attachment_url',
            'status',
            'obtained_marks',
            'teacher_feedback',
            'evaluated_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class HomeworkAssignmentSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source='academic_class.name', read_only=True)
    section_name = serializers.CharField(source='section.section_name', read_only=True)
    submissions = HomeworkSubmissionSerializer(many=True, read_only=True)
    submission_count = serializers.IntegerField(source='submissions.count', read_only=True)

    class Meta:
        model = HomeworkAssignment
        fields = [
            'id',
            'institution',
            'branch',
            'lesson_plan',
            'academic_class',
            'class_name',
            'section',
            'section_name',
            'subject_name',
            'teacher',
            'teacher_name',
            'title',
            'description',
            'assigned_date',
            'due_date',
            'due_time',
            'max_marks',
            'submission_type',
            'attachment_url',
            'is_active',
            'submissions',
            'submission_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


