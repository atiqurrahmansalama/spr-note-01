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

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(is_deleted=False).select_related('details', 'student_class', 'student_group').distinct().order_by('roll_number', 'name_en')
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin, HasSectionAccess]
    required_section_key = 'student_roster'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        base_qs = Student.objects.filter(is_deleted=True) if show_trash else Student.objects.filter(is_deleted=False)
        base_qs = base_qs.select_related('details', 'student_class', 'student_group', 'institution').distinct()

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif not (getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser):
            if user.institution_id:
                base_qs = base_qs.filter(institution_id=user.institution_id)
            else:
                base_qs = base_qs.filter(created_by=user)

        # Optional class or group filter
        class_param = self.request.query_params.get('student_class') or self.request.query_params.get('class')
        if class_param and class_param != 'ALL':
            from django.db.models import Q
            try:
                base_qs = base_qs.filter(Q(student_class_id=class_param) | Q(student_class__name__iexact=class_param))
            except Exception:
                base_qs = base_qs.filter(student_class__name__iexact=class_param)

        group_param = self.request.query_params.get('student_group') or self.request.query_params.get('group')
        if group_param and group_param != 'ALL':
            from django.db.models import Q
            if str(group_param).isdigit():
                base_qs = base_qs.filter(
                    Q(student_group_id=int(group_param)) | 
                    Q(group_name__iexact=group_param) | 
                    Q(student_group__name__iexact=group_param)
                )
            else:
                base_qs = base_qs.filter(
                    Q(group_name__iexact=group_param) | 
                    Q(student_group__name__iexact=group_param)
                )

        return base_qs.order_by('roll_number', 'name_en')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            serializer.save(created_by=self.request.user, institution_id=tenant_id)
        else:
            serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='admission')
    def admission(self, request):
        from core.serializers import StudentAdmissionSerializer, StudentFullProfileSerializer
        serializer = StudentAdmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            student = serializer.save()
            res_serializer = StudentFullProfileSerializer(student, context={'request': request})
            return Response(res_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'patch'], url_path='full-profile')
    def full_profile(self, request, pk=None):
        from core.serializers import StudentFullProfileSerializer
        student = self.get_object()
        if request.method == 'GET':
            serializer = StudentFullProfileSerializer(student, context={'request': request})
            return Response(serializer.data)
        elif request.method == 'PATCH':
            serializer = StudentFullProfileSerializer(student, data=request.data, partial=True, context={'request': request})
            if serializer.is_valid():
                student = serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='transfer-academic')
    def transfer_academic(self, request, pk=None):
        from core.services import transfer_student_academic
        from core.serializers import StudentTransferAcademicSerializer
        serializer = StudentTransferAcademicSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        result = transfer_student_academic(
            student_id=pk,
            target_class_id=serializer.validated_data.get('target_class_id'),
            target_group_id=serializer.validated_data.get('target_group_id'),
            transition_date=serializer.validated_data.get('transition_date'),
            transition_reason=serializer.validated_data.get('transition_reason', ''),
            performed_by=request.user
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='academic-history')
    def academic_history(self, request, pk=None):
        student = self.get_object()
        from core.serializers import StudentAcademicHistorySerializer
        history_records = student.academic_history.all().order_by('-start_date', '-created_at')
        serializer = StudentAcademicHistorySerializer(history_records, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload-document')
    def upload_document(self, request, pk=None):
        from core.serializers import StudentDocumentSerializer
        from django.contrib.auth import get_user_model
        User = get_user_model()
        student = self.get_object()
        serializer = StudentDocumentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            creator = request.user if request.user and request.user.is_authenticated else User.objects.filter(is_superuser=True).first()
            if not creator:
                creator = User.objects.first()
            serializer.save(student=student, created_by=creator)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'documents/(?P<doc_id>[^/.]+)')
    def manage_document(self, request, pk=None, doc_id=None):
        student = self.get_object()
        from core.models import StudentDocument
        try:
            doc = StudentDocument.objects.get(id=doc_id, student=student)
        except StudentDocument.DoesNotExist:
            return Response({"error": "Document not found"}, status=status.HTTP_404_NOT_FOUND)

        if request.method.lower() == 'delete':
            doc.delete()
            return Response({"status": "success", "message": "Document deleted successfully"}, status=status.HTTP_200_OK)

        elif request.method.lower() == 'patch':
            new_title = request.data.get('title')
            if new_title:
                doc.title = new_title.strip()
                doc.save(update_fields=['title'])
            return Response({"status": "success", "title": doc.title, "id": doc.id}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        queryset = self.get_queryset()
        total_students = queryset.count()
        active_students = queryset.filter(status__iexact='active').count()

        from django.utils import timezone
        start_of_month = timezone.now().date().replace(day=1)
        new_admissions = queryset.filter(admission_date__gte=start_of_month).count()

        total_juz = 0
        hifz_count = 0
        students = list(queryset.prefetch_related('details'))
        for s in students:
            group = str(s.group_name or '').upper()
            is_hifz = any(w in group for w in ['HIFZ', 'NAZERA', 'SABAQ', 'QURAN', 'HALQA']) or not group
            if is_hifz:
                hifz_count += 1
                initial = getattr(s, 'details', None).initial_completed_juz if getattr(s, 'details', None) else 0
                total_juz += (initial or 0)
        
        avg_juz = round(total_juz / hifz_count, 1) if hifz_count > 0 else 0.0

        return Response({
            "total_students": total_students,
            "active_students": active_students,
            "new_admissions_this_month": new_admissions,
            "avg_juz_completed": avg_juz
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-action')
    def bulk_action(self, request):
        action_type = request.data.get('action')
        student_ids = request.data.get('student_ids', [])

        if not student_ids:
            return Response({"error": "No students selected"}, status=status.HTTP_400_BAD_REQUEST)

        queryset = self.get_queryset().filter(id__in=student_ids)

        from django.db import transaction
        try:
            with transaction.atomic():
                if action_type == 'transfer':
                    target_class_id = request.data.get('target_class_id')
                    target_group_id = request.data.get('target_group_id')
                    transition_date = request.data.get('transition_date')
                    transition_reason = request.data.get('transition_reason', 'Bulk Academic Transfer')
                    from core.services import transfer_student_academic
                    for s_id in student_ids:
                        try:
                            transfer_student_academic(
                                student_id=s_id,
                                target_class_id=target_class_id,
                                target_group_id=target_group_id,
                                transition_date=transition_date,
                                transition_reason=transition_reason,
                                performed_by=request.user
                            )
                        except Exception as ex:
                            logger.warning(f"Error transferring student {s_id}: {ex}")
                elif action_type == 'assign_class':
                    target_class_id = request.data.get('target_class_id') or request.data.get('class_id')
                    if not target_class_id:
                        return Response({"error": "Class ID is required"}, status=status.HTTP_400_BAD_REQUEST)
                    from core.models import StudentClass
                    target_cls = StudentClass.objects.get(id=target_class_id, is_deleted=False)
                    queryset.update(student_class=target_cls)
                elif action_type == 'assign_group':
                    group_id = request.data.get('target_group_id') or request.data.get('group_id')
                    group_name = request.data.get('group_name')
                    from core.models import StudentGroup
                    if group_id:
                        grp = StudentGroup.objects.get(id=group_id, is_deleted=False)
                        queryset.update(group_name=grp.name, student_group=grp)
                    elif group_name:
                        grp, _ = StudentGroup.objects.get_or_create(name=group_name.strip())
                        queryset.update(group_name=group_name.strip(), student_group=grp)
                    else:
                        return Response({"error": "Group is required"}, status=status.HTTP_400_BAD_REQUEST)
                elif action_type == 'change_status':
                    status_val = request.data.get('status')
                    if not status_val:
                        return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)
                    queryset.update(status=status_val.strip().title())
                elif action_type == 'bulk_delete':
                    queryset.update(is_deleted=True, status='INACTIVE')
                else:
                    return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)

            return Response({"status": "success", "message": f"Successfully performed bulk action: {action_type}"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='guardian-lookup')
    def guardian_lookup(self, request):
        phone = request.query_params.get('phone')
        if not phone:
            return Response({"error": "Phone parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        import re
        cleaned_phone = re.sub(r'[^\d]', '', phone)
        if len(cleaned_phone) < 10:
            return Response({"siblings": [], "guardian": None})
            
        from django.db.models import Q
        from core.models import StudentGuardian, Student
        
        guardians = StudentGuardian.objects.filter(
            Q(primary_guardian_phone__contains=cleaned_phone) |
            Q(father_phone__contains=cleaned_phone) |
            Q(mother_phone__contains=cleaned_phone)
        ).select_related('student')
        
        if not guardians.exists():
            return Response({"siblings": [], "guardian": None})
            
        first_guardian = guardians.first()
        
        sibling_students = Student.objects.filter(
            Q(guardian_detail__primary_guardian_phone__contains=cleaned_phone) |
            Q(guardian_detail__father_phone__contains=cleaned_phone) |
            Q(guardian_detail__mother_phone__contains=cleaned_phone),
            is_deleted=False
        ).distinct()
        
        siblings_data = []
        for s in sibling_students:
            siblings_data.append({
                "id": s.id,
                "name": s.name_en or s.name or "Unnamed",
                "roll": s.roll_number or "",
                "group_name": s.group_name or "General Group"
            })
            
        guardian_data = {
            "father_name": first_guardian.father_name or "",
            "father_phone": first_guardian.father_phone or "",
            "father_occupation": first_guardian.father_occupation or "",
            "mother_name": first_guardian.mother_name or "",
            "mother_phone": first_guardian.mother_phone or "",
            "mother_occupation": first_guardian.mother_occupation or "",
            "primary_guardian_name": first_guardian.primary_guardian_name or "",
            "primary_guardian_phone": first_guardian.primary_guardian_phone or "",
            "guardian_relation": first_guardian.guardian_relation or "",
            "guardian_nid": first_guardian.guardian_nid or "",
            "emergency_contact_phone": first_guardian.emergency_contact_phone or ""
        }
        
        return Response({
            "siblings": siblings_data,
            "guardian": guardian_data
        })

    @action(detail=False, methods=['get'], url_path=r'verify-admission/(?P<student_id>[^/]+)', permission_classes=[AllowAny], authentication_classes=[])
    def verify_admission(self, request, student_id=None):
        from core.models import Student
        from django.db.models import Q
        
        try:
            student = Student.objects.filter(
                Q(uniq_id=student_id) | 
                Q(id=student_id if student_id.isdigit() else -1) |
                Q(student_id_card_number=student_id)
            ).first()
        except Exception:
            student = None
            
        if not student:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)
            
        return Response({
            "name": student.name_en or student.name or "Unnamed",
            "bangla_name": student.bangla_name or "",
            "uniq_id": student.uniq_id or "",
            "enrollment_date": student.admission_date or student.created_at.strftime('%Y-%m-%d') if student.created_at else "",
            "department": student.group_name or "General Group",
            "status": student.status or "Active"
        }, status=status.HTTP_200_OK)

