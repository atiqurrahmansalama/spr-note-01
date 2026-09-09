"""
Staff & Teacher Selectors
Encapsulates teacher directories, designations, and period schedule allocations.
"""

from typing import Optional
from django.db.models import QuerySet
from core.models.staff import StaffProfile, TeacherAssignment


def get_scoped_teachers(
    institution_id: str,
    department_id: Optional[str] = None,
    category: Optional[str] = None
) -> QuerySet:
    """Retrieve teachers belonging to an institution."""
    if not institution_id:
        return StaffProfile.objects.none()

    qs = StaffProfile.objects.select_related('department', 'user').filter(
        institution_id=institution_id,
        is_active=True
    )

    if department_id and str(department_id).upper() != 'ALL':
        qs = qs.filter(department_id=department_id)

    if category and str(category).upper() != 'ALL':
        qs = qs.filter(staff_type=category)

    return qs.order_by('rank_order', 'employee_id')


def get_teacher_by_id(staff_id: str, institution_id: Optional[str] = None) -> Optional[StaffProfile]:
    """Retrieve staff profile with tenant scoping."""
    if not staff_id:
        return None
    qs = StaffProfile.objects.select_related('department', 'user')
    if institution_id:
        qs = qs.filter(institution_id=institution_id)
    return qs.filter(id=staff_id).first()


def get_teacher_duties(staff_id: str) -> QuerySet:
    """Retrieve class assignments for a teacher."""
    if not staff_id:
        return TeacherAssignment.objects.none()
    return TeacherAssignment.objects.select_related(
        'assigned_class', 'assigned_group', 'session'
    ).filter(teacher_id=staff_id)
