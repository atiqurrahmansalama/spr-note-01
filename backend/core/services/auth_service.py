"""
Authentication, Session Management & 11-Tier Role Seeding Services
100% Zero Hardcoded Non-English Terms - Clean Enterprise Role Hierarchy
"""

import logging
from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model
from django.utils import timezone
from core.models.iam import UserRole, RoleActionPermission, UserSession

logger = logging.getLogger('core')
User = get_user_model()


def seed_system_baseline_roles():
    """
    Seeds baseline default starter roles in 100% clean English terminology.
    These serve as system templates; institutions can freely create custom roles
    through the Role Management panel.
    """
    system_roles = [
        {
            'code': 'SUPER_ADMIN',
            'name': 'Super Admin',
            'description': 'Full system infrastructure, global multi-tenant control, and security audit access.',
            'hierarchy_level': 1,
            'color_theme': 'rose',
            'is_system_role': True,
        },
        {
            'code': 'ADMIN',
            'name': 'Administrator',
            'description': 'Administrative director managing day-to-day institution operations, admissions, and faculty.',
            'hierarchy_level': 2,
            'color_theme': 'amber',
            'is_system_role': False,
        },
        {
            'code': 'TEACHER',
            'name': 'Teacher',
            'description': 'Classroom instructor conducting daily lessons, assessments, and attendance records.',
            'hierarchy_level': 5,
            'color_theme': 'emerald',
            'is_system_role': False,
        },
        {
            'code': 'GUARDIAN',
            'name': 'Guardian',
            'description': 'Parent or guardian with read-only access to their ward daily evaluations, attendance, and notices.',
            'hierarchy_level': 10,
            'color_theme': 'blue',
            'is_system_role': False,
        },
    ]

    seeded_count = 0
    for item in system_roles:
        role, created = UserRole.objects.get_or_create(code=item['code'], defaults=item)
        if created:
            RoleActionPermission.objects.get_or_create(role=role)
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
