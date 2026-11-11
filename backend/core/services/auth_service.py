"""
Authentication, Session Management & System Role Seeding Services
All feature access & module permissions live strictly in App Management -> Feature & Module Control.
"""

import logging
from typing import Dict, Any
from django.contrib.auth import get_user_model
from core.models.iam import UserRole, UserSession

logger = logging.getLogger('core')
User = get_user_model()

ADMIN_ARCHETYPE_CODES = ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL')


def build_user_role_payload(user) -> Dict[str, Any]:
    """
    Single source of truth returning the canonical role identity dictionary for a User.
    Exposes pure role identity fields (`id`, `name`, `code`, `description`, `color_theme`,
    `is_system_role`). All feature & module gating lives in Feature & Module Control.
    """
    role_obj = getattr(user, 'role', None)
    if role_obj:
        return {
            'id': role_obj.id,
            'name': role_obj.name,
            'code': role_obj.code,
            'description': role_obj.description,
            'color_theme': role_obj.color_theme,
            'is_system_role': role_obj.code == 'SUPER_ADMIN' or bool(role_obj.is_system_role),
        }

    fallback_code = (getattr(user, 'user_type', '') or 'TEACHER').strip().upper()
    display_name = (
        user.get_user_type_display()
        if hasattr(user, 'get_user_type_display')
        else fallback_code
    )
    return {
        'id': None,
        'name': display_name,
        'code': fallback_code,
        'description': '',
        'color_theme': 'purple' if fallback_code == 'GUARDIAN' else 'blue',
        'is_system_role': fallback_code == 'SUPER_ADMIN',
    }


def is_user_academy_admin(user) -> bool:
    """Checks Super Admin, Administrator role codes, or StaffProfile ADMIN status."""
    if not user:
        return False
    if getattr(user, 'is_superuser', False):
        return True
    user_type = (getattr(user, 'user_type', '') or '').strip().upper()
    role_obj = getattr(user, 'role', None)
    role_code = (getattr(role_obj, 'code', '') or '').strip().upper() if role_obj else ''
    staff_prof = getattr(user, 'staff_profile', None)

    return bool(
        user_type in ADMIN_ARCHETYPE_CODES
        or role_code in ADMIN_ARCHETYPE_CODES
        or (staff_prof and getattr(staff_prof, 'staff_type', '') == 'ADMIN')
    )


def seed_system_baseline_roles():
    """
    Seeds baseline default starter roles in 100% clean English terminology.
    These serve as system identities; institutions can freely create custom roles
    through the Role Management panel and govern their permissions in Feature & Module Control.
    """
    system_roles = [
        {
            'code': 'SUPER_ADMIN',
            'name': 'Super Admin',
            'description': 'Full platform administration and multi-tenant system control.',
            'color_theme': 'rose',
            'is_system_role': True,
        },
        {
            'code': 'ADMIN',
            'name': 'Administrator',
            'description': 'Institutional administrator managing academy operations, staff, and students.',
            'color_theme': 'amber',
            'is_system_role': False,
        },
        {
            'code': 'TEACHER',
            'name': 'Teacher',
            'description': 'Classroom instructor conducting daily lessons, assessments, and attendance records.',
            'color_theme': 'emerald',
            'is_system_role': False,
        },
        {
            'code': 'GUARDIAN',
            'name': 'Guardian',
            'description': 'Parent or guardian viewing student daily evaluations, attendance, and notices.',
            'color_theme': 'blue',
            'is_system_role': False,
        },
    ]

    seeded_count = 0
    for item in system_roles:
        role, created = UserRole.objects.get_or_create(code=item['code'], defaults=item)
        if created:
            seeded_count += 1
        elif role.code == 'SUPER_ADMIN' and not role.is_system_role:
            role.is_system_role = True
            role.save(update_fields=['is_system_role'])

    logger.info(f"Successfully verified and seeded {seeded_count} enterprise baseline roles.")
    return seeded_count


# Backward compatibility alias
seed_system_roles_11_tier = seed_system_baseline_roles


def create_security_session(
    user_id: str,
    device_type: str = "DESKTOP",
    browser: str = "Web",
    ip_address: str = "127.0.0.1",
    location: str = "Local"
) -> UserSession:
    """Records a new security session upon user login."""
    return UserSession.objects.create(
        user_id=user_id,
        device_type=device_type,
        device_info=browser,
        ip_address=ip_address,
        is_active=True
    )
