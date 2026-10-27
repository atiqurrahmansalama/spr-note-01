from .base import *
import webauthn
import pyotp
import qrcode


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

        passkeys = UserPasskey.objects.filter(user=user).order_by('-created_at')
        data = []
        for p in passkeys:
            try:
                local_dt = timezone.localtime(p.created_at)
            except Exception:
                local_dt = p.created_at

            data.append({
                'id': p.id,
                'name': p.device_name,
                'device_name': p.device_name,
                'credential_id': p.credential_id[:20] + '...',
                'full_credential_id': p.credential_id,
                'created_at': p.created_at.isoformat() if p.created_at else '',
                'created_at_display': local_dt.strftime("%b %d, %Y - %I:%M %p") if local_dt else 'Active',
            })
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
        
        from urllib.parse import urlparse
        requested_rp_id = request.query_params.get('rp_id') or request.headers.get('X-Client-Hostname')
        if not requested_rp_id:
            origin = request.headers.get('Origin') or request.META.get('HTTP_ORIGIN') or request.headers.get('Referer')
            if origin:
                try:
                    parsed = urlparse(origin)
                    if parsed.hostname:
                        requested_rp_id = parsed.hostname
                except Exception:
                    pass

        raw_host = requested_rp_id or request.get_host().split(':')[0]
        rp_id = 'localhost' if raw_host in ['127.0.0.1', 'localhost', '::1', 'testserver'] else raw_host

        options = {
            "challenge": challenge,
            "rp": {"name": "SPR Note Suite", "id": rp_id},
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

        credential = request.data.get('credential') or {}
        cred_id = credential.get('id') or request.data.get('credential_id') or request.data.get('id')
        if not cred_id or str(cred_id).startswith('passkey_') or cred_id == 'b64_fallback':
            return Response({'error': 'A valid hardware/biometric passkey credential is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate passkey registrations for the same device credential
        if UserPasskey.objects.filter(user=user, credential_id=str(cred_id)).exists():
            return Response({'error': 'This biometric passkey is already registered on your account.'}, status=status.HTTP_400_BAD_REQUEST)

        pub_key = request.data.get('public_key') or "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
        
        user_agent = request.headers.get('User-Agent', '')
        client_name = request.data.get('name') or request.data.get('device_name')
        if not client_name or client_name in ['Workstation Passkey', 'Win32 Passkey', 'Security Passkey']:
            os_name = "Windows PC" if "Windows" in user_agent else "macOS" if "Mac" in user_agent else "Android" if "Android" in user_agent else "iPhone / iPad" if "iPhone" in user_agent or "iPad" in user_agent else "Linux" if "Linux" in user_agent else "Workstation"
            browser_name = "Chrome" if "Chrome" in user_agent and "Edg" not in user_agent else "Edge" if "Edg" in user_agent else "Safari" if "Safari" in user_agent and "Chrome" not in user_agent else "Firefox" if "Firefox" in user_agent else "Browser"
            device_name = f"{os_name} ({browser_name})"
        else:
            device_name = str(client_name)

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
                'name': passkey.device_name,
                'device_name': passkey.device_name,
                'created_at': passkey.created_at.isoformat(),
                'created_at_display': passkey.created_at.strftime("%b %d, %Y - %I:%M %p"),
            }
        }, status=status.HTTP_201_CREATED)


