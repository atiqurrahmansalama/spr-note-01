from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

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
    institution = models.ForeignKey('core.AcademicInstitution',
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
    rank_order = models.IntegerField(default=99, db_index=True, help_text="Institutional hierarchy rank order (1=Principal, 2=VP, etc.)")
    department = models.ForeignKey('core.AcademicDepartment',
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
    joining_date = models.DateField(default=timezone.localdate)
    nid_no = models.CharField(max_length=64, blank=True, default='')
    emergency_contact = models.CharField(max_length=32, blank=True, default='')
    blood_group = models.CharField(max_length=10, blank=True, default='')
    address = models.TextField(blank=True, default='')
    division = models.CharField(max_length=100, blank=True, default='')
    district = models.CharField(max_length=100, blank=True, default='')
    upazila_thana = models.CharField(max_length=100, blank=True, default='')
    postal_code = models.CharField(max_length=20, blank=True, default='')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    map_place_id = models.CharField(max_length=255, blank=True, default='')

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
        ordering = ['rank_order', 'employee_id']
        verbose_name = "Staff Profile"
        verbose_name_plural = "Staff Profiles"

    def __str__(self):
        user_name = self.user.name if self.user and self.user.name else (self.user.phone_number if self.user else "Unlinked User")
        return f"{self.employee_id} - {user_name} ({self.get_staff_type_display()})"


class TeacherDetail(models.Model):
    staff = models.OneToOneField('core.StaffProfile',
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

    staff = models.OneToOneField('core.StaffProfile',
        on_delete=models.CASCADE,
        related_name='general_detail',
        primary_key=True
    )
    assigned_zone = models.CharField(max_length=150, blank=True, default='', help_text="e.g., Main Campus, Hostel 1, Admin Block")
    reporting_to = models.ForeignKey('core.StaffProfile',
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
    teacher = models.ForeignKey('core.StaffProfile',
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    assigned_class = models.ForeignKey('core.StudentClass',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='teacher_assignments'
    )
    assigned_group = models.ForeignKey('core.StudentGroup',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='teacher_assignments'
    )
    session = models.ForeignKey('core.Session',
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
    staff = models.ForeignKey('core.StaffProfile',
        on_delete=models.CASCADE,
        related_name='duties'
    )
    duty_title = models.CharField(max_length=150)
    duty_description = models.TextField(blank=True, default='')
    effective_from = models.DateField(default=timezone.localdate)
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
    staff = models.ForeignKey('core.StaffProfile',
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
    staff = models.ForeignKey('core.StaffProfile',
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


class StaffOnboardingToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='staff_onboarding_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=150, help_text="e.g. Senior Faculty Recruitment 2026")
    staff_type = models.CharField(
        max_length=20,
        choices=StaffProfile.STAFF_TYPE_CHOICES,
        default='TEACHING',
        db_index=True
    )
    designation = models.CharField(max_length=100, blank=True, default='', help_text="Preset designation/title")
    rank_order = models.IntegerField(default=99, help_text="Default hierarchy rank")
    department = models.ForeignKey(
        'core.AcademicDepartment',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='staff_onboarding_tokens'
    )
    max_applications = models.PositiveIntegerField(default=0, help_text="0 for unlimited uses")
    applied_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    auto_approve = models.BooleanField(default=True, help_text="Automatically create active StaffProfile upon submission")
    include_payroll = models.BooleanField(default=False, help_text="Whether to request salary/banking info in public candidate form")
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='created_staff_onboarding_tokens'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Staff Onboarding Token"
        verbose_name_plural = "Staff Onboarding Tokens"

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_applications > 0 and self.applied_count >= self.max_applications:
            return False
        return True

    def __str__(self):
        return f"Staff Onboarding Token: {self.title} ({self.token})"

