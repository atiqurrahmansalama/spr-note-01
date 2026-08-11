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
    """Extracts human-readable device name & OS details from User-Agent or custom headers."""
    header_info = request.headers.get('X-Device-Info') or request.META.get('HTTP_X_DEVICE_INFO')
    if header_info and header_info.strip() and header_info != 'Unknown Device':
        return header_info[:255]

    ua = str(request.META.get('HTTP_USER_AGENT', '') or '').strip()
    if not ua:
        return 'Web Client'

    ua_lower = ua.lower()

    # Detect OS
    os_name = "Desktop"
    if "windows nt 10.0" in ua_lower or "windows nt 11.0" in ua_lower:
        os_name = "Windows 10/11"
    elif "windows" in ua_lower:
        os_name = "Windows PC"
    elif "macintosh" in ua_lower or "mac os x" in ua_lower:
        os_name = "macOS"
    elif "iphone" in ua_lower:
        os_name = "iPhone"
    elif "ipad" in ua_lower:
        os_name = "iPad"
    elif "android" in ua_lower:
        os_name = "Android Mobile"
    elif "linux" in ua_lower:
        os_name = "Linux PC"

    # Detect Browser
    browser_name = "Browser"
    if "edg" in ua_lower:
        browser_name = "Microsoft Edge"
    elif "chrome" in ua_lower and "chromium" not in ua_lower and "edg" not in ua_lower:
        browser_name = "Google Chrome"
    elif "firefox" in ua_lower:
        browser_name = "Mozilla Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        browser_name = "Apple Safari"
    elif "opera" in ua_lower or "opr" in ua_lower:
        browser_name = "Opera"

    return f"{browser_name} on {os_name}"


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
        # Skip middleware session writes for Django admin requests
        if request.path.startswith('/admin/'):
            return self.get_response(request)

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

            session = UserSession.objects.filter(
                user=request.user,
                device_type=device_type,
                is_active=True
            ).order_by('-last_activity').first()

            if session:
                delta_sec = (now - session.last_activity).total_seconds()
                if delta_sec > 43200:
                    session.is_active = False
                    session.logout_at = session.last_activity
                    session.save()

                    UserSession.objects.create(
                        user=request.user,
                        device_type=device_type,
                        device_info=device_info,
                        ip_address=ip_address,
                        is_active=True
                    )
                elif delta_sec > 300:  # Throttle updates to max once per 5 minutes
                    session.device_info = device_info
                    session.ip_address = ip_address
                    session.save()
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
