from django.db import migrations
import uuid


def backfill_default_institution(apps, schema_editor):
    AcademicInstitution = apps.get_model('core', 'AcademicInstitution')
    User = apps.get_model('core', 'User')
    AcademicDepartment = apps.get_model('core', 'AcademicDepartment')
    StudentClass = apps.get_model('core', 'StudentClass')
    StudentGroup = apps.get_model('core', 'StudentGroup')
    Student = apps.get_model('core', 'Student')

    # 1. Get or create default institution
    default_inst = AcademicInstitution.objects.filter(slug='default-inst').first()
    if not default_inst:
        default_inst = AcademicInstitution.objects.create(
            name="Primary Institution",
            bangla_name="",
            slug="default-inst",
            institution_type="MADRASA",
            phone="01700000000",
            email="info@default-institution.edu",
            address="Dhaka, Bangladesh",
            district="Dhaka",
            is_verified=True,
            is_active=True,
        )

    # 2. Backfill Users (except SUPER_ADMINs who might remain global if desired, or backfill all non-superadmins)
    User.objects.filter(institution__isnull=True, is_superuser=False).update(institution=default_inst)
    
    # 3. Backfill Departments
    AcademicDepartment.objects.filter(institution__isnull=True).update(institution=default_inst)

    # 4. Backfill Classes
    StudentClass.objects.filter(institution__isnull=True).update(institution=default_inst)

    # 5. Backfill Groups
    StudentGroup.objects.filter(institution__isnull=True).update(institution=default_inst)

    # 6. Backfill Students
    Student.objects.filter(institution__isnull=True).update(institution=default_inst)


def reverse_backfill(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0033_academicinstitution_academicdepartment_institution_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill_default_institution, reverse_backfill),
    ]
