import os, sys, django, uuid
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.models.institutions import AcademicInstitution, AcademicDepartment
from core.models.academy import StudentClass, ClassSection, ClassPeriodSlot
from core.models.students import Student
from core.models.reports import DailyLessonPlan, LessonEvaluation

sys.stdout.reconfigure(encoding='utf-8')

inst = AcademicInstitution.objects.filter(slug='jamiatus-suffah').first() or AcademicInstitution.objects.first()
print(f"Target Institution: {inst.name} ({inst.id})")

target_date = date(2026, 8, 31)

# Clean existing lessons for 2026-08-31 to ensure clean seed
DailyLessonPlan.objects.filter(institution=inst, lesson_date=target_date).delete()
print("Cleared old 2026-08-31 lessons.")

classes = {c.name.strip(): c for c in StudentClass.objects.filter(institution=inst)}
sections = {s.section_name.strip(): s for s in ClassSection.objects.filter(student_class__institution=inst)}
periods = {p.period_order: p for p in ClassPeriodSlot.objects.filter(institution=inst)}

lessons_data = [
    # Hifz Senior
    {
        'class_name': 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
        'section_name': 'Halqa Abu Bakr Siddiq (RA)',
        'period_order': 1,
        'period_name': '1st Period: Sabq (New Lesson Recitation)',
        'subject_name': 'Quran Memorization (Hifz)',
        'curriculum_book_id': 'syllabus_hifz_1',
        'curriculum_book_name': 'Quran Daily Sabaq (Para 1-10)',
        'teacher_name': 'Hafiz Qari Osman',
        'lesson_title': 'Surah Al-Kahf (Ayah 21 to 45)',
        'lesson_topic': 'Recitation with Proper Tajweed and Waqf Rules',
        'start_unit': 'Page 295',
        'end_unit': 'Page 297',
        'lesson_instructions': 'Memorize with accurate Makharij. Minimum 5 repetitions with mentor before afternoon Adai.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
        'section_name': 'Halqa Umar Farooq (RA)',
        'period_order': 2,
        'period_name': '2nd Period: Sabqi (Recent Lessons Revision)',
        'subject_name': 'Sabqi Revision',
        'curriculum_book_id': 'syllabus_hifz_3',
        'curriculum_book_name': 'Quran Sabqi (Para 1-5 Recent Revision)',
        'teacher_name': 'Hafiz Qari Osman',
        'lesson_title': 'Surah Al-Kahf (Ayah 1 to 20 Revision)',
        'lesson_topic': 'Recent Sabaq Fluent Recall and Tajweed Precision',
        'start_unit': 'Page 293',
        'end_unit': 'Page 294',
        'lesson_instructions': 'Review with partner. Ensure zero Lukmah in recitation.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
        'section_name': 'Residential Night Daur Dorm',
        'period_order': 3,
        'period_name': '3rd Period: Manzil (Long-Term Retention Routine)',
        'subject_name': 'Manzil Revision',
        'curriculum_book_id': 'syllabus_hifz_2',
        'curriculum_book_name': 'Quran Manzil (Long-Term Retention Routine)',
        'teacher_name': 'Hafiz Qari Osman',
        'lesson_title': 'Para 5: An-Nisa (Ayah 1-80)',
        'lesson_topic': 'Continuous fluent recitation of full half-para',
        'start_unit': 'Page 77',
        'end_unit': 'Page 90',
        'lesson_instructions': 'Listen carefully in groups of three. Mark any hesitations.',
        'assigned_scope': 'CLASS_WIDE',
    },
    # Hifz Intermediate
    {
        'class_name': 'Hifz Intermediate - Juz 11 to 20',
        'section_name': 'Halqa Uthman Ibn Affan (RA)',
        'period_order': 1,
        'period_name': '1st Period: Sabq (New Lesson Recitation)',
        'subject_name': 'Quran Memorization (Hifz)',
        'curriculum_book_id': 'syllabus_hifz_1',
        'curriculum_book_name': 'Quran Daily Sabaq (Para 1-10)',
        'teacher_name': 'Hafiz Qari Osman',
        'lesson_title': 'Surah Maryam (Ayah 1 to 30)',
        'lesson_topic': 'Sabaq Recitation with proper Madd & Ghunnah',
        'start_unit': 'Page 305',
        'end_unit': 'Page 307',
        'lesson_instructions': 'Practice individual recitation before teacher assessment.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Hifz Intermediate - Juz 11 to 20',
        'section_name': 'Halqa Uthman Ibn Affan (RA)',
        'period_order': 2,
        'period_name': '2nd Period: Sabqi (Recent Lessons Revision)',
        'subject_name': 'Sabqi Revision',
        'curriculum_book_id': 'syllabus_hifz_3',
        'curriculum_book_name': 'Quran Sabqi (Para 1-5 Recent Revision)',
        'teacher_name': 'Hafiz Qari Osman',
        'lesson_title': 'Surah Al-Kahf (Ayah 50-110)',
        'lesson_topic': 'Fluent recall and error-free revision',
        'start_unit': 'Page 298',
        'end_unit': 'Page 304',
        'lesson_instructions': 'Test partner for 30 minutes before submission.',
        'assigned_scope': 'CLASS_WIDE',
    },
    # Hifz Junior
    {
        'class_name': 'Hifz Junior - Juz 1 to 10 (Sabq Track)',
        'section_name': 'Halqa Ali Ibn Abi Talib (RA)',
        'period_order': 1,
        'period_name': '1st Period: Sabq (New Lesson Recitation)',
        'subject_name': 'Quran Memorization (Hifz)',
        'curriculum_book_id': 'syllabus_hifz_1',
        'curriculum_book_name': 'Quran Daily Sabaq (Para 1-10)',
        'teacher_name': 'Hafiz Qari Osman',
        'lesson_title': 'Surah Al-Baqarah (Ayah 26 to 50)',
        'lesson_topic': 'New Sabaq Memorization Track',
        'start_unit': 'Page 5',
        'end_unit': 'Page 8',
        'lesson_instructions': 'Recite 10 times with audio guide before class presentation.',
        'assigned_scope': 'CLASS_WIDE',
    },
    # Noorani Qaida
    {
        'class_name': 'Noorani Qaida & Basic Ampara Reading',
        'section_name': 'Noorani Section A (Morning Rose)',
        'period_order': 1,
        'period_name': '1st Period: Sabq (New Lesson Recitation)',
        'subject_name': 'Noorani Qaida & Pronunciation',
        'curriculum_book_id': 'syllabus_noorani_1',
        'curriculum_book_name': 'Noorani Qaida Foundation',
        'teacher_name': 'Qari Habibur Rahman',
        'lesson_title': 'Lesson 5: Tanween & Nun Sakinah Rules',
        'lesson_topic': 'Izhar, Idgham, Iqlab and Ikhfa Introduction',
        'start_unit': 'Page 15',
        'end_unit': 'Page 17',
        'lesson_instructions': 'Pronounce examples with correct nasalization and clear articulation.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Noorani Qaida & Basic Ampara Reading',
        'section_name': 'Noorani Section A (Morning Rose)',
        'period_order': 2,
        'period_name': '2nd Period: Sabqi (Recent Lessons Revision)',
        'subject_name': 'Ampara Recitation',
        'curriculum_book_id': 'syllabus_noorani_2',
        'curriculum_book_name': 'Ampara Reading & Tajweed Guide',
        'teacher_name': 'Qari Habibur Rahman',
        'lesson_title': 'Surah An-Naziat (Ayah 1-25) Tajweed Recitation',
        'lesson_topic': 'Fluent recitation with Stop and Pause markers',
        'start_unit': 'Page 583',
        'end_unit': 'Page 584',
        'lesson_instructions': 'Read in pairs with teacher supervision.',
        'assigned_scope': 'CLASS_WIDE',
    },
    # Kitab Division - Nahw & Sarf
    {
        'class_name': 'Nahw & Sarf Arabic Foundation',
        'section_name': None,
        'period_order': 4,
        'period_name': '4th Period: Tajweed, Makhraj & Qirat Rules',
        'subject_name': 'Tajweed & Qirat Rules',
        'curriculum_book_id': 'syllabus_kitab_1',
        'curriculum_book_name': 'Al-Jazariyyah in Tajweed Science',
        'teacher_name': 'Qari Habibur Rahman',
        'lesson_title': 'Al-Jazariyyah: Sifat al-Huruf (Tafkhim wa Tarqiq)',
        'lesson_topic': 'Rules of Heavy and Light Letters in Arabic',
        'start_unit': 'Page 19',
        'end_unit': 'Page 23',
        'lesson_instructions': 'Articulate each letter with exact vocal cord checks.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Nahw & Sarf Arabic Foundation',
        'section_name': None,
        'period_order': 5,
        'period_name': '5th Period: Arabic Language & Nahw/Sarf',
        'subject_name': 'Arabic Syntax (Nahw & Sarf)',
        'curriculum_book_id': 'syllabus_kitab_4',
        'curriculum_book_name': "Sharh Mi'ata Amil",
        'teacher_name': 'Maulana Mahmudul Hasan',
        'lesson_title': 'Sharh Miata Amil: Awamil Lafziyyah & Qiyasiyyah',
        'lesson_topic': 'Detailed parsing of Huruf Mushabbaha bil-Fail',
        'start_unit': 'Chapter 4, Page 53',
        'end_unit': 'Chapter 4, Page 60',
        'lesson_instructions': 'Extract 5 sentence examples from Quranic verses.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Nahw & Sarf Arabic Foundation',
        'section_name': None,
        'period_order': 7,
        'period_name': '7th Period: Hadith Reflection & Islamic Ethics',
        'subject_name': 'Hadith Studies & Islamic Ethics',
        'curriculum_book_id': 'syllabus_kitab_3',
        'curriculum_book_name': 'Mishkat al-Masabih',
        'teacher_name': 'Shaykhul Hadith Maulana Zakariya',
        'lesson_title': 'Mishkat al-Masabih: Kitab al-Salah (Hadith 556-570)',
        'lesson_topic': 'Fiqh derivation and Sunan etiquette commentary',
        'start_unit': 'Page 95',
        'end_unit': 'Page 101',
        'lesson_instructions': 'Summarize 5 primary rulings derived from Hadith.',
        'assigned_scope': 'CLASS_WIDE',
    },
    # General Academic - Class 6
    {
        'class_name': 'Class 6 - General Academic & Sciences',
        'section_name': 'Section Alpha (Science & IT)',
        'period_order': 6,
        'period_name': '6th Period: General Science & Mathematics',
        'subject_name': 'General Science & Mathematics',
        'curriculum_book_id': 'syllabus_primary_3',
        'curriculum_book_name': 'Primary Mathematics & Geometry',
        'teacher_name': 'Master Tareq Aziz',
        'lesson_title': 'Mathematics: Unit 5 Fractions & Decimals Word Problems',
        'lesson_topic': 'Practical multiplication and division of decimals',
        'start_unit': 'Page 65',
        'end_unit': 'Page 72',
        'lesson_instructions': 'Solve exercises 5.1 through 5.4 in class workbook.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Class 6 - General Academic & Sciences',
        'section_name': 'Section Alpha (Science & IT)',
        'period_order': 8,
        'period_name': '8th Period: English & Mother Tongue Bangla',
        'subject_name': 'English & Mother Tongue Bangla',
        'curriculum_book_id': 'syllabus_primary_4',
        'curriculum_book_name': 'English Grammar & Composition',
        'teacher_name': 'Professor Rafiqul Islam',
        'lesson_title': 'English: Creative Paragraph Writing & Sentence Construction',
        'lesson_topic': 'Narrative paragraph writing with connective phrases',
        'start_unit': 'Page 48',
        'end_unit': 'Page 54',
        'lesson_instructions': 'Write a 120-word composition on Daily Madrasah Schedule.',
        'assigned_scope': 'CLASS_WIDE',
    },
    # General Academic - Class 7
    {
        'class_name': 'Class 7 - Mathematics & English Mastery',
        'section_name': None,
        'period_order': 6,
        'period_name': '6th Period: General Science & Mathematics',
        'subject_name': 'Secondary Mathematics',
        'curriculum_book_id': 'syllabus_primary_3',
        'curriculum_book_name': 'Secondary Mathematics Grade 7',
        'teacher_name': 'Master Tareq Aziz',
        'lesson_title': 'Algebra: Algebraic Expressions & Polynomial Factorization',
        'lesson_topic': 'Factorization using standard algebraic identities',
        'start_unit': 'Page 82',
        'end_unit': 'Page 90',
        'lesson_instructions': 'Complete practice set 4B before tomorrow.',
        'assigned_scope': 'CLASS_WIDE',
    },
    {
        'class_name': 'Class 7 - Mathematics & English Mastery',
        'section_name': None,
        'period_order': 8,
        'period_name': '8th Period: English & Mother Tongue Bangla',
        'subject_name': 'English Grammar & Composition',
        'curriculum_book_id': 'syllabus_primary_4',
        'curriculum_book_name': 'English Grammar & Composition',
        'teacher_name': 'Professor Rafiqul Islam',
        'lesson_title': 'English Literature & Formal Letter Writing',
        'lesson_topic': 'Official application formatting and vocabulary enrichment',
        'start_unit': 'Page 55',
        'end_unit': 'Page 62',
        'lesson_instructions': 'Draft an official application to the Principal for leave of absence.',
        'assigned_scope': 'CLASS_WIDE',
    },
]

count = 0
for ld in lessons_data:
    c_obj = classes.get(ld['class_name'])
    if not c_obj:
        print(f"Skipping class {ld['class_name']}, not found in DB")
        continue
    
    s_obj = sections.get(ld['section_name']) if ld['section_name'] else None
    p_obj = periods.get(ld['period_order'])

    lesson = DailyLessonPlan.objects.create(
        institution=inst,
        academic_class=c_obj,
        section=s_obj,
        period_slot=p_obj,
        period_name=ld['period_name'],
        subject_name=ld['subject_name'],
        curriculum_book_id=ld['curriculum_book_id'],
        curriculum_book_name=ld['curriculum_book_name'],
        teacher_name=ld['teacher_name'],
        lesson_date=target_date,
        lesson_title=ld['lesson_title'],
        lesson_topic=ld['lesson_topic'],
        start_unit=ld['start_unit'],
        end_unit=ld['end_unit'],
        lesson_instructions=ld['lesson_instructions'],
        assigned_scope=ld['assigned_scope'],
        is_active=True,
    )
    count += 1

    # Also generate student evaluations for students in this class/section
    students_query = Student.objects.filter(student_class=c_obj)
    if s_obj:
        students_query = students_query.filter(section=s_obj)
    
    for st in students_query[:5]:
        LessonEvaluation.objects.create(
            lesson_plan=lesson,
            student=st,
            student_name=st.name_en or st.name or 'Student',
            evaluation_date=target_date,
            evaluation_status='MASTERED' if count % 2 == 0 else 'SATISFACTORY',
            score=9.5 if count % 2 == 0 else 8.5,
            max_score=10.0,
            total_mistakes=0 if count % 2 == 0 else 1,
            total_stucks=0 if count % 2 == 0 else 1,
            fluency_rating=5 if count % 2 == 0 else 4,
            teacher_remarks='Excellent recitation with precise tajweed' if count % 2 == 0 else 'Good recitation. Review Ayah Waqf.',
            is_synced_to_parent=True,
        )

print(f"Successfully seeded {count} lessons and evaluations for 2026-08-31 in DB!")
