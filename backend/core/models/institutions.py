from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

class InstitutionCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=50, unique=True, db_index=True)
    description = models.TextField(blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = "Institution Category"
        verbose_name_plural = "Institution Categories"

    def __str__(self):
        return f"{self.name} ({self.code})"


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
    postal_code = models.CharField(max_length=20, blank=True, default='')
    street_address = models.TextField(blank=True, default='')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    map_place_id = models.CharField(max_length=255, blank=True, default='')
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
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    map_place_id = models.CharField(max_length=255, blank=True, default='')
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='created_addresses'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        parts = [self.street_address, self.thana_or_upazila, self.district]
        return ", ".join([p for p in parts if p]) or f"Address #{self.id}"


class AcademicBranch(models.Model):
    BRANCH_TYPE_CHOICES = (
        ('MAIN_CAMPUS', 'Main Campus'),
        ('SUB_BRANCH', 'Sub Branch'),
        ('FEMALE_BRANCH', 'Female Branch / Mahila Branch'),
        ('RESIDENTIAL_CAMPUS', 'Residential Campus'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='branches'
    )
    branch_name = models.CharField(max_length=200)
    branch_code = models.CharField(max_length=50, blank=True, default='')
    branch_type = models.CharField(
        max_length=50,
        choices=BRANCH_TYPE_CHOICES,
        default='MAIN_CAMPUS'
    )
    in_charge_staff = models.ForeignKey(
        'StaffProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_branches'
    )
    contact_phone = models.CharField(max_length=30, blank=True, default='')
    contact_email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    district = models.CharField(max_length=100, blank=True, default='')
    division = models.CharField(max_length=100, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['branch_name']
        verbose_name = "Academic Branch"
        verbose_name_plural = "Academic Branches"

    def __str__(self):
        return f"{self.branch_name} ({self.branch_code})" if self.branch_code else self.branch_name


class AcademicDepartment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='departments'
    )
    branch = models.ForeignKey('core.AcademicBranch',
        on_delete=models.SET_NULL,
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

