"""
System Control Domain Models.
Re-exported from core domain models for module encapsulation while maintaining
100% database schema compatibility (app_label='core', db_table='core_...').
"""
from core.models.approvals import (
    ApprovalRequest,
    ApprovalActionLog,
)
from core.models.system import (
    AppSectionCategory,
    AppSection,
    RoleSectionPermission,
    GroupSectionPermission,
    AcademySectionOverride,
    AcademyRoleSectionOverride,
    UserSectionOverride,
    FeatureFlagAuditLog,
    SystemSetting,
    AuditLog,
    FeatureUsageSummary,
    DataMutationOutbox,
    AppRelease,
)

__all__ = [
    'ApprovalRequest',
    'ApprovalActionLog',
    'AppSectionCategory',
    'AppSection',
    'RoleSectionPermission',
    'GroupSectionPermission',
    'AcademySectionOverride',
    'AcademyRoleSectionOverride',
    'UserSectionOverride',
    'FeatureFlagAuditLog',
    'SystemSetting',
    'AuditLog',
    'FeatureUsageSummary',
    'DataMutationOutbox',
    'AppRelease',
]
