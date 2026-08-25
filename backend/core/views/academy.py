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

class ClassSectionViewSet(viewsets.ModelViewSet):
    queryset = ClassSection.objects.filter(is_deleted=False).select_related('student_class', 'branch', 'class_teacher__user').order_by('student_class__order_rank', 'section_name')
    serializer_class = ClassSectionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    required_section_key = 'class_sections'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = ClassSection.objects.filter(is_deleted=True) if show_trash else ClassSection.objects.filter(is_deleted=False)

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(student_class__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                qs = qs.filter(student_class__institution_id=user.institution_id)
            else:
                qs = qs.none()

        class_id = self.request.query_params.get('class') or self.request.query_params.get('student_class')
        if class_id and class_id != 'ALL':
            qs = qs.filter(student_class_id=class_id)

        branch_id = self.request.query_params.get('branch')
        if branch_id and branch_id != 'ALL':
            qs = qs.filter(branch_id=branch_id)

        section_type = self.request.query_params.get('section_type')
        if section_type and section_type != 'ALL':
            qs = qs.filter(section_type=section_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(section_name__icontains=search) |
                Q(room_number__icontains=search) |
                Q(student_class__name__icontains=search)
            )

        return qs.select_related('student_class', 'branch', 'class_teacher__user').order_by('student_class__order_rank', 'section_name')

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        tenant_id = get_scoped_tenant_id(request)
        filter_kwargs = {'is_deleted': False}
        if tenant_id:
            filter_kwargs['student_class__institution_id'] = tenant_id
        elif not (request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if request.user.institution_id:
                filter_kwargs['student_class__institution_id'] = request.user.institution_id

        total_sections = ClassSection.objects.filter(**filter_kwargs).count()
        from django.db.models import Sum
        total_capacity = ClassSection.objects.filter(**filter_kwargs).aggregate(total=Sum('max_capacity'))['total'] or 0
        total_enrolled = Student.objects.filter(section__in=ClassSection.objects.filter(**filter_kwargs), is_deleted=False).count()
        occupancy_rate = round((total_enrolled / total_capacity * 100), 1) if total_capacity > 0 else 0.0

        return Response({
            "total_sections": total_sections,
            "total_capacity": total_capacity,
            "total_enrolled": total_enrolled,
            "occupancy_rate": occupancy_rate
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Section '{instance.section_name}' has been soft-deleted."}, status=status.HTTP_200_OK)


class ClassPeriodSlotViewSet(viewsets.ModelViewSet):
    queryset = ClassPeriodSlot.objects.filter(is_deleted=False).select_related('institution', 'branch', 'department', 'student_class').order_by('period_order', 'start_time')
    serializer_class = ClassPeriodSlotSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    required_section_key = 'class_period_slots'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = ClassPeriodSlot.objects.filter(is_deleted=True) if show_trash else ClassPeriodSlot.objects.filter(is_deleted=False)

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                qs = qs.none()

        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id != 'ALL':
            qs = qs.filter(department_id=dept_id)

        class_id = self.request.query_params.get('class') or self.request.query_params.get('student_class')
        if class_id and class_id != 'ALL':
            qs = qs.filter(student_class_id=class_id)

        branch_id = self.request.query_params.get('branch')
        if branch_id and branch_id != 'ALL':
            qs = qs.filter(branch_id=branch_id)

        teacher_id = self.request.query_params.get('teacher')
        if teacher_id and teacher_id != 'ALL':
            qs = qs.filter(teacher_id=teacher_id)

        slot_type = self.request.query_params.get('slot_type')
        if slot_type and slot_type != 'ALL':
            qs = qs.filter(slot_type=slot_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(period_name__icontains=search) |
                Q(department__name__icontains=search) |
                Q(student_class__name__icontains=search) |
                Q(teacher__user__first_name__icontains=search) |
                Q(teacher__user__last_name__icontains=search) |
                Q(teacher__user__name__icontains=search) |
                Q(teacher__user__name_en__icontains=search)
            )

        return qs.select_related('institution', 'branch', 'department', 'student_class', 'teacher', 'teacher__user').order_by('period_order', 'start_time')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            serializer.save(institution_id=tenant_id)
        elif self.request.user.institution_id:
            serializer.save(institution_id=self.request.user.institution_id)
        else:
            first_inst = AcademicInstitution.objects.filter(is_deleted=False).first()
            serializer.save(institution=first_inst)

    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request):
        """
        Bulk update period slot ordering.
        Payload: [{'id': uuid, 'period_order': int}, ...] or {'slots': [...]}
        """
        slots_data = request.data.get('slots', request.data) if isinstance(request.data, dict) else request.data
        if not isinstance(slots_data, list):
            return Response({"error": "Expected a list of slots with id and period_order"}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for item in slots_data:
                slot_id = item.get('id')
                order = item.get('period_order')
                if slot_id and order is not None:
                    ClassPeriodSlot.objects.filter(id=slot_id).update(period_order=order, updated_at=timezone.now())

        return Response({"status": "success", "message": "Period slots re-ordered successfully."}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Period Slot '{instance.period_name}' has been soft-deleted."}, status=status.HTTP_200_OK)


class StudentClassViewSet(viewsets.ModelViewSet):
    queryset = StudentClass.objects.filter(is_deleted=False).select_related('department', 'class_teacher', 'institution').order_by('order_rank', 'name')
    serializer_class = StudentClassSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin, HasSectionAccess]
    required_section_key = 'student_classes'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = StudentClass.objects.filter(is_deleted=True) if show_trash else StudentClass.objects.filter(is_deleted=False)
        
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                qs = qs.none()

        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id != 'ALL':
            qs = qs.filter(department_id=dept_id)

        dept_type = self.request.query_params.get('department_type')
        if dept_type and dept_type != 'ALL':
            qs = qs.filter(department_type=dept_type.upper())
            
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
            
        return qs.select_related('department', 'class_teacher', 'institution').order_by('order_rank', 'name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            serializer.save(institution_id=tenant_id)
        else:
            serializer.save()

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        tenant_id = get_scoped_tenant_id(request)
        filter_kwargs = {'is_deleted': False}
        if tenant_id:
            filter_kwargs['institution_id'] = tenant_id

        total_classes = StudentClass.objects.filter(**filter_kwargs).count()
        total_enrolled = Student.objects.filter(student_class__isnull=False, **filter_kwargs).count()
        avg_students = round(total_enrolled / total_classes, 1) if total_classes > 0 else 0.0
        return Response({
            "total_classes": total_classes,
            "total_enrolled_students": total_enrolled,
            "avg_students_per_class": avg_students
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='delete-with-migration')
    def delete_with_migration(self, request, pk=None):
        from core.services import delete_class_with_migration
        target_class_id = request.data.get('target_class_id')
        result = delete_class_with_migration(
            source_class_id=pk,
            target_class_id=target_class_id,
            performed_by=request.user
        )
        return Response(result, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        has_students = instance.students.filter(is_deleted=False).exists()
        has_groups = instance.groups.filter(is_deleted=False).exists()
        if has_students or has_groups:
            return Response({
                "error": f"Class '{instance.name}' has active students ({instance.students.filter(is_deleted=False).count()}) or groups ({instance.groups.filter(is_deleted=False).count()}). Please use 'delete-with-migration' to safely migrate them."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Class '{instance.name}' has been soft-deleted."}, status=status.HTTP_200_OK)


class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.filter(is_deleted=False).select_related('student_class', 'mentor_teacher', 'institution').order_by('name')
    serializer_class = StudentGroupSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin, HasSectionAccess]
    required_section_key = 'student_groups'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = StudentGroup.objects.filter(is_deleted=True) if show_trash else StudentGroup.objects.filter(is_deleted=False)

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                qs = qs.none()

        class_id = self.request.query_params.get('student_class')
        if class_id and class_id != 'ALL':
            qs = qs.filter(student_class_id=class_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(student_class__name__icontains=search))

        return qs.select_related('student_class', 'mentor_teacher', 'institution').order_by('name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            serializer.save(created_by=self.request.user, institution_id=tenant_id)
        else:
            serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        tenant_id = get_scoped_tenant_id(request)
        filter_kwargs = {'is_deleted': False}
        if tenant_id:
            filter_kwargs['institution_id'] = tenant_id

        active_groups = StudentGroup.objects.filter(**filter_kwargs)
        total_groups = active_groups.count()
        total_assigned = Student.objects.filter(student_group__isnull=False, **filter_kwargs).count()
        total_capacity = sum(g.capacity for g in active_groups if g.capacity > 0)
        available_seats = max(0, total_capacity - total_assigned)
        return Response({
            "total_groups": total_groups,
            "total_assigned_students": total_assigned,
            "total_capacity": total_capacity,
            "available_seats": available_seats
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='delete-with-migration')
    def delete_with_migration(self, request, pk=None):
        from core.services import delete_group_with_migration
        target_group_id = request.data.get('target_group_id')
        result = delete_group_with_migration(
            source_group_id=pk,
            target_group_id=target_group_id,
            performed_by=request.user
        )
        return Response(result, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        has_students = Student.objects.filter(
            Q(student_group=instance) | Q(group_name__iexact=instance.name),
            is_deleted=False
        ).exists()
        if has_students:
            return Response({
                "error": f"Group '{instance.name}' has active students assigned. Please use 'delete-with-migration' to safely migrate them."
            }, status=status.HTTP_400_BAD_REQUEST)
            
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Group '{instance.name}' has been soft-deleted."}, status=status.HTTP_200_OK)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all().order_by('id')
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        if getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser:
            return self.queryset.all()

        return self.queryset.filter(created_by=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CalendarEventViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AcademicCalendarEventSerializer
    queryset = AcademicCalendarEvent.objects.filter(is_deleted=False)

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = AcademicCalendarEvent.objects.filter(is_deleted=False).select_related('institution', 'created_by')
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(institution_id=user.institution_id)
            else:
                return base_qs.none()

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year:
            try:
                base_qs = base_qs.filter(Q(start_date__year=int(year)) | Q(end_date__year=int(year)))
            except ValueError:
                pass
        if month:
            try:
                base_qs = base_qs.filter(Q(start_date__month=int(month)) | Q(end_date__month=int(month)))
            except ValueError:
                pass

        event_type = self.request.query_params.get('event_type')
        if event_type and event_type != 'ALL':
            base_qs = base_qs.filter(event_type=event_type.upper())

        return base_qs.order_by('start_date', 'title')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise serializers.ValidationError({"institution": "Active institution scope is required."})
        serializer.save(institution_id=tenant_id, created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({"status": "Calendar event deleted."}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='check-holiday')
    def check_holiday(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            target_date = timezone.localdate()
        else:
            try:
                target_date = date.fromisoformat(date_str)
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"is_holiday": False, "reason": ""}, status=status.HTTP_200_OK)

        # 1. Check custom calendar events
        event = AcademicCalendarEvent.objects.filter(
            institution_id=tenant_id,
            is_deleted=False,
            start_date__lte=target_date,
            end_date__gte=target_date,
            event_type__in=['PUBLIC_HOLIDAY', 'INSTITUTIONAL_HOLIDAY', 'VACATION']
        ).first()

        if event:
            return Response({
                "is_holiday": True,
                "is_weekend": False,
                "reason": event.title,
                "event_type": event.event_type,
                "event_id": event.id,
                "color_code": event.color_code,
                "affects_students": event.affects_students,
                "affects_staff": event.affects_staff,
            }, status=status.HTTP_200_OK)

        # 2. Check institutional weekend policy
        policy = AttendancePolicySetting.objects.filter(institution_id=tenant_id).first()
        weekday_name = target_date.strftime('%A').upper()
        weekend_days = policy.weekend_days if (policy and policy.weekend_days is not None) else ['FRIDAY']

        if weekday_name in weekend_days:
            return Response({
                "is_holiday": True,
                "is_weekend": True,
                "reason": f"Weekend ({target_date.strftime('%A')})",
                "event_type": "WEEKEND",
                "event_id": None,
                "color_code": "#f59e0b",
                "affects_students": True,
                "affects_staff": True,
            }, status=status.HTTP_200_OK)

        return Response({
            "is_holiday": False,
            "is_weekend": False,
            "reason": "",
            "event_type": None,
            "event_id": None,
            "color_code": None,
            "affects_students": False,
            "affects_staff": False,
        }, status=status.HTTP_200_OK)


class InstitutionalTaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = InstitutionalTaskSerializer
    queryset = InstitutionalTask.objects.filter(is_deleted=False)

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = InstitutionalTask.objects.filter(is_deleted=False).select_related('institution', 'assigned_to', 'created_by')
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(institution_id=user.institution_id)
            else:
                return base_qs.none()

        priority = self.request.query_params.get('priority')
        if priority and priority != 'ALL':
            base_qs = base_qs.filter(priority=priority.upper())

        status_val = self.request.query_params.get('status')
        if status_val and status_val != 'ALL':
            base_qs = base_qs.filter(status=status_val.upper())

        is_completed = self.request.query_params.get('is_completed')
        if is_completed is not None and is_completed != 'ALL':
            base_qs = base_qs.filter(is_completed=(is_completed.lower() == 'true'))

        category = self.request.query_params.get('category')
        if category and category != 'ALL':
            base_qs = base_qs.filter(category=category.upper())

        return base_qs.order_by('is_completed', 'due_date', '-created_at')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise serializers.ValidationError({"institution": "Active institution scope is required."})
        serializer.save(institution_id=tenant_id, created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({"status": "Task deleted."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['patch'], url_path='toggle-complete')
    def toggle_complete(self, request, pk=None):
        task = self.get_object()
        task.is_completed = not task.is_completed
        if task.is_completed:
            task.status = 'COMPLETED'
            task.completed_at = timezone.now()
        else:
            task.status = 'PENDING'
            task.completed_at = None
        task.save()
        return Response(InstitutionalTaskSerializer(task).data, status=status.HTTP_200_OK)


class DynamicPeriodSlotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DynamicPeriodSlotSerializer
    queryset = DynamicPeriodSlot.objects.filter(is_deleted=False)

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()
        qs = DynamicPeriodSlot.objects.filter(is_deleted=False).select_related('institution', 'department', 'student_class')
        tenant_id = get_scoped_tenant_id(self.request) or getattr(user, 'institution_id', None)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        class_id = self.request.query_params.get('class_id')
        if class_id and class_id != 'ALL':
            qs = qs.filter(student_class_id=class_id)
        return qs.order_by('period_order', 'start_time')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        serializer.save(institution_id=tenant_id)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])


class TeacherRoutineScheduleViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TeacherRoutineScheduleSerializer
    queryset = TeacherRoutineSchedule.objects.all()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()
        qs = TeacherRoutineSchedule.objects.select_related(
            'institution', 'teacher', 'period_slot', 'student_class', 'student_group'
        )
        tenant_id = get_scoped_tenant_id(self.request) or getattr(user, 'institution_id', None)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        teacher_id = self.request.query_params.get('teacher_id')
        if teacher_id and teacher_id != 'ALL':
            qs = qs.filter(teacher_id=teacher_id)
        class_id = self.request.query_params.get('class_id')
        if class_id and class_id != 'ALL':
            qs = qs.filter(student_class_id=class_id)
        return qs.order_by('teacher__name_en', 'period_slot__period_order', 'student_class__name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        serializer.save(institution_id=tenant_id)

