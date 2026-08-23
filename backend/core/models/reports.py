from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

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
    student = models.ForeignKey('core.Student',
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
    created_by = models.ForeignKey('core.User',
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
    institution = models.ForeignKey('core.AcademicInstitution',
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

