import uuid
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.models.templates import SavedMessage, CustomDocxTemplate
from core.serializers.templates import SavedMessageSerializer, CustomDocxTemplateSerializer
from core.permissions import IsOwnerOrSuperAdmin
from core.services import get_scoped_tenant_id
from core.models.institutions import AcademicInstitution

class SavedMessageViewSet(viewsets.ModelViewSet):
    """
    Universal Reusable Text Template ViewSet.
    Handles per-field namespace filtering via query parameter: ?category=<namespace>
    """
    queryset = SavedMessage.objects.all().order_by('-created_at')
    serializer_class = SavedMessageSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        if getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser:
            qs = self.queryset.all()
        else:
            qs = self.queryset.filter(created_by=user)

        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)

        return qs

    def perform_create(self, serializer):
        category = self.request.data.get('category') or self.request.query_params.get('category') or 'general'
        serializer.save(created_by=self.request.user, category=category)

# Alias for semantic clean code in modern endpoints
UniversalTemplateViewSet = SavedMessageViewSet


class CustomDocxTemplateViewSet(viewsets.ModelViewSet):
    """
    Enterprise Custom DocLab / DOCX Template ViewSet.
    Manages persistent print studio document templates across devices with hybrid local caching.
    Supports user-scoped authoring and institution-wide sharing.
    """
    queryset = CustomDocxTemplate.objects.filter(is_deleted=False).order_by('-updated_at')
    serializer_class = CustomDocxTemplateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated:
            return self.queryset.none()

        tenant_id = get_scoped_tenant_id(self.request) or getattr(user, 'institution_id', None)

        # Users can see:
        # 1. Their own created templates
        # 2. Templates shared within their institution scope
        # 3. Global sticky templates (visible to all users across modules)
        if getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser:
            qs = self.queryset.all()
        elif tenant_id:
            qs = self.queryset.filter(
                Q(user=user) | Q(is_shared=True, institution_id=tenant_id) | Q(is_global_sticky=True)
            )
        else:
            qs = self.queryset.filter(Q(user=user) | Q(is_global_sticky=True))

        scope_id = self.request.query_params.get('scope_id') or self.request.query_params.get('scopeId')
        if scope_id:
            qs = qs.filter(scope_id=scope_id)

        template_type = self.request.query_params.get('template_type') or self.request.query_params.get('templateType')
        if template_type:
            qs = qs.filter(template_type=template_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))

        return qs

    def create(self, request, *args, **kwargs):
        template_id = request.data.get('id')
        if template_id and CustomDocxTemplate.objects.filter(id=template_id).exists():
            instance = CustomDocxTemplate.objects.get(id=template_id)
            serializer = self.get_serializer(instance, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data, status=status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first() if tenant_id else None
        
        template_id = self.request.data.get('id')
        if not template_id:
            template_id = str(uuid.uuid4())
            
        is_super = getattr(self.request.user, 'user_type', '').upper() == 'SUPER_ADMIN' or self.request.user.is_superuser
        is_sticky = bool(self.request.data.get('is_global_sticky') or self.request.data.get('isGlobalSticky', False)) if is_super else False

        serializer.save(
            id=template_id,
            user=self.request.user,
            institution=inst,
            is_global_sticky=is_sticky,
        )

    def perform_update(self, serializer):
        is_super = getattr(self.request.user, 'user_type', '').upper() == 'SUPER_ADMIN' or self.request.user.is_superuser
        if is_super and ('is_global_sticky' in self.request.data or 'isGlobalSticky' in self.request.data):
            raw_val = self.request.data.get('is_global_sticky')
            if raw_val is None:
                raw_val = self.request.data.get('isGlobalSticky')
            if raw_val is not None:
                serializer.save(is_global_sticky=bool(raw_val))
                return
        serializer.save()

    @action(detail=True, methods=['post'], url_path='toggle-sticky')
    def toggle_sticky(self, request, pk=None):
        user = request.user
        is_super = getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser
        if not is_super:
            return Response(
                {'detail': 'Permission denied. Only Super Admin can toggle global sticky templates.'},
                status=status.HTTP_403_FORBIDDEN
            )
        template = self.get_object()

        # Support explicit target sticky value from client to prevent out-of-sync flips
        target_state = request.data.get('is_global_sticky')
        if target_state is None:
            target_state = request.data.get('isGlobalSticky')

        if target_state is not None:
            template.is_global_sticky = bool(target_state)
        else:
            template.is_global_sticky = not template.is_global_sticky

        template.save(update_fields=['is_global_sticky', 'updated_at'])
        return Response({
            'id': template.id,
            'is_global_sticky': template.is_global_sticky,
            'isGlobalSticky': template.is_global_sticky,
            'scope_id': template.scope_id,
            'message': f"Template is now {'globally sticky' if template.is_global_sticky else 'unpinned'}"
        })

    def perform_destroy(self, instance):
        # Soft delete to prevent catastrophic data loss
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])

