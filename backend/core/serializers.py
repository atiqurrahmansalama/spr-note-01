from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Student, StudentDailyReport

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # টোকেনের ভেতরে পেলোড হিসেবে তথ্য যোগ করা
        token['username'] = user.username
        token['role'] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # রেসপন্স বডিতে ইউজারের বিস্তারিত তথ্য পাঠানো
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': self.user.role,
        }
        return data

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class StudentDailyReportSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.name')
    student_group = serializers.ReadOnlyField(source='student.group')
    creator_username = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = StudentDailyReport
        fields = '__all__'