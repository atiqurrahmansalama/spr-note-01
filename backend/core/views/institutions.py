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

class InstitutionViewSet(viewsets.ModelViewSet):
    queryset = AcademicInstitution.objects.filter(is_deleted=False).order_by('name')
    serializer_class = AcademicInstitutionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = AcademicInstitution.objects.filter(is_deleted=True) if show_trash else AcademicInstitution.objects.filter(is_deleted=False)

        is_super = user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'
        if not is_super:
            if user.institution_id:
                qs = qs.filter(id=user.institution_id)
            else:
                qs = qs.none()
        else:
            search = self.request.query_params.get('search')
            if search:
                qs = qs.filter(
                    Q(name__icontains=search) | 
                    Q(bangla_name__icontains=search) | 
                    Q(slug__icontains=search) | 
                    Q(district__icontains=search)
                )

        return qs.order_by('name')

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        user = request.user
        tenant_id = get_scoped_tenant_id(request)
        is_super = user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'

        if tenant_id:
            inst = AcademicInstitution.objects.filter(id=tenant_id, is_deleted=False).first()
            total_institutions = 1 if inst else 0
            verified_institutions = 1 if (inst and inst.is_verified) else 0
            total_students = Student.objects.filter(institution_id=tenant_id, is_deleted=False).count()
            total_staff = User.objects.filter(institution_id=tenant_id, is_active=True).count()
        elif is_super:
            total_institutions = AcademicInstitution.objects.filter(is_deleted=False).count()
            verified_institutions = AcademicInstitution.objects.filter(is_deleted=False, is_verified=True).count()
            total_students = Student.objects.filter(is_deleted=False).count()
            total_staff = User.objects.filter(is_active=True).count()
        else:
            inst = user.institution
            total_institutions = 1 if inst else 0
            verified_institutions = 1 if (inst and inst.is_verified) else 0
            total_students = Student.objects.filter(institution=inst, is_deleted=False).count() if inst else 0
            total_staff = User.objects.filter(institution=inst, is_active=True).count() if inst else 0

        return Response({
            "total_institutions": total_institutions,
            "verified_institutions": verified_institutions,
            "total_active_students": total_students,
            "total_staff": total_staff,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'patch', 'put'], url_path='current')
    def current(self, request):
        user = request.user
        tenant_id = get_scoped_tenant_id(request)
        if not tenant_id and user.institution_id:
            tenant_id = user.institution_id

        if not tenant_id:
            inst = AcademicInstitution.objects.filter(is_deleted=False).first()
            if inst:
                serializer = AcademicInstitutionSerializer(inst)
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response({"error": "No active institution context found."}, status=status.HTTP_404_NOT_FOUND)

        inst = AcademicInstitution.objects.filter(id=tenant_id, is_deleted=False).first()
        if not inst:
            inst = AcademicInstitution.objects.filter(is_deleted=False).first()
            if not inst:
                return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            serializer = AcademicInstitutionSerializer(inst)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            serializer = AcademicInstitutionSerializer(inst, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], url_path='register')
    def register(self, request):
        serializer = InstitutionOnboardingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        result = serializer.save()
        return Response(result, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        password = request.data.get('password') or request.query_params.get('password')
        if password:
            if not request.user.check_password(password):
                return Response({"error": "Incorrect password. Security authorization failed."}, status=status.HTTP_400_BAD_REQUEST)
        elif not request.user.is_superuser:
            # If not superuser, require password
            password_header = request.headers.get('X-Admin-Password')
            if password_header:
                if not request.user.check_password(password_header):
                    return Response({"error": "Incorrect password. Security authorization failed."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "Administrator password confirmation is required to decommission an institution."}, status=status.HTTP_400_BAD_REQUEST)

        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Institution '{instance.name}' has been safely decommissioned."}, status=status.HTTP_200_OK)


class InstitutionCategoryViewSet(viewsets.ModelViewSet):
    queryset = InstitutionCategory.objects.all().order_by('order', 'name')
    serializer_class = InstitutionCategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsOwnerOrSuperAdmin()]

    def get_queryset(self):
        show_all = self.request.query_params.get('all') == 'true'
        user = self.request.user
        is_super = user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'
        if show_all and is_super:
            return InstitutionCategory.objects.all().order_by('order', 'name')
        return InstitutionCategory.objects.filter(is_active=True).order_by('order', 'name')


class AcademicBranchViewSet(viewsets.ModelViewSet):
    queryset = AcademicBranch.objects.filter(is_deleted=False).select_related('institution', 'in_charge_staff__user').order_by('branch_name')
    serializer_class = AcademicBranchSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    required_section_key = 'academic_branches'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = AcademicBranch.objects.filter(is_deleted=True) if show_trash else AcademicBranch.objects.filter(is_deleted=False)

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                qs = qs.none()

        branch_type = self.request.query_params.get('branch_type') or self.request.query_params.get('type')
        if branch_type and branch_type != 'ALL':
            qs = qs.filter(branch_type=branch_type)

        is_active = self.request.query_params.get('is_active')
        if is_active is not None and is_active != 'ALL':
            qs = qs.filter(is_active=(is_active.lower() == 'true'))

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(branch_name__icontains=search) |
                Q(branch_code__icontains=search) |
                Q(district__icontains=search) |
                Q(division__icontains=search) |
                Q(contact_phone__icontains=search)
            )

        return qs.select_related('institution', 'in_charge_staff__user').order_by('branch_name')

    def perform_create(self, serializer):
        req_inst = self.request.data.get('institution')
        tenant_id = req_inst or get_scoped_tenant_id(self.request)
        if tenant_id and tenant_id != 'ALL':
            serializer.save(institution_id=tenant_id)
        elif self.request.user.institution_id:
            serializer.save(institution_id=self.request.user.institution_id)
        else:
            first_inst = AcademicInstitution.objects.filter(is_deleted=False).first()
            if not first_inst:
                raise serializers.ValidationError({"institution": "An Academy/Institution is required before creating a branch."})
            serializer.save(institution=first_inst)

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        tenant_id = get_scoped_tenant_id(request)
        filter_kwargs = {'is_deleted': False}
        if tenant_id:
            filter_kwargs['institution_id'] = tenant_id
        elif not (request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if request.user.institution_id:
                filter_kwargs['institution_id'] = request.user.institution_id

        total_branches = AcademicBranch.objects.filter(**filter_kwargs).count()
        main_campuses = AcademicBranch.objects.filter(branch_type='MAIN_CAMPUS', **filter_kwargs).count()
        sub_branches = AcademicBranch.objects.filter(branch_type='SUB_BRANCH', **filter_kwargs).count()
        active_in_charges = AcademicBranch.objects.filter(in_charge_staff__isnull=False, **filter_kwargs).count()
        
        from django.db.models import Sum
        capacity_sum = ClassSection.objects.filter(branch__in=AcademicBranch.objects.filter(**filter_kwargs), is_deleted=False).aggregate(total=Sum('max_capacity'))['total'] or 0

        return Response({
            "total_branches": total_branches,
            "main_campuses": main_campuses,
            "sub_branches": sub_branches,
            "total_capacity": capacity_sum,
            "active_in_charges": active_in_charges
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='stats')
    def stats(self, request, pk=None):
        branch = self.get_object()
        total_students = Student.objects.filter(branch=branch, is_deleted=False).count()
        total_sections = branch.sections.filter(is_deleted=False).count()
        total_classes = StudentClass.objects.filter(sections__branch=branch, sections__is_deleted=False, is_deleted=False).distinct().count()
        
        from django.db.models import Sum
        total_capacity = branch.sections.filter(is_deleted=False).aggregate(total=Sum('max_capacity'))['total'] or 0
        
        sections = ClassSectionSerializer(branch.sections.filter(is_deleted=False), many=True).data

        return Response({
            "id": branch.id,
            "branch_name": branch.branch_name,
            "branch_code": branch.branch_code,
            "branch_type": branch.branch_type,
            "total_students": total_students,
            "total_sections": total_sections,
            "total_classes": total_classes,
            "total_capacity": total_capacity,
            "sections": sections
        }, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Branch '{instance.branch_name}' has been soft-deleted."}, status=status.HTTP_200_OK)


class AcademicDepartmentViewSet(viewsets.ModelViewSet):
    queryset = AcademicDepartment.objects.filter(is_deleted=False).select_related('department_head', 'institution').order_by('order_rank', 'name')
    serializer_class = AcademicDepartmentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
    required_section_key = 'student_departments'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        qs = AcademicDepartment.objects.filter(is_deleted=True) if show_trash else AcademicDepartment.objects.filter(is_deleted=False)

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                qs = qs.none()

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))

        return qs.select_related('department_head', 'institution').order_by('order_rank', 'name')

    def perform_create(self, serializer):
        req_inst = self.request.data.get('institution')
        tenant_id = req_inst or get_scoped_tenant_id(self.request)
        if tenant_id and tenant_id != 'ALL':
            serializer.save(institution_id=tenant_id)
        elif self.request.user.institution_id:
            serializer.save(institution_id=self.request.user.institution_id)
        else:
            first_inst = AcademicInstitution.objects.filter(is_deleted=False).first()
            if not first_inst:
                raise serializers.ValidationError({"institution": "An Academy/Institution is required before creating a department."})
            serializer.save(institution=first_inst)

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        tenant_id = get_scoped_tenant_id(request)
        filter_kwargs = {'is_deleted': False}
        if tenant_id:
            filter_kwargs['institution_id'] = tenant_id
        elif not (request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if request.user.institution_id:
                filter_kwargs['institution_id'] = request.user.institution_id

        total_depts = AcademicDepartment.objects.filter(**filter_kwargs).count()
        total_classes = StudentClass.objects.filter(**filter_kwargs).count()
        total_enrolled = Student.objects.filter(**filter_kwargs).count()
        return Response({
            "total_departments": total_depts,
            "total_classes": total_classes,
            "total_enrolled_students": total_enrolled
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='delete-with-migration')
    def delete_with_migration(self, request, pk=None):
        from core.services import delete_department_with_migration
        target_dept_id = request.data.get('target_department_id')
        result = delete_department_with_migration(
            source_dept_id=pk,
            target_dept_id=target_dept_id,
            performed_by=request.user
        )
        return Response(result, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        has_classes = instance.classes.filter(is_deleted=False).exists()
        if has_classes:
            return Response({
                "error": f"Department '{instance.name}' has {instance.classes.filter(is_deleted=False).count()} active classes assigned. Please use 'delete-with-migration' to safely migrate them."
            }, status=status.HTTP_400_BAD_REQUEST)

        instance.is_deleted = True
        instance.is_active = False
        instance.save(update_fields=['is_deleted', 'is_active', 'updated_at'])
        return Response({"status": "success", "message": f"Department '{instance.name}' has been soft-deleted."}, status=status.HTTP_200_OK)


class TenantTaxonomySettingViewSet(viewsets.ModelViewSet):
    """
    API endpoint for multi-device cloud synchronization of tenant taxonomies,
    custom staff ranks, operational shifts, calendar event kinds, document titles,
    admission rules, and recruitment requirements.
    """
    queryset = TenantTaxonomySetting.objects.all()
    serializer_class = TenantTaxonomySettingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id and tenant_id != 'default':
            return TenantTaxonomySetting.objects.filter(institution_id=tenant_id)
        elif self.request.user.is_authenticated and self.request.user.institution_id:
            return TenantTaxonomySetting.objects.filter(institution_id=self.request.user.institution_id)
        return TenantTaxonomySetting.objects.filter(institution__isnull=True)

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        result = {}
        for item in qs:
            result[item.taxonomy_key] = item.data
        return Response({
            "status": "success",
            "taxonomies": result,
            "count": len(result),
            "synced_at": timezone.now().isoformat()
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-sync')
    def bulk_sync(self, request):
        """
        Accepts a dictionary of { taxonomy_key: list_of_records } or single key update
        and atomically upserts them for the active tenant institution.
        """
        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id and tenant_id != 'default':
            try:
                institution = AcademicInstitution.objects.get(id=tenant_id)
            except (AcademicInstitution.DoesNotExist, ValueError):
                pass
        elif request.user.is_authenticated and request.user.institution:
            institution = request.user.institution

        payload = request.data.get('taxonomies') or request.data
        if not isinstance(payload, dict):
            return Response({"error": "Payload must be a dictionary of taxonomy keys"}, status=status.HTTP_400_BAD_REQUEST)

        updated_keys = []
        with transaction.atomic():
            for key, val in payload.items():
                if not isinstance(key, str) or not isinstance(val, (list, dict)):
                    continue
                setting, created = TenantTaxonomySetting.objects.get_or_create(
                    institution=institution,
                    taxonomy_key=key,
                    defaults={'data': val, 'version': 1}
                )
                if not created:
                    setting.data = val
                    setting.version = F('version') + 1
                    setting.save()
                updated_keys.append(key)

        return Response({
            "status": "success",
            "synced_keys": updated_keys,
            "synced_at": timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


