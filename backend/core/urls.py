from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import StudentViewSet, StudentDailyReportViewSet, CustomTokenObtainPairView

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'reports', StudentDailyReportViewSet, basename='report')

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # 🔑 Authentication Endpoints (.as_view() ব্যবহার করা হয়েছে)
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    path('', include(router.urls)),
]