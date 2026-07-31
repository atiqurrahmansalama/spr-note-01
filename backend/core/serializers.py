from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Student, StudentDailyReport, Session

User = get_user_model()


# Custom JWT Token Serializer (Email or Username Support + User Info)
class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        if "@" in username_or_email:
            try:
                user_obj = User.objects.get(email=username_or_email)
                attrs["username"] = user_obj.username
            except User.DoesNotExist:
                pass

        data = super().validate(attrs)
        
        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'role': getattr(self.user, 'role', 'TEACHER'),
            'date_joined': self.user.date_joined.strftime("%Y-%m-%d") if self.user.date_joined else "",
        }
        return data


# User Registration Serializer
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'first_name', 'last_name', 'role']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            role=validated_data.get('role', 'TEACHER')
        )
        return user


# Change Password Serializer
class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'


class StudentDailyReportSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.name')
    student_group = serializers.ReadOnlyField(source='student.group')
    creator_username = serializers.ReadOnlyField(source='created_by.username')

    student = serializers.SlugRelatedField(
        slug_field='name',
        queryset=Student.objects.all()
    )

    class Meta:
        model = StudentDailyReport
        fields = '__all__'
        read_only_fields = ['created_by']

    def to_internal_value(self, data):
        student_data = data.get('student')
        
        if student_data and isinstance(student_data, str):
            clean_name = student_data.strip()
            group_data = data.get('subject_course', 'General Group')
            
            student_obj, _ = Student.objects.get_or_create(
                name=clean_name,
                defaults={'group': group_data}
            )
            
            mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
            mutable_data['student'] = student_obj.name
            return super().to_internal_value(mutable_data)
            
        return super().to_internal_value(data)


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'
        