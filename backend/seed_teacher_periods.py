import os
import sys
import django

# Setup django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datetime import time
from core.models import (
    AcademicInstitution,
    StaffProfile,
    StudentClass,
    ClassPeriodSlot,
    StudentAttendance
)

def seed_periods():
    institutions = AcademicInstitution.objects.all()
    created_count = 0

    for inst in institutions:
        inst_id = inst.id
        teachers = list(StaffProfile.objects.filter(
            institution_id=inst_id,
            is_deleted=False
        ).filter(
            staff_type='TEACHING'
        ).select_related('user', 'department'))

        if not teachers:
            teachers = list(StaffProfile.objects.filter(
                institution_id=inst_id,
                is_deleted=False
            )[:5])

        classes = list(StudentClass.objects.filter(
            institution_id=inst_id,
            is_deleted=False
        ))

        if not classes:
            classes = list(StudentClass.objects.filter(is_deleted=False)[:3])

        if not teachers or not classes:
            continue

        sample_curriculum = [
            ("Sabak (New Quranic Memorization)", time(8, 0), time(8, 45), 1),
            ("Tajweed & Makhraj Recitation", time(9, 0), time(9, 45), 2),
            ("Arabic Grammar (Nahw & Sarf)", time(10, 0), time(10, 45), 3),
            ("Hadith Studies & Islamic Adab", time(11, 0), time(11, 45), 4),
            ("Sabki & Daur Revision", time(14, 0), time(14, 45), 5),
            ("Mutala & Evening Review", time(15, 0), time(15, 45), 6),
        ]

        for t_idx, teacher in enumerate(teachers):
            # Assign 2 to 3 distinct periods per teacher
            p1_spec = sample_curriculum[(t_idx * 2) % len(sample_curriculum)]
            p2_spec = sample_curriculum[(t_idx * 2 + 1) % len(sample_curriculum)]

            assigned_class_1 = classes[t_idx % len(classes)]
            assigned_class_2 = classes[(t_idx + 1) % len(classes)]

            # Period 1
            slot1, created1 = ClassPeriodSlot.objects.update_or_create(
                institution_id=inst_id,
                teacher=teacher,
                period_order=p1_spec[3],
                defaults={
                    'period_name': p1_spec[0],
                    'student_class': assigned_class_1,
                    'department': teacher.department,
                    'start_time': p1_spec[1],
                    'end_time': p1_spec[2],
                    'slot_type': 'TEACHING_PERIOD',
                    'is_active': True,
                    'is_deleted': False
                }
            )
            if created1:
                created_count += 1

            # Period 2
            slot2, created2 = ClassPeriodSlot.objects.update_or_create(
                institution_id=inst_id,
                teacher=teacher,
                period_order=p2_spec[3],
                defaults={
                    'period_name': p2_spec[0],
                    'student_class': assigned_class_2,
                    'department': teacher.department,
                    'start_time': p2_spec[1],
                    'end_time': p2_spec[2],
                    'slot_type': 'TEACHING_PERIOD',
                    'is_active': True,
                    'is_deleted': False
                }
            )
            if created2:
                created_count += 1

    print(f"Successfully configured and seeded period slots across institutions (Created: {created_count}).")

if __name__ == '__main__':
    seed_periods()
