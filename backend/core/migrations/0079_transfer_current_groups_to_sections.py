"""
Data Migration: Transfer Current Group Data into ClassSection (Sections) and Link All Entities.
- Maps all existing StudentGroup records to their respective ClassSection under their proper StudentClass.
- Sets StudentGroup.section to the created/matched ClassSection.
- Links all currently enrolled students with groups to their matching ClassSection.
- Leaves all student details, rolls, reports, grades, and academic records 100% untouched.
"""
from django.db import migrations
import uuid


def transfer_groups_to_sections(apps, schema_editor):
    StudentGroup = apps.get_model('core', 'StudentGroup')
    StudentClass = apps.get_model('core', 'StudentClass')
    ClassSection = apps.get_model('core', 'ClassSection')
    Student = apps.get_model('core', 'Student')
    StudentAcademicHistory = apps.get_model('core', 'StudentAcademicHistory')

    default_class = StudentClass.objects.filter(is_deleted=False).first()
    sections_created = 0
    groups_linked = 0
    students_updated = 0

    # 1. Process all existing StudentGroup records
    for grp in StudentGroup.objects.all().iterator():
        group_name = grp.name.strip() if grp.name else ""
        if not group_name:
            continue

        target_class = None
        if grp.student_class_id:
            target_class = grp.student_class

        # If group has no class assigned, discover class from assigned students
        if not target_class:
            student_with_class = Student.objects.filter(
                student_group_id=grp.id,
                student_class__isnull=False
            ).first()
            if student_with_class:
                target_class = student_with_class.student_class

        # Fallback to matching student by group_name
        if not target_class:
            student_by_name = Student.objects.filter(
                group_name=group_name,
                student_class__isnull=False
            ).first()
            if student_by_name:
                target_class = student_by_name.student_class

        if not target_class:
            target_class = default_class

        if not target_class:
            continue

        # Find or create corresponding ClassSection
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
                is_active=getattr(grp, 'is_active', True),
                is_deleted=getattr(grp, 'is_deleted', False)
            )
            sections_created += 1

        # Link group to section & ensure group student_class is set
        StudentGroup.objects.filter(pk=grp.pk).update(
            section=section_obj,
            student_class=target_class
        )
        groups_linked += 1

        # Link all students belonging to this group to the section
        affected = Student.objects.filter(
            student_group_id=grp.id
        ).update(section=section_obj)
        students_updated += affected

        # Also link students matching group name for this class
        Student.objects.filter(
            student_class=target_class,
            group_name=group_name,
            section__isnull=True
        ).update(section=section_obj)

    # 2. Final check for any remaining students with group_name but section is still null
    remaining_students = Student.objects.filter(
        section__isnull=True
    ).exclude(
        group_name__isnull=True
    ).exclude(
        group_name=''
    )

    for student in remaining_students.iterator():
        grp_name = str(student.group_name).strip()
        if not grp_name:
            continue

        target_class = student.student_class or default_class
        if not target_class:
            continue

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

        Student.objects.filter(pk=student.pk).update(section=section_obj)
        students_updated += 1

    print(f"[DATA MIGRATION 0079] Transferred current groups to sections: {groups_linked} groups linked, {sections_created} new sections created, {students_updated} student references updated.")


def rollback_transfer(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0078_backfill_historical_groups_to_sections'),
    ]

    operations = [
        migrations.RunPython(
            transfer_groups_to_sections,
            reverse_code=rollback_transfer
        ),
    ]
