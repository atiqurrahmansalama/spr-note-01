"""
Tenant Scoped Model and QuerySet Mixins.
Rule 11: Multi-Tenant Isolation & Zero Data Leakage.
"""
from django.db import models
from .context import get_current_tenant_id


class TenantScopedQuerySet(models.QuerySet):
    def for_tenant(self, tenant_id: str):
        if not tenant_id or str(tenant_id).upper() in ("ALL", "GLOBAL"):
            return self
        field_names = [f.name for f in self.model._meta.get_fields()]
        if "institution" in field_names:
            return self.filter(institution_id=tenant_id)
        if "institution_id" in field_names:
            return self.filter(institution_id=tenant_id)
        if "tenant_id" in field_names:
            return self.filter(tenant_id=tenant_id)
        return self

    def current_tenant(self):
        active_tenant = get_current_tenant_id()
        if active_tenant:
            return self.for_tenant(active_tenant)
        return self


class TenantScopedManager(models.Manager.from_queryset(TenantScopedQuerySet)):
    pass
