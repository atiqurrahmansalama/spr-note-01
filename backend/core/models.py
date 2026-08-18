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
    hierarchy_level = models.PositiveIntegerField(default=5)
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


class AcademicInstitution(models.Model):
    INSTITUTION_TYPE_CHOICES = (
        ('MADRASA', 'Madrasa / Maktab'),
        ('SCHOOL', 'General School'),
        ('COLLEGE', 'College'),
        ('COACHING', 'Coaching / Academy'),
        ('OTHER', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    bangla_name = models.CharField(max_length=250, blank=True, default='')
    slug = models.SlugField(unique=True, max_length=100, db_index=True)
    institution_type = models.CharField(
        max_length=50,
        choices=INSTITUTION_TYPE_CHOICES,
        default='MADRASA'
    )
    eiin_or_reg_no = models.CharField(max_length=100, blank=True, default='')
    logo_url = models.URLField(blank=True, null=True)
    logo_data = models.TextField(blank=True, default='')  # SVG or Base64 Image/PDF preview data
    phone = models.CharField(max_length=30, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    division = models.CharField(max_length=100, blank=True, default='')
    district = models.CharField(max_length=100, blank=True, default='')
    upazila_thana = models.CharField(max_length=100, blank=True, default='')
    post_code = models.CharField(max_length=20, blank=True, default='')
    street_address = models.TextField(blank=True, default='')
    is_verified = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Academic Institution"
        verbose_name_plural = "Academic Institutions"

    def __str__(self):
        return f"{self.name} ({self.slug})"


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

    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='members'
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
        elif self.user_type:
            role_obj = UserRole.objects.filter(code__iexact=self.user_type).first()
            if role_obj:
                self.role = role_obj
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


# 🎯 0. Address Table
class Address(models.Model):
    ADDRESS_TYPE_CHOICES = (
        ('PRESENT', 'Present Address'),
        ('PERMANENT', 'Permanent Address'),
        ('OFFICE', 'Office/Work Address'),
    )
    address_type = models.CharField(max_length=20, choices=ADDRESS_TYPE_CHOICES)
    street_address = models.CharField(max_length=255, blank=True, null=True)
    post_office = models.CharField(max_length=100, blank=True, null=True)
    post_code = models.CharField(max_length=20, blank=True, null=True)
    thana_or_upazila = models.CharField(max_length=100, blank=True, null=True)
    district = models.CharField(max_length=100, blank=True, null=True)
    division = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='Bangladesh')
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='created_addresses'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        parts = [self.street_address, self.thana_or_upazila, self.district]
        return ", ".join([p for p in parts if p]) or f"Address #{self.id}"


# 🎯 0a. Department Table
class AcademicDepartment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='departments'
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, blank=True)
    department_head = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='headed_departments'
    )
    has_quran_tracker = models.BooleanField(
        default=False,
        help_text="Enable 30 Juz Quran evaluation for classes under this department"
    )
    order_rank = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order_rank', 'name']
        verbose_name = "Academic Department"
        verbose_name_plural = "Academic Departments"

    def __str__(self):
        return f"{self.name} ({self.code})" if self.code else self.name


# 🎯 0b. Class / Grade Table
class StudentClass(models.Model):
    DEPARTMENT_CHOICES = (
        ('HIFZ', 'Hifz'),
        ('GENERAL', 'General'),
        ('OTHER', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='classes'
    )
    department = models.ForeignKey(
        AcademicDepartment,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='classes'
    )
    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50, blank=True)
    department_type = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES, default='HIFZ')
    class_teacher = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_classes'
    )
    order_rank = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order_rank', 'name']
        verbose_name = "Student Class"
        verbose_name_plural = "Student Classes"

    def save(self, *args, **kwargs):
        if self.department:
            if not self.institution and self.department.institution:
                self.institution = self.department.institution
            if self.department.has_quran_tracker:
                self.department_type = 'HIFZ'
            elif self.department.code and 'GEN' in self.department.code.upper():
                self.department_type = 'GENERAL'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})" if self.code else self.name


# 🎯 1. Group Table
class StudentGroup(models.Model):
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='groups'
    )
    student_class = models.ForeignKey(
        StudentClass,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='groups'
    )
    name = models.CharField(max_length=150)
    mentor_teacher = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mentored_groups'
    )
    capacity = models.PositiveIntegerField(default=20, help_text="0 for unlimited")
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_groups'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Student Group"
        verbose_name_plural = "Student Groups"

    def save(self, *args, **kwargs):
        if not self.institution:
            if self.student_class and self.student_class.institution:
                self.institution = self.student_class.institution
            elif self.created_by and self.created_by.institution:
                self.institution = self.created_by.institution
        super().save(*args, **kwargs)

    def __str__(self):
        class_name = self.student_class.name if self.student_class else "No Class"
        return f"{self.name} [{class_name}]"


# 🎯 2. Session Table
class Session(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_sessions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# 🎯 3. Template Message Table
class SavedMessage(models.Model):
    text = models.TextField()
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_messages'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.text[:30]


# 🎯 4. Student Table (Main Table)
class Student(models.Model):
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='students'
    )
    uniq_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    roll_number = models.IntegerField(null=True, blank=True)
    name_en = models.CharField(max_length=150, null=True, blank=True)
    student_class = models.ForeignKey(
        StudentClass,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    student_group = models.ForeignKey(
        StudentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    group_name = models.CharField(max_length=50, null=True, blank=True)
    admission_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=30, null=True, blank=True, default='Active')
    education_status = models.CharField(max_length=50, null=True, blank=True)
    target_status = models.CharField(max_length=100, null=True, blank=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_students'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Extended fields
    name = models.CharField(max_length=255, blank=True, null=True)
    bangla_name = models.CharField(max_length=255, blank=True, null=True)
    student_id_card_number = models.CharField(max_length=64, blank=True, null=True)
    gender = models.CharField(max_length=20, choices=[('MALE', 'Male'), ('FEMALE', 'Female'), ('OTHER', 'Other')], default='MALE')
    dob = models.DateField(null=True, blank=True)
    blood_group = models.CharField(max_length=10, choices=[
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('O+', 'O+'), ('O-', 'O-'),
        ('AB+', 'AB+'), ('AB-', 'AB-')
    ], blank=True, null=True)
    birth_certificate_no = models.CharField(max_length=64, blank=True, null=True)
    nid_no = models.CharField(max_length=64, blank=True, null=True)
    photo = models.ImageField(upload_to='students/photos/', blank=True, null=True)
    present_address = models.ForeignKey('Address', related_name='student_present_addresses', on_delete=models.SET_NULL, null=True, blank=True)
    permanent_address = models.ForeignKey('Address', related_name='student_permanent_addresses', on_delete=models.SET_NULL, null=True, blank=True)
    admission_mode = models.CharField(max_length=20, choices=[('QUICK', 'Quick Admission'), ('FULL', 'Full Institutional')], default='QUICK')

    def save(self, *args, **kwargs):
        if self.name and not self.name_en:
            self.name_en = self.name
        elif self.name_en and not self.name:
            self.name = self.name_en

        if not self.uniq_id or not str(self.uniq_id).strip():
            self.uniq_id = f"STU-{uuid.uuid4().hex[:8].upper()}"

        if not self.student_id_card_number:
            self.student_id_card_number = self.uniq_id

        if not self.institution:
            if self.student_class and self.student_class.institution:
                self.institution = self.student_class.institution
            elif self.student_group and self.student_group.institution:
                self.institution = self.student_group.institution
            elif self.created_by and self.created_by.institution:
                self.institution = self.created_by.institution

        # ── Guardrail 2 & 3: Group & Class Auto-Sync and Backward Compatibility ──
        if self.student_group:
            self.group_name = self.student_group.name
            if self.student_group.student_class and not self.student_class:
                self.student_class = self.student_group.student_class
        elif self.group_name and str(self.group_name).strip():
            grp, _ = StudentGroup.objects.get_or_create(
                name=self.group_name.strip(),
                defaults={'created_by': self.created_by}
            )
            self.student_group = grp
            if grp.student_class and not self.student_class:
                self.student_class = grp.student_class
        else:
            self.group_name = "General Group"

        if not self.name_en or not str(self.name_en).strip():
            self.name_en = "Unnamed Student"

        if not self.roll_number or self.roll_number <= 0:
            filter_kwargs = {'group_name': self.group_name}
            if self.student_class_id:
                filter_kwargs = {'student_class_id': self.student_class_id}
            max_roll = Student.objects.filter(**filter_kwargs).aggregate(Max('roll_number'))['roll_number__max'] or 0
            self.roll_number = max_roll + 1

        is_new = self._state.adding
        super().save(*args, **kwargs)

        # Propagate student name to all linked daily reports
        try:
            self.daily_reports.all().update(student_name=self.name)
        except Exception:
            pass

        # Auto-create initial Academic History record for newly registered student
        try:
            if is_new or not self.academic_history.filter(is_current=True).exists():
                if self.student_class or self.student_group:
                    adm_date = self.admission_date or timezone.now().date()
                    StudentAcademicHistory.objects.create(
                        student=self,
                        student_class=self.student_class,
                        student_group=self.student_group,
                        start_date=adm_date,
                        is_current=True,
                        transition_reason="Initial Admission / Enrollment",
                        transferred_by=self.created_by
                    )
        except Exception:
            pass

    # ── Backward compatibility properties ────────────────────────
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
        return self.status in ['Active', 'ACTIVE'] if self.status else True

    @is_active.setter
    def is_active(self, val):
        self.status = 'ACTIVE' if val else 'INACTIVE'

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
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='created_student_details'
    )

    def __str__(self):
        return f"Details for Student {self.student.uniq_id or self.student.id}"


# 🎯 4f. Student Academic Progression History (Audit Timeline)
class StudentAcademicHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='academic_history'
    )
    student_class = models.ForeignKey(
        StudentClass,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='historical_movements'
    )
    student_group = models.ForeignKey(
        StudentGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='historical_movements'
    )
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=True)
    transition_reason = models.CharField(max_length=255, blank=True)
    transferred_by = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='initiated_student_transfers'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date', '-created_at']
        verbose_name = "Student Academic History"
        verbose_name_plural = "Student Academic Histories"

    def __str__(self):
        cls_name = self.student_class.name if self.student_class else "None"
        grp_name = self.student_group.name if self.student_group else "None"
        return f"{self.student.name_en or self.student.name} -> {cls_name} / {grp_name} ({self.start_date})"


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
        on_delete=models.CASCADE,
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
        if getattr(self, 'student_id', None) and not self.student_name:
            try:
                self.student_name = self.student.name_en or getattr(self.student, 'name', '') or 'Student'
            except Exception:
                pass
        super().save(*args, **kwargs)

    @property
    def student_group(self):
        try:
            return self.student.group_name if getattr(self, 'student_id', None) else ""
        except Exception:
            return ""

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
    is_parent = models.BooleanField(default=False, help_text="True if this is a master category menu")
    parent_key = models.CharField(max_length=100, null=True, blank=True, help_text="Key of parent section")

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


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField(default='')
    description = models.TextField(blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "System Setting"
        verbose_name_plural = "System Settings"

    def __str__(self):
        return f"{self.key} = {self.value}"

    @classmethod
    def get_val(cls, key, default=''):
        try:
            setting = cls.objects.filter(key=key).first()
            if setting and setting.value:
                return setting.value
        except Exception:
            pass
        return default

    @classmethod
    def set_val(cls, key, value, description=''):
        setting, _ = cls.objects.get_or_create(key=key)
        setting.value = str(value)
        if description:
            setting.description = description
        setting.save()
        return setting


# 🎯 4c. Student Academic Detail
class StudentAcademicDetail(models.Model):
    student = models.OneToOneField(Student, related_name='academic_detail', on_delete=models.CASCADE)
    session_year = models.CharField(max_length=32, blank=True, null=True)
    class_or_group = models.ForeignKey(StudentGroup, on_delete=models.SET_NULL, null=True, blank=True)
    roll_number = models.CharField(max_length=32, blank=True, null=True)
    admission_date = models.DateField(default=timezone.now)
    previous_school_name = models.CharField(max_length=255, blank=True, null=True)
    previous_school_address = models.CharField(max_length=255, blank=True, null=True)
    tc_number = models.CharField(max_length=64, blank=True, null=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='created_academic_details'
    )

    def __str__(self):
        return f"Academic Detail for {self.student.name_en or self.student.uniq_id}"


# 🎯 4d. Student Guardian Detail
class StudentGuardian(models.Model):
    student = models.OneToOneField(Student, related_name='guardian_detail', on_delete=models.CASCADE)
    father_name = models.CharField(max_length=255, blank=True, null=True)
    father_phone = models.CharField(max_length=32, blank=True, null=True)
    father_occupation = models.CharField(max_length=128, blank=True, null=True)
    mother_name = models.CharField(max_length=255, blank=True, null=True)
    mother_phone = models.CharField(max_length=32, blank=True, null=True)
    mother_occupation = models.CharField(max_length=128, blank=True, null=True)
    primary_guardian_name = models.CharField(max_length=255, blank=True, null=True)
    primary_guardian_phone = models.CharField(max_length=32, blank=True, null=True)
    guardian_relation = models.CharField(max_length=64, default='Father')
    guardian_nid = models.CharField(max_length=64, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=32, blank=True, null=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='created_guardians'
    )

    def __str__(self):
        return f"Guardian Detail for {self.student.name_en or self.student.uniq_id}"


# 🎯 4e. Student Documents & Attachments
class StudentDocument(models.Model):
    DOC_TYPE_CHOICES = (
        ('BIRTH_CERTIFICATE', 'Birth Certificate'),
        ('NID_CARD', 'Guardian NID'),
        ('PREVIOUS_MARKSHEET', 'Previous Marksheet'),
        ('TC', 'Transfer Certificate'),
        ('OTHER', 'Other'),
    )
    student = models.ForeignKey(Student, related_name='documents', on_delete=models.CASCADE)
    doc_type = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    file = models.FileField(upload_to='students/documents/')
    title = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='created_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_doc_type_display()} for {self.student.name_en or self.student.uniq_id}"


class RoleInviteToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=150, help_text="e.g. Hifz Teachers Batch 2026")
    target_role = models.ForeignKey(UserRole, on_delete=models.CASCADE, related_name='invite_tokens')
    max_uses = models.PositiveIntegerField(default=1, help_text="0 for unlimited uses")
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_invites')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_uses > 0 and self.used_count >= self.max_uses:
            return False
        return True

    def __str__(self):
        return f"Invite: {self.title} ({self.target_role.name})"


# ==============================================================================
# 🎯 5. ENTERPRISE TEACHER & STAFF MANAGEMENT MODELS
# ==============================================================================

class StaffProfile(models.Model):
    STAFF_TYPE_CHOICES = (
        ('TEACHING', 'Teaching Faculty'),
        ('ADMIN', 'Administrative Staff'),
        ('SUPPORT', 'Support & Operations'),
        ('FINANCE', 'Finance & Accounts'),
    )

    EMPLOYMENT_STATUS_CHOICES = (
        ('PERMANENT', 'Permanent'),
        ('PROBATION', 'Probationary'),
        ('CONTRACT', 'Contractual'),
        ('TERMINATED', 'Terminated'),
    )

    SALARY_TYPE_CHOICES = (
        ('MONTHLY', 'Monthly Fixed'),
        ('MONTHLY_FIXED', 'Monthly Fixed'),
        ('HOURLY', 'Hourly Rate'),
        ('FIXED', 'Fixed Project/Contract'),
        ('COMMISSION', 'Commission Based'),
        ('PER_PERIOD', 'Per Class / Lecture Period'),
        ('VOLUNTEER', 'Honorary / Volunteer'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'User',
        on_delete=models.CASCADE,
        related_name='staff_profile',
        null=True,
        blank=True
    )
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='staff_members'
    )
    employee_id = models.CharField(max_length=64, unique=True, db_index=True)
    staff_type = models.CharField(
        max_length=20,
        choices=STAFF_TYPE_CHOICES,
        default='TEACHING',
        db_index=True
    )
    designation = models.CharField(max_length=100, help_text="e.g. Senior Ustadh, Accountant, Warden")
    department = models.ForeignKey(
        AcademicDepartment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='staff_members'
    )
    employment_status = models.CharField(
        max_length=20,
        choices=EMPLOYMENT_STATUS_CHOICES,
        default='PERMANENT'
    )
    joining_date = models.DateField(default=timezone.now)
    nid_no = models.CharField(max_length=64, blank=True, default='')
    emergency_contact = models.CharField(max_length=32, blank=True, default='')
    blood_group = models.CharField(max_length=10, blank=True, default='')

    # Payroll & Future-Proofing Fields
    salary_type = models.CharField(
        max_length=20,
        choices=SALARY_TYPE_CHOICES,
        default='MONTHLY'
    )
    base_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        default=0.00
    )
    bank_account_no = models.CharField(max_length=64, blank=True, default='')
    bank_name = models.CharField(max_length=100, blank=True, default='')
    mobile_banking_no = models.CharField(max_length=32, blank=True, default='')

    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at', 'employee_id']
        verbose_name = "Staff Profile"
        verbose_name_plural = "Staff Profiles"

    def __str__(self):
        user_name = self.user.name if self.user and self.user.name else (self.user.phone_number if self.user else "Unlinked User")
        return f"{self.employee_id} - {user_name} ({self.get_staff_type_display()})"


class TeacherDetail(models.Model):
    staff = models.OneToOneField(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='teacher_detail',
        primary_key=True
    )
    highest_degree = models.CharField(max_length=150, blank=True, default='')
    specialization = models.CharField(max_length=150, blank=True, default='', help_text="e.g., Hifz, Arabic, Tajweed, Mathematics")
    max_daily_periods = models.PositiveIntegerField(default=6)
    can_review_reports = models.BooleanField(default=True)

    def __str__(self):
        return f"Teacher Detail: {self.staff.employee_id} ({self.specialization or 'General'})"


class GeneralStaffDetail(models.Model):
    SHIFT_CHOICES = (
        ('MORNING', 'Morning Shift'),
        ('EVENING', 'Evening Shift'),
        ('NIGHT', 'Night Shift'),
        ('ROTATIONAL', 'Rotational Shift'),
    )

    staff = models.OneToOneField(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='general_detail',
        primary_key=True
    )
    assigned_zone = models.CharField(max_length=150, blank=True, default='', help_text="e.g., Main Campus, Hostel 1, Admin Block")
    reporting_to = models.ForeignKey(
        StaffProfile,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='subordinates'
    )
    duty_scope = models.TextField(blank=True, default='')
    shift_type = models.CharField(
        max_length=20,
        choices=SHIFT_CHOICES,
        default='MORNING'
    )

    def __str__(self):
        return f"General Staff Detail: {self.staff.employee_id} ({self.assigned_zone or 'Unassigned'})"


class TeacherAssignment(models.Model):
    ROLE_IN_CLASS_CHOICES = (
        ('LEAD_TEACHER', 'Lead Teacher / Ustadh'),
        ('ASSISTANT', 'Assistant Teacher'),
        ('SUBSTITUTE', 'Substitute Teacher'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_class = models.ForeignKey(
        StudentClass,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='teacher_assignments'
    )
    assigned_group = models.ForeignKey(
        StudentGroup,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='teacher_assignments'
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name='teacher_assignments'
    )
    role_in_class = models.CharField(
        max_length=20,
        choices=ROLE_IN_CLASS_CHOICES,
        default='LEAD_TEACHER'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['teacher', 'assigned_class', 'assigned_group', 'session'],
                name='unique_teacher_class_group_session_assignment'
            )
        ]
        verbose_name = "Teacher Assignment"
        verbose_name_plural = "Teacher Assignments"

    def __str__(self):
        class_name = self.assigned_class.name if self.assigned_class else "All Classes"
        group_name = f" [{self.assigned_group.name}]" if self.assigned_group else ""
        return f"{self.teacher.employee_id} -> {class_name}{group_name} ({self.get_role_in_class_display()})"


class GeneralStaffDuty(models.Model):
    DUTY_PRIORITY_CHOICES = (
        ('HIGH', 'High Priority'),
        ('NORMAL', 'Normal Priority'),
        ('LOW', 'Low Priority'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='duties'
    )
    duty_title = models.CharField(max_length=150)
    duty_description = models.TextField(blank=True, default='')
    effective_from = models.DateField(default=timezone.now)
    effective_to = models.DateField(null=True, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=DUTY_PRIORITY_CHOICES,
        default='NORMAL'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-effective_from', '-created_at']
        verbose_name = "General Staff Duty"
        verbose_name_plural = "General Staff Duties"

    def __str__(self):
        return f"{self.duty_title} ({self.staff.employee_id})"


class StaffAttendance(models.Model):
    ATTENDANCE_STATUS_CHOICES = (
        ('PRESENT', 'Present'),
        ('LATE', 'Late Arrival'),
        ('ABSENT', 'Absent'),
        ('HALF_DAY', 'Half Day'),
        ('ON_LEAVE', 'On Approved Leave'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    date = models.DateField(db_index=True)
    in_time = models.TimeField(null=True, blank=True)
    out_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='PRESENT',
        db_index=True
    )
    device_ip = models.CharField(max_length=64, null=True, blank=True)
    source = models.CharField(max_length=64, default='WEB_PORTAL')
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'staff__employee_id']
        constraints = [
            models.UniqueConstraint(
                fields=['staff', 'date'],
                name='unique_staff_daily_attendance'
            )
        ]
        verbose_name = "Staff Attendance"
        verbose_name_plural = "Staff Attendance Records"

    def __str__(self):
        return f"{self.staff.employee_id} - {self.date} ({self.get_status_display()})"


class StaffLeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = (
        ('CASUAL', 'Casual Leave'),
        ('SICK', 'Medical / Sick Leave'),
        ('EMERGENCY', 'Emergency Leave'),
        ('UNPAID', 'Unpaid Leave'),
    )

    LEAVE_STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    staff = models.ForeignKey(
        StaffProfile,
        on_delete=models.CASCADE,
        related_name='leave_requests'
    )
    leave_type = models.CharField(
        max_length=20,
        choices=LEAVE_TYPE_CHOICES,
        default='CASUAL'
    )
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=LEAVE_STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    approved_by = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_staff_leaves'
    )
    admin_remarks = models.TextField(blank=True, default='')
    action_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Staff Leave Request"
        verbose_name_plural = "Staff Leave Requests"

    def __str__(self):
        return f"{self.staff.employee_id} - {self.get_leave_type_display()} [{self.start_date} to {self.end_date}] ({self.get_status_display()})"


# ---------------------------------------------------------
# 🎯 20. ATTENDANCE, CALENDAR & TASK ECOSYSTEM MODELS
# ---------------------------------------------------------

class AcademicCalendarEvent(models.Model):
    EVENT_TYPE_CHOICES = (
        ('PUBLIC_HOLIDAY', 'Public / National Holiday'),
        ('INSTITUTIONAL_HOLIDAY', 'Institutional Holiday'),
        ('EXAM_PERIOD', 'Examination Period'),
        ('VACATION', 'Vacation / Semester Break'),
        ('SPECIAL_EVENT', 'Special Academic Event'),
        ('TRAINING', 'Faculty / Staff Workshop'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='calendar_events'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES,
        default='INSTITUTIONAL_HOLIDAY',
        db_index=True
    )
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True)
    affects_students = models.BooleanField(default=True)
    affects_staff = models.BooleanField(default=True)
    is_residential_active = models.BooleanField(default=False, help_text="True if residential madrasa activities continue")
    color_code = models.CharField(max_length=20, default='#38bdf8')
    created_by = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_calendar_events'
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_date', 'title']
        verbose_name = "Academic Calendar Event"
        verbose_name_plural = "Academic Calendar Events"

    def __str__(self):
        return f"{self.title} ({self.start_date} -> {self.end_date}) [{self.get_event_type_display()}]"


class InstitutionalTask(models.Model):
    PRIORITY_CHOICES = (
        ('HIGH', 'High Priority'),
        ('MEDIUM', 'Medium Priority'),
        ('LOW', 'Low Priority'),
    )

    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    )

    CATEGORY_CHOICES = (
        ('GENERAL', 'General Institutional Task'),
        ('ACADEMIC', 'Academic & Curriculum'),
        ('EXAMINATION', 'Examination & Result Prep'),
        ('ADMINISTRATIVE', 'Administrative & Official'),
        ('FACILITIES', 'Campus & Facilities'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='institutional_tasks'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    due_date = models.DateField(null=True, blank=True, db_index=True)
    due_time = models.TimeField(null=True, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='MEDIUM',
        db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        db_index=True
    )
    category = models.CharField(
        max_length=30,
        choices=CATEGORY_CHOICES,
        default='GENERAL'
    )
    assigned_to = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_institutional_tasks'
    )
    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='created_institutional_tasks'
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['is_completed', 'due_date', '-priority', '-created_at']
        verbose_name = "Institutional Task"
        verbose_name_plural = "Institutional Tasks"

    def __str__(self):
        return f"{self.title} [{'DONE' if self.is_completed else self.status}]"


class AttendanceSessionSlot(models.Model):
    SLOT_TYPE_CHOICES = (
        ('DAILY_GENERAL', 'Full Day General Slot'),
        ('PERIODIC', 'Periodic Lecture / Class Slot'),
        ('SESSION_BASED', 'Session Based (Morning / Afternoon / Evening)'),
        ('RESIDENTIAL_PRAYER', 'Residential / Prayer Sabaq Slot'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='attendance_slots'
    )
    name = models.CharField(max_length=100, help_text="e.g. Daily Main, Fajr Sabaq, Period 1, Zuhr Dars")
    slot_type = models.CharField(
        max_length=30,
        choices=SLOT_TYPE_CHOICES,
        default='DAILY_GENERAL'
    )
    department = models.ForeignKey(
        AcademicDepartment,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='attendance_slots'
    )
    student_class = models.ForeignKey(
        StudentClass,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='attendance_slots'
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    late_cutoff_time = models.TimeField(null=True, blank=True)
    order_rank = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order_rank', 'start_time', 'name']
        verbose_name = "Attendance Session Slot"
        verbose_name_plural = "Attendance Session Slots"

    def __str__(self):
        return f"{self.name} ({self.get_slot_type_display()})"


class StudentAttendance(models.Model):
    ATTENDANCE_STATUS_CHOICES = (
        ('PRESENT', 'Present'),
        ('LATE', 'Late Arrival'),
        ('ABSENT', 'Absent'),
        ('HALF_DAY', 'Half Day'),
        ('ON_LEAVE', 'Approved Leave'),
        ('HOLIDAY_EXCUSED', 'Holiday / Weekend Excused'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    student_class = models.ForeignKey(
        StudentClass,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='student_class_attendances'
    )
    period_slot = models.ForeignKey(
        'DynamicPeriodSlot',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='student_period_attendances'
    )
    session_slot = models.ForeignKey(
        AttendanceSessionSlot,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='student_attendances'
    )
    date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=ATTENDANCE_STATUS_CHOICES,
        default='PRESENT',
        db_index=True
    )
    in_time = models.TimeField(null=True, blank=True)
    out_time = models.TimeField(null=True, blank=True)
    taken_by_teacher = models.ForeignKey(
        TeacherProfile,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='conducted_student_attendances'
    )
    substitute_teacher = models.ForeignKey(
        TeacherProfile,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='substitute_student_attendances'
    )
    is_bunk_discrepancy = models.BooleanField(default=False)
    marked_by = models.ForeignKey(
        'User',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='marked_student_attendances'
    )
    source = models.CharField(max_length=64, default='WEB_PORTAL')
    remarks = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'student__roll_number', 'student__name']
        constraints = [
            models.UniqueConstraint(
                fields=['student', 'period_slot', 'date'],
                name='unique_student_period_date_attendance'
            )
        ]
        verbose_name = "Student Attendance"
        verbose_name_plural = "Student Attendance Records"

    def __str__(self):
        slot_name = self.period_slot.period_name if self.period_slot else (self.session_slot.name if self.session_slot else "")
        slot_str = f" [{slot_name}]" if slot_name else ""
        return f"Student {self.student.roll_number or self.student.name} - {self.date}{slot_str} ({self.get_status_display()})"


class DynamicPeriodSlot(models.Model):
    SLOT_TYPE_CHOICES = (
        ('PERIOD', 'Academic Class Period'),
        ('SHIFT', 'Shift / General Attendance'),
        ('SESSION', 'Sabq / Recitation Session'),
        ('MUTALAA', 'Mutala\'a / Self Study'),
        ('BREAK', 'Tiffin / Break'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='dynamic_period_slots'
    )
    department = models.ForeignKey(
        AcademicDepartment,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dynamic_period_slots'
    )
    student_class = models.ForeignKey(
        StudentClass,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dynamic_period_slots'
    )
    slot_type = models.CharField(
        max_length=20,
        choices=SLOT_TYPE_CHOICES,
        default='PERIOD'
    )
    period_name = models.CharField(max_length=100)
    period_order = models.IntegerField(default=1)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    late_grace_minutes = models.IntegerField(default=10)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['period_order', 'start_time', 'period_name']
        verbose_name = "Dynamic Period Slot"
        verbose_name_plural = "Dynamic Period Slots"

    def __str__(self):
        return f"{self.period_name} ({self.start_time}-{self.end_time})"


class TeacherRoutineSchedule(models.Model):
    DAY_OF_WEEK_CHOICES = (
        ('ALL', 'All Active Days'),
        ('SATURDAY', 'Saturday'),
        ('SUNDAY', 'Sunday'),
        ('MONDAY', 'Monday'),
        ('TUESDAY', 'Tuesday'),
        ('WEDNESDAY', 'Wednesday'),
        ('THURSDAY', 'Thursday'),
        ('FRIDAY', 'Friday'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='teacher_routines'
    )
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name='routine_schedules'
    )
    period_slot = models.ForeignKey(
        DynamicPeriodSlot,
        on_delete=models.CASCADE,
        related_name='teacher_routines'
    )
    student_class = models.ForeignKey(
        StudentClass,
        on_delete=models.CASCADE,
        related_name='teacher_routines'
    )
    student_group = models.ForeignKey(
        StudentGroup,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='teacher_routines'
    )
    subject_or_kitab_name = models.CharField(max_length=150)
    day_of_week = models.CharField(max_length=20, choices=DAY_OF_WEEK_CHOICES, default='ALL')
    room_number = models.CharField(max_length=50, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['teacher__name_en', 'period_slot__period_order', 'student_class__name']
        verbose_name = "Teacher Routine Schedule"
        verbose_name_plural = "Teacher Routine Schedules"

    def __str__(self):
        t_name = self.teacher.name_en or str(self.teacher.id)
        c_name = self.student_class.name if self.student_class else "Class"
        return f"{t_name} - {c_name} - {self.subject_or_kitab_name} ({self.period_slot.period_name})"


class TeacherPeriodAttendanceRecord(models.Model):
    STATUS_CHOICES = (
        ('PRESENT', 'Present / Conducted'),
        ('ABSENT', 'Absent'),
        ('SUBSTITUTED', 'Conducted by Substitute'),
        ('LEAVE', 'Approved Leave'),
        ('HOLIDAY', 'Holiday / Weekend'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='teacher_period_attendances'
    )
    schedule = models.ForeignKey(
        TeacherRoutineSchedule,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    teacher = models.ForeignKey(
        TeacherProfile,
        on_delete=models.CASCADE,
        related_name='period_attendances'
    )
    substitute_teacher = models.ForeignKey(
        TeacherProfile,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='substitute_period_attendances'
    )
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    is_conducted = models.BooleanField(default=True)
    remarks = models.TextField(blank=True, default='')
    marked_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='marked_teacher_period_attendances'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', 'teacher__name_en']
        constraints = [
            models.UniqueConstraint(
                fields=['schedule', 'date'],
                name='unique_schedule_date_teacher_attendance'
            )
        ]
        verbose_name = "Teacher Period Attendance Record"
        verbose_name_plural = "Teacher Period Attendance Records"

    def __str__(self):
        t_name = self.teacher.name_en or str(self.teacher.id)
        return f"{t_name} - {self.schedule.subject_or_kitab_name} on {self.date}: {self.status}"


class GateEntryExitLog(models.Model):
    DIRECTION_CHOICES = (
        ('ENTRY', 'Campus Entry / In'),
        ('EXIT', 'Campus Exit / Out'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='gate_logs'
    )
    student = models.ForeignKey(
        Student,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='gate_logs'
    )
    staff = models.ForeignKey(
        TeacherProfile,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='gate_logs'
    )
    person_name = models.CharField(max_length=150, blank=True)
    barcode_or_rfid = models.CharField(max_length=100, blank=True, db_index=True)
    punch_time = models.DateTimeField(default=timezone.now, db_index=True)
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, default='ENTRY')
    gate_pass_reason = models.CharField(max_length=255, blank=True, default='')
    device_name = models.CharField(max_length=100, blank=True, default='Main Gate')
    recorded_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='recorded_gate_logs'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-punch_time']
        verbose_name = "Gate Entry/Exit Log"
        verbose_name_plural = "Gate Entry/Exit Logs"

    def __str__(self):
        target = self.student.name if self.student else (self.staff.name if self.staff else self.person_name)
        return f"{target} - {self.direction} at {self.punch_time}"


class AdHocHeadcountSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='adhoc_headcounts'
    )
    title = models.CharField(max_length=200)
    date_time = models.DateTimeField(default=timezone.now)
    student_class = models.ForeignKey(
        StudentClass,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='adhoc_headcounts'
    )
    student_group = models.ForeignKey(
        StudentGroup,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='adhoc_headcounts'
    )
    conducted_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='conducted_adhoc_headcounts'
    )
    total_expected = models.IntegerField(default=0)
    total_verified = models.IntegerField(default=0)
    verified_student_ids = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_time']
        verbose_name = "Ad-Hoc Headcount Session"
        verbose_name_plural = "Ad-Hoc Headcount Sessions"

    def __str__(self):
        return f"{self.title} ({self.total_verified}/{self.total_expected}) at {self.date_time}"


class BiometricDevice(models.Model):
    DEVICE_TYPE_CHOICES = (
        ('ZKTECO', 'ZKTeco Push / ADMS Protocol'),
        ('HIKVISION', 'Hikvision ISAPI / Face Terminal'),
        ('ANVIZ', 'Anviz Biometric / Cloud'),
        ('RFID_GATE', 'RFID Gate Scanner'),
        ('GENERIC_REST', 'Generic REST Webhook Device'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='biometric_devices'
    )
    device_name = models.CharField(max_length=150)
    device_serial = models.CharField(max_length=100, unique=True, db_index=True)
    device_ip = models.GenericIPAddressField(null=True, blank=True)
    port = models.IntegerField(default=4370)
    device_type = models.CharField(max_length=30, choices=DEVICE_TYPE_CHOICES, default='ZKTECO')
    location = models.CharField(max_length=150, blank=True, default='Main Gate')
    api_key_or_token = models.CharField(max_length=255, blank=True, default='')
    last_heartbeat = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['device_name']
        verbose_name = "Biometric Device"
        verbose_name_plural = "Biometric Devices"

    def __str__(self):
        return f"{self.device_name} [{self.device_serial}] ({self.location})"


class RawAttendancePunchLog(models.Model):
    PUNCH_TYPE_CHOICES = (
        ('CHECK_IN', 'Check In / Entry'),
        ('CHECK_OUT', 'Check Out / Exit'),
        ('BREAK_OUT', 'Break Out'),
        ('BREAK_IN', 'Break In'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    device = models.ForeignKey(
        BiometricDevice,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='raw_punches'
    )
    user_pin_or_card = models.CharField(max_length=100, db_index=True)
    punch_timestamp = models.DateTimeField(db_index=True)
    punch_type = models.CharField(max_length=20, choices=PUNCH_TYPE_CHOICES, default='CHECK_IN')
    raw_payload = models.JSONField(default=dict, blank=True)
    is_processed = models.BooleanField(default=False, db_index=True)
    matched_student = models.ForeignKey(
        Student,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='raw_biometric_punches'
    )
    matched_teacher = models.ForeignKey(
        TeacherProfile,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='raw_biometric_punches'
    )
    processing_notes = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-punch_timestamp']
        verbose_name = "Raw Attendance Punch Log"
        verbose_name_plural = "Raw Attendance Punch Logs"

    def __str__(self):
        return f"Punch: PIN {self.user_pin_or_card} at {self.punch_timestamp} (Processed: {self.is_processed})"


class AttendancePolicySetting(models.Model):
    DEFAULT_MODE_CHOICES = (
        ('DAILY_SINGLE', 'Single Daily Roll Call'),
        ('MULTI_SESSION', 'Multi-Session Attendance (e.g. Morning / Afternoon)'),
        ('PERIOD_WISE', 'Period-by-Period Roll Call'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.OneToOneField(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='attendance_policy'
    )
    weekend_days = models.JSONField(
        default=list,
        blank=True,
        help_text="List of weekday names e.g. ['FRIDAY', 'SATURDAY']"
    )
    default_mode = models.CharField(
        max_length=20,
        choices=DEFAULT_MODE_CHOICES,
        default='DAILY_SINGLE'
    )
    default_late_cutoff_time = models.TimeField(null=True, blank=True)
    auto_excuse_holidays = models.BooleanField(
        default=True,
        help_text="Automatically set status to HOLIDAY_EXCUSED on scheduled holidays/weekends"
    )
    auto_notify_absent = models.BooleanField(
        default=False,
        help_text="Send automated SMS / App alerts to guardians on unexcused absence"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Attendance Policy Setting"
        verbose_name_plural = "Attendance Policy Settings"

    def __str__(self):
        return f"Attendance Policy for {self.institution.name}"


class DocumentTemplateConfig(models.Model):
    DOCUMENT_TYPE_CHOICES = (
        ('ID_CARD', 'Student / Staff ID Card'),
        ('ADMISSION_SLIP', 'Student Admission Voucher'),
        ('FEE_VOUCHER', 'Monthly Fee Receipt'),
        ('TESTIMONIAL_CERTIFICATE', 'Testimonial & Certificate'),
        ('REPORT_BANNER', 'Report Header Banner'),
    )

    ORIENTATION_CHOICES = (
        ('PORTRAIT', 'Portrait'),
        ('LANDSCAPE', 'Landscape'),
    )

    PAGE_SIZE_CHOICES = (
        ('CR80_PVC', 'CR80 PVC Card (54x85.6mm)'),
        ('A4', 'A4 Standard'),
        ('A5', 'A5 Half Page'),
        ('CUSTOM', 'Custom Size'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        AcademicInstitution,
        on_delete=models.CASCADE,
        related_name='document_templates'
    )
    document_type = models.CharField(
        max_length=40,
        choices=DOCUMENT_TYPE_CHOICES,
        default='ID_CARD',
        db_index=True
    )
    template_name = models.CharField(max_length=150)
    is_default = models.BooleanField(default=False)
    orientation = models.CharField(
        max_length=20,
        choices=ORIENTATION_CHOICES,
        default='PORTRAIT'
    )
    page_size = models.CharField(
        max_length=30,
        choices=PAGE_SIZE_CHOICES,
        default='CR80_PVC'
    )
    layout_config = models.JSONField(default=dict, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', 'template_name']
        verbose_name = "Document Template Config"
        verbose_name_plural = "Document Template Configs"

    def __str__(self):
        return f"{self.template_name} ({self.get_document_type_display()}) - {self.institution.name}"