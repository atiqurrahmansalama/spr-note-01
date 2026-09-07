from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from core.models.templates import SavedMessage
from core.serializers.templates import SavedMessageSerializer
from core.permissions import IsOwnerOrSuperAdmin

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
