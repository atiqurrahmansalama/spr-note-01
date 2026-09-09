"""
Tenant Integrity Validators
Ensures cross-tenant data leakage is prevented at domain boundaries.
"""

from rest_framework.exceptions import PermissionDenied, ValidationError
from core.models.institutions import AcademicInstitution


class TenantSecurityException(PermissionDenied):
    """Raised when a cross-tenant access violation occurs."""
    pass


def validate_tenant_match(target_obj, expected_tenant, resource_name: str = "Resource"):
    """
    Validates that a target resource belongs to the requested tenant.
    Accepts model instances or raw string IDs.
    Raises TenantSecurityException if there is a cross-tenant attempt.
    """
    target_inst_id = getattr(target_obj, 'institution_id', target_obj)
    expected_inst_id = getattr(expected_tenant, 'id', expected_tenant)
    if not expected_inst_id:
        return
    if target_inst_id and str(target_inst_id) != str(expected_inst_id):
        raise TenantSecurityException(
            f"Cross-tenant access violation: {resource_name} does not belong to active institution context."
        )


def validate_tenant_active(institution_id: str):
    """
    Validates that an academic institution is active and not suspended.
    """
    if not institution_id:
        return
    inst = AcademicInstitution.objects.filter(id=institution_id).first()
    if not inst:
        raise ValidationError({"institution_id": "Target institution not found."})
    if getattr(inst, 'subscription_status', 'ACTIVE') == 'SUSPENDED':
        raise TenantSecurityException("Institution subscription is currently suspended.")
