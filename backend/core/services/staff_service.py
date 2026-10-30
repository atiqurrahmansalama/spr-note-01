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


@transaction.atomic
def ensure_institution_staff_profile(user, institution=None):
    """
    Enterprise self-healing staff recruitment:
    Guarantees that any user attached to an Academic Institution has is_staff=True,
    is registered in the StaffProfile table, and appears in the Staff Roster.
    If the user has user_type='ADMIN' or is academy creator, they are assigned staff_type='ADMIN'.
    """
    if not user:
        return None

    inst = institution or getattr(user, 'institution', None)
    if not inst:
        return None

    # 1. Enforce Django staff status for all institutional members
    if not user.is_staff:
        user.is_staff = True
        user.save(update_fields=['is_staff'])

    from core.models.staff import StaffProfile, GeneralStaffDetail, TeacherDetail
    from core.services import StaffOnboardingService

    # 2. Check if a staff profile already exists for this user in this institution
    staff_profile = StaffProfile.objects.filter(user=user, institution=inst).first()
    if not staff_profile:
        # Check if user has an existing staff profile anywhere without institution
        staff_profile = getattr(user, 'staff_profile', None)
        if staff_profile and not staff_profile.institution_id:
            staff_profile.institution = inst
            staff_profile.save(update_fields=['institution'])
            return staff_profile
        elif staff_profile and str(staff_profile.institution_id) == str(inst.id):
            return staff_profile

        # 3. Determine staff type & designation based on user type & role
        u_type = (getattr(user, 'user_type', '') or '').upper()
        if u_type in ['ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL']:
            staff_type = 'ADMIN'
            designation = 'Academy Administrator'
        elif u_type in ['STAFF', 'ACCOUNTANT']:
            staff_type = 'SUPPORT'
            designation = 'Administrative Officer'
        else:
            staff_type = 'TEACHING'
            designation = 'Teacher / Ustadh'

        emp_id = StaffOnboardingService.generate_employee_id(inst, staff_type=staff_type)

        staff_profile = StaffProfile.objects.create(
            institution=inst,
            user=user,
            employee_id=emp_id,
            staff_type=staff_type,
            designation=designation,
            rank_order=1 if staff_type == 'ADMIN' else 10,
            employment_status='PERMANENT',
            emergency_contact=user.phone_number or '',
            address=getattr(inst, 'address', '') or '',
            division=getattr(inst, 'division', '') or '',
            district=getattr(inst, 'district', '') or '',
            upazila_thana=getattr(inst, 'upazila_thana', '') or '',
            postal_code=getattr(inst, 'postal_code', '') or '',
            is_active=True,
        )

        if staff_type == 'TEACHING':
            TeacherDetail.objects.get_or_create(
                staff=staff_profile,
                defaults={
                    'qualifications': 'Faculty Member',
                    'specialization': 'Classroom Instructor'
                }
            )
        else:
            GeneralStaffDetail.objects.get_or_create(
                staff=staff_profile,
                defaults={
                    'assigned_zone': 'Administration Block',
                    'duty_scope': 'Institutional leadership and operations.',
                    'shift_type': 'MORNING'
                }
            )

    return staff_profile

