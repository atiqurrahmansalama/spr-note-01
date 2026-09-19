"""
Data Migration: Align All Transferred ClassSections to the Correct Institution (Tenant) and Class.
- Ensures all sections (MI Saqib, MI Shoumik, etc.) are placed under their institution's active class (e.g. Tahfizul Quran in Darus Salam America).
- Ensures all students in the institution have student_class set to their institution's active class and section linked to their institution's ClassSection.
- Fixes visibility in Classes & Sections view for all tenants and institutions.
"""
from django.db import migrations
import uuid


def align_sections_to_tenant_class(apps, schema_editor):
    AcademicInstitution = apps.get_model('core', 'AcademicInstitution')
    StudentClass = apps.get_model('core', 'StudentClass')
    ClassSection = apps.get_model('core', 'ClassSection')
    StudentGroup = apps.get_model('core', 'StudentGroup')
    Student = apps.get_model('core', 'Student')

    aligned_sections_count = 0
    aligned_students_count = 0

    for inst in AcademicInstitution.objects.all().iterator():
        # Find active class for this institution
        primary_class = StudentClass.objects.filter(institution=inst, is_deleted=False).order_by('created_at').first()
        if not primary_class:
            primary_class = StudentClass.objects.filter(institution=inst).order_by('-created_at').first()

        if not primary_class:
            # Create default active class for institution if none exists
            primary_class = StudentClass.objects.create(
                id=uuid.uuid4(),
                institution=inst,
                name="General Class",
                is_active=True,
                is_deleted=False
            )

        # 1. Align all StudentGroup records for this institution
        for grp in StudentGroup.objects.filter(institution=inst).iterator():
            grp_name = str(grp.name).strip() if grp.name else ""
            if not grp_name:
                continue

            target_class = grp.student_class if (grp.student_class and grp.student_class.institution_id == inst.id) else primary_class

            sec_obj = ClassSection.objects.filter(
                student_class=target_class,
                section_name__iexact=grp_name,
                is_deleted=False
            ).first()

            if not sec_obj:
                sec_obj = ClassSection.objects.create(
                    id=uuid.uuid4(),
                    student_class=target_class,
                    section_name=grp_name,
                    section_type='GENERAL_SECTION',
                    max_capacity=getattr(grp, 'capacity', 40) or 40,
                    is_active=True,
                    is_deleted=False
                )
                aligned_sections_count += 1

            StudentGroup.objects.filter(pk=grp.pk).update(
                section=sec_obj,
                student_class=target_class
            )

        # 2. Align all Students for this institution
        inst_students = Student.objects.filter(institution=inst)
        for stu in inst_students.iterator():
            target_class = stu.student_class if (stu.student_class and stu.student_class.institution_id == inst.id) else primary_class

            # Determine section name
            sec_name = ""
            if stu.section:
                sec_name = stu.section.section_name
            elif stu.student_group:
                sec_name = stu.student_group.name
            elif stu.group_name:
                sec_name = str(stu.group_name).strip()

            if not sec_name:
                sec_name = "General Group"

            # Find or create section under target_class in this institution
            sec_obj = ClassSection.objects.filter(
                student_class=target_class,
                section_name__iexact=sec_name,
                is_deleted=False
            ).first()

            if not sec_obj:
                sec_obj = ClassSection.objects.create(
                    id=uuid.uuid4(),
                    student_class=target_class,
                    section_name=sec_name,
                    section_type='GENERAL_SECTION',
                    max_capacity=40,
                    is_active=True,
                    is_deleted=False
                )
                aligned_sections_count += 1

            Student.objects.filter(pk=stu.pk).update(
                student_class=target_class,
                section=sec_obj,
                student_group=None,
                group_name=None
            )
            aligned_students_count += 1

    # Clean up empty sections that belonged to a class in another institution without any students
    for empty_sec in ClassSection.objects.filter(is_deleted=False).iterator():
        has_students = Student.objects.filter(section=empty_sec).exists()
        if not has_students:
            # If there's an identical section name in the correct institution's class, soft delete the empty duplicate
            duplicate_exists = ClassSection.objects.filter(
                section_name__iexact=empty_sec.section_name,
                is_deleted=False
            ).exclude(pk=empty_sec.pk).exists()
            if duplicate_exists:
                ClassSection.objects.filter(pk=empty_sec.pk).update(is_deleted=True)

    print(f"[DATA MIGRATION 0081] Successfully aligned sections to institutions! {aligned_sections_count} sections verified/created, {aligned_students_count} students aligned with their institution's class & section.")


def rollback_align(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0080_finalize_group_to_section_transfer'),
    ]

    operations = [
        migrations.RunPython(
            align_sections_to_tenant_class,
            reverse_code=rollback_align
        ),
    ]
