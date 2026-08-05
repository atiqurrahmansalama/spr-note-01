from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    StudentViewSet, 
    StudentGroupViewSet,
    SessionViewSet,
    SavedMessageViewSet,
    StudentDailyReportViewSet, 
    MistakeDetailViewSet,
    StuckDetailViewSet,
    CustomTokenObtainPairView,
    RegisterView,
    ChangePasswordView
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'groups', StudentGroupViewSet, basename='group')
router.register(r'sessions', SessionViewSet, basename='session')
router.register(r'messages', SavedMessageViewSet, basename='message')
router.register(r'reports', StudentDailyReportViewSet, basename='report')
router.register(r'mistakes', MistakeDetailViewSet, basename='mistake')
router.register(r'stucks', StuckDetailViewSet, basename='stuck')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    path('api/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('', include(router.urls)),
]