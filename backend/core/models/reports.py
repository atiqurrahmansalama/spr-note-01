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


class AcademicGoal(models.Model):
    """Target/goal planner for a student or class curriculum."""
    TARGET_TYPE_CHOICES = (
        ('PAGE_RANGE', 'Page Range'),
        ('CHAPTER_RANGE', 'Chapter / Unit Range'),
        ('SURAH_RANGE', 'Surah / Para Range'),
        ('TOPIC_COUNT', 'Topic Count'),
    )

    STATUS_CHOICES = (
        ('ON_TRACK', 'On Track'),
        ('AHEAD', 'Ahead of Schedule'),
        ('BEHIND', 'Behind Schedule'),
        ('COMPLETED', 'Completed'),
        ('PAUSED', 'Paused'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='academic_goals'
    )
    branch = models.CharField(max_length=100, default='MAIN_CAMPUS')
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='academic_goals'
    )
    subject_name = models.CharField(max_length=200, blank=True, default='General Curriculum')
    target_title = models.CharField(max_length=255)
    target_type = models.CharField(max_length=30, choices=TARGET_TYPE_CHOICES, default='PAGE_RANGE')
    start_point = models.CharField(max_length=100, default='1')
    target_point = models.CharField(max_length=100, default='100')
    current_progress = models.CharField(max_length=100, default='0')
    progress_percentage = models.FloatField(default=0.0)
    target_daily_pace = models.CharField(max_length=100, default='2 Pages/Day')
    start_date = models.DateField(default=timezone.localdate)
    target_end_date = models.DateField(null=True, blank=True)
    actual_completion_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ON_TRACK')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Academic Goal"
        verbose_name_plural = "Academic Goals"

    def __str__(self):
        return f"{self.target_title} - {self.student.name_en or 'Student'} ({self.status})"


class DailyLessonPlan(models.Model):
    """Daily lesson assignment (Sabaq delivery) by teacher."""
    SCOPE_CHOICES = (
        ('CLASS_WIDE', 'Entire Class / Section'),
        ('GROUP_WIDE', 'Student Group'),
        ('INDIVIDUAL_STUDENT', 'Individual Students'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='daily_lessons'
    )
    branch = models.CharField(max_length=100, default='MAIN_CAMPUS')
    academic_class = models.ForeignKey(
        'core.StudentClass',
        on_delete=models.CASCADE,
        related_name='daily_lessons'
    )
    section = models.ForeignKey(
        'core.ClassSection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_lessons'
    )
    student_group = models.ForeignKey(
        'core.StudentGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_lessons'
    )
    subject_name = models.CharField(max_length=200, blank=True, default='General')
    curriculum_book_id = models.CharField(max_length=100, blank=True)
    curriculum_book_name = models.CharField(max_length=255, blank=True)
    period_slot = models.ForeignKey(
        'core.ClassPeriodSlot',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_lessons'
    )
    period_name = models.CharField(max_length=150, blank=True)
    teacher = models.ForeignKey(
        'core.StaffProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='daily_lessons'
    )
    teacher_name = models.CharField(max_length=255, blank=True)
    lesson_date = models.DateField(default=timezone.localdate)
    lesson_title = models.CharField(max_length=255)
    lesson_topic = models.CharField(max_length=255, blank=True)
    start_unit = models.CharField(max_length=100, blank=True, help_text="e.g. Page 12 or Ayah 1")
    end_unit = models.CharField(max_length=100, blank=True, help_text="e.g. Page 15 or Ayah 25")
    lesson_instructions = models.TextField(blank=True)
    assigned_scope = models.CharField(max_length=30, choices=SCOPE_CHOICES, default='CLASS_WIDE')
    targeted_students = models.ManyToManyField('core.Student', blank=True, related_name='assigned_daily_lessons')
    attachment_url = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-lesson_date', '-created_at']
        verbose_name = "Daily Lesson Plan"
        verbose_name_plural = "Daily Lesson Plans"

    def __str__(self):
        return f"{self.lesson_title} - {self.subject_name} ({self.lesson_date})"


class LessonEvaluation(models.Model):
    """Daily recitation & evaluation record (Sabaq evaluation)."""
    STATUS_CHOICES = (
        ('MASTERED', 'Mastered / Excellent'),
        ('SATISFACTORY', 'Satisfactory / Good'),
        ('NEEDS_IMPROVEMENT', 'Needs Improvement / Retake'),
        ('UNPREPARED', 'Unprepared / Incomplete'),
        ('ABSENT', 'Absent'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson_plan = models.ForeignKey(
        DailyLessonPlan,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='evaluations'
    )
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='lesson_evaluations'
    )
    student_name = models.CharField(max_length=255, blank=True)
    evaluation_date = models.DateField(default=timezone.localdate)
    evaluation_status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SATISFACTORY')
    score = models.FloatField(default=10.0, help_text="Evaluation score out of max score")
    max_score = models.FloatField(default=10.0)
    total_mistakes = models.IntegerField(default=0)
    total_stucks = models.IntegerField(default=0, help_text="Lukmah / stuck count")
    fluency_rating = models.IntegerField(default=5, help_text="Rating 1-5")
    teacher_remarks = models.TextField(blank=True)
    is_synced_to_parent = models.BooleanField(default=False)
    parent_viewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-evaluation_date', '-created_at']
        unique_together = ('lesson_plan', 'student')
        verbose_name = "Lesson Evaluation"
        verbose_name_plural = "Lesson Evaluations"

    def __str__(self):
        return f"{self.student_name} - {self.evaluation_status} ({self.evaluation_date})"


class HomeworkAssignment(models.Model):
    """Homework & assignment assigned to students."""
    SUBMISSION_TYPE_CHOICES = (
        ('WRITTEN_TEXT', 'Written Notes / Text'),
        ('FILE_UPLOAD', 'File / Photo Upload'),
        ('VERBAL_RECITATION', 'Verbal Recitation'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='homework_assignments'
    )
    branch = models.CharField(max_length=100, default='MAIN_CAMPUS')
    lesson_plan = models.ForeignKey(
        DailyLessonPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homework_assignments'
    )
    academic_class = models.ForeignKey(
        'core.StudentClass',
        on_delete=models.CASCADE,
        related_name='homework_assignments'
    )
    section = models.ForeignKey(
        'core.ClassSection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homework_assignments'
    )
    subject_name = models.CharField(max_length=200, blank=True, default='General')
    teacher = models.ForeignKey(
        'core.StaffProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homework_assignments'
    )
    teacher_name = models.CharField(max_length=255, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    assigned_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField()
    due_time = models.TimeField(null=True, blank=True)
    max_marks = models.FloatField(default=10.0)
    submission_type = models.CharField(max_length=30, choices=SUBMISSION_TYPE_CHOICES, default='WRITTEN_TEXT')
    attachment_url = models.CharField(max_length=500, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-due_date', '-created_at']
        verbose_name = "Homework Assignment"
        verbose_name_plural = "Homework Assignments"

    def __str__(self):
        return f"{self.title} - Due: {self.due_date}"


class HomeworkSubmission(models.Model):
    """Submission and evaluation of student homework."""
    STATUS_CHOICES = (
        ('PENDING', 'Pending Submission'),
        ('SUBMITTED', 'Submitted / Awaiting Review'),
        ('EVALUATED', 'Evaluated / Graded'),
        ('LATE', 'Late Submission'),
        ('RESUBMIT_REQUESTED', 'Resubmission Requested'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    homework = models.ForeignKey(
        HomeworkAssignment,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    student = models.ForeignKey(
        'core.Student',
        on_delete=models.CASCADE,
        related_name='homework_submissions'
    )
    student_name = models.CharField(max_length=255, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    submission_content = models.TextField(blank=True)
    attachment_url = models.CharField(max_length=500, blank=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='PENDING')
    obtained_marks = models.FloatField(null=True, blank=True)
    teacher_feedback = models.TextField(blank=True)
    evaluated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at', '-created_at']
        unique_together = ('homework', 'student')
        verbose_name = "Homework Submission"
        verbose_name_plural = "Homework Submissions"

    def __str__(self):
        return f"{self.student_name} - {self.homework.title} ({self.status})"


