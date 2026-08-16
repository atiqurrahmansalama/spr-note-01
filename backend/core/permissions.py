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
    Enforces strict default-deny (defaulting to False).
    Usage on DRF APIViews:
        permission_classes = [IsAuthenticated, HasSectionAccess]
        required_section_key = 'pdfExport'
    """
    def has_permission(self, request, view):
        section_key = getattr(view, 'required_section_key', None)
        if not section_key:
            return True
            
        # Allow self-profile updates even if general user management feature is disabled
        if request.user and request.user.is_authenticated:
            pk = view.kwargs.get('pk')
            if pk == 'me' or str(pk) == str(request.user.id):
                return True
                
        from .services import get_resolved_feature_flags_for_user
        flags, _ = get_resolved_feature_flags_for_user(request.user)
        return flags.get(section_key, False)


class IsOwnerOrSuperAdmin(BasePermission):
    """
    Object-level permission to allow owners of an object, members of the same institution, or Super Admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super Admins have absolute access
        if getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN' or request.user.is_superuser:
            return True

        # Check institution tenancy
        obj_inst_id = getattr(obj, 'institution_id', None)
        user_inst_id = getattr(request.user, 'institution_id', None)
        if obj_inst_id and user_inst_id and str(obj_inst_id) == str(user_inst_id):
            return True

        # Check direct ownership field
        owner = getattr(obj, 'created_by', None) or getattr(obj, 'user', None) or getattr(obj, 'owner', None)
        if owner and owner == request.user:
            return True

        return False


class IsAdminOrSelf(BasePermission):
    """
    Permission class to allow Admins full access, and regular users to retrieve/update only themselves.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        action = getattr(view, 'action', None)
        if action == 'create':
            return (
                request.user.is_staff or 
                getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or 
                request.user.is_superuser
            )

        return True

    def has_object_permission(self, request, view, obj):
        is_admin = (
            request.user.is_staff or 
            getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or 
            request.user.is_superuser
        )
        if is_admin:
            return True

        return obj == request.user


class IsSuperAdmin(BasePermission):
    """
    Permission class allowing access only to SUPER_ADMIN or is_superuser users.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN'


class IsInstitutionAdmin(BasePermission):
    """
    Permission class allowing access to SUPER_ADMIN or ADMIN of an institution.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser or 
            getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or
            request.user.is_staff
        )


