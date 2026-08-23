from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

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
    role = models.OneToOneField('core.UserRole', on_delete=models.CASCADE, related_name='action_permissions')
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

    institution = models.ForeignKey('core.AcademicInstitution',
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
    role = models.ForeignKey('core.UserRole',
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
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='verification_tokens')
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
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='password_reset_tokens')
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
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='sessions')
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


class TeacherProfile(models.Model):
    user = models.OneToOneField('core.User',
        on_delete=models.CASCADE,
        related_name='teacher_profile'
    )
    name_bn = models.CharField(max_length=100, null=True, blank=True)
    name_en = models.CharField(max_length=100, null=True, blank=True)
    designation = models.CharField(max_length=100, null=True, blank=True)
    address = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"Teacher: {self.name_en or self.user.phone_number}"


class GuardianProfile(models.Model):
    user = models.OneToOneField('core.User',
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


class UserDevice(models.Model):
    DEVICE_TYPE_CHOICES = (
        ('android', 'Android'),
        ('ios', 'iOS'),
        ('web', 'Web'),
    )

    user = models.ForeignKey('core.User',
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


class UserLoginLog(models.Model):
    STATUS_CHOICES = (
        ("LOGIN", "Login"),
        ("LOGOUT", "Logout"),
    )
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name="login_logs")
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
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name="legacy_activity_logs")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.user.phone_number} - {self.status} at {self.timestamp}"


class ActivityLog(models.Model):
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='activity_logs', null=True, blank=True)
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


class UserNotificationPreference(models.Model):
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, related_name='notification_preference')
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)

    def __str__(self):
        return f"Notification Preferences for {self.user}"


class UserSecurity(models.Model):
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, related_name='security')
    is_2fa_enabled = models.BooleanField(default=False)
    two_factor_secret = models.CharField(max_length=255, null=True, blank=True)
    backup_codes = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Security for {self.user}"


class UserPasskey(models.Model):
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='passkeys')
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
    authorized_user = models.ForeignKey('core.User', null=True, blank=True, on_delete=models.CASCADE, related_name='qr_tickets')
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


class RoleInviteToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=150, help_text="e.g. Hifz Teachers Batch 2026")
    target_role = models.ForeignKey('core.UserRole', on_delete=models.CASCADE, related_name='invite_tokens')
    max_uses = models.PositiveIntegerField(default=1, help_text="0 for unlimited uses")
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='created_invites')
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

