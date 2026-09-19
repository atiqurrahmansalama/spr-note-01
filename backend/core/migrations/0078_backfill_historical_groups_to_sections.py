"""
Data Migration: Backfill Historical Student Group Data into ClassSection (Sections) Only.
Leaves all other student, roll, report, date, and academic data 100% untouched.
"""
from django.db import migrations
import uuid


def backfill_groups_to_sections(apps, schema_editor):
    Student = apps.get_model('core', 'Student')
    StudentClass = apps.get_model('core', 'StudentClass')
    ClassSection = apps.get_model('core', 'ClassSection')
    StudentGroup = apps.get_model('core', 'StudentGroup')

    # Filter only students who currently have NO section assigned, but have past group data
    historical_students = Student.objects.filter(
        section__isnull=True
    ).exclude(
        group_name__isnull=True,
        student_group__isnull=True
    )

    updated_count = 0
    created_sections_count = 0

    for student in historical_students.iterator():
        # Determine group name
        group_name = ""
        if student.student_group_id:
            try:
                grp = StudentGroup.objects.filter(pk=student.student_group_id).first()
                if grp and grp.name:
                    group_name = grp.name.strip()
            except Exception:
                pass

        if not group_name and student.group_name:
            group_name = str(student.group_name).strip()

        if not group_name:
            continue

        # Determine target class
        target_class = None
        if student.student_class_id:
            target_class = StudentClass.objects.filter(pk=student.student_class_id).first()

        if not target_class and student.student_group_id:
            grp = StudentGroup.objects.filter(pk=student.student_group_id).first()
            if grp and grp.student_class_id:
                target_class = StudentClass.objects.filter(pk=grp.student_class_id).first()

        # If student has no class at all, try to find a default class or create section under first active class
        if not target_class:
            target_class = StudentClass.objects.filter(is_deleted=False).first()

        if not target_class:
            continue

        # Find or create corresponding ClassSection under this class
        section_obj = ClassSection.objects.filter(
            student_class=target_class,
            section_name__iexact=group_name,
            is_deleted=False
        ).first()

        if not section_obj:
            branch_val = getattr(student, 'branch', None)
            section_obj = ClassSection.objects.create(
                id=uuid.uuid4(),
                student_class=target_class,
                section_name=group_name,
                branch=branch_val,
                section_type='GENERAL_SECTION',
                is_active=True,
                is_deleted=False
            )
            created_sections_count += 1

        # Update ONLY the section field of this student (zero modification to any other column)
        Student.objects.filter(pk=student.pk).update(section=section_obj)
        updated_count += 1

    print(f"[DATA MIGRATION 0078] Successfully mapped {updated_count} historical students into {created_sections_count} class sections. All other data untouched.")


def rollback_groups_to_sections(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0077_chartofaccount_feehead_feestructure_and_more'),
    ]

    operations = [
        migrations.RunPython(
            backfill_groups_to_sections,
            reverse_code=rollback_groups_to_sections
        ),
    ]
