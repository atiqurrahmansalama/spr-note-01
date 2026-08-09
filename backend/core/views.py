from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample, extend_schema_view
from drf_spectacular.types import OpenApiTypes
from .models import (
    Student,
    StudentGroup,
    Session,
    SavedMessage,
    StudentDailyReport,
    ReportStatus,
    UserLoginLog,
    UserActivityLog,
    UserSession,
    ActivityLog,
)
from .permissions import IsAdminUserRole
from .middleware import detect_device_type, detect_device_info, get_client_ip
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    StudentSerializer,
    StudentGroupSerializer,
    SessionSerializer,
    SavedMessageSerializer,
    StudentDailyReportSerializer,
    UserLoginLogSerializer,
    UserActivityLogSerializer,
    UserActivitySummarySerializer,
)


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sms_scope'

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            phone_input = request.data.get("phone_number") or request.data.get("phone") or request.data.get("username", "")
            try:
                if "@" in phone_input:
                    user_obj = User.objects.get(email=phone_input)
                else:
                    user_obj = User.objects.get(phone_number=phone_input)
                
                ip = get_client_ip(request)
                country = request.data.get('country', '--')
                city = request.data.get('city', '--')

                UserLoginLog.objects.create(
                    user=user_obj,
                    status="LOGIN",
                    ip_address=ip,
                    country=country or "--",
                    city=city or "--"
                )
                UserActivityLog.objects.create(user=user_obj, status="ACTIVE")

                # Initialize UserSession
                dev_type = request.data.get('device_type') or detect_device_type(request)
                dev_info = request.data.get('device_info') or detect_device_info(request)
                UserSession.objects.create(
                    user=user_obj,
                    device_type=dev_type,
                    device_info=dev_info,
                    ip_address=ip,
                    is_active=True
                )
            except User.DoesNotExist:
                pass
        return response

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sms_scope'

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'sms_scope'

    @extend_schema(
        summary="Change User Password",
        request=ChangePasswordSerializer,
        responses={200: OpenApiResponse(description="Password updated successfully")}
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(Q(status='Active') | Q(status__isnull=True)).select_related('details').order_by('roll_number', 'name_en')
    serializer_class = StudentSerializer
    permission_classes = [AllowAny]

class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.all().order_by('name')
    serializer_class = StudentGroupSerializer
    permission_classes = [AllowAny]

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all().order_by('id')
    serializer_class = SessionSerializer
    permission_classes = [AllowAny]

class SavedMessageViewSet(viewsets.ModelViewSet):
    queryset = SavedMessage.objects.all().order_by('-created_at')
    serializer_class = SavedMessageSerializer
    permission_classes = [AllowAny]

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500


@extend_schema_view(
    list=extend_schema(
        summary="List Daily Hifz Reports",
        description="Fetch paginated Hifz daily reports with filtering options. Excludes soft-deleted reports.",
        parameters=[
            OpenApiParameter(name="student_name", type=OpenApiTypes.STR, description="Filter by student name"),
            OpenApiParameter(name="date", type=OpenApiTypes.DATE, description="Filter by report date (YYYY-MM-DD)"),
            OpenApiParameter(name="session_name", type=OpenApiTypes.STR, description="Filter by session name (e.g., Subah, Asr, Maghrib)"),
            OpenApiParameter(name="status", type=OpenApiTypes.STR, description="Filter by status (Completed, Unprepared, Absent)")
        ]
    ),
    create=extend_schema(
        summary="Create New Daily Hifz Report",
        description="Creates a new daily report with nested portions and error details (mistakes and stucks).",
        examples=[
            OpenApiExample(
                name="Create Report Example",
                value={
                    "student": 1,
                    "student_name": "Ahmad Hassan",
                    "session_name": "Subah",
                    "total_page": 5,
                    "score": 95.0,
                    "status": "Completed",
                    "comment": "Excellent recitation",
                    "portions": [
                        {
                            "start_juz": 1, "start_page": 1, "start_ayah": 1,
                            "end_juz": 1, "end_page": 5, "end_ayah": 30
                        }
                    ],
                    "error_details": [
                        {"type": "Mistake", "juz": 1, "page": 2, "ayah": 10},
                        {"type": "Stuck", "juz": 1, "page": 4, "ayah": 15}
                    ]
                }
            )
        ]
    ),
    update=extend_schema(
        summary="Update Daily Hifz Report",
        description="Updates an existing report. Auto-lock enforcement applies if report is locked by Admin."
    ),
    destroy=extend_schema(
        summary="Soft Delete Daily Hifz Report",
        description="Marks status_info.is_deleted=True and sets delete_time timestamp."
    )
)
class StudentDailyReportViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for StudentDailyReport.
    Automatically excludes soft-deleted reports (status_info__is_deleted=True).
    Supports filtering by: student_name, date (report date), session_name, status.
    """
    serializer_class = StudentDailyReportSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = (
            StudentDailyReport.objects
            .filter(Q(status_info__is_deleted=False) | Q(status_info__isnull=True))
            .select_related('student', 'status_info')
            .prefetch_related(
                'portions',
                'error_details',
            )
            .order_by('-date', '-created_at')
        )

        params = self.request.query_params

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

        return qs

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        report = serializer.save(created_by=user)
        try:
            from .notifications import notify_report_saved
            notify_report_saved(report, action="CREATED")
        except Exception:
            pass

    def perform_update(self, serializer):
        """Auto-set is_edited and edit_time on any update via ReportStatus."""
        report = serializer.save()
        try:
            from .notifications import notify_report_saved
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
    permission_classes = [AllowAny]
    serializer_class = UserActivitySummarySerializer

    @extend_schema(
        summary="Get User Activity Summary",
        responses={200: UserActivitySummarySerializer}
    )
    def get(self, request):
        if request.user.is_authenticated:
            user_obj = request.user
        else:
            username = request.query_params.get("username")
            if username:
                try:
                    user_obj = User.objects.get(username=username)
                except User.DoesNotExist:
                    user_obj = User.objects.first()
            else:
                user_obj = User.objects.first()

        if not user_obj:
            return Response({"detail": "No users found"}, status=status.HTTP_404_NOT_FOUND)

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
        ).order_by('-last_active').first()

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
            session.save()  # auto_now updates last_active & save() recalculates duration

        return Response({
            "status": "success",
            "message": "Heartbeat recorded successfully",
            "session_id": session.id,
            "user_id": user.id,
            "device_type": session.device_type,
            "device_info": session.device_info,
            "last_active": session.last_active,
            "total_duration_minutes": session.total_duration_minutes,
            "is_active": session.is_active,
        }, status=status.HTTP_200_OK)


class UserActivityAnalyticsView(APIView):
    """
    GET /api/v1/analytics/user-activity/
    Admin-only API endpoint to fetch active time windows and total active duration per user/teacher.
    """
    permission_classes = [IsAdminUserRole]

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
            sessions_qs = sessions_qs.filter(last_active__gte=from_dt)
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
                    "to_time": s.logout_at or s.last_active,
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
                "last_active": user_sessions[0].last_active if user_sessions else None,
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