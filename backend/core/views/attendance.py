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

class AttendanceSlotViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AttendanceSessionSlotSerializer
    queryset = AttendanceSessionSlot.objects.filter(is_deleted=False)

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = AttendanceSessionSlot.objects.filter(is_deleted=False).select_related('institution', 'department', 'student_class')
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(institution_id=user.institution_id)
            else:
                return base_qs.none()

        dept = self.request.query_params.get('department')
        if dept and dept != 'ALL':
            base_qs = base_qs.filter(Q(department_id=dept) | Q(department__isnull=True))

        class_id = self.request.query_params.get('student_class')
        if class_id and class_id != 'ALL':
            base_qs = base_qs.filter(Q(student_class_id=class_id) | Q(student_class__isnull=True))

        return base_qs.order_by('order_rank', 'start_time', 'name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise serializers.ValidationError({"institution": "Active institution scope is required."})
        serializer.save(institution_id=tenant_id)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_deleted = True
        instance.save()
        return Response({"status": "Attendance slot deactivated."}, status=status.HTTP_200_OK)


class StudentAttendanceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentAttendanceSerializer
    queryset = StudentAttendance.objects.all()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = StudentAttendance.objects.select_related(
            'student__student_class', 'student__student_group', 'student__institution', 'session_slot', 'marked_by'
        )
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(student__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(student__institution_id=user.institution_id)
            else:
                return base_qs.none()

        date_str = self.request.query_params.get('date')
        if date_str:
            base_qs = base_qs.filter(date=date_str)

        student_id = self.request.query_params.get('student')
        if student_id:
            base_qs = base_qs.filter(student_id=student_id)

        class_id = self.request.query_params.get('class_id')
        if class_id and class_id != 'ALL':
            base_qs = base_qs.filter(student__student_class_id=class_id)

        group_id = self.request.query_params.get('group_id')
        if group_id and group_id != 'ALL':
            base_qs = base_qs.filter(student__student_group_id=group_id)

        slot_id = self.request.query_params.get('session_slot')
        if slot_id and slot_id != 'ALL':
            base_qs = base_qs.filter(session_slot_id=slot_id)

        status_val = self.request.query_params.get('status')
        if status_val and status_val != 'ALL':
            base_qs = base_qs.filter(status=status_val.upper())

        return base_qs.order_by('student__roll_number', 'student__name')

    @action(detail=False, methods=['post'], url_path='bulk-mark')
    def bulk_mark(self, request):
        serializer = BulkStudentAttendancePunchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        date_val = serializer.validated_data['date']
        top_slot_id = serializer.validated_data.get('period_slot_id') or serializer.validated_data.get('session_slot_id')
        override_holiday = serializer.validated_data.get('override_holiday', False)
        records = serializer.validated_data['records']

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        # Check holiday / weekend if not overriding
        is_holiday = False
        if not override_holiday and tenant_id:
            holiday_event = AcademicCalendarEvent.objects.filter(
                institution_id=tenant_id,
                is_deleted=False,
                start_date__lte=date_val,
                end_date__gte=date_val,
                event_type__in=['PUBLIC_HOLIDAY', 'INSTITUTIONAL_HOLIDAY', 'VACATION'],
                affects_students=True
            ).first()
            if holiday_event:
                is_holiday = True

        created_or_updated = 0
        with transaction.atomic():
            for item in records:
                student_id = item['student_id']
                target_status = 'HOLIDAY_EXCUSED' if (is_holiday and not override_holiday) else item.get('status', 'PRESENT')
                in_time = item.get('in_time')
                remarks = item.get('remarks', '')
                slot_id_val = item.get('period_slot_id') or item.get('session_slot_id') or top_slot_id

                student = Student.objects.filter(id=student_id, is_deleted=False).first()
                if not student:
                    continue

                if tenant_id and student.institution_id and str(student.institution_id) != str(tenant_id):
                    # Tenant isolation check
                    continue

                slot_uuid = None
                if slot_id_val and str(slot_id_val).upper() not in ['ALL', 'DEFAULT', 'NULL', 'NONE', '', 'MAIN']:
                    try:
                        slot_uuid = uuid.UUID(str(slot_id_val))
                    except (ValueError, TypeError):
                        slot_uuid = None

                if slot_uuid:
                    if not DynamicPeriodSlot.objects.filter(id=slot_uuid).exists():
                        cps = ClassPeriodSlot.objects.filter(id=slot_uuid).first()
                        if cps:
                            try:
                                DynamicPeriodSlot.objects.create(
                                    id=cps.id,
                                    institution_id=cps.institution_id,
                                    department_id=cps.department_id,
                                    student_class_id=cps.student_class_id,
                                    period_name=cps.period_name,
                                    period_order=cps.period_order,
                                    start_time=cps.start_time,
                                    end_time=cps.end_time,
                                    is_active=cps.is_active,
                                    is_deleted=cps.is_deleted
                                )
                            except Exception:
                                slot_uuid = None
                        else:
                            slot_uuid = None

                # If status is cleared / unmarked
                if not target_status or str(target_status).upper() in ['', 'UNMARKED', 'CLEAR', 'NONE', 'NULL', 'DELETE']:
                    if slot_uuid:
                        StudentAttendance.objects.filter(student=student, period_slot_id=slot_uuid, date=date_val).delete()
                    else:
                        StudentAttendance.objects.filter(student=student, period_slot__isnull=True, date=date_val).delete()
                    created_or_updated += 1
                    continue

                # Validate valid choice
                valid_choices = [c[0] for c in StudentAttendance.ATTENDANCE_STATUS_CHOICES]
                clean_status = str(target_status).upper()
                if clean_status not in valid_choices:
                    clean_status = 'PRESENT'

                conductor_teacher = None
                if request.user.is_authenticated and hasattr(request.user, 'teacher_profile'):
                    conductor_teacher = request.user.teacher_profile

                if slot_uuid:
                    existing = StudentAttendance.objects.filter(student=student, period_slot_id=slot_uuid, date=date_val).first()
                else:
                    existing = StudentAttendance.objects.filter(student=student, period_slot__isnull=True, date=date_val).first()

                if existing:
                    existing.status = clean_status
                    existing.student_class = student.student_class
                    existing.in_time = in_time
                    existing.remarks = remarks
                    if conductor_teacher:
                        existing.taken_by_teacher = conductor_teacher
                    if request.user.is_authenticated:
                        existing.marked_by = request.user
                    existing.source = 'WEB_PORTAL'
                    existing.save()
                else:
                    StudentAttendance.objects.create(
                        student=student,
                        period_slot_id=slot_uuid,
                        date=date_val,
                        status=clean_status,
                        student_class=student.student_class,
                        in_time=in_time,
                        remarks=remarks,
                        taken_by_teacher=conductor_teacher,
                        marked_by=request.user if request.user.is_authenticated else None,
                        source='WEB_PORTAL'
                    )
                created_or_updated += 1

        return Response({
            "status": "success",
            "message": f"Recorded attendance for {created_or_updated} students.",
            "count": created_or_updated,
            "date": str(date_val),
            "is_holiday_excused": is_holiday and not override_holiday
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='monthly-matrix')
    def monthly_matrix(self, request):
        class_id = request.query_params.get('class_id')
        group_id = request.query_params.get('group_id')
        slot_id = request.query_params.get('session_slot_id') or request.query_params.get('period_slot_id')
        teacher_id = request.query_params.get('teacher_id') or request.query_params.get('teacher')
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        try:
            year = int(request.query_params.get('year', timezone.localdate().year))
            month = int(request.query_params.get('month', timezone.localdate().month))
        except ValueError:
            year = timezone.localdate().year
            month = timezone.localdate().month

        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                year = start_date.year
                month = start_date.month
            except ValueError:
                num_days = calendar.monthrange(year, month)[1]
                start_date = date(year, month, 1)
                end_date = date(year, month, num_days)
        else:
            num_days = calendar.monthrange(year, month)[1]
            start_date = date(year, month, 1)
            end_date = date(year, month, num_days)

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        students_qs = Student.objects.filter(is_deleted=False).select_related('student_class', 'student_group')
        if tenant_id:
            students_qs = students_qs.filter(institution_id=tenant_id)
        if class_id and class_id != 'ALL':
            students_qs = students_qs.filter(student_class_id=class_id)
        if group_id and group_id != 'ALL':
            students_qs = students_qs.filter(student_group_id=group_id)

        students = list(students_qs.order_by('roll_number', 'name'))

        # Fetch configured period slots for this class / institution
        periods_qs = ClassPeriodSlot.objects.filter(is_deleted=False).select_related('teacher', 'teacher__user')
        if tenant_id:
            periods_qs = periods_qs.filter(institution_id=tenant_id)

        if class_id and class_id != 'ALL':
            class_periods = list(periods_qs.filter(student_class_id=class_id).order_by('period_order', 'start_time'))
            if class_periods:
                period_slots = class_periods
            else:
                period_slots = list(periods_qs.filter(student_class__isnull=True).order_by('period_order', 'start_time'))
        else:
            period_slots = list(periods_qs.order_by('period_order', 'start_time'))

        if slot_id and slot_id != 'ALL':
            period_slots = [p for p in period_slots if str(p.id) == str(slot_id)]

        if teacher_id and teacher_id != 'ALL':
            period_slots = [p for p in period_slots if p.teacher_id and str(p.teacher_id) == str(teacher_id)]

        att_qs = StudentAttendance.objects.filter(
            student__in=students,
            date__gte=start_date,
            date__lte=end_date
        )

        att_map = {}
        for att in att_qs:
            p_id = str(att.period_slot_id) if att.period_slot_id else (str(att.session_slot_id) if att.session_slot_id else 'DEFAULT')
            key = f"{att.student_id}_{p_id}"
            if key not in att_map:
                att_map[key] = {}
            date_str = att.date.isoformat()
            att_map[key][date_str] = att.status
            att_map[key][att.date.day] = att.status

            # Only record under DEFAULT if this attendance was not for a specific period
            if p_id == 'DEFAULT':
                s_key = f"{att.student_id}_DEFAULT"
                if s_key not in att_map:
                    att_map[s_key] = {}
                att_map[s_key][date_str] = att.status
                att_map[s_key][att.date.day] = att.status

        holidays = []
        if tenant_id:
            holidays = list(AcademicCalendarEvent.objects.filter(
                institution_id=tenant_id,
                is_deleted=False,
                start_date__lte=end_date,
                end_date__gte=start_date,
                event_type__in=['PUBLIC_HOLIDAY', 'INSTITUTIONAL_HOLIDAY', 'VACATION']
            ))

        policy = AttendancePolicySetting.objects.filter(institution_id=tenant_id).first() if tenant_id else None
        weekend_days = policy.weekend_days if (policy and policy.weekend_days is not None) else ['FRIDAY']

        days_header = []
        curr_d = start_date
        while curr_d <= end_date:
            weekday_str = curr_d.strftime('%a').upper()
            is_weekend = curr_d.strftime('%A').upper() in weekend_days
            matching_holiday = next((h for h in holidays if h.start_date <= curr_d <= h.end_date), None)

            days_header.append({
                "date": curr_d.isoformat(),
                "day": curr_d.day,
                "month": curr_d.month,
                "year": curr_d.year,
                "weekday": weekday_str,
                "is_weekend": is_weekend,
                "is_holiday": is_weekend or bool(matching_holiday),
                "holiday_title": matching_holiday.title if matching_holiday else ("Weekend" if is_weekend else "")
            })
            curr_d += timedelta(days=1)

        # Build periods map grouped by student_class_id for fast and accurate student-level resolution
        class_slots_map = {}
        for p in period_slots:
            class_slots_map.setdefault(p.student_class_id, []).append(p)
        global_slots = class_slots_map.get(None, [])

        matrix_rows = []
        default_slots = period_slots if len(period_slots) > 0 else [None]

        for s in students:
            if class_id and class_id != 'ALL':
                s_slots_to_iterate = period_slots if len(period_slots) > 0 else [None]
            else:
                s_slots = class_slots_map.get(s.student_class_id, global_slots)
                s_slots_to_iterate = s_slots if len(s_slots) > 0 else [None]

            for p_idx, slot in enumerate(s_slots_to_iterate):
                slot_id_str = str(slot.id) if slot else 'DEFAULT'
                if slot:
                    s_map = att_map.get(f"{s.id}_{slot_id_str}", {})
                else:
                    s_map = att_map.get(f"{s.id}_DEFAULT", {})

                # Compute totals across the requested date span
                p_count = 0
                l_count = 0
                a_count = 0
                hd_count = 0
                lv_count = 0
                hol_count = 0

                for d_info in days_header:
                    d_key = d_info["date"]
                    st = s_map.get(d_key) or s_map.get(d_info["day"])
                    if st == 'PRESENT':
                        p_count += 1
                    elif st == 'LATE':
                        l_count += 1
                    elif st == 'ABSENT':
                        a_count += 1
                    elif st == 'HALF_DAY':
                        hd_count += 1
                    elif st == 'ON_LEAVE':
                        lv_count += 1
                    elif st == 'HOLIDAY_EXCUSED':
                        hol_count += 1

                total_recorded = p_count + l_count + a_count + hd_count + lv_count
                effective_present = p_count + l_count + (hd_count * 0.5)
                attendance_rate = round((effective_present / total_recorded * 100), 1) if total_recorded > 0 else 0.0

                t_name = ''
                t_desig = ''
                if slot and slot.teacher:
                    if slot.teacher.user:
                        t_name = slot.teacher.user.name or slot.teacher.user.name_en or f"{slot.teacher.user.first_name} {slot.teacher.user.last_name}".strip()
                    t_desig = slot.teacher.designation or ''

                matrix_rows.append({
                    "row_key": f"{s.id}_{slot_id_str}",
                    "student_id": s.id,
                    "name": s.name or s.name_en or 'Student',
                    "roll_number": s.roll_number,
                    "class_name": s.student_class.name if s.student_class else '',
                    "group_name": s.student_group.name if s.student_group else '',
                    "period_slot_id": slot_id_str if slot else None,
                    "period_name": slot.period_name if slot else 'General Routine',
                    "period_order": slot.period_order if slot else (p_idx + 1),
                    "start_time": str(slot.start_time)[:5] if (slot and slot.start_time) else None,
                    "end_time": str(slot.end_time)[:5] if (slot and slot.end_time) else None,
                    "duration_minutes": slot.duration_minutes if slot else None,
                    "teacher_id": str(slot.teacher_id) if (slot and slot.teacher_id) else None,
                    "teacher_name": t_name,
                    "teacher_designation": t_desig,
                    "period_count": len(s_slots_to_iterate),
                    "period_index": p_idx,
                    "daily_statuses": s_map,
                    "totals": {
                        "present": p_count,
                        "late": l_count,
                        "absent": a_count,
                        "half_day": hd_count,
                        "on_leave": lv_count,
                        "holiday_excused": hol_count,
                        "total_recorded": total_recorded,
                        "attendance_rate": attendance_rate
                    }
                })

        return Response({
            "year": year,
            "month": month,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_days": len(days_header),
            "days_header": days_header,
            "students_matrix": matrix_rows,
            "total_students": len(students),
            "period_count": len(period_slots),
            "periods": [
                {
                    "id": str(p.id),
                    "name": p.period_name,
                    "order": p.period_order,
                    "start_time": str(p.start_time)[:5] if p.start_time else "",
                    "end_time": str(p.end_time)[:5] if p.end_time else "",
                    "teacher_id": str(p.teacher_id) if p.teacher_id else None,
                    "teacher_name": (p.teacher.user.name or p.teacher.user.name_en or f"{p.teacher.user.first_name} {p.teacher.user.last_name}".strip()) if (p.teacher and p.teacher.user) else "",
                }
                for p in period_slots
            ]
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='teacher-monthly-matrix')
    def teacher_monthly_matrix(self, request):
        dept_id = request.query_params.get('department_id') or request.query_params.get('department')
        class_id = request.query_params.get('class_id')
        teacher_id = request.query_params.get('teacher_id') or request.query_params.get('teacher')
        start_date_param = request.query_params.get('start_date')
        end_date_param = request.query_params.get('end_date')

        try:
            year = int(request.query_params.get('year', timezone.localdate().year))
            month = int(request.query_params.get('month', timezone.localdate().month))
        except ValueError:
            year = timezone.localdate().year
            month = timezone.localdate().month

        if start_date_param and end_date_param:
            try:
                start_date = datetime.strptime(start_date_param, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
                year = start_date.year
                month = start_date.month
            except ValueError:
                num_days = calendar.monthrange(year, month)[1]
                start_date = date(year, month, 1)
                end_date = date(year, month, num_days)
        else:
            num_days = calendar.monthrange(year, month)[1]
            start_date = date(year, month, 1)
            end_date = date(year, month, num_days)

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        # 1. Query teaching staff
        teachers_qs = StaffProfile.objects.filter(
            is_deleted=False,
            is_active=True
        ).filter(
            Q(staff_type='TEACHING') |
            Q(designation__icontains='Teacher') |
            Q(designation__icontains='Ustadh') |
            Q(designation__icontains='Muallim') |
            Q(designation__icontains='Qari') |
            Q(designation__icontains='Faculty')
        ).select_related('user', 'department', 'institution')

        if tenant_id:
            teachers_qs = teachers_qs.filter(institution_id=tenant_id)
        if dept_id and dept_id != 'ALL':
            teachers_qs = teachers_qs.filter(department_id=dept_id)
        if teacher_id and teacher_id != 'ALL':
            teachers_qs = teachers_qs.filter(id=teacher_id)

        teachers = list(teachers_qs.order_by('rank_order', 'employee_id'))

        # 2. Query configured period slots
        slots_qs = ClassPeriodSlot.objects.filter(
            is_deleted=False,
            is_active=True
        ).select_related('student_class', 'department', 'teacher', 'teacher__user')

        if tenant_id:
            slots_qs = slots_qs.filter(institution_id=tenant_id)
        if class_id and class_id != 'ALL':
            slots_qs = slots_qs.filter(student_class_id=class_id)

        teacher_slots_map = {}
        for slot in slots_qs:
            if slot.teacher_id:
                teacher_slots_map.setdefault(str(slot.teacher_id), []).append(slot)

        # 3. Query student attendances within date range
        att_qs = StudentAttendance.objects.filter(
            date__gte=start_date,
            date__lte=end_date
        )
        if tenant_id:
            att_qs = att_qs.filter(student__institution_id=tenant_id)

        conducted_period_statuses = {}
        conducted_general_class_statuses = {}
        conducted_teacher_direct_statuses = {}
        for att in att_qs:
            d_str = att.date.isoformat()
            if att.period_slot_id:
                conducted_period_statuses.setdefault((str(att.period_slot_id), d_str), []).append(att.status)
            if att.student_class_id:
                conducted_general_class_statuses.setdefault((str(att.student_class_id), d_str), []).append(att.status)
            elif att.student and att.student.student_class_id:
                conducted_general_class_statuses.setdefault((str(att.student.student_class_id), d_str), []).append(att.status)
            if att.taken_by_teacher_id:
                conducted_teacher_direct_statuses.setdefault((str(att.taken_by_teacher_id), d_str), []).append(att.status)

        # 4. Holidays & Weekends
        holidays = []
        if tenant_id:
            holidays = list(AcademicCalendarEvent.objects.filter(
                institution_id=tenant_id,
                is_deleted=False,
                start_date__lte=end_date,
                end_date__gte=start_date,
                event_type__in=['PUBLIC_HOLIDAY', 'INSTITUTIONAL_HOLIDAY', 'VACATION']
            ))

        policy = AttendancePolicySetting.objects.filter(institution_id=tenant_id).first() if tenant_id else None
        weekend_days = policy.weekend_days if (policy and policy.weekend_days is not None) else ['FRIDAY']

        days_header = []
        curr_d = start_date

        while curr_d <= end_date:
            weekday_str = curr_d.strftime('%a').upper()
            is_weekend = curr_d.strftime('%A').upper() in weekend_days
            matching_holiday = next((h for h in holidays if h.start_date <= curr_d <= h.end_date), None)

            days_header.append({
                "date": curr_d.isoformat(),
                "day": curr_d.day,
                "month": curr_d.month,
                "year": curr_d.year,
                "weekday": weekday_str,
                "is_weekend": is_weekend,
                "is_holiday": is_weekend or bool(matching_holiday),
                "holiday_title": matching_holiday.title if matching_holiday else ("Weekend" if is_weekend else "")
            })
            curr_d += timedelta(days=1)

        # 5. Build Teacher Matrix Rows
        matrix_rows = []
        for t_idx, teacher in enumerate(teachers):
            assigned_slots = teacher_slots_map.get(str(teacher.id), [])
            if assigned_slots:
                assigned_slots.sort(key=lambda s: (s.period_order or 0, str(s.start_time or '')))
                slots_to_iterate = assigned_slots
            else:
                slots_to_iterate = [None]

            t_name = teacher.user.name if (teacher.user and teacher.user.name) else teacher.employee_id
            t_desig = teacher.designation or 'Faculty Teacher'
            t_dept = teacher.department.name if teacher.department else 'General Academic'

            for p_idx, slot in enumerate(slots_to_iterate):
                slot_id_str = str(slot.id) if slot else 'DEFAULT'
                daily_statuses = {}

                p_count = 0
                l_count = 0
                a_count = 0
                hol_count = 0

                for d_info in days_header:
                    d_key = d_info["date"]

                    if d_info["is_holiday"]:
                        hol_count += 1
                        daily_statuses[d_key] = 'HOLIDAY_EXCUSED'
                    else:
                        statuses = []
                        if slot and slot_id_str != 'DEFAULT':
                            # 1. Strictly match this teacher's specific assigned period slot
                            if (slot_id_str, d_key) in conducted_period_statuses:
                                statuses = conducted_period_statuses[(slot_id_str, d_key)]
                            elif (str(teacher.id), d_key) in conducted_teacher_direct_statuses:
                                statuses = conducted_teacher_direct_statuses[(str(teacher.id), d_key)]
                            elif slot.student_class_id and (str(slot.student_class_id), d_key) in conducted_general_class_statuses:
                                statuses = conducted_general_class_statuses[(str(slot.student_class_id), d_key)]
                        else:
                            # 2. General teaching staff without dedicated period slots
                            if (str(teacher.id), d_key) in conducted_teacher_direct_statuses:
                                statuses = conducted_teacher_direct_statuses[(str(teacher.id), d_key)]
                            elif slot and slot.student_class_id and (str(slot.student_class_id), d_key) in conducted_general_class_statuses:
                                statuses = conducted_general_class_statuses[(str(slot.student_class_id), d_key)]
                            elif (None, d_key) in conducted_general_class_statuses:
                                statuses = conducted_general_class_statuses[(None, d_key)]

                        if statuses:
                            if any(st in ['PRESENT', 'HALF_DAY'] for st in statuses):
                                p_count += 1
                                daily_statuses[d_key] = 'PRESENT'
                            elif any(st == 'LATE' for st in statuses):
                                l_count += 1
                                daily_statuses[d_key] = 'LATE'
                            elif all(st == 'ON_LEAVE' for st in statuses):
                                daily_statuses[d_key] = 'ON_LEAVE'
                            elif all(st == 'ABSENT' for st in statuses):
                                # If all students were marked absent in roll-call, teacher conducted the period
                                p_count += 1
                                daily_statuses[d_key] = 'PRESENT'
                            else:
                                p_count += 1
                                daily_statuses[d_key] = 'PRESENT'
                        else:
                            # If date is in the past (< today) and period was unconducted: auto-resolve to ABSENT
                            today_iso = timezone.localdate().isoformat()
                            if d_key < today_iso and not d_info["is_holiday"]:
                                a_count += 1
                                daily_statuses[d_key] = 'ABSENT'
                            else:
                                daily_statuses[d_key] = ''

                total_recorded = p_count + l_count + a_count
                conduction_rate = round((p_count + l_count) / total_recorded * 100, 1) if total_recorded > 0 else 100.0

                desc_parts = []
                if slot:
                    if slot.start_time and slot.end_time:
                        desc_parts.append(f"{str(slot.start_time)[:5]} - {str(slot.end_time)[:5]}")
                    if slot.period_name:
                        desc_parts.append(slot.period_name)
                    if slot.student_class:
                        desc_parts.append(f"({slot.student_class.name})")
                desc_str = " • ".join(desc_parts) if desc_parts else t_dept

                matrix_rows.append({
                    "row_key": f"{teacher.id}_{slot_id_str}",
                    "teacher_id": str(teacher.id),
                    "id": str(teacher.id),
                    "roll_number": str(t_idx + 1),
                    "name": t_name,
                    "sub_title": t_desig,
                    "department_name": desc_str,
                    "class_name": slot.student_class.name if (slot and slot.student_class) else '',
                    "period_name": slot.period_name if slot else 'General Routine',
                    "period_slot_id": slot_id_str if slot else None,
                    "period_order": slot.period_order if slot else (p_idx + 1),
                    "start_time": str(slot.start_time)[:5] if (slot and slot.start_time) else None,
                    "end_time": str(slot.end_time)[:5] if (slot and slot.end_time) else None,
                    "period_count": len(slots_to_iterate),
                    "period_index": p_idx,
                    "daily_statuses": daily_statuses,
                    "totals": {
                        "present": p_count,
                        "late": l_count,
                        "absent": a_count,
                        "half_day": 0,
                        "leave": 0,
                        "total_recorded": total_recorded,
                        "conduction_rate": conduction_rate,
                        "attendance_rate": conduction_rate,
                    }
                })

        return Response({
            "year": year,
            "month": month,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_days": len(days_header),
            "days_header": days_header,
            "teachers_matrix": matrix_rows,
            "total_teachers": len(teachers),
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='daily-summary')
    def daily_summary(self, request):
        date_str = request.query_params.get('date', str(timezone.localdate()))
        class_id = request.query_params.get('class_id')
        group_id = request.query_params.get('group_id')
        slot_id = request.query_params.get('session_slot_id')

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        qs = StudentAttendance.objects.filter(date=date_str)
        if tenant_id:
            qs = qs.filter(student__institution_id=tenant_id)
        if class_id and class_id != 'ALL':
            qs = qs.filter(student__student_class_id=class_id)
        if group_id and group_id != 'ALL':
            qs = qs.filter(student__student_group_id=group_id)
        if slot_id and slot_id != 'ALL':
            qs = qs.filter(session_slot_id=slot_id)

        present = qs.filter(status='PRESENT').count()
        late = qs.filter(status='LATE').count()
        absent = qs.filter(status='ABSENT').count()
        half_day = qs.filter(status='HALF_DAY').count()
        on_leave = qs.filter(status='ON_LEAVE').count()
        holiday = qs.filter(status='HOLIDAY_EXCUSED').count()

        total = present + late + absent + half_day + on_leave
        rate = round(((present + late + (half_day * 0.5)) / total * 100), 1) if total > 0 else 0.0

        return Response({
            "date": date_str,
            "present": present,
            "late": late,
            "absent": absent,
            "half_day": half_day,
            "on_leave": on_leave,
            "holiday_excused": holiday,
            "total_recorded": total,
            "attendance_rate": rate
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='period-roll-call')
    def period_roll_call(self, request):
        serializer = StudentPeriodRollCallSerializer(data=request.data)
        if not serializer.is_valid():
            print("PERIOD_ROLL_CALL VALIDATION ERRORS:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        date_val = serializer.validated_data['date']
        period_slot_id = serializer.validated_data['period_slot_id']
        class_id = serializer.validated_data.get('class_id')
        group_id = serializer.validated_data.get('group_id')
        taken_by_teacher_id = serializer.validated_data.get('taken_by_teacher_id')
        substitute_teacher_id = serializer.validated_data.get('substitute_teacher_id')
        records = serializer.validated_data['records']

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        period_slot = DynamicPeriodSlot.objects.filter(id=period_slot_id, is_deleted=False).first()
        if not period_slot:
            return Response({"error": "Invalid or missing dynamic period slot."}, status=status.HTTP_400_BAD_REQUEST)

        teacher_obj = TeacherProfile.objects.filter(id=taken_by_teacher_id).first() if taken_by_teacher_id else None
        substitute_obj = TeacherProfile.objects.filter(id=substitute_teacher_id).first() if substitute_teacher_id else None

        created_or_updated = 0
        with transaction.atomic():
            for item in records:
                student_id = item['student_id']
                student = Student.objects.filter(id=student_id, is_deleted=False).first()
                if not student:
                    continue

                if tenant_id and student.institution_id and str(student.institution_id) != str(tenant_id):
                    continue

                StudentAttendance.objects.update_or_create(
                    student=student,
                    period_slot=period_slot,
                    date=date_val,
                    defaults={
                        'student_class': student.student_class,
                        'status': item.get('status', 'PRESENT'),
                        'in_time': item.get('in_time'),
                        'out_time': item.get('out_time'),
                        'taken_by_teacher': teacher_obj,
                        'substitute_teacher': substitute_obj,
                        'remarks': item.get('remarks', ''),
                        'marked_by': request.user if request.user.is_authenticated else None,
                        'source': 'PERIOD_ROLL_CALL'
                    }
                )
                created_or_updated += 1

            # Auto-sync Teacher Period Attendance Record if routine schedule exists
            if teacher_obj or substitute_obj:
                routine_query = TeacherRoutineSchedule.objects.filter(
                    period_slot=period_slot,
                    is_active=True
                )
                if class_id:
                    routine_query = routine_query.filter(student_class_id=class_id)
                if teacher_obj:
                    routine_query = routine_query.filter(teacher=teacher_obj)

                routine = routine_query.first()
                if routine:
                    att_status = 'SUBSTITUTED' if substitute_obj else 'PRESENT'
                    TeacherPeriodAttendanceRecord.objects.update_or_create(
                        schedule=routine,
                        date=date_val,
                        defaults={
                            'institution_id': routine.institution_id,
                            'teacher': routine.teacher,
                            'substitute_teacher': substitute_obj,
                            'status': att_status,
                            'is_conducted': True,
                            'marked_by': request.user if request.user.is_authenticated else None
                        }
                    )

        return Response({
            "status": "success",
            "message": f"Recorded period roll call for {created_or_updated} students.",
            "count": created_or_updated,
            "period_slot": period_slot.period_name,
            "date": str(date_val)
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='bunk-discrepancy')
    def bunk_discrepancy(self, request):
        date_str = request.query_params.get('date', str(timezone.localdate()))
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except Exception:
            target_date = timezone.localdate()

        gate_entries = GateEntryExitLog.objects.filter(
            direction='ENTRY',
            punch_time__date=target_date,
            student__isnull=False
        ).select_related('student', 'student__student_class')

        if tenant_id:
            gate_entries = gate_entries.filter(institution_id=tenant_id)

        entered_student_ids = list(gate_entries.values_list('student_id', flat=True).distinct())

        absent_records = StudentAttendance.objects.filter(
            student_id__in=entered_student_ids,
            date=target_date,
            status='ABSENT'
        ).select_related('student', 'student__student_class', 'period_slot')

        discrepancy_list = []
        for rec in absent_records:
            gate_log = gate_entries.filter(student_id=rec.student_id).first()
            discrepancy_list.append({
                "student_id": rec.student_id,
                "student_name": rec.student.name,
                "roll_number": rec.student.roll_number,
                "class_name": rec.student.student_class.name if rec.student.student_class else '',
                "gate_entry_time": gate_log.punch_time.strftime('%I:%M %p') if gate_log else 'Gate Checked In',
                "missed_period_name": rec.period_slot.period_name if rec.period_slot else 'Class Period',
                "date": str(rec.date),
                "remarks": rec.remarks or "Gate Entry Logged, but marked ABSENT in classroom."
            })

        return Response({
            "date": str(target_date),
            "total_discrepancies": len(discrepancy_list),
            "discrepancies": discrepancy_list
        }, status=status.HTTP_200_OK)


def gregorian_to_hijri(date_obj):
    try:
        y, m, d = date_obj.year, date_obj.month, date_obj.day
        if m < 3:
            y -= 1
            m += 12
        a = int(y / 100)
        b = 2 - a + int(a / 4)
        jd = int(365.25 * (y + 4716)) + int(30.6001 * (m + 1)) + d + b - 1524.5
        l = jd - 1948440 + 10632
        n = int((l - 1) / 10631)
        l = l - 10631 * n + 354
        j = (int((10985 - l) / 5316)) * (int((50 * l) / 17719)) + (int(l / 5670)) * (int((43 * l) / 15238))
        l = l - (int((30 - j) / 15)) * (int((17719 * j) / 50)) - (int(j / 16)) * (int((15238 * j) / 43)) + 29
        m_h = int((24 * l) / 709)
        d_h = int(l - int((709 * m_h) / 24))
        y_h = int(30 * n + j - 30)

        HIJRI_MONTHS = [
            "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' al-Thani",
            "Jumada al-Awwal", "Jumada al-Thani", "Rajab", "Sha'ban",
            "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
        ]
        month_idx = max(0, min(11, m_h - 1))
        return {
            "day": d_h,
            "month_number": m_h,
            "month_name": HIJRI_MONTHS[month_idx],
            "year": y_h,
            "formatted": f"{d_h} {HIJRI_MONTHS[month_idx]}"
        }
    except Exception:
        return {"day": date_obj.day, "month_number": 1, "month_name": "Hijri", "year": 1448, "formatted": f"{date_obj.day} Hijri"}


class TeacherMatrixViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        try:
            year = int(request.query_params.get('year', timezone.localdate().year))
            month = int(request.query_params.get('month', timezone.localdate().month))
        except ValueError:
            year = timezone.localdate().year
            month = timezone.localdate().month

        import calendar
        num_days = calendar.monthrange(year, month)[1]
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)

        routines_qs = TeacherRoutineSchedule.objects.filter(is_active=True).select_related(
            'teacher', 'period_slot', 'student_class', 'student_group'
        ).order_by('teacher__name_en', 'period_slot__period_order', 'student_class__name')

        if tenant_id:
            routines_qs = routines_qs.filter(institution_id=tenant_id)

        teacher_id_filter = request.query_params.get('teacher_id')
        if teacher_id_filter and teacher_id_filter != 'ALL':
            routines_qs = routines_qs.filter(teacher_id=teacher_id_filter)

        class_id_filter = request.query_params.get('class_id')
        if class_id_filter and class_id_filter != 'ALL':
            routines_qs = routines_qs.filter(student_class_id=class_id_filter)

        routines = list(routines_qs)

        att_qs = TeacherPeriodAttendanceRecord.objects.filter(
            schedule__in=routines,
            date__gte=start_date,
            date__lte=end_date
        ).select_related('teacher', 'substitute_teacher')

        att_map = {}
        for att in att_qs:
            if att.schedule_id not in att_map:
                att_map[att.schedule_id] = {}
            sub_name = att.substitute_teacher.name_en if att.substitute_teacher else ''
            att_map[att.schedule_id][att.date.day] = {
                "id": str(att.id),
                "status": att.status,
                "is_conducted": att.is_conducted,
                "substitute_teacher_id": att.substitute_teacher_id,
                "substitute_teacher_name": sub_name,
                "remarks": att.remarks
            }

        holidays = []
        if tenant_id:
            holidays = list(AcademicCalendarEvent.objects.filter(
                institution_id=tenant_id,
                is_deleted=False,
                start_date__lte=end_date,
                end_date__gte=start_date,
                event_type__in=['PUBLIC_HOLIDAY', 'INSTITUTIONAL_HOLIDAY', 'VACATION']
            ))

        policy = AttendancePolicySetting.objects.filter(institution_id=tenant_id).first() if tenant_id else None
        weekend_days = policy.weekend_days if (policy and policy.weekend_days is not None) else ['FRIDAY']

        days_header = []
        for day in range(1, num_days + 1):
            d = date(year, month, day)
            weekday_str = d.strftime('%a').upper()
            weekday_full = d.strftime('%A').upper()
            is_friday = weekday_full == 'FRIDAY'
            is_weekend = weekday_full in weekend_days
            matching_holiday = next((h for h in holidays if h.start_date <= d <= h.end_date), None)
            hijri_info = gregorian_to_hijri(d)

            days_header.append({
                "day": day,
                "date_str": str(d),
                "weekday": weekday_str,
                "is_friday": is_friday,
                "is_weekend": is_weekend,
                "is_holiday": is_weekend or bool(matching_holiday),
                "holiday_title": matching_holiday.title if matching_holiday else ("Friday / Weekend" if is_weekend else ""),
                "hijri_day": hijri_info["day"],
                "hijri_month": hijri_info["month_name"],
                "hijri_year": hijri_info["year"],
                "hijri_formatted": hijri_info["formatted"]
            })

        teacher_grouped = {}
        for r in routines:
            t_id = r.teacher_id
            if t_id not in teacher_grouped:
                teacher_grouped[t_id] = {
                    "teacher_id": t_id,
                    "teacher_name": r.teacher.name_en or (r.teacher.user.phone_number if r.teacher.user else f"Teacher #{t_id}"),
                    "designation": r.teacher.designation or "Teacher",
                    "rows": []
                }

            s_map = att_map.get(r.id, {})
            present_cnt = 0
            absent_cnt = 0
            for d in range(1, num_days + 1):
                cell = s_map.get(d)
                if cell:
                    if cell['status'] in ['PRESENT', 'SUBSTITUTED'] and cell['is_conducted']:
                        present_cnt += 1
                    elif cell['status'] in ['ABSENT', 'LEAVE']:
                        absent_cnt += 1

            start_t = r.period_slot.start_time.strftime('%I:%M %p') if r.period_slot.start_time else ''
            end_t = r.period_slot.end_time.strftime('%I:%M %p') if r.period_slot.end_time else ''
            time_display = f"{start_t} - {end_t}" if start_t and end_t else ""

            teacher_grouped[t_id]["rows"].append({
                "schedule_id": str(r.id),
                "period_slot_id": str(r.period_slot_id),
                "period_name": r.period_slot.period_name,
                "period_order": r.period_slot.period_order,
                "time_display": time_display,
                "class_id": r.student_class_id,
                "class_name": r.student_class.name,
                "group_name": r.student_group.name if r.student_group else '',
                "subject_or_kitab_name": r.subject_or_kitab_name,
                "room_number": r.room_number,
                "daily_statuses": s_map,
                "present_count": present_cnt,
                "absent_count": absent_cnt,
                "total_scheduled": present_cnt + absent_cnt
            })

        matrix_teachers = list(teacher_grouped.values())

        daily_class_counts = {}
        monthly_grand_total = 0
        for day in range(1, num_days + 1):
            day_classes = 0
            for r in routines:
                cell = att_map.get(r.id, {}).get(day)
                if cell and cell['status'] in ['PRESENT', 'SUBSTITUTED'] and cell['is_conducted']:
                    day_classes += 1
            daily_class_counts[day] = day_classes
            monthly_grand_total += day_classes

        first_hijri = days_header[0]["hijri_month"] if days_header else ""
        last_hijri = days_header[-1]["hijri_month"] if days_header else ""
        hijri_month_span = first_hijri if first_hijri == last_hijri else f"{first_hijri} - {last_hijri}"

        return Response({
            "year": year,
            "month": month,
            "total_days": num_days,
            "hijri_month_span": hijri_month_span,
            "hijri_year": days_header[0]["hijri_year"] if days_header else 1448,
            "days_header": days_header,
            "teachers": matrix_teachers,
            "daily_class_counts": daily_class_counts,
            "monthly_grand_total": monthly_grand_total,
            "total_schedules": len(routines)
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        serializer = TeacherMatrixBulkUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        records = serializer.validated_data['records']

        updated_count = 0
        with transaction.atomic():
            for item in records:
                sched_id = item['schedule_id']
                date_val = item['date']
                stat = item['status']
                sub_id = item.get('substitute_teacher_id')
                remarks = item.get('remarks', '')

                schedule = TeacherRoutineSchedule.objects.filter(id=sched_id).first()
                if not schedule:
                    continue

                sub_teacher = TeacherProfile.objects.filter(id=sub_id).first() if sub_id else None
                is_conducted = stat in ['PRESENT', 'SUBSTITUTED']

                TeacherPeriodAttendanceRecord.objects.update_or_create(
                    schedule=schedule,
                    date=date_val,
                    defaults={
                        'institution_id': schedule.institution_id,
                        'teacher': schedule.teacher,
                        'substitute_teacher': sub_teacher,
                        'status': stat,
                        'is_conducted': is_conducted,
                        'remarks': remarks,
                        'marked_by': request.user if request.user.is_authenticated else None
                    }
                )
                updated_count += 1

        return Response({
            "status": "success",
            "message": f"Updated {updated_count} teacher period attendance records.",
            "count": updated_count
        }, status=status.HTTP_200_OK)


class GateLogViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = GateEntryExitLogSerializer
    queryset = GateEntryExitLog.objects.all()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()
        qs = GateEntryExitLog.objects.select_related('institution', 'student', 'student__student_class', 'staff', 'recorded_by')
        tenant_id = get_scoped_tenant_id(self.request) or getattr(user, 'institution_id', None)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        date_str = self.request.query_params.get('date')
        if date_str:
            qs = qs.filter(punch_time__date=date_str)
        direction = self.request.query_params.get('direction')
        if direction and direction != 'ALL':
            qs = qs.filter(direction=direction.upper())
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(person_name__icontains=search) |
                Q(barcode_or_rfid__icontains=search) |
                Q(student__name__icontains=search) |
                Q(student__roll_number__icontains=search) |
                Q(staff__name_en__icontains=search)
            )
        return qs.order_by('-punch_time')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        serializer.save(institution_id=tenant_id, recorded_by=self.request.user)

    @action(detail=False, methods=['post'], url_path='log-punch')
    def log_punch(self, request):
        barcode = request.data.get('barcode_or_rfid', '').strip()
        direction = request.data.get('direction', 'ENTRY')
        reason = request.data.get('gate_pass_reason', '')
        student_id = request.data.get('student_id')
        staff_id = request.data.get('staff_id')
        person_name = request.data.get('person_name', '')

        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "No active institution scope."}, status=status.HTTP_400_BAD_REQUEST)

        student = None
        staff = None
        if student_id:
            student = Student.objects.filter(id=student_id, institution_id=tenant_id).first()
        elif barcode:
            student = Student.objects.filter(
                Q(roll_number__iexact=barcode) | Q(student_id_card_number__iexact=barcode) | Q(uniq_id__iexact=barcode),
                institution_id=tenant_id
            ).first()

        if staff_id:
            staff = TeacherProfile.objects.filter(id=staff_id).first()
        elif barcode and not student:
            staff = TeacherProfile.objects.filter(
                Q(user__phone_number__iexact=barcode) | Q(user__username__iexact=barcode)
            ).first()

        name = student.name if student else (staff.name_en if staff else person_name or barcode)

        log = GateEntryExitLog.objects.create(
            institution_id=tenant_id,
            student=student,
            staff=staff,
            person_name=name,
            barcode_or_rfid=barcode,
            punch_time=timezone.now(),
            direction=direction,
            gate_pass_reason=reason,
            recorded_by=request.user if request.user.is_authenticated else None
        )
        return Response(GateEntryExitLogSerializer(log).data, status=status.HTTP_201_CREATED)


class AdHocHeadcountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = AdHocHeadcountSessionSerializer
    queryset = AdHocHeadcountSession.objects.all()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()
        qs = AdHocHeadcountSession.objects.select_related('institution', 'student_class', 'student_group', 'conducted_by')
        tenant_id = get_scoped_tenant_id(self.request) or getattr(user, 'institution_id', None)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        return qs.order_by('-date_time')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        serializer.save(institution_id=tenant_id, conducted_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='verify-students')
    def verify_students(self, request, pk=None):
        session = self.get_object()
        student_ids = request.data.get('verified_student_ids', [])
        notes = request.data.get('notes', session.notes)
        session.verified_student_ids = student_ids
        session.total_verified = len(student_ids)
        session.notes = notes
        session.save(update_fields=['verified_student_ids', 'total_verified', 'notes'])
        return Response(AdHocHeadcountSessionSerializer(session).data, status=status.HTTP_200_OK)


class BiometricDeviceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BiometricDeviceSerializer
    queryset = BiometricDevice.objects.all()

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()
        qs = BiometricDevice.objects.all()
        tenant_id = get_scoped_tenant_id(self.request) or getattr(user, 'institution_id', None)
        if tenant_id:
            qs = qs.filter(institution_id=tenant_id)
        return qs.order_by('device_name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        serializer.save(institution_id=tenant_id)

    @action(detail=True, methods=['post'], url_path='ping')
    def ping(self, request, pk=None):
        device = self.get_object()
        device.last_heartbeat = timezone.now()
        device.save(update_fields=['last_heartbeat'])
        return Response({
            "status": "online",
            "device_name": device.device_name,
            "device_serial": device.device_serial,
            "last_heartbeat": device.last_heartbeat
        }, status=status.HTTP_200_OK)


class BiometricGatewayViewSet(viewsets.ViewSet):
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='push')
    def device_push(self, request):
        serial = request.data.get('serial_number') or request.data.get('SN') or request.query_params.get('SN')
        punches = request.data.get('punches', [])
        if not punches and 'user_pin' in request.data:
            punches = [request.data]

        device = None
        if serial:
            device = BiometricDevice.objects.filter(device_serial=serial).first()
            if device:
                device.last_heartbeat = timezone.now()
                device.save(update_fields=['last_heartbeat'])

        processed_count = 0
        for p in punches:
            pin = str(p.get('user_pin') or p.get('PIN') or p.get('card_no', '')).strip()
            punch_time_raw = p.get('timestamp') or p.get('time')
            try:
                punch_dt = datetime.fromisoformat(punch_time_raw) if punch_time_raw else timezone.now()
            except Exception:
                punch_dt = timezone.now()

            p_type = p.get('punch_type', 'CHECK_IN')
            raw_log = RawAttendancePunchLog.objects.create(
                device=device,
                user_pin_or_card=pin,
                punch_timestamp=punch_dt,
                punch_type=p_type,
                raw_payload=p,
                is_processed=False
            )

            # Auto-match with student or staff
            student = Student.objects.filter(
                Q(roll_number__iexact=pin) | Q(student_id_card_number__iexact=pin) | Q(uniq_id__iexact=pin)
            ).first()
            if student:
                raw_log.matched_student = student
                raw_log.is_processed = True
                raw_log.processing_notes = f"Matched Student {student.name}"
                raw_log.save()

                if device and device.institution_id:
                    GateEntryExitLog.objects.create(
                        institution_id=device.institution_id,
                        student=student,
                        person_name=student.name,
                        barcode_or_rfid=pin,
                        punch_time=punch_dt,
                        direction='ENTRY' if p_type in ['CHECK_IN', 'BREAK_IN'] else 'EXIT',
                        device_name=device.device_name
                    )
                processed_count += 1
            else:
                teacher = TeacherProfile.objects.filter(Q(user__phone_number__iexact=pin) | Q(user__username__iexact=pin)).first()
                if teacher:
                    raw_log.matched_teacher = teacher
                    raw_log.is_processed = True
                    raw_log.processing_notes = f"Matched Teacher {teacher.name_en}"
                    raw_log.save()
                    processed_count += 1

        return Response({
            "status": "success",
            "received_punches": len(punches),
            "auto_processed": processed_count
        }, status=status.HTTP_200_OK)


class AttendancePolicyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "No active institution scope."}, status=status.HTTP_400_BAD_REQUEST)

        policy, _ = AttendancePolicySetting.objects.get_or_create(
            institution_id=tenant_id,
            defaults={'weekend_days': ['FRIDAY'], 'default_mode': 'DAILY_SINGLE'}
        )
        return Response(AttendancePolicySettingSerializer(policy).data, status=status.HTTP_200_OK)

    def create(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "No active institution scope."}, status=status.HTTP_400_BAD_REQUEST)

        policy, _ = AttendancePolicySetting.objects.get_or_create(institution_id=tenant_id)
        serializer = AttendancePolicySettingSerializer(policy, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

