from .base import *
import webauthn
import pyotp
import qrcode


class Setup2FAView(APIView):
    """
    Generates TOTP secret & QR Code Base64 URI.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.refresh_from_db()

        # If user already has an active setup secret and 2FA is not enabled yet, reuse it or force regenerate
        force_regen = request.data.get('regenerate', False)
        secret = (user.totp_secret if (user.totp_secret and not force_regen and not user.is_2fa_enabled) else None) or pyotp.random_base32()
        user.totp_secret = secret
        user.save(update_fields=['totp_secret'])

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
    Uses RFC 6238 valid_window=1 for clock drift skew tolerance and accepts client secret to eliminate race conditions.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.refresh_from_db()

        raw_code = request.data.get('code', '')
        code = re.sub(r'[\s\-]', '', str(raw_code)).strip()

        candidate_secret = request.data.get('secret') or user.totp_secret
        if not candidate_secret:
            return Response({'error': '2FA setup not initiated. Run setup first.'}, status=status.HTTP_400_BAD_REQUEST)

        totp = pyotp.TOTP(candidate_secret)
        if not totp.verify(code, valid_window=1):
            return Response({'error': 'Invalid 6-digit verification code. Please check your authenticator app.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 8 single-use emergency backup codes
        raw_backup_codes = [f"{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}" for _ in range(8)]
        hashed_codes = [make_password(c) for c in raw_backup_codes]

        user.totp_secret = candidate_secret
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
    Disables 2FA after password, TOTP, or emergency backup code verification.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        password = request.data.get('current_password') or request.data.get('password')
        code = request.data.get('code')

        if not password and not code:
            return Response({'error': 'Please provide either your account password or 6-digit verification code.'}, status=status.HTTP_400_BAD_REQUEST)

        verified = False

        if password:
            if not user.has_usable_password():
                return Response({
                    'error': 'This account does not have a usable password set. Please verify using your 6-digit authenticator code.'
                }, status=status.HTTP_400_BAD_REQUEST)
            if user.check_password(str(password)):
                verified = True
            else:
                return Response({'error': 'Incorrect account password.'}, status=status.HTTP_400_BAD_REQUEST)

        if not verified and code:
            clean_code = re.sub(r'[\s\-]', '', str(code)).strip()
            if user.totp_secret and pyotp.TOTP(user.totp_secret).verify(clean_code, valid_window=1):
                verified = True
            elif user.backup_codes:
                from django.contrib.auth.hashers import check_password
                for hashed in user.backup_codes:
                    if check_password(clean_code, hashed):
                        verified = True
                        break
            if not verified:
                return Response({'error': 'Invalid 6-digit authenticator or backup code.'}, status=status.HTTP_400_BAD_REQUEST)

        if not verified:
            return Response({'error': 'Verification failed. Please check your credentials.'}, status=status.HTTP_400_BAD_REQUEST)

        user.is_2fa_enabled = False
        user.totp_secret = None
        user.backup_codes = []
        user.save()

        return Response({
            'status': 'success',
            'message': 'Two-Factor Authentication has been disabled.'
        }, status=status.HTTP_200_OK)


class RegenerateBackupCodesView(APIView):
    """
    Regenerates a fresh set of 8 emergency recovery codes when 2FA is active.
    Optionally requires password verification for security.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'is_2fa_enabled': user.is_2fa_enabled,
            'remaining_codes_count': len(user.backup_codes or [])
        }, status=status.HTTP_200_OK)

    def post(self, request):
        user = request.user
        if not user.is_2fa_enabled:
            return Response({'error': 'Two-Factor Authentication is not enabled on this account.'}, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get('password')
        code = request.data.get('code')

        if password:
            if not user.check_password(str(password)):
                return Response({'error': 'Incorrect account password.'}, status=status.HTTP_400_BAD_REQUEST)
        elif code:
            clean_code = re.sub(r'[\s\-]', '', str(code)).strip()
            if not user.totp_secret or not pyotp.TOTP(user.totp_secret).verify(clean_code, valid_window=1):
                return Response({'error': 'Invalid 6-digit authenticator code.'}, status=status.HTTP_400_BAD_REQUEST)

        # Generate 8 fresh single-use backup recovery codes
        raw_backup_codes = [f"{uuid.uuid4().hex[:4].upper()}-{uuid.uuid4().hex[:4].upper()}" for _ in range(8)]
        hashed_codes = [make_password(c) for c in raw_backup_codes]

        user.backup_codes = hashed_codes
        user.save()

        try:
            ip = get_client_ip(request)
            UserActivityLog.objects.create(
                user=user,
                action='UPDATE_SECURITY',
                details='2FA emergency backup recovery codes regenerated.',
                ip_address=ip
            )
        except Exception:
            pass

        return Response({
            'status': 'success',
            'message': '8 emergency backup recovery codes regenerated successfully.',
            'backup_codes': raw_backup_codes
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

        raw_code = str(request.data.get('code', '')).strip().upper()
        clean_code = re.sub(r'[\s\-]', '', raw_code)
        if not clean_code:
            return Response({'error': 'Verification code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Check TOTP Code with RFC 6238 time drift tolerance (valid_window=1)
        if user.totp_secret and pyotp.TOTP(user.totp_secret).verify(clean_code, valid_window=1):
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


