"""
Student Management Serializers.
"""
from core.serializers.students import (
    StudentSerializer,
    StudentDetailSerializer,
    StudentAcademicHistorySerializer,
    StudentTransferAcademicSerializer,
    StudentGuardianSerializer,
    StudentAcademicDetailSerializer,
    StudentDocumentSerializer,
    StudentAdmissionSerializer,
    StudentFullProfileSerializer,
    AdmissionInviteTokenSerializer,
    PublicAdmissionVerifySerializer,
)
from core.serializers.reports import (
    DocumentTemplateConfigSerializer,
    DocumentTemplateConfigSerializer as DocumentTemplateSerializer,
)
from core.serializers.templates import (
    SavedMessageSerializer,
    CustomDocxTemplateSerializer,
)

__all__ = [
    'StudentSerializer',
    'StudentDetailSerializer',
    'StudentAcademicHistorySerializer',
    'StudentTransferAcademicSerializer',
    'StudentGuardianSerializer',
    'StudentAcademicDetailSerializer',
    'StudentDocumentSerializer',
    'StudentAdmissionSerializer',
    'StudentFullProfileSerializer',
    'AdmissionInviteTokenSerializer',
    'PublicAdmissionVerifySerializer',
    'SavedMessageSerializer',
    'CustomDocxTemplateSerializer',
    'DocumentTemplateConfigSerializer',
    'DocumentTemplateSerializer',
]
