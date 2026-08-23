from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

class AttendanceSessionSlot(models.Model):
    SLOT_TYPE_CHOICES = (
        ('DAILY_GENERAL', 'Full Day General Slot'),
        ('PERIODIC', 'Periodic Lecture / Class Slot'),
        ('SESSION_BASED', 'Session Based (Morning / Afternoon / Evening)'),
        ('RESIDENTIAL_PRAYER', 'Residential / Prayer Sabaq Slot'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='attendance_slots'
    )
    name = models.CharField(max_length=100, help_text="e.g. Daily Main, Fajr Sabaq, Period 1, Zuhr Dars")
    slot_type = models.CharField(
        max_length=30,
        choices=SLOT_TYPE_CHOICES,
        default='DAILY_GENERAL'
    )
    department = models.ForeignKey('core.AcademicDepartment',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='attendance_slots'
    )
    student_class = models.ForeignKey('core.StudentClass',
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
    student = models.ForeignKey('core.Student',
        on_delete=models.CASCADE,
        related_name='attendances'
    )
    student_class = models.ForeignKey('core.StudentClass',
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
    session_slot = models.ForeignKey('core.AttendanceSessionSlot',
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
    taken_by_teacher = models.ForeignKey('core.TeacherProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='conducted_student_attendances'
    )
    substitute_teacher = models.ForeignKey('core.TeacherProfile',
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


class GateEntryExitLog(models.Model):
    DIRECTION_CHOICES = (
        ('ENTRY', 'Campus Entry / In'),
        ('EXIT', 'Campus Exit / Out'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='gate_logs'
    )
    student = models.ForeignKey('core.Student',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='gate_logs'
    )
    staff = models.ForeignKey('core.TeacherProfile',
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
    recorded_by = models.ForeignKey('core.User',
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
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='adhoc_headcounts'
    )
    title = models.CharField(max_length=200)
    date_time = models.DateTimeField(default=timezone.now)
    student_class = models.ForeignKey('core.StudentClass',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='adhoc_headcounts'
    )
    student_group = models.ForeignKey('core.StudentGroup',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='adhoc_headcounts'
    )
    conducted_by = models.ForeignKey('core.User',
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
    institution = models.ForeignKey('core.AcademicInstitution',
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
    device = models.ForeignKey('core.BiometricDevice',
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
    matched_student = models.ForeignKey('core.Student',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='raw_biometric_punches'
    )
    matched_teacher = models.ForeignKey('core.TeacherProfile',
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
    institution = models.OneToOneField('core.AcademicInstitution',
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

