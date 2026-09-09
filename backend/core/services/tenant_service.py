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
