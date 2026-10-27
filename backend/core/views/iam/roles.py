from .base import *
import webauthn
import pyotp
import qrcode


class UserRoleListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def get(self, request):
        if not UserRole.objects.filter(code='SUPER_ADMIN').exists():
            from core.services import seed_system_roles
            seed_system_roles()
        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        roles = UserRole.objects.all().prefetch_related('action_permissions').order_by('hierarchy_level', 'name')
        
        # Optimize N+1 query: Fetch all active user role allocations in a single query
        users = list(User.objects.values('role_id', 'user_type'))
        
        data = []
        for role in roles:
            perm = getattr(role, 'action_permissions', None)
            user_count = sum(
                1 for u in users
                if u.get('role_id') == role.id or (u.get('user_type') and str(u['user_type']).upper() == role.code.upper())
            )
            data.append({
                'id': role.id,
                'name': role.name,
                'code': role.code,
                'description': role.description,
                'hierarchy_level': role.hierarchy_level,
                'color_theme': role.color_theme,
                'is_system_role': role.code == 'SUPER_ADMIN',
                'is_google_default': role.code == default_google_role,
                'user_count': user_count,
                'action_permissions': {
                    'can_create_student': perm.can_create_student if perm else True,
                    'can_edit_student': perm.can_edit_student if perm else True,
                    'can_delete_report': perm.can_delete_report if perm else False,
                    'can_export_reports': perm.can_export_reports if perm else True,
                    'can_manage_users': perm.can_manage_users if perm else False,
                }
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip().upper()
        description = request.data.get('description', '').strip()
        hierarchy_level = request.data.get('hierarchy_level', 5)
        color_theme = request.data.get('color_theme', 'blue')
        action_permissions = request.data.get('action_permissions', {})

        if not name or not code:
            return Response({'error': 'Name and Code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if UserRole.objects.filter(code=code).exists():
            return Response({'error': f'Role with code "{code}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        role = UserRole.objects.create(
            name=name,
            code=code,
            description=description,
            hierarchy_level=hierarchy_level,
            color_theme=color_theme,
            is_system_role=False,
        )

        RoleActionPermission.objects.create(
            role=role,
            can_create_student=action_permissions.get('can_create_student', True),
            can_edit_student=action_permissions.get('can_edit_student', True),
            can_delete_report=action_permissions.get('can_delete_report', False),
            can_export_reports=action_permissions.get('can_export_reports', True),
            can_manage_users=action_permissions.get('can_manage_users', False),
        )

        return Response({'message': 'Role created successfully', 'role_id': role.id}, status=status.HTTP_201_CREATED)


class UserRoleDetailView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def get(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        perm = getattr(role, 'action_permissions', None)
        user_count = User.objects.filter(Q(role=role) | Q(user_type=role.code)).count()

        return Response({
            'id': role.id,
            'name': role.name,
            'code': role.code,
            'description': role.description,
            'hierarchy_level': role.hierarchy_level,
            'color_theme': role.color_theme,
            'is_system_role': role.code == 'SUPER_ADMIN',
            'is_google_default': role.code == default_google_role,
            'user_count': user_count,
            'action_permissions': {
                'can_create_student': perm.can_create_student if perm else True,
                'can_edit_student': perm.can_edit_student if perm else True,
                'can_delete_report': perm.can_delete_report if perm else False,
                'can_export_reports': perm.can_export_reports if perm else True,
                'can_manage_users': perm.can_manage_users if perm else False,
            }
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        role.name = request.data.get('name', role.name).strip()
        role.description = request.data.get('description', role.description).strip()
        role.hierarchy_level = request.data.get('hierarchy_level', role.hierarchy_level)
        role.color_theme = request.data.get('color_theme', role.color_theme)
        role.save()

        action_permissions = request.data.get('action_permissions')
        if action_permissions and isinstance(action_permissions, dict):
            perm, _ = RoleActionPermission.objects.get_or_create(role=role)
            if 'can_create_student' in action_permissions: perm.can_create_student = action_permissions['can_create_student']
            if 'can_edit_student' in action_permissions: perm.can_edit_student = action_permissions['can_edit_student']
            if 'can_delete_report' in action_permissions: perm.can_delete_report = action_permissions['can_delete_report']
            if 'can_export_reports' in action_permissions: perm.can_export_reports = action_permissions['can_export_reports']
            if 'can_manage_users' in action_permissions: perm.can_manage_users = action_permissions['can_manage_users']
            perm.save()

        return Response({'message': 'Role updated successfully'}, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        if role.code == 'SUPER_ADMIN':
            return Response({'error': 'Super Admin role cannot be deleted'}, status=status.HTTP_400_BAD_REQUEST)

        user_count = User.objects.filter(Q(role=role) | Q(user_type=role.code)).count()
        if user_count > 0:
            return Response({'error': f'Cannot delete role assigned to {user_count} active user(s)'}, status=status.HTTP_400_BAD_REQUEST)

        role.delete()
        return Response({'message': 'Role deleted successfully'}, status=status.HTTP_200_OK)


class UserRoleCloneView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def post(self, request, pk=None):
        source_role_id = pk or request.data.get('source_role_id')
        source_role_code = request.data.get('source_role_code')
        new_name = request.data.get('new_role_name') or request.data.get('name', '').strip()
        new_code = (request.data.get('new_role_code') or request.data.get('code', '')).strip().upper()

        source_role = None
        if source_role_id:
            source_role = UserRole.objects.filter(pk=source_role_id).first()
        elif source_role_code:
            source_role = UserRole.objects.filter(code=source_role_code).first()

        if not source_role:
            return Response({'error': 'Source role not found'}, status=status.HTTP_404_NOT_FOUND)

        if not new_name or not new_code:
            return Response({'error': 'New role name and code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if UserRole.objects.filter(code=new_code).exists():
            return Response({'error': f'Role with code "{new_code}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        cloned_role = UserRole.objects.create(
            name=new_name,
            code=new_code,
            description=f'Cloned from {source_role.name}',
            hierarchy_level=source_role.hierarchy_level,
            color_theme=source_role.color_theme,
            is_system_role=False,
        )

        source_perm = getattr(source_role, 'action_permissions', None)
        RoleActionPermission.objects.create(
            role=cloned_role,
            can_create_student=source_perm.can_create_student if source_perm else True,
            can_edit_student=source_perm.can_edit_student if source_perm else True,
            can_delete_report=source_perm.can_delete_report if source_perm else False,
            can_export_reports=source_perm.can_export_reports if source_perm else True,
            can_manage_users=source_perm.can_manage_users if source_perm else False,
        )

        return Response({'message': 'Role cloned successfully', 'role_id': cloned_role.id}, status=status.HTTP_201_CREATED)


class SetGoogleDefaultRoleAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        role_code = request.data.get('role_code', '').strip().upper()
        if not role_code:
            return Response({'error': 'Role code is required'}, status=status.HTTP_400_BAD_REQUEST)

        SystemSetting.set_val('DEFAULT_GOOGLE_ROLE', role_code, description='Default role assigned to new Google OAuth users')
        return Response({
            'message': f'Default Google OAuth role set to {role_code}',
            'default_google_role': role_code
        }, status=status.HTTP_200_OK)

    def get(self, request):
        role_code = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        return Response({'default_google_role': role_code}, status=status.HTTP_200_OK)


