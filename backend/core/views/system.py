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

class LogLoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserLoginLogSerializer

    @extend_schema(
        summary="Log Login Event",
        request=UserLoginLogSerializer,
        responses={200: OpenApiResponse(description="Login event logged successfully")}
    )
    def post(self, request):
        status_val = request.data.get("status", "LOGIN").upper()
        if status_val not in ["LOGIN", "LOGOUT"]:
            status_val = "LOGIN"

        user_obj = request.user if request.user.is_authenticated else None
        username = request.data.get("username")
        if not user_obj and username:
            try:
                user_obj = User.objects.get(username=username)
            except User.DoesNotExist:
                user_obj = None

        if not user_obj:
            return Response({"detail": "User not identified"}, status=status.HTTP_400_BAD_REQUEST)

        ip = request.META.get('REMOTE_ADDR')
        country = request.data.get('country', '--')
        city = request.data.get('city', '--')

        log = UserLoginLog.objects.create(
            user=user_obj,
            status=status_val,
            ip_address=ip,
            country=country or "--",
            city=city or "--"
        )
        return Response({"status": "logged", "log_id": log.id}, status=status.HTTP_200_OK)


class LogActivityView(APIView):
    permission_classes = [AllowAny]
    serializer_class = UserActivityLogSerializer

    @extend_schema(
        summary="Log User Activity State",
        request=UserActivityLogSerializer,
        responses={200: OpenApiResponse(description="Activity state logged successfully")}
    )
    def post(self, request):
        status_val = request.data.get("status", "ACTIVE").upper()
        if status_val not in ["ACTIVE", "INACTIVE"]:
            status_val = "ACTIVE"

        user_obj = request.user if request.user.is_authenticated else None
        username = request.data.get("username")
        if not user_obj and username:
            try:
                user_obj = User.objects.get(username=username)
            except User.DoesNotExist:
                user_obj = None

        if not user_obj:
            return Response({"detail": "User not identified"}, status=status.HTTP_400_BAD_REQUEST)

        log = UserActivityLog.objects.create(
            user=user_obj,
            status=status_val
        )
        return Response({"status": "logged", "log_id": log.id}, status=status.HTTP_200_OK)


class UserActivitySummaryView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserActivitySummarySerializer

    @extend_schema(
        summary="Get User Activity Summary",
        responses={200: UserActivitySummarySerializer}
    )
    def get(self, request):
        user_obj = request.user
        serializer = UserActivitySummarySerializer(user_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)


class HeartbeatView(APIView):
    """
    POST /api/v1/auth/heartbeat/
    Periodic ping endpoint for Web, Android, and iOS clients to update active session metrics.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Record Periodic Client Session Heartbeat",
        description="Receives periodic pings from Android, iOS, or Web clients to maintain active UserSession metrics.",
        request={
            "application/json": {
                "type": "object",
                "properties": {
                    "device_type": {"type": "string", "enum": ["android", "ios", "web"], "example": "android"},
                    "device_info": {"type": "string", "example": "Pixel 8 Pro (Android 14)"}
                }
            }
        },
        responses={
            200: OpenApiResponse(
                description="Heartbeat recorded successfully",
                examples=[
                    OpenApiExample(
                        name="Heartbeat Success",
                        value={
                            "status": "success",
                            "message": "Heartbeat recorded successfully",
                            "session_id": 42,
                            "user_id": 7,
                            "device_type": "android",
                            "device_info": "Pixel 8 Pro (Android 14)",
                            "last_active": "2026-08-10T02:00:00Z",
                            "total_duration_minutes": 45,
                            "is_active": True
                        }
                    )
                ]
            )
        }
    )
    def post(self, request):
        user = request.user
        device_type = request.data.get('device_type') or detect_device_type(request)
        device_info = request.data.get('device_info') or detect_device_info(request)
        client_ip = get_client_ip(request)

        session = UserSession.objects.filter(
            user=user,
            device_type=device_type,
            is_active=True
        ).order_by('-last_activity').first()

        if not session:
            session = UserSession.objects.create(
                user=user,
                device_type=device_type,
                device_info=device_info,
                ip_address=client_ip,
                is_active=True
            )
        else:
            if device_info:
                session.device_info = device_info
            session.ip_address = client_ip
            session.save()

        return Response({
            "status": "success",
            "message": "Heartbeat recorded successfully",
            "session_id": session.id,
            "user_id": user.id,
            "device_type": session.device_type,
            "device_info": session.device_info,
            "last_active": session.last_activity,
            "total_duration_minutes": session.total_duration_minutes,
            "is_active": session.is_active,
        }, status=status.HTTP_200_OK)


class UserActivityAnalyticsView(APIView):
    """
    GET /api/v1/analytics/user-activity/
    Admin-only API endpoint to fetch active time windows and total active duration per user/teacher.
    """
    permission_classes = [IsAdminUserRole, HasSectionAccess]
    required_section_key = 'app_activity_analytics'

    @extend_schema(
        summary="User Activity & Time Monitoring Analytics (Admin Only)",
        description="Fetches active time windows, total active durations, and critical activity logs per user/teacher for reporting.",
        parameters=[
            OpenApiParameter(name="from_date", type=OpenApiTypes.DATE, description="Filter start date (YYYY-MM-DD)"),
            OpenApiParameter(name="to_date", type=OpenApiTypes.DATE, description="Filter end date (YYYY-MM-DD)"),
            OpenApiParameter(name="user_id", type=OpenApiTypes.INT, description="Filter specific User ID"),
            OpenApiParameter(name="user_type", type=OpenApiTypes.STR, description="Filter user role (e.g. TEACHER, ADMIN)"),
            OpenApiParameter(name="device_type", type=OpenApiTypes.STR, description="Filter device type (android, ios, web)")
        ],
        responses={
            200: OpenApiResponse(
                description="User Activity Summary & Time Windows",
                examples=[
                    OpenApiExample(
                        name="User Activity Report Example",
                        value={
                            "status": "success",
                            "time_frame": {"from_time": "2026-08-01T00:00:00Z", "to_time": "2026-08-10T23:59:59Z"},
                            "summary": {"total_users_tracked": 5, "total_active_minutes_all_users": 640},
                            "data": [
                                {
                                    "user_id": 7,
                                    "phone_number": "01711111111",
                                    "user_type": "TEACHER",
                                    "name": "Ustadh Ahmad",
                                    "total_active_duration_minutes": 120,
                                    "formatted_active_duration": "2h 0m",
                                    "sessions_count": 3,
                                    "last_active": "2026-08-10T02:00:00Z",
                                    "time_windows": [],
                                    "activity_logs": []
                                }
                            ]
                        }
                    )
                ]
            )
        }
    )
    def get(self, request):
        from_time_param = request.query_params.get('from_time') or request.query_params.get('from_date')
        to_time_param = request.query_params.get('to_time') or request.query_params.get('to_date')
        user_id_param = request.query_params.get('user_id') or request.query_params.get('teacher_id')
        user_type_param = request.query_params.get('user_type') or request.query_params.get('role')
        device_type_param = request.query_params.get('device_type')

        users_qs = User.objects.all()
        if user_id_param:
            users_qs = users_qs.filter(id=user_id_param)
        if user_type_param:
            users_qs = users_qs.filter(user_type__iexact=user_type_param)

        sessions_qs = UserSession.objects.all().select_related('user')
        if device_type_param:
            sessions_qs = sessions_qs.filter(device_type__iexact=device_type_param)

        from_dt = None
        to_dt = None

        if from_time_param:
            try:
                from_dt = timezone.datetime.fromisoformat(from_time_param.replace('Z', '+00:00'))
            except Exception:
                try:
                    from_dt = timezone.make_aware(timezone.datetime.strptime(from_time_param, '%Y-%m-%d'))
                except Exception:
                    pass

        if to_time_param:
            try:
                to_dt = timezone.datetime.fromisoformat(to_time_param.replace('Z', '+00:00'))
            except Exception:
                try:
                    dt = timezone.datetime.strptime(to_time_param, '%Y-%m-%d')
                    to_dt = timezone.make_aware(dt.replace(hour=23, minute=59, second=59))
                except Exception:
                    pass

        if from_dt:
            sessions_qs = sessions_qs.filter(last_activity__gte=from_dt)
        if to_dt:
            sessions_qs = sessions_qs.filter(login_at__lte=to_dt)

        logs_qs = ActivityLog.objects.all().select_related('user')
        if from_dt:
            logs_qs = logs_qs.filter(timestamp__gte=from_dt)
        if to_dt:
            logs_qs = logs_qs.filter(timestamp__lte=to_dt)

        user_reports = []
        grand_total_minutes = 0

        for user in users_qs:
            user_sessions = list(sessions_qs.filter(user=user))
            if not user_sessions and not user_id_param and not user_type_param:
                continue

            user_total_mins = sum(s.total_duration_minutes for s in user_sessions)
            grand_total_minutes += user_total_mins

            days = user_total_mins // 1440
            hours = (user_total_mins % 1440) // 60
            mins = user_total_mins % 60
            formatted_parts = []
            if days > 0:
                formatted_parts.append(f"{days}d")
            if hours > 0:
                formatted_parts.append(f"{hours}h")
            if mins > 0 or not formatted_parts:
                formatted_parts.append(f"{mins}m")
            formatted_duration = " ".join(formatted_parts)

            windows = []
            for s in user_sessions[:50]:
                windows.append({
                    "session_id": s.id,
                    "device_type": s.device_type,
                    "device_info": s.device_info,
                    "ip_address": s.ip_address,
                    "from_time": s.login_at,
                    "to_time": s.logout_at or s.last_activity,
                    "duration_minutes": s.total_duration_minutes,
                    "is_active": s.is_active
                })

            user_logs = list(logs_qs.filter(user=user)[:20])
            logs_data = [{
                "id": l.id,
                "action_name": l.action_name,
                "endpoint": l.endpoint,
                "http_method": l.http_method,
                "ip_address": l.ip_address,
                "timestamp": l.timestamp
            } for l in user_logs]

            name = user.phone_number
            if hasattr(user, 'teacher_profile') and user.teacher_profile and user.teacher_profile.name_en:
                name = user.teacher_profile.name_en
            elif user.email:
                name = user.email

            user_reports.append({
                "user_id": user.id,
                "phone_number": user.phone_number,
                "user_type": user.user_type,
                "name": name,
                "total_active_duration_minutes": user_total_mins,
                "formatted_active_duration": formatted_duration,
                "sessions_count": len(user_sessions),
                "last_active": user_sessions[0].last_activity if user_sessions else None,
                "time_windows": windows,
                "activity_logs": logs_data
            })

        return Response({
            "status": "success",
            "time_frame": {
                "from_time": from_dt,
                "to_time": to_dt,
            },
            "summary": {
                "total_users_tracked": len(user_reports),
                "total_active_minutes_all_users": grand_total_minutes,
            },
            "data": user_reports
        }, status=status.HTTP_200_OK)


class EvaluatedConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication]

    def get(self, request):
        from core.services import get_resolved_feature_flags_for_user
        user = request.user if request.user and request.user.is_authenticated else None
        resolved, origins = get_resolved_feature_flags_for_user(user)

        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        response = Response({
            'flags': resolved,
            'config': resolved,
            'origins': origins,
            'default_google_role': default_google_role
        }, status=status.HTTP_200_OK)

        # Set strict anti-caching HTTP headers for cross-account isolation
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response


class ResetUserOverridesView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        count, _ = UserSectionOverride.objects.all().delete()
        return Response({
            'message': 'Purged stale user overrides successfully',
            'count': count
        }, status=status.HTTP_200_OK)


class ControlPanelRulesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        response_data = self._handle_get(request)
        response = Response(response_data, status=status.HTTP_200_OK)
        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response

    def _handle_get(self, request):
        scope = request.query_params.get('scope', 'global').upper()
        target_id = request.query_params.get('target_id', '')

        user_obj = None
        if scope == 'USER' and target_id:
            user_obj = User.objects.filter(Q(pk=target_id) | Q(phone_number=target_id)).first()

        categories_map = {}

        db_sections = AppSection.objects.all().select_related('category').order_by('category__order', 'order', 'title')

        # Fetch overrides
        user_overrides = {}
        if scope == 'USER' and user_obj:
            user_overrides = {o.section.section_key: o.is_enabled for o in UserSectionOverride.objects.filter(user=user_obj).select_related('section')}

        group_overrides = {}
        if scope == 'GROUP' and target_id:
            group_overrides = {o.section.section_key: o.is_enabled for o in GroupSectionPermission.objects.filter(group_id=target_id).select_related('section')}

        role_overrides = {}
        if scope == 'ROLE' and target_id:
            role_overrides = {o.section.section_key: o.is_enabled for o in RoleSectionPermission.objects.filter(role=target_id).select_related('section')}

        # 4-Tier Resolution Evaluation (Independent of hierarchy first)
        resolved_raw = {}
        origins = {}
        for sec in db_sections:
            key = sec.section_key
            global_val = sec.is_globally_enabled

            if not global_val:
                resolved_raw[key] = False
                origins[key] = "GLOBAL"
            elif scope == 'USER' and key in user_overrides:
                resolved_raw[key] = user_overrides[key]
                origins[key] = "USER"
            elif scope == 'GROUP' and key in group_overrides:
                resolved_raw[key] = group_overrides[key]
                origins[key] = "GROUP"
            elif scope == 'ROLE' and key in role_overrides:
                resolved_raw[key] = role_overrides[key]
                origins[key] = "ROLE"
            else:
                resolved_raw[key] = global_val
                origins[key] = "GLOBAL"

        # Apply strict Top-Down cascading rule:
        # Child is active ONLY if parent is ON and child is ON
        resolved_effective = {}
        for sec in db_sections:
            key = sec.section_key
            if sec.parent_key:
                parent_state = resolved_raw.get(sec.parent_key, True)
                child_state = resolved_raw.get(key, True)
                resolved_effective[key] = parent_state and child_state
                if not parent_state and child_state:
                    origins[key] = f"PARENT_DISABLED ({sec.parent_key})"
            else:
                resolved_effective[key] = resolved_raw.get(key, True)

        for sec in db_sections:
            key = sec.section_key
            cat_obj = sec.category
            cat_title = cat_obj.title if cat_obj else "System & Standalone"
            cat_key = cat_obj.key if cat_obj else "SYSTEM"

            if cat_title not in categories_map:
                categories_map[cat_title] = {
                    "id": cat_obj.id if cat_obj else 999,
                    "key": cat_key,
                    "title": cat_title,
                    "sections": []
                }

            categories_map[cat_title]["sections"].append({
                "id": sec.id,
                "section_key": key,
                "title": sec.title,
                "description": sec.description,
                "is_globally_enabled": sec.is_globally_enabled,
                "effective_enabled": resolved_effective[key],
                "raw_enabled": resolved_raw[key],
                "inheritance_origin": origins[key],
                "is_parent": sec.is_parent,
                "parent_key": sec.parent_key,
            })

        result = sorted(categories_map.values(), key=lambda c: c["id"])
        return {"categories": result}


class ControlPanelSectionTreeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        scope = (request.query_params.get('scope') or request.query_params.get('scope_type') or 'global').upper()
        target_id = request.query_params.get('target_id', '')

        user_obj = None
        if scope == 'USER' and target_id:
            user_obj = User.objects.filter(Q(pk=target_id) | Q(phone_number=target_id)).first()

        # 1. Fetch all sections
        sections = AppSection.objects.all().select_related('category').order_by('category__order', 'order', 'title')

        # 2. Fetch overrides
        user_overrides = {}
        if scope == 'USER' and user_obj:
            user_overrides = {o.section.section_key: o.is_enabled for o in UserSectionOverride.objects.filter(user=user_obj).select_related('section')}

        group_overrides = {}
        if scope == 'GROUP' and target_id:
            group_overrides = {o.section.section_key: o.is_enabled for o in GroupSectionPermission.objects.filter(group_id=target_id).select_related('section')}

        role_overrides = {}
        if scope == 'ROLE' and target_id:
            role_overrides = {o.section.section_key: o.is_enabled for o in RoleSectionPermission.objects.filter(role=target_id).select_related('section')}

        # 3. Resolve raw values (independent of hierarchy)
        resolved_raw = {}
        origins = {}
        for sec in sections:
            key = sec.section_key
            global_val = sec.is_globally_enabled

            if not global_val:
                resolved_raw[key] = False
                origins[key] = "GLOBAL"
            elif scope == 'USER' and key in user_overrides:
                resolved_raw[key] = user_overrides[key]
                origins[key] = "USER"
            elif scope == 'GROUP' and key in group_overrides:
                resolved_raw[key] = group_overrides[key]
                origins[key] = "GROUP"
            elif scope == 'ROLE' and key in role_overrides:
                resolved_raw[key] = role_overrides[key]
                origins[key] = "ROLE"
            else:
                resolved_raw[key] = global_val
                origins[key] = "GLOBAL"

        # 4. Resolve effective values with Top-Down cascading
        resolved_effective = {}
        for sec in sections:
            key = sec.section_key
            if sec.parent_key:
                parent_state = resolved_raw.get(sec.parent_key, True)
                child_state = resolved_raw.get(key, True)
                resolved_effective[key] = parent_state and child_state
                if not parent_state and child_state:
                    origins[key] = f"PARENT_DISABLED ({sec.parent_key})"
            else:
                resolved_effective[key] = resolved_raw.get(key, True)

        # 5. Build hierarchical tree: Category -> Parent Section -> Child Sections
        categories_dict = {}
        for sec in sections:
            cat = sec.category
            cat_key = cat.key if cat else "SYSTEM"
            cat_title = cat.title if cat else "System & Standalone"
            cat_order = cat.order if cat else 999

            if cat_key not in categories_dict:
                categories_dict[cat_key] = {
                    "id": cat.id if cat else 999,
                    "key": cat_key,
                    "title": cat_title,
                    "order": cat_order,
                    "sections": []
                }

            sec_data = {
                "id": sec.id,
                "section_key": sec.section_key,
                "title": sec.title,
                "description": sec.description,
                "is_parent": sec.is_parent,
                "parent_key": sec.parent_key,
                "is_globally_enabled": sec.is_globally_enabled,
                "effective_enabled": resolved_effective[sec.section_key],
                "raw_enabled": resolved_raw[sec.section_key],
                "inheritance_origin": origins[sec.section_key],
                "children": []
            }
            categories_dict[cat_key]["sections"].append(sec_data)

        # Nest children under their parents
        for cat_key, cat_data in categories_dict.items():
            all_sec_list = cat_data["sections"]
            parent_map = {s["section_key"]: s for s in all_sec_list if s["is_parent"]}
            
            roots = []
            for s in all_sec_list:
                p_key = s["parent_key"]
                if p_key and p_key in parent_map:
                    parent_map[p_key]["children"].append(s)
                else:
                    roots.append(s)
            
            cat_data["sections"] = roots

        categories_tree = sorted(categories_dict.values(), key=lambda c: c["order"])
        return Response({"categories": categories_tree}, status=status.HTTP_200_OK)


class SectionControlVersionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        version = int(SystemSetting.get_val('SYSTEM_FEATURE_VERSION', '1'))
        return Response({'version': version}, status=status.HTTP_200_OK)


class ControlPanelBatchUpdateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        scope_type = (request.data.get('scope_type') or request.data.get('scope') or 'GLOBAL').upper()
        target_identifier = str(request.data.get('target_identifier') or request.data.get('target_id') or request.data.get('target_user_id') or request.data.get('target_role') or request.data.get('target_group_id') or '').strip()
        updates = request.data.get('updates', [])
        # When True, a GLOBAL save will also purge any conflicting Role/User overrides for those keys
        cascade_clear_overrides = bool(request.data.get('cascade_clear_overrides', False))

        if not isinstance(updates, list) or len(updates) == 0:
            section_key = request.data.get('section_key')
            is_enabled = request.data.get('is_enabled')
            if section_key is not None and is_enabled is not None:
                updates = [{'section_key': section_key, 'is_enabled': is_enabled}]

        changed_count = 0
        cleared_overrides = 0

        for item in updates:
            s_key = item.get('section_key')
            enabled = item.get('is_enabled', True)
            if not s_key:
                continue

            sec, _ = AppSection.objects.get_or_create(
                section_key=s_key,
                defaults={'title': s_key.title(), 'is_globally_enabled': True}
            )

            prev_state = sec.is_globally_enabled

            if scope_type == 'GLOBAL':
                # Update the single source of truth: AppSection.is_globally_enabled
                AppSection.objects.filter(section_key=s_key).update(is_globally_enabled=enabled)
                sec.refresh_from_db()
                changed_count += 1

                # Cascade: optionally purge conflicting higher-tier overrides so the global default
                # actually takes effect for ALL accounts with Role or User overrides for this key.
                if cascade_clear_overrides:
                    r_del, _ = RoleSectionPermission.objects.filter(section=sec).delete()
                    u_del, _ = UserSectionOverride.objects.filter(section=sec).delete()
                    cleared_overrides += r_del + u_del

            elif scope_type == 'ROLE':
                role_code = (target_identifier or request.data.get('selected_role', 'TEACHER')).upper().strip()
                perm, created = RoleSectionPermission.objects.update_or_create(
                    section=sec, role=role_code,
                    defaults={'is_enabled': enabled}
                )
                prev_state = not enabled if created else (not perm.is_enabled)
                changed_count += 1

            elif scope_type == 'GROUP':
                group_id = target_identifier or request.data.get('selected_group', 'All Groups')
                perm, created = GroupSectionPermission.objects.update_or_create(
                    section=sec, group_id=group_id,
                    defaults={'is_enabled': enabled}
                )
                prev_state = not enabled if created else (not perm.is_enabled)
                changed_count += 1

            elif scope_type == 'USER':
                # NEVER use request.user here — always use the target_user_id from payload
                target_user_id = target_identifier or request.data.get('target_user_id', '')
                user_obj = User.objects.filter(
                    Q(pk=target_user_id) | Q(phone_number=target_user_id)
                ).first()
                if user_obj:
                    perm, created = UserSectionOverride.objects.update_or_create(
                        section=sec, user=user_obj,
                        defaults={'is_enabled': enabled}
                    )
                    prev_state = not enabled if created else (not perm.is_enabled)
                    changed_count += 1

            FeatureFlagAuditLog.objects.create(
                changed_by=request.user if request.user and request.user.is_authenticated else None,
                scope_type=scope_type,
                target_identifier=target_identifier or "GLOBAL",
                section_key=s_key,
                previous_state=prev_state,
                new_state=enabled
            )

        # Increment global feature version so all polling clients re-fetch immediately
        current_version = int(SystemSetting.get_val('SYSTEM_FEATURE_VERSION', '1'))
        SystemSetting.set_val('SYSTEM_FEATURE_VERSION', str(current_version + 1))

        msg = f'Updated {changed_count} section rule(s)'
        if cleared_overrides:
            msg += f'; cleared {cleared_overrides} higher-tier override(s) for clean global inheritance'

        return Response({'message': msg, 'version': current_version + 1, 'cleared_overrides': cleared_overrides}, status=status.HTTP_200_OK)


class ClearSectionOverridesView(APIView):
    """
    DELETE Role and/or User overrides for specific section_keys so those sections
    cleanly fall back to the Tier-4 Global Default.

    POST body:
      {
        "section_keys": ["sessionSelect", "juzPageInput"],   // required; use ["*"] for all
        "clear_role_overrides": true,
        "clear_user_overrides": true,
        "role_code": "TEACHER"   // optional: limit role deletion to a specific role
      }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        raw_keys = request.data.get('section_keys', [])
        clear_role = bool(request.data.get('clear_role_overrides', True))
        clear_user = bool(request.data.get('clear_user_overrides', True))
        role_code = str(request.data.get('role_code') or '').upper().strip()

        if not isinstance(raw_keys, list) or len(raw_keys) == 0:
            return Response({'error': 'section_keys must be a non-empty list'}, status=status.HTTP_400_BAD_REQUEST)

        all_sections = raw_keys == ['*']
        role_deleted = 0
        user_deleted = 0

        if all_sections:
            sections_qs = AppSection.objects.all()
        else:
            sections_qs = AppSection.objects.filter(section_key__in=raw_keys)

        if clear_role:
            role_qs = RoleSectionPermission.objects.filter(section__in=sections_qs)
            if role_code:
                role_qs = role_qs.filter(role__iexact=role_code)
            role_deleted, _ = role_qs.delete()

        if clear_user:
            user_qs = UserSectionOverride.objects.filter(section__in=sections_qs)
            user_deleted, _ = user_qs.delete()

        # Bump version so live clients re-evaluate immediately
        current_version = int(SystemSetting.get_val('SYSTEM_FEATURE_VERSION', '1'))
        SystemSetting.set_val('SYSTEM_FEATURE_VERSION', str(current_version + 1))

        return Response({
            'message': f'Cleared {role_deleted} role override(s) and {user_deleted} user override(s). All affected sections now inherit Global Defaults.',
            'role_overrides_deleted': role_deleted,
            'user_overrides_deleted': user_deleted,
            'version': current_version + 1,
        }, status=status.HTTP_200_OK)


class ControlPanelResetRulesView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        scope = str(request.data.get('scope') or '').lower()
        target_id = str(request.data.get('target_id') or '').strip()

        if scope == 'role' and target_id:
            RoleSectionPermission.objects.filter(role=target_id).delete()
            return Response({'message': f'Reset all role overrides for "{target_id}" back to global defaults'}, status=status.HTTP_200_OK)
        elif scope == 'group' and target_id:
            GroupSectionPermission.objects.filter(group_id=target_id).delete()
            return Response({'message': f'Reset all group overrides for "{target_id}" back to global defaults'}, status=status.HTTP_200_OK)
        elif scope == 'user' and target_id:
            user_obj = User.objects.filter(Q(pk=target_id) | Q(phone_number=target_id)).first()
            if user_obj:
                UserSectionOverride.objects.filter(user=user_obj).delete()
            return Response({'message': f'Reset all user overrides for user #{target_id} back to global defaults'}, status=status.HTTP_200_OK)
        else:
            AppSection.objects.all().update(is_globally_enabled=True)
            RoleSectionPermission.objects.all().delete()
            GroupSectionPermission.objects.all().delete()
            UserSectionOverride.objects.all().delete()
            return Response({'message': 'All section control rules reset to global defaults'}, status=status.HTTP_200_OK)


class ControlPanelAuditLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = FeatureFlagAuditLog.objects.all().select_related('changed_by').order_by('-timestamp')[:100]
        data = []
        for log in logs:
            data.append({
                'id': log.id,
                'changed_by': log.changed_by.name or log.changed_by.phone_number if log.changed_by else "System",
                'scope_type': log.scope_type,
                'target_identifier': log.target_identifier,
                'section_key': log.section_key,
                'previous_state': log.previous_state,
                'new_state': log.new_state,
                'timestamp': log.timestamp.strftime("%Y-%m-%d %I:%M:%S %p"),
            })
        return Response({
            'status': 'success',
            'logs': data
        }, status=status.HTTP_200_OK)

