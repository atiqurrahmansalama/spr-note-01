
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
from django.db.models import Max, Q, Count, Avg, Sum, F
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
    StudentAcademicDetail, StudentGuardian, StudentDocument, RoleInviteToken, AdmissionInviteToken,
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
    department_name = serializers.CharField(source='student_class.department.name', read_only=True, default='')
    department_type = serializers.CharField(source='student_class.department_type', read_only=True, default='')
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
            'department_name', 'department_type',
            'start_date', 'end_date', 'is_current',
            'transition_reason', 'transferred_by', 'transferred_by_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class StudentTransferAcademicSerializer(serializers.Serializer):
    target_department_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    target_class_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    target_section_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    target_group_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    target_room_id = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    transition_date = serializers.DateField(required=False, allow_null=True)
    transition_reason = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate(self, attrs):
        def _clean(val):
            if not val:
                return None
            s = str(val).strip()
            if s.lower() in ('', '0', 'none', 'null', 'undefined', 'all'):
                return None
            return s

        target_department_id = _clean(attrs.get('target_department_id'))
        target_class_id = _clean(attrs.get('target_class_id'))
        target_section_id = _clean(attrs.get('target_section_id'))
        target_group_id = _clean(attrs.get('target_group_id'))
        target_room_id = _clean(attrs.get('target_room_id'))

        attrs['target_department_id'] = target_department_id
        attrs['target_class_id'] = target_class_id
        attrs['target_section_id'] = target_section_id
        attrs['target_group_id'] = target_group_id
        attrs['target_room_id'] = target_room_id

        if not target_class_id and not target_section_id and not target_group_id and not target_department_id and not target_room_id:
            raise serializers.ValidationError("At least one destination (Department, Class, Section, Group, or Dormitory Room) must be specified.")
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

    # Class, Section & Group relationships
    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    section_name = serializers.CharField(source='section.section_name', read_only=True, default='')
    student_section_name = serializers.CharField(source='section.section_name', read_only=True, default='')
    student_section = serializers.PrimaryKeyRelatedField(source='section', read_only=True)
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    sub = serializers.SerializerMethodField()

    # Backward compatibility aliases for legacy API consumers & frontend
    name = serializers.CharField(source='name_en', required=False, allow_blank=True, allow_null=True)
    roll = serializers.IntegerField(source='roll_number', required=False, allow_null=True)
    unique_id = serializers.CharField(source='uniq_id', required=False, allow_blank=True, allow_null=True)
    group = serializers.CharField(source='group_name', required=False, allow_blank=True, allow_null=True)
    is_active = serializers.BooleanField(read_only=True)

    def get_sub(self, obj):
        if obj.section:
            return obj.section.section_name
        if obj.student_class:
            return obj.student_class.name
        return obj.group_name or ""

    class Meta:
        model = Student
        fields = [
            'id', 'institution', 'institution_name', 'uniq_id', 'unique_id',
            'roll_number', 'roll',
            'name_en', 'name', 'bangla_name', 'name_i18n',
            'student_class', 'student_class_name',
            'section', 'section_name', 'student_section', 'student_section_name',
            'student_group', 'student_group_name',
            'group_name', 'group', 'sub',
            'admission_date', 'status', 'is_active', 'is_deleted',
            'education_status', 'target_status',
            'details',
            'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'uniq_id': {'required': False, 'allow_null': True},
            'roll_number': {'required': False, 'allow_null': True},
            'name_en': {'required': False, 'allow_null': True},
            'bangla_name': {'required': False, 'allow_null': True},
            'name_i18n': {'required': False, 'allow_null': True},
            'student_class': {'required': False, 'allow_null': True},
            'section': {'required': False, 'allow_null': True},
            'student_group': {'required': False, 'allow_null': True},
            'group_name': {'required': False, 'allow_null': True},
            'status': {'required': False, 'allow_null': True},
            'education_status': {'required': False, 'allow_null': True},
            'target_status': {'required': False, 'allow_null': True},
            'admission_date': {'required': False, 'allow_null': True},
        }

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Handle multi-language name_i18n sync
        if 'name_i18n' in mutable_data and isinstance(mutable_data['name_i18n'], dict):
            if not mutable_data.get('name_en') and mutable_data['name_i18n'].get('en'):
                mutable_data['name_en'] = mutable_data['name_i18n']['en']
            if not mutable_data.get('bangla_name') and mutable_data['name_i18n'].get('bn'):
                mutable_data['bangla_name'] = mutable_data['name_i18n']['bn']

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

        # Map student_section -> section
        if ('section' not in mutable_data or not mutable_data.get('section')) and mutable_data.get('student_section'):
            mutable_data['section'] = mutable_data['student_section']

        for fk_field in ['section', 'student_class', 'student_group']:
            if isinstance(mutable_data.get(fk_field), dict):
                mutable_data[fk_field] = mutable_data[fk_field].get('id')

        # Discard non-model attributes and protect immutable identifiers
        mutable_data.pop('department', None)
        mutable_data.pop('id', None)
        mutable_data.pop('uniq_id', None)

        nullable_fields = ['student_class', 'section', 'student_group', 'admission_date', 'roll_number']
        for field in nullable_fields:
            if field in mutable_data and (mutable_data[field] == '' or mutable_data[field] == 'null'):
                mutable_data[field] = None

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

        if 'roll_number' not in validated_data or validated_data['roll_number'] is None:
            roll_filter = {}
            if validated_data.get('student_class_id'):
                roll_filter['student_class_id'] = validated_data['student_class_id']
            elif group_val:
                roll_filter['group_name'] = group_val
            max_roll = Student.objects.filter(**roll_filter).aggregate(Max('roll_number'))['roll_number__max'] or 0
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

        validated_data.pop('id', None)
        validated_data.pop('uniq_id', None)

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
            'roll_number', 'admission_date', 'previous_school_name', 'previous_school_address',
            'previous_class', 'previous_roll_number', 'previous_grade', 'previous_average',
            'previous_result', 'previous_passing_year',
            'previous_study_details', 'tc_number'
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
            'admission_mode', 'status', 'target_status', 'group_name', 'roll_number', 'education_status',
            'student_class', 'section', 'student_group', 'branch'
        ]

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Map student_section -> section
        if ('section' not in mutable_data or not mutable_data.get('section')) and mutable_data.get('student_section'):
            mutable_data['section'] = mutable_data['student_section']

        for fk_field in ['section', 'student_class', 'student_group', 'branch']:
            if isinstance(mutable_data.get(fk_field), dict):
                mutable_data[fk_field] = mutable_data[fk_field].get('id')

        # Pop non-model department if present directly on student
        mutable_data.pop('department', None)

        nullable_fields = ['student_class', 'section', 'student_group', 'branch', 'roll_number']
        for field in nullable_fields:
            if field in mutable_data and (mutable_data[field] == '' or mutable_data[field] == 'null'):
                mutable_data[field] = None

        # Sanitize nested academic_data if passed
        if 'academic_data' in mutable_data and isinstance(mutable_data['academic_data'], dict):
            acad = mutable_data['academic_data'].copy()
            for extra in ['department', 'student_class', 'student_section', 'section']:
                acad.pop(extra, None)
            if 'admission_date' in acad and (acad['admission_date'] == '' or acad['admission_date'] == 'null'):
                acad['admission_date'] = None
            mutable_data['academic_data'] = acad

        return super().to_internal_value(mutable_data)

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

        # Check for admission_token
        token_str = (self.initial_data.get('admission_token') or self.initial_data.get('token') or '').strip()
        token_obj = None
        if token_str:
            token_obj = AdmissionInviteToken.objects.filter(token__iexact=token_str).first()
            if token_obj:
                if not validated_data.get('institution_id') and token_obj.institution_id:
                    validated_data['institution_id'] = token_obj.institution_id
                if not validated_data.get('student_class') and token_obj.target_class:
                    validated_data['student_class'] = token_obj.target_class

        # Auto sync section / group / class
        section = validated_data.get('section')
        if section:
            if not validated_data.get('group_name'):
                validated_data['group_name'] = getattr(section, 'section_name', None) or getattr(section, 'name', '') or 'General Group'
            if not validated_data.get('student_class') and getattr(section, 'student_class', None):
                validated_data['student_class'] = section.student_class

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

        # Increment token applied count if token was provided
        if token_obj:
            token_obj.applied_count = F('applied_count') + 1
            token_obj.save(update_fields=['applied_count'])

        # Link GuardianProfile to user if guardian
        if user and not getattr(user, 'is_staff', False):
            try:
                from core.models import GuardianProfile
                if hasattr(user, 'guardian_profile'):
                    user.guardian_profile.students.add(student)
                else:
                    gp, _ = GuardianProfile.objects.get_or_create(
                        user=user,
                        defaults={'name_en': user.name or user.phone_number or 'Guardian'}
                    )
                    gp.students.add(student)
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
    details = StudentDetailSerializer(read_only=True)

    student_class_name = serializers.CharField(source='student_class.name', read_only=True, default='')
    student_group_name = serializers.CharField(source='student_group.name', read_only=True, default='')
    branch_name = serializers.CharField(source='branch.name', read_only=True, default='')
    section_name = serializers.CharField(source='section.section_name', read_only=True, default='')
    student_section_name = serializers.CharField(source='section.section_name', read_only=True, default='')
    student_section = serializers.PrimaryKeyRelatedField(source='section', read_only=True)
    department_name = serializers.CharField(source='student_class.department.name', read_only=True, default='')
    department_id = serializers.CharField(source='student_class.department.id', read_only=True, default='')

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
            'student_id_card_number', 'gender', 'dob', 'blood_group', 'admission_date',
            'birth_certificate_no', 'nid_no', 'photo', 'present_address', 'permanent_address', 
            'latitude', 'longitude', 'map_place_id', 'branch', 'branch_name',
            'academic_detail', 'guardian_detail', 'details', 'documents', 'academic_history', 'admission_mode', 
            'status', 'student_class', 'student_class_name', 'section', 'section_name', 'student_section', 'student_section_name', 'student_group', 'student_group_name',
            'department_id', 'department_name',
            'group_name', 'created_at', 'updated_at', 'education_status',
            'present_address_data', 'permanent_address_data', 'academic_data', 'guardian_data',
            'completed_juz_count', 'active_juz', 'recent_error_average', 'quran_progress', 'department_type'
        ]

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Map student_section -> section
        if ('section' not in mutable_data or not mutable_data.get('section')) and mutable_data.get('student_section'):
            mutable_data['section'] = mutable_data['student_section']

        for fk_field in ['section', 'student_class', 'student_group', 'branch']:
            if isinstance(mutable_data.get(fk_field), dict):
                mutable_data[fk_field] = mutable_data[fk_field].get('id')

        # Discard non-model department if present directly on student
        mutable_data.pop('department', None)

        # Sanitize empty strings for date, choice, or FK fields
        nullable_fields = [
            'dob', 'admission_date', 'student_class', 'section', 'student_group',
            'branch', 'blood_group', 'roll_number', 'present_address', 'permanent_address',
            'latitude', 'longitude'
        ]
        for field in nullable_fields:
            if field in mutable_data and (mutable_data[field] == '' or mutable_data[field] == 'null'):
                mutable_data[field] = None

        # Sanitize nested academic_data
        if 'academic_data' in mutable_data and isinstance(mutable_data['academic_data'], dict):
            acad = mutable_data['academic_data'].copy()
            for extra in ['department', 'student_class', 'student_section']:
                acad.pop(extra, None)
            if 'admission_date' in acad and (acad['admission_date'] == '' or acad['admission_date'] == 'null'):
                acad['admission_date'] = None
            mutable_data['academic_data'] = acad

        # Protect immutable identifiers during update
        mutable_data.pop('id', None)
        mutable_data.pop('uniq_id', None)

        return super().to_internal_value(mutable_data)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        g_detail = ret.get('guardian_detail') or {}
        a_detail = ret.get('academic_detail') or {}
        details_obj = ret.get('details') or {}

        # Ensure admission_date is present from instance or academic_detail
        if not ret.get('admission_date') and a_detail.get('admission_date'):
            ret['admission_date'] = a_detail.get('admission_date')

        # Deep unified details dictionary for frontend consumers
        ret['details'] = {
            'date_of_birth': instance.dob or details_obj.get('date_of_birth'),
            'dob': instance.dob or details_obj.get('date_of_birth'),
            'blood_group': instance.blood_group or details_obj.get('blood_group'),
            'father_name': g_detail.get('father_name') or details_obj.get('father_name'),
            'mother_name': g_detail.get('mother_name') or details_obj.get('mother_name'),
            'guardian_name': g_detail.get('primary_guardian_name') or g_detail.get('father_name') or details_obj.get('guardian_name'),
            'guardian_phone': g_detail.get('primary_guardian_phone') or g_detail.get('father_phone') or details_obj.get('guardian_phone'),
            'emergency_phone': g_detail.get('emergency_contact_phone') or details_obj.get('emergency_phone'),
            'emergency_contact_phone': g_detail.get('emergency_contact_phone') or details_obj.get('emergency_phone'),
            'guardian_relation': g_detail.get('guardian_relation') or details_obj.get('guardian_relation'),
            'father_occupation': g_detail.get('father_occupation'),
            'guardian_profession': g_detail.get('father_occupation'),
            'initial_completed_juz': details_obj.get('initial_completed_juz', 0),
        }
        return ret

    @transaction.atomic
    def update(self, instance, validated_data):
        request = self.context.get('request')
        req_user = getattr(request, 'user', None) if request else None
        user = req_user if req_user and getattr(req_user, 'is_authenticated', False) else None
        creator = user or instance.created_by or User.objects.filter(is_superuser=True).first() or User.objects.first()

        present_address_data = validated_data.pop('present_address_data', None)
        permanent_address_data = validated_data.pop('permanent_address_data', None)
        academic_data = validated_data.pop('academic_data', None)
        guardian_data = validated_data.pop('guardian_data', None)

        # Protect immutable primary ID and unique ID
        validated_data.pop('id', None)
        validated_data.pop('uniq_id', None)

        # If student has no institution yet, associate with current tenant
        if not instance.institution_id and request:
            from core.services import get_scoped_tenant_id
            tenant_id = get_scoped_tenant_id(request)
            if tenant_id:
                instance.institution_id = tenant_id

        # Update core student fields safely without wiping existing class/section if not provided
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
                addr = Address.objects.create(created_by=creator, **present_address_data)
                instance.present_address = addr
                instance.save(update_fields=['present_address'])

        # Deep Update permanent address
        if permanent_address_data is not None:
            if instance.permanent_address:
                for k, v in permanent_address_data.items():
                    setattr(instance.permanent_address, k, v)
                instance.permanent_address.save()
            else:
                addr = Address.objects.create(created_by=creator, **permanent_address_data)
                instance.permanent_address = addr
                instance.save(update_fields=['permanent_address'])

        # Deep Update academic details
        if academic_data is not None:
            academic_detail, _ = StudentAcademicDetail.objects.get_or_create(student=instance, defaults={'created_by': creator})
            for k, v in academic_data.items():
                if hasattr(academic_detail, k):
                    setattr(academic_detail, k, v)
            academic_detail.save()

        # Deep Update guardian details
        if guardian_data is not None:
            guardian_detail, _ = StudentGuardian.objects.get_or_create(student=instance)
            for k, v in guardian_data.items():
                if hasattr(guardian_detail, k):
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


class AdmissionInviteTokenSerializer(serializers.ModelSerializer):
    target_class_name = serializers.CharField(source='target_class.name', read_only=True, default='')
    target_group_name = serializers.CharField(source='target_group.name', read_only=True, default='')
    institution_name = serializers.CharField(source='institution.name', read_only=True, default='')
    institution_slug = serializers.CharField(source='institution.slug', read_only=True, default='')
    created_by_name = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    qr_url = serializers.SerializerMethodField()

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if mutable_data.get('target_class') == '':
            mutable_data['target_class'] = None
        if mutable_data.get('target_group') == '':
            mutable_data['target_group'] = None
        if mutable_data.get('expires_at') == '':
            mutable_data['expires_at'] = None
        return super().to_internal_value(mutable_data)

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.name or obj.created_by.phone_number or obj.created_by.email or "Admin"
        return "Admin"

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_qr_url(self, obj):
        return f"/apply?token={obj.token}"

    class Meta:
        model = AdmissionInviteToken
        fields = [
            'id', 'token', 'title', 'session_year',
            'target_class', 'target_class_name',
            'target_group', 'target_group_name',
            'max_applications', 'applied_count',
            'expires_at', 'is_active', 'auto_enroll',
            'institution', 'institution_name', 'institution_slug',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
            'is_valid', 'qr_url'
        ]
        read_only_fields = ['id', 'token', 'applied_count', 'institution', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'target_class': {'required': False, 'allow_null': True},
            'target_group': {'required': False, 'allow_null': True},
            'expires_at': {'required': False, 'allow_null': True},
        }


class PublicAdmissionVerifySerializer(serializers.ModelSerializer):
    institution_id = serializers.SerializerMethodField()
    institution_name = serializers.SerializerMethodField()
    institution_bangla_name = serializers.SerializerMethodField()
    institution_logo = serializers.SerializerMethodField()
    institution_phone = serializers.SerializerMethodField()
    institution_email = serializers.SerializerMethodField()
    institution_address = serializers.SerializerMethodField()
    target_class_id = serializers.SerializerMethodField()
    target_class_name = serializers.SerializerMethodField()
    available_classes = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_institution_id(self, obj):
        return str(obj.institution_id) if obj.institution_id else None

    def get_institution_name(self, obj):
        return obj.institution.name if obj.institution else "Academic Institution"

    def get_institution_bangla_name(self, obj):
        return getattr(obj.institution, 'bangla_name', '') if obj.institution else ''

    def get_institution_logo(self, obj):
        return getattr(obj.institution, 'logo_url', '') if obj.institution else ''

    def get_institution_phone(self, obj):
        return getattr(obj.institution, 'phone', '') if obj.institution else ''

    def get_institution_email(self, obj):
        return getattr(obj.institution, 'email', '') if obj.institution else ''

    def get_institution_address(self, obj):
        return getattr(obj.institution, 'address', '') if obj.institution else ''

    def get_target_class_id(self, obj):
        return str(obj.target_class_id) if obj.target_class_id else None

    def get_target_class_name(self, obj):
        return obj.target_class.name if obj.target_class else ''

    def get_available_classes(self, obj):
        from core.models import StudentClass
        if not obj.institution:
            classes = StudentClass.objects.all().order_by('order_rank', 'name')
        else:
            classes = StudentClass.objects.filter(institution=obj.institution).order_by('order_rank', 'name')
        return [{'id': str(c.id), 'name': c.name, 'code': getattr(c, 'code', '')} for c in classes]

    class Meta:
        model = AdmissionInviteToken
        fields = [
            'token', 'title', 'session_year', 'is_valid', 'expires_at', 'auto_enroll',
            'institution_id', 'institution_name', 'institution_bangla_name',
            'institution_logo', 'institution_phone', 'institution_email', 'institution_address',
            'target_class_id', 'target_class_name', 'available_classes'
        ]


