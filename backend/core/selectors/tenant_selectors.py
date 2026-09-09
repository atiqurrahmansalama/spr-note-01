"""
Tenant Selectors
Encapsulates read operations for institutions, branches, and taxonomy settings.
"""

from typing import Optional
from django.db.models import QuerySet
from core.models.institutions import AcademicInstitution, AcademicBranch, TenantTaxonomySetting


def get_tenant_by_id(institution_id: str) -> Optional[AcademicInstitution]:
    """Retrieve an academic institution by its primary key ID."""
    if not institution_id:
        return None
    try:
        return AcademicInstitution.objects.prefetch_related('branches').filter(id=institution_id).first()
    except Exception:
        return None


def get_active_branches(institution_id: str) -> QuerySet:
    """Retrieve all active branches belonging to a specific institution."""
    if not institution_id:
        return AcademicBranch.objects.none()
    return AcademicBranch.objects.filter(institution_id=institution_id, is_active=True).order_by('branch_name')


def get_tenant_taxonomy_setting(institution_id: str) -> Optional[TenantTaxonomySetting]:
    """Retrieve taxonomy display label configurations for an institution."""
    if not institution_id:
        return None
    return TenantTaxonomySetting.objects.filter(institution_id=institution_id).first()
