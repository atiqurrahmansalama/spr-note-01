"""
Student Management Module Routing Table.
Provides RESTful endpoints for student roster, profiles, admissions pipeline,
and document template management.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    StudentViewSet,
    AdmissionInviteTokenViewSet,
    PublicAdmissionVerifyView,
    AuthenticatedOnlineAdmissionApplyView,
    CustomDocxTemplateViewSet,
    DocumentTemplateViewSet,
)

router = SimpleRouter()
router.register(r'admissions/tokens', AdmissionInviteTokenViewSet, basename='student-admission-tokens')
router.register(r'templates/docx', CustomDocxTemplateViewSet, basename='student-docx-templates')
router.register(r'templates/documents', DocumentTemplateViewSet, basename='student-document-templates')
router.register(r'', StudentViewSet, basename='student-roster')

urlpatterns = [
    # Admission public & authenticated endpoints
    path('admissions/verify/', PublicAdmissionVerifyView.as_view(), name='student_admission_verify'),
    path('admissions/apply/', AuthenticatedOnlineAdmissionApplyView.as_view(), name='student_admission_apply'),
    
    # ViewSet routes
    path('', include(router.urls)),
]
