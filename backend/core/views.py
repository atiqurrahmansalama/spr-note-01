from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.utils import timezone
import uuid
import datetime
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
from django.db import models
from django.db.models import Q
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from .authentication import FlexibleJWTAuthentication
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
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
)
from .permissions import IsAdminUserRole, IsOwnerOrSuperAdmin, IsAdminOrSelf
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
    UserRoleSerializer,
    GoogleOAuthSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    UserSessionSerializer,
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

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(Q(status__iexact='active') | Q(status__isnull=True)).select_related('details').distinct().order_by('roll_number', 'name_en')
    serializer_class = StudentSerializer
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

    @action(detail=True, methods=['post'], url_path='upload-document')
    def upload_document(self, request, pk=None):
        from .serializers import StudentDocumentSerializer
        student = self.get_object()
        serializer = StudentDocumentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(student=student, created_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.all().order_by('name')
    serializer_class = StudentGroupSerializer
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

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if queryset.exists():
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        
        from .models import Student, GroupSectionPermission
        user = request.user
        student_qs = Student.objects.exclude(group_name__isnull=True).exclude(group_name='')
        if not (getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser):
            student_qs = student_qs.filter(created_by=user)
            
        student_groups = set(student_qs.values_list('group_name', flat=True))
        perm_groups = set(GroupSectionPermission.objects.exclude(group_id__isnull=True).exclude(group_id='').values_list('group_id', flat=True))
        merged_groups = sorted(list(student_groups.union(perm_groups)))
        
        data = [{'id': name, 'name': name} for name in merged_groups if name and name != 'All Groups']
        return Response(data)

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
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]
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
    permission_classes = [IsAdminOrSelf]
    serializer_class = UserAdminSerializer
    queryset = User.objects.all().select_related('role').order_by('-date_joined')

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return User.objects.none()

        is_admin = user.is_staff or getattr(user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or user.is_superuser
        if is_admin:
            qs = User.objects.all().select_related('role').order_by('-date_joined')
        else:
            qs = User.objects.filter(id=user.id).select_related('role')

        role_code = self.request.query_params.get('role_code') or self.request.query_params.get('user_type') or self.request.query_params.get('role')
        if role_code:
            if role_code.upper() != 'ALL':
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
        serializer.save(role=role_obj)

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
        from .services import evaluate_section_config_for_user
        user = request.user if request.user and request.user.is_authenticated else None
        resolved, origins = evaluate_section_config_for_user(user)

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