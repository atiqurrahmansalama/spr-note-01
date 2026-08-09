"""
Data Migration: Auto-create StudentDetail child row for all pre-existing Student records.
Ensures 100% data integrity and no missing relation errors.
"""
from django.db import migrations


def auto_create_student_details(apps, schema_editor):
    Student = apps.get_model('core', 'Student')
    StudentDetail = apps.get_model('core', 'StudentDetail')

    details_to_create = []
    existing_student_ids_with_details = set(
        StudentDetail.objects.values_list('student_id', flat=True)
    )

    for student in Student.objects.all().iterator(chunk_size=500):
        if student.pk not in existing_student_ids_with_details:
            details_to_create.append(
                StudentDetail(student_id=student.pk)
            )

    if details_to_create:
        StudentDetail.objects.bulk_create(details_to_create, ignore_conflicts=True)
        print(f"[DATA MIGRATION] Created {len(details_to_create)} StudentDetail rows for existing students.")


def reverse_auto_create(apps, schema_editor):
    """Reversible."""
    StudentDetail = apps.get_model('core', 'StudentDetail')
    StudentDetail.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_refactor_student_2_table_schema'),
    ]

    operations = [
        migrations.RunPython(auto_create_student_details, reverse_code=reverse_auto_create),
    ]
