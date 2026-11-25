"""
Audit logging & request metadata helpers for Our Little Universe.
Reuses core IP detection when available.
"""
from apps.our_little_universe.models.media import UniverseAccessAuditLog


def get_client_ip_from_request(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_universe_event(space, actor, event_type: str, detail: dict = None, request=None):
    ip_addr = get_client_ip_from_request(request) if request else None
    actor_id = getattr(actor, "id", actor) if actor is not None else None
    UniverseAccessAuditLog.objects.create(
        space=space,
        actor_user_id=actor_id,
        event_type=event_type[:60],
        detail=detail or {},
        ip_address=ip_addr,
    )
