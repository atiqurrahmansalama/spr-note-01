import os
import django
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from core.models import AcademicInstitution, StaffProfile, GeneralStaffDetail
from core.services import StaffOnboardingService

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds Administrator StaffProfiles for all active institutions that lack one."

    def handle(self, *args, **options):
        institutions = AcademicInstitution.objects.filter(is_deleted=False)
        self.stdout.write(f"Auditing {institutions.count()} institutions for Admin Staff Profiles...")

        admin_data_map = {
            'al-hikmah-int': {'name': 'Mawlana Abdul Jabbar', 'phone': '01711000010', 'email': 'admin.alhikmah@sprnote.edu'},
            'darul-uloom-sylhet': {'name': 'Mufti Shamsuddin Ahmed', 'phone': '01711000011', 'email': 'admin.darululoom@sprnote.edu'},
            'jamiatus-suffah': {'name': 'Atiqur Rahman', 'phone': '01700000000', 'email': 'admin.suffah@sprnote.edu'},
            'markazul-huda': {'name': 'Mawlana Kazi Azizul Haque', 'phone': '01711000012', 'email': 'admin.markaz@sprnote.edu'},
            'default-inst': {'name': 'System Administrator', 'phone': '01711000013', 'email': 'admin.primary@sprnote.edu'},
        }

        created_count = 0
        for inst in institutions:
            if inst.slug == 'i':
                continue

            existing_admin_staff = StaffProfile.objects.filter(institution=inst, staff_type='ADMIN').first()
            if existing_admin_staff:
                self.stdout.write(f" - [{inst.name}] already has Admin Staff: {existing_admin_staff.employee_id}")
                continue

            cfg = admin_data_map.get(inst.slug, {
                'name': f"{inst.name} Administrator",
                'phone': f"01799{str(inst.id.int)[:6]}",
                'email': f"admin.{inst.slug[:10]}@sprnote.edu"
            })

            with transaction.atomic():
                user = User.objects.filter(phone_number=cfg['phone']).first()
                if not user:
                    user = User.objects.filter(email=cfg['email']).first()
                if not user:
                    user = User.objects.create_user(
                        phone_number=cfg['phone'],
                        email=cfg['email'],
                        name=cfg['name'],
                        password='@admin123',
                        user_type='ADMIN',
                        institution=inst,
                        is_active=True,
                    )
                else:
                    if not user.institution:
                        user.institution = inst
                        user.save()

                emp_id = StaffOnboardingService.generate_employee_id(inst, staff_type='ADMIN')
                
                # Check if user already has a staff profile in another inst
                linked_user = user if not hasattr(user, 'staff_profile') or not user.staff_profile else None

                staff = StaffProfile.objects.create(
                    institution=inst,
                    user=linked_user,
                    employee_id=emp_id,
                    staff_type='ADMIN',
                    designation='Principal & Academy Administrator' if inst.slug == 'jamiatus-suffah' else 'Academy Administrator',
                    rank_order=1,
                    employment_status='PERMANENT',
                    emergency_contact=user.phone_number,
                    address=inst.address or 'Campus Administrative Headquarters',
                    division=inst.division or 'Dhaka',
                    district=inst.district or 'Dhaka',
                    upazila_thana=inst.upazila_thana or 'Uttara',
                    is_active=True,
                )

                GeneralStaffDetail.objects.create(
                    staff=staff,
                    assigned_zone='Administration Block',
                    duty_scope='Overall academic administration, faculty leadership, and institutional management.',
                    shift_type='MORNING'
                )

                created_count += 1
                self.stdout.write(f" + [{inst.name}] created Admin Staff '{staff.employee_id}' for {cfg['name']}.")

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} Administrator Staff Profiles."))
