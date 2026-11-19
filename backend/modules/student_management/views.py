"""
Student Management Views & ViewSets.
"""
from core.views.students import (
    StudentViewSet,
    AdmissionInviteTokenViewSet,
    PublicAdmissionVerifyView,
    AuthenticatedOnlineAdmissionApplyView,
)
from core.views.reports import (
    DocumentTemplateViewSet,
)
from core.views.templates import (
    CustomDocxTemplateViewSet,
    SavedMessageViewSet,
)

__all__ = [
    'StudentViewSet',
    'AdmissionInviteTokenViewSet',
    'PublicAdmissionVerifyView',
    'AuthenticatedOnlineAdmissionApplyView',
    'CustomDocxTemplateViewSet',
    'DocumentTemplateViewSet',
    'SavedMessageViewSet',
]
