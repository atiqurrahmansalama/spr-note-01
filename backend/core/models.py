from django.db import models
from django.db.models import Max
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid


class CustomUserManager(BaseUserManager):
    def create_user(self, phone_number, password=None, **extra_fields):
        if not phone_number:
            raise ValueError('The Phone Number field must be set')
        phone_number = str(phone_number).strip()
        extra_fields.setdefault('is_active', True)
        user = self.model(phone_number=phone_number, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, phone_number, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'SUPER_ADMIN')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
        return self.create_user(phone_number, password, **extra_fields)


class UserRole(models.Model):
    COLOR_THEME_CHOICES = (
        ('emerald', 'Emerald'),
        ('blue', 'Blue'),
        ('purple', 'Purple'),
        ('amber', 'Amber'),
        ('rose', 'Rose'),
        ('cyan', 'Cyan'),
    )

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default='')
    hierarchy_level = models.PositiveIntegerField(default=50)
    color_theme = models.CharField(max_length=30, default='blue', choices=COLOR_THEME_CHOICES)
    is_system_role = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['hierarchy_level', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class RoleActionPermission(models.Model):
    role = models.OneToOneField(UserRole, on_delete=models.CASCADE, related_name='action_permissions')
    can_create_student = models.BooleanField(default=True)
    can_edit_student = models.BooleanField(default=True)
    can_delete_report = models.BooleanField(default=False)
    can_export_reports = models.BooleanField(default=True)
    can_manage_users = models.BooleanField(default=False)

    def __str__(self):
        return f"Permissions for {self.role.code}"


class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('SUPER_ADMIN', 'Super Admin'),
        ('ADMIN', 'Admin / Nazim'),
        ('TEACHER', 'Teacher / Ustadh'),
        ('GUARDIAN', 'Guardian / Parent'),
        ('STAFF', 'Staff / Accountant'),
    )
    AUTH_PROVIDER_CHOICES = (
        ('email', 'Email/Password'),
        ('google', 'Google OAuth2'),
    )

    username = None  # Phone number is primary credential
    phone_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    name = models.CharField(max_length=150, null=True, blank=True)
    name_bn = models.CharField(max_length=150, null=True, blank=True)
    avatar_url = models.TextField(null=True, blank=True)

    is_email_verified = models.BooleanField(default=False)
    auth_provider = models.CharField(max_length=20, default='email', choices=AUTH_PROVIDER_CHOICES)
    google_sub_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    assigned_group = models.CharField(max_length=100, null=True, blank=True)
    user_type = models.CharField(
        max_length=50,
        choices=USER_TYPE_CHOICES,
        default='TEACHER'
    )
    role = models.ForeignKey(
        UserRole,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='users'
    )
    is_active = models.BooleanField(default=True)
    is_deactivated = models.BooleanField(default=False)
    deactivated_at = models.DateTimeField(null=True, blank=True)

    # Legacy fields & hierarchy
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

    # IAM & Security Suite Fields
    is_2fa_enabled = models.BooleanField(default=False)
    totp_secret = models.CharField(max_length=255, null=True, blank=True)
    backup_codes = models.JSONField(default=list, blank=True)
    google_sub_id = models.CharField(max_length=255, null=True, blank=True, unique=True)

    groups = models.ManyToManyField('auth.Group', related_name='custom_user_set', blank=True)
    user_permissions = models.ManyToManyField('auth.Permission', related_name='custom_user_permissions_set', blank=True)

    USERNAME_FIELD = 'phone_number'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def save(self, *args, **kwargs):
        if self.role and self.role.code:
            self.user_type = self.role.code
        if self.first_name or self.last_name:
            self.name = f"{self.first_name or ''} {self.last_name or ''}".strip()
        elif self.name:
            parts = self.name.strip().split(' ', 1)
            self.first_name = parts[0]
            self.last_name = parts[1] if len(parts) > 1 else ''
        super().save(*args, **kwargs)

    @property
    def role_code(self):
        if self.role:
            return self.role.code
        return self.user_type

    @property
    def unique_key(self):
        return f"USR-{self.id:04d}" if self.id else "USR-0000"

    @property
    def formatted_created_at(self):
        if self.date_joined:
            return self.date_joined.strftime("%Y-%m-%d %I:%M %p")
        return "--"

    @property
    def total_lifetime_activity(self):
        activity_logs = getattr(self, 'activity_logs', None)
        login_logs = getattr(self, 'login_logs', None)

        logs = list(activity_logs.order_by('timestamp')) if activity_logs else []
        if not logs and login_logs:
            logs = list(login_logs.order_by('timestamp'))
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

    def __str__(self):
        user_id = self.phone_number or self.email or f"User #{self.id}"
        user_type_display = self.get_user_type_display() if hasattr(self, 'get_user_type_display') else self.user_type
        return f"{user_id} [{user_type_display}]"


def default_email_verification_expiry():
    return timezone.now() + timezone.timedelta(hours=24)


def default_password_reset_expiry():
    return timezone.now() + timezone.timedelta(hours=1)


class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_email_verification_expiry)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Verification Token for {self.user.phone_number or self.user.email} ({self.token})"

    @property
    def is_valid(self):
        return timezone.now() <= self.expires_at


class PasswordResetToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='password_reset_tokens')
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=default_password_reset_expiry)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Reset Token for {self.user.phone_number or self.user.email} ({self.token})"

    @property
    def is_valid(self):
        return not self.is_used and timezone.now() <= self.expires_at


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    refresh_token_jti = models.CharField(max_length=255, unique=True, null=True, blank=True)
    device_type = models.CharField(max_length=50, default='Desktop')
    device_info = models.CharField(max_length=255, null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    login_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    logout_at = models.DateTimeField(null=True, blank=True)
    total_duration_minutes = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-last_activity']
        verbose_name = "User Session"
        verbose_name_plural = "User Sessions"

    def save(self, *args, **kwargs):
        if self.login_at:
            end_time = self.logout_at or timezone.now()
            duration = end_time - self.login_at
            self.total_duration_minutes = max(0, int(duration.total_seconds() // 60))
        super().save(*args, **kwargs)

    def __str__(self):
        user_identifier = self.user.phone_number or self.user.email if self.user else "Unknown User"
        return f"Session {user_identifier} [{self.device_type}] ({self.ip_address or 'Local'})"


# 🎯 2. Teacher Profile Table
class TeacherProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='teacher_profile'
    )
    name_bn = models.CharField(max_length=100, null=True, blank=True)
    name_en = models.CharField(max_length=100, null=True, blank=True)
    designation = models.CharField(max_length=100, null=True, blank=True)
    address = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Teacher: {self.name_en or self.user.phone_number}"


# 🎯 3. Guardian Profile Table
class GuardianProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='guardian_profile'
    )
    name_bn = models.CharField(max_length=100, null=True, blank=True)
    name_en = models.CharField(max_length=100, null=True, blank=True)
    students = models.ManyToManyField(
        'Student',
        related_name='guardians',
        blank=True
    )

    def __str__(self):
        return f"Guardian: {self.name_en or self.user.phone_number}"


# 🎯 3b. User Device Table (For Push Notifications)
class UserDevice(models.Model):
    DEVICE_TYPE_CHOICES = (
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web'),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='devices'
    )
    device_token = models.TextField()
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPE_CHOICES)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.phone_number} [{self.device_type}]"


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
        return f"{self.user.phone_number} - {self.status} at {self.timestamp}"


class UserActivityLog(models.Model):
    STATUS_CHOICES = (
        ("ACTIVE", "Active"),
        ("INACTIVE", "Inactive"),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="legacy_activity_logs")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.phone_number} - {self.status} at {self.timestamp}"





# 🎯 User Activity Log Architecture Model
class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
    action_name = models.CharField(max_length=100)
    endpoint = models.CharField(max_length=255)
    http_method = models.CharField(max_length=10)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"

    def __str__(self):
        user_str = self.user.phone_number if self.user else "Anonymous"
        return f"{user_str} - {self.action_name} ({self.http_method} {self.endpoint})"


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


# 🎯 4. Student Table (Main Table)
class Student(models.Model):
    uniq_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    roll_number = models.IntegerField(null=True, blank=True)
    name_en = models.CharField(max_length=150, null=True, blank=True)
    group_name = models.CharField(max_length=50, null=True, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, null=True, blank=True, default='Active')
    education_status = models.CharField(max_length=50, null=True, blank=True)
    target_status = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.uniq_id or not str(self.uniq_id).strip():
            self.uniq_id = f"STU-{uuid.uuid4().hex[:8].upper()}"

        if not self.group_name or not str(self.group_name).strip():
            self.group_name = "General Group"

        if not self.name_en or not str(self.name_en).strip():
            self.name_en = "Unnamed Student"

        if not self.roll_number or self.roll_number <= 0:
            max_roll = Student.objects.filter(group_name=self.group_name).aggregate(Max('roll_number'))['roll_number__max'] or 0
            self.roll_number = max_roll + 1

        super().save(*args, **kwargs)

    # ── Backward compatibility properties ────────────────────────
    @property
    def name(self):
        return self.name_en or ""

    @name.setter
    def name(self, val):
        self.name_en = val

    @property
    def roll(self):
        return self.roll_number or 0

    @roll.setter
    def roll(self, val):
        self.roll_number = val

    @property
    def unique_id(self):
        return self.uniq_id or ""

    @unique_id.setter
    def unique_id(self, val):
        self.uniq_id = val

    @property
    def is_active(self):
        return self.status == 'Active' if self.status else True

    @is_active.setter
    def is_active(self, val):
        self.status = 'Active' if val else 'Inactive'

    @property
    def group(self):
        return self.group_name or ""

    def __str__(self):
        return f"[{self.roll_number or '--'}] {self.name_en or 'Unnamed'} ({self.group_name or 'No Group'})"


# 🎯 4b. Student Detail Table (One-to-One Child Table)
class StudentDetail(models.Model):
    student = models.OneToOneField(
        Student,
        on_delete=models.CASCADE,
        related_name='details'
    )
    name_bn = models.CharField(max_length=150, null=True, blank=True)
    photo = models.URLField(max_length=500, null=True, blank=True)
    category = models.CharField(max_length=50, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=5, null=True, blank=True)
    father_name = models.CharField(max_length=100, null=True, blank=True)
    mother_name = models.CharField(max_length=100, null=True, blank=True)
    guardian_name = models.CharField(max_length=100, null=True, blank=True)
    guardian_relation = models.CharField(max_length=50, null=True, blank=True)
    guardian_phone = models.CharField(max_length=20, null=True, blank=True)
    emergency_phone = models.CharField(max_length=20, null=True, blank=True)
    cur_address = models.TextField(null=True, blank=True)
    per_address = models.TextField(null=True, blank=True)
    initial_completed_juz = models.IntegerField(default=0, null=True, blank=True)


    def __str__(self):
        return f"Details for Student {self.student.uniq_id or self.student.id}"


from django.utils import timezone

# 🎯 5. Student Daily Report Table
class StudentDailyReport(models.Model):
    STATUS_CHOICES = [
        ('Completed', 'Completed'),
        ('Unprepared', 'Unprepared'),
        ('Absent', 'Absent'),
    ]

    report_unique_id = models.CharField(max_length=100, unique=True, blank=True)
    date = models.DateTimeField(
        default=timezone.now,
        verbose_name="Report Date",
        help_text="Timezone-adjusted report date/time"
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='daily_reports'
    )
    student_name = models.CharField(max_length=255, blank=True)
    session_name = models.CharField(max_length=100, null=True, blank=True)
    total_page = models.FloatField(
        default=0.0,
        verbose_name="Total Pages",
        help_text="Total pages covered in this session"
    )
    total_mistake = models.IntegerField(default=0)
    total_stuck = models.IntegerField(default=0)
    comment = models.TextField(null=True, blank=True)
    juz_and_pages = models.JSONField(default=list, blank=True)

    # New normalized fields (added in schema v2)
    score = models.CharField(max_length=10, null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES,
        null=True, blank=True, default='Completed'
    )
    teacher_id = models.IntegerField(null=True, blank=True)

    # Tracking & Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_reports'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Generate Date",
        help_text="Server timestamp when report was first generated"
    )
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

    # ── Convenience shortcuts via ReportStatus ───────────────
    @property
    def report_status(self):
        return getattr(self, 'status_info', None)

    @property
    def is_edited(self):
        status_obj = getattr(self, 'status_info', None)
        return status_obj.is_edited if status_obj else False

    @property
    def edited_at(self):
        status_obj = getattr(self, 'status_info', None)
        return status_obj.edit_time if status_obj else None

    @property
    def is_locked(self):
        status_obj = getattr(self, 'status_info', None)
        return status_obj.is_locked if status_obj else False

    @property
    def is_deleted(self):
        status_obj = getattr(self, 'status_info', None)
        return status_obj.is_deleted if status_obj else False

    def __str__(self):
        return f"{self.report_unique_id} - {self.student_name} ({self.date})"


# NOTE: MistakeDetail & StuckDetail have been removed (migrated to ReportErrorDetail).
# Legacy data was backfilled in migration 0005. The serializer computes
# `mistake_details` and `stuck_details` as filtered views over ReportErrorDetail.


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎯 8. Report Portion Table (NORMALIZED — replaces juz_and_pages JSON)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ReportPortion(models.Model):
    """Normalized child table storing Juz/Page recitation ranges per report."""
    report = models.ForeignKey(
        StudentDailyReport,
        on_delete=models.CASCADE,
        related_name='portions'
    )
    start_juz = models.IntegerField()
    start_page = models.IntegerField()
    start_surah_number = models.IntegerField(null=True, blank=True)
    start_ayah = models.IntegerField(default=1)
    end_juz = models.IntegerField()
    end_page = models.IntegerField()
    end_surah_number = models.IntegerField(null=True, blank=True)
    end_ayah = models.IntegerField(default=1)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return (
            f"Report {self.report.report_unique_id}: "
            f"Juz {self.start_juz} P{self.start_page} "
            f"→ Juz {self.end_juz} P{self.end_page}"
        )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎯 9. Report Error Detail Table (NORMALIZED — unified Mistake + Stuck)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ReportErrorDetail(models.Model):
    """Unified normalized table for both Mistakes and Stucks (Lukmah)."""
    TYPE_CHOICES = [
        ('Mistake', 'Mistake'),
        ('Stuck', 'Stuck'),
    ]

    report = models.ForeignKey(
        StudentDailyReport,
        on_delete=models.CASCADE,
        related_name='error_details'
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    juz = models.IntegerField()
    page = models.IntegerField()
    surah_number = models.IntegerField(null=True, blank=True)
    ayah = models.IntegerField(default=1)

    class Meta:
        ordering = ['type', 'juz', 'page']

    def __str__(self):
        return (
            f"Report {self.report.report_unique_id} [{self.type}]: "
            f"Juz {self.juz}, Page {self.page}, Ayah {self.ayah}"
        )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 🎯 10. Report Status Table
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
class ReportStatus(models.Model):
    """
    One-to-one status tracker for StudentDailyReport.
    Each boolean flag auto-stamps a datetime when it first becomes True.
    """
    report = models.OneToOneField(
        StudentDailyReport,
        on_delete=models.CASCADE,
        related_name='status_info',
        verbose_name="Report"
    )

    # ―― Edited ――――――――――――――――――――――――――――――――――――――――――――
    is_edited = models.BooleanField(
        default=False,
        verbose_name="Is Edited"
    )
    edit_time = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Edit Time",
        help_text="Auto-set when is_edited becomes True"
    )

    # ―― Locked ――――――――――――――――――――――――――――――――――――――――――――
    is_locked = models.BooleanField(
        default=False,
        verbose_name="Is Locked"
    )
    lock_time = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Lock Time",
        help_text="Auto-set when is_locked becomes True"
    )

    # ―― Deleted ――――――――――――――――――――――――――――――――――――――――――――
    is_deleted = models.BooleanField(
        default=False,
        verbose_name="Is Deleted"
    )
    delete_time = models.DateTimeField(
        null=True, blank=True,
        verbose_name="Delete Time",
        help_text="Auto-set when is_deleted becomes True"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Report Status"
        verbose_name_plural = "Report Statuses"

    def save(self, *args, **kwargs):
        now = timezone.now()

        # Auto-stamp edit_time when is_edited first becomes True
        if self.is_edited and not self.edit_time:
            self.edit_time = now

        # Auto-stamp lock_time when is_locked first becomes True
        if self.is_locked and not self.lock_time:
            self.lock_time = now

        # Auto-stamp delete_time when is_deleted first becomes True
        if self.is_deleted and not self.delete_time:
            self.delete_time = now

        super().save(*args, **kwargs)

    def __str__(self):
        flags = []
        if self.is_edited:  flags.append("Edited")
        if self.is_locked:  flags.append("Locked")
        if self.is_deleted:  flags.append("Deleted")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        return f"Status for Report #{self.report_id}{flag_str}"


class UserNotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preference')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)

    def __str__(self):
        return f"Notification Preferences for {self.user}"


class UserSecurity(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='security')
    is_2fa_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, null=True, blank=True)
    backup_codes = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Security for {self.user}"


# ─── Granular Feature Flagging & Access Control Models ───────────────────────

class AppSectionCategory(models.Model):
    key = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=150)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'title']
        verbose_name_plural = "App Section Categories"

    def __str__(self):
        return f"{self.title} ({self.key})"


class AppSection(models.Model):
    category = models.ForeignKey(AppSectionCategory, on_delete=models.CASCADE, related_name='sections')
    section_key = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    is_globally_enabled = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['category__order', 'order', 'title']

    def __str__(self):
        return f"{self.title} [{self.section_key}] (Global: {self.is_globally_enabled})"


class RoleSectionPermission(models.Model):
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='role_permissions')
    role = models.CharField(max_length=50, choices=User.USER_TYPE_CHOICES)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('section', 'role')

    def __str__(self):
        return f"Role [{self.role}] -> {self.section.section_key}: {self.is_enabled}"


class GroupSectionPermission(models.Model):
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='group_permissions')
    group_id = models.CharField(max_length=100)
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('section', 'group_id')

    def __str__(self):
        return f"Group [{self.group_id}] -> {self.section.section_key}: {self.is_enabled}"


class UserSectionOverride(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='section_overrides')
    section = models.ForeignKey(AppSection, on_delete=models.CASCADE, related_name='user_overrides')
    is_enabled = models.BooleanField(default=True)

    class Meta:
        unique_together = ('user', 'section')

    def __str__(self):
        return f"User [{self.user.phone_number or self.user.id}] -> {self.section.section_key}: {self.is_enabled}"


class FeatureFlagAuditLog(models.Model):
    SCOPE_TYPE_CHOICES = (
        ('GLOBAL', 'Global Default'),
        ('ROLE', 'Role Permission'),
        ('GROUP', 'Group Permission'),
        ('USER', 'User Override'),
    )

    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    scope_type = models.CharField(max_length=20, choices=SCOPE_TYPE_CHOICES)
    target_identifier = models.CharField(max_length=150)
    section_key = models.CharField(max_length=100)
    previous_state = models.BooleanField()
    new_state = models.BooleanField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"AuditLog [{self.scope_type} - {self.target_identifier}] {self.section_key}: {self.previous_state} -> {self.new_state}"


class UserPasskey(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='passkeys')
    credential_id = models.CharField(max_length=512, unique=True)
    public_key = models.TextField()
    sign_count = models.IntegerField(default=0)
    device_name = models.CharField(max_length=255, default='Security Key')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Passkey [{self.device_name}] for User #{self.user_id}"


class QRSessionTicket(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('authorized', 'Authorized'),
        ('expired', 'Expired'),
    )

    ticket_id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    authorized_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.CASCADE, related_name='qr_tickets')
    access_token = models.TextField(null=True, blank=True)
    refresh_token = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        return self.status == 'pending' and timezone.now() < self.expires_at

    def __str__(self):
        return f"QRTicket [{self.ticket_id}] - {self.status}"