import os
import sys
import django
import datetime
import uuid

# Ensure utf-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models import (
    AcademicInstitution,
    AcademicBranch,
    AcademicDepartment,
    StudentClass,
    ClassSection,
    StudentGroup,
    ClassPeriodSlot,
    User,
    StaffProfile,
)

def run_seed():
    print("[+] Starting comprehensive Fake Data Seeding for Academy Management...")

    # 1. Institutions Data
    institutions_data = [
        {
            "name": "Jamiatus Suffah Al-Islamia",
            "bangla_name": "জামিয়াতুস সুফফাহ আল-ইসলামিয়া",
            "slug": "jamiatus-suffah",
            "institution_type": "MADRASA",
            "eiin_or_reg_no": "BEFAQ-89234",
            "phone": "+8801611722532",
            "email": "contact@jamiatussuffah.edu.bd",
            "address": "Holding 45, Sufi Road, Mirpur-10, Dhaka-1216",
            "division": "Dhaka",
            "district": "Dhaka",
            "upazila_thana": "Mirpur",
            "postal_code": "1216",
            "post_code": "1216",
            "street_address": "Sufi Complex, Sector 10, Mirpur",
            "latitude": 23.8071,
            "longitude": 90.3686,
            "is_verified": True,
            "is_active": True,
        },
        {
            "name": "Al-Hikmah International Academy & Tahfeez",
            "bangla_name": "আল-হিকমাহ ইন্টারন্যাশনাল একাডেমি ও তাহফীয",
            "slug": "al-hikmah-int",
            "institution_type": "MADRASA",
            "eiin_or_reg_no": "EIIN-138902",
            "phone": "+8801711998877",
            "email": "admin@alhikmah.edu.bd",
            "address": "Road 18, Block B, Bashundhara R/A, Dhaka-1229",
            "division": "Dhaka",
            "district": "Dhaka",
            "upazila_thana": "Vatara",
            "postal_code": "1229",
            "post_code": "1229",
            "street_address": "Plot 89, Block B, Bashundhara",
            "latitude": 23.8151,
            "longitude": 90.4255,
            "is_verified": True,
            "is_active": True,
        },
        {
            "name": "Markazul Huda Islamic Complex",
            "bangla_name": "মারকাযুল হুদা ইসলামিক কমপ্লেক্স",
            "slug": "markazul-huda",
            "institution_type": "MADRASA",
            "eiin_or_reg_no": "REG-CTG-2024-55",
            "phone": "+8801819887766",
            "email": "info@markazulhuda.org",
            "address": "GEC Circle, Nasirabad, Chittagong-4000",
            "division": "Chittagong",
            "district": "Chittagong",
            "upazila_thana": "Panchlaish",
            "postal_code": "4000",
            "post_code": "4000",
            "street_address": "Building 12, Nasirabad Road",
            "latitude": 22.3569,
            "longitude": 91.8217,
            "is_verified": True,
            "is_active": True,
        },
        {
            "name": "Darul Uloom Sylhet Model Madrasa",
            "bangla_name": "দারুল উলূম সিলেট মডেল মাদ্রাসা",
            "slug": "darul-uloom-sylhet",
            "institution_type": "MADRASA",
            "eiin_or_reg_no": "SYL-BEFAQ-4412",
            "phone": "+8801912334455",
            "email": "sylhet@darululoom.edu.bd",
            "address": "Shahjalal Uposhohor, Block E, Sylhet-3100",
            "division": "Sylhet",
            "district": "Sylhet",
            "upazila_thana": "Sylhet Sadar",
            "postal_code": "3100",
            "post_code": "3100",
            "street_address": "Main Road, Shahjalal Uposhohor",
            "latitude": 24.8949,
            "longitude": 91.8687,
            "is_verified": True,
            "is_active": True,
        },
    ]

    institutions = []
    for d in institutions_data:
        inst, created = AcademicInstitution.objects.get_or_create(
            slug=d['slug'],
            defaults=d
        )
        if not created:
            for k, v in d.items():
                setattr(inst, k, v)
            inst.save()
        institutions.append(inst)
        print(f"  [OK] Institution: {inst.name} ({inst.slug})")

    # 2. Staff & Teachers
    staff_names = [
        ("Mawlana Mahmudul Hasan", "01711000101", "Principal & Head of Hifz", "principal@suffah.edu"),
        ("Qari Nurul Islam", "01711000102", "Senior Qari & Tajweed Mentor", "qari.nurul@suffah.edu"),
        ("Mawlana Zubair Ahmed", "01711000103", "Dean of Arabic & Islamic Studies", "zubair.ahmed@suffah.edu"),
        ("Ustadh Abdur Rahman", "01711000104", "Class In-Charge & Hifz Ustadh", "abdur.rahman@suffah.edu"),
        ("Mawlana Tariq Jamil", "01711000105", "Hadith & Mutala Coordinator", "tariq.jamil@suffah.edu"),
        ("Ustadh Aminul Islam", "01711000106", "General Sciences & Math Teacher", "aminul.islam@suffah.edu"),
        ("Qari Hafizul Islam", "01711000107", "Nazira Section In-Charge", "hafizul.qari@suffah.edu"),
        ("Mawlana Imran Hossain", "01711000108", "Branch Administrator", "imran.admin@suffah.edu"),
    ]

    all_teachers = []
    for inst in institutions:
        inst_teachers = []
        for idx, (t_name, phone_prefix, desig, email) in enumerate(staff_names):
            user_phone = f"{phone_prefix[:8]}{inst.name[:2].lower()}{idx}"
            user, u_created = User.objects.get_or_create(
                phone_number=user_phone,
                defaults={
                    "name": t_name,
                    "email": f"{idx}_{email}",
                    "institution": inst,
                    "user_type": "TEACHER",
                    "is_active": True,
                }
            )
            if not u_created:
                user.name = t_name
                user.institution = inst
                user.user_type = "TEACHER"
                user.save()

            sp, _ = StaffProfile.objects.get_or_create(
                user=user,
                defaults={
                    "institution": inst,
                    "employee_id": f"EMP-{inst.slug[:3].upper()}-{100 + idx}",
                    "designation": desig,
                    "staff_type": "TEACHING",
                    "employment_status": "FULL_TIME",
                    "joining_date": datetime.date(2023, 1, 15),
                    "division": inst.division,
                    "district": inst.district,
                    "is_active": True,
                }
            )
            inst_teachers.append(user)
        all_teachers.append(inst_teachers)

    # 3. Branches, Departments, Classes, Sections, Groups, Periods per Institution
    for inst_idx, inst in enumerate(institutions):
        teachers = all_teachers[inst_idx]

        # --- A. Academic Branches (4 branches) ---
        branches_data = [
            {
                "branch_name": f"{inst.name} - Main Campus",
                "branch_code": f"MC-{inst.slug[:3].upper()}-01",
                "branch_type": "MAIN_CAMPUS",
                "contact_phone": "+8801712001122",
                "contact_email": f"main@{inst.slug}.edu.bd",
                "address": f"Plot 12, Main Central Road, {inst.district}",
                "district": inst.district,
                "division": inst.division,
            },
            {
                "branch_name": f"{inst.name} - North Noorani & Hifz Branch",
                "branch_code": f"NB-{inst.slug[:3].upper()}-02",
                "branch_type": "SUB_BRANCH",
                "contact_phone": "+8801712003344",
                "contact_email": f"north@{inst.slug}.edu.bd",
                "address": f"House 55, North Sector Road, {inst.district}",
                "district": inst.district,
                "division": inst.division,
            },
            {
                "branch_name": f"{inst.name} - Mahila & Female Campus",
                "branch_code": f"FC-{inst.slug[:3].upper()}-03",
                "branch_type": "FEMALE_BRANCH",
                "contact_phone": "+8801712005566",
                "contact_email": f"female@{inst.slug}.edu.bd",
                "address": f"Holding 88, Green Park Lane, {inst.district}",
                "district": inst.district,
                "division": inst.division,
            },
            {
                "branch_name": f"{inst.name} - Residential Complex & Boarding",
                "branch_code": f"RC-{inst.slug[:3].upper()}-04",
                "branch_type": "RESIDENTIAL_CAMPUS",
                "contact_phone": "+8801712007788",
                "contact_email": f"residential@{inst.slug}.edu.bd",
                "address": f"Dormitory Block 1-4, Suburb Hub, {inst.district}",
                "district": inst.district,
                "division": inst.division,
            },
        ]

        created_branches = []
        for b_idx, b_info in enumerate(branches_data):
            teacher_staff = None
            if hasattr(teachers[b_idx % len(teachers)], 'staff_profile'):
                teacher_staff = teachers[b_idx % len(teachers)].staff_profile

            branch, _ = AcademicBranch.objects.get_or_create(
                institution=inst,
                branch_code=b_info['branch_code'],
                defaults={
                    **b_info,
                    "is_active": True,
                    "in_charge_staff": teacher_staff,
                }
            )
            created_branches.append(branch)
        print(f"  [OK] Created {len(created_branches)} Branches for {inst.name}")

        # --- B. Academic Departments (6 departments) ---
        dept_data = [
            {
                "name": "Hifzul Quran Division",
                "code": "HIFZ",
                "has_quran_tracker": True,
                "order_rank": 1,
                "head": teachers[0],
            },
            {
                "name": "Noorani & Nazira Foundation",
                "code": "NOOR",
                "has_quran_tracker": True,
                "order_rank": 2,
                "head": teachers[1],
            },
            {
                "name": "Tajweed, Qirat & Makharaj Academy",
                "code": "TAJWEED",
                "has_quran_tracker": True,
                "order_rank": 3,
                "head": teachers[2],
            },
            {
                "name": "Kitab & Arabic Language Division",
                "code": "KITAB",
                "has_quran_tracker": False,
                "order_rank": 4,
                "head": teachers[3],
            },
            {
                "name": "General Academic, Sciences & English",
                "code": "GEN-ENG",
                "has_quran_tracker": False,
                "order_rank": 5,
                "head": teachers[5],
            },
            {
                "name": "Tahfeezul Hadith & Islamic Etiquette",
                "code": "HADITH",
                "has_quran_tracker": False,
                "order_rank": 6,
                "head": teachers[4],
            },
        ]

        created_departments = []
        for d_info in dept_data:
            dept, _ = AcademicDepartment.objects.get_or_create(
                institution=inst,
                code=d_info['code'],
                defaults={
                    "name": d_info['name'],
                    "has_quran_tracker": d_info['has_quran_tracker'],
                    "order_rank": d_info['order_rank'],
                    "department_head": d_info['head'],
                    "is_active": True,
                }
            )
            created_departments.append(dept)
        print(f"  [OK] Created {len(created_departments)} Departments for {inst.name}")

        # --- C. Student Classes (8 classes) ---
        classes_data = [
            {
                "name": "Hifz Senior - Juz 21 to 30 (Khatm Prep)",
                "code": "HIFZ-SR-01",
                "dept": created_departments[0],
                "order_rank": 1,
                "teacher": teachers[0],
            },
            {
                "name": "Hifz Intermediate - Juz 11 to 20",
                "code": "HIFZ-MID-02",
                "dept": created_departments[0],
                "order_rank": 2,
                "teacher": teachers[1],
            },
            {
                "name": "Hifz Junior - Juz 1 to 10 (Sabq Track)",
                "code": "HIFZ-JR-03",
                "dept": created_departments[0],
                "order_rank": 3,
                "teacher": teachers[3],
            },
            {
                "name": "Noorani Qaida & Basic Ampara Reading",
                "code": "NOOR-Q-01",
                "dept": created_departments[1],
                "order_rank": 4,
                "teacher": teachers[6],
            },
            {
                "name": "Nazira Fast-Track Fluency & Tajweed",
                "code": "NAZ-FT-02",
                "dept": created_departments[1],
                "order_rank": 5,
                "teacher": teachers[1],
            },
            {
                "name": "Nahw & Sarf Arabic Foundation",
                "code": "ARAB-NAHW-01",
                "dept": created_departments[3],
                "order_rank": 6,
                "teacher": teachers[2],
            },
            {
                "name": "Class 6 - General Academic & Sciences",
                "code": "CLS-06-GEN",
                "dept": created_departments[4],
                "order_rank": 7,
                "teacher": teachers[5],
            },
            {
                "name": "Class 7 - Mathematics & English Mastery",
                "code": "CLS-07-MATH",
                "dept": created_departments[4],
                "order_rank": 8,
                "teacher": teachers[5],
            },
        ]

        created_classes = []
        for c_info in classes_data:
            s_class, _ = StudentClass.objects.get_or_create(
                institution=inst,
                code=c_info['code'],
                defaults={
                    "name": c_info['name'],
                    "department": c_info['dept'],
                    "order_rank": c_info['order_rank'],
                    "class_teacher": c_info['teacher'],
                    "is_active": True,
                }
            )
            created_classes.append(s_class)
        print(f"  [OK] Created {len(created_classes)} Classes for {inst.name}")

        # --- D. Class Sections (Halqas & Sections) ---
        sections_data = [
            {
                "student_class": created_classes[0],
                "branch": created_branches[0],
                "section_name": "Halqa Abu Bakr Siddiq (RA)",
                "section_type": "HIFZ_HALQA",
                "room_number": "Hall 101 - West Wing",
                "max_capacity": 35,
            },
            {
                "student_class": created_classes[0],
                "branch": created_branches[0],
                "section_name": "Halqa Umar Farooq (RA)",
                "section_type": "HIFZ_HALQA",
                "room_number": "Hall 102 - East Wing",
                "max_capacity": 35,
            },
            {
                "student_class": created_classes[1],
                "branch": created_branches[1],
                "section_name": "Halqa Uthman Ibn Affan (RA)",
                "section_type": "HIFZ_HALQA",
                "room_number": "Room 201",
                "max_capacity": 30,
            },
            {
                "student_class": created_classes[2],
                "branch": created_branches[1],
                "section_name": "Halqa Ali Ibn Abi Talib (RA)",
                "section_type": "HIFZ_HALQA",
                "room_number": "Room 202",
                "max_capacity": 30,
            },
            {
                "student_class": created_classes[3],
                "branch": created_branches[0],
                "section_name": "Noorani Section A (Morning Rose)",
                "section_type": "GENERAL_SECTION",
                "room_number": "Room 105",
                "max_capacity": 40,
            },
            {
                "student_class": created_classes[6],
                "branch": created_branches[0],
                "section_name": "Section Alpha (Science & IT)",
                "section_type": "GENERAL_SECTION",
                "room_number": "Lab 301",
                "max_capacity": 40,
            },
            {
                "student_class": created_classes[0],
                "branch": created_branches[3],
                "section_name": "Residential Night Daur Dorm",
                "section_type": "RESIDENTIAL_DORM",
                "room_number": "Dorm Hall 401",
                "max_capacity": 25,
            },
        ]

        created_sections = []
        for s_idx, s_info in enumerate(sections_data):
            teacher_staff = None
            if hasattr(teachers[s_idx % len(teachers)], 'staff_profile'):
                teacher_staff = teachers[s_idx % len(teachers)].staff_profile

            sec, _ = ClassSection.objects.get_or_create(
                student_class=s_info['student_class'],
                section_name=s_info['section_name'],
                defaults={
                    "branch": s_info['branch'],
                    "section_type": s_info['section_type'],
                    "room_number": s_info['room_number'],
                    "max_capacity": s_info['max_capacity'],
                    "class_teacher": teacher_staff,
                    "is_active": True,
                }
            )
            created_sections.append(sec)
        print(f"  [OK] Created {len(created_sections)} Sections/Halqas for {inst.name}")

        # --- E. Student Groups (7 groups) ---
        groups_data = [
            {
                "name": "Sabq Fast-Track Mastery Group",
                "s_class": created_classes[0],
                "mentor": teachers[0],
                "capacity": 20,
            },
            {
                "name": "Sabqi Daily Daur Circle",
                "s_class": created_classes[0],
                "mentor": teachers[1],
                "capacity": 25,
            },
            {
                "name": "Manzil Long-Term Retention Group",
                "s_class": created_classes[1],
                "mentor": teachers[2],
                "capacity": 25,
            },
            {
                "name": "Tajweed Clinic & Makhraj Correction",
                "s_class": created_classes[2],
                "mentor": teachers[1],
                "capacity": 15,
            },
            {
                "name": "Noorani Ampara Reading Circle",
                "s_class": created_classes[3],
                "mentor": teachers[6],
                "capacity": 20,
            },
            {
                "name": "Arabic Grammar (Nahw) Practice Club",
                "s_class": created_classes[5],
                "mentor": teachers[2],
                "capacity": 25,
            },
            {
                "name": "Science & Mathematics Olympiad Group",
                "s_class": created_classes[6],
                "mentor": teachers[5],
                "capacity": 30,
            },
        ]

        created_groups = []
        for g_info in groups_data:
            grp, _ = StudentGroup.objects.get_or_create(
                institution=inst,
                student_class=g_info['s_class'],
                name=g_info['name'],
                defaults={
                    "mentor_teacher": g_info['mentor'],
                    "capacity": g_info['capacity'],
                    "is_active": True,
                    "created_by": teachers[0],
                }
            )
            created_groups.append(grp)
        print(f"  [OK] Created {len(created_groups)} Student Groups for {inst.name}")

        # --- F. Class Period Slots (12 rich sequential routine periods) ---
        period_slots_data = [
            {
                "period_name": "1st Period: Sabq (New Lesson Recitation)",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 1,
                "start_time": datetime.time(6, 30),
                "end_time": datetime.time(7, 30),
                "dept": created_departments[0],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "2nd Period: Sabqi (Recent Lessons Revision)",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 2,
                "start_time": datetime.time(7, 30),
                "end_time": datetime.time(8, 30),
                "dept": created_departments[0],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "Morning Breakfast & Tiffin Interval",
                "slot_type": "BREAK_TIFFIN",
                "period_order": 3,
                "start_time": datetime.time(8, 30),
                "end_time": datetime.time(9, 0),
                "dept": None,
                "s_class": None,
                "branch": None,
            },
            {
                "period_name": "3rd Period: Manzil (Long-Term Retention Routine)",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 4,
                "start_time": datetime.time(9, 0),
                "end_time": datetime.time(10, 0),
                "dept": created_departments[0],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "4th Period: Tajweed, Makhraj & Qirat Rules",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 5,
                "start_time": datetime.time(10, 0),
                "end_time": datetime.time(11, 0),
                "dept": created_departments[2],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "5th Period: Arabic Language & Nahw/Sarf",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 6,
                "start_time": datetime.time(11, 0),
                "end_time": datetime.time(12, 0),
                "dept": created_departments[3],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "6th Period: General Science & Mathematics",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 7,
                "start_time": datetime.time(12, 0),
                "end_time": datetime.time(13, 0),
                "dept": created_departments[4],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "Zuhr Salah, Sunnah Prayer & Lunch Recess",
                "slot_type": "PRAYER_BREAK",
                "period_order": 8,
                "start_time": datetime.time(13, 0),
                "end_time": datetime.time(14, 15),
                "dept": None,
                "s_class": None,
                "branch": None,
            },
            {
                "period_name": "7th Period: Hadith Reflection & Islamic Ethics",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 9,
                "start_time": datetime.time(14, 15),
                "end_time": datetime.time(15, 15),
                "dept": created_departments[5],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "8th Period: English & Mother Tongue Bangla",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 10,
                "start_time": datetime.time(15, 15),
                "end_time": datetime.time(16, 15),
                "dept": created_departments[4],
                "s_class": None,
                "branch": created_branches[0],
            },
            {
                "period_name": "Asr Prayer & Afternoon Mutala Study Session",
                "slot_type": "MUTALA_SESSION",
                "period_order": 11,
                "start_time": datetime.time(16, 15),
                "end_time": datetime.time(17, 30),
                "dept": None,
                "s_class": None,
                "branch": None,
            },
            {
                "period_name": "Maghrib Prayer & Night Daur Prep Session",
                "slot_type": "TEACHING_PERIOD",
                "period_order": 12,
                "start_time": datetime.time(17, 45),
                "end_time": datetime.time(19, 15),
                "dept": created_departments[0],
                "s_class": None,
                "branch": created_branches[3],
            },
        ]

        created_periods = []
        for p_info in period_slots_data:
            slot, _ = ClassPeriodSlot.objects.get_or_create(
                institution=inst,
                period_order=p_info['period_order'],
                defaults={
                    "period_name": p_info['period_name'],
                    "slot_type": p_info['slot_type'],
                    "start_time": p_info['start_time'],
                    "end_time": p_info['end_time'],
                    "department": p_info['dept'],
                    "student_class": p_info['s_class'],
                    "branch": p_info['branch'],
                    "is_active": True,
                }
            )
            created_periods.append(slot)
        print(f"  [OK] Created {len(created_periods)} Period Slots for {inst.name}")

    print("\n[SUCCESS] Comprehensive Fake Data Seeding Completed Successfully!")
    print(f"Total Institutions: {AcademicInstitution.objects.count()}")
    print(f"Total Branches:     {AcademicBranch.objects.count()}")
    print(f"Total Departments:  {AcademicDepartment.objects.count()}")
    print(f"Total Classes:      {StudentClass.objects.count()}")
    print(f"Total Sections:     {ClassSection.objects.count()}")
    print(f"Total Groups:       {StudentGroup.objects.count()}")
    print(f"Total Periods:      {ClassPeriodSlot.objects.count()}")
    print(f"Total Staff/Users:  {User.objects.count()}")

if __name__ == '__main__':
    run_seed()
