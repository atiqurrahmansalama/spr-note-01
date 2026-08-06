from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
import uuid

class User(AbstractUser):
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

    @property
    def unique_key(self):
        return f"USR-{self.id:04d}"

    @property
    def formatted_created_at(self):
        if self.date_joined:
            return self.date_joined.strftime("%Y-%m-%d %I:%M %p")
        return "--"

    @property
    def total_lifetime_activity(self):
        logs = list(self.activity_logs.order_by('timestamp'))
        if not logs:
            logs = list(self.login_logs.order_by('timestamp'))
            if not logs:
                return "--"

        total_seconds = 0
        active_start = None

        for log in logs:
            status = log.status.upper()
            if status in ["ACTIVE", "LOGIN"]:
                if active_start is None:
                    active_start = log.timestamp
            elif status in ["INACTIVE", "LOGOUT"]:
                if active_start is not None:
                    delta = (log.timestamp - active_start).total_seconds()
                    if delta > 0:
                        total_seconds += delta
                    active_start = None

        if active_start is not None:
            delta = (timezone.now() - active_start).total_seconds()
            if delta > 0:
                total_seconds += delta

        if total_seconds <= 0:
            return "--"

        days = int(total_seconds // 86400)
        hours = int((total_seconds % 86400) // 3600)
        minutes = int((total_seconds % 3600) // 60)

        parts = []
        if days > 0:
            parts.append(f"{days} Day{'s' if days > 1 else ''}")
        if hours > 0:
            parts.append(f"{hours} Hr{'s' if hours > 1 else ''}")
        if minutes > 0 or not parts:
            parts.append(f"{minutes} Min{'s' if minutes > 1 else ''}")

        return ", ".join(parts)


# 🎯 User Activity & Login Tracking Tables
class UserLoginLog(models.Model):
    STATUS_CHOICES = (
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="login_logs")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True, default="--")
    city = models.CharField(max_length=100, null=True, blank=True, default="--")

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.status} at {self.timestamp}"


class UserActivityLog(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activity_logs")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.username} - {self.status} at {self.timestamp}"


# 🎯 1. Group Table
class StudentGroup(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# 🎯 2. Session Table
class Session(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# 🎯 3. Template Message Table
class SavedMessage(models.Model):
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text[:30]


# 🎯 4. Student Table
class Student(models.Model):
    roll = models.IntegerField(default=1)
    unique_id = models.CharField(max_length=100, unique=True, blank=True)
    name = models.CharField(max_length=255)
    group_name = models.CharField(max_length=255, default="General Group")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.unique_id:
            self.unique_id = f"STU-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def group(self):
        return self.group_name

    def __str__(self):
        return f"[{self.roll}] {self.name} ({self.group_name})"


from django.utils import timezone

# 🎯 5. Student Daily Report Table
class StudentDailyReport(models.Model):
    report_unique_id = models.CharField(max_length=100, unique=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    student = models.ForeignKey(
        Student, 
        on_delete=models.CASCADE, 
        related_name='daily_reports'
    )
    student_name = models.CharField(max_length=255, blank=True)
    session_name = models.CharField(max_length=100, null=True, blank=True)
    total_mistake = models.IntegerField(default=0)
    total_stuck = models.IntegerField(default=0)
    comment = models.TextField(null=True, blank=True)
    juz_and_pages = models.JSONField(default=list, blank=True)

    # Tracking & Metadata
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='created_reports'
    )
    is_locked = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.report_unique_id:
            self.report_unique_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
        if self.student and not self.student_name:
            self.student_name = self.student.name
        super().save(*args, **kwargs)

    @property
    def student_group(self):
        return self.student.group_name if self.student else ""

    def __str__(self):
        return f"{self.report_unique_id} - {self.student_name} ({self.date})"


# 🎯 6. Mistake Detail Table
class MistakeDetail(models.Model):
    report = models.ForeignKey(
        StudentDailyReport, 
        on_delete=models.CASCADE, 
        related_name='mistake_details'
    )
    juz = models.CharField(max_length=50, blank=True, default="")
    page = models.CharField(max_length=50, blank=True, default="")
    ayah = models.CharField(max_length=50, blank=True, default="")

    def __str__(self):
        return f"Report {self.report.report_unique_id} - Mistake: Juz {self.juz}, Page {self.page}, Ayah {self.ayah}"


# 🎯 7. Stuck Detail Table
class StuckDetail(models.Model):
    report = models.ForeignKey(
        StudentDailyReport, 
        on_delete=models.CASCADE, 
        related_name='stuck_details'
    )
    juz = models.CharField(max_length=50, blank=True, default="")
    page = models.CharField(max_length=50, blank=True, default="")
    ayah = models.CharField(max_length=50, blank=True, default="")

    def __str__(self):
        return f"Report {self.report.report_unique_id} - Stuck: Juz {self.juz}, Page {self.page}, Ayah {self.ayah}"