from .base import *
import webauthn
import pyotp
import qrcode


class UserRoleListCreateView(APIView):
    permission_classes = [IsAuthenticated, HasSectionAccess]
    required_section_key = 'app_role_management'

    def get_permissions(self):
        # Allow any authenticated user to read the role catalog for dashboard headers & role metadata;
        # restrict write mutations behind section control & admin permissions.
        if self.request and self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminUserRole(), HasSectionAccess()]

    def get(self, request):
        if not UserRole.objects.filter(code='SUPER_ADMIN').exists():
            from core.services import seed_system_roles_11_tier
            seed_system_roles_11_tier()
        default_google_role = SystemSetting.get_val('DEFAULT_GOOGLE_ROLE', 'GUARDIAN')
        roles = UserRole.objects.all().order_by('-is_system_role', 'id', 'name')
        
        # Optimize N+1 query: Fetch all active user role allocations in a single query
        users = list(User.objects.values('role_id', 'user_type'))
        
        data = []
        for role in roles:
            user_count = sum(
                1 for u in users
                if u.get('role_id') == role.id or (u.get('user_type') and str(u['user_type']).upper() == role.code.upper())
            )
            data.append({
                'id': role.id,
                'name': role.name,
                'code': role.code,
                'description': role.description,
                'color_theme': role.color_theme,
                'is_system_role': role.code == 'SUPER_ADMIN',
                'is_google_default': role.code == default_google_role,
                'user_count': user_count,
            })
        return Response(data, status=status.HTTP_200_OK)

    def post(self, request):
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip().upper()
        description = request.data.get('description', '').strip()
        color_theme = request.data.get('color_theme', 'blue')

        if not name or not code:
            return Response({'error': 'Name and Code are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if UserRole.objects.filter(code=code).exists():
            return Response({'error': f'Role with code "{code}" already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        role = UserRole.objects.create(
            name=name,
            code=code,
            description=description,
            color_theme=color_theme,
            is_system_role=False,
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
        user_count = User.objects.filter(Q(role=role) | Q(user_type=role.code)).count()

        return Response({
            'id': role.id,
            'name': role.name,
            'code': role.code,
            'description': role.description,
            'color_theme': role.color_theme,
            'is_system_role': role.code == 'SUPER_ADMIN',
            'is_google_default': role.code == default_google_role,
            'user_count': user_count,
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        role = UserRole.objects.filter(pk=pk).first()
        if not role:
            return Response({'error': 'Role not found'}, status=status.HTTP_404_NOT_FOUND)

        role.name = request.data.get('name', role.name).strip()
        role.description = request.data.get('description', role.description).strip()
        role.color_theme = request.data.get('color_theme', role.color_theme)
        role.save()

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
            color_theme=source_role.color_theme,
            is_system_role=False,
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


