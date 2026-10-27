from .base import *
import webauthn
import pyotp
import qrcode


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

        # Consolidate duplicate active sessions for the exact same device and browser
        seen_keys = set()
        stale_ids = []
        unique_sessions = []
        for s in sessions:
            dev_sig = (s.device_info or s.device_type or '', s.ip_address or '')
            if dev_sig in seen_keys:
                stale_ids.append(s.id)
            else:
                seen_keys.add(dev_sig)
                unique_sessions.append(s)

        if stale_ids:
            UserSession.objects.filter(id__in=stale_ids).update(is_active=False, logout_at=timezone.now())
            sessions = UserSession.objects.filter(id__in=[s.id for s in unique_sessions]).order_by('-last_activity')

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


class UserSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        # Auto-close sessions that have been idle for more than 30 days
        stale_cutoff = timezone.now() - timedelta(days=30)
        UserSession.objects.filter(user=user, is_active=True, last_activity__lt=stale_cutoff).update(
            is_active=False, logout_at=timezone.now()
        )

        sessions = UserSession.objects.filter(user=user, is_active=True).order_by('-last_activity')

        # Auto-create active session if none exists
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
                'latest_session_id': latest_session_id,
            }
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, session_id=None):
        user = request.user
        target_id = session_id or request.data.get('session_id') or request.query_params.get('session_id')
        if not target_id:
            session_ids = request.data.get('session_ids')
            if session_ids and isinstance(session_ids, list):
                count = UserSession.objects.filter(id__in=session_ids, user=user).delete()[0]
                return Response({'status': 'success', 'deleted_count': count}, status=status.HTTP_200_OK)
            return Response({'error': 'Session ID is required.'}, status=status.HTTP_400_BAD_REQUEST)

        session = UserSession.objects.filter(id=target_id, user=user).first()
        if not session:
            return Response({'error': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        session.delete()
        return Response({'message': 'Logged out from device session successfully.'}, status=status.HTTP_200_OK)


class LogoutAllOtherSessionsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        current_session_id = request.data.get('current_session_id')

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

        qs = UserSession.objects.filter(user=user)
        if current_session_id:
            qs = qs.exclude(id=current_session_id)
        elif current_jti:
            qs = qs.exclude(refresh_token_jti=current_jti)
        else:
            latest = qs.filter(is_active=True).order_by('-last_activity').first()
            if latest:
                qs = qs.exclude(id=latest.id)

        count = qs.count()
        qs.delete()
        return Response({"status": "success", "logged_out_count": count}, status=status.HTTP_200_OK)


class SecurityAuditLogView(APIView):
    """
    Returns distinct security login & device activity logs for the authenticated user.
    Deduplicates identical device and browser entries so each unique device/browser is presented cleanly.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        login_logs = UserLoginLog.objects.filter(user=user).order_by('-timestamp')[:30]
        sessions = UserSession.objects.filter(user=user).order_by('-last_activity')[:20]

        results = []
        seen_signatures = set()

        # 1. Distinct active device sessions (latest per unique device and browser)
        for s in sessions:
            dev_name = s.device_info or s.device_type or "Web Browser"
            sig = f"sess_{dev_name}_{s.ip_address}"
            if sig in seen_signatures:
                continue
            seen_signatures.add(sig)

            results.append({
                "id": f"SESS-{s.id}",
                "event_type": f"Session {'Active' if s.is_active else 'Terminated'} ({s.device_type})",
                "status": "Active" if s.is_active else "Terminated",
                "ip_address": s.ip_address or "127.0.0.1",
                "location": dev_name if dev_name != "Unknown Device" else None,
                "timestamp": s.last_activity.strftime("%Y-%m-%d %I:%M %p") if s.last_activity else "",
            })

        # 2. Distinct login history (latest per unique device and IP)
        for log in login_logs:
            location_parts = [p.strip() for p in [log.city, log.country] if p and p.strip() and p.strip() != '--']
            location_str = ", ".join(location_parts) if location_parts else None
            dev_str = getattr(log, 'device_info', None) or location_str or "Web Browser"

            sig = f"login_{dev_str}_{log.ip_address}_{log.status}"
            if sig in seen_signatures:
                continue
            seen_signatures.add(sig)

            results.append({
                "id": f"LOG-{log.id}",
                "event_type": f"Account {log.status.capitalize()}",
                "status": "Success",
                "ip_address": log.ip_address or "127.0.0.1",
                "location": location_str or dev_str,
                "timestamp": log.timestamp.strftime("%Y-%m-%d %I:%M %p"),
            })

        return Response({"status": "success", "results": results}, status=status.HTTP_200_OK)


