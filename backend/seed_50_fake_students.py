import os
import sys
import random
import datetime
import uuid
import django

# Ensure utf-8 stdout on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.utils import timezone
from core.models import (
    AcademicInstitution,
    AcademicBranch,
    AcademicDepartment,
    StudentClass,
    ClassSection,
    StudentGroup,
    Student,
    StudentDetail,
    StudentGuardian,
    StudentAcademicDetail,
    User,
)

STUDENTS_DATA = [
    ("Abdullah Al Mahfuz", "আব্দুল্লাহ আল মাহফুজ", "MALE", "A+"),
    ("Muhammad Rayhan Kabir", "মুহাম্মদ রায়হান কবির", "MALE", "O+"),
    ("Tawhidur Rahman", "তৌহিদুর রহমান", "MALE", "B+"),
    ("Salman Farsi", "সালমান ফারসি", "MALE", "AB+"),
    ("Anas Ibn Malik", "আনাস ইবনে মালিক", "MALE", "O+"),
    ("Zubair Al Hasan", "যোবায়ের আল হাসান", "MALE", "A+"),
    ("Saad Ibn Abi Waqqas", "সা'দ ইবনে আবি ওয়াক্কাস", "MALE", "B+"),
    ("Yusuf Ali", "ইউসুফ আলী", "MALE", "A-"),
    ("Tanzim Hasan", "তানজিম হাসান", "MALE", "O+"),
    ("Huzaifa Islam", "হুযাইফা ইসলাম", "MALE", "AB-"),
    ("Farhan Ahmed", "ফারহান আহমেদ", "MALE", "B+"),
    ("Mustafa Kamal", "মুস্তফা কামাল", "MALE", "O+"),
    ("Nafis Fuad", "নাফিস ফুয়াদ", "MALE", "A+"),
    ("Ibrahim Khalil", "ইব্রাহিম খলিল", "MALE", "B-"),
    ("Ammar Ibn Yasir", "আম্মার ইবনে ইয়াসির", "MALE", "O+"),
    ("Bilal Hossain", "বিলাল হোসেন", "MALE", "A+"),
    ("Hamza Chowdhury", "হামজা চৌধুরী", "MALE", "B+"),
    ("Samiul Haque", "সামিউল হক", "MALE", "AB+"),
    ("Talha Ibn Ubaidullah", "তালহা ইবনে উবাইদুল্লাহ", "MALE", "O+"),
    ("Usama Bin Zaid", "উসামা বিন যায়েদ", "MALE", "A+"),
    ("Musab Ibn Umair", "মুসআব ইবনে উমাইর", "MALE", "B+"),
    ("Rashid Al Mahmud", "রশিদ আল মাহমুদ", "MALE", "O-"),
    ("Tamim Iqbal", "তামিম ইকবাল", "MALE", "A+"),
    ("Sabbir Ahmed", "সাব্বির আহমেদ", "MALE", "B+"),
    ("Nayem Islam", "নাঈম ইসলাম", "MALE", "O+"),
    ("Rifat Hasan", "রিফাত হাসান", "MALE", "AB+"),
    ("Shakirul Islam", "শাকিরুল ইসলাম", "MALE", "A+"),
    ("Akram Hossain", "আকরাম হোসেন", "MALE", "B+"),
    ("Jahidul Islam", "জাহিদুল ইসলাম", "MALE", "O+"),
    ("Sohag Mia", "সোহাগ মিয়া", "MALE", "A-"),
    ("Nazmul Huda", "নাজমুল হুদা", "MALE", "B+"),
    ("Mehedi Hasan", "মেহেদী হাসান", "MALE", "O+"),
    ("Ashraful Alam", "আশরাফুল আলম", "MALE", "A+"),
    ("Tanvir Ahmed", "তানভীর আহমেদ", "MALE", "AB+"),
    ("Kawsar Mahmud", "কাওসার মাহমুদ", "MALE", "O+"),
    ("Rashedul Karim", "রাশেদুল করিম", "MALE", "B+"),
    ("Saiful Islam", "সাইফুল ইসলাম", "MALE", "A+"),
    ("Mijanur Rahman", "মিজানুর রহমান", "MALE", "O+"),
    ("Asaduzzaman Noor", "আসাদুজ্জামান নূর", "MALE", "B-"),
    ("Arifur Rahman", "আরিফুর রহমান", "MALE", "A+"),
    ("Imran Nazir", "ইমরান নাজির", "MALE", "O+"),
    ("Monirul Islam", "মনিরুল ইসলাম", "MALE", "AB+"),
    ("Faisal Ahmed", "ফয়সাল আহমেদ", "MALE", "B+"),
    ("Shahriar Kabir", "শাহরিয়ার কবির", "MALE", "A+"),
    ("Habibur Rahman", "হাবিবুর রহমান", "MALE", "O+"),
    ("Zakir Hossain", "জাকির হোসেন", "MALE", "B+"),
    ("Motiur Rahman", "মতিউর রহমান", "MALE", "A+"),
    ("Lutfur Rahman", "লুৎফর রহমান", "MALE", "O-"),
    ("Delwar Hossain", "দেলোয়ার হোসেন", "MALE", "AB+"),
    ("Nurul Huda", "নুরুল হুদা", "MALE", "A+"),
]

FATHER_NAMES = [
    "Md. Abdul Jalil", "Md. Rafiqul Islam", "Md. Mokbul Hossain",
    "Md. Mizanur Rahman", "Md. Faruq Ahmed", "Md. Shamsul Haque",
    "Md. Delwar Hossain", "Md. Nazrul Islam", "Md. Aminul Haque",
    "Md. Shahidul Islam", "Md. Zahirul Islam", "Md. Kabir Hossain"
]

MOTHER_NAMES = [
    "Fatema Begum", "Rokeya Khatun", "Nasima Akter",
    "Salma Begum", "Rasheda Parvin", "Shahana Akter",
    "Monowara Begum", "Sultana Razia", "Rehana Akter"
]

OCCUPATIONS = [
    "Businessman", "Teacher", "Govt. Official", "Islamic Scholar / Imam",
    "Engineer", "Doctor", "Accountant", "Private Service", "Banker"
]

DISTRICTS = ["Dhaka", "Chittagong", "Sylhet", "Comilla", "Bogura", "Mymensingh", "Rajshahi", "Khulna"]

def run_seed():
    print("[+] Seeding 50 Realistic Fake Students...")

    inst = AcademicInstitution.objects.filter(slug='jamiatus-suffah').first()
    if not inst:
        inst = AcademicInstitution.objects.first()

    if not inst:
        print("[-] No institution found in database! Aborting.")
        return

    print(f"[*] Target Institution: {inst.name} ({inst.slug})")

    # Get lookups
    classes = list(StudentClass.objects.filter(institution=inst))
    groups = list(StudentGroup.objects.filter(institution=inst))
    branches = list(AcademicBranch.objects.filter(institution=inst))
    sections = list(ClassSection.objects.filter(student_class__institution=inst))
    admin_user = User.objects.filter(institution=inst).first() or User.objects.first()

    if not classes:
        print("[-] No classes found for institution. Please run academy seed first.")
        return

    created_count = 0
    for idx, (name_en, name_bn, gender, blood_group) in enumerate(STUDENTS_DATA, start=1):
        roll_no = idx
        uniq_id = f"STU-{inst.slug[:3].upper()}-{202400 + idx}"
        id_card_no = f"ID-{inst.slug[:3].upper()}-{1000 + idx}"

        assigned_class = classes[(idx - 1) % len(classes)]
        
        # Match group with class or pick any group
        class_groups = [g for g in groups if g.student_class_id == assigned_class.id]
        assigned_group = class_groups[0] if class_groups else (groups[(idx - 1) % len(groups)] if groups else None)

        # Match section with class or pick any section
        class_sections = [s for s in sections if s.student_class_id == assigned_class.id]
        assigned_section = class_sections[0] if class_sections else (sections[(idx - 1) % len(sections)] if sections else None)

        assigned_branch = assigned_section.branch if (assigned_section and assigned_section.branch) else (branches[0] if branches else None)

        # Random birth date for ages 9 - 17
        birth_year = 2024 - random.randint(9, 17)
        birth_month = random.randint(1, 12)
        birth_day = random.randint(1, 28)
        dob = datetime.date(birth_year, birth_month, birth_day)

        admission_date = datetime.date(2024, 1, random.randint(5, 25))

        f_name = random.choice(FATHER_NAMES)
        m_name = random.choice(MOTHER_NAMES)
        f_phone = f"+88017{random.randint(10000000, 99999999)}"
        m_phone = f"+88018{random.randint(10000000, 99999999)}"
        f_occ = random.choice(OCCUPATIONS)
        m_occ = "Homemaker" if random.random() > 0.3 else "Teacher"
        district = random.choice(DISTRICTS)

        student, created = Student.objects.get_or_create(
            uniq_id=uniq_id,
            defaults={
                "institution": inst,
                "roll_number": roll_no,
                "name": name_en,
                "name_en": name_en,
                "bangla_name": name_bn,
                "student_id_card_number": id_card_no,
                "student_class": assigned_class,
                "student_group": assigned_group,
                "branch": assigned_branch,
                "section": assigned_section,
                "group_name": assigned_group.name if assigned_group else "",
                "gender": gender,
                "blood_group": blood_group,
                "dob": dob,
                "admission_date": admission_date,
                "status": "Active",
                "education_status": "Enrolled",
                "target_status": "On Track",
                "birth_certificate_no": f"20{random.randint(10, 15)}2692{random.randint(1000000, 9999999)}",
                "created_by": admin_user,
            }
        )

        if not created:
            student.institution = inst
            student.roll_number = roll_no
            student.name = name_en
            student.name_en = name_en
            student.bangla_name = name_bn
            student.student_id_card_number = id_card_no
            student.student_class = assigned_class
            student.student_group = assigned_group
            student.branch = assigned_branch
            student.section = assigned_section
            student.group_name = assigned_group.name if assigned_group else ""
            student.gender = gender
            student.blood_group = blood_group
            student.dob = dob
            student.status = "Active"
            student.is_deleted = False
            student.save()

        # 1. StudentDetail
        StudentDetail.objects.update_or_create(
            student=student,
            defaults={
                "name_bn": name_bn,
                "category": "Regular",
                "date_of_birth": dob,
                "blood_group": blood_group,
                "father_name": f_name,
                "mother_name": m_name,
                "guardian_name": f_name,
                "guardian_relation": "Father",
                "guardian_phone": f_phone,
                "emergency_phone": m_phone,
                "cur_address": f"Holding {random.randint(10, 99)}, Road {random.randint(1, 15)}, Sector {random.randint(1, 14)}, Mirpur, Dhaka",
                "per_address": f"Village: Alinagar, Upazila: Sadar, District: {district}",
                "initial_completed_juz": random.randint(0, 15),
                "created_by": admin_user,
            }
        )

        # 2. StudentGuardian
        StudentGuardian.objects.update_or_create(
            student=student,
            defaults={
                "father_name": f_name,
                "father_phone": f_phone,
                "father_occupation": f_occ,
                "mother_name": m_name,
                "mother_phone": m_phone,
                "mother_occupation": m_occ,
                "primary_guardian_name": f_name,
                "primary_guardian_phone": f_phone,
                "guardian_relation": "Father",
                "emergency_contact_phone": m_phone,
                "created_by": admin_user,
            }
        )

        # 3. StudentAcademicDetail
        StudentAcademicDetail.objects.update_or_create(
            student=student,
            defaults={
                "session_year": "2024-2025",
                "class_or_group": assigned_group,
                "roll_number": str(roll_no),
                "admission_date": admission_date,
                "previous_school_name": "Baitus Salam Noorani Model Madrasa",
                "previous_school_address": f"Main Road, {district}",
                "tc_number": f"TC-2024-{random.randint(100, 999)}",
                "created_by": admin_user,
            }
        )

        created_count += 1
        if created_count % 10 == 0:
            print(f"  [OK] Processed {created_count} / 50 students...")

    print(f"\n[SUCCESS] Successfully seeded 50 Fake Students for {inst.name}!")
    print(f"Total Students in {inst.name}: {Student.objects.filter(institution=inst, is_deleted=False).count()}")
    print(f"Total Students across DB:     {Student.objects.filter(is_deleted=False).count()}")

if __name__ == '__main__':
    run_seed()
