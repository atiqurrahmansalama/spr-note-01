import uuid
from django.db.models import Q
from rest_framework import viewsets, status
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
        if getattr(user, 'user_type', '').upper() == 'SUPER_ADMIN' or user.is_superuser:
            qs = self.queryset.all()
        elif tenant_id:
            qs = self.queryset.filter(
                Q(user=user) | Q(is_shared=True, institution_id=tenant_id)
            )
        else:
            qs = self.queryset.filter(user=user)

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

    def perform_create(self, serializer):
        tenant_id = get_scoped_tenant_id(self.request) or getattr(self.request.user, 'institution_id', None)
        inst = AcademicInstitution.objects.filter(id=tenant_id).first() if tenant_id else None
        
        template_id = self.request.data.get('id')
        if not template_id:
            template_id = str(uuid.uuid4())
            
        serializer.save(
            id=template_id,
            user=self.request.user,
            institution=inst,
        )

    def perform_destroy(self, instance):
        # Soft delete to prevent catastrophic data loss
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])

