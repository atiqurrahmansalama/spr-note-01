from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

# 🟢 সব ViewSet ও View একসাথে সুন্দরভাবে ইমপোর্ট
from .views import (
    StudentViewSet, 
    StudentDailyReportViewSet, 
    SessionViewSet,
    CustomTokenObtainPairView,
    RegisterView,
    ChangePasswordView
)

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'reports', StudentDailyReportViewSet, basename='report')
router.register(r'sessions', SessionViewSet, basename='session') # 👈 এখানে একবারই থাকবে

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    path('api/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('', include(router.urls)), # 💡 'api/' প্রিফিক্স দেওয়া ভালো অথবা আপনার প্রোজেক্ট অনুযায়ী শুধু '' রাখতে পারেন
]