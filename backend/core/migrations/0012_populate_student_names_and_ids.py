"""
Data Migration: Populate missing name_en, uniq_id, roll_number, and updated_at for all existing Student rows.
Extracts original names from linked StudentDailyReport records where available.
"""
from django.db import migrations
from django.utils import timezone
import uuid


def populate_student_fields(apps, schema_editor):
    Student = apps.get_model('core', 'Student')
    StudentDailyReport = apps.get_model('core', 'StudentDailyReport')
    StudentDetail = apps.get_model('core', 'StudentDetail')

    now = timezone.now()

    # Pre-fetch names from StudentDailyReport
    report_names = {}
    for rep in StudentDailyReport.objects.exclude(student_name='').iterator():
        if rep.student_id and rep.student_name:
            if rep.student_id not in report_names:
                report_names[rep.student_id] = rep.student_name.strip()

    group_roll_counters = {}

    for student in Student.objects.all().order_by('id'):
        # 1. Populate name_en
        if not student.name_en or not str(student.name_en).strip():
            extracted_name = report_names.get(student.id)
            student.name_en = extracted_name or f"Student #{student.id}"

        # 2. Populate group_name
        if not student.group_name or not str(student.group_name).strip():
            student.group_name = "General Group"

        # 3. Populate uniq_id
        if not student.uniq_id or not str(student.uniq_id).strip():
            student.uniq_id = f"STU-{uuid.uuid4().hex[:8].upper()}"

        # 4. Populate roll_number (group-wise 1, 2, 3...)
        grp = student.group_name
        current_counter = group_roll_counters.get(grp, 0) + 1
        group_roll_counters[grp] = current_counter
        if not student.roll_number or student.roll_number <= 0:
            student.roll_number = current_counter

        # 5. Populate status & admission_date
        if not student.status:
            student.status = 'Active'

        if not student.admission_date:
            student.admission_date = timezone.now().date()

        student.updated_at = now
        student.save()

        # Ensure StudentDetail exists
        StudentDetail.objects.get_or_create(student_id=student.id)

    print(f"[DATA MIGRATION] Updated {Student.objects.count()} Student records with valid name_en, uniq_id, roll_number, and timestamps.")


def reverse_populate(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_auto_create_student_details'),
    ]

    operations = [
        migrations.RunPython(populate_student_fields, reverse_code=reverse_populate),
    ]
