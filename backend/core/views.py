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
    StuckDetail,
    UserLoginLog,
    UserActivityLog
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
    StuckDetailSerializer,
    UserLoginLogSerializer,
    UserActivityLogSerializer,
    UserActivitySummarySerializer
)


User = get_user_model()

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            username_or_email = request.data.get("username", "")
            try:
                if "@" in username_or_email:
                    user_obj = User.objects.get(email=username_or_email)
                else:
                    user_obj = User.objects.get(username=username_or_email)
                
                ip = request.META.get('REMOTE_ADDR')
                country = request.data.get('country', '--')
                city = request.data.get('city', '--')

                UserLoginLog.objects.create(
                    user=user_obj,
                    status="LOGIN",
                    ip_address=ip,
                    country=country or "--",
                    city=city or "--"
                )
                UserActivityLog.objects.create(user=user_obj, status="ACTIVE")
            except User.DoesNotExist:
                pass
        return response

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

from rest_framework.pagination import PageNumberPagination

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 500

class StudentDailyReportViewSet(viewsets.ModelViewSet):
    queryset = StudentDailyReport.objects.filter(is_deleted=False).order_by('-created_at')
    serializer_class = StudentDailyReportSerializer
    permission_classes = [AllowAny]
    pagination_class = StandardResultsSetPagination

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


class LogLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        status_val = request.data.get("status", "LOGIN").upper()
        if status_val not in ["LOGIN", "LOGOUT"]:
            status_val = "LOGIN"

        user_obj = request.user if request.user.is_authenticated else None
        username = request.data.get("username")
        if not user_obj and username:
            try:
                user_obj = User.objects.get(username=username)
            except User.DoesNotExist:
                user_obj = None

        if not user_obj:
            return Response({"detail": "User not identified"}, status=status.HTTP_400_BAD_REQUEST)

        ip = request.META.get('REMOTE_ADDR')
        country = request.data.get('country', '--')
        city = request.data.get('city', '--')

        log = UserLoginLog.objects.create(
            user=user_obj,
            status=status_val,
            ip_address=ip,
            country=country or "--",
            city=city or "--"
        )
        return Response({"status": "logged", "log_id": log.id}, status=status.HTTP_200_OK)


class LogActivityView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        status_val = request.data.get("status", "ACTIVE").upper()
        if status_val not in ["ACTIVE", "INACTIVE"]:
            status_val = "ACTIVE"

        user_obj = request.user if request.user.is_authenticated else None
        username = request.data.get("username")
        if not user_obj and username:
            try:
                user_obj = User.objects.get(username=username)
            except User.DoesNotExist:
                user_obj = None

        if not user_obj:
            return Response({"detail": "User not identified"}, status=status.HTTP_400_BAD_REQUEST)

        log = UserActivityLog.objects.create(
            user=user_obj,
            status=status_val
        )
        return Response({"status": "logged", "log_id": log.id}, status=status.HTTP_200_OK)


class UserActivitySummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            user_obj = request.user
        else:
            username = request.query_params.get("username")
            if username:
                try:
                    user_obj = User.objects.get(username=username)
                except User.DoesNotExist:
                    user_obj = User.objects.first()
            else:
                user_obj = User.objects.first()

        if not user_obj:
            return Response({"detail": "No users found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UserActivitySummarySerializer(user_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)