from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from .views import (
    StudentViewSet, 
    StudentGroupViewSet,
    SessionViewSet,
    SavedMessageViewSet,
    StudentDailyReportViewSet, 
    CustomTokenObtainPairView,
    GoogleOAuthExchangeView,
    RegisterView,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    LogoutView,
    UserSessionsView,
    RevokeSessionView,
    ChangePasswordView,
    LogLoginView,
    LogActivityView,
    UserActivitySummaryView,
    HeartbeatView,
    UserActivityAnalyticsView,
    VerifyReportView,
    UserProfileView,
    UserSessionView,
    LogoutAllOtherSessionsView,
    UserViewSet,
    UserNotificationPreferenceView,
    Toggle2FAView,
    GenerateBackupCodesView,
    DeactivateAccountView,
    DeleteAccountView,
    EvaluatedConfigView,
    ControlPanelRulesView,
    ControlPanelBatchUpdateView,
    ControlPanelResetRulesView,
    ControlPanelAuditLogView,
    UserRoleListCreateView,
    UserRoleDetailView,
    UserRoleCloneView,
    SecurityAuditLogView,
    VerifySessionView,
    QRGenerateView,
    QRStatusView,
    QRAuthorizeView,
    PasskeysListView,
    PasskeyDeleteView,
    PasskeyRegisterOptionsView,
    PasskeyRegisterVerifyView,
    GoogleLinkView,
    GoogleUnlinkView,
    Setup2FAView,
    Enable2FAView,
    Disable2FAView,
    Verify2FAView,
    SetGoogleDefaultRoleAdminView,
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'groups', StudentGroupViewSet, basename='group')
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'messages', SavedMessageViewSet, basename='message')
router.register(r'reports', StudentDailyReportViewSet, basename='report')
router.register(r'users', UserViewSet, basename='user')

from django.http import JsonResponse

def root_health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Suffah Hifz Management System API",
        "version": "1.0.0"
    })

urlpatterns = [
    # Root Health Check
    path('health/', root_health_check, name='health_check'),

    # OpenAPI 3.0 Documentation Endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Control Panel & Feature Flagging Endpoints
    path('api/v1/section-control/evaluate/', EvaluatedConfigView.as_view(), name='section_control_evaluate'),
    path('api/v1/admin/section-control/update/', ControlPanelBatchUpdateView.as_view(), name='admin_section_control_update'),
    path('api/v1/control-panel/evaluated-config/', EvaluatedConfigView.as_view(), name='control_panel_evaluated_config'),
    path('api/v1/control-panel/rules/', ControlPanelRulesView.as_view(), name='control_panel_rules'),
    path('api/v1/control-panel/rules/batch-update/', ControlPanelBatchUpdateView.as_view(), name='control_panel_batch_update'),
    path('api/v1/control-panel/rules/reset/', ControlPanelResetRulesView.as_view(), name='control_panel_reset'),
    path('api/v1/control-panel/audit-logs/', ControlPanelAuditLogView.as_view(), name='control_panel_audit_logs'),

    # Dynamic Role Management Endpoints
    path('api/v1/admin/roles/', UserRoleListCreateView.as_view(), name='admin_role_list_create'),
    path('api/v1/admin/roles/clone/', UserRoleCloneView.as_view(), name='admin_role_clone'),
    path('api/v1/admin/roles/set-google-default/', SetGoogleDefaultRoleAdminView.as_view(), name='admin_role_set_google_default'),
    path('api/v1/roles/', UserRoleListCreateView.as_view(), name='role_list_create'),
    path('roles/', UserRoleListCreateView.as_view(), name='role_list_create_legacy'),
    path('api/v1/roles/<int:pk>/', UserRoleDetailView.as_view(), name='role_detail'),
    path('roles/<int:pk>/', UserRoleDetailView.as_view(), name='role_detail_legacy'),
    path('api/v1/roles/<int:pk>/clone/', UserRoleCloneView.as_view(), name='role_clone'),
    path('roles/<int:pk>/clone/', UserRoleCloneView.as_view(), name='role_clone_legacy'),

    # Profile & Security Endpoints
    path('api/v1/user/profile/', UserProfileView.as_view(), name='user_profile'),
    path('api/v1/user/sessions/', UserSessionView.as_view(), name='user_sessions'),
    path('api/v1/user/sessions/logout-others/', LogoutAllOtherSessionsView.as_view(), name='user_sessions_logout_others'),
    path('api/v1/user/notification-preferences/', UserNotificationPreferenceView.as_view(), name='user_notification_preferences'),
    path('api/v1/user/2fa/toggle/', Toggle2FAView.as_view(), name='user_2fa_toggle'),
    path('api/v1/user/2fa/generate-backup-codes/', GenerateBackupCodesView.as_view(), name='user_2fa_backup_codes'),
    path('api/v1/user/deactivate/', DeactivateAccountView.as_view(), name='user_deactivate'),
    path('api/v1/user/delete/', DeleteAccountView.as_view(), name='user_delete'),


    # Verification endpoint
    path('api/v1/hifz/verify-report/<str:report_id>/', VerifyReportView.as_view(), name='verify_report'),
    path('hifz/verify-report/<str:report_id>/', VerifyReportView.as_view(), name='verify_report_legacy'),

    # Architecture endpoints
    path('api/v1/auth/heartbeat/', HeartbeatView.as_view(), name='heartbeat'),
    path('auth/heartbeat/', HeartbeatView.as_view(), name='heartbeat_legacy'),
    path('api/v1/analytics/user-activity/', UserActivityAnalyticsView.as_view(), name='user_activity_analytics'),
    path('analytics/user-activity/', UserActivityAnalyticsView.as_view(), name='user_activity_analytics_legacy'),

    # IAM & Enterprise Authentication Endpoints
    path('api/v1/auth/google/', GoogleOAuthExchangeView.as_view(), name='auth_google'),
    path('auth/google/', GoogleOAuthExchangeView.as_view(), name='auth_google_legacy'),
    path('api/v1/auth/register/', RegisterView.as_view(), name='auth_register_v1'),
    path('api/v1/auth/verify-email/', VerifyEmailView.as_view(), name='auth_verify_email'),
    path('api/v1/auth/resend-verification/', ResendVerificationView.as_view(), name='auth_resend_verification'),
    path('api/v1/auth/password-reset/', PasswordResetRequestView.as_view(), name='auth_password_reset'),
    path('api/v1/auth/password-reset-confirm/', PasswordResetConfirmView.as_view(), name='auth_password_reset_confirm'),
    path('api/v1/auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('api/v1/auth/sessions/', UserSessionsView.as_view(), name='auth_sessions'),
    path('api/v1/auth/sessions/revoke/', RevokeSessionView.as_view(), name='auth_revoke_session'),
    path('api/v1/auth/security-logs/', SecurityAuditLogView.as_view(), name='auth_security_logs_v1'),
    path('api/v1/auth/profile/', UserProfileView.as_view(), name='auth_profile_v1'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh_v1'),

    # IAM & Security Suite Endpoints
    path('api/v1/auth/accounts/verify-session/', VerifySessionView.as_view(), name='auth_verify_session'),
    path('api/v1/auth/qr/generate/', QRGenerateView.as_view(), name='auth_qr_generate'),
    path('api/v1/auth/qr/status/<uuid:ticket_id>/', QRStatusView.as_view(), name='auth_qr_status'),
    path('api/v1/auth/qr/authorize/', QRAuthorizeView.as_view(), name='auth_qr_authorize'),
    path('api/v1/auth/passkeys/', PasskeysListView.as_view(), name='auth_passkeys_list'),
    path('api/v1/auth/passkeys/<int:pk>/', PasskeyDeleteView.as_view(), name='auth_passkey_delete'),
    path('api/v1/auth/passkeys/register-options/', PasskeyRegisterOptionsView.as_view(), name='auth_passkey_register_options'),
    path('api/v1/auth/passkeys/register-verify/', PasskeyRegisterVerifyView.as_view(), name='auth_passkey_register_verify'),
    path('api/v1/auth/google/link/', GoogleLinkView.as_view(), name='auth_google_link'),
    path('api/v1/auth/google/unlink/', GoogleUnlinkView.as_view(), name='auth_google_unlink'),
    path('api/v1/auth/2fa/setup/', Setup2FAView.as_view(), name='auth_2fa_setup'),
    path('api/v1/auth/2fa/enable/', Enable2FAView.as_view(), name='auth_2fa_enable'),
    path('api/v1/auth/2fa/disable/', Disable2FAView.as_view(), name='auth_2fa_disable'),
    path('api/v1/auth/2fa/verify/', Verify2FAView.as_view(), name='auth_2fa_verify'),

    # Existing auth & activity endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_legacy'),
    path('api/v1/auth/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_v1'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh_legacy'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('api/register/', RegisterView.as_view(), name='auth_register_legacy'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('api/change-password/', ChangePasswordView.as_view(), name='change_password_legacy'),
    path('api/v1/auth/change-password/', ChangePasswordView.as_view(), name='auth_change_password_v1'),
    path('activity/log-login/', LogLoginView.as_view(), name='activity_log_login'),
    path('api/activity/log-login/', LogLoginView.as_view(), name='activity_log_login_legacy'),
    path('activity/log-status/', LogActivityView.as_view(), name='activity_log_status'),
    path('api/activity/log-status/', LogActivityView.as_view(), name='activity_log_status_legacy'),
    path('activity/user-summary/', UserActivitySummaryView.as_view(), name='user_activity_summary'),
    path('api/v1/', include(router.urls)),
    path('api/', include(router.urls)),
    path('', include(router.urls)),
]