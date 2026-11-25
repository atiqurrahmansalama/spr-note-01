"""
Our Little Universe — Server-Side Authorization & PostgreSQL RLS Context Enforcement.
Executes membership checks against the isolated `universe` database and propagates
PostgreSQL RLS context on `connections['universe']`.
"""
from django.db import connections
from rest_framework.permissions import BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.our_little_universe.models.foundation import UniverseMember


class UniverseJWTAuthentication(JWTAuthentication):
    """
    Strict stateless JWT authentication for Our Little Universe endpoints.
    Unlike FlexibleJWTAuthentication, this avoids falling back to SessionAuthentication
    (which causes CSRF 403 collisions when Django Admin/cookies exist in the same browser)
    and guarantees a clean 401 Unauthorized response so the frontend auto-refreshes tokens.
    """
    pass


def set_postgres_rls_context(user_id):
    """Propagates authenticated user ID into the `universe` Postgres connection for RLS."""
    conn = connections["universe"]
    if conn.vendor != "postgresql":
        return
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT set_config('app.universe_user_id', %s, true);",
                [str(user_id) if user_id is not None else ""],
            )
    except Exception:
        pass


def resolve_active_universe_member(request):
    """Resolves and caches the authenticated user's active UniverseMember from the `universe` DB."""
    cached = getattr(request, "_cached_universe_member", None)
    if cached is not None:
        return cached

    user = getattr(request, "user", None)
    if not user or not user.is_authenticated or getattr(user, "is_deactivated", False):
        return None

    member = (
        UniverseMember.objects.select_related("space")
        .filter(user_id=user.id, is_active=True, space__is_active=True)
        .order_by("created_at")
        .first()
    )
    request._cached_universe_member = member
    if member is not None:
        set_postgres_rls_context(user.id)
    return member


class IsUniverseMember(BasePermission):
    """Allows access strictly to active OWNER or RECIPIENT members of Our Little Universe."""
    message = "Private access denied. You must be an authorized member of Our Little Universe."

    def has_permission(self, request, view):
        member = resolve_active_universe_member(request)
        if not member:
            return False
        request.universe_member = member
        request.universe_space = member.space
        return True


class IsUniverseOwner(BasePermission):
    """Allows access strictly to users holding the OWNER role inside Our Little Universe."""
    message = "Owner privileges required for this administrative action."

    def has_permission(self, request, view):
        member = resolve_active_universe_member(request)
        if not member or member.role != UniverseMember.ROLE_OWNER:
            return False
        request.universe_member = member
        request.universe_space = member.space
        return True
