"""
Enterprise Identity & Access Management (IAM) Permissions.
Provides RBAC and tenant authorization.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAuthenticatedUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


class IsSuperAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.is_superuser
            or getattr(request.user, "user_type", "") == "SUPER_ADMIN"
            or getattr(request.user, "is_multi_tenant_admin", False)
        )


class IsAcademyAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        user_type = getattr(request.user, "user_type", "")
        return bool(
            request.user.is_staff
            or request.user.is_superuser
            or user_type in ("SUPER_ADMIN", "ADMIN", "PRINCIPAL")
        )


class ReadOnlyOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)
