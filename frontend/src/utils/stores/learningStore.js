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
  const today = new Date().toISOString().split('T')[0];

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

  const targetDate = '2026-08-30';

  // Shared academic year & semester context for all seed lessons
  // Hierarchy: Academy > Branch > Academic Year 2026-2027 > 2nd Semester (July-Dec 2026)
  const SEED_ACADEMIC_YEAR_ID = 'ay_2026_2027';
  const SEED_SEMESTER_ID = 'sem_2026_2';
  const SEED_BRANCH_ID = 'branch_main';
  const SEED_DEPARTMENT_HIFZ = 'dept_hifz';
  const SEED_DEPARTMENT_KITAB = 'dept_kitab';
  const SEED_DEPARTMENT_PRIMARY = 'dept_primary';

  const lessons = [
    {
      id: `lesson_p1_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      // Relational Hierarchy Keys
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_HIFZ,
      // Class & Section
      academic_class: 'cls_1',
      class_name: 'Standard Hifz Division',
      section: 'sec_1',
      section_name: 'Section A (Boys)',
      subject_name: 'Quran Memorization (Hifz)',
      curriculum_book_id: 'syllabus_hifz_1',
      curriculum_book_name: 'Quran Daily Sabaq (Para 1-10)',
      period_slot: 'period_1',
      period_name: '1st Period: Sabq (New Lesson Recitation)',
      period_order: 1,
      period_time: '06:30 AM - 07:30 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Surah Al-Kahf (Ayah 1 to 20)',
      lesson_topic: 'Recitation with Proper Tajweed and Waqf',
      start_unit: 'Page 293',
      end_unit: 'Page 294',
      homework_task: 'Memorize Ayah 1-20 with mentor. Practice 5 times after Asr.',
      lesson_instructions: 'Memorize with accurate Makharij. Minimum 5 repetitions with mentor before afternoon Adai.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p2_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_HIFZ,
      academic_class: 'cls_1',
      class_name: 'Standard Hifz Division',
      section: 'sec_1',
      section_name: 'Section A (Boys)',
      subject_name: 'Sabqi Revision',
      curriculum_book_id: 'syllabus_hifz_3',
      curriculum_book_name: 'Quran Sabqi (Para 1-5 Recent Revision)',
      period_slot: 'period_2',
      period_name: '2nd Period: Sabqi (Recent Lessons Revision)',
      period_order: 2,
      period_time: '07:30 AM - 08:30 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Surah Al-Isra (Ayah 80 to 111)',
      lesson_topic: 'Recent Sabaq Fluent Recall and Tajweed Precision',
      start_unit: 'Page 290',
      end_unit: 'Page 292',
      homework_task: 'Recite recent 5 pages with classmate partner.',
      lesson_instructions: 'Review with partner. Ensure zero Lukmah in recitation.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p3_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_HIFZ,
      academic_class: 'cls_1',
      class_name: 'Standard Hifz Division',
      section: 'sec_1',
      section_name: 'Section A (Boys)',
      subject_name: 'Manzil Revision',
      curriculum_book_id: 'syllabus_hifz_2',
      curriculum_book_name: 'Quran Manzil (Long-Term Retention Routine)',
      period_slot: 'period_3',
      period_name: '3rd Period: Manzil (Long-Term Retention Routine)',
      period_order: 3,
      period_time: '09:00 AM - 10:00 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Para 4: Al-Imran (Ayah 92-200)',
      lesson_topic: 'Continuous fluent recitation of full half-para',
      start_unit: 'Page 62',
      end_unit: 'Page 76',
      homework_task: 'Complete full Para 4 recitation before evening Daur.',
      lesson_instructions: 'Listen carefully in groups of three. Mark any hesitations.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p4_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_KITAB,
      academic_class: 'cls_2',
      class_name: 'Kitab Division (Fazilat)',
      section: 'sec_2',
      section_name: 'Section 1',
      subject_name: 'Tajweed & Qirat Rules',
      curriculum_book_id: 'syllabus_kitab_1',
      curriculum_book_name: 'Al-Jazariyyah in Tajweed Science',
      period_slot: 'period_4',
      period_name: '4th Period: Tajweed, Makhraj & Qirat Rules',
      period_order: 4,
      period_time: '10:00 AM - 11:00 AM',
      teacher_name: 'Qari Habibur Rahman',
      lesson_date: targetDate,
      lesson_title: 'Bab al-Makharij wa Sifat: Letter Attributes',
      lesson_topic: 'Hams, Jahr, and Shiddah classification with examples',
      start_unit: 'Page 14',
      end_unit: 'Page 18',
      homework_task: 'Memorize lines 15-25 of Mandhumat al-Jazariyyah.',
      lesson_instructions: 'Articulate each letter with exact vocal cord vibration checks.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p5_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_KITAB,
      academic_class: 'cls_2',
      class_name: 'Kitab Division (Fazilat)',
      section: 'sec_2',
      section_name: 'Section 1',
      subject_name: 'Arabic Syntax (Nahw & Sarf)',
      curriculum_book_id: 'syllabus_kitab_4',
      curriculum_book_name: "Sharh Mi'ata Amil",
      period_slot: 'period_5',
      period_name: '5th Period: Arabic Language & Nahw/Sarf',
      period_order: 5,
      period_time: '11:00 AM - 12:00 PM',
      teacher_name: 'Maulana Mahmudul Hasan',
      lesson_date: targetDate,
      lesson_title: 'Hidayat al-Nahw: Marfuat Rules',
      lesson_topic: "Fail and Naib Fail Syntactic Analysis & I'rab",
      start_unit: 'Chapter 3, Page 45',
      end_unit: 'Chapter 3, Page 52',
      homework_task: 'Extract 10 sentence parsing examples from Surah Yusuf.',
      lesson_instructions: "Analyze practical I'rab examples from Quranic verses 1-10.",
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p6_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_PRIMARY,
      academic_class: 'cls_3',
      class_name: 'Primary Islamic Studies',
      section: 'sec_3',
      section_name: 'Section Alpha',
      subject_name: 'General Science & Mathematics',
      curriculum_book_id: 'syllabus_primary_3',
      curriculum_book_name: 'Primary Mathematics & Geometry',
      period_slot: 'period_6',
      period_name: '6th Period: General Science & Mathematics',
      period_order: 6,
      period_time: '12:00 PM - 01:00 PM',
      teacher_name: 'Master Tareq Aziz',
      lesson_date: targetDate,
      lesson_title: 'Unit 4: Geometry & Angle Measurements',
      lesson_topic: 'Right Angles, Acute Angles & Protractor Usage',
      start_unit: 'Page 52',
      end_unit: 'Page 58',
      homework_task: 'Solve Exercises 4.1 to 4.5 in workbook.',
      lesson_instructions: 'Hands-on practice measuring triangle internal angles.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p7_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_KITAB,
      academic_class: 'cls_2',
      class_name: 'Kitab Division (Fazilat)',
      section: 'sec_2',
      section_name: 'Section 1',
      subject_name: 'Hadith Studies & Islamic Ethics',
      curriculum_book_id: 'syllabus_kitab_3',
      curriculum_book_name: 'Mishkat al-Masabih',
      period_slot: 'period_7',
      period_name: '7th Period: Hadith Reflection & Islamic Ethics',
      period_order: 7,
      period_time: '02:15 PM - 03:15 PM',
      teacher_name: 'Shaykhul Hadith Maulana Zakariya',
      lesson_date: targetDate,
      lesson_title: 'Kitab al-Salah: Sunan & Adab',
      lesson_topic: 'Hadith 540-555 Commentary and Fiqh derivations',
      start_unit: 'Page 88',
      end_unit: 'Page 94',
      homework_task: 'Summarize 5 primary rulings derived from Hadith 542.',
      lesson_instructions: 'Analyze linguistic nuances and Matn variations across Sunan collections.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p8_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_PRIMARY,
      academic_class: 'cls_3',
      class_name: 'Primary Islamic Studies',
      section: 'sec_3',
      section_name: 'Section Alpha',
      subject_name: 'English & Mother Tongue Bangla',
      curriculum_book_id: 'syllabus_primary_4',
      curriculum_book_name: 'English Grammar & Composition',
      period_slot: 'period_8',
      period_name: '8th Period: English & Mother Tongue Bangla',
      period_order: 8,
      period_time: '03:15 PM - 04:15 PM',
      teacher_name: 'Professor Rafiqul Islam',
      lesson_date: targetDate,
      lesson_title: 'Tenses & Dialogue Practice',
      lesson_topic: 'Present Continuous and Past Simple in Conversation',
      start_unit: 'Page 40',
      end_unit: 'Page 46',
      homework_task: 'Write a 100-word daily routine diary in English.',
      lesson_instructions: 'Pair speaking practice followed by written paragraph review.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p9_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_HIFZ,
      academic_class: 'cls_1',
      class_name: 'Standard Hifz Division',
      section: 'sec_1',
      section_name: 'Section A (Boys)',
      subject_name: 'Afternoon Mutala & Self-Study',
      curriculum_book_id: 'syllabus_hifz_1',
      curriculum_book_name: 'Quran Daily Sabaq (Para 1-10)',
      period_slot: 'period_9',
      period_name: 'Asr Prayer & Afternoon Mutala Study Session',
      period_order: 9,
      period_time: '04:15 PM - 05:30 PM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Guided Self-Revision & Homework Completion',
      lesson_topic: 'Deep concentration memorization circle',
      start_unit: 'Unit Notes',
      end_unit: 'Review',
      homework_task: 'Verify all diary entries before Maghrib prayer.',
      lesson_instructions: 'Maintain silence. Focus on weaker verses.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_p10_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_HIFZ,
      academic_class: 'cls_1',
      class_name: 'Standard Hifz Division',
      section: 'sec_1',
      section_name: 'Section A (Boys)',
      subject_name: 'Night Daur Recitation',
      curriculum_book_id: 'syllabus_hifz_2',
      curriculum_book_name: 'Quran Manzil (Long-Term Retention Routine)',
      period_slot: 'period_10',
      period_name: 'Maghrib Prayer & Night Daur Prep Session',
      period_order: 10,
      period_time: '05:45 PM - 07:15 PM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Nightly Daur: Juz 1 to 5',
      lesson_topic: 'Continuous fluent recitation with lead Qari',
      start_unit: 'Para 1',
      end_unit: 'Para 5',
      homework_task: 'Prepare next 2 paras for tomorrow morning Daur.',
      lesson_instructions: 'Speed recitation with clear articulation and Waqf compliance.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_noorani_p1_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_PRIMARY,
      academic_class: 'cls_3',
      class_name: 'Noorani Qaida & Basic Ampara Reading',
      section: 'sec_3',
      section_name: 'All Sections',
      subject_name: 'Basic Quranic Phonetics & Makharij',
      curriculum_book_id: 'syllabus_primary_1',
      curriculum_book_name: 'Noorani Qaida with Tajweed Rules',
      period_slot: 'period_1',
      period_name: '1st Period: Sabq (New Lesson Recitation)',
      period_order: 1,
      period_time: '06:30 AM - 07:30 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Lesson 8: Tanween & Harkat Practice',
      lesson_topic: 'Makharij precision on Throat letters and 2-letter joining',
      start_unit: 'Page 24',
      end_unit: 'Page 25',
      homework_task: 'Practice reading lines 1-5 aloud 3 times at home.',
      lesson_instructions: 'Practice 2-letter combinations with correct vowel elongation.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_noorani_p2_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_PRIMARY,
      academic_class: 'cls_3',
      class_name: 'Noorani Qaida & Basic Ampara Reading',
      section: 'sec_3',
      section_name: 'All Sections',
      subject_name: 'Quran Recitation (Nazera & Short Surahs)',
      curriculum_book_id: 'syllabus_primary_2',
      curriculum_book_name: 'Ampara (Juz Amma Recitation & Hifz)',
      period_slot: 'period_2',
      period_name: '2nd Period: Sabqi (Recent Lessons Revision)',
      period_order: 2,
      period_time: '07:30 AM - 08:30 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Surah Al-Qariah (Full Recitation)',
      lesson_topic: 'Nazera reading fluency and Qalqalah letters recognition',
      start_unit: 'Page 18',
      end_unit: 'Page 19',
      homework_task: 'Recite Surah Al-Qariah smoothly with parents.',
      lesson_instructions: 'Read aloud with mentor 3 times.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_nazira_p1_${tenantId}_${targetDate}`,
      tenant_id: tenantId,
      academic_year_id: SEED_ACADEMIC_YEAR_ID,
      semester_id: SEED_SEMESTER_ID,
      branch_id: SEED_BRANCH_ID,
      department_id: SEED_DEPARTMENT_PRIMARY,
      academic_class: 'cls_3',
      class_name: 'Nazira Fast-Track Fluency & Tajweed',
      section: 'sec_3',
      section_name: 'All Sections',
      subject_name: 'Nazira Fast-Track Fluency',
      curriculum_book_id: 'syllabus_primary_2',
      curriculum_book_name: 'Ampara (Juz Amma Recitation & Hifz)',
      period_slot: 'period_1',
      period_name: '1st Period: Sabq (New Lesson Recitation)',
      period_order: 1,
      period_time: '06:30 AM - 07:30 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: targetDate,
      lesson_title: 'Surah At-Takathur & Al-Asr',
      lesson_topic: 'Continuous fluent reading without breaks',
      start_unit: 'Page 20',
      end_unit: 'Page 21',
      homework_task: 'Practice Surah Al-Asr with proper Waqf.',
      lesson_instructions: 'Ensure full breath control on longer Ayahs.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  const evaluations = [
    {
      id: `eval_1_${tenantId}`,
      tenant_id: tenantId,
      lesson_plan: `lesson_1_${tenantId}`,
      student: 'stu_1',
      student_name: 'Ahmadullah Al-Mahdi',
      student_uniq_id: 'STU-2026-001',
      student_class_name: 'Standard Hifz Division',
      evaluation_date: today,
      evaluation_status: 'MASTERED',
      score: 10.0,
      max_score: 10.0,
      total_mistakes: 0,
      total_stucks: 0,
      fluency_rating: 5,
      teacher_remarks: 'Excellent recitation. Crisp Tajweed and zero hesitation.',
      is_synced_to_parent: true,
    },
    {
      id: `eval_2_${tenantId}`,
      tenant_id: tenantId,
      lesson_plan: `lesson_1_${tenantId}`,
      student: 'stu_2',
      student_name: 'Mahmudur Rahman',
      student_uniq_id: 'STU-2026-002',
      student_class_name: 'Standard Hifz Division',
      evaluation_date: today,
      evaluation_status: 'SATISFACTORY',
      score: 8.5,
      max_score: 10.0,
      total_mistakes: 1,
      total_stucks: 1,
      fluency_rating: 4,
      teacher_remarks: 'Good effort. Minor hesitation on Ayah 14 Waqf.',
      is_synced_to_parent: true,
    },
  ];

  const homeworks = [
    {
      id: `hw_1_${tenantId}`,
      tenant_id: tenantId,
      lesson_plan: `lesson_1_${tenantId}`,
      academic_class: 'cls_1',
      class_name: 'Standard Hifz Division',
      section_name: 'Section A (Boys)',
      subject_name: 'Tajweed & Grammar Notes',
      teacher_name: 'Mawlana Abdur Rashid',
      title: 'Nightly Dars & Written Ayah Summary',
      description: 'Write down 5 core legal and moral lessons from Surah Al-Kahf (Ayah 1-20) in academic diary.',
      assigned_date: today,
      due_date: today,
      due_time: '20:30',
      max_marks: 10.0,
      submission_type: 'WRITTEN_TEXT',
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

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
    if (!all[tenantId] || all[tenantId].length === 0) {
      all[tenantId] = seeded.lessons;
      setStorageData(STORAGE_KEYS.LESSONS, all);
    } else {
      const currentList = all[tenantId];
      const hasAug30 = currentList.some((l) => l.lesson_date === '2026-08-30');
      if (!hasAug30) {
        all[tenantId] = [...seeded.lessons, ...currentList];
        setStorageData(STORAGE_KEYS.LESSONS, all);
      } else {
        const existingIds = new Set(currentList.map((l) => l.id));
        const toAdd = seeded.lessons.filter((sl) => !existingIds.has(sl.id));
        if (toAdd.length > 0) {
          all[tenantId] = [...currentList, ...toAdd];
          setStorageData(STORAGE_KEYS.LESSONS, all);
        }
      }
    }
    return all[tenantId] || [];
  },

  saveDailyLesson(tenantId = 'default', lessonData) {
    const all = getStorageData(STORAGE_KEYS.LESSONS);
    const list = all[tenantId] || [];

    let updated;
    if (lessonData.id) {
      updated = list.map((l) => (l.id === lessonData.id ? { ...l, ...lessonData, updated_at: new Date().toISOString() } : l));
    } else {
      const newLesson = {
        ...lessonData,
        id: `lesson_${Date.now()}`,
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
    const list = all[tenantId] || [];
    all[tenantId] = list.filter((l) => l.id !== lessonId);
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
    if (!all[tenantId]) {
      const seeded = generateDefaultData(tenantId);
      all[tenantId] = seeded.evaluations;
      setStorageData(STORAGE_KEYS.EVALUATIONS, all);
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
