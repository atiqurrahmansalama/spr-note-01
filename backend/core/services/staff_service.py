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
def sync_user_and_staff_roles(user, institution=None):
    """
    Enterprise Bi-Directional Self-Healing and Role Synchronization:
    1. If user lacks StaffProfile, searches for any orphaned StaffProfile matching user's phone, email, or name and links it.
    2. If user is attached to a StaffProfile with an institution, ensures user.institution is populated.
    3. If StaffProfile.staff_type == 'ADMIN', elevates user.user_type = 'ADMIN', user.is_staff = True, and assigns the ADMIN UserRole.
    4. If user.user_type == 'ADMIN' and user has an institution, ensures their StaffProfile is aligned as staff_type='ADMIN' and designation='Academy Administrator'.
    """
    if not user:
        return None

    # Global Super Admins remain decoupled from institutional operational rosters
    if user.is_superuser or (getattr(user, 'user_type', '') or '').upper() == 'SUPER_ADMIN':
        return getattr(user, 'staff_profile', None)

    from core.models.staff import StaffProfile
    from core.models.iam import UserRole
    from django.db.models import Q

    staff_profile = getattr(user, 'staff_profile', None)

    # Step 1: Auto-link orphaned staff profiles by user identity match
    if not staff_profile:
        inst = institution or getattr(user, 'institution', None)
        lookup_q = Q(user__isnull=True)
        id_filters = Q()

        if user.phone_number:
            id_filters |= Q(emergency_contact=user.phone_number) | Q(nid_no=user.phone_number)
        if user.email:
            id_filters |= Q(employee_id__iexact=user.email)
        if user.name:
            # Check by user's name if employee ID is ADM or matches
            id_filters |= Q(designation__icontains='Admin')

        matched_staff = None
        if inst and id_filters:
            matched_staff = StaffProfile.objects.filter(lookup_q & id_filters & Q(institution=inst)).first()
        elif id_filters:
            matched_staff = StaffProfile.objects.filter(lookup_q & id_filters).first()

        # Fallback: If user is ADMIN and institution has unlinked admin staff
        if not matched_staff and inst and (getattr(user, 'user_type', '') or '').upper() == 'ADMIN':
            matched_staff = StaffProfile.objects.filter(institution=inst, staff_type='ADMIN', user__isnull=True).first()

        if matched_staff:
            matched_staff.user = user
            matched_staff.save(update_fields=['user'])
            staff_profile = matched_staff

    # Step 2: Harmonize User and StaffProfile
    user_updated_fields = set()
    if staff_profile:
        # A. Sync Institution
        if staff_profile.institution and not user.institution_id:
            user.institution = staff_profile.institution
            user_updated_fields.add('institution')
        elif user.institution and not staff_profile.institution_id:
            staff_profile.institution = user.institution
            staff_profile.save(update_fields=['institution'])

        # B. Sync Admin Elevation
        admin_role = UserRole.objects.filter(code__iexact='ADMIN').first()
        if staff_profile.staff_type == 'ADMIN':
            if (getattr(user, 'user_type', '') or '').upper() != 'ADMIN':
                user.user_type = 'ADMIN'
                user_updated_fields.add('user_type')
            if not user.is_staff:
                user.is_staff = True
                user_updated_fields.add('is_staff')
            if admin_role and user.role_id != admin_role.id:
                user.role = admin_role
                user_updated_fields.add('role')
        elif (getattr(user, 'user_type', '') or '').upper() == 'ADMIN':
            # User is ADMIN, elevate staff profile
            sp_updated = set()
            if staff_profile.staff_type != 'ADMIN':
                staff_profile.staff_type = 'ADMIN'
                sp_updated.add('staff_type')
            if 'admin' not in staff_profile.designation.lower():
                staff_profile.designation = 'Academy Administrator'
                sp_updated.add('designation')
            if staff_profile.rank_order != 1:
                staff_profile.rank_order = 1
                sp_updated.add('rank_order')
            if sp_updated:
                staff_profile.save(update_fields=list(sp_updated))

            if not user.is_staff:
                user.is_staff = True
                user_updated_fields.add('is_staff')
            if admin_role and user.role_id != admin_role.id:
                user.role = admin_role
                user_updated_fields.add('role')
    else:
        # User has no staff profile, but has institution and user_type='ADMIN'
        inst = institution or getattr(user, 'institution', None)
        if inst:
            staff_profile = ensure_institution_staff_profile(user, inst)

    if user_updated_fields:
        user.save(update_fields=list(user_updated_fields))

    return staff_profile


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

    # 0. Global Super Admins are platform-level operators; never auto-recruit into institutional HR rosters
    if user.is_superuser or (getattr(user, 'user_type', '') or '').upper() == 'SUPER_ADMIN':
        return None

    inst = institution or getattr(user, 'institution', None)
    if not inst:
        # Check if user has an existing staff profile with institution
        sp = getattr(user, 'staff_profile', None)
        if sp and sp.institution:
            inst = sp.institution
            user.institution = inst
            user.save(update_fields=['institution'])
        else:
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
        if u_type in ['ADMIN', 'DIRECTOR', 'HEADMASTER', 'PRINCIPAL']:
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

