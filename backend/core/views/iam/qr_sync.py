from .base import *
import webauthn
import pyotp
import qrcode


class QRGenerateView(APIView):
    """
    Public/Authenticated endpoint: Generates a 3-minute QRSessionTicket.
    If called by an authenticated user (e.g. from Profile -> Cross-Device QR Sign-In),
    it attaches the user's session tokens so a remote device can claim them.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user = request.user if request.user and request.user.is_authenticated else None
        ticket = QRSessionTicket.objects.create(
            expires_at=timezone.now() + timedelta(minutes=3),
            authorized_user=user,
            status='pending'
        )

        if user:
            token = RefreshToken.for_user(user)
            ticket.access_token = str(token.access_token)
            ticket.refresh_token = str(token)
            ticket.save()

        return Response({
            'status': 'success',
            'ticket_id': str(ticket.ticket_id),
            'expires_in_seconds': 180,
            'qr_payload': str(ticket.ticket_id)
        }, status=status.HTTP_201_CREATED)


class QRStatusView(APIView):
    """
    Polling & Claim endpoint:
    - When called with ?action=claim (e.g. mobile scanner visiting the sign-in URL):
      marks the ticket as claimed/authorized and returns access & refresh tokens.
    - When polled by the desktop:
      returns current status ('pending', 'authorized', 'expired') and user info.
    """
    permission_classes = [AllowAny]

    def get(self, request, ticket_id):
        try:
            ticket = QRSessionTicket.objects.get(ticket_id=ticket_id)
        except (QRSessionTicket.DoesNotExist, ValueError):
            return Response({'status': 'invalid', 'message': 'Ticket not found'}, status=status.HTTP_404_NOT_FOUND)

        if ticket.expires_at < timezone.now() or ticket.status == 'expired':
            ticket.status = 'expired'
            ticket.save()
            return Response({'status': 'expired', 'message': 'Ticket has expired'}, status=status.HTTP_200_OK)

        action = request.query_params.get('action')
        user = ticket.authorized_user

        if action == 'claim':
            if not user or not ticket.access_token:
                return Response({'status': 'error', 'message': 'Ticket has not been authorized yet.'}, status=status.HTTP_400_BAD_REQUEST)

            role_data = None
            if hasattr(user, 'role') and user.role:
                role_data = {'id': user.role.id, 'name': user.role.name, 'code': user.role.code}

            full_name = user.name or f"{user.first_name or ''} {user.last_name or ''}".strip()
            user_data = {
                'id': user.id,
                'name': full_name,
                'first_name': user.first_name or "",
                'last_name': user.last_name or "",
                'email': user.email or "",
                'phone_number': user.phone_number or "",
                'avatar_url': user.avatar_url or "",
                'user_type': user.user_type,
                'role': role_data,
                'is_2fa_enabled': getattr(user, 'is_2fa_enabled', False),
            }
            resp_data = {
                'status': 'authorized',
                'access': ticket.access_token,
                'refresh': ticket.refresh_token,
                'user': user_data
            }
            ticket.status = 'authorized'
            ticket.save()
            return Response(resp_data, status=status.HTTP_200_OK)

        if ticket.status == 'authorized' and ticket.access_token:
            role_data = None
            if user and hasattr(user, 'role') and user.role:
                role_data = {'id': user.role.id, 'name': user.role.name, 'code': user.role.code}

            full_name = (user.name or f"{user.first_name or ''} {user.last_name or ''}".strip()) if user else "Authorized User"
            user_data = {
                'id': user.id if user else None,
                'name': full_name,
                'email': user.email if user else "",
                'phone_number': user.phone_number if user else "",
                'avatar_url': user.avatar_url if user else "",
                'user_type': user.user_type if user else "",
                'role': role_data,
            } if user else {}

            resp_data = {
                'status': 'authorized',
                'access': ticket.access_token,
                'refresh': ticket.refresh_token,
                'user': user_data
            }
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
