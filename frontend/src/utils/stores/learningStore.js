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

  const lessons = [
    {
      id: `lesson_1_${tenantId}`,
      tenant_id: tenantId,
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
      period_time: '08:00 AM - 08:45 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: today,
      lesson_title: 'Surah Al-Kahf (Ayah 1 to 20)',
      lesson_topic: 'Recitation with Proper Tajweed and Waqf',
      start_unit: 'Surah 18, Ayah 1',
      end_unit: 'Surah 18, Ayah 20',
      lesson_instructions: 'Memorize with accurate Makharij. Minimum 5 repetitions with mentor before afternoon Adai.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_2_${tenantId}`,
      tenant_id: tenantId,
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
      period_time: '09:00 AM - 09:45 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: today,
      lesson_title: 'Surah Al-Isra (Ayah 80 to 111)',
      lesson_topic: 'Recent Sabaq Fluent Recall',
      start_unit: 'Surah 17, Ayah 80',
      end_unit: 'Surah 17, Ayah 111',
      lesson_instructions: 'Review with partner. Ensure zero Lukmah in recitation.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_3_${tenantId}`,
      tenant_id: tenantId,
      academic_class: 'cls_2',
      class_name: 'Kitab Division (Fazilat)',
      section: 'sec_2',
      section_name: 'Section 1',
      subject_name: 'Arabic Syntax (Nahw)',
      curriculum_book_id: 'syllabus_kitab_4',
      curriculum_book_name: "Sharh Mi'ata Amil",
      period_slot: 'period_3',
      period_name: '3rd Period: Arabic Grammar & Tajweed',
      period_order: 3,
      period_time: '10:00 AM - 10:45 AM',
      teacher_name: 'Maulana Mahmudul Hasan',
      lesson_date: today,
      lesson_title: 'Hidayat al-Nahw: Marfuat Rules',
      lesson_topic: 'Fail and Naib Fail Syntactic Analysis',
      start_unit: 'Chapter 3, Page 45',
      end_unit: 'Chapter 3, Page 52',
      lesson_instructions: 'Analyze practical I\'rab examples from Quranic verses 1-10.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_4_${tenantId}`,
      tenant_id: tenantId,
      academic_class: 'cls_2',
      class_name: 'Kitab Division (Fazilat)',
      section: 'sec_2',
      section_name: 'Section 1',
      subject_name: 'Hadith Studies',
      curriculum_book_id: 'syllabus_kitab_3',
      curriculum_book_name: 'Mishkat al-Masabih',
      period_slot: 'period_4',
      period_name: '4th Period: Hadith & Fiqh Studies',
      period_order: 4,
      period_time: '11:00 AM - 11:45 AM',
      teacher_name: 'Shaykhul Hadith Maulana Zakariya',
      lesson_date: today,
      lesson_title: 'Kitab al-Salah: Sunan & Adab',
      lesson_topic: 'Hadith 540-555 Commentary',
      start_unit: 'Page 88',
      end_unit: 'Page 94',
      lesson_instructions: 'Analyze linguistic nuances and Matn variations across Sunan collections.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_5_${tenantId}`,
      tenant_id: tenantId,
      academic_class: 'cls_3',
      class_name: 'Primary Islamic Studies',
      section: 'sec_3',
      section_name: 'Section Alpha',
      subject_name: 'Basic Quranic Phonetics & Makharij',
      curriculum_book_id: 'syllabus_primary_1',
      curriculum_book_name: 'Noorani Qaida with Tajweed Rules',
      period_slot: 'period_7',
      period_name: '1st Period: Noorani Qaida & Basic Tajweed',
      period_order: 1,
      period_time: '08:00 AM - 08:45 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: today,
      lesson_title: 'Lesson 8: Tanween & Harkat Practice',
      lesson_topic: 'Makharij precision on Throat letters',
      start_unit: 'Page 24',
      end_unit: 'Page 25',
      lesson_instructions: 'Practice 2-letter combinations with correct vowel elongation.',
      assigned_scope: 'CLASS_WIDE',
      attachment_url: '',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `lesson_6_${tenantId}`,
      tenant_id: tenantId,
      academic_class: 'cls_3',
      class_name: 'Primary Islamic Studies',
      section: 'sec_3',
      section_name: 'Section Alpha',
      subject_name: 'Quran Recitation (Nazera & Short Surahs)',
      curriculum_book_id: 'syllabus_primary_2',
      curriculum_book_name: 'Ampara (Juz Amma Recitation & Hifz)',
      period_slot: 'period_8',
      period_name: '2nd Period: Ampara Recitation & Masnoon Duas',
      period_order: 2,
      period_time: '09:00 AM - 09:45 AM',
      teacher_name: 'Hafiz Qari Osman',
      lesson_date: today,
      lesson_title: 'Surah Al-Qariah (Full Recitation)',
      lesson_topic: 'Nazera reading fluency and Qalqalah letters',
      start_unit: 'Page 18',
      end_unit: 'Page 19',
      lesson_instructions: 'Read aloud with mentor 3 times.',
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
    if (!all[tenantId]) {
      const seeded = generateDefaultData(tenantId);
      all[tenantId] = seeded.lessons;
      setStorageData(STORAGE_KEYS.LESSONS, all);
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
