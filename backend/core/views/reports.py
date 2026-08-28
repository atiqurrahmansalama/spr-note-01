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

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


class StudentDailyReportViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for StudentDailyReport.
    Automatically excludes soft-deleted reports (status_info__is_deleted=True).
    Supports filtering by: student_name, date (report date), session_name, status.
    """
    serializer_class = StudentDailyReportSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin, HasSectionAccess]
    required_section_key = 'report_builder'
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        params = self.request.query_params
        is_trash = params.get('trash') == 'true' or params.get('is_deleted') == 'true'

        if is_trash:
            qs = (
                StudentDailyReport.objects
                .filter(status_info__is_deleted=True)
                .select_related('student', 'status_info')
                .prefetch_related('portions', 'error_details')
                .order_by('-date', '-created_at')
            )
        else:
            qs = (
                StudentDailyReport.objects
                .filter(Q(status_info__is_deleted=False) | Q(status_info__isnull=True))
                .select_related('student', 'status_info')
                .prefetch_related('portions', 'error_details')
                .order_by('-date', '-created_at')
            )

        # Filter by student_name (case-insensitive contains)
        student_name = params.get('student_name') or params.get('student')
        if student_name:
            qs = qs.filter(student_name__icontains=student_name)

        # Filter by exact report date (YYYY-MM-DD)
        report_date = params.get('report_date') or params.get('date')
        if report_date:
            try:
                qs = qs.filter(date__date=report_date)
            except (ValueError, TypeError):
                pass

        # Filter by start_date and end_date range
        start_date = params.get('start_date')
        end_date = params.get('end_date')
        if start_date:
            try:
                qs = qs.filter(date__date__gte=start_date)
            except (ValueError, TypeError):
                pass
        if end_date:
            try:
                qs = qs.filter(date__date__lte=end_date)
            except (ValueError, TypeError):
                pass

        # Filter by session_name
        session_name = params.get('session_name') or params.get('session')
        if session_name:
            qs = qs.filter(session_name__iexact=session_name)

        # Filter by status
        status_filter = params.get('status')
        if status_filter:
            qs = qs.filter(status__iexact=status_filter)

        # Apply strict Row-Level Isolation (except for Super Admin)
        user = self.request.user
        if not user or not user.is_authenticated:
            return StudentDailyReport.objects.none()

        if not (getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser):
            qs = qs.filter(created_by=user)

        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        report = serializer.save(created_by=user)
        try:
            from core.notifications import notify_report_saved
            notify_report_saved(report, action="CREATED")
        except Exception:
            pass

    def perform_update(self, serializer):
        """Auto-set is_edited and edit_time on any update via ReportStatus."""
        report = serializer.save()
        try:
            from core.notifications import notify_report_saved
            notify_report_saved(report, action="UPDATED")
        except Exception:
            pass

    def destroy(self, request, *args, **kwargs):
        """Soft-delete via ReportStatus instead of hard delete."""
        instance = self.get_object()
        status_obj, _ = ReportStatus.objects.get_or_create(report=instance)
        status_obj.is_deleted = True
        status_obj.delete_time = timezone.now()
        status_obj.save()
        return Response({"status": "Report soft-deleted successfully"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore soft-deleted report."""
        report = StudentDailyReport.objects.filter(pk=pk).first()
        if not report:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)
        status_obj, _ = ReportStatus.objects.get_or_create(report=report)
        status_obj.is_deleted = False
        status_obj.delete_time = None
        status_obj.save()
        return Response({"status": "Report restored successfully"}, status=status.HTTP_200_OK)


class VerifyReportView(APIView):
    """
    GET /api/v1/hifz/verify-report/<report_id>/
    Lightweight public verification endpoint to verify authenticity of a scanned report QR code.
    Returns basic non-sensitive authenticity details.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Verify Report Authenticity (QR Code Scanner)",
        description="Public API endpoint that verifies non-sensitive authenticity details of a scanned Hifz daily report QR code.",
        parameters=[
            OpenApiParameter(
                name="report_id",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description="Report Unique ID (e.g., REP-1001) or numeric ID"
            )
        ],
        responses={
            200: OpenApiResponse(
                description="Valid Report Authenticity Details",
                examples=[
                    OpenApiExample(
                        name="Verified Report Example",
                        value={
                            "status": "success",
                            "verification_status": "VERIFIED",
                            "is_valid": True,
                            "report_unique_id": "REP-1001",
                            "student_name": "Ahmad Hassan",
                            "date": "2026-08-10",
                            "session_name": "Subah",
                            "total_page": 5,
                            "overall_score": 95.0,
                            "report_performance": "Completed",
                            "is_locked": True,
                            "is_deleted": False
                        }
                    )
                ]
            ),
            404: OpenApiResponse(
                description="Report Not Found / Invalid QR Code",
                examples=[
                    OpenApiExample(
                        name="Unverified Report",
                        value={
                            "status": "error",
                            "verification_status": "UNVERIFIED",
                            "is_valid": False,
                            "message": "Report not found or invalid QR code."
                        }
                    )
                ]
            ),
            410: OpenApiResponse(
                description="Soft-Deleted / Revoked Report",
                examples=[
                    OpenApiExample(
                        name="Revoked Report",
                        value={
                            "status": "error",
                            "verification_status": "DELETED",
                            "is_valid": False,
                            "message": "This report has been revoked/deleted."
                        }
                    )
                ]
            )
        }
    )
    def get(self, request, report_id):
        report_id_str = str(report_id).strip()

        # Match report_unique_id or numeric ID
        report = StudentDailyReport.objects.filter(
            Q(report_unique_id__iexact=report_id_str) | Q(id=report_id_str if report_id_str.isdigit() else -1)
        ).select_related('student', 'status_info').first()

        if not report:
            return Response({
                "status": "error",
                "verification_status": "UNVERIFIED",
                "is_valid": False,
                "message": "Report not found or invalid QR code."
            }, status=status.HTTP_404_NOT_FOUND)

        status_obj = getattr(report, 'status_info', None)
        is_deleted = status_obj.is_deleted if status_obj else False
        is_locked = status_obj.is_locked if status_obj else False

        if is_deleted:
            return Response({
                "status": "error",
                "verification_status": "DELETED",
                "is_valid": False,
                "message": "This report has been revoked/deleted."
            }, status=status.HTTP_410_GONE)

        student_name = report.student_name
        if not student_name and report.student:
            student_name = report.student.name_en or report.student.name_bn or report.student.phone_number

        return Response({
            "status": "success",
            "verification_status": "VERIFIED",
            "is_valid": True,
            "report_unique_id": report.report_unique_id,
            "student_name": student_name,
            "date": report.date.strftime("%Y-%m-%d") if report.date else None,
            "session_name": report.session_name,
            "total_page": report.total_page,
            "overall_score": float(report.score) if report.score is not None else None,
            "report_performance": report.status,
            "is_locked": is_locked,
            "is_deleted": is_deleted,
        }, status=status.HTTP_200_OK)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentTemplateConfigSerializer

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return DocumentTemplateConfig.objects.none()

        # Check if templates need seeding for this tenant
        if not DocumentTemplateConfig.objects.filter(institution_id=tenant_id, is_deleted=False).exists():
            from core.services import seed_default_document_templates
            inst = AcademicInstitution.objects.filter(id=tenant_id).first()
            if inst:
                seed_default_document_templates(inst)

        qs = DocumentTemplateConfig.objects.filter(
            institution_id=tenant_id,
            is_deleted=False
        )

        doc_type = self.request.query_params.get('document_type') or self.request.query_params.get('type')
        if doc_type:
            qs = qs.filter(document_type=doc_type.upper())

        return qs.order_by('-is_default', 'template_name')

    def perform_create(self, serializer):
        from rest_framework.exceptions import ValidationError
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise ValidationError({"error": "Active institutional scope is required."})

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            raise ValidationError({"error": "Institution not found."})

        is_default = serializer.validated_data.get('is_default', False)
        doc_type = serializer.validated_data.get('document_type', 'ID_CARD')

        if is_default:
            DocumentTemplateConfig.objects.filter(
                institution=inst,
                document_type=doc_type,
                is_deleted=False
            ).update(is_default=False)

        serializer.save(institution=inst)

    def perform_update(self, serializer):
        is_default = serializer.validated_data.get('is_default', None)
        instance = serializer.instance
        if is_default:
            DocumentTemplateConfig.objects.filter(
                institution=instance.institution,
                document_type=instance.document_type,
                is_deleted=False
            ).exclude(pk=instance.pk).update(is_default=False)

        serializer.save()

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        instance = self.get_object()
        DocumentTemplateConfig.objects.filter(
            institution=instance.institution,
            document_type=instance.document_type,
            is_deleted=False
        ).update(is_default=False)

        instance.is_default = True
        instance.save(update_fields=['is_default', 'updated_at'])

        return Response({
            "status": "success",
            "message": f"Template '{instance.template_name}' set as default for {instance.get_document_type_display()}.",
            "template": DocumentTemplateConfigSerializer(instance).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='by-type')
    def by_type(self, request):
        doc_type = request.query_params.get('type') or request.query_params.get('document_type')
        if not doc_type:
            return Response({"error": "Query param 'type' or 'document_type' is required."}, status=status.HTTP_400_BAD_REQUEST)

        qs = self.get_queryset().filter(document_type=doc_type.upper())
        serializer = self.get_serializer(qs, many=True)
        default_tpl = qs.filter(is_default=True).first()
        return Response({
            "document_type": doc_type.upper(),
            "default_template": DocumentTemplateConfigSerializer(default_tpl).data if default_tpl else None,
            "templates": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='sample-data')
    def sample_data(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first() if tenant_id else None

        sample_student = {
            "id": 9999,
            "uniq_id": "STU-2026-0042",
            "student_id_card_number": "STU-2026-0042",
            "roll_number": "104",
            "name": "Ahmad Abdullah",
            "name_en": "Ahmad Abdullah",
            "bangla_name": "Ahmad Abdullah",
            "father_name": "Abu Bakr",
            "mother_name": "Amena Begum",
            "guardian_name": "Abu Bakr",
            "guardian_phone": "01812-345678",
            "phone_number": "01812-345678",
            "blood_group": "B+",
            "date_of_birth": "2012-05-14",
            "admission_date": "2026-01-10",
            "department_name": "Hifz Division",
            "student_class_name": "Standard Hifz",
            "student_group_name": "Halqa A",
            "division": "Dhaka",
            "district": "Dhaka",
            "upazila_thana": "Mirpur",
            "address": "House #12, Road #4, Sector #7, Uttara, Dhaka",
            "profile_image": None,
            "status": "Active"
        }

        sample_inst = {
            "name": inst.name if inst else "Darul Quran Academy",
            "bangla_name": inst.bangla_name if (inst and inst.bangla_name) else "Darul Quran Academy",
            "logo_url": (inst.logo_url or inst.logo_data) if inst else None,
            "phone": inst.phone if inst else "01700-000000",
            "email": inst.email if inst else "info@darulquran.edu.bd",
            "eiin_or_reg_no": inst.eiin_or_reg_no if inst else "REG-884210",
            "institution_type": inst.institution_type if inst else "MADRASA",
            "address": inst.address if inst else "Uttara Sector 7, Dhaka, Bangladesh",
            "district": inst.district if inst else "Dhaka",
            "principal_name": getattr(inst, 'principal_name', 'Principal / Muhtamim')
        }

        return Response({
            "sample_student": sample_student,
            "institution": sample_inst
        }, status=status.HTTP_200_OK)


class AcademicGoalViewSet(viewsets.ModelViewSet):
    """ViewSet for managing student/curriculum academic goals and milestones."""
    serializer_class = AcademicGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        qs = AcademicGoal.objects.select_related('student', 'institution').all()
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        
        student_id = self.request.query_params.get('student') or self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
        
        goal_status = self.request.query_params.get('status')
        if goal_status and goal_status != 'ALL':
            qs = qs.filter(status=goal_status)
            
        return qs

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first() if tenant_id else None
        serializer.save(institution=inst or AcademicInstitution.objects.first())

    @action(detail=True, methods=['post'], url_path='update-progress')
    def update_progress(self, request, pk=None):
        goal = self.get_object()
        current_progress = request.data.get('current_progress', goal.current_progress)
        notes = request.data.get('notes', goal.notes)
        
        try:
            cur = float(current_progress)
            target = float(goal.target_point)
            pct = min(100.0, round((cur / target) * 100.0, 1)) if target > 0 else 0.0
        except (ValueError, TypeError):
            pct = goal.progress_percentage

        goal.current_progress = str(current_progress)
        goal.progress_percentage = pct
        if notes:
            goal.notes = notes
        if pct >= 100.0:
            goal.status = 'COMPLETED'
            goal.actual_completion_date = timezone.localdate()
            
        goal.save()
        return Response(AcademicGoalSerializer(goal).data, status=status.HTTP_200_OK)


class DailyLessonPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for assigning and managing daily class lessons (পড়া দেওয়া / Sabaq delivery)."""
    serializer_class = DailyLessonPlanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        qs = DailyLessonPlan.objects.select_related(
            'academic_class', 'section', 'student_group', 'teacher', 'period_slot'
        ).prefetch_related('evaluations').all()
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        
        class_id = self.request.query_params.get('class_id') or self.request.query_params.get('academic_class')
        if class_id and class_id != 'ALL':
            qs = qs.filter(academic_class_id=class_id)
            
        section_id = self.request.query_params.get('section_id')
        if section_id and section_id != 'ALL':
            qs = qs.filter(section_id=section_id)
            
        period_slot = self.request.query_params.get('period_slot') or self.request.query_params.get('period_id')
        if period_slot and period_slot != 'ALL':
            qs = qs.filter(period_slot_id=period_slot)

        lesson_date = self.request.query_params.get('date') or self.request.query_params.get('lesson_date')
        if lesson_date:
            qs = qs.filter(lesson_date=lesson_date)
            
        return qs

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first() if tenant_id else None
        serializer.save(institution=inst or AcademicInstitution.objects.first())

    @action(detail=True, methods=['post'], url_path='bulk-evaluate')
    def bulk_evaluate(self, request, pk=None):
        """Record recitation evaluations (পড়া আদায়) for multiple students."""
        lesson_plan = self.get_object()
        evaluations_data = request.data.get('evaluations', [])
        
        created_or_updated = []
        with transaction.atomic():
            for item in evaluations_data:
                student_id = item.get('student_id')
                if not student_id:
                    continue
                
                student = Student.objects.filter(id=student_id).first()
                if not student:
                    continue
                    
                eval_obj, _ = LessonEvaluation.objects.update_or_create(
                    lesson_plan=lesson_plan,
                    student=student,
                    defaults={
                        'student_name': student.name_en or getattr(student, 'name', 'Student'),
                        'evaluation_date': lesson_plan.lesson_date,
                        'evaluation_status': item.get('evaluation_status', 'SATISFACTORY'),
                        'score': float(item.get('score', 10.0)),
                        'max_score': float(item.get('max_score', 10.0)),
                        'total_mistakes': int(item.get('total_mistakes', 0)),
                        'total_stucks': int(item.get('total_stucks', 0)),
                        'fluency_rating': int(item.get('fluency_rating', 5)),
                        'teacher_remarks': item.get('teacher_remarks', ''),
                        'is_synced_to_parent': True,
                    }
                )
                created_or_updated.append(eval_obj)

        return Response({
            "status": "success",
            "message": f"Successfully recorded {len(created_or_updated)} evaluations for '{lesson_plan.lesson_title}'",
            "count": len(created_or_updated)
        }, status=status.HTTP_200_OK)


class LessonEvaluationViewSet(viewsets.ModelViewSet):
    """ViewSet for individual and bulk lesson evaluations (পড়া আদায়)."""
    serializer_class = LessonEvaluationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        qs = LessonEvaluation.objects.select_related('lesson_plan', 'student').all()
        if tenant_id:
            qs = qs.filter(student__institution_id=tenant_id)
            
        student_id = self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
            
        eval_date = self.request.query_params.get('date') or self.request.query_params.get('evaluation_date')
        if eval_date:
            qs = qs.filter(evaluation_date=eval_date)
            
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'ALL':
            qs = qs.filter(evaluation_status=status_filter)
            
        return qs


class HomeworkAssignmentViewSet(viewsets.ModelViewSet):
    """ViewSet for homework creation and distribution."""
    serializer_class = HomeworkAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        qs = HomeworkAssignment.objects.select_related('academic_class', 'section', 'teacher').prefetch_related('submissions').all()
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
            
        class_id = self.request.query_params.get('class_id')
        if class_id and class_id != 'ALL':
            qs = qs.filter(academic_class_id=class_id)
            
        due_date = self.request.query_params.get('due_date')
        if due_date:
            qs = qs.filter(due_date=due_date)
            
        return qs

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first() if tenant_id else None
        serializer.save(institution=inst or AcademicInstitution.objects.first())


class HomeworkSubmissionViewSet(viewsets.ModelViewSet):
    """ViewSet for student homework submissions and grading."""
    serializer_class = HomeworkSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = HomeworkSubmission.objects.select_related('homework', 'student').all()
        homework_id = self.request.query_params.get('homework_id')
        if homework_id:
            qs = qs.filter(homework_id=homework_id)
        student_id = self.request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(student_id=student_id)
        return qs

    @action(detail=True, methods=['post'], url_path='evaluate')
    def evaluate_submission(self, request, pk=None):
        submission = self.get_object()
        submission.obtained_marks = float(request.data.get('obtained_marks', 0.0))
        submission.teacher_feedback = request.data.get('teacher_feedback', '')
        submission.status = 'EVALUATED'
        submission.evaluated_at = timezone.now()
        submission.save()
        return Response(HomeworkSubmissionSerializer(submission).data, status=status.HTTP_200_OK)


class AcademicReportViewSet(viewsets.ViewSet):
    """Centralized multi-period reporting engine (Daily, Weekly, Monthly, Yearly)."""
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['get'], url_path='multi-period-summary')
    def multi_period_summary(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        period_type = request.query_params.get('period_type', 'daily').lower()
        class_id = request.query_params.get('class_id')
        student_id = request.query_params.get('student_id')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Base filters
        eval_qs = LessonEvaluation.objects.select_related('student', 'lesson_plan').all()
        lesson_qs = DailyLessonPlan.objects.all()
        hw_qs = HomeworkAssignment.objects.all()

        if tenant_id:
            lesson_qs = lesson_qs.filter(institution_id=tenant_id)
            hw_qs = hw_qs.filter(institution_id=tenant_id)

        if class_id and class_id != 'ALL':
            lesson_qs = lesson_qs.filter(academic_class_id=class_id)
            hw_qs = hw_qs.filter(academic_class_id=class_id)
            eval_qs = eval_qs.filter(student__student_class_id=class_id)

        if student_id:
            eval_qs = eval_qs.filter(student_id=student_id)

        if start_date and end_date:
            eval_qs = eval_qs.filter(evaluation_date__range=[start_date, end_date])
            lesson_qs = lesson_qs.filter(lesson_date__range=[start_date, end_date])
            hw_qs = hw_qs.filter(due_date__range=[start_date, end_date])

        total_lessons = lesson_qs.count()
        total_evaluations = eval_qs.count()
        total_homeworks = hw_qs.count()

        mastered_count = eval_qs.filter(evaluation_status='MASTERED').count()
        satisfactory_count = eval_qs.filter(evaluation_status='SATISFACTORY').count()
        needs_improvement = eval_qs.filter(evaluation_status='NEEDS_IMPROVEMENT').count()
        unprepared = eval_qs.filter(evaluation_status='UNPREPARED').count()
        absent_count = eval_qs.filter(evaluation_status='ABSENT').count()

        avg_score = eval_qs.aggregate(Avg('score'))['score__avg'] or 0.0
        total_mistakes = eval_qs.aggregate(Sum('total_mistakes'))['total_mistakes__sum'] or 0
        total_stucks = eval_qs.aggregate(Sum('total_stucks'))['total_stucks__sum'] or 0

        mastery_rate = round((mastered_count / total_evaluations * 100.0), 1) if total_evaluations > 0 else 0.0

        return Response({
            "period_type": period_type,
            "filters": {
                "class_id": class_id,
                "student_id": student_id,
                "start_date": start_date,
                "end_date": end_date,
            },
            "metrics": {
                "total_lessons": total_lessons,
                "total_evaluations": total_evaluations,
                "total_homeworks": total_homeworks,
                "mastery_rate": mastery_rate,
                "average_score": round(avg_score, 1),
                "total_mistakes": total_mistakes,
                "total_stucks": total_stucks,
                "mastered_count": mastered_count,
                "satisfactory_count": satisfactory_count,
                "needs_improvement_count": needs_improvement,
                "unprepared_count": unprepared,
                "absent_count": absent_count,
            }
        }, status=status.HTTP_200_OK)


