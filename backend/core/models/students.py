from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

class Student(models.Model):
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='students'
    )
    uniq_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    roll_number = models.IntegerField(null=True, blank=True)
    name_en = models.CharField(max_length=150, null=True, blank=True)
    student_class = models.ForeignKey('core.StudentClass',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    student_group = models.ForeignKey('core.StudentGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    branch = models.ForeignKey('core.AcademicBranch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students'
    )
    section = models.ForeignKey('core.ClassSection',
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
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    map_place_id = models.CharField(max_length=255, blank=True, default='')
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
            from django.apps import apps
            StudentGroup = apps.get_model('core', 'StudentGroup')
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
            if is_new:
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


class StudentDetail(models.Model):
    student = models.OneToOneField('core.Student',
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


class StudentAcademicHistory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey('core.Student',
        on_delete=models.CASCADE,
        related_name='academic_history'
    )
    student_class = models.ForeignKey('core.StudentClass',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='historical_movements'
    )
    student_group = models.ForeignKey('core.StudentGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='historical_movements'
    )
    start_date = models.DateField(default=timezone.localdate)
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


class StudentAcademicDetail(models.Model):
    student = models.OneToOneField('core.Student', related_name='academic_detail', on_delete=models.CASCADE)
    session_year = models.CharField(max_length=32, blank=True, null=True)
    class_or_group = models.ForeignKey('core.StudentGroup', on_delete=models.SET_NULL, null=True, blank=True)
    roll_number = models.CharField(max_length=32, blank=True, null=True)
    admission_date = models.DateField(default=timezone.localdate)
    previous_school_name = models.CharField(max_length=255, blank=True, null=True)
    previous_school_address = models.CharField(max_length=255, blank=True, null=True)
    previous_class = models.CharField(max_length=150, blank=True, null=True)
    previous_roll_number = models.CharField(max_length=64, blank=True, null=True)
    previous_grade = models.CharField(max_length=64, blank=True, null=True)
    previous_average = models.CharField(max_length=64, blank=True, null=True)
    previous_result = models.CharField(max_length=128, blank=True, null=True)
    previous_passing_year = models.CharField(max_length=32, blank=True, null=True)
    previous_study_details = models.TextField(blank=True, default='')
    tc_number = models.CharField(max_length=64, blank=True, null=True)
    created_by = models.ForeignKey(
        'User',
        on_delete=models.CASCADE,
        related_name='created_academic_details'
    )

    def save(self, *args, **kwargs):
        if not self.previous_result:
            if self.previous_grade and self.previous_average:
                self.previous_result = f"{self.previous_grade} ({self.previous_average})"
            elif self.previous_grade:
                self.previous_result = self.previous_grade
            elif self.previous_average:
                self.previous_result = self.previous_average
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Academic Detail for {self.student.name_en or self.student.uniq_id}"


class StudentGuardian(models.Model):
    student = models.OneToOneField('core.Student', related_name='guardian_detail', on_delete=models.CASCADE)
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


class StudentDocument(models.Model):
    DOC_TYPE_CHOICES = (
        ('BIRTH_CERTIFICATE', 'Birth Certificate'),
        ('NID_CARD', 'Guardian NID'),
        ('PREVIOUS_MARKSHEET', 'Previous Marksheet'),
        ('TC', 'Transfer Certificate'),
        ('OTHER', 'Other'),
    )
    student = models.ForeignKey('core.Student', related_name='documents', on_delete=models.CASCADE)
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


class AdmissionInviteToken(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey(
        'core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='admission_invite_tokens'
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    title = models.CharField(max_length=150, help_text="e.g. Hifz Admission 2026-2027")
    session_year = models.CharField(max_length=50, default="2026-2027")
    target_class = models.ForeignKey(
        'core.StudentClass',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admission_invite_tokens'
    )
    target_group = models.ForeignKey(
        'core.StudentGroup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='admission_invite_tokens'
    )
    max_applications = models.PositiveIntegerField(default=0, help_text="0 for unlimited uses")
    applied_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    auto_enroll = models.BooleanField(default=True, help_text="Automatically enroll student upon submission")
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.CASCADE,
        related_name='created_admission_tokens'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self):
        if not self.is_active:
            return False
        if self.expires_at and self.expires_at < timezone.now():
            return False
        if self.max_applications > 0 and self.applied_count >= self.max_applications:
            return False
        return True

    def __str__(self):
        return f"Admission Token: {self.title} ({self.token})"


