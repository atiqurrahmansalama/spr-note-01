from rest_framework import serializers
from .models import Student, HifzReport

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ['id', 'full_name', 'roll_number', 'guardian_phone', 'admission_date', 'created_at']
        read_only_fields = ['id', 'admission_date', 'created_at']

class HifzReportSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)

    class Meta:
        model = HifzReport
        fields = [
            'id', 'student', 'student_name', 'report_date', 
            'sabak_para', 'sabak_lines', 'sabak_mistakes', 
            'sabak_dhor', 'amukhta_dhor', 'grade', 'remarks', 
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']