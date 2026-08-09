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
    RegisterView,
    ChangePasswordView,
    LogLoginView,
    LogActivityView,
    UserActivitySummaryView,
    HeartbeatView,
    UserActivityAnalyticsView,
    VerifyReportView,
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'groups', StudentGroupViewSet, basename='group')
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'messages', SavedMessageViewSet, basename='message')
router.register(r'reports', StudentDailyReportViewSet, basename='report')

urlpatterns = [
    # OpenAPI 3.0 Documentation Endpoints
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Verification endpoint
    path('api/v1/hifz/verify-report/<str:report_id>/', VerifyReportView.as_view(), name='verify_report'),
    path('hifz/verify-report/<str:report_id>/', VerifyReportView.as_view(), name='verify_report_legacy'),

    # Architecture endpoints
    path('api/v1/auth/heartbeat/', HeartbeatView.as_view(), name='heartbeat'),
    path('auth/heartbeat/', HeartbeatView.as_view(), name='heartbeat_legacy'),
    path('api/v1/analytics/user-activity/', UserActivityAnalyticsView.as_view(), name='user_activity_analytics'),
    path('analytics/user-activity/', UserActivityAnalyticsView.as_view(), name='user_activity_analytics_legacy'),

    # Existing auth & activity endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair_legacy'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh_legacy'),
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('api/register/', RegisterView.as_view(), name='auth_register_legacy'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('api/change-password/', ChangePasswordView.as_view(), name='change_password_legacy'),
    path('activity/log-login/', LogLoginView.as_view(), name='activity_log_login'),
    path('api/activity/log-login/', LogLoginView.as_view(), name='activity_log_login_legacy'),
    path('activity/log-status/', LogActivityView.as_view(), name='activity_log_status'),
    path('api/activity/log-status/', LogActivityView.as_view(), name='activity_log_status_legacy'),
    path('activity/user-summary/', UserActivitySummaryView.as_view(), name='user_activity_summary'),
    path('api/activity/user-summary/', UserActivitySummaryView.as_view(), name='user_activity_summary_legacy'),
    path('api/', include(router.urls)),
    path('', include(router.urls)),
]