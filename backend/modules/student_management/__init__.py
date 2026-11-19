"""
Student Management Module
Encapsulates Students, Enrollments, Admissions Pipeline,
Public Admission Tokens, and Document Templates.
"""
from .views import (
    StudentViewSet,
    AdmissionInviteTokenViewSet,
    PublicAdmissionVerifyView,
    AuthenticatedOnlineAdmissionApplyView,
    CustomDocxTemplateViewSet,
    DocumentTemplateViewSet,
)

__all__ = [
    'StudentViewSet',
    'AdmissionInviteTokenViewSet',
    'PublicAdmissionVerifyView',
    'AuthenticatedOnlineAdmissionApplyView',
    'CustomDocxTemplateViewSet',
    'DocumentTemplateViewSet',
]
