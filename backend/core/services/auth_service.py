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


def seed_system_roles_11_tier():
    """
    Seeds baseline default system roles in 100% clean English terminology.
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
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': True,
                'can_enter_marks': True,
                'can_publish_results': True,
                'can_manage_attendance': True,
                'can_manage_teachers': True,
                'can_manage_classes': True,
                'can_manage_billing': True,
                'can_export_reports': True,
                'can_manage_users': True,
                'can_view_audit_logs': True,
            }
        },
        {
            'code': 'ACADEMY_OWNER',
            'name': 'Academy Owner',
            'description': 'Institutional proprietor/director with full academy governance, branch setup, and billing control.',
            'hierarchy_level': 2,
            'color_theme': 'amber',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': True,
                'can_enter_marks': True,
                'can_publish_results': True,
                'can_manage_attendance': True,
                'can_manage_teachers': True,
                'can_manage_classes': True,
                'can_manage_billing': True,
                'can_export_reports': True,
                'can_manage_users': True,
                'can_view_audit_logs': True,
            }
        },
        {
            'code': 'ADMIN',
            'name': 'Administrator',
            'description': 'Administrative director managing day-to-day institution operations, admissions, and faculty.',
            'hierarchy_level': 3,
            'color_theme': 'amber',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': True,
                'can_enter_marks': True,
                'can_publish_results': True,
                'can_manage_attendance': True,
                'can_manage_teachers': True,
                'can_manage_classes': True,
                'can_manage_billing': False,
                'can_export_reports': True,
                'can_manage_users': True,
                'can_view_audit_logs': True,
            }
        },
        {
            'code': 'PRINCIPAL',
            'name': 'Principal',
            'description': 'Executive head of the institution responsible for academic standards and approvals.',
            'hierarchy_level': 4,
            'color_theme': 'indigo',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': False,
                'can_enter_marks': True,
                'can_publish_results': True,
                'can_manage_attendance': True,
                'can_manage_teachers': True,
                'can_manage_classes': True,
                'can_manage_billing': False,
                'can_export_reports': True,
                'can_manage_users': True,
                'can_view_audit_logs': True,
            }
        },
        {
            'code': 'ACADEMIC_COORDINATOR',
            'name': 'Academic Coordinator',
            'description': 'Manages curricula, term schedules, timetable matrices, and examination mark sheets.',
            'hierarchy_level': 5,
            'color_theme': 'cyan',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': False,
                'can_enter_marks': True,
                'can_publish_results': True,
                'can_manage_attendance': True,
                'can_manage_teachers': False,
                'can_manage_classes': True,
                'can_manage_billing': False,
                'can_export_reports': True,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
        {
            'code': 'SECTION_SUPERVISOR',
            'name': 'Section Supervisor',
            'description': 'Oversees academic sections, daily student evaluation quality, and teacher duty allocations.',
            'hierarchy_level': 6,
            'color_theme': 'teal',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': False,
                'can_enter_marks': True,
                'can_publish_results': False,
                'can_manage_attendance': True,
                'can_manage_teachers': False,
                'can_manage_classes': False,
                'can_manage_billing': False,
                'can_export_reports': True,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
        {
            'code': 'TEACHER',
            'name': 'Teacher',
            'description': 'Classroom instructor conducting daily lessons, assessments, and attendance records.',
            'hierarchy_level': 7,
            'color_theme': 'emerald',
            'is_system_role': True,
            'perms': {
                'can_create_student': True,
                'can_edit_student': True,
                'can_delete_student': False,
                'can_enter_marks': True,
                'can_publish_results': False,
                'can_manage_attendance': True,
                'can_manage_teachers': False,
                'can_manage_classes': False,
                'can_manage_billing': False,
                'can_export_reports': True,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
        {
            'code': 'ASSISTANT_TEACHER',
            'name': 'Assistant Teacher',
            'description': 'Assistant instructor recording attendance, practice readings, and student progress notes.',
            'hierarchy_level': 8,
            'color_theme': 'green',
            'is_system_role': True,
            'perms': {
                'can_create_student': False,
                'can_edit_student': False,
                'can_delete_student': False,
                'can_enter_marks': False,
                'can_publish_results': False,
                'can_manage_attendance': True,
                'can_manage_teachers': False,
                'can_manage_classes': False,
                'can_manage_billing': False,
                'can_export_reports': False,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
        {
            'code': 'ACCOUNTANT',
            'name': 'Accountant',
            'description': 'Financial staff handling tuition fee collection, expense tracking, and payroll.',
            'hierarchy_level': 9,
            'color_theme': 'purple',
            'is_system_role': True,
            'perms': {
                'can_create_student': False,
                'can_edit_student': False,
                'can_delete_student': False,
                'can_enter_marks': False,
                'can_publish_results': False,
                'can_manage_attendance': False,
                'can_manage_teachers': False,
                'can_manage_classes': False,
                'can_manage_billing': True,
                'can_export_reports': True,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
        {
            'code': 'GUARDIAN',
            'name': 'Guardian',
            'description': 'Parent or guardian with read-only access to their ward daily evaluations, attendance, and notices.',
            'hierarchy_level': 10,
            'color_theme': 'blue',
            'is_system_role': True,
            'perms': {
                'can_create_student': False,
                'can_edit_student': False,
                'can_delete_student': False,
                'can_enter_marks': False,
                'can_publish_results': False,
                'can_manage_attendance': False,
                'can_manage_teachers': False,
                'can_manage_classes': False,
                'can_manage_billing': False,
                'can_export_reports': False,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
        {
            'code': 'STUDENT',
            'name': 'Student',
            'description': 'Enrolled student with read-only access to their personal daily reports and academic results.',
            'hierarchy_level': 11,
            'color_theme': 'slate',
            'is_system_role': True,
            'perms': {
                'can_create_student': False,
                'can_edit_student': False,
                'can_delete_student': False,
                'can_enter_marks': False,
                'can_publish_results': False,
                'can_manage_attendance': False,
                'can_manage_teachers': False,
                'can_manage_classes': False,
                'can_manage_billing': False,
                'can_export_reports': False,
                'can_manage_users': False,
                'can_view_audit_logs': False,
            }
        },
    ]

    seeded_count = 0
    for item in system_roles:
        perms_data = item.pop('perms')
        role, created = UserRole.objects.get_or_create(code=item['code'], defaults=item)
        if not created:
            # Update metadata to ensure pristine English definitions
            role.name = item['name']
            role.description = item['description']
            role.hierarchy_level = item['hierarchy_level']
            role.color_theme = item['color_theme']
            role.save()

        perm_obj, _ = RoleActionPermission.objects.get_or_create(role=role)
        for key, val in perms_data.items():
            if hasattr(perm_obj, key):
                setattr(perm_obj, key, val)
        perm_obj.save()
        seeded_count += 1

    logger.info(f"Successfully verified and seeded {seeded_count} enterprise baseline roles.")
    return seeded_count


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
