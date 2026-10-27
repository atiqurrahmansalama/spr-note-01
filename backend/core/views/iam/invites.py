from .base import *
import webauthn
import pyotp
import qrcode


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


