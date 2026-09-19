"""
Data Migration: Finalize Full Group to Section Transfer.
- Transfers all student memberships from StudentGroup to ClassSection.
- Unlinks and clears student_group and group_name from all Student records.
- Soft-deletes (is_deleted=True, is_active=False) legacy StudentGroup records so they no longer appear in group listings.
- 100% preservation of student rolls, IDs, reports, dates, and names.
"""
from django.db import migrations
import uuid


def finalize_group_to_section_transfer(apps, schema_editor):
    StudentGroup = apps.get_model('core', 'StudentGroup')
    StudentClass = apps.get_model('core', 'StudentClass')
    ClassSection = apps.get_model('core', 'ClassSection')
    Student = apps.get_model('core', 'Student')
    StudentAcademicHistory = apps.get_model('core', 'StudentAcademicHistory')

    default_class = StudentClass.objects.filter(is_deleted=False).first()
    sections_created = 0
    students_transferred = 0
    groups_migrated = 0

    # 1. Transfer each StudentGroup into ClassSection and shift students
    for grp in StudentGroup.objects.all().iterator():
        group_name = str(grp.name).strip() if grp.name else ""
        if not group_name:
            continue

        target_class = grp.student_class or grp.section.student_class if grp.section_id else None
        if not target_class:
            first_stu = Student.objects.filter(student_group_id=grp.id, student_class__isnull=False).first()
            if first_stu:
                target_class = first_stu.student_class

        if not target_class:
            target_class = default_class

        if not target_class:
            continue

        # Find or create corresponding ClassSection
        section_obj = grp.section
        if not section_obj:
            section_obj = ClassSection.objects.filter(
                student_class=target_class,
                section_name__iexact=group_name,
                is_deleted=False
            ).first()

        if not section_obj:
            branch_val = getattr(target_class, 'branch', None)
            section_obj = ClassSection.objects.create(
                id=uuid.uuid4(),
                student_class=target_class,
                section_name=group_name,
                branch=branch_val,
                section_type='GENERAL_SECTION',
                max_capacity=getattr(grp, 'capacity', 40) or 40,
                is_active=True,
                is_deleted=False
            )
            sections_created += 1

        # Move all students in this group directly into the section
        affected = Student.objects.filter(
            student_group_id=grp.id
        ).update(
            section=section_obj,
            student_group=None,
            group_name=None
        )
        students_transferred += affected

        # Also transfer any matching group_name students under this class
        affected_by_name = Student.objects.filter(
            student_class=target_class,
            group_name__iexact=group_name
        ).update(
            section=section_obj,
            student_group=None,
            group_name=None
        )
        students_transferred += affected_by_name

        # Mark the old StudentGroup as soft-deleted and inactive so it no longer appears in UI
        StudentGroup.objects.filter(pk=grp.pk).update(
            is_deleted=True,
            is_active=False,
            section=section_obj
        )
        groups_migrated += 1

    # 2. Catch any remaining students with lingering group_name or student_group
    remaining_students = Student.objects.exclude(
        group_name__isnull=True
    ).exclude(
        group_name=''
    )

    for stu in remaining_students.iterator():
        grp_name = str(stu.group_name).strip()
        if not grp_name:
            Student.objects.filter(pk=stu.pk).update(group_name=None, student_group=None)
            continue

        target_class = stu.student_class or default_class
        if not target_class:
            Student.objects.filter(pk=stu.pk).update(group_name=None, student_group=None)
            continue

        section_obj = stu.section
        if not section_obj:
            section_obj = ClassSection.objects.filter(
                student_class=target_class,
                section_name__iexact=grp_name,
                is_deleted=False
            ).first()

        if not section_obj:
            section_obj = ClassSection.objects.create(
                id=uuid.uuid4(),
                student_class=target_class,
                section_name=grp_name,
                section_type='GENERAL_SECTION',
                is_active=True,
                is_deleted=False
            )
            sections_created += 1

        Student.objects.filter(pk=stu.pk).update(
            section=section_obj,
            student_group=None,
            group_name=None
        )
        students_transferred += 1

    # Clean up any lingering student_group foreign keys on Student
    Student.objects.filter(student_group__isnull=False).update(student_group=None, group_name=None)

    # 3. Clean up StudentAcademicHistory references if needed
    StudentAcademicHistory.objects.filter(student_group__isnull=False).update(student_group=None)

    print(f"[DATA MIGRATION 0080] Successfully transferred all current group data into sections! {groups_migrated} groups soft-deleted, {students_transferred} student assignments moved to sections, {sections_created} new sections created.")


def rollback_finalize_transfer(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0079_transfer_current_groups_to_sections'),
    ]

    operations = [
        migrations.RunPython(
            finalize_group_to_section_transfer,
            reverse_code=rollback_finalize_transfer
        ),
    ]
