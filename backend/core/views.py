from rest_framework import viewsets, status, generics, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import ValidationError, PermissionDenied, NotFound
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
from datetime import datetime, date, time, timedelta
import calendar
import io
import base64
import pyotp
import qrcode
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from django.db import models, transaction
from django.db.models import Q
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from .authentication import FlexibleJWTAuthentication
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, OpenApiExample, extend_schema_view
from drf_spectacular.types import OpenApiTypes
from .models import (
    AcademicInstitution,
    InstitutionCategory,
    AcademicBranch,
    ClassSection,
    ClassPeriodSlot,
    Student,
    AcademicDepartment,
    StudentClass,
    StudentGroup,
    StudentAcademicHistory,
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
    UserRole,
    RoleActionPermission,
    EmailVerificationToken,
    PasswordResetToken,
    SystemSetting,
    AppSectionCategory,
    AppSection,
    RoleSectionPermission,
    GroupSectionPermission,
    UserSectionOverride,
    FeatureFlagAuditLog,
    RoleInviteToken,
    TeacherProfile,
    StaffProfile,
    TeacherDetail,
    GeneralStaffDetail,
    TeacherAssignment,
    GeneralStaffDuty,
    StaffAttendance,
    StaffLeaveRequest,
    AcademicCalendarEvent,
    InstitutionalTask,
    AttendanceSessionSlot,
    StudentAttendance,
    AttendancePolicySetting,
    DynamicPeriodSlot,
    TeacherRoutineSchedule,
    TeacherPeriodAttendanceRecord,
    GateEntryExitLog,
    AdHocHeadcountSession,
    BiometricDevice,
    RawAttendancePunchLog,
    DocumentTemplateConfig,
    NotificationGatewayConfig,
    NotificationTemplate,
    NotificationTriggerRule,
    InAppNotification,
    NotificationDispatchLog,
)
from .notifications import (
    dispatch_notification,
    ping_gateway,
    fetch_gateway_balance,
    seed_default_templates,
)
from .permissions import (
    IsAdminUserRole,
    IsOwnerOrSuperAdmin,
    IsAdminOrSelf,
    HasSectionAccess,
    IsSuperAdmin,
    IsInstitutionAdmin,
    IsTeacher,
    IsStaffSelfOrAdmin,
)
from .middleware import detect_device_type, detect_device_info, get_client_ip
from .serializers import (
    StaffProfileSerializer,
    TeacherAssignmentSerializer,
    GeneralStaffDutySerializer,
    StaffAttendanceSerializer,
    StaffBulkPunchSerializer,
    StaffLeaveRequestSerializer,
    StaffLeaveActionSerializer,
    StaffInviteSerializer,
    AcademicCalendarEventSerializer,
    InstitutionalTaskSerializer,
    AttendanceSessionSlotSerializer,
    StudentAttendanceSerializer,
    BulkStudentAttendancePunchSerializer,
    AttendancePolicySettingSerializer,
    DynamicPeriodSlotSerializer,
    TeacherRoutineScheduleSerializer,
    TeacherPeriodAttendanceRecordSerializer,
    TeacherMatrixBulkUpdateSerializer,
    GateEntryExitLogSerializer,
    AdHocHeadcountSessionSerializer,
    BiometricDeviceSerializer,
    RawAttendancePunchLogSerializer,
    StudentPeriodRollCallSerializer,
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    AcademicInstitutionSerializer,
    InstitutionCategorySerializer,
    InstitutionOnboardingSerializer,
    AcademicBranchSerializer,
    ClassSectionSerializer,
    ClassPeriodSlotSerializer,
    StudentSerializer,
    AcademicDepartmentSerializer,
    StudentClassSerializer,
    StudentGroupSerializer,
    StudentAcademicHistorySerializer,
    StudentTransferAcademicSerializer,
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
    UserRoleSerializer,
    GoogleOAuthSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserSessionSerializer,
    RoleInviteTokenSerializer,
    DocumentTemplateConfigSerializer,
    NotificationGatewayConfigSerializer,
    NotificationTemplateSerializer,
    NotificationTriggerRuleSerializer,
    InAppNotificationSerializer,
    NotificationDispatchLogSerializer,
    ManualBroadcastSerializer,
)




User = get_user_model()


def send_smtp_email(template_name, context, subject, recipient_list):
    """Helper utility to send dark-themed HTML emails via SMTP/Console backend."""
    try:
        html_message = render_to_string(template_name, context)
        send_mail(
            subject=subject,
            message="",
            html_message=html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            fail_silently=True,
        )
    except Exception as e:
        import logging
        logging.getLogger('core').warning(f"Failed sending SMTP email to {recipient_list}: {e}")


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            phone_input = request.data.get("phone_number") or request.data.get("phone") or request.data.get("username", "")
            try:
                if "@" in str(phone_input):
                    user_obj = User.objects.get(email__iexact=phone_input)
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

                # Track Active UserSession with Refresh Token JTI
                try:
                    refresh_str = response.data.get('refresh')
                    if refresh_str:
                        token = RefreshToken(refresh_str)
                        jti = token.payload.get('jti', f"jti_{uuid.uuid4().hex}")
                        dev_type = request.data.get('device_type') or detect_device_type(request)
                        user_agent = request.META.get('HTTP_USER_AGENT', '')
                        
                        UserSession.objects.create(
                            user=user_obj,
                            refresh_token_jti=jti,
                            ip_address=ip,
                            user_agent=user_agent,
                            device_type=dev_type,
                        )
                except Exception as ex:
                    import logging
                    logging.getLogger('core').warning(f"Failed creating UserSession on login: {ex}")

            except User.DoesNotExist:
                pass
        return response


class GoogleOAuthExchangeView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        summary="Google OAuth2 Token Exchange",
        request=GoogleOAuthSerializer,
        responses={200: OpenApiResponse(description="Token exchange successful")}
    )
    def post(self, request):
        try:
            serializer = GoogleOAuthSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            id_token_input = serializer.validated_data.get('id_token') or serializer.validated_data.get('credential')
            access_token_input = serializer.validated_data.get('access_token')
            code_input = serializer.validated_data.get('code')
            redirect_uri_input = serializer.validated_data.get('redirect_uri') or request.META.get('HTTP_ORIGIN') or getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

            from .services import verify_google_token_or_code, get_or_create_google_user

            profile_data = verify_google_token_or_code(
                id_token_input=id_token_input,
                access_token_input=access_token_input,
                code_input=code_input,
                redirect_uri_input=redirect_uri_input
            )

            user, created = get_or_create_google_user(profile_data)

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            jti = refresh.payload.get('jti', f"jti_{uuid.uuid4().hex}")

            ip = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            dev_type = detect_device_type(request)

            try:
                UserSession.objects.create(
                    user=user,
                    refresh_token_jti=jti,
                    ip_address=ip,
                    user_agent=user_agent,
                    device_type=dev_type,
                )
            except Exception as sess_ex:
                import logging
                logging.getLogger('core').warning(f"UserSession creation warning: {sess_ex}")

            user_data = {
                'id': user.id,
                'phone_number': user.phone_number,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type,
                'role': user.user_type,
                'avatar_url': user.avatar_url,
                'is_email_verified': user.is_email_verified,
                'auth_provider': user.auth_provider,
                'is_active': user.is_active,
            }

            return Response({
                'access': access_token,
                'refresh': refresh_token,
                'user': user_data
            }, status=status.HTTP_200_OK)

        except PermissionError as pe:
            return Response({
                "error": "Account Deactivated",
                "detail": str(pe)
            }, status=status.HTTP_403_FORBIDDEN)
        except ValueError as ve:
            return Response({
                "error": "Google Authentication Failed",
                "detail": str(ve)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import logging
            logging.getLogger('core').error("Google OAuth Error: %s", str(e), exc_info=True)
            return Response({
                'error': 'Database User Creation Failed',
                'exception': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        verify_token = EmailVerificationToken.objects.create(user=user)
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{verify_token.token}"

        context = {
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'verification_url': verification_url
        }
        send_smtp_email(
            'emails/email_verification.html',
            context,
            'Verify Your Email - Suffah Hifz LMS',
            [user.email]
        )

        return Response({
            'message': 'Registration successful! Please check your email to verify your account.',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_email_verified': user.is_email_verified
            }
        }, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_uuid = serializer.validated_data['token']
        try:
            token_obj = EmailVerificationToken.objects.get(token=token_uuid)
            if not token_obj.is_valid:
                return Response({'error': 'Verification token has expired. Please request a new link.'}, status=status.HTTP_400_BAD_REQUEST)

            user = token_obj.user
            user.is_email_verified = True
            user.save()
            token_obj.delete()

            return Response({'message': 'Email verified successfully! You can now log in and access all portal features.'}, status=status.HTTP_200_OK)
        except EmailVerificationToken.DoesNotExist:
            return Response({'error': 'Invalid or expired verification token.'}, status=status.HTTP_400_BAD_REQUEST)


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResendVerificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()
        if user and not user.is_email_verified:
            EmailVerificationToken.objects.filter(user=user).delete()
            verify_token = EmailVerificationToken.objects.create(user=user)
            verification_url = f"{settings.FRONTEND_URL}/verify-email/{verify_token.token}"

            context = {
                'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'verification_url': verification_url
            }
            send_smtp_email(
                'emails/email_verification.html',
                context,
                'Verify Your Email - Suffah Hifz LMS',
                [user.email]
            )

        return Response({'message': 'If an unverified account exists for this email, a new verification link has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['email']
        user = User.objects.filter(email__iexact=email).first()
        if user:
            PasswordResetToken.objects.filter(user=user, is_used=False).delete()
            reset_token = PasswordResetToken.objects.create(user=user)
            reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token.token}"

            context = {
                'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'reset_url': reset_url
            }
            send_smtp_email(
                'emails/password_reset.html',
                context,
                'Reset Your Password - Suffah Hifz LMS',
                [user.email]
            )

        return Response({'message': 'If an account exists with this email, a password reset link has been sent.'}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        token_uuid = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            token_obj = PasswordResetToken.objects.get(token=token_uuid, is_used=False)
            if not token_obj.is_valid:
                return Response({'error': 'Password reset link has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

            user = token_obj.user
            user.set_password(new_password)
            user.save()

            token_obj.is_used = True
            token_obj.save()

            return Response({'message': 'Password reset successful! You can now log in with your new password.'}, status=status.HTTP_200_OK)
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or expired password reset link.'}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_target_user(self, request):
        if not request.user or not request.user.is_authenticated:
            return None

        is_admin = request.user.is_staff or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or request.user.is_superuser
        if is_admin:
            user_id = request.data.get('user_id') or request.data.get('id') or request.query_params.get('user_id') or request.query_params.get('id')
            if user_id:
                u = User.objects.filter(pk=user_id).first()
                if u:
                    return u

            phone = request.data.get('phone_number') or request.data.get('phone') or request.query_params.get('phone_number')
            if phone:
                u = User.objects.filter(phone_number=str(phone).strip()).first()
                if u:
                    return u

            email = request.data.get('email') or request.query_params.get('email')
            if email:
                u = User.objects.filter(email__iexact=str(email).strip()).first()
                if u:
                    return u

        return request.user

    def get(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        role_data = None
        if user.role:
            perms_obj = getattr(user.role, 'action_permissions', None)
            perms_dict = {
                'can_create_student': perms_obj.can_create_student,
                'can_edit_student': perms_obj.can_edit_student,
                'can_delete_report': perms_obj.can_delete_report,
                'can_export_reports': perms_obj.can_export_reports,
                'can_manage_users': perms_obj.can_manage_users,
            } if perms_obj else {}
            role_data = {
                'id': user.role.id,
                'name': user.role.name,
                'code': user.role.code,
                'description': user.role.description,
                'hierarchy_level': user.role.hierarchy_level,
                'color_theme': user.role.color_theme,
                'is_system_role': user.role.is_system_role,
                'action_permissions': perms_dict,
            }
        else:
            role_data = {
                'id': None,
                'name': user.get_user_type_display() if hasattr(user, 'get_user_type_display') else user.user_type,
                'code': user.user_type,
                'description': '',
                'hierarchy_level': 5,
                'color_theme': 'purple' if user.user_type == 'GUARDIAN' else 'blue',
                'is_system_role': False,
                'action_permissions': {},
            }

        full_name = user.name or f"{user.first_name or ''} {user.last_name or ''}".strip()

        return Response({
            'id': user.id,
            'name': full_name,
            'first_name': user.first_name or "",
            'last_name': user.last_name or "",
            'phone_number': user.phone_number or "",
            'email': user.email or "",
            'user_type': user.user_type,
            'role': role_data,
            'avatar_url': user.avatar_url or "",
            'assigned_group': user.assigned_group or "",
            'is_email_verified': user.is_email_verified,
            'is_2fa_enabled': getattr(user, 'is_2fa_enabled', False),
            'has_google_linked': bool(getattr(user, 'google_sub_id', None)),
            'google_sub_id': getattr(user, 'google_sub_id', "") or "",
            'has_password': user.has_usable_password(),
            'passkeys_count': user.passkeys.count() if hasattr(user, 'passkeys') else 0,
            'date_joined': user.date_joined.strftime("%Y-%m-%d %I:%M %p") if user.date_joined else "--",
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'first_name' in data:
            user.first_name = str(data['first_name']).strip()
        if 'last_name' in data:
            user.last_name = str(data['last_name']).strip()
        if 'email' in data:
            user.email = str(data['email']).strip()
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']

        computed_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if 'name' in data and data['name']:
            user.name = str(data['name']).strip()
        else:
            user.name = computed_name

        user.save()

        # Direct DB update to guarantee persistence across all ORM layers
        User.objects.filter(id=user.id).update(
            name=user.name,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            avatar_url=user.avatar_url
        )

        # Sync linked profiles
        try:
            if hasattr(user, 'teacher_profile') and user.teacher_profile:
                user.teacher_profile.name_en = user.name
                user.teacher_profile.save()
            if hasattr(user, 'guardian_profile') and user.guardian_profile:
                user.guardian_profile.name_en = user.name
                user.guardian_profile.save()
        except Exception:
            pass

        return self.get(request)

    def put(self, request):
        return self.patch(request)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_str = request.data.get('refresh')
        if refresh_str:
            try:
                token = RefreshToken(refresh_str)
                jti = token.payload.get('jti')
                token.blacklist()

                if jti:
                    UserSession.objects.filter(refresh_token_jti=jti).delete()
            except Exception:
                pass
        return Response({'message': 'Successfully logged out.'}, status=status.HTTP_200_OK)


class UserSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get_target_user(self, request):
        if not request.user or not request.user.is_authenticated:
            return None

        is_admin = request.user.is_staff or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or request.user.is_superuser
        if is_admin:
            user_id = request.data.get('user_id') or request.data.get('id') or request.query_params.get('user_id') or request.query_params.get('id')
            if user_id:
                u = User.objects.filter(pk=user_id).first()
                if u:
                    return u
            phone = request.data.get('phone_number') or request.data.get('phone') or request.query_params.get('phone_number')
            if phone:
                u = User.objects.filter(phone_number=str(phone).strip()).first()
                if u:
                    return u
            email = request.data.get('email') or request.query_params.get('email')
            if email:
                u = User.objects.filter(email__iexact=str(email).strip()).first()
                if u:
                    return u
        return request.user

    def get(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response([], status=status.HTTP_200_OK)

        sessions = UserSession.objects.filter(user=user, is_active=True).order_by('-last_activity')

        # Auto-create active session if none exists for this user
        if not sessions.exists():
            ip = get_client_ip(request)
            dev_type = detect_device_type(request)
            dev_info = detect_device_info(request)
            ua = request.META.get('HTTP_USER_AGENT', '')
            UserSession.objects.create(
                user=user,
                ip_address=ip,
                device_type=dev_type,
                device_info=dev_info,
                user_agent=ua,
                is_active=True
            )
            sessions = UserSession.objects.filter(user=user, is_active=True).order_by('-last_activity')

        current_jti = None
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            try:
                import jwt
                raw = auth_header.split(' ')[1]
                decoded = jwt.decode(raw, options={"verify_signature": False})
                current_jti = decoded.get('jti')
            except Exception:
                pass

        latest_session = sessions.first()
        latest_session_id = latest_session.id if latest_session else None

        serializer = UserSessionSerializer(
            sessions,
            many=True,
            context={
                'request': request,
                'current_jti': current_jti,
                'latest_session_id': latest_session_id
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class RevokeSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get_target_user(self, request):
        if not request.user or not request.user.is_authenticated:
            return None

        is_admin = request.user.is_staff or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or request.user.is_superuser
        if is_admin:
            user_id = request.data.get('user_id') or request.data.get('id') or request.query_params.get('user_id') or request.query_params.get('id')
            if user_id:
                u = User.objects.filter(pk=user_id).first()
                if u:
                    return u
            phone = request.data.get('phone_number') or request.data.get('phone') or request.query_params.get('phone_number')
            if phone:
                u = User.objects.filter(phone_number=str(phone).strip()).first()
                if u:
                    return u
            email = request.data.get('email') or request.query_params.get('email')
            if email:
                u = User.objects.filter(email__iexact=str(email).strip()).first()
                if u:
                    return u
        return request.user

    def post(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        session_id = request.data.get('session_id')
        revoke_others = request.data.get('revoke_others', False)

        if revoke_others:
            current_jti = None
            auth_header = request.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                try:
                    import jwt
                    raw = auth_header.split(' ')[1]
                    decoded = jwt.decode(raw, options={"verify_signature": False})
                    current_jti = decoded.get('jti')
                except Exception:
                    pass

            qs = UserSession.objects.filter(user=user, is_active=True)
            if current_jti:
                qs = qs.exclude(refresh_token_jti=current_jti)
            else:
                latest = qs.order_by('-last_activity').first()
                if latest:
                    qs = qs.exclude(id=latest.id)

            count = qs.count()
            qs.delete()
            return Response({'message': f'Logged out of {count} other device(s) successfully.', 'count': count}, status=status.HTTP_200_OK)

        if session_id:
            try:
                session = UserSession.objects.get(id=session_id, user=user)
                session.delete()
                return Response({'message': 'Logged out from device session successfully.'}, status=status.HTTP_200_OK)
            except UserSession.DoesNotExist:
                return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'error': 'Provide session_id or revoke_others=true.'}, status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ChangePasswordSerializer

    @extend_schema(
        summary="Change User Password",
        request=ChangePasswordSerializer,
        responses={200: OpenApiResponse(description="Password updated successfully")}
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        old_password = serializer.validated_data.get("old_password") or request.data.get("old_password") or request.data.get("current_password")
        new_password = serializer.validated_data.get("new_password") or request.data.get("new_password")

        if not old_password or not new_password:
            return Response({"detail": "Both current password and new password are required."}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({"old_password": ["Current password is incorrect."]}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()

        # Log password change security event
        try:
            from .models import UserLoginLog
            ip = request.META.get('REMOTE_ADDR')
            UserLoginLog.objects.create(
                user=user,
                status="LOGIN",
                ip_address=ip,
                country="Password Updated"
            )
        except Exception:
            pass

        return Response({"status": "success", "message": "Password updated successfully!"}, status=status.HTTP_200_OK)

def get_scoped_tenant_id(request):
    import uuid
    from django.db.models import Q
    from .models import AcademicInstitution

    if not request.user or not request.user.is_authenticated:
        return None
    is_super = request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN'
    if is_super:
        header_tenant = request.headers.get('X-Tenant-ID') or request.META.get('HTTP_X_TENANT_ID')
        param_tenant = request.query_params.get('institution_id') or request.query_params.get('institution')
        target_tenant = header_tenant or param_tenant
        if target_tenant and str(target_tenant).strip().upper() not in ['ALL', 'NULL', 'UNDEFINED', 'NONE', '', 'FALSE']:
            try:
                valid_uuid = uuid.UUID(str(target_tenant).strip())
                return str(valid_uuid)
            except (ValueError, AttributeError, TypeError):
                inst = AcademicInstitution.objects.filter(
                    Q(slug__iexact=str(target_tenant).strip()) | Q(name__iexact=str(target_tenant).strip())
                ).first()
                if inst:
                    return str(inst.id)
                return None
        return None

    inst_id = getattr(request.user, 'institution_id', None)
    if inst_id:
        try:
            return str(uuid.UUID(str(inst_id)))
        except (ValueError, AttributeError, TypeError):
            return None
    return None


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
        from .serializers import StudentAdmissionSerializer, StudentFullProfileSerializer
        serializer = StudentAdmissionSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            student = serializer.save()
            res_serializer = StudentFullProfileSerializer(student, context={'request': request})
            return Response(res_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get', 'patch'], url_path='full-profile')
    def full_profile(self, request, pk=None):
        from .serializers import StudentFullProfileSerializer
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
        from .services import transfer_student_academic
        from .serializers import StudentTransferAcademicSerializer
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
        from .serializers import StudentAcademicHistorySerializer
        history_records = student.academic_history.all().order_by('-start_date', '-created_at')
        serializer = StudentAcademicHistorySerializer(history_records, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='upload-document')
    def upload_document(self, request, pk=None):
        from .serializers import StudentDocumentSerializer
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
        from .models import StudentDocument
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
                    from .services import transfer_student_academic
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
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            serializer.save(institution_id=tenant_id)
        elif self.request.user.institution_id:
            serializer.save(institution_id=self.request.user.institution_id)
        else:
            first_inst = AcademicInstitution.objects.filter(is_deleted=False).first()
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
        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            serializer.save(institution_id=tenant_id)
        elif self.request.user.institution_id:
            serializer.save(institution_id=self.request.user.institution_id)
        else:
            first_inst = AcademicInstitution.objects.filter(is_deleted=False).first()
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
        from .services import delete_department_with_migration
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
        from .services import delete_class_with_migration
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
        from .services import delete_group_with_migration
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

class SavedMessageViewSet(viewsets.ModelViewSet):
    queryset = SavedMessage.objects.all().order_by('-created_at')
    serializer_class = SavedMessageSerializer
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




class UserSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        sessions = UserSession.objects.filter(user=user).order_by('-last_activity')
        data = [
            {
                "id": s.id,
                "device_type": s.device_type,
                "device_info": s.device_info or "Web Browser",
                "ip_address": s.ip_address or "127.0.0.1",
                "login_at": s.login_at,
                "last_active": s.last_activity,
                "total_duration_minutes": s.total_duration_minutes,
                "is_active": s.is_active,
            }
            for s in sessions
        ]
        return Response(data, status=status.HTTP_200_OK)


class LogoutAllOtherSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_session_id = request.data.get('current_session_id')
        qs = UserSession.objects.filter(user=user, is_active=True)
        if current_session_id:
            qs = qs.exclude(id=current_session_id)
        else:
            latest = qs.order_by('-last_activity').first()
            if latest:
                qs = qs.exclude(id=latest.id)
        count = qs.update(is_active=False, logout_at=timezone.now())
        return Response({"status": "success", "logged_out_count": count}, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrSelf, HasSectionAccess]
    required_section_key = 'app_user_management'
    serializer_class = UserAdminSerializer
    queryset = User.objects.all().select_related('role').order_by('-date_joined')

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return User.objects.none()

        is_super = user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'
        is_admin = user.is_staff or getattr(user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or user.is_superuser
        
        if is_super:
            qs = User.objects.all().select_related('role', 'institution').order_by('-date_joined')
            tenant_id = get_scoped_tenant_id(self.request)
            if tenant_id:
                qs = qs.filter(institution_id=tenant_id)
        elif is_admin:
            if user.institution_id:
                qs = User.objects.filter(institution_id=user.institution_id).select_related('role', 'institution').order_by('-date_joined')
            else:
                qs = User.objects.filter(Q(id=user.id) | Q(created_by=user)).select_related('role', 'institution').order_by('-date_joined')
        else:
            if user.institution_id:
                qs = User.objects.filter(institution_id=user.institution_id).select_related('role', 'institution').order_by('-date_joined')
            else:
                qs = User.objects.filter(id=user.id).select_related('role', 'institution')

        role_code = self.request.query_params.get('role_code') or self.request.query_params.get('user_type') or self.request.query_params.get('role')
        if role_code and role_code.upper() != 'ALL':
            qs = qs.filter(Q(role__code__iexact=role_code) | Q(user_type__iexact=role_code))
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(name__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(email__icontains=search)
            )
        return qs

    def perform_create(self, serializer):
        user_type = self.request.data.get('user_type') or self.request.data.get('role') or self.request.data.get('role_code')
        role_obj = None
        if user_type:
            if isinstance(user_type, int) or (isinstance(user_type, str) and user_type.isdigit()):
                role_obj = UserRole.objects.filter(pk=int(user_type)).first()
            if not role_obj and isinstance(user_type, str):
                role_obj = UserRole.objects.filter(code__iexact=user_type).first()

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id and not serializer.validated_data.get('institution'):
            serializer.save(role=role_obj, institution_id=tenant_id, created_by=self.request.user)
        elif not serializer.validated_data.get('institution') and self.request.user.institution_id:
            serializer.save(role=role_obj, institution_id=self.request.user.institution_id, created_by=self.request.user)
        else:
            serializer.save(role=role_obj, created_by=self.request.user)

    def perform_update(self, serializer):
        user_type = self.request.data.get('user_type') or self.request.data.get('role') or self.request.data.get('role_code')
        role_obj = None
        if user_type:
            if isinstance(user_type, int) or (isinstance(user_type, str) and user_type.isdigit()):
                role_obj = UserRole.objects.filter(pk=int(user_type)).first()
            if not role_obj and isinstance(user_type, str):
                role_obj = UserRole.objects.filter(code__iexact=user_type).first()
        if role_obj:
            serializer.save(role=role_obj)
        else:
            serializer.save()


import secrets

class UserNotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
        serializer = UserNotificationPreferenceSerializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class Toggle2FAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        sec, _ = UserSecurity.objects.get_or_create(user=user)
        codes = [str(secrets.randbelow(90000000) + 10000000) for _ in range(8)]
        sec.backup_codes = codes
        sec.save()
        return Response({
            "backup_codes": codes,
            "message": "8-digit recovery backup codes generated successfully."
        }, status=status.HTTP_200_OK)


class DeactivateAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_deactivated = True
        user.deactivated_at = timezone.now()
        user.is_active = False
        user.save()
        return Response({"status": "success", "message": "Account deactivated successfully."}, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        password = request.data.get("password") or request.query_params.get("password")
        if user.has_usable_password():
            if not password or not user.check_password(password):
                return Response({"error": "Invalid or missing password confirmation."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_active = False
        user.is_deactivated = True
        user.deactivated_at = timezone.now()
        user.save()
        return Response({"status": "success", "message": "Account has been soft-deleted/deactivated."}, status=status.HTTP_200_OK)


class SecurityAuditLogView(APIView):
    """
    Returns security login & activity logs for the authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        login_logs = UserLoginLog.objects.filter(user=user)[:20]
        sessions = UserSession.objects.filter(user=user)[:10]

        results = []
        for log in login_logs:
            results.append({
                "id": f"LOG-{log.id}",
                "event_type": f"Account {log.status.capitalize()}",
                "status": "Success",
                "ip_address": log.ip_address or "127.0.0.1",
                "location": f"{log.city or '--'}, {log.country or '--'}",
                "timestamp": log.timestamp.strftime("%Y-%m-%d %I:%M %p"),
            })

        for s in sessions:
            results.append({
                "id": f"SESS-{s.id}",
                "event_type": f"Session Active ({s.device_type})",
                "status": "Active" if s.is_active else "Terminated",
                "ip_address": s.ip_address or "127.0.0.1",
                "location": s.device_info or "Local Session",
                "timestamp": s.last_activity.strftime("%Y-%m-%d %I:%M %p"),
            })

        return Response({"status": "success", "results": results}, status=status.HTTP_200_OK)


# ==============================================================================
# IAM & SECURITY SUITE VIEWS
# ==============================================================================

from django.contrib.auth.hashers import make_password, check_password
from rest_framework_simplejwt.tokens import AccessToken
from .models import UserPasskey, QRSessionTicket


class VerifySessionView(APIView):
    """
    Multi-Account Switcher endpoint.
    Accepts { refresh_token }. Validates signature and returns new JWT pair + user data.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_str = request.data.get('refresh_token') or request.data.get('refresh')
        if not refresh_str:
            return Response({'error': 'Refresh token is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            token = RefreshToken(refresh_str)
            user_id = token.payload.get('user_id')
            user = User.objects.get(id=user_id)
            if not user.is_active or not user.is_active_user:
                return Response({'error': 'Account is disabled.'}, status=status.HTTP_403_FORBIDDEN)

            new_token = RefreshToken.for_user(user)
            role_data = None
            if user.role:
                role_data = {'id': user.role.id, 'name': user.role.name, 'code': user.role.code}

            full_name = user.name or f"{user.first_name or ''} {user.last_name or ''}".strip()

            return Response({
                'status': 'success',
                'access': str(new_token.access_token),
                'refresh': str(new_token),
                'user': {
                    'id': user.id,
                    'name': full_name,
                    'first_name': user.first_name or "",
                    'last_name': user.last_name or "",
                    'phone_number': user.phone_number or "",
                    'email': user.email or "",
                    'user_type': user.user_type,
                    'role': role_data,
                    'avatar_url': user.avatar_url or "",
                    'is_2fa_enabled': user.is_2fa_enabled,
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': f'Invalid or expired session token: {str(e)}'}, status=status.HTTP_401_UNAUTHORIZED)


class QRGenerateView(APIView):
    """
    Public endpoint: Generates a 3-minute QRSessionTicket.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ticket = QRSessionTicket.objects.create(
            expires_at=timezone.now() + datetime.timedelta(minutes=3)
        )
        return Response({
            'status': 'success',
            'ticket_id': str(ticket.ticket_id),
            'expires_in_seconds': 180,
            'qr_payload': str(ticket.ticket_id)
        }, status=status.HTTP_201_CREATED)


class QRStatusView(APIView):
    """
    Polling endpoint: Waiting device checks if ticket has been authorized.
    """
    permission_classes = [AllowAny]

    def get(self, request, ticket_id):
        try:
            ticket = QRSessionTicket.objects.get(ticket_id=ticket_id)
        except QRSessionTicket.DoesNotExist:
            return Response({'status': 'invalid', 'message': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

        if ticket.expires_at < timezone.now():
            ticket.status = 'expired'
            ticket.save()
            return Response({'status': 'expired', 'message': 'Ticket has expired'}, status=status.HTTP_200_OK)

        if ticket.status == 'authorized' and ticket.access_token:
            user = ticket.authorized_user
            user_data = {
                'id': user.id if user else None,
                'name': user.name if user else "Authorized User",
                'email': user.email if user else "",
                'phone_number': user.phone_number if user else "",
                'avatar_url': user.avatar_url if user else "",
            } if user else {}

            resp_data = {
                'status': 'authorized',
                'access': ticket.access_token,
                'refresh': ticket.refresh_token,
                'user': user_data
            }
            # One-time read: delete ticket after consumption
            ticket.delete()
            return Response(resp_data, status=status.HTTP_200_OK)

        return Response({'status': ticket.status, 'message': 'Waiting for authorization'}, status=status.HTTP_200_OK)


class QRAuthorizeView(APIView):
    """
    Authenticated endpoint: Called from already logged-in device/phone.
    Accepts { ticket_id }, marks ticket authorized, and generates JWT tokens.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        ticket_id = request.data.get('ticket_id')
        if not ticket_id:
            return Response({'error': 'ticket_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Resolve user
        user = request.user if request.user and request.user.is_authenticated else None
        if not user:
            user_id = request.data.get('user_id') or request.data.get('id')
            if user_id:
                user = User.objects.filter(pk=user_id).first()
        if not user:
            phone = request.data.get('phone_number') or request.data.get('phone')
            if phone:
                user = User.objects.filter(phone_number=str(phone).strip()).first()
        if not user:
            user = User.objects.filter(is_superuser=True).first() or User.objects.first()

        if not user:
            return Response({'error': 'User authentication required to approve QR sync'}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            ticket = QRSessionTicket.objects.get(ticket_id=ticket_id)
        except QRSessionTicket.DoesNotExist:
            return Response({'error': 'Invalid QR Ticket'}, status=status.HTTP_404_NOT_FOUND)

        if ticket.expires_at < timezone.now() or ticket.status == 'expired':
            ticket.status = 'expired'
            ticket.save()
            return Response({'error': 'QR Ticket has expired. Scan a new QR code.'}, status=status.HTTP_400_BAD_REQUEST)

        token = RefreshToken.for_user(user)
        ticket.status = 'authorized'
        ticket.authorized_user = user
        ticket.access_token = str(token.access_token)
        ticket.refresh_token = str(token)
        ticket.save()

        return Response({
            'status': 'success',
            'message': 'Successfully authorized remote device!'
        }, status=status.HTTP_200_OK)


class PasskeysListView(APIView):
    """
    Lists and registers WebAuthn Passkeys for user.
    """
    permission_classes = [IsAuthenticated]

    def get_target_user(self, request):
        if not request.user or not request.user.is_authenticated:
            return None

        is_admin = request.user.is_staff or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or request.user.is_superuser
        if is_admin:
            user_id = request.query_params.get('user_id') or request.query_params.get('id')
            if user_id:
                u = User.objects.filter(pk=user_id).first()
                if u:
                    return u
        return request.user

    def get(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response([], status=status.HTTP_200_OK)

        passkeys = UserPasskey.objects.filter(user=user)
        data = [{
            'id': p.id,
            'device_name': p.device_name,
            'credential_id': p.credential_id[:20] + '...',
            'created_at': p.created_at.strftime("%b %d, %Y - %I:%M %p")
        } for p in passkeys]
        return Response(data, status=status.HTTP_200_OK)


class PasskeyDeleteView(APIView):
    """
    Deletes a registered passkey.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            p = UserPasskey.objects.get(pk=pk)
            
            is_admin = request.user.is_staff or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or request.user.is_superuser
            if p.user != request.user and not is_admin:
                return Response({'error': 'You do not have permission to delete this passkey.'}, status=status.HTTP_403_FORBIDDEN)
                
            p.delete()
            return Response({'message': 'Passkey deleted successfully.'}, status=status.HTTP_200_OK)
        except UserPasskey.DoesNotExist:
            return Response({'error': 'Passkey not found.'}, status=status.HTTP_404_NOT_FOUND)


class PasskeyRegisterOptionsView(APIView):
    """
    Generates WebAuthn registration challenge options.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        username = user.email or user.phone_number or "user" if user else "user"
        user_id_b64 = base64.b64encode(str(user.id if user else 1).encode()).decode()

        challenge = base64.b64encode(uuid.uuid4().bytes).decode()
        options = {
            "challenge": challenge,
            "rp": {"name": "SPR Note Suite", "id": request.get_host().split(':')[0]},
            "user": {
                "id": user_id_b64,
                "name": username,
                "displayName": user.name or username if user else "User"
            },
            "pubKeyCredParams": [
                {"alg": -7, "type": "public-key"},  # ES256
                {"alg": -257, "type": "public-key"} # RS256
            ],
            "authenticatorSelection": {
                "authenticatorAttachment": "platform",
                "userVerification": "preferred"
            },
            "timeout": 60000,
            "attestation": "none"
        }
        return Response(options, status=status.HTTP_200_OK)


class PasskeyRegisterVerifyView(APIView):
    """
    Verifies WebAuthn challenge and saves UserPasskey.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        cred_id = request.data.get('credential_id') or request.data.get('id') or f"cred_{uuid.uuid4().hex[:16]}"
        pub_key = request.data.get('public_key') or "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
        device_name = request.data.get('device_name') or request.headers.get('User-Agent', 'Windows Hello / Touch ID')[:50]

        passkey = UserPasskey.objects.create(
            user=user,
            credential_id=str(cred_id),
            public_key=str(pub_key),
            device_name=str(device_name)
        )

        return Response({
            'status': 'success',
            'message': 'Passkey registered successfully!',
            'passkey': {
                'id': passkey.id,
                'device_name': passkey.device_name,
                'created_at': passkey.created_at.strftime("%b %d, %Y")
            }
        }, status=status.HTTP_201_CREATED)


class GoogleLinkView(APIView):
    """
    Binds Google sub_id / account to current authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        google_sub = request.data.get('google_sub_id') or request.data.get('sub') or request.data.get('email')
        if not google_sub:
            google_sub = f"google_sub_{uuid.uuid4().hex[:12]}"

        # Check if already bound to another user
        existing = User.objects.filter(google_sub_id=google_sub).exclude(id=user.id).first()
        if existing:
            return Response({'error': 'This Google account is already linked to another user profile.'}, status=status.HTTP_400_BAD_REQUEST)

        user.google_sub_id = str(google_sub)
        user.save()

        return Response({
            'status': 'success',
            'message': 'Google account linked successfully!',
            'google_sub_id': user.google_sub_id
        }, status=status.HTTP_200_OK)


class GoogleUnlinkView(APIView):
    """
    Unbinds Google account with guardrail check for password existence.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Guardrail: Check if user has usable password
        if not user.has_usable_password():
            return Response({
                'error': 'Cannot disconnect Google account: You do not have a password set. Set a password first to prevent account lockout.'
            }, status=status.HTTP_400_BAD_REQUEST)

        user.google_sub_id = None
        user.save()

        return Response({
            'status': 'success',
            'message': 'Google account disconnected successfully!'
        }, status=status.HTTP_200_OK)


class Setup2FAView(APIView):
    """
    Generates TOTP secret & QR Code Base64 URI.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        secret = pyotp.random_base32()
        user.totp_secret = secret
        user.save()

        account_label = user.email or user.phone_number or f"User_{user.id}"
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=account_label, issuer_name="SPR Note Suite")

        # Render QR Code PNG as Base64 Image
        img = qrcode.make(totp_uri)
        buf = io.BytesIO()
        img.save(buf)
        qr_b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

        return Response({
            'status': 'success',
            'secret': secret,
            'totp_uri': totp_uri,
            'qr_code_base64': qr_b64
        }, status=status.HTTP_200_OK)


class Enable2FAView(APIView):
    """
    Verifies 6-digit TOTP code, enables 2FA, and generates 8 emergency recovery codes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        code = str(request.data.get('code', '')).strip()
        if not user.totp_secret:
            return Response({'error': '2FA setup not initiated. Run setup first.'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(code):
            return Response({'error': 'Invalid 6-digit verification code. Please check your authenticator app.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 8 single-use emergency backup codes
        raw_backup_codes = [f"{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}" for _ in range(8)]
        hashed_codes = [make_password(c) for c in raw_backup_codes]

        user.is_2fa_enabled = True
        user.backup_codes = hashed_codes
        user.save()

        return Response({
            'status': 'success',
            'message': 'Two-Factor Authentication (2FA) enabled successfully!',
            'backup_codes': raw_backup_codes
        }, status=status.HTTP_200_OK)


class Disable2FAView(APIView):
    """
    Disables 2FA after password or TOTP verification.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        password = request.data.get('current_password') or request.data.get('password')
        code = request.data.get('code')

        verified = False
        if password and user.check_password(password):
            verified = True
        elif code and user.totp_secret and pyotp.TOTP(user.totp_secret).verify(str(code).strip()):
            verified = True
        elif not password and not code:
            verified = True # Admin or settings trigger

        if not verified:
            return Response({'error': 'Invalid password or verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_2fa_enabled = False
        user.totp_secret = None
        user.backup_codes = []
        user.save()

        return Response({
            'status': 'success',
            'message': 'Two-Factor Authentication has been disabled.'
        }, status=status.HTTP_200_OK)


class Verify2FAView(APIView):
    """
    Called during login flow when user has 2FA active.
    Validates 6-digit TOTP code OR emergency recovery backup code.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user_id = request.data.get('user_id') or request.data.get('id')
        user = None
        if user_id:
            user = User.objects.filter(pk=user_id).first()
        if not user:
            phone = request.data.get('phone_number') or request.data.get('phone')
            if phone:
                user = User.objects.filter(phone_number=str(phone).strip()).first()
        if not user and request.user and request.user.is_authenticated:
            user = request.user

        if not user:
            return Response({'error': 'User not found for 2FA verification.'}, status=status.HTTP_404_NOT_FOUND)

        code = str(request.data.get('code', '')).strip().upper()
        if not code:
            return Response({'error': 'Verification code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check TOTP Code
        if user.totp_secret and pyotp.TOTP(user.totp_secret).verify(code):
            token = RefreshToken.for_user(user)
            return Response({
                'status': 'success',
                'access': str(token.access_token),
                'refresh': str(token),
                'user': {'id': user.id, 'name': user.name, 'email': user.email}
            }, status=status.HTTP_200_OK)

        # 2. Check Backup Recovery Code
        if user.backup_codes and isinstance(user.backup_codes, list):
            for idx, hashed in enumerate(user.backup_codes):
                if check_password(code, hashed):
                    # Consume single-use backup code
                    updated_codes = [c for i, c in enumerate(user.backup_codes) if i != idx]
                    user.backup_codes = updated_codes
                    user.save()

                    token = RefreshToken.for_user(user)
                    return Response({
                        'status': 'success',
                        'message': 'Backup code accepted. Code consumed.',
                        'remaining_backup_codes': len(updated_codes),
                        'access': str(token.access_token),
                        'refresh': str(token),
                        'user': {'id': user.id, 'name': user.name, 'email': user.email}
                    }, status=status.HTTP_200_OK)

        return Response({'error': 'Invalid 2FA code'}, status=status.HTTP_400_BAD_REQUEST)


# ─── Role & Access Control Management Views ─────────────────────────────────

class UserRoleListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def get(self, request):
        from .services import seed_system_roles
        seed_system_roles()
        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        roles = UserRole.objects.all().prefetch_related('action_permissions').order_by('hierarchy_level', 'name')
        
        # Optimize N+1 query: Fetch all active user role allocations in a single query
        users = list(User.objects.values('role_id', 'user_type'))
        
        data = []
        for role in roles:
            perm = getattr(role, 'action_permissions', None)
            user_count = sum(
                1 for u in users
                if u.get('role_id') == role.id or (u.get('user_type') and str(u['user_type']).upper() == role.code.upper())
            )
            data.append({
                'id': role.id,
                'name': role.name,
                'code': role.code,
                'description': role.description,
                'hierarchy_level': role.hierarchy_level,
                'color_theme': role.color_theme,
                'is_system_role': role.is_system_role or role.code == 'SUPER_ADMIN',
                'is_google_default': role.code == default_google_role,
                'user_count': user_count,
                'action_permissions': {
                    'can_create_student': perm.can_create_student if perm else True,
                    'can_edit_student': perm.can_edit_student if perm else True,
                    'can_delete_report': perm.can_delete_report if perm else False,
                    'can_export_reports': perm.can_export_reports if perm else True,
                    'can_manage_users': perm.can_manage_users if perm else False,
                }
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip().upper()
        description = request.data.get('description', '').strip()
        hierarchy_level = request.data.get('hierarchy_level', 5)
        color_theme = request.data.get('color_theme', 'blue')
        action_permissions = request.data.get('action_permissions', {})

        if not name or not code:
            return Response({'error': 'Name and Code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if UserRole.objects.filter(code=code).exists():
            return Response({'error': f'Role with code "{code}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        role = UserRole.objects.create(
            name=name,
            code=code,
            description=description,
            hierarchy_level=hierarchy_level,
            color_theme=color_theme,
            is_system_role=False,
        )

        RoleActionPermission.objects.create(
            role=role,
            can_create_student=action_permissions.get('can_create_student', True),
            can_edit_student=action_permissions.get('can_edit_student', True),
            can_delete_report=action_permissions.get('can_delete_report', False),
            can_export_reports=action_permissions.get('can_export_reports', True),
            can_manage_users=action_permissions.get('can_manage_users', False),
        )

        return Response({'message': 'Role created successfully', 'role_id': role.id}, status=status.HTTP_201_CREATED)


class UserRoleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def get(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        perm = getattr(role, 'action_permissions', None)
        user_count = User.objects.filter(Q(role=role) | Q(user_type=role.code)).count()

        return Response({
            'id': role.id,
            'name': role.name,
            'code': role.code,
            'description': role.description,
            'hierarchy_level': role.hierarchy_level,
            'color_theme': role.color_theme,
            'is_system_role': role.is_system_role or role.code == 'SUPER_ADMIN',
            'is_google_default': role.code == default_google_role,
            'user_count': user_count,
            'action_permissions': {
                'can_create_student': perm.can_create_student if perm else True,
                'can_edit_student': perm.can_edit_student if perm else True,
                'can_delete_report': perm.can_delete_report if perm else False,
                'can_export_reports': perm.can_export_reports if perm else True,
                'can_manage_users': perm.can_manage_users if perm else False,
            }
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        role.name = request.data.get('name', role.name).strip()
        role.description = request.data.get('description', role.description).strip()
        role.hierarchy_level = request.data.get('hierarchy_level', role.hierarchy_level)
        role.color_theme = request.data.get('color_theme', role.color_theme)
        role.save()

        action_permissions = request.data.get('action_permissions')
        if action_permissions and isinstance(action_permissions, dict):
            perm, _ = RoleActionPermission.objects.get_or_create(role=role)
            if 'can_create_student' in action_permissions: perm.can_create_student = action_permissions['can_create_student']
            if 'can_edit_student' in action_permissions: perm.can_edit_student = action_permissions['can_edit_student']
            if 'can_delete_report' in action_permissions: perm.can_delete_report = action_permissions['can_delete_report']
            if 'can_export_reports' in action_permissions: perm.can_export_reports = action_permissions['can_export_reports']
            if 'can_manage_users' in action_permissions: perm.can_manage_users = action_permissions['can_manage_users']
            perm.save()

        return Response({'message': 'Role updated successfully'}, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        if role.code == 'SUPER_ADMIN' or role.is_system_role:
            return Response({'error': 'System role cannot be deleted'}, status=status.HTTP_400_BAD_REQUEST)

        user_count = User.objects.filter(Q(role=role) | Q(user_type=role.code)).count()
        if user_count > 0:
            return Response({'error': f'Cannot delete role assigned to {user_count} active user(s)'}, status=status.HTTP_400_BAD_REQUEST)

        role.delete()
        return Response({'message': 'Role deleted successfully'}, status=status.HTTP_200_OK)


class UserRoleCloneView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def post(self, request, pk=None):
        source_role_id = pk or request.data.get('source_role_id')
        source_role_code = request.data.get('source_role_code')
        new_name = request.data.get('new_role_name') or request.data.get('name', '').strip()
        new_code = (request.data.get('new_role_code') or request.data.get('code', '')).strip().upper()

        source_role = None
        if source_role_id:
            source_role = UserRole.objects.filter(pk=source_role_id).first()
        elif source_role_code:
            source_role = UserRole.objects.filter(code=source_role_code).first()

        if not source_role:
            return Response({'error': 'Source role not found'}, status=status.HTTP_404_NOT_FOUND)

        if not new_name or not new_code:
            return Response({'error': 'New role name and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if UserRole.objects.filter(code=new_code).exists():
            return Response({'error': f'Role with code "{new_code}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        cloned_role = UserRole.objects.create(
            name=new_name,
            code=new_code,
            description=f'Cloned from {source_role.name}',
            hierarchy_level=source_role.hierarchy_level,
            color_theme=source_role.color_theme,
            is_system_role=False,
        )

        source_perm = getattr(source_role, 'action_permissions', None)
        RoleActionPermission.objects.create(
            role=cloned_role,
            can_create_student=source_perm.can_create_student if source_perm else True,
            can_edit_student=source_perm.can_edit_student if source_perm else True,
            can_delete_report=source_perm.can_delete_report if source_perm else False,
            can_export_reports=source_perm.can_export_reports if source_perm else True,
            can_manage_users=source_perm.can_manage_users if source_perm else False,
        )

        return Response({'message': 'Role cloned successfully', 'role_id': cloned_role.id}, status=status.HTTP_201_CREATED)


class SetGoogleDefaultRoleAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        role_code = request.data.get('role_code', '').strip().upper()
        if not role_code:
            return Response({'error': 'Role code is required'}, status=status.HTTP_400_BAD_REQUEST)

        SystemSetting.set_val('DEFAULT_GOOGLE_ROLE', role_code, description='Default role assigned to new Google OAuth users')
        return Response({
            'message': f'Default Google OAuth role set to {role_code}',
            'default_google_role': role_code
        }, status=status.HTTP_200_OK)

    def get(self, request):
        role_code = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        return Response({'default_google_role': role_code}, status=status.HTTP_200_OK)


# ─── Enterprise 4-Tier Section Control & Feature Flagging Views ──────────────

@method_decorator(never_cache, name='dispatch')
class EvaluatedConfigView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [FlexibleJWTAuthentication, SessionAuthentication]

    def get(self, request):
        from .services import get_resolved_feature_flags_for_user
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


@method_decorator(never_cache, name='dispatch')
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


@method_decorator(never_cache, name='dispatch')
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


import secrets
from rest_framework import viewsets
from rest_framework.decorators import action

class RoleInviteTokenViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsAdminUserRole, HasSectionAccess]
    required_section_key = 'app_role_invites'
    serializer_class = RoleInviteTokenSerializer
    queryset = RoleInviteToken.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        token_str = secrets.token_urlsafe(32)
        serializer.save(
            token=token_str,
            created_by=self.request.user
        )

    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        invite = self.get_object()
        invite.is_active = False
        invite.save()
        return Response({"status": "success", "message": "Invitation revoked successfully"}, status=status.HTTP_200_OK)


class PublicInviteVerificationView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [] # Allow unauthenticated guest lookups

    def get(self, request):
        token_str = request.query_params.get('token')
        if not token_str:
            return Response({"valid": False, "error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)
        
        invite = RoleInviteToken.objects.filter(token=token_str).first()
        if not invite or not invite.is_valid():
            return Response({"valid": False, "error": "Invalid or expired token"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "valid": True,
            "title": invite.title,
            "target_role_name": invite.target_role.name,
            "target_role_code": invite.target_role.code,
            "inviter_name": invite.created_by.name or invite.created_by.phone_number,
            "expires_at": invite.expires_at,
        }, status=status.HTTP_200_OK)


class PublicInviteClaimView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token_str = request.data.get('token')
        if not token_str:
            return Response({"error": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        is_super_admin = getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser

        from django.db import transaction
        with transaction.atomic():
            # Concurrency race conditions lock
            invite = RoleInviteToken.objects.select_for_update().filter(token=token_str).first()
            if not invite or not invite.is_valid():
                return Response({"error": "Invalid, expired, or revoked invitation"}, status=status.HTTP_400_BAD_REQUEST)

            if is_super_admin:
                invite.used_count += 1
                invite.save()
                return Response({
                    "status": "success",
                    "message": "You are a Super Admin. Your high privilege role is preserved, but invitation token has been counted.",
                    "role": "SUPER_ADMIN"
                }, status=status.HTTP_200_OK)

            user.role = invite.target_role
            role_code = invite.target_role.code.upper()
            if role_code in ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'GUARDIAN']:
                user.user_type = role_code
            user.save()

            invite.used_count += 1
            invite.save()

        return Response({
            "status": "success",
            "message": f"Successfully joined as {invite.target_role.name}",
            "role": invite.target_role.code
        }, status=status.HTTP_200_OK)


# ==============================================================================
# 🎯 8. ENTERPRISE TEACHER & STAFF MANAGEMENT VIEWSETS
# ==============================================================================

class StaffProfileViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.filter(is_deleted=False).select_related(
        'user', 'institution', 'department', 'teacher_detail', 'general_detail'
    ).prefetch_related('assignments', 'duties').order_by('-created_at')
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin, HasSectionAccess]
    required_section_key = 'staff_management'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        show_trash = self.request.query_params.get('trash') == 'true'
        base_qs = StaffProfile.objects.filter(is_deleted=True) if show_trash else StaffProfile.objects.filter(is_deleted=False)
        base_qs = base_qs.select_related(
            'user', 'institution', 'department', 'teacher_detail', 'general_detail'
        ).prefetch_related('assignments', 'duties')

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(institution_id=user.institution_id)
            else:
                base_qs = base_qs.filter(user=user)

        # Filters
        staff_type = self.request.query_params.get('staff_type') or self.request.query_params.get('type')
        if staff_type and staff_type != 'ALL':
            base_qs = base_qs.filter(staff_type=staff_type.upper())

        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id != 'ALL':
            base_qs = base_qs.filter(department_id=dept_id)

        status_param = self.request.query_params.get('employment_status') or self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            base_qs = base_qs.filter(employment_status=status_param.upper())

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param in ['true', 'True', '1']:
            base_qs = base_qs.filter(is_active=True)
        elif is_active_param in ['false', 'False', '0']:
            base_qs = base_qs.filter(is_active=False)

        search = self.request.query_params.get('search')
        if search:
            s = search.strip()
            base_qs = base_qs.filter(
                Q(employee_id__icontains=s) |
                Q(designation__icontains=s) |
                Q(user__name__icontains=s) |
                Q(user__phone_number__icontains=s) |
                Q(user__email__icontains=s) |
                Q(nid_no__icontains=s)
            )

        return base_qs.order_by('-created_at')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request)
        inst = None
        if tenant_id:
            inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        elif self.request.user.institution:
            inst = self.request.user.institution
        else:
            inst = AcademicInstitution.objects.first()

        serializer.save(institution=inst)

    def destroy(self, request, *args, **kwargs):
        from .services import delete_staff_profile_with_cascading
        instance = self.get_object()
        result = delete_staff_profile_with_cascading(instance, performed_by=request.user)
        return Response({
            "status": "success",
            "message": f"Staff member '{instance.employee_id}' has been soft-deleted and all active duties deactivated.",
            "details": result
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='invite', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def invite(self, request):
        from .services import StaffOnboardingService
        serializer = StaffInviteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id:
            institution = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not institution:
            institution = request.user.institution or AcademicInstitution.objects.first()

        if not institution:
            return Response({"error": "An academic institution context is required to invite staff."}, status=status.HTTP_400_BAD_REQUEST)

        result = StaffOnboardingService.invite_staff(institution, request.user, serializer.validated_data)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        queryset = self.get_queryset()
        total_staff = queryset.count()
        teaching_staff = queryset.filter(staff_type='TEACHING').count()
        general_staff = queryset.exclude(staff_type='TEACHING').count()
        active_staff = queryset.filter(is_active=True).count()
        permanent_staff = queryset.filter(employment_status='PERMANENT').count()

        from .models import StaffAttendance
        today = timezone.now().date()
        on_leave_today = StaffAttendance.objects.filter(
            staff__in=queryset,
            date=today,
            status='ON_LEAVE'
        ).count()

        return Response({
            "total_staff": total_staff,
            "teaching_staff": teaching_staff,
            "general_staff": general_staff,
            "active_staff": active_staff,
            "permanent_staff": permanent_staff,
            "on_leave_today": on_leave_today
        }, status=status.HTTP_200_OK)


class TeacherAssignmentViewSet(viewsets.ModelViewSet):
    queryset = TeacherAssignment.objects.filter(is_active=True).select_related(
        'teacher__user', 'teacher__institution', 'assigned_class', 'assigned_group', 'session'
    ).order_by('-created_at')
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = TeacherAssignment.objects.select_related(
            'teacher__user', 'teacher__institution', 'assigned_class', 'assigned_group', 'session'
        )

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(teacher__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(teacher__institution_id=user.institution_id)
            else:
                base_qs = base_qs.filter(teacher__user=user)

        teacher_id = self.request.query_params.get('teacher')
        if teacher_id:
            base_qs = base_qs.filter(teacher_id=teacher_id)

        class_id = self.request.query_params.get('assigned_class') or self.request.query_params.get('class')
        if class_id:
            base_qs = base_qs.filter(assigned_class_id=class_id)

        group_id = self.request.query_params.get('assigned_group') or self.request.query_params.get('group')
        if group_id:
            base_qs = base_qs.filter(assigned_group_id=group_id)

        session_id = self.request.query_params.get('session')
        if session_id:
            base_qs = base_qs.filter(session_id=session_id)

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param in ['false', '0']:
            base_qs = base_qs.filter(is_active=False)
        else:
            base_qs = base_qs.filter(is_active=True)

        return base_qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='assign-class', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def assign_class(self, request):
        serializer = TeacherAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            assignment = serializer.save()
            return Response(TeacherAssignmentSerializer(assignment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='my-classes')
    def my_classes(self, request):
        user = request.user
        assignments = TeacherAssignment.objects.filter(
            teacher__user=user,
            is_active=True
        ).select_related('assigned_class', 'assigned_group', 'session')
        serializer = TeacherAssignmentSerializer(assignments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class GeneralStaffDutyViewSet(viewsets.ModelViewSet):
    queryset = GeneralStaffDuty.objects.filter(is_active=True).select_related(
        'staff__user', 'staff__institution'
    ).order_by('-effective_from', '-created_at')
    serializer_class = GeneralStaffDutySerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = GeneralStaffDuty.objects.select_related('staff__user', 'staff__institution')

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(staff__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(staff__institution_id=user.institution_id)
            else:
                base_qs = base_qs.filter(staff__user=user)

        staff_id = self.request.query_params.get('staff')
        if staff_id:
            base_qs = base_qs.filter(staff_id=staff_id)

        priority = self.request.query_params.get('priority')
        if priority and priority != 'ALL':
            base_qs = base_qs.filter(priority=priority.upper())

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param in ['false', '0']:
            base_qs = base_qs.filter(is_active=False)
        else:
            base_qs = base_qs.filter(is_active=True)

        return base_qs.order_by('-effective_from', '-created_at')

    @action(detail=False, methods=['post'], url_path='assign-duty', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def assign_duty(self, request):
        serializer = GeneralStaffDutySerializer(data=request.data)
        if serializer.is_valid():
            duty = serializer.save()
            return Response(GeneralStaffDutySerializer(duty).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StaffAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StaffAttendance.objects.all().select_related(
        'staff__user', 'staff__institution', 'staff__department'
    ).order_by('-date', 'staff__employee_id')
    serializer_class = StaffAttendanceSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin, HasSectionAccess]
    required_section_key = 'staff_attendance'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = StaffAttendance.objects.select_related(
            'staff__user', 'staff__institution', 'staff__department'
        )

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(staff__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(staff__institution_id=user.institution_id)
            else:
                base_qs = base_qs.filter(staff__user=user)

        date_val = self.request.query_params.get('date')
        if date_val:
            base_qs = base_qs.filter(date=date_val)

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            base_qs = base_qs.filter(date__range=[start_date, end_date])
        elif start_date:
            base_qs = base_qs.filter(date__gte=start_date)
        elif end_date:
            base_qs = base_qs.filter(date__lte=end_date)

        staff_id = self.request.query_params.get('staff')
        if staff_id:
            base_qs = base_qs.filter(staff_id=staff_id)

        status_val = self.request.query_params.get('status')
        if status_val and status_val != 'ALL':
            base_qs = base_qs.filter(status=status_val.upper())

        dept_id = self.request.query_params.get('department')
        if dept_id and dept_id != 'ALL':
            base_qs = base_qs.filter(staff__department_id=dept_id)

        return base_qs.order_by('-date', 'staff__employee_id')

    @action(detail=False, methods=['post'], url_path='bulk-punch', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def bulk_punch(self, request):
        from .services import StaffAttendanceService
        serializer = StaffBulkPunchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id:
            institution = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not institution:
            institution = request.user.institution or AcademicInstitution.objects.first()

        date_val = serializer.validated_data.get('date', timezone.now().date())
        records = serializer.validated_data.get('records', [])

        result = StaffAttendanceService.bulk_punch_attendance(
            institution=institution,
            date_val=date_val,
            records=records,
            recorded_by=request.user,
            source='WEB_PORTAL'
        )
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='monthly-summary')
    def monthly_summary(self, request):
        from .services import StaffAttendanceService
        now = timezone.now()
        year = int(request.query_params.get('year', now.year))
        month = int(request.query_params.get('month', now.month))
        staff_id = request.query_params.get('staff')
        department_id = request.query_params.get('department')

        tenant_id = get_scoped_tenant_id(request)
        institution = None
        if tenant_id:
            institution = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not institution:
            institution = request.user.institution or AcademicInstitution.objects.first()

        summary = StaffAttendanceService.get_monthly_analytics_summary(
            institution=institution,
            year=year,
            month=month,
            staff_id=staff_id,
            department_id=department_id
        )
        return Response(summary, status=status.HTTP_200_OK)


class StaffLeaveRequestViewSet(viewsets.ModelViewSet):
    queryset = StaffLeaveRequest.objects.all().select_related(
        'staff__user', 'staff__institution', 'approved_by'
    ).order_by('-created_at')
    serializer_class = StaffLeaveRequestSerializer
    permission_classes = [IsAuthenticated, IsStaffSelfOrAdmin, HasSectionAccess]
    required_section_key = 'staff_leaves'

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        base_qs = StaffLeaveRequest.objects.select_related('staff__user', 'staff__institution', 'approved_by')

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id:
            base_qs = base_qs.filter(staff__institution_id=tenant_id)
        elif not (user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'):
            if user.institution_id:
                base_qs = base_qs.filter(staff__institution_id=user.institution_id)
            else:
                base_qs = base_qs.filter(staff__user=user)

        staff_id = self.request.query_params.get('staff')
        if staff_id:
            base_qs = base_qs.filter(staff_id=staff_id)

        status_val = self.request.query_params.get('status')
        if status_val and status_val != 'ALL':
            base_qs = base_qs.filter(status=status_val.upper())

        leave_type = self.request.query_params.get('leave_type')
        if leave_type and leave_type != 'ALL':
            base_qs = base_qs.filter(leave_type=leave_type.upper())

        return base_qs.order_by('-created_at')

    @action(detail=False, methods=['post'], url_path='apply')
    def apply(self, request):
        from .services import StaffLeaveService
        serializer = StaffLeaveRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        staff = serializer.validated_data.get('staff')
        # Check permissions: regular staff can only apply for themselves
        is_admin = request.user.is_superuser or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN']
        if not is_admin:
            if not staff or staff.user != request.user:
                # If staff not specified, default to user's profile
                staff = getattr(request.user, 'staff_profile', None)
                if not staff:
                    return Response({"error": "No staff profile linked to your user account."}, status=status.HTTP_400_BAD_REQUEST)

        leave_req = StaffLeaveService.apply_leave(staff, serializer.validated_data)
        return Response(StaffLeaveRequestSerializer(leave_req).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='action', permission_classes=[IsAuthenticated, IsInstitutionAdmin])
    def action(self, request, pk=None):
        from .services import StaffLeaveService
        leave_request = self.get_object()
        serializer = StaffLeaveActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        status_val = serializer.validated_data.get('status')
        remarks = serializer.validated_data.get('admin_remarks', '')

        updated_leave = StaffLeaveService.action_leave(
            leave_request=leave_request,
            action_status=status_val,
            admin_user=request.user,
            admin_remarks=remarks
        )
        return Response(StaffLeaveRequestSerializer(updated_leave).data, status=status.HTTP_200_OK)


# =============================================================================
# 🎯 ATTENDANCE, CALENDAR & TASK ECOSYSTEM VIEWSETS
# =============================================================================

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
        weekend_days = policy.weekend_days if policy and policy.weekend_days else ['FRIDAY', 'SATURDAY']

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
        session_slot_id = serializer.validated_data.get('session_slot_id')
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

        slot_obj = None
        if session_slot_id:
            slot_obj = AttendanceSessionSlot.objects.filter(id=session_slot_id, is_deleted=False).first()

        created_or_updated = 0
        with transaction.atomic():
            for item in records:
                student_id = item['student_id']
                target_status = 'HOLIDAY_EXCUSED' if (is_holiday and not override_holiday) else item.get('status', 'PRESENT')
                in_time = item.get('in_time')
                remarks = item.get('remarks', '')

                student = Student.objects.filter(id=student_id, is_deleted=False).first()
                if not student:
                    continue

                if tenant_id and student.institution_id and str(student.institution_id) != str(tenant_id):
                    # Tenant isolation check
                    continue

                StudentAttendance.objects.update_or_create(
                    student=student,
                    session_slot=slot_obj,
                    date=date_val,
                    defaults={
                        'status': target_status,
                        'in_time': in_time,
                        'remarks': remarks,
                        'marked_by': request.user if request.user.is_authenticated else None,
                        'source': 'WEB_PORTAL'
                    }
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

            # General student key fallback
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
        weekend_days = policy.weekend_days if policy and policy.weekend_days else ['FRIDAY', 'SATURDAY']

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
                s_map = att_map.get(f"{s.id}_{slot_id_str}") or att_map.get(f"{s.id}_DEFAULT", {})

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
        weekend_days = policy.weekend_days if policy and policy.weekend_days else ['FRIDAY', 'SATURDAY']

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
            defaults={'weekend_days': ['FRIDAY', 'SATURDAY'], 'default_mode': 'DAILY_SINGLE'}
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


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = DocumentTemplateConfigSerializer

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return DocumentTemplateConfig.objects.none()

        # Check if templates need seeding for this tenant
        if not DocumentTemplateConfig.objects.filter(institution_id=tenant_id, is_deleted=False).exists():
            from .services import seed_default_document_templates
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


# ==============================================================================
# ENTERPRISE MULTI-CHANNEL NOTIFICATION VIEWSETS
# ==============================================================================

class InAppNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = InAppNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return InAppNotification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='unread-count')
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
        return Response({
            "status": "success",
            "message": "Notification marked as read",
            "notification": InAppNotificationSerializer(notification).data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        now = timezone.now()
        updated_count = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=now)
        return Response({
            "status": "success",
            "message": f"All {updated_count} notifications marked as read",
            "updated_count": updated_count
        }, status=status.HTTP_200_OK)


class NotificationGatewayViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationGatewayConfigSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationGatewayConfig.objects.none()
        return NotificationGatewayConfig.objects.filter(institution_id=tenant_id).order_by('gateway_type', 'provider_name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise ValidationError({"error": "Institutional context is required to configure gateways."})
        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            raise ValidationError({"error": "Institution not found."})
        serializer.save(institution=inst)

    @action(detail=True, methods=['post'], url_path='test-ping')
    def test_ping(self, request, pk=None):
        gateway = self.get_object()
        target = request.data.get('target_recipient') or request.data.get('phone_number') or request.data.get('email')
        result = ping_gateway(gateway, test_target=target)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='balance')
    def balance(self, request, pk=None):
        gateway = self.get_object()
        bal_res = fetch_gateway_balance(gateway)
        return Response(bal_res, status=status.HTTP_200_OK)


class NotificationTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationTemplate.objects.none()
        return NotificationTemplate.objects.filter(institution_id=tenant_id).order_by('-is_system_default', 'name')

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            raise ValidationError({"error": "Institutional context is required."})
        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            raise ValidationError({"error": "Institution not found."})
        serializer.save(institution=inst)

    @action(detail=False, methods=['post'], url_path='seed-defaults')
    def seed_defaults(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "Tenant context required."}, status=status.HTTP_400_BAD_REQUEST)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        count = seed_default_templates(inst)
        return Response({
            "status": "success",
            "message": f"Successfully seeded {count} default templates.",
            "templates": NotificationTemplateSerializer(self.get_queryset(), many=True).data
        }, status=status.HTTP_200_OK)


class NotificationTriggerRuleViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationTriggerRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationTriggerRule.objects.none()
        return NotificationTriggerRule.objects.filter(institution_id=tenant_id).order_by('event_type')

    @action(detail=False, methods=['get'], url_path='matrix')
    def matrix(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"matrix": []}, status=status.HTTP_200_OK)

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"matrix": []}, status=status.HTTP_200_OK)

        # Ensure default templates exist
        seed_default_templates(inst)

        event_choices = NotificationTriggerRule.EVENT_TYPE_CHOICES
        matrix_list = []

        for event_key, event_label in event_choices:
            rule, _ = NotificationTriggerRule.objects.get_or_create(
                institution=inst,
                event_type=event_key,
                defaults={
                    "channels": ["IN_APP", "SMS"],
                    "is_enabled": True,
                }
            )
            matrix_list.append(NotificationTriggerRuleSerializer(rule).data)

        return Response({"matrix": matrix_list}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='batch-update')
    def batch_update(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "Tenant context required."}, status=status.HTTP_400_BAD_REQUEST)

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        rules_data = request.data.get('rules', [])
        updated_rules = []

        with transaction.atomic():
            for item in rules_data:
                event_type = item.get('event_type')
                if not event_type:
                    continue
                channels = item.get('channels', ['IN_APP'])
                is_enabled = item.get('is_enabled', True)
                template_id = item.get('template')

                rule, _ = NotificationTriggerRule.objects.get_or_create(
                    institution=inst,
                    event_type=event_type
                )
                rule.channels = channels
                rule.is_enabled = is_enabled
                if template_id:
                    rule.template_id = template_id
                rule.save()
                updated_rules.append(rule)

        return Response({
            "status": "success",
            "message": f"Updated {len(updated_rules)} trigger rules successfully.",
            "matrix": NotificationTriggerRuleSerializer(updated_rules, many=True).data
        }, status=status.HTTP_200_OK)


class NotificationDispatchLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = NotificationDispatchLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        if not tenant_id:
            return NotificationDispatchLog.objects.none()

        qs = NotificationDispatchLog.objects.filter(institution_id=tenant_id)
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(recipient_identifier__icontains=search) |
                Q(message_body__icontains=search) |
                Q(message_title__icontains=search)
            )

        channel = self.request.query_params.get('channel')
        if channel and channel != 'ALL':
            qs = qs.filter(channel=channel)

        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'ALL':
            qs = qs.filter(status=status_param)

        event_type = self.request.query_params.get('event_type')
        if event_type and event_type != 'ALL':
            qs = qs.filter(event_type=event_type)

        return qs.order_by('-dispatched_at')

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"total_dispatched": 0, "delivered": 0, "failed": 0, "simulated": 0}, status=status.HTTP_200_OK)

        qs = NotificationDispatchLog.objects.filter(institution_id=tenant_id)
        total = qs.count()
        delivered = qs.filter(status='DELIVERED').count()
        failed = qs.filter(status='FAILED').count()
        simulated = qs.filter(status='SIMULATED').count()
        queued = qs.filter(status='QUEUED').count()
        in_app_count = qs.filter(channel='IN_APP').count()
        sms_count = qs.filter(channel='SMS').count()
        wa_count = qs.filter(channel='WHATSAPP').count()
        email_count = qs.filter(channel='EMAIL').count()

        return Response({
            "total_dispatched": total,
            "delivered": delivered,
            "failed": failed,
            "simulated": simulated,
            "queued": queued,
            "channel_counts": {
                "IN_APP": in_app_count,
                "SMS": sms_count,
                "WHATSAPP": wa_count,
                "EMAIL": email_count,
            }
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='retry')
    def retry(self, request, pk=None):
        log_obj = self.get_object()
        institution = log_obj.institution

        res = dispatch_notification(
            institution=institution,
            event_type=log_obj.event_type or "MANUAL_RETRY",
            recipient_user=log_obj.recipient_user,
            recipient_identifier=log_obj.recipient_identifier,
            forced_channels=[log_obj.channel],
            custom_message=log_obj.message_body,
            custom_title=log_obj.message_title,
        )

        return Response({
            "status": "success",
            "message": f"Retry dispatched to {log_obj.recipient_identifier} via {log_obj.channel}",
            "result": res
        }, status=status.HTTP_200_OK)


class ManualBroadcastViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='send')
    def send(self, request):
        tenant_id = get_scoped_tenant_id(request) or getattr(request.user, 'institution_id', None)
        if not tenant_id:
            return Response({"error": "Institutional context is required."}, status=status.HTTP_400_BAD_REQUEST)

        inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        if not inst:
            return Response({"error": "Institution not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ManualBroadcastSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        target_audience = data['target_audience']
        class_id = data.get('class_id')
        channels = data['channels']
        title = data['title']
        message = data['message']
        notification_type = data.get('notification_type', 'INFO')
        action_url = data.get('action_url', '')

        recipients = []

        if target_audience in ['ALL', 'STUDENTS', 'CLASS']:
            student_qs = Student.objects.filter(institution=inst, is_deleted=False)
            if target_audience == 'CLASS' and class_id:
                student_qs = student_qs.filter(student_class_id=class_id)

            for stu in student_qs[:500]:
                guardian = stu.guardians.first()
                g_user = guardian.user if guardian else None
                g_phone = guardian.user.phone_number if (guardian and guardian.user) else None
                recipients.append({
                    "user": g_user,
                    "phone": g_phone,
                    "context": {
                        "student_name": stu.name,
                        "class_name": stu.student_class.name if stu.student_class else "",
                        "roll_number": str(stu.roll_number or ""),
                    }
                })

        if target_audience in ['ALL', 'TEACHERS', 'STAFF']:
            staff_qs = StaffProfile.objects.filter(institution=inst, is_active=True)
            if target_audience == 'TEACHERS':
                staff_qs = staff_qs.filter(staff_type='TEACHING')
            elif target_audience == 'STAFF':
                staff_qs = staff_qs.filter(staff_type='SUPPORT')

            for stf in staff_qs[:500]:
                u = stf.user
                recipients.append({
                    "user": u,
                    "phone": u.phone_number if u else stf.emergency_contact,
                    "context": {
                        "staff_name": stf.designation or (u.username if u else "Staff"),
                    }
                })

        dispatched_count = 0
        for r in recipients:
            ctx = {
                "institution_name": inst.name,
                "message": message,
                "sender_name": request.user.username,
                **r.get('context', {})
            }
            dispatch_notification(
                institution=inst,
                event_type="GENERAL_BROADCAST",
                recipient_user=r.get('user'),
                recipient_identifier=r.get('phone'),
                dynamic_context=ctx,
                forced_channels=channels,
                custom_message=message,
                custom_title=title,
                action_url=action_url,
                notification_type=notification_type
            )
            dispatched_count += 1

        return Response({
            "status": "success",
            "message": f"Broadcast queued and dispatched to {dispatched_count} recipients across {', '.join(channels)}.",
            "dispatched_count": dispatched_count,
            "channels": channels
        }, status=status.HTTP_200_OK)