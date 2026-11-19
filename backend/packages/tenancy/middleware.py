"""
Multi-Tenant Isolation Middleware.
Extracts tenant identity from HTTP headers, JWT claims, or URL query parameters.
"""
from typing import Callable
from django.http import HttpRequest, HttpResponse
from .context import set_current_tenant_id, clear_current_tenant_id


class TenantIsolationMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        tenant_id = (
            request.headers.get("X-Tenant-Id")
            or request.headers.get("X-Institution-Id")
            or request.GET.get("tenant_id")
            or request.GET.get("institution_id")
        )

        if not tenant_id and hasattr(request, "user") and request.user.is_authenticated:
            tenant_id = getattr(request.user, "institution_id", None) or getattr(request.user, "tenant_id", None)

        if tenant_id:
            set_current_tenant_id(str(tenant_id))
            request.tenant_id = str(tenant_id)
        else:
            clear_current_tenant_id()
            request.tenant_id = None

        try:
            response = self.get_response(request)
        finally:
            clear_current_tenant_id()

        return response
