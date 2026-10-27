from .base import *
import webauthn
import pyotp
import qrcode


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrSelf, HasSectionAccess]
    required_section_key = 'app_user_management'
    serializer_class = UserAdminSerializer
    queryset = User.objects.all().select_related('role').order_by('-date_joined')

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return User.objects.none()

        is_super = user.is_superuser or getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN'
        is_admin = user.is_staff or getattr(user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or user.is_superuser
        
        if is_super:
            qs = User.objects.all().select_related('role', 'institution').order_by('-date_joined')
            tenant_id = get_scoped_tenant_id(self.request)
            if tenant_id:
                qs = qs.filter(institution_id=tenant_id)
        elif is_admin:
            if user.institution_id:
                qs = User.objects.filter(institution_id=user.institution_id).select_related('role', 'institution').order_by('-date_joined')
            else:
                qs = User.objects.filter(Q(id=user.id) | Q(created_by=user)).select_related('role', 'institution').order_by('-date_joined')
        else:
            if user.institution_id:
                qs = User.objects.filter(institution_id=user.institution_id).select_related('role', 'institution').order_by('-date_joined')
            else:
                qs = User.objects.filter(id=user.id).select_related('role', 'institution')

        role_code = self.request.query_params.get('role_code') or self.request.query_params.get('user_type') or self.request.query_params.get('role')
        if role_code and role_code.upper() != 'ALL':
            qs = qs.filter(Q(role__code__iexact=role_code) | Q(user_type__iexact=role_code))
        
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(name__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(email__icontains=search)
            )
        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        threshold = timezone.now() - timedelta(minutes=5)
        context['online_user_ids'] = set(
            UserSession.objects.filter(is_active=True, last_activity__gte=threshold).values_list('user_id', flat=True)
        )
        return context


    def perform_create(self, serializer):
        user_type = self.request.data.get('user_type') or self.request.data.get('role') or self.request.data.get('role_code')
        role_obj = None
        if user_type:
            if isinstance(user_type, int) or (isinstance(user_type, str) and user_type.isdigit()):
                role_obj = UserRole.objects.filter(pk=int(user_type)).first()
            if not role_obj and isinstance(user_type, str):
                role_obj = UserRole.objects.filter(code__iexact=user_type).first()

        tenant_id = get_scoped_tenant_id(self.request)
        if tenant_id and not serializer.validated_data.get('institution'):
            serializer.save(role=role_obj, institution_id=tenant_id, created_by=self.request.user)
        elif not serializer.validated_data.get('institution') and self.request.user.institution_id:
            serializer.save(role=role_obj, institution_id=self.request.user.institution_id, created_by=self.request.user)
        else:
            serializer.save(role=role_obj, created_by=self.request.user)

    def perform_update(self, serializer):
        user_type = self.request.data.get('user_type') or self.request.data.get('role') or self.request.data.get('role_code')
        role_obj = None
        if user_type:
            if isinstance(user_type, int) or (isinstance(user_type, str) and user_type.isdigit()):
                role_obj = UserRole.objects.filter(pk=int(user_type)).first()
            if not role_obj and isinstance(user_type, str):
                role_obj = UserRole.objects.filter(code__iexact=user_type).first()
        if role_obj:
            serializer.save(role=role_obj)
        else:
            serializer.save()

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get('new_password') or request.data.get('password')
        if not new_password or len(str(new_password).strip()) < 8:
            return Response({'error': 'Password must be at least 8 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(str(new_password).strip())
        user.save()
        return Response({'success': True, 'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='bulk-actions')
    def bulk_actions(self, request):
        action_name = request.data.get('action')
        user_ids = request.data.get('user_ids', [])
        if not user_ids or not isinstance(user_ids, list):
            return Response({'error': 'No user IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)

        target_users = self.get_queryset().filter(id__in=user_ids)
        count = target_users.count()
        if action_name == 'activate':
            target_users.update(is_active=True, is_deactivated=False)
            return Response({'success': True, 'count': count, 'message': f'{count} users activated successfully.'})
        elif action_name == 'deactivate':
            safe_targets = target_users.exclude(id=request.user.id).exclude(is_superuser=True)
            deactivated_count = safe_targets.update(is_active=False, is_deactivated=True)
            return Response({'success': True, 'count': deactivated_count, 'message': f'{deactivated_count} users deactivated successfully.'})
        elif action_name == 'assign_role':
            role_code = request.data.get('role_code')
            role_obj = UserRole.objects.filter(code__iexact=role_code).first()
            if not role_obj:
                return Response({'error': 'Invalid role specified.'}, status=status.HTTP_400_BAD_REQUEST)
            target_users.update(role=role_obj, user_type=role_obj.code)
            return Response({'success': True, 'count': count, 'message': f'Role updated for {count} users.'})
        return Response({'error': 'Unsupported bulk action.'}, status=status.HTTP_400_BAD_REQUEST)


