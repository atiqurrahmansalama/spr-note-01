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


class AdmissionInviteTokenViewSet(viewsets.ModelViewSet):
    queryset = AdmissionInviteToken.objects.all().select_related('institution', 'target_class', 'target_group', 'created_by')
    serializer_class = AdmissionInviteTokenSerializer
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'student_admission'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()
        tenant_id = get_scoped_tenant_id(self.request)
        qs = self.queryset
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        elif not (getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser):
            if user.institution_id:
                qs = qs.filter(institution_id=user.institution_id)
            else:
                qs = qs.filter(created_by=user)
        return qs

    def perform_create(self, serializer):
        user = self.request.user
        tenant_id = get_scoped_tenant_id(self.request) or user.institution_id
        if not tenant_id:
            from core.models import AcademicInstitution
            inst = AcademicInstitution.objects.first()
            tenant_id = inst.id if inst else None

        # Generate unique token
        generated_token = f"ADM-{uuid.uuid4().hex[:8].upper()}"
        while AdmissionInviteToken.objects.filter(token=generated_token).exists():
            generated_token = f"ADM-{uuid.uuid4().hex[:8].upper()}"

        serializer.save(
            token=generated_token,
            institution_id=tenant_id,
            created_by=user
        )

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        token_obj = self.get_object()
        token_obj.is_active = not token_obj.is_active
        token_obj.save(update_fields=['is_active'])
        return Response({
            'status': 'success',
            'is_active': token_obj.is_active,
            'message': f"Token {'activated' if token_obj.is_active else 'paused'} successfully."
        })


class PublicAdmissionVerifyView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        token_str = request.query_params.get('token', '').strip()
        if not token_str:
            return Response({'error': 'Admission token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = AdmissionInviteToken.objects.filter(token__iexact=token_str).select_related('institution', 'target_class').first()
        if not token_obj:
            return Response({'error': 'Invalid or expired admission link/QR code.'}, status=status.HTTP_404_NOT_FOUND)

        if not token_obj.is_valid():
            return Response({
                'error': 'This admission campaign is currently inactive, expired, or has reached max applications limit.',
                'is_valid': False,
                'token': token_str,
                'title': token_obj.title
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = PublicAdmissionVerifySerializer(token_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AuthenticatedOnlineAdmissionApplyView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        user = request.user
        token_str = request.data.get('token', '').strip()
        if not token_str:
            return Response({'error': 'Admission token is required.'}, status=status.HTTP_400_BAD_REQUEST)

        token_obj = AdmissionInviteToken.objects.filter(token__iexact=token_str).select_related('institution', 'target_class', 'target_group').first()
        if not token_obj:
            return Response({'error': 'Invalid admission token.'}, status=status.HTTP_404_NOT_FOUND)

        if not token_obj.is_valid():
            return Response({'error': 'This admission link has expired or reached capacity.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prepare Student Data
        inst = token_obj.institution
        student_data = request.data.get('student', {})
        guardian_data = request.data.get('guardian', {})
        present_address_data = request.data.get('present_address', {})
        permanent_address_data = request.data.get('permanent_address', {})

        # Resolve target class: Token's class or user's requested class
        student_class_id = token_obj.target_class_id or student_data.get('student_class') or request.data.get('student_class')
        student_group_id = token_obj.target_group_id or student_data.get('student_group') or request.data.get('student_group')

        # Create Addresses
        present_addr = None
        if present_address_data and any(present_address_data.values()):
            present_addr = Address.objects.create(
                address_type='PRESENT',
                street_address=present_address_data.get('street_address', ''),
                post_office=present_address_data.get('post_office', ''),
                post_code=present_address_data.get('post_code', ''),
                thana_or_upazila=present_address_data.get('thana_or_upazila', ''),
                district=present_address_data.get('district', ''),
                division=present_address_data.get('division', ''),
                created_by=user
            )

        perm_addr = None
        if permanent_address_data and any(permanent_address_data.values()):
            perm_addr = Address.objects.create(
                address_type='PERMANENT',
                street_address=permanent_address_data.get('perm_street') or permanent_address_data.get('street_address', ''),
                post_office=permanent_address_data.get('perm_post_office') or permanent_address_data.get('post_office', ''),
                post_code=permanent_address_data.get('perm_post_code') or permanent_address_data.get('post_code', ''),
                thana_or_upazila=permanent_address_data.get('perm_thana') or permanent_address_data.get('thana_or_upazila', ''),
                district=permanent_address_data.get('perm_district') or permanent_address_data.get('district', ''),
                division=permanent_address_data.get('perm_division') or permanent_address_data.get('division', ''),
                created_by=user
            )

        # Create Student
        student = Student.objects.create(
            institution=inst,
            name=student_data.get('name', '').strip() or student_data.get('name_en', '').strip(),
            name_en=student_data.get('name', '').strip() or student_data.get('name_en', '').strip(),
            bangla_name=student_data.get('bangla_name', '').strip(),
            gender=student_data.get('gender', 'MALE'),
            dob=student_data.get('dob') or None,
            blood_group=student_data.get('blood_group', ''),
            birth_certificate_no=student_data.get('birth_certificate_no', ''),
            nid_no=student_data.get('nid_no', ''),
            student_class_id=student_class_id,
            student_group_id=student_group_id,
            present_address=present_addr,
            permanent_address=perm_addr,
            admission_date=timezone.now().date(),
            admission_mode='FULL',
            status='Active' if token_obj.auto_enroll else 'Pending',
            created_by=user
        )

        # Create StudentGuardian
        StudentGuardian.objects.create(
            student=student,
            father_name=guardian_data.get('father_name', ''),
            father_phone=guardian_data.get('father_phone', ''),
            father_occupation=guardian_data.get('father_occupation', ''),
            mother_name=guardian_data.get('mother_name', ''),
            mother_phone=guardian_data.get('mother_phone', ''),
            mother_occupation=guardian_data.get('mother_occupation', ''),
            primary_guardian_name=guardian_data.get('primary_guardian_name', '') or guardian_data.get('father_name', ''),
            primary_guardian_phone=guardian_data.get('guardian_phone', '') or guardian_data.get('father_phone', '') or (user.phone_number or ''),
            guardian_relation=guardian_data.get('guardian_relation', 'Father'),
            guardian_nid=guardian_data.get('guardian_nid', ''),
            emergency_contact_phone=guardian_data.get('emergency_contact_phone', '') or guardian_data.get('guardian_phone', ''),
            created_by=user
        )

        # Link GuardianProfile to applicant User if guardian role
        if hasattr(user, 'guardian_profile'):
            user.guardian_profile.students.add(student)
        elif not getattr(user, 'is_staff', False):
            gp, _ = GuardianProfile.objects.get_or_create(user=user, defaults={'name_en': guardian_data.get('primary_guardian_name') or user.name or user.phone_number})
            gp.students.add(student)

        # Increment token applied count
        token_obj.applied_count = F('applied_count') + 1
        token_obj.save(update_fields=['applied_count'])
        token_obj.refresh_from_db()

        return Response({
            'success': True,
            'message': 'Student online admission completed successfully.',
            'receipt': {
                'student_id': student.id,
                'uniq_id': student.uniq_id,
                'name': student.name_en or student.name,
                'bangla_name': student.bangla_name,
                'roll_number': student.roll_number,
                'class_name': student.student_class.name if student.student_class else "General",
                'institution_name': inst.name,
                'admission_date': student.admission_date.strftime('%Y-%m-%d'),
                'session_year': token_obj.session_year,
                'applicant_email': user.email or user.phone_number,
                'status': student.status
            }
        }, status=status.HTTP_201_CREATED)


