"""
System Control Module Routing Table.
Provides RESTful endpoints for 4-tier section governance, system diagnostics,
immutable audit logs, approvals, backups, replication, compliance, and app releases.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import (
    ApprovalRequestViewSet,
    AuditLogViewSet,
    AppReleaseViewSet,
    EvaluatedConfigView,
    SectionControlVersionView,
    ControlPanelSectionTreeView,
    ControlPanelBatchUpdateView,
    ResetUserOverridesView,
    ClearSectionOverridesView,
    ControlPanelRulesView,
    ControlPanelAuditLogView,
    SystemHealthDiagnosticsView,
    EnterpriseComplianceDataExportView,
    EnterpriseCompliancePurgeView,
    EmailTemplateCatalogView,
    EmailTemplateRenderView,
    EmailTemplateTestSendView,
    AppVersionCheckView,
    DashboardWorkspaceConfigView,
    VectorPDFExportAPIView,
    BackupStatusView,
    BackupHistoryListView,
    DownloadFullBackupView,
    CreateBackupArchiveView,
    DownloadNamedBackupView,
    DeleteBackupArchiveView,
    RestoreNamedBackupView,
    RestoreFullBackupView,
    FeatureAnalyticsView,
    ArchiveActivityLogsView,
    BackupScheduleSettingsView,
    TestCloudStorageView,
    TenantInstitutionListView,
    TenantBackupExportView,
    TenantBackupRestoreView,
    ReplicationStatusView,
    ReplicationSyncNowView,
)

router = SimpleRouter()
router.register(r'approvals', ApprovalRequestViewSet, basename='system-approvals')
router.register(r'audit-logs', AuditLogViewSet, basename='system-audit-logs')
router.register(r'releases', AppReleaseViewSet, basename='system-releases')

urlpatterns = [
    # 4-Tier Feature Flagging & Section Governance
    path('section-control/evaluate/', EvaluatedConfigView.as_view(), name='system_section_control_evaluate'),
    path('section-control/version/', SectionControlVersionView.as_view(), name='system_section_control_version'),
    path('admin/section-control/tree/', ControlPanelSectionTreeView.as_view(), name='system_admin_section_control_tree'),
    path('admin/section-control/update/', ControlPanelBatchUpdateView.as_view(), name='system_admin_section_control_update'),
    path('admin/section-control/override/', ControlPanelBatchUpdateView.as_view(), name='system_admin_section_control_override'),
    path('admin/section-control/reset-user-overrides/', ResetUserOverridesView.as_view(), name='system_admin_reset_user_overrides'),
    path('admin/section-control/clear-overrides/', ClearSectionOverridesView.as_view(), name='system_admin_clear_overrides'),
    path('control-panel/evaluated-config/', EvaluatedConfigView.as_view(), name='system_control_panel_evaluated_config'),
    path('control-panel/rules/', ControlPanelRulesView.as_view(), name='system_control_panel_rules'),
    path('control-panel/rules/batch-update/', ControlPanelBatchUpdateView.as_view(), name='system_control_panel_batch_update'),
    path('control-panel/audit-logs/', ControlPanelAuditLogView.as_view(), name='system_control_panel_audit_logs'),

    # APM Observability & Compliance
    path('health/', SystemHealthDiagnosticsView.as_view(), name='system_health_diagnostics'),
    path('compliance/export/', EnterpriseComplianceDataExportView.as_view(), name='system_compliance_export'),
    path('compliance/purge/', EnterpriseCompliancePurgeView.as_view(), name='system_compliance_purge'),

    # Document Export Suite
    path('export/vector-pdf/', VectorPDFExportAPIView.as_view(), name='system_export_vector_pdf'),

    # Backup & Disaster Recovery Suite
    path('backup/status/', BackupStatusView.as_view(), name='system_backup_status'),
    path('backup/history/', BackupHistoryListView.as_view(), name='system_backup_history'),
    path('backup/download-full/', DownloadFullBackupView.as_view(), name='system_backup_download_full'),
    path('backup/create/', CreateBackupArchiveView.as_view(), name='system_backup_create_archive'),
    path('backup/download/<str:archive_name>/', DownloadNamedBackupView.as_view(), name='system_backup_download_named'),
    path('backup/delete/', DeleteBackupArchiveView.as_view(), name='system_backup_delete_archive'),
    path('backup/restore-named/', RestoreNamedBackupView.as_view(), name='system_backup_restore_named'),
    path('backup/restore-full/', RestoreFullBackupView.as_view(), name='system_backup_restore_full'),
    path('backup/feature-analytics/', FeatureAnalyticsView.as_view(), name='system_backup_feature_analytics'),
    path('backup/archive-logs/', ArchiveActivityLogsView.as_view(), name='system_backup_archive_logs'),
    path('backup/schedule-settings/', BackupScheduleSettingsView.as_view(), name='system_backup_schedule_settings'),
    path('backup/test-cloud/', TestCloudStorageView.as_view(), name='system_backup_test_cloud'),
    path('backup/institutions/', TenantInstitutionListView.as_view(), name='system_backup_institutions'),
    path('backup/tenant-export/', TenantBackupExportView.as_view(), name='system_backup_tenant_export'),
    path('backup/tenant-restore/', TenantBackupRestoreView.as_view(), name='system_backup_tenant_restore'),
    path('replication/status/', ReplicationStatusView.as_view(), name='system_replication_status'),
    path('replication/sync-now/', ReplicationSyncNowView.as_view(), name='system_replication_sync_now'),

    # Email Templates & Version Handshake
    path('email-templates/', EmailTemplateCatalogView.as_view(), name='system_email_templates_catalog'),
    path('email-templates/render/', EmailTemplateRenderView.as_view(), name='system_email_templates_render'),
    path('email-templates/send-test/', EmailTemplateTestSendView.as_view(), name='system_email_templates_send_test'),
    path('version/', AppVersionCheckView.as_view(), name='system_version_check'),
    path('dashboard/config/', DashboardWorkspaceConfigView.as_view(), name='system_dashboard_workspace_config'),

    # ViewSet routes
    path('', include(router.urls)),
]
