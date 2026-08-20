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
        if not obj_inst_id and hasattr(obj, 'student_class') and obj.student_class:
            obj_inst_id = getattr(obj.student_class, 'institution_id', None)
        if not obj_inst_id and hasattr(obj, 'branch') and obj.branch:
            obj_inst_id = getattr(obj.branch, 'institution_id', None)
        if not obj_inst_id and hasattr(obj, 'department') and obj.department:
            obj_inst_id = getattr(obj.department, 'institution_id', None)
        if not obj_inst_id and hasattr(obj, 'student') and obj.student:
            obj_inst_id = getattr(obj.student, 'institution_id', None)

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

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN':
            return True
        user_inst = getattr(request.user, 'institution_id', None)
        obj_inst = getattr(obj, 'institution_id', None)
        if not obj_inst and hasattr(obj, 'staff'):
            obj_inst = getattr(obj.staff, 'institution_id', None)
        if not obj_inst and hasattr(obj, 'teacher'):
            obj_inst = getattr(obj.teacher, 'institution_id', None)
        return bool(user_inst and obj_inst and str(user_inst) == str(obj_inst))


class IsTeacher(BasePermission):
    """
    Permission class to allow access to users with TEACHER user_type or TEACHING staff profile.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_superuser or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN']:
            return True
        if getattr(request.user, 'user_type', '').upper() == 'TEACHER':
            return True
        profile = getattr(request.user, 'staff_profile', None)
        if profile and profile.staff_type == 'TEACHING':
            return True
        return False


class IsStaffSelfOrAdmin(BasePermission):
    """
    Permission class to allow staff members to read/manage their own records,
    while permitting Institution Admins and Super Admins full access.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        # Super Admin / Staff Admin bypass
        if request.user.is_superuser or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN']:
            if getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN' or request.user.is_superuser:
                return True
            user_inst = getattr(request.user, 'institution_id', None)
            obj_inst = getattr(obj, 'institution_id', None)
            if not obj_inst and hasattr(obj, 'staff'):
                obj_inst = getattr(obj.staff, 'institution_id', None)
            if not obj_inst and hasattr(obj, 'teacher'):
                obj_inst = getattr(obj.teacher, 'institution_id', None)
            return bool(user_inst and obj_inst and str(user_inst) == str(obj_inst))

        # Check self match
        if hasattr(obj, 'user') and obj.user == request.user:
            return True
        if hasattr(obj, 'staff') and obj.staff.user == request.user:
            return True
        if hasattr(obj, 'teacher') and obj.teacher.user == request.user:
            return True

        return False


