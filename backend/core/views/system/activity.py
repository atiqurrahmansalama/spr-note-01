import logging
from collections import defaultdict

from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from core.models import UserLoginLog, UserActivityLog, UserSession, ActivityLog
from core.serializers import (
    UserLoginLogSerializer,
    UserActivityLogSerializer,
    UserActivitySummarySerializer,
)
from core.permissions import IsAdminUserRole, HasSectionAccess
from core.middleware import detect_device_type, detect_device_info, get_client_ip

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

        # Deduplicate consecutive identical activity states to prevent database row ballooning & egress waste
        latest_log = UserActivityLog.objects.filter(user=user_obj).order_by('-timestamp').first()
        if latest_log and latest_log.status == status_val:
            return Response({"status": "unchanged", "log_id": latest_log.id}, status=status.HTTP_200_OK)

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
    Periodic ping and heartbeat endpoint for Web, Android, iOS clients, and uptime monitoring services.
    Supports GET, HEAD, and POST without mandatory authentication.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "status": "healthy",
            "message": "Heartbeat pong",
            "timestamp": timezone.now().isoformat(),
        }, status=status.HTTP_200_OK)

    def head(self, request):
        response = Response(status=status.HTTP_200_OK)
        response['X-Health-Status'] = 'healthy'
        return response

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
        if not user or not user.is_authenticated:
            return Response({
                "status": "success",
                "message": "Heartbeat ping acknowledged",
                "timestamp": timezone.now().isoformat(),
            }, status=status.HTTP_200_OK)

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

        users_qs = User.objects.all().select_related('teacher_profile')
        if user_id_param:
            users_qs = users_qs.filter(id=user_id_param)
        if user_type_param:
            users_qs = users_qs.filter(user_type__iexact=user_type_param)

        sessions_qs = UserSession.objects.all()
        if device_type_param:
            sessions_qs = sessions_qs.filter(device_type__iexact=device_type_param)

        from_dt = None
        to_dt = None

        if from_time_param:
            try:
                if len(from_time_param) == 10 and '-' in from_time_param:
                    from_dt = timezone.make_aware(timezone.datetime.strptime(from_time_param, '%Y-%m-%d'))
                else:
                    from_dt = timezone.datetime.fromisoformat(from_time_param.replace('Z', '+00:00'))
                    if timezone.is_naive(from_dt):
                        from_dt = timezone.make_aware(from_dt)
            except Exception:
                pass

        if to_time_param:
            try:
                if len(to_time_param) == 10 and '-' in to_time_param:
                    dt = timezone.datetime.strptime(to_time_param, '%Y-%m-%d')
                    to_dt = timezone.make_aware(dt.replace(hour=23, minute=59, second=59, microsecond=999999))
                else:
                    to_dt = timezone.datetime.fromisoformat(to_time_param.replace('Z', '+00:00'))
                    if timezone.is_naive(to_dt):
                        to_dt = timezone.make_aware(to_dt)
            except Exception:
                pass

        if from_dt:
            sessions_qs = sessions_qs.filter(last_activity__gte=from_dt)
        if to_dt:
            sessions_qs = sessions_qs.filter(login_at__lte=to_dt)

        sessions_by_user = defaultdict(list)
        for s in sessions_qs.order_by('-last_activity'):
            sessions_by_user[s.user_id].append(s)

        logs_qs = ActivityLog.objects.all()
        if from_dt:
            logs_qs = logs_qs.filter(timestamp__gte=from_dt)
        if to_dt:
            logs_qs = logs_qs.filter(timestamp__lte=to_dt)

        user_reports = []
        grand_total_minutes = 0
        now = timezone.now()
        current_tz = timezone.get_current_timezone()

        for user in users_qs:
            user_sessions = sessions_by_user.get(user.id, [])
            if not user_sessions and not user_id_param and not user_type_param:
                continue

            user_total_mins = 0
            valid_windows = []

            for s in user_sessions:
                sess_start = s.login_at
                sess_end = s.logout_at or s.last_activity or sess_start

                # Auto-close sessions that are marked active but idle for > 30 minutes
                if s.is_active:
                    last_act = s.last_activity or s.login_at
                    if (now - last_act).total_seconds() > 1800:
                        s.is_active = False
                        s.logout_at = last_act
                        s.save(update_fields=['is_active', 'logout_at', 'total_duration_minutes'])
                        sess_end = last_act
                    else:
                        sess_end = last_act

                # Clip session bounds to the requested filter window [from_dt, to_dt]
                win_start = max(sess_start, from_dt) if from_dt else sess_start
                win_end = min(sess_end, to_dt) if to_dt else sess_end

                # If this session does not fall within the window, skip it
                if win_end <= win_start:
                    continue

                dur_mins = max(1, int((win_end - win_start).total_seconds() // 60))
                user_total_mins += dur_mins

                valid_windows.append({
                    "session_id": s.id,
                    "device_type": s.device_type,
                    "device_info": s.device_info,
                    "ip_address": s.ip_address,
                    "from_time": win_start.astimezone(current_tz),
                    "to_time": win_end.astimezone(current_tz),
                    "duration_minutes": dur_mins,
                    "is_active": s.is_active and (now - (s.last_activity or s.login_at)).total_seconds() <= 1800
                })

            if not valid_windows and not user_id_param and not user_type_param:
                continue

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

            # Fast query using indexed user_id and primary key order
            user_logs = list(logs_qs.filter(user_id=user.id).order_by('-id')[:20])
            logs_data = [{
                "id": l.id,
                "action_name": l.action_name,
                "endpoint": l.endpoint,
                "http_method": l.http_method,
                "ip_address": l.ip_address,
                "timestamp": l.timestamp.astimezone(current_tz) if l.timestamp else None
            } for l in user_logs]

            name = user.phone_number
            if hasattr(user, 'teacher_profile') and user.teacher_profile and user.teacher_profile.name_en:
                name = user.teacher_profile.name_en
            elif user.email:
                name = user.email

            last_act_val = user_sessions[0].last_activity if user_sessions else None

            user_reports.append({
                "user_id": user.id,
                "phone_number": user.phone_number,
                "user_type": user.user_type,
                "name": name,
                "total_active_duration_minutes": user_total_mins,
                "formatted_active_duration": formatted_duration,
                "sessions_count": len(valid_windows),
                "last_active": last_act_val.astimezone(current_tz) if last_act_val else None,
                "time_windows": valid_windows[:50],
                "activity_logs": logs_data
            })

        return Response({
            "status": "success",
            "time_frame": {
                "from_time": from_dt.astimezone(current_tz) if from_dt else None,
                "to_time": to_dt.astimezone(current_tz) if to_dt else None,
            },
            "summary": {
                "total_users_tracked": len(user_reports),
                "total_active_minutes_all_users": grand_total_minutes,
            },
            "data": user_reports
        }, status=status.HTTP_200_OK)

