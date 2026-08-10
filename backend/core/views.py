from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
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
    UserNotificationPreference,
    UserSecurity,
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
    UserProfileSerializer,
    UserAdminSerializer,
    UserNotificationPreferenceSerializer,
    UserSecuritySerializer,
)




User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

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


class UserProfileView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"detail": "No user found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserProfileSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"detail": "No user found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = UserProfileSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserSessionView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response([], status=status.HTTP_200_OK)
        sessions = UserSession.objects.filter(user=user).order_by('-last_active')
        data = [
            {
                "id": s.id,
                "device_type": s.device_type,
                "device_info": s.device_info or "Web Browser",
                "ip_address": s.ip_address or "127.0.0.1",
                "login_at": s.login_at,
                "last_active": s.last_active,
                "total_duration_minutes": s.total_duration_minutes,
                "is_active": s.is_active,
            }
            for s in sessions
        ]
        return Response(data, status=status.HTTP_200_OK)


class LogoutAllOtherSessionsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"status": "success", "logged_out_count": 0}, status=status.HTTP_200_OK)
        current_session_id = request.data.get('current_session_id')
        qs = UserSession.objects.filter(user=user, is_active=True)
        if current_session_id:
            qs = qs.exclude(id=current_session_id)
        else:
            latest = qs.order_by('-last_active').first()
            if latest:
                qs = qs.exclude(id=latest.id)
        count = qs.update(is_active=False, logout_at=timezone.now())
        return Response({"status": "success", "logged_out_count": count}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all().order_by('-date_joined')

    def get_queryset(self):
        qs = User.objects.all().order_by('-date_joined')
        user_type = self.request.query_params.get('user_type') or self.request.query_params.get('role')
        if user_type:
            qs = qs.filter(user_type__iexact=user_type)
        return qs


import secrets

class UserNotificationPreferenceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
        serializer = UserNotificationPreferenceSerializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class Toggle2FAView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        sec, _ = UserSecurity.objects.get_or_create(user=user)
        sec.is_2fa_enabled = not sec.is_2fa_enabled
        if sec.is_2fa_enabled and not sec.two_factor_secret:
            sec.two_factor_secret = secrets.token_hex(16)
        sec.save()
        return Response({
            "is_2fa_enabled": sec.is_2fa_enabled,
            "two_factor_secret": sec.two_factor_secret,
            "message": f"Two-Factor Authentication is now {'enabled' if sec.is_2fa_enabled else 'disabled'}."
        }, status=status.HTTP_200_OK)


class GenerateBackupCodesView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        sec, _ = UserSecurity.objects.get_or_create(user=user)
        codes = [str(secrets.randbelow(90000000) + 10000000) for _ in range(8)]
        sec.backup_codes = codes
        sec.save()
        return Response({
            "backup_codes": codes,
            "message": "8-digit recovery backup codes generated successfully."
        }, status=status.HTTP_200_OK)


class DeactivateAccountView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        user.is_deactivated = True
        user.deactivated_at = timezone.now()
        user.is_active = False
        user.save()
        return Response({"status": "success", "message": "Account deactivated successfully."}, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    permission_classes = [AllowAny]

    def delete(self, request):
        user = request.user if request.user.is_authenticated else User.objects.first()
        if not user:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)
        password = request.data.get("password") or request.query_params.get("password")
        if password and not user.check_password(password):
            return Response({"error": "Invalid password confirmation."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_active = False
        user.is_deactivated = True
        user.deactivated_at = timezone.now()
        user.save()
        return Response({"status": "success", "message": "Account has been soft-deleted/deactivated."}, status=status.HTTP_200_OK)


# ─── Feature Flagging & Access Control API Views ─────────────────────────────

def seed_initial_sections():
    """Seed default section categories and section flags if DB is empty."""
    from .models import AppSectionCategory, AppSection

    if AppSection.objects.exists():
        return

    categories_data = [
        {"key": "form_header", "title": "Form Header & Date Config", "order": 1},
        {"key": "form_progress", "title": "Student Progress & Trackers", "order": 2},
        {"key": "form_actions", "title": "Form Actions & Comments", "order": 3},
        {"key": "sidebar_modules", "title": "Sidebar & Admin Modules", "order": 4},
    ]

    cat_map = {}
    for cat in categories_data:
        c, _ = AppSectionCategory.objects.get_or_create(key=cat["key"], defaults=cat)
        cat_map[cat["key"]] = c

    sections_data = [
        {"key": "headerDate", "cat": "form_header", "title": "Header Date & Time Selector", "desc": "Toggle date & time controls in report header", "order": 1},
        {"key": "studentSelect", "cat": "form_header", "title": "Student Selection Field", "desc": "Toggle student selection dropdown field", "order": 2},
        {"key": "sessionSelect", "cat": "form_header", "title": "Session Preset Selector", "desc": "Toggle session preset selection dropdown", "order": 3},
        {"key": "juzPageInput", "cat": "form_progress", "title": "Juz & Para Page Range Inputs", "desc": "Toggle Para/Juz, Page, and Quarter range fields", "order": 1},
        {"key": "mistakeTracker", "cat": "form_progress", "title": "Mistake & Error Counter", "desc": "Toggle Sabq/Sabqi mistake counter control", "order": 2},
        {"key": "stuckTracker", "cat": "form_progress", "title": "Stuck / Pause Counter", "desc": "Toggle stuck/pause error counter control", "order": 3},
        {"key": "commentSection", "cat": "form_actions", "title": "Teacher Comment Box & Presets", "desc": "Toggle teacher remarks and comment templates", "order": 1},
        {"key": "pdfExport", "cat": "form_actions", "title": "PDF & Image Export Buttons", "desc": "Toggle PDF export and screenshot action buttons", "order": 2},
        {"key": "userManagementModule", "cat": "sidebar_modules", "title": "User & Teacher Management Module", "desc": "Toggle User & Teacher Management dashboard access", "order": 1},
        {"key": "activityAnalyticsModule", "cat": "sidebar_modules", "title": "Teacher Activity Analytics Module", "desc": "Toggle Activity Analytics dashboard access", "order": 2},
        {"key": "trashRestorationModule", "cat": "sidebar_modules", "title": "Trash & Soft-Deleted Reports Module", "desc": "Toggle Trash & Soft-Deleted Reports module access", "order": 3},
    ]

    for sec in sections_data:
        AppSection.objects.get_or_create(
            section_key=sec["key"],
            defaults={
                "category": cat_map[sec["cat"]],
                "title": sec["title"],
                "description": sec["desc"],
                "order": sec["order"],
                "is_globally_enabled": True,
            }
        )


class EvaluatedConfigView(APIView):
    """
    Computes final boolean flags for current user using 4-Tier Precedence:
    User Override > Group Override > Role Override > Global Default
    """
    permission_classes = [AllowAny]

    def get(self, request):
        seed_initial_sections()
        from .models import AppSection, UserSectionOverride, GroupSectionPermission, RoleSectionPermission

        user = request.user if request.user.is_authenticated else User.objects.first()
        
        all_sections = AppSection.objects.select_related('category').all()
        config = {}
        origins = {}

        for section in all_sections:
            key = section.section_key
            val = section.is_globally_enabled
            origin = "GLOBAL"

            if user:
                # 3. Role Check
                user_role = (getattr(user, 'user_type', None) or getattr(user, 'role', None) or 'TEACHER').upper()
                role_perm = RoleSectionPermission.objects.filter(section=section, role=user_role).first()
                if role_perm:
                    val = role_perm.is_enabled
                    origin = "ROLE"

                # 2. Group Check
                if user.assigned_group:
                    grp_perm = GroupSectionPermission.objects.filter(section=section, group_id=user.assigned_group).first()
                    if grp_perm:
                        val = grp_perm.is_enabled
                        origin = "GROUP"

                # 1. User Override Check (Highest Priority)
                user_override = UserSectionOverride.objects.filter(section=section, user=user).first()
                if user_override:
                    val = user_override.is_enabled
                    origin = "USER"

            config[key] = val
            origins[key] = origin

        return Response({
            "status": "success",
            "config": config,
            "origins": origins,
            "user_id": user.id if user else None,
            "user_role": (getattr(user, 'user_type', None) if user else "ANONYMOUS"),
            "assigned_group": (getattr(user, 'assigned_group', None) if user else None),
        }, status=status.HTTP_200_OK)


class ControlPanelRulesView(APIView):
    """
    Fetches section rules and computed flags under selected scope.
    Query params: scope (global, role, group, user), target_id
    """
    permission_classes = [AllowAny]

    def get(self, request):
        seed_initial_sections()
        from .models import AppSectionCategory, AppSection, RoleSectionPermission, GroupSectionPermission, UserSectionOverride

        scope = request.query_params.get('scope', 'global').lower()
        target_id = request.query_params.get('target_id', '')

        categories = AppSectionCategory.objects.prefetch_related('sections').all()
        result_categories = []

        target_user = None
        if scope == 'user' and target_id:
            try:
                target_user = User.objects.get(id=target_id)
            except Exception:
                try:
                    target_user = User.objects.get(phone_number=target_id)
                except Exception:
                    pass

        for cat in categories:
            sections_list = []
            for sec in cat.sections.all():
                key = sec.section_key
                global_val = sec.is_globally_enabled
                effective_val = global_val
                origin = "GLOBAL"
                override_val = None

                if scope == 'global':
                    override_val = global_val
                    effective_val = global_val
                    origin = "GLOBAL"
                elif scope == 'role' and target_id:
                    role_perm = RoleSectionPermission.objects.filter(section=sec, role=target_id.upper()).first()
                    if role_perm:
                        override_val = role_perm.is_enabled
                        effective_val = role_perm.is_enabled
                        origin = "ROLE"
                    else:
                        effective_val = global_val
                        origin = "GLOBAL"
                elif scope == 'group' and target_id:
                    grp_perm = GroupSectionPermission.objects.filter(section=sec, group_id=target_id).first()
                    if grp_perm:
                        override_val = grp_perm.is_enabled
                        effective_val = grp_perm.is_enabled
                        origin = "GROUP"
                    else:
                        effective_val = global_val
                        origin = "GLOBAL"
                elif scope == 'user' and target_user:
                    user_ovr = UserSectionOverride.objects.filter(section=sec, user=target_user).first()
                    if user_ovr:
                        override_val = user_ovr.is_enabled
                        effective_val = user_ovr.is_enabled
                        origin = "USER"
                    else:
                        user_role = (target_user.user_type or 'TEACHER').upper()
                        role_p = RoleSectionPermission.objects.filter(section=sec, role=user_role).first()
                        if target_user.assigned_group:
                            grp_p = GroupSectionPermission.objects.filter(section=sec, group_id=target_user.assigned_group).first()
                            if grp_p:
                                effective_val = grp_p.is_enabled
                                origin = "GROUP"
                            elif role_p:
                                effective_val = role_p.is_enabled
                                origin = "ROLE"
                            else:
                                effective_val = global_val
                                origin = "GLOBAL"
                        elif role_p:
                            effective_val = role_p.is_enabled
                            origin = "ROLE"
                        else:
                            effective_val = global_val
                            origin = "GLOBAL"

                sections_list.append({
                    "id": sec.id,
                    "section_key": sec.section_key,
                    "title": sec.title,
                    "description": sec.description,
                    "is_globally_enabled": sec.is_globally_enabled,
                    "effective_enabled": effective_val,
                    "override_enabled": override_val,
                    "inheritance_origin": origin,
                })

            result_categories.append({
                "id": cat.id,
                "key": cat.key,
                "title": cat.title,
                "order": cat.order,
                "sections": sections_list
            })

        return Response({
            "status": "success",
            "scope": scope,
            "target_id": target_id,
            "categories": result_categories
        }, status=status.HTTP_200_OK)


class ControlPanelBatchUpdateView(APIView):
    """
    Batch updates flags under a specific scope and writes audit logs.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        seed_initial_sections()
        from .models import AppSection, RoleSectionPermission, GroupSectionPermission, UserSectionOverride, FeatureFlagAuditLog

        scope = request.data.get('scope', 'global').lower()
        target_id = request.data.get('target_id', '')
        updates = request.data.get('updates', [])

        user = request.user if request.user.is_authenticated else User.objects.first()

        target_user = None
        if scope == 'user' and target_id:
            try:
                target_user = User.objects.get(id=target_id)
            except Exception:
                try:
                    target_user = User.objects.get(phone_number=target_id)
                except Exception:
                    pass

        updated_count = 0

        for item in updates:
            key = item.get('section_key')
            new_state = item.get('is_enabled')
            if not key or new_state is None:
                continue

            try:
                sec = AppSection.objects.get(section_key=key)
            except AppSection.DoesNotExist:
                continue

            if scope == 'global':
                prev_state = sec.is_globally_enabled
                if prev_state != new_state:
                    sec.is_globally_enabled = new_state
                    sec.save()
                    FeatureFlagAuditLog.objects.create(
                        changed_by=user,
                        scope_type='GLOBAL',
                        target_identifier='GLOBAL_DEFAULT',
                        section_key=key,
                        previous_state=prev_state,
                        new_state=new_state
                    )
                    updated_count += 1

            elif scope == 'role' and target_id:
                role_key = target_id.upper()
                obj, created = RoleSectionPermission.objects.get_or_create(section=sec, role=role_key, defaults={'is_enabled': new_state})
                prev_state = obj.is_enabled if not created else sec.is_globally_enabled
                if created or prev_state != new_state:
                    obj.is_enabled = new_state
                    obj.save()
                    FeatureFlagAuditLog.objects.create(
                        changed_by=user,
                        scope_type='ROLE',
                        target_identifier=role_key,
                        section_key=key,
                        previous_state=prev_state,
                        new_state=new_state
                    )
                    updated_count += 1

            elif scope == 'group' and target_id:
                obj, created = GroupSectionPermission.objects.get_or_create(section=sec, group_id=target_id, defaults={'is_enabled': new_state})
                prev_state = obj.is_enabled if not created else sec.is_globally_enabled
                if created or prev_state != new_state:
                    obj.is_enabled = new_state
                    obj.save()
                    FeatureFlagAuditLog.objects.create(
                        changed_by=user,
                        scope_type='GROUP',
                        target_identifier=target_id,
                        section_key=key,
                        previous_state=prev_state,
                        new_state=new_state
                    )
                    updated_count += 1

            elif scope == 'user' and target_user:
                obj, created = UserSectionOverride.objects.get_or_create(section=sec, user=target_user, defaults={'is_enabled': new_state})
                prev_state = obj.is_enabled if not created else sec.is_globally_enabled
                if created or prev_state != new_state:
                    obj.is_enabled = new_state
                    obj.save()
                    FeatureFlagAuditLog.objects.create(
                        changed_by=user,
                        scope_type='USER',
                        target_identifier=f"User #{target_user.id} ({target_user.phone_number or target_user.first_name})",
                        section_key=key,
                        previous_state=prev_state,
                        new_state=new_state
                    )
                    updated_count += 1

        return Response({
            "status": "success",
            "message": f"Updated {updated_count} section rule(s) for scope '{scope}'",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)


class ControlPanelResetRulesView(APIView):
    """
    Clears all overrides for a specified scope and target.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from .models import RoleSectionPermission, GroupSectionPermission, UserSectionOverride, FeatureFlagAuditLog

        scope = request.data.get('scope', '').lower()
        target_id = request.data.get('target_id', '')
        user = request.user if request.user.is_authenticated else User.objects.first()

        deleted_count = 0

        if scope == 'role' and target_id:
            role_key = target_id.upper()
            deleted_count, _ = RoleSectionPermission.objects.filter(role=role_key).delete()
            FeatureFlagAuditLog.objects.create(
                changed_by=user,
                scope_type='ROLE',
                target_identifier=role_key,
                section_key='ALL_SECTIONS_RESET',
                previous_state=False,
                new_state=True
            )
        elif scope == 'group' and target_id:
            deleted_count, _ = GroupSectionPermission.objects.filter(group_id=target_id).delete()
            FeatureFlagAuditLog.objects.create(
                changed_by=user,
                scope_type='GROUP',
                target_identifier=target_id,
                section_key='ALL_SECTIONS_RESET',
                previous_state=False,
                new_state=True
            )
        elif scope == 'user' and target_id:
            try:
                target_user = User.objects.get(id=target_id)
                deleted_count, _ = UserSectionOverride.objects.filter(user=target_user).delete()
                FeatureFlagAuditLog.objects.create(
                    changed_by=user,
                    scope_type='USER',
                    target_identifier=f"User #{target_user.id}",
                    section_key='ALL_SECTIONS_RESET',
                    previous_state=False,
                    new_state=True
                )
            except Exception:
                pass

        return Response({
            "status": "success",
            "message": f"Reset {deleted_count} override(s) for scope '{scope}'",
            "deleted_count": deleted_count
        }, status=status.HTTP_200_OK)


class ControlPanelAuditLogView(APIView):
    """
    Fetches feature flag audit logs.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import FeatureFlagAuditLog
        logs = FeatureFlagAuditLog.objects.all()[:50]
        data = []
        for log in logs:
            data.append({
                "id": log.id,
                "changed_by": log.changed_by.phone_number if log.changed_by else "System Admin",
                "scope_type": log.scope_type,
                "target_identifier": log.target_identifier,
                "section_key": log.section_key,
                "previous_state": log.previous_state,
                "new_state": log.new_state,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %I:%M:%S %p"),
            })

        return Response({
            "status": "success",
            "logs": data
        }, status=status.HTTP_200_OK)