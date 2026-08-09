import threading
from django.utils import timezone
from django.db import close_old_connections
from .authentication import FlexibleJWTAuthentication


def get_client_ip(request):
    """Extracts client IP address handling proxies/load balancers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def detect_device_type(request):
    """
    Detects device type from custom header or User-Agent.
    Supported choices: 'android', 'ios', 'web'.
    """
    header_device = request.headers.get('X-Device-Type') or request.META.get('HTTP_X_DEVICE_TYPE')
    if header_device:
        dev_lower = header_device.lower().strip()
        if dev_lower in ['android', 'ios', 'web']:
            return dev_lower

    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    if 'android' in user_agent:
        return 'android'
    elif any(k in user_agent for k in ['iphone', 'ipad', 'ipod', 'ios', 'darwin']):
        return 'ios'
    return 'web'


def detect_device_info(request):
    """Extracts device info string (app version, OS, model, or User-Agent)."""
    header_info = request.headers.get('X-Device-Info') or request.META.get('HTTP_X_DEVICE_INFO')
    if header_info:
        return header_info[:255]
    ua = request.META.get('HTTP_USER_AGENT', '')
    return ua[:255] if ua else 'Unknown Device'


def _log_activity_async(user_id, action_name, endpoint, http_method, ip_address):
    """
    Asynchronously creates an ActivityLog entry in a background thread
    without slowing down API response execution.
    """
    try:
        close_old_connections()
        from .models import ActivityLog, User
        user_obj = User.objects.filter(id=user_id).first() if user_id else None
        ActivityLog.objects.create(
            user=user_obj,
            action_name=action_name[:100],
            endpoint=endpoint[:255],
            http_method=http_method[:10],
            ip_address=ip_address
        )
    except Exception:
        pass
    finally:
        close_old_connections()


def derive_action_name(request):
    """Generates human-readable action name from header or endpoint path."""
    header_action = request.headers.get('X-Action-Name') or request.META.get('HTTP_X_ACTION_NAME')
    if header_action:
        return header_action[:100]

    method = request.method.upper()
    path_clean = request.path.strip('/').replace('/', '_').replace('-', '_').upper()
    if not path_clean:
        path_clean = "ROOT"
    
    return f"{method}_{path_clean}"[:100]


class UserActivityMiddleware:
    """
    Middleware that intercepts authenticated requests to update UserSession last_active
    and total_duration_minutes, and asynchronously logs state-changing actions into ActivityLog.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Resolve user for JWT or Session authentication
        user = getattr(request, 'user', None)
        if (not user or not user.is_authenticated) and 'HTTP_AUTHORIZATION' in request.META:
            try:
                auth_res = FlexibleJWTAuthentication().authenticate(request)
                if auth_res:
                    user = auth_res[0]
                    request.user = user
            except Exception:
                pass

        # 2. Update active UserSession if authenticated
        if request.user and request.user.is_authenticated:
            self._update_user_session(request)

        # 3. Asynchronously log state-changing HTTP methods (POST, PUT, DELETE, PATCH)
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            # Skip heartbeat path to prevent excessive logging
            if not request.path.endswith('/auth/heartbeat/') and not request.path.endswith('/auth/heartbeat'):
                user_id = request.user.id if (request.user and request.user.is_authenticated) else None
                action_name = derive_action_name(request)
                endpoint = request.path
                http_method = request.method
                ip_address = get_client_ip(request)

                threading.Thread(
                    target=_log_activity_async,
                    args=(user_id, action_name, endpoint, http_method, ip_address),
                    daemon=True
                ).start()

        response = self.get_response(request)
        return response

    def _update_user_session(self, request):
        try:
            from .models import UserSession
            device_type = detect_device_type(request)
            device_info = detect_device_info(request)
            ip_address = get_client_ip(request)
            now = timezone.now()

            # Retrieve current active session for user & device_type
            session = UserSession.objects.filter(
                user=request.user,
                device_type=device_type,
                is_active=True
            ).order_by('-last_active').first()

            if session:
                # If session inactive > 12h without explicit logout, mark completed and create new
                if (now - session.last_active).total_seconds() > 43200:
                    session.is_active = False
                    session.logout_at = session.last_active
                    session.save()

                    UserSession.objects.create(
                        user=request.user,
                        device_type=device_type,
                        device_info=device_info,
                        ip_address=ip_address,
                        is_active=True
                    )
                else:
                    session.device_info = device_info
                    session.ip_address = ip_address
                    session.save() # auto_now updates last_active & save() recalculates duration
            else:
                UserSession.objects.create(
                    user=request.user,
                    device_type=device_type,
                    device_info=device_info,
                    ip_address=ip_address,
                    is_active=True
                )
        except Exception:
            pass
