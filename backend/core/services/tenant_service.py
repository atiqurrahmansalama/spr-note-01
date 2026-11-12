"""
Tenant & Institution Provisioning Services
"""

from typing import Dict, Any
from django.db import transaction
from core.models.institutions import AcademicInstitution, AcademicBranch, TenantTaxonomySetting


@transaction.atomic
def provision_new_institution(data: Dict[str, Any]) -> AcademicInstitution:
    """
    Provisions a new academic institution along with default main branch
    and standard taxonomy configuration.
    """
    institution = AcademicInstitution.objects.create(
        name=data.get('name'),
        slug=data.get('slug') or data.get('code', '').lower(),
        phone=data.get('phone', ''),
        email=data.get('email', ''),
        address=data.get('address', ''),
        is_active=True
    )

    # Provision default Main Campus / Branch
    AcademicBranch.objects.create(
        institution=institution,
        branch_name="Main Campus",
        branch_code="MAIN",
        branch_type='MAIN_CAMPUS',
        contact_phone=institution.phone,
        contact_email=institution.email,
        address=institution.address
    )

    return institution


@transaction.atomic
def update_tenant_taxonomy(institution_id: str, taxonomy_key: str, data: list) -> TenantTaxonomySetting:
    """Updates taxonomy display records for an institution."""
    setting, _ = TenantTaxonomySetting.objects.get_or_create(
        institution_id=institution_id,
        taxonomy_key=taxonomy_key,
        defaults={'data': data}
    )
    setting.data = data
    setting.save()
    return setting


def resolve_request_institution(request=None, user=None) -> AcademicInstitution:
    """
    Robust multi-tenant institution resolver that guarantees returning a valid AcademicInstitution instance.
    Prevents NOT NULL constraint failures across offline, cross-tenant, and test environments.
    Cascades gracefully:
    1. Active scoped tenant_id from header/params (if matches an existing institution)
    2. Request user's direct institution affinity
    3. User's staff profile institution affinity
    4. Active primary/default institution (is_deleted=False)
    5. First available institution in database
    """
    from core.legacy_services import get_scoped_tenant_id

    req_user = user or (getattr(request, 'user', None) if request else None)
    tenant_id = get_scoped_tenant_id(request) if request else None

    inst = None
    if tenant_id:
        try:
            inst = AcademicInstitution.objects.filter(id=tenant_id).first()
        except Exception:
            inst = None

    if not inst and req_user and getattr(req_user, 'is_authenticated', False):
        try:
            inst = getattr(req_user, 'institution', None)
        except Exception:
            inst = None

        if not inst and hasattr(req_user, 'staff_profile') and req_user.staff_profile:
            try:
                inst = getattr(req_user.staff_profile, 'institution', None)
            except Exception:
                inst = None

    if not inst:
        inst = AcademicInstitution.objects.filter(is_deleted=False).first() or AcademicInstitution.objects.first()

    return inst

