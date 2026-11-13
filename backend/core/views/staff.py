import os
import io
import re
import csv
import json
import uuid
import base64
import pyotp
import qrcode
import calendar
import logging
from datetime import datetime, date, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from django.db import transaction, models
from django.db.models import Max, Q, Count, Avg, Sum, F, Prefetch
from django.contrib.auth import get_user_model, authenticate
from django.http import HttpResponse, JsonResponse
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.core.cache import cache
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from rest_framework import status, viewsets, permissions, generics, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.authentication import SessionAuthentication

from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken, UntypedToken
from rest_framework_simplejwt.authentication import JWTAuthentication

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample, extend_schema_view
from drf_spectacular.types import OpenApiTypes

from core.models import *
from core.serializers import *
from core.permissions import (
    IsAdminUserRole,
    IsOwnerOrSuperAdmin,
    IsAdminOrSelf,
    HasSectionAccess,
    IsSuperAdmin,
    IsInstitutionAdmin,
    IsTeacher,
    IsStaffSelfOrAdmin,
)
from core.services import get_scoped_tenant_id, resolve_request_institution
from core.notifications import (
    dispatch_notification,
    ping_gateway,
    fetch_gateway_balance,
    seed_default_templates,
)
from core.middleware import detect_device_type, detect_device_info, get_client_ip
from core.authentication import FlexibleJWTAuthentication
from core.cache_utils import get_or_set_cached_data, invalidate_tenant_cache

logger = logging.getLogger(__name__)
User = get_user_model()

class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.filter(is_deleted=False).select_related(
        'user', 'institution', 'department', 'teacher_detail', 'general_detail'
    ).prefetch_related('assignments', 'duties').order_by('-created_at')
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin, HasSectionAccess]
    required_section_key = 'staff_management'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        base_qs = StaffProfile.objects.filter(is_deleted=True) if show_trash else StaffProfile.objects.filter(is_deleted=False)
        base_qs = base_qs.select_related(
            'user', 'institution', 'department', 'teacher_detail', 'general_detail'
        ).prefetch_related('assignments', 'duties')

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            target_inst_id = user.institution_id
            if not target_inst_id and hasattr(user, 'staff_profile') and user.staff_profile:
                target_inst_id = user.staff_profile.institution_id
            if not target_inst_id:
                sp = StaffProfile.objects.filter(user=user).first()
                if sp and sp.institution_id:
                    target_inst_id = sp.institution_id
            if target_inst_id:
                base_qs = base_qs.filter(institution_id=target_inst_id)
            elif getattr(user, 'user_type', '').upper() in ['ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL']:
                from core.models import AcademicInstitution
                primary = AcademicInstitution.objects.filter(is_deleted=False).first()
                if primary:
                    base_qs = base_qs.filter(institution_id=primary.id)
            else:
                base_qs = base_qs.filter(user=user)

        # Filters
        staff_type = self.request.query_params.get('staff_type') or self.request.query_params.get('type')
        if staff_type and staff_type != 'ALL':
            base_qs = base_qs.filter(staff_type=staff_type.upper())

        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id != 'ALL':
            base_qs = base_qs.filter(department_id=dept_id)

        status_param = self.request.query_params.get('employment_status') or self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            base_qs = base_qs.filter(employment_status=status_param.upper())

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param in ['true', 'True', '1']:
            base_qs = base_qs.filter(is_active=True)
        elif is_active_param in ['false', 'False', '0']:
            base_qs = base_qs.filter(is_active=False)

        search = self.request.query_params.get('search')
        if search:
            s = search.strip()
            base_qs = base_qs.filter(
                Q(employee_id__icontains=s) |
                Q(designation__icontains=s) |
                Q(user__name__icontains=s) |
                Q(user__phone_number__icontains=s) |
                Q(user__email__icontains=s) |
                Q(nid_no__icontains=s)
            )

        ordering = self.request.query_params.get('ordering')
        if ordering:
            return base_qs.order_by(ordering)
        return base_qs.order_by('rank_order', 'employee_id')

    def perform_create(self, serializer):
        inst = resolve_request_institution(self.request, self.request.user)
        serializer.save(institution=inst)

    def destroy(self, request, *args, **kwargs):
        from core.services import delete_staff_profile_with_cascading
        instance = self.get_object()
        result = delete_staff_profile_with_cascading(instance, performed_by=request.user)
        return Response({
            "status": "success",
            "message": f"Staff member '{instance.employee_id}' has been soft-deleted and all active duties deactivated.",
            "details": result
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='invite', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def invite(self, request):
        from core.services import StaffOnboardingService
        serializer = StaffInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        institution = resolve_request_institution(request, request.user)

        if not institution:
            return Response({"error": "An academic institution context is required to invite staff."}, status=status.HTTP_400_BAD_REQUEST)

        result = StaffOnboardingService.invite_staff(institution, request.user, serializer.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        queryset = self.get_queryset()
        total_staff = queryset.count()
        teaching_staff = queryset.filter(staff_type='TEACHING').count()
        general_staff = queryset.exclude(staff_type='TEACHING').count()
        active_staff = queryset.filter(is_active=True).count()
        permanent_staff = queryset.filter(employment_status='PERMANENT').count()

        from core.models import StaffAttendance
        today = timezone.now().date()
        on_leave_today = StaffAttendance.objects.filter(
            staff__in=queryset,
            date=today,
            status='ON_LEAVE'
        ).count()

        return Response({
            "total_staff": total_staff,
            "teaching_staff": teaching_staff,
            "general_staff": general_staff,
            "active_staff": active_staff,
            "permanent_staff": permanent_staff,
            "on_leave_today": on_leave_today
        }, status=status.HTTP_200_OK)


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TeacherAssignment.objects.filter(is_active=True).select_related(
        'teacher__user', 'teacher__institution', 'assigned_class', 'assigned_group', 'session'
    ).order_by('-created_at')
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = TeacherAssignment.objects.select_related(
            'teacher__user', 'teacher__institution', 'assigned_class', 'assigned_group', 'session'
        )

        tenant_id = get_scoped_tenant_id(self.request)
        target_inst_id = tenant_id or user.institution_id or getattr(getattr(user, 'staff_profile', None), 'institution_id', None)
        if target_inst_id:
            base_qs = base_qs.filter(teacher__institution_id=target_inst_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            base_qs = base_qs.filter(teacher__user=user)

        teacher_id = self.request.query_params.get('teacher')
        if teacher_id:
            base_qs = base_qs.filter(teacher_id=teacher_id)

        class_id = self.request.query_params.get('assigned_class') or self.request.query_params.get('class')
        if class_id:
            base_qs = base_qs.filter(assigned_class_id=class_id)

        group_id = self.request.query_params.get('assigned_group') or self.request.query_params.get('group')
        if group_id:
            base_qs = base_qs.filter(assigned_group_id=group_id)

        session_id = self.request.query_params.get('session')
        if session_id:
            base_qs = base_qs.filter(session_id=session_id)

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param in ['false', '0']:
            base_qs = base_qs.filter(is_active=False)
        else:
            base_qs = base_qs.filter(is_active=True)

        return base_qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='assign-class', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def assign_class(self, request):
        serializer = TeacherAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            assignment = serializer.save()
            return Response(TeacherAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my-classes')
    def my_classes(self, request):
        user = request.user
        assignments = TeacherAssignment.objects.filter(
            teacher__user=user,
            is_active=True
        ).select_related('assigned_class', 'assigned_group', 'session')
        serializer = TeacherAssignmentSerializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GeneralStaffDutyViewSet(viewsets.ModelViewSet):
    queryset = GeneralStaffDuty.objects.filter(is_active=True).select_related(
        'staff__user', 'staff__institution'
    ).order_by('-effective_from', '-created_at')
    serializer_class = GeneralStaffDutySerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = GeneralStaffDuty.objects.select_related('staff__user', 'staff__institution')

        tenant_id = get_scoped_tenant_id(self.request)
        target_inst_id = tenant_id or user.institution_id or getattr(getattr(user, 'staff_profile', None), 'institution_id', None)
        if target_inst_id:
            base_qs = base_qs.filter(staff__institution_id=target_inst_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            base_qs = base_qs.filter(staff__user=user)

        staff_id = self.request.query_params.get('staff')
        if staff_id:
            base_qs = base_qs.filter(staff_id=staff_id)

        priority = self.request.query_params.get('priority')
        if priority and priority != 'ALL':
            base_qs = base_qs.filter(priority=priority.upper())

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param in ['false', '0']:
            base_qs = base_qs.filter(is_active=False)
        else:
            base_qs = base_qs.filter(is_active=True)

        return base_qs.order_by('-effective_from', '-created_at')

    @action(detail=False, methods=['post'], url_path='assign-duty', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def assign_duty(self, request):
        serializer = GeneralStaffDutySerializer(data=request.data)
        if serializer.is_valid():
            duty = serializer.save()
            return Response(GeneralStaffDutySerializer(duty).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StaffAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StaffAttendance.objects.all().select_related(
        'staff__user', 'staff__institution', 'staff__department'
    ).order_by('-date', 'staff__employee_id')
    serializer_class = StaffAttendanceSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin, HasSectionAccess]
    required_section_key = 'staff_attendance'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = StaffAttendance.objects.select_related(
            'staff__user', 'staff__institution', 'staff__department'
        )

        tenant_id = get_scoped_tenant_id(self.request)
        target_inst_id = tenant_id or user.institution_id or getattr(getattr(user, 'staff_profile', None), 'institution_id', None)
        if target_inst_id:
            base_qs = base_qs.filter(staff__institution_id=target_inst_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            base_qs = base_qs.filter(staff__user=user)

        date_val = self.request.query_params.get('date')
        if date_val:
            base_qs = base_qs.filter(date=date_val)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            base_qs = base_qs.filter(date__range=[start_date, end_date])
        elif start_date:
            base_qs = base_qs.filter(date__gte=start_date)
        elif end_date:
            base_qs = base_qs.filter(date__lte=end_date)

        staff_id = self.request.query_params.get('staff')
        if staff_id:
            base_qs = base_qs.filter(staff_id=staff_id)

        status_val = self.request.query_params.get('status')
        if status_val and status_val != 'ALL':
            base_qs = base_qs.filter(status=status_val.upper())

        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id != 'ALL':
            base_qs = base_qs.filter(staff__department_id=dept_id)

        return base_qs.order_by('-date', 'staff__employee_id')

    @action(detail=False, methods=['post'], url_path='bulk-punch', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def bulk_punch(self, request):
        from core.services import StaffAttendanceService
        serializer = StaffBulkPunchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        institution = resolve_request_institution(request, request.user)

        date_val = serializer.validated_data.get('date', timezone.now().date())
        records = serializer.validated_data.get('records', [])

        result = StaffAttendanceService.bulk_punch_attendance(
            institution=institution,
            date_val=date_val,
            records=records,
            recorded_by=request.user,
            source='WEB_PORTAL'
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='monthly-summary')
    def monthly_summary(self, request):
        from core.services import StaffAttendanceService
        now = timezone.now()
        year = int(request.query_params.get('year', now.year))
        month = int(request.query_params.get('month', now.month))
        staff_id = request.query_params.get('staff')
        department_id = request.query_params.get('department')

        institution = resolve_request_institution(request, request.user)

        summary = StaffAttendanceService.get_monthly_analytics_summary(
            institution=institution,
            year=year,
            month=month,
            staff_id=staff_id,
            department_id=department_id
        )
        return Response(summary, status=status.HTTP_200_OK)


class StaffLeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = StaffLeaveRequest.objects.all().select_related(
        'staff__user', 'staff__institution', 'approved_by'
    ).order_by('-created_at')
    serializer_class = StaffLeaveRequestSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin, HasSectionAccess]
    required_section_key = 'staff_leaves'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = StaffLeaveRequest.objects.select_related('staff__user', 'staff__institution', 'approved_by')

        tenant_id = get_scoped_tenant_id(self.request)
        target_inst_id = tenant_id or user.institution_id or getattr(getattr(user, 'staff_profile', None), 'institution_id', None)
        if target_inst_id:
            base_qs = base_qs.filter(staff__institution_id=target_inst_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            base_qs = base_qs.filter(staff__user=user)

        staff_id = self.request.query_params.get('staff')
        if staff_id:
            base_qs = base_qs.filter(staff_id=staff_id)

        status_val = self.request.query_params.get('status')
        if status_val and status_val != 'ALL':
            base_qs = base_qs.filter(status=status_val.upper())

        leave_type = self.request.query_params.get('leave_type')
        if leave_type and leave_type != 'ALL':
            base_qs = base_qs.filter(leave_type=leave_type.upper())

        return base_qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        from core.services import StaffLeaveService
        serializer = StaffLeaveRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        staff = serializer.validated_data.get('staff')
        # Check permissions: regular staff can only apply for themselves
        is_admin = request.user.is_superuser or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN']
        if not is_admin:
            if not staff or staff.user != request.user:
                # If staff not specified, default to user's profile
                staff = getattr(request.user, 'staff_profile', None)
                if not staff:
                    return Response({"error": "No staff profile linked to your user account."}, status=status.HTTP_400_BAD_REQUEST)

        leave_req = StaffLeaveService.apply_leave(staff, serializer.validated_data)
        return Response(StaffLeaveRequestSerializer(leave_req).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='action', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def action(self, request, pk=None):
        from core.services import StaffLeaveService
        leave_request = self.get_object()
        serializer = StaffLeaveActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        status_val = serializer.validated_data.get('status')
        remarks = serializer.validated_data.get('admin_remarks', '')

        updated_leave = StaffLeaveService.action_leave(
            leave_request=leave_request,
            action_status=status_val,
            admin_user=request.user,
            admin_remarks=remarks
        )
        return Response(StaffLeaveRequestSerializer(updated_leave).data, status=status.HTTP_200_OK)


class StaffOnboardingTokenViewSet(viewsets.ModelViewSet):
    queryset = StaffOnboardingToken.objects.all().select_related('institution', 'department', 'created_by')
    serializer_class = StaffOnboardingTokenSerializer
    permission_classes = [IsAuthenticated, IsInstitutionAdmin]

    def get_queryset(self):
        user = self.request.user
        tenant_id = get_scoped_tenant_id(self.request)
        base_qs = super().get_queryset()
        if tenant_id and AcademicInstitution.objects.filter(id=tenant_id).exists():
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif getattr(user, 'institution_id', None):
            base_qs = base_qs.filter(institution_id=user.institution_id)
        return base_qs.order_by('-created_at')

    def perform_create(self, serializer):
        inst = resolve_request_institution(self.request, self.request.user)
        if not inst:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"institution": "No active institution could be resolved. Please configure an institution first."})

        import secrets
        generated_token = f"stf_{secrets.token_urlsafe(12)}"
        while StaffOnboardingToken.objects.filter(token=generated_token).exists():
            generated_token = f"stf_{secrets.token_urlsafe(12)}"

        serializer.save(
            institution=inst,
            token=generated_token,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        token_obj = self.get_object()
        token_obj.is_active = not token_obj.is_active
        token_obj.save(update_fields=['is_active', 'updated_at'])
        return Response({
            "status": "success",
            "is_active": token_obj.is_active,
            "message": f"Token '{token_obj.title}' is now {'active' if token_obj.is_active else 'inactive'}."
        }, status=status.HTTP_200_OK)


def resolve_candidate_onboarding_status(user, token_obj, institution_address=""):
    inst = token_obj.institution

    # Step 1: Check active StaffProfile in this institution (Level 3: Approved)
    active_profile = StaffProfile.objects.filter(
        user=user,
        institution=inst,
        is_deleted=False
    ).select_related('department', 'user').first()

    if active_profile:
        profile_user = active_profile.user or user
        candidate_name = (
            getattr(profile_user, 'name', None)
            or (f"{getattr(profile_user, 'first_name', '')} {getattr(profile_user, 'last_name', '')}".strip() if profile_user else "")
            or "Staff Member"
        )
        candidate_bn_name = (
            getattr(profile_user, 'name_bn', '')
            or getattr(user, 'name_bn', '')
            or ''
        )
        return {
            "status": "APPROVED",
            "lifecycle_level": 3,
            "tracking_code": active_profile.employee_id,
            "staff": {
                "id": str(active_profile.id),
                "employee_id": active_profile.employee_id,
                "tracking_code": active_profile.employee_id,
                "name": candidate_name,
                "bangla_name": candidate_bn_name,
                "designation": active_profile.designation,
                "rank_order": active_profile.rank_order,
                "department_name": active_profile.department.name if active_profile.department else None,
                "staff_type": active_profile.staff_type,
                "joining_date": str(active_profile.joining_date),
                "institution_name": inst.name,
                "institution_address": institution_address,
                "is_pending_review": False,
            }
        }

    # Step 2: Existing Approval Request for this institution (Level 2 or 4)
    from core.models.approvals import ApprovalRequest

    filters = Q(submitted_by=user)
    if getattr(user, 'phone_number', None):
        filters |= Q(phone_number=user.phone_number)
    if getattr(user, 'email', None):
        filters |= Q(email__iexact=user.email)

    existing_request = ApprovalRequest.objects.filter(
        institution=inst,
        domain="STAFF_ONBOARDING",
    ).filter(filters).order_by('-created_at').first()

    if existing_request:
        payload = existing_request.payload or {}
        candidate_name = (
            existing_request.applicant_name
            or payload.get("name")
            or payload.get("name_en")
            or getattr(user, 'name', None)
            or (f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() if user else "")
            or "Applicant"
        )
        candidate_bn_name = (
            payload.get("bangla_name", "")
            or getattr(user, 'name_bn', '')
            or ""
        )
        dept_name = payload.get("department_name")
        if not dept_name and payload.get("department"):
            d_obj = AcademicDepartment.objects.filter(id=payload.get("department"), institution=inst).first()
            if d_obj:
                dept_name = d_obj.name
        if not dept_name and token_obj.department:
            dept_name = token_obj.department.name

        if existing_request.status in ("PENDING", "IN_REVIEW", "SCHEDULED"):
            return {
                "status": existing_request.status,
                "lifecycle_level": 2,
                "tracking_code": existing_request.tracking_code,
                "submitted_at": existing_request.created_at.isoformat(),
                "staff": {
                    "id": str(existing_request.id),
                    "employee_id": existing_request.tracking_code,
                    "tracking_code": existing_request.tracking_code,
                    "name": candidate_name,
                    "bangla_name": candidate_bn_name,
                    "designation": payload.get("designation") or token_obj.designation or "Faculty Member",
                    "rank_order": payload.get("rank_order") or token_obj.rank_order or 99,
                    "department_name": dept_name,
                    "staff_type": payload.get("staff_type") or token_obj.staff_type or "TEACHING",
                    "joining_date": str(payload.get("joining_date") or timezone.localdate()),
                    "institution_name": inst.name,
                    "institution_address": institution_address,
                    "is_pending_review": True,
                }
            }
        elif existing_request.status == "REJECTED":
            return {
                "status": "REJECTED",
                "lifecycle_level": 4,
                "tracking_code": existing_request.tracking_code,
                "rejection_reason": existing_request.rejection_reason or "",
                "submitted_at": existing_request.created_at.isoformat(),
            }
        elif existing_request.status == "APPROVED":
            return {
                "status": "APPROVED",
                "lifecycle_level": 3,
                "tracking_code": existing_request.tracking_code,
                "staff": {
                    "id": str(existing_request.id),
                    "employee_id": existing_request.tracking_code,
                    "tracking_code": existing_request.tracking_code,
                    "name": candidate_name,
                    "bangla_name": candidate_bn_name,
                    "designation": payload.get("designation") or token_obj.designation or "Faculty Member",
                    "rank_order": payload.get("rank_order") or token_obj.rank_order or 99,
                    "department_name": dept_name,
                    "staff_type": payload.get("staff_type") or token_obj.staff_type or "TEACHING",
                    "joining_date": str(payload.get("joining_date") or timezone.localdate()),
                    "institution_name": inst.name,
                    "institution_address": institution_address,
                    "is_pending_review": False,
                }
            }

    return {
        "status": "NOT_APPLIED",
        "lifecycle_level": 1,
    }


class PublicStaffOnboardingVerifyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token_str = request.query_params.get('token', '').strip()
        if not token_str:
            return Response({"error": "No onboarding token provided."}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = StaffOnboardingToken.objects.filter(token__iexact=token_str).select_related('institution', 'department').first()
        if not token_obj:
            return Response({"error": "Invalid onboarding token. Please check your invitation link or QR code."}, status=status.HTTP_404_NOT_FOUND)

        if not token_obj.is_valid():
            msg = "This staff recruitment/onboarding link has been deactivated or expired."
            if token_obj.expires_at and token_obj.expires_at < timezone.now():
                msg = "This staff recruitment link has expired."
            elif token_obj.max_applications > 0 and token_obj.applied_count >= token_obj.max_applications:
                msg = "This staff onboarding quota limit has been reached."
            return Response({"error": msg, "is_valid": False}, status=status.HTTP_400_BAD_REQUEST)

        permitted_designations = [
            str(d).strip() for d in (token_obj.allowed_designations or []) if str(d).strip()
        ]
        if not permitted_designations and token_obj.designation:
            permitted_designations = [token_obj.designation]

        permitted_staff_types = [
            str(st).strip() for st in (token_obj.allowed_staff_types or []) if str(st).strip()
        ]
        if not permitted_staff_types and token_obj.staff_type:
            permitted_staff_types = [token_obj.staff_type]

        permitted_departments = [
            str(dep).strip() for dep in (token_obj.allowed_departments or []) if str(dep).strip()
        ]
        if not permitted_departments and token_obj.department_id:
            permitted_departments = [str(token_obj.department_id)]

        dept_qs = token_obj.institution.departments.filter(is_active=True)
        if permitted_departments:
            dept_qs = dept_qs.filter(id__in=permitted_departments)
        else:
            dept_qs = dept_qs.none()
        departments_data = [
            {"id": str(d.id), "name": d.name, "code": getattr(d, 'code', '') or ''} for d in dept_qs
        ]

        inst = token_obj.institution
        inst_addr_parts = [
            getattr(inst, 'street_address', '') or getattr(inst, 'address', '') or '',
            getattr(inst, 'upazila_thana', '') or '',
            getattr(inst, 'district', '') or '',
            getattr(inst, 'division', '') or '',
        ]
        institution_address = ", ".join([p.strip() for p in inst_addr_parts if p and p.strip()])

        candidate_app = None
        if request.user and request.user.is_authenticated:
            candidate_app = resolve_candidate_onboarding_status(
                request.user, token_obj, institution_address=institution_address
            )
        else:
            candidate_app = {
                "status": "NOT_APPLIED",
                "lifecycle_level": 1,
            }

        return Response({
            "valid": True,
            "token": token_obj.token,
            "title": token_obj.title,
            "subtitle": getattr(token_obj, 'subtitle', '') or '',
            "onboarding_mode": token_obj.onboarding_mode,
            "staff_type": token_obj.staff_type,
            "allowed_staff_types": permitted_staff_types,
            "designation": token_obj.designation,
            "allowed_designations": permitted_designations,
            "rank_order": token_obj.rank_order,
            "department_id": str(token_obj.department.id) if token_obj.department else None,
            "department_name": token_obj.department.name if token_obj.department else None,
            "allowed_departments": permitted_departments,
            "departments": departments_data,
            "institution_id": str(inst.id),
            "institution_name": inst.name,
            "institution_address": institution_address,
            "institution_code": getattr(inst, 'code', ''),
            "institution_logo": getattr(inst, 'logo_url', '') or '',
            "expires_at": token_obj.expires_at.isoformat() if token_obj.expires_at else None,
            "applied_count": token_obj.applied_count,
            "max_applications": token_obj.max_applications,
            "include_payroll": token_obj.include_payroll,
            "auto_approve": token_obj.auto_approve,
            "candidate_application": candidate_app,
        }, status=status.HTTP_200_OK)


class StaffOnboardingApplyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = StaffOnboardingApplicationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        token_str = data.get('token', '').strip()

        token_obj = None
        institution = None

        if token_str:
            token_obj = StaffOnboardingToken.objects.filter(token__iexact=token_str).select_related('institution', 'department').first()
            if not token_obj or not token_obj.is_valid():
                return Response({"error": "Invalid or expired onboarding invitation link."}, status=status.HTTP_400_BAD_REQUEST)
            institution = token_obj.institution

            permitted_designations = [
                str(d).strip() for d in (token_obj.allowed_designations or []) if str(d).strip()
            ]
            if not permitted_designations and token_obj.designation:
                permitted_designations = [token_obj.designation]

            submitted_designation = str(data.get('designation') or '').strip()
            if permitted_designations:
                permitted_lower = {d.lower() for d in permitted_designations}
                if not submitted_designation or submitted_designation in ('Faculty Member', 'Staff'):
                    data['designation'] = permitted_designations[0]
                elif submitted_designation.lower() not in permitted_lower:
                    return Response(
                        {"designation": "Selected designation is not permitted for this onboarding link."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif not submitted_designation:
                data['designation'] = token_obj.designation or 'Faculty Member'

            permitted_staff_types = [
                str(st).strip() for st in (token_obj.allowed_staff_types or []) if str(st).strip()
            ]
            if not permitted_staff_types and token_obj.staff_type:
                permitted_staff_types = [token_obj.staff_type]

            submitted_staff_type = str(data.get('staff_type') or '').strip()
            if permitted_staff_types and submitted_staff_type:
                permitted_st_upper = {st.upper() for st in permitted_staff_types}
                if submitted_staff_type.upper() not in permitted_st_upper:
                    return Response(
                        {"staff_type": "Selected staff category is not permitted for this onboarding link."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            permitted_departments = [
                str(dep).strip() for dep in (token_obj.allowed_departments or []) if str(dep).strip()
            ]
            if not permitted_departments and token_obj.department_id:
                permitted_departments = [str(token_obj.department_id)]

            submitted_dept = str(data.get('department') or '').strip()
            if permitted_departments and submitted_dept:
                if submitted_dept not in permitted_departments:
                    return Response(
                        {"department": "Selected department is not permitted for this onboarding link."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        else:
            institution = resolve_request_institution(request, request.user)

        if not institution:
            return Response({"error": "An academic institution context is required."}, status=status.HTTP_400_BAD_REQUEST)

        source_mode = "PUBLIC_PORTAL" if token_obj else ("ADMIN_QUICK" if data.get('onboarding_mode') == 'QUICK' else "ADMIN_WIZARD")
        form_mode = data.get('onboarding_mode') or (token_obj.onboarding_mode if token_obj else "QUICK")
        # Public submissions follow the token's auto_approve flag; admin submissions auto-approve by default
        auto_approve = token_obj.auto_approve if token_obj else True

        from core.services.approval_engine import ApprovalService
        result = ApprovalService.submit_request(
            institution=institution,
            domain="STAFF_ONBOARDING",
            payload=data,
            submitted_by=request.user if request.user.is_authenticated else None,
            source_mode=source_mode,
            form_mode=form_mode,
            source_token_type="StaffOnboardingToken" if token_obj else None,
            source_token_id=str(token_obj.id) if token_obj else None,
            token_obj=token_obj,
            auto_approve=auto_approve,
        )
        return Response(result, status=status.HTTP_201_CREATED)


