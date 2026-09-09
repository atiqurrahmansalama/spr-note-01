"""
Selectors Layer Package
Encapsulates high-performance, read-only ORM queries and multi-tenant scoping operations.
"""

from .tenant_selectors import get_tenant_by_id, get_active_branches, get_tenant_taxonomy_setting
from .auth_selectors import get_user_by_id, get_active_security_sessions, get_user_roles_tree
from .student_selectors import get_scoped_students, get_student_by_id, get_students_by_class
from .staff_selectors import get_scoped_teachers, get_teacher_by_id, get_teacher_duties
from .academic_selectors import get_academic_years, get_departments, get_classes_with_sections
from .attendance_selectors import get_daily_attendance_matrix, get_student_attendance_summary

__all__ = [
    'get_tenant_by_id',
    'get_active_branches',
    'get_tenant_taxonomy_setting',
    'get_user_by_id',
    'get_active_security_sessions',
    'get_user_roles_tree',
    'get_scoped_students',
    'get_student_by_id',
    'get_students_by_class',
    'get_scoped_teachers',
    'get_teacher_by_id',
    'get_teacher_duties',
    'get_academic_years',
    'get_departments',
    'get_classes_with_sections',
    'get_daily_attendance_matrix',
    'get_student_attendance_summary',
]
