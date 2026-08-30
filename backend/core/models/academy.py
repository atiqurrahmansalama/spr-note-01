from django.db import models
from django.db.models import Max, Q, Count, Sum, Avg
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils import timezone
import uuid
import json

class StudentClass(models.Model):
    DEPARTMENT_CHOICES = (
        ('HIFZ', 'Hifz'),
        ('GENERAL', 'General'),
        ('OTHER', 'Other'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='classes'
    )
    department = models.ForeignKey('core.AcademicDepartment',
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
    has_sections = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this class supports and manages section divisions"
    )
    has_groups = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this class supports and manages group divisions"
    )
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


class ClassSection(models.Model):
    SECTION_TYPE_CHOICES = (
        ('GENERAL_SECTION', 'General Section'),
        ('HIFZ_SECTION', 'Quran / Hifz Section'),
        ('RESIDENTIAL_DORM', 'Residential Dormitory'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_class = models.ForeignKey('core.StudentClass',
        on_delete=models.CASCADE,
        related_name='sections'
    )
    branch = models.ForeignKey('core.AcademicBranch',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='sections'
    )
    section_name = models.CharField(max_length=100)
    section_type = models.CharField(
        max_length=50,
        choices=SECTION_TYPE_CHOICES,
        default='GENERAL_SECTION'
    )
    room_number = models.CharField(max_length=50, blank=True, default='')
    max_capacity = models.PositiveIntegerField(default=40)
    class_teacher = models.ForeignKey(
        'StaffProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_sections'
    )
    has_groups = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Whether this section supports and manages group divisions"
    )
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['student_class', 'section_name']
        verbose_name = "Class Section"
        verbose_name_plural = "Class Sections"

    def __str__(self):
        return f"{self.student_class.name} - Section {self.section_name}"


class ClassPeriodSlot(models.Model):
    SLOT_TYPE_CHOICES = (
        ('TEACHING_PERIOD', 'Teaching Period'),
        ('BREAK_TIFFIN', 'Break / Tiffin'),
        ('PRAYER_BREAK', 'Prayer Break'),
        ('MUTALA_SESSION', 'Mutala / Study Session'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='class_period_slots'
    )
    branch = models.ForeignKey('core.AcademicBranch',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='period_slots'
    )
    department = models.ForeignKey('core.AcademicDepartment',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='class_period_slots'
    )
    student_class = models.ForeignKey('core.StudentClass',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='class_period_slots'
    )
    section = models.ForeignKey('core.ClassSection',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='class_period_slots'
    )
    teacher = models.ForeignKey(
        'StaffProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_periods'
    )
    period_name = models.CharField(max_length=120)
    slot_type = models.CharField(
        max_length=50,
        choices=SLOT_TYPE_CHOICES,
        default='TEACHING_PERIOD'
    )
    period_order = models.PositiveIntegerField(default=1)
    start_time = models.TimeField()
    end_time = models.TimeField()
    duration_minutes = models.PositiveIntegerField(default=45, blank=True)
    effective_from = models.DateField(default=timezone.localdate, null=True, blank=True, db_index=True)
    effective_to = models.DateField(null=True, blank=True, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    history_log = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['period_order', 'start_time', 'period_name']
        verbose_name = "Class Period Slot"
        verbose_name_plural = "Class Period Slots"

    def save(self, *args, **kwargs):
        if self.start_time and self.end_time:
            import datetime
            t1 = datetime.datetime.combine(datetime.date.today(), self.start_time)
            t2 = datetime.datetime.combine(datetime.date.today(), self.end_time)
            if t2 < t1:
                t2 += datetime.timedelta(days=1)
            diff = (t2 - t1).total_seconds() / 60
            self.duration_minutes = max(1, int(diff))
        super().save(*args, **kwargs)
        try:
            DynamicPeriodSlot.objects.update_or_create(
                id=self.id,
                defaults={
                    'institution_id': self.institution_id,
                    'department_id': self.department_id,
                    'student_class_id': self.student_class_id,
                    'section_id': self.section_id,
                    'period_name': self.period_name,
                    'period_order': self.period_order,
                    'start_time': self.start_time,
                    'end_time': self.end_time,
                    'is_active': self.is_active,
                    'is_deleted': self.is_deleted
                }
            )
        except Exception:
            pass

    def __str__(self):
        return f"{self.period_name} ({self.start_time}-{self.end_time})"


class StudentGroup(models.Model):
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='groups'
    )
    student_class = models.ForeignKey('core.StudentClass',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='groups'
    )
    section = models.ForeignKey('core.ClassSection',
        on_delete=models.SET_NULL,
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
        if self.section:
            if not self.student_class_id and self.section.student_class_id:
                self.student_class = self.section.student_class
            if not self.institution_id and self.section.student_class and self.section.student_class.institution_id:
                self.institution = self.section.student_class.institution
        if not self.institution:
            if self.student_class and self.student_class.institution:
                self.institution = self.student_class.institution
            elif self.created_by and self.created_by.institution:
                self.institution = self.created_by.institution
        super().save(*args, **kwargs)

    def __str__(self):
        class_name = self.student_class.name if self.student_class else "No Class"
        section_info = f", Section: {self.section.section_name}" if self.section else ""
        return f"{self.name} [{class_name}{section_info}]"


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
    institution = models.ForeignKey('core.AcademicInstitution',
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
    institution = models.ForeignKey('core.AcademicInstitution',
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


class DynamicPeriodSlot(models.Model):
    SLOT_TYPE_CHOICES = (
        ('PERIOD', 'Academic Class Period'),
        ('SHIFT', 'Shift / General Attendance'),
        ('SESSION', 'Sabq / Recitation Session'),
        ('MUTALAA', 'Mutala\'a / Self Study'),
        ('BREAK', 'Tiffin / Break'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='dynamic_period_slots'
    )
    department = models.ForeignKey('core.AcademicDepartment',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dynamic_period_slots'
    )
    student_class = models.ForeignKey('core.StudentClass',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dynamic_period_slots'
    )
    section = models.ForeignKey('core.ClassSection',
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
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='teacher_routines'
    )
    teacher = models.ForeignKey('core.TeacherProfile',
        on_delete=models.CASCADE,
        related_name='routine_schedules'
    )
    period_slot = models.ForeignKey('core.DynamicPeriodSlot',
        on_delete=models.CASCADE,
        related_name='teacher_routines'
    )
    student_class = models.ForeignKey('core.StudentClass',
        on_delete=models.CASCADE,
        related_name='teacher_routines'
    )
    student_group = models.ForeignKey('core.StudentGroup',
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
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='teacher_period_attendances'
    )
    schedule = models.ForeignKey(
        TeacherRoutineSchedule,
        on_delete=models.CASCADE,
        related_name='attendance_records'
    )
    teacher = models.ForeignKey('core.TeacherProfile',
        on_delete=models.CASCADE,
        related_name='period_attendances'
    )
    substitute_teacher = models.ForeignKey('core.TeacherProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='substitute_period_attendances'
    )
    date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PRESENT')
    is_conducted = models.BooleanField(default=True)
    remarks = models.TextField(blank=True, default='')
    marked_by = models.ForeignKey('core.User',
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


class ResidentialBuilding(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='residential_buildings'
    )
    branch = models.ForeignKey('core.AcademicBranch',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='residential_buildings'
    )
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True, default='')
    total_floors = models.PositiveIntegerField(default=1)
    warden = models.ForeignKey(
        'StaffProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_buildings'
    )
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = "Residential Building"
        verbose_name_plural = "Residential Buildings"

    def __str__(self):
        return f"{self.name} ({self.code})" if self.code else self.name


class DormitoryRoom(models.Model):
    ROOM_TYPE_CHOICES = (
        ('STUDENT_DORM', 'Student Dormitory'),
        ('FACULTY_QUARTER', 'Faculty Quarter'),
        ('GUEST_ROOM', 'Guest Room'),
        ('STUDY_HALL', 'Study Hall'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    institution = models.ForeignKey('core.AcademicInstitution',
        on_delete=models.CASCADE,
        related_name='dormitory_rooms'
    )
    branch = models.ForeignKey('core.AcademicBranch',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='dormitory_rooms'
    )
    building = models.ForeignKey(
        ResidentialBuilding,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='rooms'
    )
    floor_number = models.IntegerField(default=1)
    room_number = models.CharField(max_length=50)
    room_name = models.CharField(max_length=150, blank=True, default='')
    room_type = models.CharField(
        max_length=50,
        choices=ROOM_TYPE_CHOICES,
        default='STUDENT_DORM'
    )
    max_capacity = models.PositiveIntegerField(default=10)
    supervisor = models.ForeignKey(
        'StaffProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='supervised_rooms'
    )
    prefect = models.ForeignKey(
        'core.Student',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='prefect_rooms'
    )
    amenities = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['building__name', 'floor_number', 'room_number']
        verbose_name = "Dormitory Room"
        verbose_name_plural = "Dormitory Rooms"

    def __str__(self):
        b_name = f"{self.building.name} - " if self.building else ""
        return f"{b_name}Room {self.room_number} ({self.room_name})" if self.room_name else f"{b_name}Room {self.room_number}"


class BedAllocation(models.Model):
    STATUS_CHOICES = (
        ('OCCUPIED', 'Occupied'),
        ('VACANT', 'Vacant'),
        ('RESERVED', 'Reserved'),
        ('MAINTENANCE', 'Under Maintenance'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    room = models.ForeignKey(
        DormitoryRoom,
        on_delete=models.CASCADE,
        related_name='beds'
    )
    bed_number = models.CharField(max_length=50)
    student = models.ForeignKey(
        'core.Student',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bed_allocations'
    )
    staff = models.ForeignKey(
        'StaffProfile',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bed_allocations'
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='VACANT'
    )
    assigned_date = models.DateField(default=timezone.localdate, null=True, blank=True)
    remarks = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['room', 'bed_number']
        verbose_name = "Bed Allocation"
        verbose_name_plural = "Bed Allocations"

    def __str__(self):
        return f"{self.room.room_number} - {self.bed_number} [{self.status}]"

