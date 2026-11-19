"""
Student Management Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.students import (
    Student,
    StudentDetail,
    StudentAcademicHistory,
    StudentAcademicDetail,
    StudentGuardian,
    StudentDocument,
    AdmissionInviteToken,
)
from core.models.templates import (
    SavedMessage,
    CustomDocxTemplate,
)

__all__ = [
    'Student',
    'StudentDetail',
    'StudentAcademicHistory',
    'StudentAcademicDetail',
    'StudentGuardian',
    'StudentDocument',
    'AdmissionInviteToken',
    'SavedMessage',
    'CustomDocxTemplate',
]
