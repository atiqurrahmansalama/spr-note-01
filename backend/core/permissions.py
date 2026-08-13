from rest_framework.permissions import BasePermission

class IsAdminUserRole(BasePermission):
    """
    Permission class allowing access to SUPER_ADMIN, ADMIN, or is_staff users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_staff or getattr(request.user, 'user_type', None) in ['SUPER_ADMIN', 'ADMIN']


class HasSectionAccess(BasePermission):
    """
    DRF Permission Class to block unauthorized API execution if a section is disabled for that user.
    Usage on DRF APIViews:
        permission_classes = [IsAuthenticated, HasSectionAccess]
        required_section_key = 'pdfExport'
    """
    def has_permission(self, request, view):
        section_key = getattr(view, 'required_section_key', None)
        if not section_key:
            return True
            
        from .views import get_resolved_feature_flags_for_user
        flags, _ = get_resolved_feature_flags_for_user(request.user)
        return flags.get(section_key, True)
