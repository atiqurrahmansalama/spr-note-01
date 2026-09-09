"""
Staff & Teacher Domain Mutations & Workflows
"""

from typing import Dict, Any, List
from django.db import transaction
from core.models.staff import StaffProfile, TeacherAssignment
from core.validators.tenant_validator import validate_tenant_match


@transaction.atomic
def onboard_staff_member(institution_id: str, data: Dict[str, Any]) -> StaffProfile:
    """Onboards a new faculty or administrative staff member."""
    if data.get('institution_id'):
        validate_tenant_match(data['institution_id'], institution_id, "Staff Onboarding")

    staff = StaffProfile.objects.create(
        institution_id=institution_id,
        employee_id=data.get('employee_id') or f"EMP-{StaffProfile.objects.count() + 1:04d}",
        designation=data.get('designation', 'Teacher'),
        staff_type=data.get('staff_type', 'TEACHING'),
        employment_status=data.get('employment_status', 'PERMANENT'),
        department_id=data.get('department_id'),
        is_active=True
    )
    return staff


@transaction.atomic
def assign_teacher_periods(teacher_id: str, assignments: List[Dict[str, Any]]) -> int:
    """Overwrites and updates assignments for a teacher."""
    TeacherAssignment.objects.filter(teacher_id=teacher_id).delete()
    created = []
    for item in assignments:
        created.append(
            TeacherAssignment(
                teacher_id=teacher_id,
                assigned_class_id=item.get('assigned_class_id'),
                assigned_group_id=item.get('assigned_group_id'),
                session_id=item.get('session_id'),
                role_in_class=item.get('role_in_class', 'LEAD_TEACHER')
            )
        )
    TeacherAssignment.objects.bulk_create(created)
    return len(created)
