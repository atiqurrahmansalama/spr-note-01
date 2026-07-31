from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # 🎯 ৪টি স্তরের রোল অপশন
    ROLE_CHOICES = (
        ("SUPER_ADMIN", "Super Admin (Owner)"),
        ("PRINCIPAL", "Principal"),
        ("HEAD_TEACHER", "Head Teacher"),
        ("TEACHER", "Teacher"),
    )

    role = models.CharField(
        max_length=20, 
        choices=ROLE_CHOICES, 
        default="TEACHER"
    )
    
    parent = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='subordinates',
        help_text="Superior user/manager in hierarchy"
    )
    is_active_user = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)

    groups = models.ManyToManyField('auth.Group', related_name='custom_user_set', blank=True)
    user_permissions = models.ManyToManyField('auth.Permission', related_name='custom_user_permissions_set', blank=True)

    def __str__(self):
        return f"{self.username} [{self.get_role_display()}]"


# 🎯 2. Permanent Student Database Table
class Student(models.Model):
    name = models.CharField(max_length=255)
    group = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.group}"


# 🎯 3. Student Daily Hifz Report Table
class StudentDailyReport(models.Model):
    student = models.ForeignKey(
        Student, 
        on_delete=models.CASCADE, 
        related_name='daily_reports'
    )
    
    juz_and_pages = models.JSONField(default=list, blank=True)
    session_name = models.CharField(max_length=100, null=True, blank=True)
    mistakes = models.JSONField(default=list, blank=True)
    stucks = models.JSONField(default=list, blank=True)
    comment = models.TextField(null=True, blank=True)

    # Tracking & Security Metadata
    created_by = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='created_reports'
    )
    report_date = models.DateField()
    is_locked = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def student_name(self):
        return self.student.name

    @property
    def student_group(self):
        return self.student.group

    def __str__(self):
        return f"{self.student.name} - {self.report_date} (By: {self.created_by.username})"