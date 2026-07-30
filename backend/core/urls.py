from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentViewSet, HifzReportViewSet

router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'reports', HifzReportViewSet, basename='hifzreport')

urlpatterns = [
    path('', include(router.urls)),
]