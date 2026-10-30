from .base import *
import webauthn
import pyotp
import qrcode


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
                        dev_info = detect_device_info(request)
                        # Deactivate previous active sessions for the same device signature
                        UserSession.objects.filter(
                            user=user_obj,
                            ip_address=ip,
                            user_agent=user_agent,
                            is_active=True
                        ).update(is_active=False, logout_at=timezone.now())

                        UserSession.objects.create(
                            user=user_obj,
                            refresh_token_jti=jti,
                            ip_address=ip,
                            device_type=dev_type,
                            device_info=dev_info,
                            user_agent=user_agent,
                            is_active=True
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

            from core.services import verify_google_token_or_code, get_or_create_google_user

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
                dev_info = detect_device_info(request)
                UserSession.objects.filter(
                    user=user,
                    ip_address=ip,
                    user_agent=user_agent,
                    is_active=True
                ).update(is_active=False, logout_at=timezone.now())

                UserSession.objects.create(
                    user=user,
                    refresh_token_jti=jti,
                    ip_address=ip,
                    device_type=dev_type,
                    device_info=dev_info,
                    user_agent=user_agent,
                    is_active=True
                )
            except Exception as sess_ex:
                import logging
                logging.getLogger('core').warning(f"UserSession creation warning: {sess_ex}")

            if getattr(user, 'institution_id', None):
                try:
                    from core.services import ensure_institution_staff_profile
                    ensure_institution_staff_profile(user)
                except Exception:
                    pass

            resolved_name = user.name or f"{user.first_name or ''} {user.last_name or ''}".strip() or user.phone_number
            user_data = {
                'id': user.id,
                'name': resolved_name,
                'full_name': resolved_name,
                'phone_number': user.phone_number,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'user_type': user.user_type,
                'is_staff': getattr(user, 'is_staff', False),
                'institution_id': str(user.institution_id) if user.institution_id else None,
                'staff_id': str(user.staff_profile.id) if hasattr(user, 'staff_profile') and user.staff_profile else None,
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

        inst_name = getattr(user, 'institution', None) and user.institution.name or 'SPR Note Suite'
        context = {
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'verification_url': verification_url,
            'institution_name': inst_name,
        }
        send_smtp_email(
            'emails/email_verification.html',
            context,
            f'Verify Your Email - {inst_name}',
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

            inst_name = getattr(user, 'institution', None) and user.institution.name or 'SPR Note Suite'
            context = {
                'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'verification_url': verification_url,
                'institution_name': inst_name,
            }
            send_smtp_email(
                'emails/email_verification.html',
                context,
                f'Verify Your Email - {inst_name}',
                [user.email]
            )

        return Response({'message': 'If an unverified account exists for this email, a new verification link has been sent.'}, status=status.HTTP_200_OK)


class RequestEmailChangeView(APIView):
    """
    Initiates changing account email address.
    Sends a 6-digit verification code to the proposed new email address.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = (request.data.get('new_email') or '').strip().lower()
        if not new_email or '@' not in new_email:
            return Response({'error': 'Please provide a valid new email address.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if user.email and user.email.lower() == new_email:
            return Response({'error': 'The new email address cannot be the same as your current email.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if email is already taken by another account
        if User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
            return Response({'error': 'This email address is already associated with another account.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 6-digit cryptographic OTP
        otp = f"{secrets.randbelow(900000) + 100000:06d}"
        cache_key = f"email_change_otp_{user.id}"
        cache.set(cache_key, {'new_email': new_email, 'otp': otp}, timeout=900)

        inst_name = getattr(user, 'institution', None) and user.institution.name or 'SPR Note Suite'
        context = {
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.username or 'Valued User',
            'verification_code': otp,
            'institution_name': inst_name,
            'new_email': new_email,
        }
        send_smtp_email(
            'emails/email_verification.html',
            context,
            f'Verify Your New Email Address - {inst_name}',
            [new_email]
        )

        return Response({
            'message': f'A 6-digit verification code has been dispatched to {new_email}.',
            'new_email': new_email,
            'expires_in_seconds': 900
        }, status=status.HTTP_200_OK)


class ConfirmEmailChangeView(APIView):
    """
    Confirms the email address change by validating the 6-digit OTP.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        otp = (request.data.get('otp') or '').strip()
        if not otp:
            return Response({'error': 'Please enter the 6-digit verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        cache_key = f"email_change_otp_{user.id}"
        cached = cache.get(cache_key)

        if not cached or cached.get('otp') != otp:
            return Response({'error': 'Invalid or expired verification code. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        new_email = cached['new_email']
        # Double check uniqueness before applying
        if User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
            return Response({'error': 'This email address was claimed by another account in the interim.'}, status=status.HTTP_400_BAD_REQUEST)

        old_email = user.email
        user.email = new_email
        user.is_email_verified = True
        user.save()

        # Direct DB update to guarantee persistence across ORM caches
        User.objects.filter(id=user.id).update(email=new_email, is_email_verified=True)
        cache.delete(cache_key)

        # Audit log event
        try:
            ip = get_client_ip(request)
            UserActivityLog.objects.create(
                user=user,
                action='UPDATE_PROFILE',
                details=f"Email address changed from {old_email or 'None'} to {new_email} and verified.",
                ip_address=ip
            )
        except Exception:
            pass

        return Response({
            'message': 'Your email address has been successfully updated and verified!',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_email_verified': user.is_email_verified
            }
        }, status=status.HTTP_200_OK)


class SendEmailVerificationCodeView(APIView):
    """
    Dispatches a 6-digit OTP code to the current unverified email of the logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.email:
            return Response({'error': 'No email address is associated with your account. Please set an email first.'}, status=status.HTTP_400_BAD_REQUEST)

        if user.is_email_verified:
            return Response({'message': 'Your email address is already verified.'}, status=status.HTTP_200_OK)

        otp = f"{secrets.randbelow(900000) + 100000:06d}"
        cache_key = f"email_verify_otp_{user.id}"
        cache.set(cache_key, {'email': user.email, 'otp': otp}, timeout=900)

        inst_name = getattr(user, 'institution', None) and user.institution.name or 'SPR Note Suite'
        context = {
            'user_name': f"{user.first_name} {user.last_name}".strip() or user.username or 'Valued User',
            'verification_code': otp,
            'institution_name': inst_name,
        }
        send_smtp_email(
            'emails/email_verification.html',
            context,
            f'Verify Your Email Address - {inst_name}',
            [user.email]
        )

        return Response({
            'message': f'A 6-digit verification code has been dispatched to {user.email}.',
            'email': user.email,
            'expires_in_seconds': 900
        }, status=status.HTTP_200_OK)


class VerifyEmailCodeView(APIView):
    """
    Verifies the 6-digit OTP code for the current user's unverified email.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        otp = (request.data.get('otp') or '').strip()
        if not otp:
            return Response({'error': 'Please enter the 6-digit verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        cache_key = f"email_verify_otp_{user.id}"
        cached = cache.get(cache_key)

        if not cached or cached.get('otp') != otp:
            return Response({'error': 'Invalid or expired verification code. Please request a new code.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_email_verified = True
        user.save()
        User.objects.filter(id=user.id).update(is_email_verified=True)
        cache.delete(cache_key)

        return Response({
            'message': 'Your email address has been successfully verified!',
            'user': {
                'id': user.id,
                'email': user.email,
                'is_email_verified': True
            }
        }, status=status.HTTP_200_OK)


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

            inst_name = getattr(user, 'institution', None) and user.institution.name or 'SPR Note Suite'
            context = {
                'user_name': f"{user.first_name} {user.last_name}".strip() or user.email,
                'reset_url': reset_url,
                'institution_name': inst_name,
            }
            send_smtp_email(
                'emails/password_reset.html',
                context,
                f'Reset Your Password - {inst_name}',
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

        # Extract client IP and device info
        ip = get_client_ip(request) or request.META.get('REMOTE_ADDR', '127.0.0.1')
        user_agent = request.headers.get('User-Agent', '')
        device_info = detect_device_info(request) if 'detect_device_info' in globals() else (
            "Windows PC" if "Windows" in user_agent else
            "Mac / Apple Device" if "Mac" in user_agent else
            "Android Device" if "Android" in user_agent else
            "iOS Device" if "iPhone" in user_agent or "iPad" in user_agent else
            "Linux Workstation" if "Linux" in user_agent else "Web Browser"
        )

        # 1. Log password change security event
        try:
            from core.models import UserLoginLog
            UserLoginLog.objects.create(
                user=user,
                status="LOGIN",
                ip_address=ip,
                country="Password Updated",
                device_info=str(device_info)[:100]
            )
        except Exception:
            pass

        # 2. Industry Standard: Dispatch Automated Security Notification Email
        email_dispatched = False
        if user.email:
            try:
                change_time = timezone.now().strftime("%B %d, %Y at %I:%M %p UTC")
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                security_url = f"{frontend_url}/forgot-password"
                user_display_name = user.name or f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip() or user.email

                context = {
                    'user_name': user_display_name,
                    'change_time': change_time,
                    'ip_address': ip,
                    'device_info': f"{device_info} ({user_agent[:45]}...)" if user_agent else device_info,
                    'security_url': security_url,
                }
                send_smtp_email(
                    'emails/password_changed_notification.html',
                    context,
                    'Security Alert: Your SPR Note Password Was Changed',
                    [user.email]
                )
                email_dispatched = True
            except Exception as e:
                logger.warning(f"Could not send password change security notification email: {e}")

        return Response({
            "status": "success",
            "message": "Password updated successfully!",
            "email_notification_sent": email_dispatched,
        }, status=status.HTTP_200_OK)


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


