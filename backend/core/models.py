import uuid
import logging
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)

class User(AbstractUser):
    """
    Custom User Model for Teachers/Administrators with Email-based authentication.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    is_teacher = models.BooleanField(default=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self) -> str:
        return str(self.email)


class Student(models.Model):
    """
    Represents a Hifz student enrolled in the institution.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    teacher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="students")
    
    full_name = models.CharField(max_length=255)
    roll_number = models.CharField(max_length=50, blank=True, null=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    admission_date = models.DateField(auto_now_add=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'hifz_students'
        ordering = ['full_name']

    def __str__(self) -> str:
        return f"{self.full_name} (Roll: {self.roll_number})"


class HifzReport(models.Model):
    """
    Daily Hifz Report tracking Sabak (New Lesson), Sabak Dhor (Recent Revision), 
    and Amukhta (Grand Revision) along with mistakes and grades.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, db_index=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="reports")
    
    report_date = models.DateField(db_index=True)
    
    # Hifz Progress Fields
    sabak_para = models.CharField(max_length=100, blank=True) # যেমন: পারা ৩০ / সূরা বাকারা
    sabak_lines = models.IntegerField(default=0) # কত লাইন সবক দিয়েছে
    sabak_mistakes = models.IntegerField(default=0) # ভুল বা ওয়াকফের ভুল সংখ্যা
    
    sabak_dhor = models.CharField(max_length=100, blank=True) # সবক দোর
    amukhta_dhor = models.CharField(max_length=100, blank=True) # আমুখতা / বড় দোর
    
    # Evaluation & Remarks
    grade = models.CharField(max_length=20, choices=[
        (' ممتاز ', 'Mumtaz (Excellent)'),
        (' جيد جداً ', 'Jayyid Jiddan (Very Good)'),
        (' جيد ', 'Jayyid (Good)'),
        (' مقبول ', 'Maqbul (Passed)'),
        (' ضعيف ', 'Daiyf (Weak)'),
    ], default='ممتاز')
    
    remarks = models.TextField(blank=True) # ওস্তাদের মন্তব্য
    
    # Sync & Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = 'hifz_reports'
        indexes = [
            models.Index(fields=['student', 'report_date']),
        ]
        ordering = ['-report_date']

    def __str__(self) -> str:
        return f"Report for {self.student.full_name} on {self.report_date}"