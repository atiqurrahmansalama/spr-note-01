/**
 * Centralized Academic Learning, Daily Lesson, Homework & Evaluation Store
 * Supports real-time caching, offline reactivity, and multi-period analytics.
 */

const STORAGE_KEYS = {
  GOALS: 'spr_academic_goals_data',
  LESSONS: 'spr_daily_lessons_data',
  EVALUATIONS: 'spr_lesson_evaluations_data',
  HOMEWORKS: 'spr_homework_assignments_data',
};

function getStorageData(key, defaultVal = {}) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setStorageData(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
    window.dispatchEvent(new CustomEvent('spr_learning_updated'));
  } catch (err) {
    console.error('LearningStore storage error:', err);
  }
}

// Default Seed Data Generator
function generateDefaultData(tenantId = 'default') {
  const goals = [
    {
      id: `goal_1_${tenantId}`,
      tenant_id: tenantId,
      student: 'stu_1',
      student_name: 'Ahmadullah Al-Mahdi',
      student_uniq_id: 'STU-2026-001',
      subject_name: 'Quran Hifz (Para 1-30)',
      target_title: 'Complete 30 Paras Hifz Completion',
      target_type: 'SURAH_RANGE',
      start_point: 'Para 1',
      target_point: 'Para 30',
      current_progress: 'Para 18',
      progress_percentage: 60.0,
      target_daily_pace: '2 Pages / Day',
      start_date: '2026-01-01',
      target_end_date: '2026-12-31',
      status: 'ON_TRACK',
      notes: 'Fluent recitation with Tajweed rules. Consistent progress.',
    },
    {
      id: `goal_2_${tenantId}`,
      tenant_id: tenantId,
      student: 'stu_2',
      student_name: 'Mahmudur Rahman',
      student_uniq_id: 'STU-2026-002',
      subject_name: 'Arabic Grammar & Morphology',
      target_title: 'Mastery in Nahw & Sarf Rules',
      target_type: 'CHAPTER_RANGE',
      start_point: 'Chapter 1',
      target_point: 'Chapter 24',
      current_progress: 'Chapter 14',
      progress_percentage: 58.3,
      target_daily_pace: '1 Chapter / Week',
      start_date: '2026-01-15',
      target_end_date: '2026-10-30',
      status: 'ON_TRACK',
      notes: 'Completing weekly exercise assignments diligently.',
    },
  ];

  const targetDates = ['2026-08-31', '2026-08-30'];

  // Shared academic year & semester context for all seed lessons
  const SEED_ACADEMIC_YEAR_ID = 'ay_2026_2027';
  const SEED_SEMESTER_ID = 'sem_2026_2';
  const SEED_BRANCH_ID = 'branch_main';
  const SEED_DEPARTMENT_HIFZ = 'dept_hifz';
  const SEED_DEPARTMENT_KITAB = 'dept_kitab';
  const SEED_DEPARTMENT_PRIMARY = 'dept_primary';
  const SEED_DEPARTMENT_NOORANI = 'dept_noorani';

  const rawLessonTemplates = [
    // ── Hifz Senior ──
    {
      pId: 'p1',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_1',
      className: 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
      sectionId: 'sec_1',
      sectionName: 'Halqa Abu Bakr Siddiq (RA)',
      subjectName: 'Quran Memorization (Hifz)',
      bookId: 'syllabus_hifz_1',
      bookName: 'Quran Daily Sabaq (Para 1-10)',
      periodSlot: 'period_1',
      periodName: '1st Period: Sabq (New Lesson Recitation)',
      periodOrder: 1,
      periodTime: '06:30 AM - 07:30 AM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Surah Al-Kahf (Ayah 21 to 45)',
      topic: 'Recitation with Proper Tajweed and Waqf Rules',
      startUnit: 'Page 295',
      endUnit: 'Page 297',
      homework: 'Memorize Ayah 21-45 with mentor. Practice 5 times after Asr.',
      instructions: 'Memorize with accurate Makharij. Minimum 5 repetitions with mentor before afternoon Adai.',
    },
    {
      pId: 'p2',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_1',
      className: 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
      sectionId: 'sec_1',
      sectionName: 'Halqa Umar Farooq (RA)',
      subjectName: 'Sabqi Revision',
      bookId: 'syllabus_hifz_3',
      bookName: 'Quran Sabqi (Para 1-5 Recent Revision)',
      periodSlot: 'period_2',
      periodName: '2nd Period: Sabqi (Recent Lessons Revision)',
      periodOrder: 2,
      periodTime: '07:30 AM - 08:30 AM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Surah Al-Kahf (Ayah 1 to 20 Revision)',
      topic: 'Recent Sabaq Fluent Recall and Tajweed Precision',
      startUnit: 'Page 293',
      endUnit: 'Page 294',
      homework: 'Recite recent 5 pages with classmate partner.',
      instructions: 'Review with partner. Ensure zero Lukmah in recitation.',
    },
    {
      pId: 'p3',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_1',
      className: 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
      sectionId: 'sec_1',
      sectionName: 'Residential Night Daur Dorm',
      subjectName: 'Manzil Revision',
      bookId: 'syllabus_hifz_2',
      bookName: 'Quran Manzil (Long-Term Retention Routine)',
      periodSlot: 'period_3',
      periodName: '3rd Period: Manzil (Long-Term Retention Routine)',
      periodOrder: 3,
      periodTime: '09:00 AM - 10:00 AM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Para 5: An-Nisa (Ayah 1-80)',
      topic: 'Continuous fluent recitation of full half-para',
      startUnit: 'Page 77',
      endUnit: 'Page 90',
      homework: 'Complete full Para 5 recitation before evening Daur.',
      instructions: 'Listen carefully in groups of three. Mark any hesitations.',
    },
    {
      pId: 'p9',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_1',
      className: 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
      sectionId: 'sec_1',
      sectionName: 'Halqa Abu Bakr Siddiq (RA)',
      subjectName: 'Afternoon Mutala & Self-Study',
      bookId: 'syllabus_hifz_1',
      bookName: 'Quran Daily Sabaq (Para 1-10)',
      periodSlot: 'period_9',
      periodName: 'Asr Prayer & Afternoon Mutala Study Session',
      periodOrder: 9,
      periodTime: '04:15 PM - 05:30 PM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Guided Self-Revision & Homework Completion',
      topic: 'Deep concentration memorization circle',
      startUnit: 'Unit Notes',
      endUnit: 'Review',
      homework: 'Verify all diary entries before Maghrib prayer.',
      instructions: 'Maintain silence. Focus on weaker verses.',
    },
    {
      pId: 'p10',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_1',
      className: 'Hifz Senior - Juz 21 to 30 (Khatm Prep)',
      sectionId: 'sec_1',
      sectionName: 'Residential Night Daur Dorm',
      subjectName: 'Night Daur Recitation',
      bookId: 'syllabus_hifz_2',
      bookName: 'Quran Manzil (Long-Term Retention Routine)',
      periodSlot: 'period_10',
      periodName: 'Maghrib Prayer & Night Daur Prep Session',
      periodOrder: 10,
      periodTime: '05:45 PM - 07:15 PM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Nightly Daur: Juz 1 to 5',
      topic: 'Continuous fluent recitation with lead Qari',
      startUnit: 'Para 1',
      endUnit: 'Para 5',
      homework: 'Prepare next 2 paras for tomorrow morning Daur.',
      instructions: 'Speed recitation with clear articulation and Waqf compliance.',
    },

    // ── Hifz Intermediate ──
    {
      pId: 'hifz_int_p1',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_hifz_int',
      className: 'Hifz Intermediate - Juz 11 to 20',
      sectionId: 'sec_hifz_int',
      sectionName: 'Halqa Uthman Ibn Affan (RA)',
      subjectName: 'Quran Memorization (Hifz)',
      bookId: 'syllabus_hifz_1',
      bookName: 'Quran Daily Sabaq (Para 1-10)',
      periodSlot: 'period_1',
      periodName: '1st Period: Sabq (New Lesson Recitation)',
      periodOrder: 1,
      periodTime: '06:30 AM - 07:30 AM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Surah Maryam (Ayah 1 to 30)',
      topic: 'Sabaq Recitation with proper Madd & Ghunnah',
      startUnit: 'Page 305',
      endUnit: 'Page 307',
      homework: 'Memorize Ayah 1-30. Repeat 5 times with partner.',
      instructions: 'Practice individual recitation before teacher assessment.',
    },
    {
      pId: 'hifz_int_p2',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_hifz_int',
      className: 'Hifz Intermediate - Juz 11 to 20',
      sectionId: 'sec_hifz_int',
      sectionName: 'Halqa Uthman Ibn Affan (RA)',
      subjectName: 'Sabqi Revision',
      bookId: 'syllabus_hifz_3',
      bookName: 'Quran Sabqi (Para 1-5 Recent Revision)',
      periodSlot: 'period_2',
      periodName: '2nd Period: Sabqi (Recent Lessons Revision)',
      periodOrder: 2,
      periodTime: '07:30 AM - 08:30 AM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Surah Al-Kahf (Ayah 50-110)',
      topic: 'Fluent recall and error-free revision',
      startUnit: 'Page 298',
      endUnit: 'Page 304',
      homework: 'Review 5 pages with partner before evening Daur.',
      instructions: 'Test partner for 30 minutes before submission.',
    },

    // ── Hifz Junior ──
    {
      pId: 'hifz_jun_p1',
      deptId: SEED_DEPARTMENT_HIFZ,
      deptName: 'Hifzul Quran Division',
      classId: 'cls_hifz_jun',
      className: 'Hifz Junior - Juz 1 to 10 (Sabq Track)',
      sectionId: 'sec_hifz_jun',
      sectionName: 'Halqa Ali Ibn Abi Talib (RA)',
      subjectName: 'Quran Memorization (Hifz)',
      bookId: 'syllabus_hifz_1',
      bookName: 'Quran Daily Sabaq (Para 1-10)',
      periodSlot: 'period_1',
      periodName: '1st Period: Sabq (New Lesson Recitation)',
      periodOrder: 1,
      periodTime: '06:30 AM - 07:30 AM',
      teacherName: 'Hafiz Qari Osman',
      title: 'Surah Al-Baqarah (Ayah 26 to 50)',
      topic: 'New Sabaq Memorization Track',
      startUnit: 'Page 5',
      endUnit: 'Page 8',
      homework: 'Practice Ayah 26-50 with audio recitation.',
      instructions: 'Recite 10 times with audio guide before class presentation.',
    },

    // ── Noorani Qaida ──
    {
      pId: 'noorani_p1',
      deptId: SEED_DEPARTMENT_NOORANI,
      deptName: 'Noorani & Nazira Foundation',
      classId: 'cls_noorani',
      className: 'Noorani Qaida & Basic Ampara Reading',
      sectionId: 'sec_noorani',
      sectionName: 'Noorani Section A (Morning Rose)',
      subjectName: 'Noorani Qaida & Pronunciation',
      bookId: 'syllabus_noorani_1',
      bookName: 'Noorani Qaida Foundation',
      periodSlot: 'period_1',
      periodName: '1st Period: Sabq (New Lesson Recitation)',
      periodOrder: 1,
      periodTime: '08:00 AM - 08:45 AM',
      teacherName: 'Qari Habibur Rahman',
      title: 'Lesson 5: Tanween & Nun Sakinah Rules',
      topic: 'Izhar, Idgham, Iqlab and Ikhfa Introduction',
      startUnit: 'Page 15',
      endUnit: 'Page 17',
      homework: 'Read lesson 5 aloud 3 times with parent.',
      instructions: 'Pronounce examples with correct nasalization and clear articulation.',
    },
    {
      pId: 'noorani_p2',
      deptId: SEED_DEPARTMENT_NOORANI,
      deptName: 'Noorani & Nazira Foundation',
      classId: 'cls_noorani',
      className: 'Noorani Qaida & Basic Ampara Reading',
      sectionId: 'sec_noorani',
      sectionName: 'Noorani Section A (Morning Rose)',
      subjectName: 'Ampara Recitation',
      bookId: 'syllabus_noorani_2',
      bookName: 'Ampara Reading & Tajweed Guide',
      periodSlot: 'period_2',
      periodName: '2nd Period: Sabqi (Recent Lessons Revision)',
      periodOrder: 2,
      periodTime: '09:00 AM - 09:45 AM',
      teacherName: 'Qari Habibur Rahman',
      title: 'Surah An-Naziat (Ayah 1-25) Tajweed Recitation',
      topic: 'Fluent recitation with Stop and Pause markers',
      startUnit: 'Page 583',
      endUnit: 'Page 584',
      homework: 'Practice Surah An-Naziat with proper stopping rules.',
      instructions: 'Read in pairs with teacher supervision.',
    },

    // ── Kitab & Arabic Language Division ──
    {
      pId: 'kitab_p4',
      deptId: SEED_DEPARTMENT_KITAB,
      deptName: 'Kitab & Arabic Language Division',
      classId: 'cls_2',
      className: 'Nahw & Sarf Arabic Foundation',
      sectionId: 'sec_2',
      sectionName: 'Section 1',
      subjectName: 'Tajweed & Qirat Rules',
      bookId: 'syllabus_kitab_1',
      bookName: 'Al-Jazariyyah in Tajweed Science',
      periodSlot: 'period_4',
      periodName: '4th Period: Tajweed, Makhraj & Qirat Rules',
      periodOrder: 4,
      periodTime: '10:00 AM - 11:00 AM',
      teacherName: 'Qari Habibur Rahman',
      title: 'Al-Jazariyyah: Sifat al-Huruf (Tafkhim wa Tarqiq)',
      topic: 'Rules of Heavy and Light Letters in Arabic',
      startUnit: 'Page 19',
      endUnit: 'Page 23',
      homework: 'Memorize lines 25-35 of Mandhumat al-Jazariyyah.',
      instructions: 'Articulate each letter with exact vocal cord checks.',
    },
    {
      pId: 'kitab_p5',
      deptId: SEED_DEPARTMENT_KITAB,
      deptName: 'Kitab & Arabic Language Division',
      classId: 'cls_2',
      className: 'Nahw & Sarf Arabic Foundation',
      sectionId: 'sec_2',
      sectionName: 'Section 1',
      subjectName: 'Arabic Syntax (Nahw & Sarf)',
      bookId: 'syllabus_kitab_4',
      bookName: "Sharh Mi'ata Amil",
      periodSlot: 'period_5',
      periodName: '5th Period: Arabic Language & Nahw/Sarf',
      periodOrder: 5,
      periodTime: '11:00 AM - 12:00 PM',
      teacherName: 'Maulana Mahmudul Hasan',
      title: 'Sharh Miata Amil: Awamil Lafziyyah & Qiyasiyyah',
      topic: 'Detailed parsing of Huruf Mushabbaha bil-Fail',
      startUnit: 'Chapter 4, Page 53',
      endUnit: 'Chapter 4, Page 60',
      homework: 'Extract 5 sentence parsing examples from Quranic verses.',
      instructions: 'Analyze practical I\'rab examples from Quranic verses.',
    },
    {
      pId: 'kitab_p7',
      deptId: SEED_DEPARTMENT_KITAB,
      deptName: 'Kitab & Arabic Language Division',
      classId: 'cls_2',
      className: 'Nahw & Sarf Arabic Foundation',
      sectionId: 'sec_2',
      sectionName: 'Section 1',
      subjectName: 'Hadith Studies & Islamic Ethics',
      bookId: 'syllabus_kitab_3',
      bookName: 'Mishkat al-Masabih',
      periodSlot: 'period_7',
      periodName: '7th Period: Hadith Reflection & Islamic Ethics',
      periodOrder: 7,
      periodTime: '02:15 PM - 03:15 PM',
      teacherName: 'Shaykhul Hadith Maulana Zakariya',
      title: 'Mishkat al-Masabih: Kitab al-Salah (Hadith 556-570)',
      topic: 'Fiqh derivation and Sunan etiquette commentary',
      startUnit: 'Page 95',
      endUnit: 'Page 101',
      homework: 'Summarize 5 primary rulings derived from Hadith.',
      instructions: 'Analyze linguistic nuances and Matn variations across Sunan collections.',
    },

    // ── Class 6 ──
    {
      pId: 'cls6_p6',
      deptId: SEED_DEPARTMENT_PRIMARY,
      deptName: 'General Academic, Sciences & English',
      classId: 'cls_3',
      className: 'Class 6 - General Academic & Sciences',
      sectionId: 'sec_3',
      sectionName: 'Section Alpha (Science & IT)',
      subjectName: 'General Science & Mathematics',
      bookId: 'syllabus_primary_3',
      bookName: 'Primary Mathematics & Geometry',
      periodSlot: 'period_6',
      periodName: '6th Period: General Science & Mathematics',
      periodOrder: 6,
      periodTime: '12:00 PM - 01:00 PM',
      teacherName: 'Master Tareq Aziz',
      title: 'Mathematics: Unit 5 Fractions & Decimals Word Problems',
      topic: 'Practical multiplication and division of decimals',
      startUnit: 'Page 65',
      endUnit: 'Page 72',
      homework: 'Solve Exercises 5.1 to 5.4 in workbook.',
      instructions: 'Solve exercises in class workbook with steps.',
    },
    {
      pId: 'cls6_p8',
      deptId: SEED_DEPARTMENT_PRIMARY,
      deptName: 'General Academic, Sciences & English',
      classId: 'cls_3',
      className: 'Class 6 - General Academic & Sciences',
      sectionId: 'sec_3',
      sectionName: 'Section Alpha (Science & IT)',
      subjectName: 'English & Mother Tongue Bangla',
      bookId: 'syllabus_primary_4',
      bookName: 'English Grammar & Composition',
      periodSlot: 'period_8',
      periodName: '8th Period: English & Mother Tongue Bangla',
      periodOrder: 8,
      periodTime: '03:15 PM - 04:15 PM',
      teacherName: 'Professor Rafiqul Islam',
      title: 'English: Creative Paragraph Writing & Sentence Construction',
      topic: 'Narrative paragraph writing with connective phrases',
      startUnit: 'Page 48',
      endUnit: 'Page 54',
      homework: 'Write a 120-word composition on Daily Madrasah Schedule.',
      instructions: 'Pair speaking practice followed by written paragraph review.',
    },

    // ── Class 7 ──
    {
      pId: 'cls7_p6',
      deptId: SEED_DEPARTMENT_PRIMARY,
      deptName: 'General Academic, Sciences & English',
      classId: 'cls_7',
      className: 'Class 7 - Mathematics & English Mastery',
      sectionId: 'sec_7',
      sectionName: 'Section Alpha',
      subjectName: 'Secondary Mathematics',
      bookId: 'syllabus_primary_3',
      bookName: 'Secondary Mathematics Grade 7',
      periodSlot: 'period_6',
      periodName: '6th Period: General Science & Mathematics',
      periodOrder: 6,
      periodTime: '12:00 PM - 01:00 PM',
      teacherName: 'Master Tareq Aziz',
      title: 'Algebra: Algebraic Expressions & Polynomial Factorization',
      topic: 'Factorization using standard algebraic identities',
      startUnit: 'Page 82',
      endUnit: 'Page 90',
      homework: 'Complete practice set 4B before tomorrow.',
      instructions: 'Complete practice set 4B with step-by-step proofs.',
    },
    {
      pId: 'cls7_p8',
      deptId: SEED_DEPARTMENT_PRIMARY,
      deptName: 'General Academic, Sciences & English',
      classId: 'cls_7',
      className: 'Class 7 - Mathematics & English Mastery',
      sectionId: 'sec_7',
      sectionName: 'Section Alpha',
      subjectName: 'English Grammar & Composition',
      bookId: 'syllabus_primary_4',
      bookName: 'English Grammar & Composition',
      periodSlot: 'period_8',
      periodName: '8th Period: English & Mother Tongue Bangla',
      periodOrder: 8,
      periodTime: '03:15 PM - 04:15 PM',
      teacherName: 'Professor Rafiqul Islam',
      title: 'English Literature & Formal Letter Writing',
      topic: 'Official application formatting and vocabulary enrichment',
      startUnit: 'Page 55',
      endUnit: 'Page 62',
      homework: 'Draft an official application to the Principal for leave of absence.',
      instructions: 'Format official letters according to international business styles.',
    },
  ];

  const lessons = [];
  const evaluations = [];
  const homeworks = [];

  targetDates.forEach((tDate) => {
    rawLessonTemplates.forEach((t) => {
      const lessonId = `lesson_${t.pId}_${tenantId}_${tDate}`;
      lessons.push({
        id: lessonId,
        tenant_id: tenantId,
        academic_year_id: SEED_ACADEMIC_YEAR_ID,
        semester_id: SEED_SEMESTER_ID,
        branch_id: SEED_BRANCH_ID,
        department_id: t.deptId,
        department_name: t.deptName,
        academic_class: t.classId,
        class_name: t.className,
        section: t.sectionId,
        section_name: t.sectionName,
        subject_name: t.subjectName,
        curriculum_book_id: t.bookId,
        curriculum_book_name: t.bookName,
        period_slot: t.periodSlot,
        period_name: t.periodName,
        period_order: t.periodOrder,
        period_time: t.periodTime,
        teacher_name: t.teacherName,
        lesson_date: tDate,
        lesson_title: t.title,
        lesson_topic: t.topic,
        start_unit: t.startUnit,
        end_unit: t.endUnit,
        homework_task: t.homework,
        lesson_instructions: t.instructions,
        assigned_scope: 'CLASS_WIDE',
        attachment_url: '',
        is_active: true,
        created_at: new Date().toISOString(),
      });

      // Add student evaluations for this lesson
      const studentProfiles = [
        { id: 'stu_1', name: 'Muhammad Rayhan Kabir', roll: 'STU-JAM-202402' },
        { id: 'stu_2', name: 'Mustafa Kamal', roll: 'STU-JAM-202412' },
        { id: 'stu_3', name: 'Rashid Al Mahmud', roll: 'STU-JAM-202422' },
        { id: 'stu_4', name: 'Salman Farsi', roll: 'STU-JAM-202404' },
        { id: 'stu_5', name: 'Anas Ibn Malik', roll: 'STU-JAM-202405' },
      ];

      studentProfiles.forEach((st, idx) => {
        evaluations.push({
          id: `eval_${t.pId}_${st.id}_${tenantId}_${tDate}`,
          tenant_id: tenantId,
          lesson_plan: lessonId,
          student: st.id,
          student_name: st.name,
          student_uniq_id: st.roll,
          student_class_name: t.className,
          section_name: t.sectionName,
          curriculum_book_id: t.bookId,
          curriculum_book_name: t.bookName,
          subject_name: t.subjectName,
          lesson_covered: t.title,
          start_unit: t.startUnit,
          end_unit: t.endUnit,
          period_slot: t.periodSlot,
          period_order: t.periodOrder,
          period_name: t.periodName,
          evaluation_date: tDate,
          evaluation_status: idx % 2 === 0 ? 'MASTERED' : 'SATISFACTORY',
          score: idx % 2 === 0 ? 10.0 : 8.5,
          recitation_score: idx % 2 === 0 ? 10.0 : 8.5,
          homework_score: idx % 2 === 0 ? 10.0 : 9.0,
          max_score: 10.0,
          total_mistakes: idx % 2 === 0 ? 0 : 1,
          total_stucks: idx % 2 === 0 ? 0 : 1,
          fluency_rating: idx % 2 === 0 ? 5 : 4,
          teacher_remarks: idx % 2 === 0 ? 'Excellent recitation with crisp Tajweed and precision.' : 'Good effort. Review Ayah pauses and Waqf.',
          is_synced_to_parent: true,
        });
      });

      // Add sample homework
      if (t.pId === 'p1' || t.pId === 'kitab_p4') {
        homeworks.push({
          id: `hw_${t.pId}_${tenantId}_${tDate}`,
          tenant_id: tenantId,
          lesson_plan: lessonId,
          academic_class: t.classId,
          class_name: t.className,
          section_name: t.sectionName,
          subject_name: t.subjectName,
          teacher_name: t.teacherName,
          title: `${t.subjectName} Academic Homework`,
          description: t.homework,
          assigned_date: tDate,
          due_date: tDate,
          due_time: '20:30',
          max_marks: 10.0,
          submission_type: 'WRITTEN_TEXT',
          is_active: true,
          created_at: new Date().toISOString(),
        });
      }
    });
  });

  return { goals, lessons, evaluations, homeworks };
}

export const learningStore = {
  // ─── Academic Goals ────────────────────────────────────────────────────────
  getGoals(tenantId = 'default') {
    const all = getStorageData(STORAGE_KEYS.GOALS);
    if (!all[tenantId]) {
      const seeded = generateDefaultData(tenantId);
      all[tenantId] = seeded.goals;
      setStorageData(STORAGE_KEYS.GOALS, all);
    }
    return all[tenantId] || [];
  },

  saveGoal(tenantId = 'default', goalData) {
    const all = getStorageData(STORAGE_KEYS.GOALS);
    const list = all[tenantId] || [];

    let updated;
    if (goalData.id) {
      updated = list.map((g) => (g.id === goalData.id ? { ...g, ...goalData, updated_at: new Date().toISOString() } : g));
    } else {
      const newGoal = {
        ...goalData,
        id: `goal_${Date.now()}`,
        tenant_id: tenantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updated = [newGoal, ...list];
    }

    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.GOALS, all);
    return updated;
  },

  updateGoalProgress(tenantId = 'default', goalId, currentProgress, notes = '') {
    const all = getStorageData(STORAGE_KEYS.GOALS);
    const list = all[tenantId] || [];

    const updated = list.map((g) => {
      if (g.id === goalId) {
        let pct = g.progress_percentage;
        try {
          const cur = parseFloat(currentProgress);
          const tgt = parseFloat(g.target_point);
          pct = tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : g.progress_percentage;
        } catch {}

        return {
          ...g,
          current_progress: String(currentProgress),
          progress_percentage: pct,
          status: pct >= 100 ? 'COMPLETED' : g.status,
          notes: notes || g.notes,
          updated_at: new Date().toISOString(),
        };
      }
      return g;
    });

    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.GOALS, all);
    return updated;
  },

  deleteGoal(tenantId = 'default', goalId) {
    const all = getStorageData(STORAGE_KEYS.GOALS);
    const list = all[tenantId] || [];
    all[tenantId] = list.filter((g) => g.id !== goalId);
    setStorageData(STORAGE_KEYS.GOALS, all);
  },

  // ─── Daily Lesson Plans ──────────────────────────────────────────────────
  getDailyLessons(tenantId = 'default') {
    const all = getStorageData(STORAGE_KEYS.LESSONS);
    const seeded = generateDefaultData(tenantId);
    const SEED_VERSION = 'v3_2026_08_30_aligned_perfect';

    if (!all[tenantId] || all[tenantId].length === 0 || all[`${tenantId}_version`] !== SEED_VERSION) {
      const existing = all[tenantId] || [];
      const userCustom = existing.filter((l) => !l.id?.startsWith('lesson_p'));
      all[tenantId] = [...seeded.lessons, ...userCustom];
      all[`${tenantId}_version`] = SEED_VERSION;
      setStorageData(STORAGE_KEYS.LESSONS, all);
    }

    if (tenantId === 'ALL') {
      const allLessonsMap = new Map();
      Object.keys(all).forEach((tKey) => {
        if (!tKey.endsWith('_version') && Array.isArray(all[tKey])) {
          all[tKey].forEach((l) => {
            if (l && l.id) allLessonsMap.set(l.id, l);
          });
        }
      });
      if (allLessonsMap.size > 0) {
        return Array.from(allLessonsMap.values());
      }
      return seeded.lessons;
    }

    return all[tenantId] || [];
  },

  saveDailyLesson(tenantId = 'default', lessonData) {
    const all = getStorageData(STORAGE_KEYS.LESSONS);
    const list = all[tenantId] || [];

    const existingIdx = list.findIndex((l) => l.id === lessonData.id);
    let updated;
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = {
        ...updated[existingIdx],
        ...lessonData,
        updated_at: new Date().toISOString(),
      };
    } else {
      const newLesson = {
        ...lessonData,
        id: lessonData.id || `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenant_id: tenantId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updated = [newLesson, ...list];
    }

    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.LESSONS, all);
    return updated;
  },

  deleteDailyLesson(tenantId = 'default', lessonId) {
    const all = getStorageData(STORAGE_KEYS.LESSONS);
    if (Array.isArray(all[tenantId])) {
      all[tenantId] = all[tenantId].filter((l) => String(l.id) !== String(lessonId));
    }
    setStorageData(STORAGE_KEYS.LESSONS, all);
  },

  cloneDailyLesson(tenantId = 'default', lessonId, targetDate, overrides = {}) {
    const all = getStorageData(STORAGE_KEYS.LESSONS);
    const list = all[tenantId] || [];
    const source = list.find((l) => l.id === lessonId);
    if (!source) return null;

    const cloned = {
      ...source,
      ...overrides,
      id: `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      tenant_id: tenantId,
      lesson_date: targetDate,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updated = [cloned, ...list];
    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.LESSONS, all);
    return cloned;
  },

  copyLessonsFromDate(tenantId = 'default', sourceDate, targetDate, selectedLessonIds = null, classFilter = null) {
    const all = getStorageData(STORAGE_KEYS.LESSONS);
    const list = all[tenantId] || [];

    let sources = list.filter((l) => l.lesson_date === sourceDate);
    if (classFilter && classFilter !== 'ALL') {
      sources = sources.filter((l) => String(l.academic_class) === String(classFilter));
    }
    if (Array.isArray(selectedLessonIds) && selectedLessonIds.length > 0) {
      const idSet = new Set(selectedLessonIds);
      sources = sources.filter((l) => idSet.has(l.id));
    }
    if (sources.length === 0) return [];

    const newClones = sources.map((s, idx) => ({
      ...s,
      id: `lesson_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      tenant_id: tenantId,
      lesson_date: targetDate,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const updated = [...newClones, ...list];
    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.LESSONS, all);
    return newClones;
  },

  // ─── Lesson Evaluations ──────────────────────────────────────────────────
  getEvaluations(tenantId = 'default') {
    const all = getStorageData(STORAGE_KEYS.EVALUATIONS);
    const seeded = generateDefaultData(tenantId);
    const SEED_VERSION = 'v3_2026_08_30_aligned_perfect';

    if (!all[tenantId] || all[tenantId].length === 0 || all[`${tenantId}_version`] !== SEED_VERSION) {
      const existing = all[tenantId] || [];
      const userCustom = existing.filter((e) => !e.id?.startsWith('eval_1_') && !e.id?.startsWith('eval_2_') && !e.id?.startsWith('eval_3_') && !e.id?.startsWith('eval_4_') && !e.id?.startsWith('eval_5_') && !e.id?.startsWith('eval_6_') && !e.id?.startsWith('eval_7_') && !e.id?.startsWith('eval_8_') && !e.id?.startsWith('eval_9_') && !e.id?.startsWith('eval_10_'));
      all[tenantId] = [...seeded.evaluations, ...userCustom];
      all[`${tenantId}_version`] = SEED_VERSION;
      setStorageData(STORAGE_KEYS.EVALUATIONS, all);
    }

    if (tenantId === 'ALL') {
      const allEvalsMap = new Map();
      Object.keys(all).forEach((tKey) => {
        if (!tKey.endsWith('_version') && Array.isArray(all[tKey])) {
          all[tKey].forEach((e) => {
            if (e && e.id) allEvalsMap.set(e.id, e);
          });
        }
      });
      if (allEvalsMap.size > 0) {
        return Array.from(allEvalsMap.values());
      }
      return seeded.evaluations;
    }

    return all[tenantId] || [];
  },

  saveEvaluation(tenantId = 'default', evalData) {
    const all = getStorageData(STORAGE_KEYS.EVALUATIONS);
    const list = all[tenantId] || [];

    const existingIdx = list.findIndex(
      (e) => (evalData.id && e.id === evalData.id) || (evalData.lesson_plan && e.lesson_plan === evalData.lesson_plan && String(e.student) === String(evalData.student))
    );

    let updated;
    if (existingIdx >= 0) {
      updated = [...list];
      updated[existingIdx] = {
        ...updated[existingIdx],
        ...evalData,
        updated_at: new Date().toISOString(),
      };
    } else {
      const newEval = {
        ...evalData,
        id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        tenant_id: tenantId,
        is_synced_to_parent: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updated = [newEval, ...list];
    }

    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.EVALUATIONS, all);
    return updated;
  },

  bulkEvaluateLesson(tenantId = 'default', lessonId, evaluationsList) {
    const all = getStorageData(STORAGE_KEYS.EVALUATIONS);
    let list = all[tenantId] || [];

    evaluationsList.forEach((item) => {
      const existingIdx = list.findIndex(
        (e) => e.lesson_plan === lessonId && String(e.student) === String(item.student)
      );

      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...item,
          lesson_plan: lessonId,
          is_synced_to_parent: true,
          updated_at: new Date().toISOString(),
        };
      } else {
        list.push({
          ...item,
          id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          tenant_id: tenantId,
          lesson_plan: lessonId,
          is_synced_to_parent: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    all[tenantId] = list;
    setStorageData(STORAGE_KEYS.EVALUATIONS, all);
    return list;
  },

  deleteEvaluation(tenantId = 'default', evalId) {
    const all = getStorageData(STORAGE_KEYS.EVALUATIONS);
    if (Array.isArray(all[tenantId])) {
      all[tenantId] = all[tenantId].filter((e) => String(e.id) !== String(evalId));
    }
    setStorageData(STORAGE_KEYS.EVALUATIONS, all);
  },

  // ─── Homework Assignments ──────────────────────────────────────────────────
  getHomeworks(tenantId = 'default') {
    const all = getStorageData(STORAGE_KEYS.HOMEWORKS);
    if (!all[tenantId]) {
      const seeded = generateDefaultData(tenantId);
      all[tenantId] = seeded.homeworks;
      setStorageData(STORAGE_KEYS.HOMEWORKS, all);
    }
    return all[tenantId] || [];
  },

  saveHomework(tenantId = 'default', hwData) {
    const all = getStorageData(STORAGE_KEYS.HOMEWORKS);
    const list = all[tenantId] || [];

    let updated;
    if (hwData.id) {
      updated = list.map((h) => (h.id === hwData.id ? { ...h, ...hwData, updated_at: new Date().toISOString() } : h));
    } else {
      const newHw = {
        ...hwData,
        id: `hw_${Date.now()}`,
        tenant_id: tenantId,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      updated = [newHw, ...list];
    }

    all[tenantId] = updated;
    setStorageData(STORAGE_KEYS.HOMEWORKS, all);
    return updated;
  },

  deleteHomework(tenantId = 'default', hwId) {
    const all = getStorageData(STORAGE_KEYS.HOMEWORKS);
    const list = all[tenantId] || [];
    all[tenantId] = list.filter((h) => h.id !== hwId);
    setStorageData(STORAGE_KEYS.HOMEWORKS, all);
  },

  // ─── Multi-Period Report Calculation Engine ────────────────────────────────
  getMultiPeriodSummary(tenantId = 'default', filters = {}) {
    const lessons = this.getDailyLessons(tenantId);
    const evals = this.getEvaluations(tenantId);
    const homeworks = this.getHomeworks(tenantId);

    const { class_id, student_id, start_date, end_date } = filters;

    let filteredLessons = lessons;
    let filteredEvals = evals;
    let filteredHws = homeworks;

    if (class_id && class_id !== 'ALL') {
      filteredLessons = filteredLessons.filter((l) => l.academic_class === class_id);
      filteredHws = filteredHws.filter((h) => h.academic_class === class_id);
      filteredEvals = filteredEvals.filter((e) => !e.student_class_name || e.student_class_name.includes(class_id));
    }

    if (student_id) {
      filteredEvals = filteredEvals.filter((e) => String(e.student) === String(student_id));
    }

    if (start_date && end_date) {
      filteredLessons = filteredLessons.filter((l) => l.lesson_date >= start_date && l.lesson_date <= end_date);
      filteredEvals = filteredEvals.filter((e) => e.evaluation_date >= start_date && e.evaluation_date <= end_date);
      filteredHws = filteredHws.filter((h) => h.due_date >= start_date && h.due_date <= end_date);
    }

    const totalLessons = filteredLessons.length;
    const totalEvals = filteredEvals.length;
    const totalHws = filteredHws.length;

    const masteredCount = filteredEvals.filter((e) => e.evaluation_status === 'MASTERED').length;
    const satisfactoryCount = filteredEvals.filter((e) => e.evaluation_status === 'SATISFACTORY').length;
    const needsImprovementCount = filteredEvals.filter((e) => e.evaluation_status === 'NEEDS_IMPROVEMENT').length;
    const unpreparedCount = filteredEvals.filter((e) => e.evaluation_status === 'UNPREPARED').length;
    const absentCount = filteredEvals.filter((e) => e.evaluation_status === 'ABSENT').length;

    const scoreSum = filteredEvals.reduce((acc, e) => acc + (Number(e.score) || 0), 0);
    const avgScore = totalEvals > 0 ? (scoreSum / totalEvals).toFixed(1) : '0.0';
    const totalMistakes = filteredEvals.reduce((acc, e) => acc + (Number(e.total_mistakes) || 0), 0);
    const totalStucks = filteredEvals.reduce((acc, e) => acc + (Number(e.total_stucks) || 0), 0);
    const masteryRate = totalEvals > 0 ? Math.round((masteredCount / totalEvals) * 100) : 0;

    return {
      totalLessons,
      totalEvals,
      totalHws,
      masteredCount,
      satisfactoryCount,
      needsImprovementCount,
      unpreparedCount,
      absentCount,
      avgScore,
      totalMistakes,
      totalStucks,
      masteryRate,
      lessons: filteredLessons,
      evaluations: filteredEvals,
      homeworks: filteredHws,
    };
  },
};
