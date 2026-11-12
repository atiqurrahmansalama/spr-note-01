"""
Enterprise System Domain Views Package
Decomposed from monolithic system.py into single-responsibility modular views:
- activity: User logins, heartbeats, user activity tracking and time analytics
- section_control: 4-tier feature control evaluation, versioning, tree, and atomic batch updates
- diagnostics: System APM health diagnostics and immutable audit logs
- compliance: GDPR/SOC2 compliance export and tenant data purge
- email_templates: Transactional HTML email template catalog, preview, and test sender
- releases: Version check and multi-platform application release manager
- workspace: Institutional default workspace dashboard widget layout presets
"""

# 1. User Activity & Session Analytics
from .activity import (
    LogLoginView,
    LogActivityView,
    UserActivitySummaryView,
    HeartbeatView,
    UserActivityAnalyticsView,
)

# 2. 4-Tier Feature Control & Module Governance
from .section_control import (
    EvaluatedConfigView,
    ResetUserOverridesView,
    ControlPanelRulesView,
    ControlPanelSectionTreeView,
    SectionControlVersionView,
    ControlPanelBatchUpdateView,
    ClearSectionOverridesView,
    ControlPanelResetRulesView,
    ControlPanelAuditLogView,
)

# 3. Observability & System Diagnostics
from .diagnostics import (
    AuditLogViewSet,
    SystemHealthDiagnosticsView,
)

# 4. Compliance & Privacy Vault
from .compliance import (
    EnterpriseComplianceDataExportView,
    EnterpriseCompliancePurgeView,
)

# 5. Transactional Email Templates
from .email_templates import (
    EmailTemplateCatalogView,
    EmailTemplateRenderView,
    EmailTemplateTestSendView,
)

# 6. Release Management & SemVer Engine
from .releases import (
    parse_semver,
    compare_semver,
    AppVersionCheckView,
    AppReleaseViewSet,
)

# 7. Dashboard Workspace Config
from .workspace import (
    DashboardWorkspaceConfigView,
)

__all__ = [
    # Activity
    'LogLoginView',
    'LogActivityView',
    'UserActivitySummaryView',
    'HeartbeatView',
    'UserActivityAnalyticsView',

    # Section Control
    'EvaluatedConfigView',
    'ResetUserOverridesView',
    'ControlPanelRulesView',
    'ControlPanelSectionTreeView',
    'SectionControlVersionView',
    'ControlPanelBatchUpdateView',
    'ClearSectionOverridesView',
    'ControlPanelResetRulesView',
    'ControlPanelAuditLogView',

    # Diagnostics
    'AuditLogViewSet',
    'SystemHealthDiagnosticsView',

    # Compliance
    'EnterpriseComplianceDataExportView',
    'EnterpriseCompliancePurgeView',

    # Email Templates
    'EmailTemplateCatalogView',
    'EmailTemplateRenderView',
    'EmailTemplateTestSendView',

    # Releases
    'parse_semver',
    'compare_semver',
    'AppVersionCheckView',
    'AppReleaseViewSet',

    # Workspace
    'DashboardWorkspaceConfigView',
]

