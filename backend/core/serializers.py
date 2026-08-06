from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.utils import timezone
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

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        if username_or_email and "@" in username_or_email:
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


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)


class StudentGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentGroup
        fields = '__all__'

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'group_name' in mutable_data and 'name' not in mutable_data:
            mutable_data['name'] = mutable_data['group_name']
        return super().to_internal_value(mutable_data)


class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'


class SavedMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedMessage
        fields = '__all__'

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'comment' in mutable_data and 'text' not in mutable_data:
            mutable_data['text'] = mutable_data['comment']
        return super().to_internal_value(mutable_data)


class StudentSerializer(serializers.ModelSerializer):
    group = serializers.CharField(source='group_name', required=False)

    class Meta:
        model = Student
        fields = ['id', 'roll', 'unique_id', 'name', 'group_name', 'group', 'is_active', 'created_at']

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)
        if 'label' in mutable_data and 'name' not in mutable_data:
            mutable_data['name'] = mutable_data['label']
        if 'sub' in mutable_data and 'group_name' not in mutable_data:
            mutable_data['group_name'] = mutable_data['sub']
        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        group_val = validated_data.pop('group', None) or self.initial_data.get('group') or validated_data.get('group_name') or 'General Group'
        validated_data['group_name'] = group_val
        if 'roll' not in validated_data:
            validated_data['roll'] = Student.objects.count() + 1
        return super().create(validated_data)

    def update(self, instance, validated_data):
        group_val = validated_data.pop('group', None) or self.initial_data.get('group')
        if group_val:
            instance.group_name = group_val
        return super().update(instance, validated_data)


class MistakeDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = MistakeDetail
        fields = ['id', 'juz', 'page', 'ayah']


class StuckDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StuckDetail
        fields = ['id', 'juz', 'page', 'ayah']


class StudentDailyReportSerializer(serializers.ModelSerializer):
    mistake_details = MistakeDetailSerializer(many=True, read_only=True)
    stuck_details = StuckDetailSerializer(many=True, read_only=True)
    student_details = StudentSerializer(source='student', read_only=True)
    student_name = serializers.CharField(required=False, allow_blank=True)
    student_group = serializers.CharField(source='student.group_name', read_only=True)
    date = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", required=False)
    student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all(), required=False, allow_null=True)
    created_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S", read_only=True)
    date_time = serializers.SerializerMethodField()

    class Meta:
        model = StudentDailyReport
        fields = [
            'id', 'report_unique_id', 'date', 'date_time', 'student', 'student_name', 'student_group', 
            'student_details', 'session_name', 'total_mistake', 'total_stuck', 
            'comment', 'juz_and_pages', 'mistake_details', 'stuck_details',
            'created_by', 'is_locked', 'is_deleted', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_by', 'report_unique_id']

    def get_date_time(self, obj):
        if obj.date:
            return obj.date.strftime("%Y-%m-%d %I:%M:%S %p")
        if obj.created_at:
            return obj.created_at.strftime("%Y-%m-%d %I:%M:%S %p")
        return ""

    def to_internal_value(self, data):
        mutable_data = data.copy() if hasattr(data, 'copy') else dict(data)

        # Date & Time mapping
        date_val = mutable_data.get('report_date') or mutable_data.get('date')
        if date_val:
            if isinstance(date_val, str):
                if 'T' in date_val or ' ' in date_val:
                    mutable_data['date'] = date_val
                else:
                    now_time = timezone.now().time()
                    mutable_data['date'] = f"{date_val} {now_time.strftime('%H:%M:%S')}"
        else:
            mutable_data['date'] = timezone.now()

        # Session mapping
        if 'session_name' not in mutable_data and 'session' in mutable_data:
            mutable_data['session_name'] = mutable_data['session']

        # Student mapping (string name or pk)
        student_input = mutable_data.get('student') or mutable_data.get('student_name')
        if student_input:
            if isinstance(student_input, int):
                pass
            elif isinstance(student_input, str) and student_input.isdigit():
                mutable_data['student'] = int(student_input)
            elif isinstance(student_input, str):
                name_clean = student_input.strip()
                group_val = mutable_data.get('subject_course') or mutable_data.get('group_name') or 'General Group'
                student_obj, _ = Student.objects.get_or_create(
                    name=name_clean,
                    defaults={
                        'group_name': group_val,
                        'roll': Student.objects.count() + 1
                    }
                )
                mutable_data['student'] = student_obj.pk
                mutable_data['student_name'] = student_obj.name

        return super().to_internal_value(mutable_data)

    def create(self, validated_data):
        mistakes_input = self.initial_data.get('mistake_details') or self.initial_data.get('mistakes') or []
        stucks_input = self.initial_data.get('stuck_details') or self.initial_data.get('stucks') or []

        student_obj = validated_data.get('student')
        if student_obj and not validated_data.get('student_name'):
            validated_data['student_name'] = student_obj.name

        report = StudentDailyReport.objects.create(**validated_data)

        # Parse mistake entries into MistakeDetail Foreign Key instances
        tot_mistakes = 0
        for item in mistakes_input:
            if isinstance(item, dict):
                juz = str(item.get('juz', '')).strip()
                page = str(item.get('page', '')).strip()
                ayahs = item.get('ayahs', [])
                if isinstance(ayahs, list) and len(ayahs) > 0:
                    for a in ayahs:
                        val = (a.get('value') or a.get('ayah') or '') if isinstance(a, dict) else str(a)
                        val = str(val).strip()
                        if val or juz or page:
                            MistakeDetail.objects.create(report=report, juz=juz, page=page, ayah=val)
                            tot_mistakes += 1
                else:
                    line_val = str(item.get('line') or item.get('ayah') or '').strip()
                    if juz or page or line_val:
                        MistakeDetail.objects.create(report=report, juz=juz, page=page, ayah=line_val)
                        tot_mistakes += 1

        # Parse stuck entries into StuckDetail Foreign Key instances
        tot_stucks = 0
        for item in stucks_input:
            if isinstance(item, dict):
                juz = str(item.get('juz', '')).strip()
                page = str(item.get('page', '')).strip()
                ayahs = item.get('ayahs', [])
                if isinstance(ayahs, list) and len(ayahs) > 0:
                    for a in ayahs:
                        val = (a.get('value') or a.get('ayah') or '') if isinstance(a, dict) else str(a)
                        val = str(val).strip()
                        if val or juz or page:
                            StuckDetail.objects.create(report=report, juz=juz, page=page, ayah=val)
                            tot_stucks += 1
                else:
                    line_val = str(item.get('line') or item.get('ayah') or '').strip()
                    if juz or page or line_val:
                        StuckDetail.objects.create(report=report, juz=juz, page=page, ayah=line_val)
                        tot_stucks += 1

        report.total_mistake = tot_mistakes
        report.total_stuck = tot_stucks
        report.save(update_fields=['total_mistake', 'total_stuck'])

        return report


class UserLoginLogSerializer(serializers.ModelSerializer):
    timestamp_formatted = serializers.SerializerMethodField()

    class Meta:
        model = UserLoginLog
        fields = ['id', 'status', 'timestamp', 'timestamp_formatted', 'ip_address', 'country', 'city']

    def get_timestamp_formatted(self, obj):
        if obj.timestamp:
            return obj.timestamp.strftime("%Y-%m-%d %I:%M %p")
        return "--"


class UserActivityLogSerializer(serializers.ModelSerializer):
    timestamp_formatted = serializers.SerializerMethodField()

    class Meta:
        model = UserActivityLog
        fields = ['id', 'status', 'timestamp', 'timestamp_formatted']

    def get_timestamp_formatted(self, obj):
        if obj.timestamp:
            return obj.timestamp.strftime("%Y-%m-%d %I:%M %p")
        return "--"


class UserActivitySummarySerializer(serializers.ModelSerializer):
    unique_key = serializers.ReadOnlyField()
    formatted_created_at = serializers.ReadOnlyField()
    total_lifetime_activity = serializers.ReadOnlyField()
    recent_login_logs = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 
            'unique_key', 
            'username', 
            'email', 
            'role', 
            'formatted_created_at', 
            'total_lifetime_activity',
            'recent_login_logs'
        ]

    def get_recent_login_logs(self, obj):
        recent = obj.login_logs.all()[:5]
        return UserLoginLogSerializer(recent, many=True).data