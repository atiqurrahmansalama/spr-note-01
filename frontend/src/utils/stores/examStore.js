import { readJSON, writeJSON } from './coreStore';

/**
 * Universal Tenant ID Sanitizer
 */
export const getSafeTenantId = (t) => {
  if (!t || t === 'default' || t === 'ALL' || t === 'null' || t === 'undefined') return 'default';
  return String(t);
};

/**
 * Universal Default Grading Presets (100% English taxonomy)
 */
export const DEFAULT_GRADING_SYSTEMS = [
  {
    id: 'dars_e_nizami_standard',
    name: 'Dars-e-Nizami / Qawmi Standard (Befaq)',
    code: 'BEFAQ_QAWMI',
    description: 'Traditional Islamic academic grading standard (Mumtaz to Rasib).',
    isDefault: true,
    rules: [
      { grade: 'Mumtaz', title: 'Outstanding', minMark: 80, maxMark: 100, gradePoint: 5.0, division: '1st Star', isPass: true, color: 'emerald' },
      { grade: 'Jayyid Jiddan', title: 'Very Good', minMark: 65, maxMark: 79, gradePoint: 4.0, division: '1st Division', isPass: true, color: 'teal' },
      { grade: 'Jayyid', title: 'Good', minMark: 50, maxMark: 64, gradePoint: 3.0, division: '2nd Division', isPass: true, color: 'blue' },
      { grade: 'Maqbool', title: 'Pass', minMark: 33, maxMark: 49, gradePoint: 2.0, division: '3rd Division', isPass: true, color: 'amber' },
      { grade: 'Rasib', title: 'Fail', minMark: 0, maxMark: 32, gradePoint: 0.0, division: 'Failed', isPass: false, color: 'rose' },
    ],
  },
  {
    id: 'general_academic_gpa5',
    name: 'General Academic 5.0 GPA Scale',
    code: 'GENERAL_GPA5',
    description: 'National and international 5.0 GPA standard scale.',
    isDefault: false,
    rules: [
      { grade: 'A+', title: 'Outstanding', minMark: 80, maxMark: 100, gradePoint: 5.0, division: '1st Division', isPass: true, color: 'emerald' },
      { grade: 'A', title: 'Excellent', minMark: 70, maxMark: 79, gradePoint: 4.0, division: '1st Division', isPass: true, color: 'teal' },
      { grade: 'A-', title: 'Very Good', minMark: 60, maxMark: 69, gradePoint: 3.5, division: '1st Division', isPass: true, color: 'cyan' },
      { grade: 'B', title: 'Good', minMark: 50, maxMark: 59, gradePoint: 3.0, division: '2nd Division', isPass: true, color: 'blue' },
      { grade: 'C', title: 'Satisfactory', minMark: 40, maxMark: 49, gradePoint: 2.0, division: '3rd Division', isPass: true, color: 'amber' },
      { grade: 'D', title: 'Pass', minMark: 33, maxMark: 39, gradePoint: 1.0, division: 'Pass Division', isPass: true, color: 'orange' },
      { grade: 'F', title: 'Fail', minMark: 0, maxMark: 32, gradePoint: 0.0, division: 'Failed', isPass: false, color: 'rose' },
    ],
  },
  {
    id: 'percentage_division_scale',
    name: 'Percentage & Division Scale',
    code: 'PERCENTAGE_DIV',
    description: 'Simple division scale based on aggregate percentages.',
    isDefault: false,
    rules: [
      { grade: '1st Div (Distinction)', title: 'Distinction', minMark: 75, maxMark: 100, gradePoint: 4.0, division: '1st Division with Distinction', isPass: true, color: 'emerald' },
      { grade: '1st Division', title: 'First Division', minMark: 60, maxMark: 74, gradePoint: 3.0, division: '1st Division', isPass: true, color: 'teal' },
      { grade: '2nd Division', title: 'Second Division', minMark: 45, maxMark: 59, gradePoint: 2.0, division: '2nd Division', isPass: true, color: 'blue' },
      { grade: '3rd Division', title: 'Third Division', minMark: 33, maxMark: 44, gradePoint: 1.0, division: '3rd Division', isPass: true, color: 'amber' },
      { grade: 'Failed', title: 'Failed', minMark: 0, maxMark: 32, gradePoint: 0.0, division: 'Failed', isPass: false, color: 'rose' },
    ],
  },
];

/**
 * Universal Default Examination Sessions
 */
export const DEFAULT_EXAM_SESSIONS = [
  {
    id: 'exam_term_1_2026',
    name: 'First Term Examination 2026',
    code: 'EXAM_TERM_1_2026',
    description: 'First comprehensive term assessment across all academic departments.',
    academicYearId: 'academic_year_2026',
    academicYearName: 'Academic Year 2026',
    semesterId: '1st_term',
    semesterName: 'First Term',
    departmentId: 'ALL',
    departmentName: 'All Departments',
    startDate: '2026-10-10',
    endDate: '2026-10-20',
    publishDate: '2026-10-25',
    gradingSystemId: 'dars_e_nizami_standard',
    status: 'DRAFT',
    isLocked: false,
    defaultStartTime: '09:00 AM',
    defaultEndTime: '11:00 AM',
    hasSecondShift: true,
    secondStartTime: '02:00 PM',
    secondEndTime: '04:00 PM',
    defaultFullMarks: 100,
    targetClassIds: ['cls_1', 'cls_2', 'cls_3', 'cls_4'],
    shifts: [
      { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
      { id: 'shift_2', name: 'Shift 2 (Afternoon)', startTime: '02:00 PM', endTime: '04:00 PM' },
    ],
    scheduleDays: [
      { date: '2026-10-10', dayNumber: 1, type: 'DUAL_EXAM', shiftCount: 2, label: 'Exam Day 1' },
      { date: '2026-10-11', dayNumber: 2, type: 'DUAL_EXAM', shiftCount: 2, label: 'Exam Day 2' },
      { date: '2026-10-12', dayNumber: 3, type: 'SINGLE_EXAM', shiftCount: 1, label: 'Exam Day 3' },
      { date: '2026-10-13', dayNumber: 4, type: 'PREPARATION_GAP', shiftCount: 0, label: 'Study Gap' },
      { date: '2026-10-14', dayNumber: 5, type: 'DUAL_EXAM', shiftCount: 2, label: 'Exam Day 4' },
      { date: '2026-10-15', dayNumber: 6, type: 'DUAL_EXAM', shiftCount: 2, label: 'Exam Day 5' },
    ],
    defaultComponents: [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral / Nazera', maxMarks: 30 },
    ],
    caWeightage: {
      enabled: false,
      dailyClassroomPct: 10,
      attendancePct: 10,
      examPct: 80,
    },
    rankingConfig: {
      scope: 'CLASS_AND_SECTION',
      failSubjectRule: 'EXCLUDE_FROM_MERIT',
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'exam_annual_2026',
    name: 'Annual Final Examination 2026',
    code: 'EXAM_ANNUAL_2026',
    description: 'Final academic year cumulative assessment and promotion evaluations.',
    academicYearId: 'academic_year_2026',
    academicYearName: 'Academic Year 2026',
    semesterId: 'annual_term',
    semesterName: 'Annual Term',
    departmentId: 'ALL',
    departmentName: 'All Departments',
    startDate: '2026-11-15',
    endDate: '2026-11-28',
    publishDate: '2026-12-05',
    gradingSystemId: 'dars_e_nizami_standard',
    status: 'DRAFT',
    isLocked: false,
    defaultStartTime: '09:00 AM',
    defaultEndTime: '11:00 AM',
    hasSecondShift: false,
    defaultFullMarks: 100,
    targetClassIds: ['cls_1', 'cls_2', 'cls_3', 'cls_4'],
    shifts: [
      { id: 'shift_1', name: 'Shift 1 (Morning)', startTime: '09:00 AM', endTime: '11:00 AM' },
    ],
    scheduleDays: [
      { date: '2026-11-15', dayNumber: 1, type: 'SINGLE_EXAM', shiftCount: 1, label: 'Exam Day 1' },
      { date: '2026-11-16', dayNumber: 2, type: 'SINGLE_EXAM', shiftCount: 1, label: 'Exam Day 2' },
      { date: '2026-11-17', dayNumber: 3, type: 'SINGLE_EXAM', shiftCount: 1, label: 'Exam Day 3' },
      { date: '2026-11-18', dayNumber: 4, type: 'PREPARATION_GAP', shiftCount: 0, label: 'Study Gap' },
      { date: '2026-11-19', dayNumber: 5, type: 'SINGLE_EXAM', shiftCount: 1, label: 'Exam Day 4' },
    ],
    defaultComponents: [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 80 },
      { id: 'comp_2', name: 'Oral / Viva', maxMarks: 20 },
    ],
    caWeightage: {
      enabled: true,
      dailyClassroomPct: 10,
      attendancePct: 10,
      examPct: 80,
    },
    rankingConfig: {
      scope: 'CLASS_AND_SECTION',
      failSubjectRule: 'EXCLUDE_FROM_MERIT',
    },
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

/**
 * Universal Default Examination Subjects (Matching Default Sessions)
 */
export const DEFAULT_EXAM_SUBJECTS = [
  {
    id: 'exam_sub_1',
    examId: 'exam_term_1_2026',
    departmentId: 'dept_hifz',
    departmentName: 'Hifz Department',
    classId: 'cls_1',
    className: 'Standard Hifz Division',
    sectionId: 'ALL',
    sectionName: 'All Sections',
    subjectName: 'Quran Hifz Recitation & Daur',
    curriculumBookId: 'syllabus_hifz_1',
    curriculumBookName: 'Para 1-5 Memorization & Revision',
    teacherId: 'teacher_1',
    teacherName: 'Hafiz Qari Zubair',
    examDate: '2026-10-10',
    shiftId: 'shift_1',
    shiftName: 'Shift 1 (Morning)',
    startTime: '09:00 AM',
    endTime: '11:00 AM',
    fullMarks: 100,
    passMarks: 33,
    components: [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral / Nazera', maxMarks: 30 },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'exam_sub_2',
    examId: 'exam_term_1_2026',
    departmentId: 'dept_hifz',
    departmentName: 'Hifz Department',
    classId: 'cls_1',
    className: 'Standard Hifz Division',
    sectionId: 'ALL',
    sectionName: 'All Sections',
    subjectName: 'Tajweed Rules & Pronunciation',
    curriculumBookId: 'syllabus_hifz_2',
    curriculumBookName: 'Ahkamut Tajweed Foundation',
    teacherId: 'teacher_2',
    teacherName: 'Qari Abdullah',
    examDate: '2026-10-10',
    shiftId: 'shift_2',
    shiftName: 'Shift 2 (Afternoon)',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    fullMarks: 100,
    passMarks: 33,
    components: [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral / Nazera', maxMarks: 30 },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'exam_sub_3',
    examId: 'exam_term_1_2026',
    departmentId: 'dept_kitab',
    departmentName: 'Kitab Department',
    classId: 'cls_2',
    className: 'Mizan Class (Level 1)',
    sectionId: 'ALL',
    sectionName: 'All Sections',
    subjectName: 'Mizan wa Munshaib (Arabic Grammar)',
    curriculumBookId: 'syllabus_kitab_1',
    curriculumBookName: 'Mizan wa Munshaib',
    teacherId: 'teacher_3',
    teacherName: 'Maulana Mahmudul Hasan',
    examDate: '2026-10-11',
    shiftId: 'shift_1',
    shiftName: 'Shift 1 (Morning)',
    startTime: '09:00 AM',
    endTime: '11:00 AM',
    fullMarks: 100,
    passMarks: 33,
    components: [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral / Nazera', maxMarks: 30 },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'exam_sub_4',
    examId: 'exam_term_1_2026',
    departmentId: 'dept_kitab',
    departmentName: 'Kitab Department',
    classId: 'cls_2',
    className: 'Mizan Class (Level 1)',
    sectionId: 'ALL',
    sectionName: 'All Sections',
    subjectName: 'Nahw-e-Mir (Arabic Syntax)',
    curriculumBookId: 'syllabus_kitab_2',
    curriculumBookName: 'Nahw-e-Mir',
    teacherId: 'teacher_3',
    teacherName: 'Maulana Mahmudul Hasan',
    examDate: '2026-10-11',
    shiftId: 'shift_2',
    shiftName: 'Shift 2 (Afternoon)',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    fullMarks: 100,
    passMarks: 33,
    components: [
      { id: 'comp_1', name: 'Written Exam', maxMarks: 70 },
      { id: 'comp_2', name: 'Oral / Nazera', maxMarks: 30 },
    ],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

/**
 * Enterprise Examination Store
 */
export const examStore = {
  // ── 1. GRADING SYSTEMS ───────────────────────────────────────────────────────
  getGradingSystems: (tenantId = 'default') => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_grading_systems_${safeTenant}`;
    const legacyKey = 'spr_grading_systems_default';
    let stored = readJSON(key, null);
    if (!stored && safeTenant !== 'default') {
      stored = readJSON(legacyKey, null);
    }
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      writeJSON(key, DEFAULT_GRADING_SYSTEMS);
      return DEFAULT_GRADING_SYSTEMS;
    }
    return stored;
  },

  saveGradingSystems: (tenantId = 'default', systems = []) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_grading_systems_${safeTenant}`;
    const safe = Array.isArray(systems) ? systems : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_grading_systems_updated', { detail: safe }));
    }
    return safe;
  },

  addGradingSystem: (tenantId = 'default', systemData) => {
    const list = examStore.getGradingSystems(tenantId);
    const newSystem = {
      id: systemData.id || `grading_${Date.now()}`,
      name: systemData.name || 'Custom Grading System',
      code: systemData.code || `SCALE_${Date.now().toString(36).toUpperCase()}`,
      description: systemData.description || '',
      isDefault: Boolean(systemData.isDefault),
      rules: systemData.rules || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newSystem, ...list];
    examStore.saveGradingSystems(tenantId, updated);
    return newSystem;
  },

  updateGradingSystem: (tenantId = 'default', systemId, systemData) => {
    const list = examStore.getGradingSystems(tenantId);
    const updated = list.map((s) => {
      if (s.id === systemId) {
        return {
          ...s,
          ...systemData,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    examStore.saveGradingSystems(tenantId, updated);
  },

  deleteGradingSystem: (tenantId = 'default', systemId) => {
    const list = examStore.getGradingSystems(tenantId);
    const updated = list.filter((s) => s.id !== systemId);
    examStore.saveGradingSystems(tenantId, updated);
  },

  // ── 2. EXAMINATIONS & TERMS ─────────────────────────────────────────────────
  getExams: (tenantId = 'default') => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exams_${safeTenant}`;
    const legacyKey = 'spr_exams_default';
    let stored = readJSON(key, null);
    if (!stored && safeTenant !== 'default') {
      stored = readJSON(legacyKey, null);
    }
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      writeJSON(key, DEFAULT_EXAM_SESSIONS);
      return DEFAULT_EXAM_SESSIONS;
    }
    return stored;
  },

  saveExams: (tenantId = 'default', exams = []) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exams_${safeTenant}`;
    const safe = Array.isArray(exams) ? exams : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_exams_updated', { detail: safe }));
    }
    return safe;
  },

  getExamById: (tenantId = 'default', examId) => {
    const list = examStore.getExams(tenantId);
    return list.find((e) => String(e.id) === String(examId)) || null;
  },

  addExam: (tenantId = 'default', examData) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExams(safeTenant);
    const newExam = {
      id: examData.id || `exam_${Date.now()}`,
      tenantId: safeTenant,
      branchId: examData.branchId || null,
      branchName: examData.branchName || '',
      academicYearId: examData.academicYearId || '',
      academicYearName: examData.academicYearName || '',
      semesterId: examData.semesterId || '1st_term',
      semesterName: examData.semesterName || 'First Term',
      departmentId: examData.departmentId || 'ALL',
      departmentName: examData.departmentName || 'All Departments',
      name: examData.name || 'Term Examination',
      code: examData.code || `EXAM_${Date.now().toString(36).toUpperCase()}`,
      description: examData.description || '',
      startDate: examData.startDate || new Date().toISOString().split('T')[0],
      endDate: examData.endDate || new Date().toISOString().split('T')[0],
      publishDate: examData.publishDate || '',
      gradingSystemId: examData.gradingSystemId || 'dars_e_nizami_standard',
      targetClassIds: Array.isArray(examData.targetClassIds) ? examData.targetClassIds.map(String) : [],
      
      // Continuous Assessment & Mark Weightage Configuration
      caWeightage: {
        enabled: Boolean(examData.caWeightage?.enabled),
        dailyClassroomPct: Number(examData.caWeightage?.dailyClassroomPct) || 10,
        attendancePct: Number(examData.caWeightage?.attendancePct) || 10,
        examPct: Number(examData.caWeightage?.examPct) || 80,
      },

      // Multi-Level Ranking Configuration
      rankingConfig: {
        scope: examData.rankingConfig?.scope || 'CLASS_AND_SECTION',
        failSubjectRule: examData.rankingConfig?.failSubjectRule || 'EXCLUDE_FROM_MERIT',
      },

      // Multi-stage Lifecycle
      status: examData.status || 'DRAFT',
      isLocked: examData.status === 'LOCKED',
      reviewWindowClosesAt: examData.reviewWindowClosesAt || '',

      // Spread all extra properties (shifts, scheduleDays, timings, breakdown, etc.)
      ...examData,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newExam, ...list];
    examStore.saveExams(safeTenant, updated);
    return newExam;
  },

  updateExam: (tenantId = 'default', examId, examData) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExams(safeTenant);
    let updatedRecord = null;
    const updated = list.map((e) => {
      if (String(e.id) === String(examId)) {
        updatedRecord = {
          ...e,
          ...examData,
          departmentId: examData.departmentId !== undefined ? examData.departmentId : (e.departmentId || 'ALL'),
          departmentName: examData.departmentName !== undefined ? examData.departmentName : (e.departmentName || 'All Departments'),
          targetClassIds: Array.isArray(examData.targetClassIds)
            ? examData.targetClassIds.map(String)
            : (e.targetClassIds ? e.targetClassIds.map(String) : []),
          updatedAt: new Date().toISOString(),
        };
        return updatedRecord;
      }
      return e;
    });
    examStore.saveExams(safeTenant, updated);
    return updatedRecord;
  },

  updateExamStatus: (tenantId = 'default', examId, newStatus) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExams(safeTenant);
    const updated = list.map((e) => {
      if (String(e.id) === String(examId)) {
        const isLocked = newStatus === 'LOCKED' || newStatus === 'FINAL_PUBLISHED';
        return {
          ...e,
          status: newStatus,
          isLocked,
          publishDate: newStatus.includes('PUBLISHED') ? (e.publishDate || new Date().toISOString()) : e.publishDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return e;
    });
    examStore.saveExams(safeTenant, updated);
  },

  deleteExam: (tenantId = 'default', examId) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExams(safeTenant);
    const updated = list.filter((e) => String(e.id) !== String(examId));
    examStore.saveExams(safeTenant, updated);

    // Also remove associated exam subjects and marks
    examStore.deleteExamSubjectsByExamId(safeTenant, examId);
    examStore.deleteExamMarksByExamId(safeTenant, examId);
  },

  // ── 3. EXAM SUBJECTS & SCHEDULES ────────────────────────────────────────────
  getExamSubjects: (tenantId = 'default', examId = null) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_subjects_${safeTenant}`;
    const legacyKey = 'spr_exam_subjects_default';
    let stored = readJSON(key, null);
    if (stored === null && safeTenant !== 'default') {
      stored = readJSON(legacyKey, null);
    }
    if (stored === null || stored === undefined) {
      writeJSON(key, DEFAULT_EXAM_SUBJECTS);
      stored = DEFAULT_EXAM_SUBJECTS;
    }
    if (examId) {
      return stored.filter((s) => String(s.examId) === String(examId));
    }
    return stored;
  },

  saveExamSubjects: (tenantId = 'default', subjects = []) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_subjects_${safeTenant}`;
    const safe = Array.isArray(subjects) ? subjects : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_exam_subjects_updated', { detail: safe }));
    }
    return safe;
  },

  bulkUpsertExamSubjects: (tenantId = 'default', examId, examSubjectsList = []) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExamSubjects(safeTenant);
    const otherExamSubjects = list.filter((s) => String(s.examId) !== String(examId));
    const normalized = (Array.isArray(examSubjectsList) ? examSubjectsList : []).map((s, idx) => ({
      id: String(s.id || `exam_sub_${Date.now()}_${idx}`),
      examId: String(examId),
      departmentId: String(s.departmentId || 'ALL'),
      departmentName: s.departmentName || '',
      classId: String(s.classId || ''),
      className: s.className || '',
      sectionId: String(s.sectionId || 'ALL'),
      sectionName: s.sectionName || 'All Sections',
      subjectName: (s.subjectName || '').trim() || (s.className ? `${s.className} Subject` : 'Exam Subject'),
      subjectCode: s.subjectCode || '',
      evaluationType: s.evaluationType || 'COMPOSITE',
      roomNo: s.roomNo || '',
      curriculumBookId: s.curriculumBookId ? String(s.curriculumBookId) : null,
      curriculumBookName: s.curriculumBookName || '',
      teacherId: s.teacherId ? String(s.teacherId) : '',
      teacherName: (s.teacherName || '').trim(),
      notes: s.notes || '',
      examDate: s.examDate || '',
      shiftId: s.shiftId || 'shift_1',
      shiftName: s.shiftName || 'Shift 1 (Morning)',
      startTime: s.startTime || '09:00 AM',
      endTime: s.endTime || '11:00 AM',
      fullMarks: Number(s.fullMarks) || 100,
      passMarks: Number(s.passMarks) || 33,
      components: Array.isArray(s.components) && s.components.length > 0
        ? s.components
        : [{ id: 'comp_1', name: 'Written Exam', maxMarks: Number(s.fullMarks) || 100 }],
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const combined = [...otherExamSubjects, ...normalized];
    examStore.saveExamSubjects(safeTenant, combined);
    return normalized;
  },

  addExamSubject: (tenantId = 'default', subjectData) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExamSubjects(safeTenant);
    const newSubject = {
      id: subjectData.id || `exam_sub_${Date.now()}`,
      examId: String(subjectData.examId),
      departmentId: subjectData.departmentId || 'ALL',
      departmentName: subjectData.departmentName || '',
      classId: String(subjectData.classId || ''),
      className: subjectData.className || '',
      sectionId: subjectData.sectionId || 'ALL',
      sectionName: subjectData.sectionName || 'All Sections',
      subjectName: (subjectData.subjectName || '').trim() || 'Exam Subject',
      curriculumBookId: subjectData.curriculumBookId || null,
      curriculumBookName: subjectData.curriculumBookName || '',
      teacherId: subjectData.teacherId || '',
      teacherName: (subjectData.teacherName || '').trim(),
      examDate: subjectData.examDate || '',
      shiftId: subjectData.shiftId || 'shift_1',
      shiftName: subjectData.shiftName || 'Shift 1',
      startTime: subjectData.startTime || '09:00 AM',
      endTime: subjectData.endTime || '11:00 AM',
      fullMarks: Number(subjectData.fullMarks) || 100,
      passMarks: Number(subjectData.passMarks) || 33,
      components: Array.isArray(subjectData.components) && subjectData.components.length > 0
        ? subjectData.components
        : [{ id: 'comp_1', name: 'Written Exam', maxMarks: Number(subjectData.fullMarks) || 100 }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSubject, ...list];
    examStore.saveExamSubjects(safeTenant, updated);
    return newSubject;
  },

  updateExamSubject: (tenantId = 'default', subjectId, subjectData) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExamSubjects(safeTenant);
    const updated = list.map((s) => {
      if (String(s.id) === String(subjectId)) {
        return {
          ...s,
          ...subjectData,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    examStore.saveExamSubjects(safeTenant, updated);
  },

  deleteExamSubject: (tenantId = 'default', subjectId) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExamSubjects(safeTenant);
    const updated = list.filter((s) => String(s.id) !== String(subjectId));
    examStore.saveExamSubjects(safeTenant, updated);
  },

  deleteExamSubjectsByExamId: (tenantId = 'default', examId) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExamSubjects(safeTenant);
    const updated = list.filter((s) => String(s.examId) !== String(examId));
    examStore.saveExamSubjects(safeTenant, updated);
  },

  // ── 4. EXAM MARKS ENTRY & SUBMISSION LIFECYCLE ──────────────────────────────
  getExamMarks: (tenantId = 'default', examId = null, examSubjectId = null) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_marks_${safeTenant}`;
    const stored = readJSON(key, []);
    let filtered = stored;
    if (examId) {
      filtered = filtered.filter((m) => String(m.examId) === String(examId));
    }
    if (examSubjectId) {
      filtered = filtered.filter((m) => String(m.examSubjectId) === String(examSubjectId));
    }
    return filtered;
  },

  saveExamMarks: (tenantId = 'default', marksList = []) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_marks_${safeTenant}`;
    const safe = Array.isArray(marksList) ? marksList : [];
    writeJSON(key, safe);
    return safe;
  },

  saveBatchMarks: (tenantId = 'default', { examId, examSubjectId, marksEntries, status = 'DRAFT' }) => {
    const safeTenant = getSafeTenantId(tenantId);
    const allMarks = examStore.getExamMarks(safeTenant);
    const otherMarks = allMarks.filter(
      (m) => !(String(m.examId) === String(examId) && String(m.examSubjectId) === String(examSubjectId))
    );

    const now = new Date().toISOString();
    const formattedEntries = marksEntries.map((entry) => ({
      id: entry.id || `mark_${examId}_${examSubjectId}_${entry.studentId}`,
      examId: String(examId),
      examSubjectId: String(examSubjectId),
      studentId: String(entry.studentId),
      studentName: entry.studentName || '',
      studentRoll: entry.studentRoll || '',
      classId: entry.classId || '',
      sectionId: entry.sectionId || '',
      componentMarks: entry.componentMarks || {},
      obtainedMarks: Number(entry.obtainedMarks) || 0,
      fullMarks: Number(entry.fullMarks) || 100,
      passMarks: Number(entry.passMarks) || 33,
      isAbsent: Boolean(entry.isAbsent),
      teacherRemarks: entry.teacherRemarks || '',
      status,
      updatedAt: now,
    }));

    const updated = [...otherMarks, ...formattedEntries];
    examStore.saveExamMarks(safeTenant, updated);
    return formattedEntries;
  },

  deleteExamMarksByExamId: (tenantId = 'default', examId) => {
    const safeTenant = getSafeTenantId(tenantId);
    const list = examStore.getExamMarks(safeTenant);
    const updated = list.filter((m) => String(m.examId) !== String(examId));
    examStore.saveExamMarks(safeTenant, updated);
  },

  // ── 5. STUDENT MARK REVIEW / RECHECK REQUESTS ───────────────────────────────
  getExamReviews: (tenantId = 'default', examId = null) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_reviews_${safeTenant}`;
    const stored = readJSON(key, []);
    if (examId) {
      return stored.filter((r) => String(r.examId) === String(examId));
    }
    return stored;
  },

  submitReviewRequest: (tenantId = 'default', reviewData) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_reviews_${safeTenant}`;
    const list = readJSON(key, []);
    const newReview = {
      id: reviewData.id || `rev_${Date.now()}`,
      examId: String(reviewData.examId),
      examSubjectId: String(reviewData.examSubjectId),
      studentId: String(reviewData.studentId),
      studentName: reviewData.studentName || '',
      subjectName: reviewData.subjectName || '',
      currentMarks: Number(reviewData.currentMarks) || 0,
      requestedMarks: reviewData.requestedMarks !== undefined ? Number(reviewData.requestedMarks) : null,
      studentReason: reviewData.studentReason || '',
      status: 'PENDING',
      reviewerRemarks: '',
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newReview, ...list];
    writeJSON(key, updated);
    return newReview;
  },

  resolveReviewRequest: (tenantId = 'default', reviewId, { status, updatedMarks, reviewerRemarks }) => {
    const safeTenant = getSafeTenantId(tenantId);
    const key = `spr_exam_reviews_${safeTenant}`;
    const list = readJSON(key, []);
    const target = list.find((r) => String(r.id) === String(reviewId));
    if (!target) return null;

    const updated = list.map((r) => {
      if (String(r.id) === String(reviewId)) {
        return {
          ...r,
          status,
          updatedMarks: status === 'APPROVED' ? Number(updatedMarks) : r.currentMarks,
          reviewerRemarks: reviewerRemarks || '',
          resolvedAt: new Date().toISOString(),
        };
      }
      return r;
    });
    writeJSON(key, updated);

    // If approved, update the actual mark entry
    if (status === 'APPROVED' && updatedMarks !== undefined) {
      const allMarks = examStore.getExamMarks(safeTenant);
      const updatedMarksList = allMarks.map((m) => {
        if (String(m.examId) === String(target.examId) &&
            String(m.examSubjectId) === String(target.examSubjectId) &&
            String(m.studentId) === String(target.studentId)) {
          return {
            ...m,
            obtainedMarks: Number(updatedMarks),
            updatedAt: new Date().toISOString(),
          };
        }
        return m;
      });
      examStore.saveExamMarks(safeTenant, updatedMarksList);
    }
  },

  // ── 6. CALCULATION & RANKING ALGORITHM ──────────────────────────────────────
  evaluateGrade: (percentage, gradingRules = []) => {
    if (!gradingRules || gradingRules.length === 0) {
      return { grade: 'N/A', title: 'N/A', gradePoint: 0, division: 'N/A', isPass: false, color: 'secondary' };
    }
    const score = Number(percentage) || 0;
    const matched = gradingRules.find((r) => score >= Number(r.minMark) && score <= Number(r.maxMark));
    if (matched) return matched;
    
    // Fallback to lowest rule
    return gradingRules[gradingRules.length - 1] || {
      grade: 'F', title: 'Fail', gradePoint: 0, division: 'Failed', isPass: false, color: 'rose'
    };
  },

  calculateTabulationMatrix: (tenantId = 'default', { examId, classId, sectionId = 'ALL', students = [] }) => {
    const safeTenant = getSafeTenantId(tenantId);
    const exam = examStore.getExamById(safeTenant, examId);
    if (!exam) return { studentsData: [], subjects: [], gradingSystem: null };

    const gradingSystems = examStore.getGradingSystems(safeTenant);
    const gradingSystem = gradingSystems.find((g) => g.id === exam.gradingSystemId) || gradingSystems[0] || DEFAULT_GRADING_SYSTEMS[0];
    const rules = gradingSystem.rules || [];

    // Filter subjects for class & section
    let subjects = examStore.getExamSubjects(safeTenant, examId).filter(
      (s) => String(s.classId) === String(classId)
    );
    if (sectionId && sectionId !== 'ALL') {
      subjects = subjects.filter((s) => s.sectionId === 'ALL' || String(s.sectionId) === String(sectionId));
    }

    // Filter students for class & section
    let targetStudents = students.filter((st) => {
      const stClassId = typeof st.class_id === 'object' ? st.class_id?.id : (st.class_id || st.student_class || st.classId);
      return String(stClassId) === String(classId);
    });
    if (sectionId && sectionId !== 'ALL') {
      targetStudents = targetStudents.filter((st) => {
        const stSecId = typeof st.section === 'object' ? st.section?.id : (st.section || st.section_id || st.sectionId);
        return String(stSecId) === String(sectionId);
      });
    }

    // Load marks
    const allMarks = examStore.getExamMarks(safeTenant, examId);
    const marksByStudentAndSub = new Map();
    allMarks.forEach((m) => {
      marksByStudentAndSub.set(`${m.studentId}_${m.examSubjectId}`, m);
    });

    const studentsData = targetStudents.map((st) => {
      const stId = String(st.id);
      let totalObtained = 0;
      let totalFull = 0;
      let totalPoints = 0;
      let hasFailedSubject = false;
      let evaluatedSubjectCount = 0;

      const subjectMarks = subjects.map((sub) => {
        const markEntry = marksByStudentAndSub.get(`${stId}_${sub.id}`);
        const obtained = markEntry ? Number(markEntry.obtainedMarks) || 0 : 0;
        const full = Number(sub.fullMarks) || 100;
        const pass = Number(sub.passMarks) || 33;
        const isAbsent = Boolean(markEntry?.isAbsent);
        const isPassed = !isAbsent && obtained >= pass;

        if (!isPassed) hasFailedSubject = true;

        const subPercentage = full > 0 ? (obtained / full) * 100 : 0;
        const gradeEval = examStore.evaluateGrade(subPercentage, rules);

        totalObtained += isAbsent ? 0 : obtained;
        totalFull += full;
        totalPoints += gradeEval.gradePoint || 0;
        evaluatedSubjectCount += 1;

        return {
          subjectId: sub.id,
          subjectName: sub.subjectName,
          obtained,
          full,
          pass,
          isAbsent,
          isPassed,
          percentage: Math.round(subPercentage * 10) / 10,
          grade: gradeEval.grade,
          gradePoint: gradeEval.gradePoint,
          division: gradeEval.division,
          color: gradeEval.color,
          status: markEntry?.status || 'NOT_ENTERED',
        };
      });

      const overallPercentage = totalFull > 0 ? Math.round((totalObtained / totalFull) * 1000) / 10 : 0;
      const overallGpa = evaluatedSubjectCount > 0 ? Math.round((totalPoints / evaluatedSubjectCount) * 100) / 100 : 0.0;
      const overallGrade = examStore.evaluateGrade(overallPercentage, rules);

      const isOverallPass = exam.rankingConfig?.failSubjectRule === 'EXCLUDE_FROM_MERIT'
        ? !hasFailedSubject && overallGrade.isPass
        : overallGrade.isPass;

      return {
        studentId: stId,
        studentName: st.name_en || st.name || 'Student',
        rollNumber: st.roll_number || st.roll || st.uniq_id || 'N/A',
        studentClass: st.student_class_name || '',
        studentSection: st.section_name || '',
        sectionId: typeof st.section === 'object' ? st.section?.id : (st.section || st.section_id || ''),
        subjectMarks,
        totalObtained,
        totalFull,
        overallPercentage,
        overallGpa,
        grade: hasFailedSubject && exam.rankingConfig?.failSubjectRule === 'EXCLUDE_FROM_MERIT' ? 'Rasib / Fail' : overallGrade.grade,
        gradeTitle: overallGrade.title,
        division: hasFailedSubject && exam.rankingConfig?.failSubjectRule === 'EXCLUDE_FROM_MERIT' ? 'Failed' : overallGrade.division,
        isOverallPass,
        hasFailedSubject,
        color: !isOverallPass ? 'rose' : overallGrade.color,
      };
    });

    // Sort for Class Ranking (Highest Total Marks, then GPA)
    studentsData.sort((a, b) => {
      if (exam.rankingConfig?.failSubjectRule === 'EXCLUDE_FROM_MERIT') {
        if (a.isOverallPass && !b.isOverallPass) return -1;
        if (!a.isOverallPass && b.isOverallPass) return 1;
      }
      if (b.totalObtained !== a.totalObtained) {
        return b.totalObtained - a.totalObtained;
      }
      return b.overallGpa - a.overallGpa;
    });

    // Assign Class Rank
    studentsData.forEach((st, idx) => {
      st.classRank = st.isOverallPass ? idx + 1 : '-';
    });

    // Assign Section Rank
    const sectionGroups = new Map();
    studentsData.forEach((st) => {
      const sec = st.sectionId || 'DEFAULT';
      if (!sectionGroups.has(sec)) sectionGroups.set(sec, []);
      sectionGroups.get(sec).push(st);
    });

    sectionGroups.forEach((group) => {
      let currentSecRank = 1;
      group.forEach((st) => {
        st.sectionRank = st.isOverallPass ? currentSecRank++ : '-';
      });
    });

    return {
      exam,
      subjects,
      studentsData,
      gradingSystem,
      totalStudents: studentsData.length,
      passedCount: studentsData.filter((s) => s.isOverallPass).length,
      failedCount: studentsData.filter((s) => !s.isOverallPass).length,
      passPercentage: studentsData.length > 0
        ? Math.round((studentsData.filter((s) => s.isOverallPass).length / studentsData.length) * 100)
        : 0,
    };
  },
};
