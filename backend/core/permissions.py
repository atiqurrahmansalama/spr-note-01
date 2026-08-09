from rest_framework import permissions


class IsAdminUserRole(permissions.BasePermission):
    """
    Grants full access to Super Admin or Admin users (or is_superuser / is_staff).
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return (
            request.user.is_superuser or
            request.user.is_staff or
            getattr(request.user, 'user_type', None) in ['SUPER_ADMIN', 'ADMIN']
        )


class IsTeacherUserRole(permissions.BasePermission):
    """
    Grants access to Teachers, Admins, and Super Admins.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return (
            request.user.is_superuser or
            request.user.is_staff or
            getattr(request.user, 'user_type', None) in ['SUPER_ADMIN', 'ADMIN', 'TEACHER']
        )


class IsGuardianUserRole(permissions.BasePermission):
    """
    Grants READ-ONLY access to Guardians for their assigned students.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in permissions.SAFE_METHODS:
            return getattr(request.user, 'user_type', None) in ['GUARDIAN', 'SUPER_ADMIN', 'ADMIN', 'TEACHER']
        return getattr(request.user, 'user_type', None) in ['SUPER_ADMIN', 'ADMIN', 'TEACHER']
