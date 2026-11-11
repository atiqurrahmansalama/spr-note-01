import logging
from rest_framework.permissions import BasePermission, SAFE_METHODS

logger = logging.getLogger(__name__)

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
    Enforces strict default-deny (defaulting to False), while permitting read-only (SAFE_METHODS)
    institutional directory lookups for users authorized in classroom/academic/operational modules.
    Usage on DRF APIViews:
        permission_classes = [IsAuthenticated, HasSectionAccess]
        required_section_key = 'pdfExport'
    """
    _ACADEMIC_LOOKUP_CONSUMERS = (
        'nav_academic_studies',
        'monthly_attendance_matrix',
        'lesson_management',
        'lesson_tab_daily_lessons',
        'lesson_tab_assessments',
        'lesson_tab_analytics',
        'progress_management',
        'progress_tab_daily_progress',
        'progress_tab_reports',
        'nav_examinations',
        'exam_schedules',
        'exam_hall_logistics',
        'exam_tabulation',
    )
    _SHARED_READ_LOOKUP_KEYS = {
        'student_classes': ('student_classes', 'student_roster', 'student_admission', *_ACADEMIC_LOOKUP_CONSUMERS),
        'student_groups': ('student_groups', 'student_classes', 'student_roster', *_ACADEMIC_LOOKUP_CONSUMERS),
        'student_roster': ('student_roster', 'student_admission', *_ACADEMIC_LOOKUP_CONSUMERS),
        'class_sections': ('class_sections', 'classes_tab_sections', 'student_classes', *_ACADEMIC_LOOKUP_CONSUMERS),
        'staff_management': (
            'staff_management',
            'staff_roster',
            'nav_staff_management',
            'staff_daily_attendance',
            'staff_attendance',
            'staff_leaves',
            *_ACADEMIC_LOOKUP_CONSUMERS,
        ),
    }

    def has_permission(self, request, view):
        section_key = getattr(view, 'required_section_key', None)
        if not section_key:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        # Super Admin / Superuser has full platform-wide access
        if request.user.is_superuser or getattr(request.user, 'user_type', '').upper() == 'SUPER_ADMIN':
            return True

        # Allow self-profile updates even if general user management feature is disabled
        pk = view.kwargs.get('pk')
        if pk == 'me' or str(pk) == str(request.user.id):
            return True

        try:
            from core.services import get_resolved_feature_flags_for_user
            flags, _ = get_resolved_feature_flags_for_user(request.user)
        except Exception as err:
            logger.warning(f"[HasSectionAccess] Error evaluating feature flags: {err}")
            return True

        # Shared dropdown lookup access on safe GET/list/retrieve requests so classroom modules
        # remain populated even when admin CRUD pages (Classes/Roster/Staff) are disabled for a role.
        if (
            request.method in SAFE_METHODS
            and getattr(view, 'action', None) in (None, 'list', 'retrieve')
            and isinstance(section_key, str)
        ):
            read_keys = getattr(view, 'read_lookup_section_keys', None) or self._SHARED_READ_LOOKUP_KEYS.get(section_key)
            if read_keys and any(flags.get(k, False) for k in read_keys):
                return True
        
        if isinstance(section_key, (list, tuple, set)):
            return any(flags.get(k, False) for k in section_key)
            
        if section_key in ('staff_attendance', 'staff_daily_attendance'):
            return flags.get('staff_daily_attendance', flags.get('staff_roster', False))

        if section_key in ('staff_management', 'staff_leaves'):
            return flags.get('staff_roster', flags.get('nav_staff_management', False))

        if section_key in ('app_role_invites', 'app_role_management'):
            return flags.get('app_role_management', flags.get('app_user_management', False))

        if section_key in ('report_builder', 'progress_reports', 'progress_tab_reports'):
            return flags.get('progress_tab_reports', flags.get('progress_tab_daily_progress', flags.get('progress_management', True)))

        if section_key == 'student_departments':
            return flags.get('campus_tab_departments', flags.get('campus_profile', False))

        if section_key == 'student_groups':
            return flags.get('classes_tab_groups', flags.get('student_classes', False))

        if section_key == 'academic_branches':
            return flags.get('campus_tab_branches', flags.get('campus_profile', False))

        if section_key == 'class_sections':
            return flags.get('classes_tab_sections', flags.get('student_classes', False))

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
        if not obj_inst_id and hasattr(obj, 'created_by') and obj.created_by:
            obj_inst_id = getattr(obj.created_by, 'institution_id', None)
            if not obj_inst_id and getattr(obj.created_by, 'staff_profile', None):
                obj_inst_id = getattr(obj.created_by.staff_profile, 'institution_id', None)

        user_inst_id = getattr(request.user, 'institution_id', None)
        if obj_inst_id and user_inst_id and str(obj_inst_id) == str(user_inst_id):
            return True

        # Shared platform templates (created without an institution, e.g. global Session defaults) are read-accessible
        if request.method in SAFE_METHODS and hasattr(obj, 'created_by') and not hasattr(obj, 'institution_id'):
            creator = getattr(obj, 'created_by', None)
            if creator is None or getattr(creator, 'institution_id', None) is None:
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


