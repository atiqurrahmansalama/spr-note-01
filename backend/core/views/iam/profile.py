from .base import *
import webauthn
import pyotp
import qrcode


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get_target_user(self, request):
        if not request.user or not request.user.is_authenticated:
            return None

        is_admin = request.user.is_staff or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN'] or request.user.is_superuser
        if is_admin:
            user_id = request.data.get('user_id') or request.data.get('id') or request.query_params.get('user_id') or request.query_params.get('id')
            if user_id:
                u = User.objects.filter(pk=user_id).first()
                if u:
                    return u

            phone = request.data.get('phone_number') or request.data.get('phone') or request.query_params.get('phone_number')
            if phone:
                u = User.objects.filter(phone_number=str(phone).strip()).first()
                if u:
                    return u

            email = request.data.get('email') or request.query_params.get('email')
            if email:
                u = User.objects.filter(email__iexact=str(email).strip()).first()
                if u:
                    return u

        return request.user

    def get(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        role_data = None
        if user.role:
            perms_obj = getattr(user.role, 'action_permissions', None)
            perms_dict = {
                'can_create_student': perms_obj.can_create_student,
                'can_edit_student': perms_obj.can_edit_student,
                'can_delete_report': perms_obj.can_delete_report,
                'can_export_reports': perms_obj.can_export_reports,
                'can_manage_users': perms_obj.can_manage_users,
            } if perms_obj else {}
            role_data = {
                'id': user.role.id,
                'name': user.role.name,
                'code': user.role.code,
                'description': user.role.description,
                'hierarchy_level': user.role.hierarchy_level,
                'color_theme': user.role.color_theme,
                'is_system_role': user.role.is_system_role,
                'action_permissions': perms_dict,
            }
        else:
            role_data = {
                'id': None,
                'name': user.get_user_type_display() if hasattr(user, 'get_user_type_display') else user.user_type,
                'code': user.user_type,
                'description': '',
                'hierarchy_level': 5,
                'color_theme': 'purple' if user.user_type == 'GUARDIAN' else 'blue',
                'is_system_role': False,
                'action_permissions': {},
            }

        full_name = user.name or f"{user.first_name or ''} {user.last_name or ''}".strip()

        return Response({
            'id': user.id,
            'name': full_name,
            'first_name': user.first_name or "",
            'last_name': user.last_name or "",
            'phone_number': user.phone_number or "",
            'email': user.email or "",
            'user_type': user.user_type,
            'role': role_data,
            'avatar_url': user.avatar_url or "",
            'assigned_group': user.assigned_group or "",
            'is_email_verified': user.is_email_verified,
            'is_2fa_enabled': getattr(user, 'is_2fa_enabled', False),
            'has_google_linked': bool(getattr(user, 'google_sub_id', None)),
            'google_sub_id': getattr(user, 'google_sub_id', "") or "",
            'has_password': user.has_usable_password(),
            'passkeys_count': user.passkeys.count() if hasattr(user, 'passkeys') else 0,
            'date_joined': user.date_joined.strftime("%Y-%m-%d %I:%M %p") if user.date_joined else "--",
        }, status=status.HTTP_200_OK)

    def patch(self, request):
        user = self.get_target_user(request)
        if not user:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'first_name' in data:
            user.first_name = str(data['first_name']).strip()
        if 'last_name' in data:
            user.last_name = str(data['last_name']).strip()
        if 'email' in data:
            incoming_email = str(data['email']).strip().lower()
            if incoming_email != (user.email or '').lower():
                is_admin = request.user.is_staff or request.user.is_superuser or getattr(request.user, 'user_type', '').upper() in ['SUPER_ADMIN', 'ADMIN']
                if is_admin and user != request.user:
                    user.email = incoming_email
                    user.is_email_verified = True
                # For self-service profile edits, email change is handled securely through the verified OTP flow.
        if 'avatar_url' in data:
            user.avatar_url = data['avatar_url']

        computed_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        if 'name' in data and data['name']:
            user.name = str(data['name']).strip()
        else:
            user.name = computed_name

        user.save()

        # Direct DB update to guarantee persistence across all ORM layers
        User.objects.filter(id=user.id).update(
            name=user.name,
            first_name=user.first_name,
            last_name=user.last_name,
            email=user.email,
            avatar_url=user.avatar_url
        )

        # Sync linked profiles
        try:
            if hasattr(user, 'teacher_profile') and user.teacher_profile:
                user.teacher_profile.name_en = user.name
                user.teacher_profile.save()
            if hasattr(user, 'guardian_profile') and user.guardian_profile:
                user.guardian_profile.name_en = user.name
                user.guardian_profile.save()
        except Exception:
            pass

        return self.get(request)

    def put(self, request):
        return self.patch(request)


class DeactivateAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.is_deactivated = True
        user.deactivated_at = timezone.now()
        user.is_active = False
        user.save()
        return Response({"status": "success", "message": "Account deactivated successfully."}, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        password = request.data.get("password") or request.query_params.get("password")
        if user.has_usable_password():
            if not password or not user.check_password(password):
                return Response({"error": "Invalid or missing password confirmation."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_active = False
        user.is_deactivated = True
        user.deactivated_at = timezone.now()
        user.save()
        return Response({"status": "success", "message": "Account has been soft-deleted/deactivated."}, status=status.HTTP_200_OK)


class UserNotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
        serializer = UserNotificationPreferenceSerializer(pref)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        pref, _ = UserNotificationPreference.objects.get_or_create(user=user)
        serializer = UserNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


