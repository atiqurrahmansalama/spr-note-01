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
from core.services import get_scoped_tenant_id
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
            if user.institution_id:
                base_qs = base_qs.filter(institution_id=user.institution_id)
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

        return base_qs.order_by('-created_at')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request)
        inst = None
        if tenant_id:
            inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        elif self.request.user.institution:
            inst = self.request.user.institution
        else:
            inst = AcademicInstitution.objects.first()

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

        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id:
            institution = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not institution:
            institution = request.user.institution or AcademicInstitution.objects.first()

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
        if tenant_id:
            base_qs = base_qs.filter(teacher__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(teacher__institution_id=user.institution_id)
            else:
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
        if tenant_id:
            base_qs = base_qs.filter(staff__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(staff__institution_id=user.institution_id)
            else:
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
        if tenant_id:
            base_qs = base_qs.filter(staff__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(staff__institution_id=user.institution_id)
            else:
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

        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id:
            institution = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not institution:
            institution = request.user.institution or AcademicInstitution.objects.first()

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

        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id:
            institution = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not institution:
            institution = request.user.institution or AcademicInstitution.objects.first()

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
        if tenant_id:
            base_qs = base_qs.filter(staff__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(staff__institution_id=user.institution_id)
            else:
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

