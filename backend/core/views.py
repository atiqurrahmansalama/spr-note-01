from rest_framework import viewsets, status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from .models import (
    Student, 
    StudentGroup, 
    Session, 
    SavedMessage, 
    StudentDailyReport, 
    MistakeDetail, 
    StuckDetail
)
from .serializers import (
    CustomTokenObtainPairSerializer, 
    RegisterSerializer, 
    ChangePasswordSerializer,
    StudentSerializer, 
    StudentGroupSerializer,
    SessionSerializer,
    SavedMessageSerializer,
    StudentDailyReportSerializer,
    MistakeDetailSerializer,
    StuckDetailSerializer
)


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            if not user.check_password(serializer.data.get("old_password")):
                return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(serializer.data.get("new_password"))
            user.save()
            return Response({"status": "Password updated successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.filter(is_active=True).order_by('roll', 'name')
    serializer_class = StudentSerializer
    permission_classes = [AllowAny]

class StudentGroupViewSet(viewsets.ModelViewSet):
    queryset = StudentGroup.objects.all().order_by('name')
    serializer_class = StudentGroupSerializer
    permission_classes = [AllowAny]

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all().order_by('id')
    serializer_class = SessionSerializer
    permission_classes = [AllowAny]

class SavedMessageViewSet(viewsets.ModelViewSet):
    queryset = SavedMessage.objects.all().order_by('-created_at')
    serializer_class = SavedMessageSerializer
    permission_classes = [AllowAny]

class StudentDailyReportViewSet(viewsets.ModelViewSet):
    queryset = StudentDailyReport.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = StudentDailyReportSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(created_by=user)

class MistakeDetailViewSet(viewsets.ModelViewSet):
    queryset = MistakeDetail.objects.all().order_by('-id')
    serializer_class = MistakeDetailSerializer
    permission_classes = [AllowAny]

class StuckDetailViewSet(viewsets.ModelViewSet):
    queryset = StuckDetail.objects.all().order_by('-id')
    serializer_class = StuckDetailSerializer
    permission_classes = [AllowAny]