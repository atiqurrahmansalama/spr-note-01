from rest_framework import viewsets
from rest_framework.permissions import AllowAny # ডেভেলপমেন্টের সুবিধার্থে আপাতত AllowAny দেওয়া হলো
from .models import Student, HifzReport
from .serializers import StudentSerializer, HifzReportSerializer

class StudentViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows students to be viewed or edited.
    """
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [AllowAny]


class HifzReportViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Hifz reports to be viewed or edited.
    """
    queryset = HifzReport.objects.all()
    serializer_class = HifzReportSerializer
    permission_classes = [AllowAny]