
from core.serializers.institutions import AddressSerializer
from core.serializers.academy import (
    StudentClassSerializer, ClassSectionSerializer, StudentGroupSerializer, SessionSerializer
)
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
    ActivityLog, TeacherProfile, GuardianProfile
)
from core.services import get_scoped_tenant_id

User = get_user_model()

class StudentAcademicHistorySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name_en', read_only=True, default='')
    student_uniq_id = serializers.CharField(source='student.uniq_id', read_only=True, default='')
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')
    transferred_by_name = serializers.CharField(source='transferred_by.name', read_only=True, default='')
    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    def get_start_date(self, obj):
        if not obj.start_date:
            return None
        if hasattr(obj.start_date, 'strftime'):
            return obj.start_date.strftime('%Y-%m-%d')
        return str(obj.start_date)

    def get_end_date(self, obj):
        if not obj.end_date:
            return None
        if hasattr(obj.end_date, 'strftime'):
            return obj.end_date.strftime('%Y-%m-%d')
        return str(obj.end_date)

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


class StudentGuardianSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGuardian
        fields = [
            'id', 'father_name', 'father_phone', 'father_occupation',
            'mother_name', 'mother_phone', 'mother_occupation', 'primary_guardian_name',
            'primary_guardian_phone', 'guardian_relation', 'guardian_nid',
            'emergency_contact_phone'
        ]


class StudentAcademicDetailSerializer(serializers.ModelSerializer):
    class_or_group_id = serializers.PrimaryKeyRelatedField(
        queryset=StudentGroup.objects.all(),
        source='class_or_group',
        required=False,
        allow_null=True
    )
    class_or_group_name = serializers.CharField(source='class_or_group.name', read_only=True)
    admission_date = serializers.SerializerMethodField()

    def get_admission_date(self, obj):
        if not obj.admission_date:
            return None
        if hasattr(obj.admission_date, 'strftime'):
            return obj.admission_date.strftime('%Y-%m-%d')
        return str(obj.admission_date)

    class Meta:
        model = StudentAcademicDetail
        fields = [
            'id', 'session_year', 'class_or_group_id', 'class_or_group_name',
            'roll_number', 'admission_date', 'previous_school_name', 'previous_school_address', 'tc_number'
        ]


class StudentDocumentSerializer(serializers.ModelSerializer):
    doc_type = serializers.CharField(required=False, default='OTHER')
    title = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = StudentDocument
        fields = ['id', 'doc_type', 'file', 'title', 'uploaded_at']


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
            if not present_address_data.get('address_type'):
                present_address_data['address_type'] = 'PRESENT'
            present_address = Address.objects.create(created_by=user, **present_address_data)

        permanent_address = None
        if permanent_address_data:
            if not permanent_address_data.get('address_type'):
                permanent_address_data['address_type'] = 'PERMANENT'
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

        # Auto-create legacy StudentDetail for backward compatibility
        try:
            StudentDetail.objects.get_or_create(
                student=student,
                defaults={
                    'name_bn': validated_data.get('bangla_name', ''),
                    'father_name': guardian_kwargs.get('father_name', ''),
                    'mother_name': guardian_kwargs.get('mother_name', ''),
                    'guardian_name': guardian_kwargs.get('primary_guardian_name', ''),
                    'guardian_phone': guardian_kwargs.get('primary_guardian_phone', ''),
                    'guardian_relation': guardian_kwargs.get('guardian_relation', ''),
                    'created_by': user,
                }
            )
        except Exception:
            pass

        return student


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

