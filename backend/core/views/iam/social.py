from .base import *
import webauthn
import pyotp
import qrcode


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
    Unbinds Google account with guardrail check for password existence and password confirmation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        # Guardrail: Check if user has usable password
        if not user.has_usable_password():
            return Response({
                'error': 'Cannot disconnect Google account: You do not have a password set. Set a password first to prevent account lockout.'
            }, status=status.HTTP_400_BAD_REQUEST)

        password = request.data.get('password') or request.data.get('current_password')
        if not password or not user.check_password(str(password)):
            return Response({'error': 'Incorrect account password. Please enter your valid password to disconnect.'}, status=status.HTTP_400_BAD_REQUEST)

        user.google_sub_id = None
        user.save()

        try:
            ip = get_client_ip(request)
            UserActivityLog.objects.create(
                user=user,
                action='UPDATE_SECURITY',
                details='Connected Google OAuth account unlinked after password confirmation.',
                ip_address=ip
            )
        except Exception:
            pass

        return Response({
            'status': 'success',
            'message': 'Google account disconnected successfully!'
        }, status=status.HTTP_200_OK)


