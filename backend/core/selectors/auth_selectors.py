"""
Authentication & Authorization Selectors
Encapsulates user, session, and role lookup queries.
"""

from typing import Optional
from django.db.models import QuerySet
from core.models.iam import User, UserRole, UserSession


def get_user_by_id(user_id: str) -> Optional[User]:
    """Retrieve user with role and institution details."""
    if not user_id:
        return None
    return User.objects.select_related('institution', 'role').filter(id=user_id).first()


def get_active_security_sessions(user_id: str) -> QuerySet:
    """Retrieve all active user sessions for a given user."""
    if not user_id:
        return UserSession.objects.none()
    return UserSession.objects.filter(user_id=user_id, is_active=True).order_by('-last_activity')


def get_user_roles_tree() -> QuerySet:
    """Retrieve all system default roles and custom roles ordered by hierarchy level."""
    return UserRole.objects.prefetch_related('action_permissions').all().order_by('hierarchy_level')
