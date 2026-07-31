from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.db import models

from .models import Student, StudentDailyReport, User
from .serializers import StudentSerializer, StudentDailyReportSerializer, CustomTokenObtainPairSerializer

# 🎯 কাস্টম লগইন ভিউ
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(is_active=True).order_by('name')
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

class StudentDailyReportViewSet(viewsets.ModelViewSet):
    serializer_class = StudentDailyReportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        # 1. SUPER_ADMIN (Owner): All Data
        if user.role == User.Role.SUPER_ADMIN or user.is_superuser:
            return StudentDailyReport.objects.all().order_by('-created_at')

        base_qs = StudentDailyReport.objects.filter(is_deleted=False)

        # 2. PRINCIPAL: Self + Subordinates
        if user.role == User.Role.PRINCIPAL:
            subordinates = User.objects.filter(models.Q(parent=user) | models.Q(parent__parent=user))
            allowed_users = [user] + list(subordinates)
            return base_qs.filter(created_by__in=allowed_users).order_by('-created_at')

        # 3. HEAD_TEACHER: Self + Subordinate Teachers
        if user.role == User.Role.HEAD_TEACHER:
            subordinates = User.objects.filter(parent=user)
            allowed_users = [user] + list(subordinates)
            return base_qs.filter(created_by__in=allowed_users).order_by('-created_at')

        # 4. TEACHER: Own Reports Only
        return base_qs.filter(created_by=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)