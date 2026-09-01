import { readJSON, writeJSON } from './coreStore';
import { learningStore } from './learningStore';
import { academicYearsStore } from './academicStore';

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
 * Enterprise Examination Store
 */
export const examStore = {
  // ── 1. GRADING SYSTEMS ───────────────────────────────────────────────────────
  getGradingSystems: (tenantId = 'default') => {
    const key = `spr_grading_systems_${tenantId}`;
    const stored = readJSON(key, null);
    if (!stored || !Array.isArray(stored) || stored.length === 0) {
      writeJSON(key, DEFAULT_GRADING_SYSTEMS);
      return DEFAULT_GRADING_SYSTEMS;
    }
    return stored;
  },

  saveGradingSystems: (tenantId = 'default', systems = []) => {
    const key = `spr_grading_systems_${tenantId}`;
    writeJSON(key, systems);
    return systems;
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
    const key = `spr_exams_${tenantId}`;
    const stored = readJSON(key, []);
    if (!stored || !Array.isArray(stored)) {
      return [];
    }
    return stored;
  },

  saveExams: (tenantId = 'default', exams = []) => {
    const key = `spr_exams_${tenantId}`;
    writeJSON(key, exams);
    return exams;
  },

  getExamById: (tenantId = 'default', examId) => {
    const list = examStore.getExams(tenantId);
    return list.find((e) => String(e.id) === String(examId)) || null;
  },

  addExam: (tenantId = 'default', examData) => {
    const list = examStore.getExams(tenantId);
    const newExam = {
      id: examData.id || `exam_${Date.now()}`,
      tenantId,
      branchId: examData.branchId || null,
      branchName: examData.branchName || '',
      academicYearId: examData.academicYearId || '',
      academicYearName: examData.academicYearName || '',
      semesterId: examData.semesterId || '1st_term',
      semesterName: examData.semesterName || 'First Term',
      name: examData.name || 'Term Examination',
      code: examData.code || `EXAM_${Date.now().toString(36).toUpperCase()}`,
      description: examData.description || '',
      startDate: examData.startDate || new Date().toISOString().split('T')[0],
      endDate: examData.endDate || new Date().toISOString().split('T')[0],
      publishDate: examData.publishDate || '',
      gradingSystemId: examData.gradingSystemId || 'dars_e_nizami_standard',
      targetClassIds: examData.targetClassIds || [],
      
      // Continuous Assessment & Mark Weightage Configuration
      caWeightage: {
        enabled: Boolean(examData.caWeightage?.enabled),
        dailyClassroomPct: Number(examData.caWeightage?.dailyClassroomPct) || 10,
        attendancePct: Number(examData.caWeightage?.attendancePct) || 10,
        examPct: Number(examData.caWeightage?.examPct) || 80,
      },

      // Multi-Level Ranking Configuration
      rankingConfig: {
        scope: examData.rankingConfig?.scope || 'CLASS_AND_SECTION', // 'CLASS_AND_SECTION' | 'CLASS_ONLY'
        failSubjectRule: examData.rankingConfig?.failSubjectRule || 'EXCLUDE_FROM_MERIT', // 'EXCLUDE_FROM_MERIT' | 'NORMAL'
      },

      // Multi-stage Lifecycle: DRAFT -> MARK_ENTRY -> FIRST_PUBLISHED -> UNDER_REVIEW -> FINAL_PUBLISHED -> LOCKED
      status: examData.status || 'DRAFT',
      isLocked: examData.status === 'LOCKED',
      reviewWindowClosesAt: examData.reviewWindowClosesAt || '',

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newExam, ...list];
    examStore.saveExams(tenantId, updated);
    return newExam;
  },

  updateExam: (tenantId = 'default', examId, examData) => {
    const list = examStore.getExams(tenantId);
    const updated = list.map((e) => {
      if (String(e.id) === String(examId)) {
        return {
          ...e,
          ...examData,
          updatedAt: new Date().toISOString(),
        };
      }
      return e;
    });
    examStore.saveExams(tenantId, updated);
  },

  updateExamStatus: (tenantId = 'default', examId, newStatus) => {
    const list = examStore.getExams(tenantId);
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
    examStore.saveExams(tenantId, updated);
  },

  deleteExam: (tenantId = 'default', examId) => {
    const list = examStore.getExams(tenantId);
    const updated = list.filter((e) => String(e.id) !== String(examId));
    examStore.saveExams(tenantId, updated);

    // Also remove associated exam subjects and marks
    examStore.deleteExamSubjectsByExamId(tenantId, examId);
    examStore.deleteExamMarksByExamId(tenantId, examId);
  },

  // ── 3. EXAM SUBJECTS & SCHEDULES ────────────────────────────────────────────
  getExamSubjects: (tenantId = 'default', examId = null) => {
    const key = `spr_exam_subjects_${tenantId}`;
    const stored = readJSON(key, []);
    if (examId) {
      return stored.filter((s) => String(s.examId) === String(examId));
    }
    return stored;
  },

  saveExamSubjects: (tenantId = 'default', subjects = []) => {
    const key = `spr_exam_subjects_${tenantId}`;
    writeJSON(key, subjects);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_exam_subjects_updated', { detail: subjects }));
    }
    return subjects;
  },

  bulkUpsertExamSubjects: (tenantId = 'default', examId, examSubjectsList = []) => {
    const list = examStore.getExamSubjects(tenantId);
    // Remove old records for this exam and replace with updated list
    const otherExamSubjects = list.filter((s) => String(s.examId) !== String(examId));
    const normalized = examSubjectsList.map((s, idx) => ({
      id: s.id || `exam_sub_${Date.now()}_${idx}`,
      examId: String(examId),
      departmentId: s.departmentId || 'ALL',
      departmentName: s.departmentName || '',
      classId: String(s.classId || ''),
      className: s.className || '',
      sectionId: s.sectionId || 'ALL',
      sectionName: s.sectionName || 'All Sections',
      subjectName: (s.subjectName || '').trim(),
      curriculumBookId: s.curriculumBookId || null,
      curriculumBookName: s.curriculumBookName || '',
      teacherName: (s.teacherName || '').trim(),
      examDate: s.examDate || '',
      startTime: s.startTime || '09:00 AM',
      endTime: s.endTime || '11:00 AM',
      fullMarks: Number(s.fullMarks) || 100,
      passMarks: Number(s.passMarks) || 33,
      components: Array.isArray(s.components) && s.components.length > 0
        ? s.components
        : [{ name: 'Written', maxMarks: Number(s.fullMarks) || 100 }],
      createdAt: s.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const combined = [...otherExamSubjects, ...normalized];
    examStore.saveExamSubjects(tenantId, combined);
    return normalized;
  },

  addExamSubject: (tenantId = 'default', subjectData) => {
    const list = examStore.getExamSubjects(tenantId);
    const newSubject = {
      id: subjectData.id || `exam_sub_${Date.now()}`,
      examId: subjectData.examId,
      classId: subjectData.classId,
      className: subjectData.className || '',
      sectionId: subjectData.sectionId || 'ALL',
      sectionName: subjectData.sectionName || 'All Sections',
      subjectName: subjectData.subjectName || 'Subject',
      curriculumBookId: subjectData.curriculumBookId || null,
      curriculumBookName: subjectData.curriculumBookName || '',
      teacherName: subjectData.teacherName || '',
      examDate: subjectData.examDate || '',
      startTime: subjectData.startTime || '',
      endTime: subjectData.endTime || '',
      fullMarks: Number(subjectData.fullMarks) || 100,
      passMarks: Number(subjectData.passMarks) || 33,
      
      // Sub-component mark breakdowns (e.g. Written: 70, Oral/Nazera: 20, Attendance: 10)
      components: Array.isArray(subjectData.components) && subjectData.components.length > 0
        ? subjectData.components
        : [{ name: 'Written', maxMarks: Number(subjectData.fullMarks) || 100 }],

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated = [newSubject, ...list];
    examStore.saveExamSubjects(tenantId, updated);
    return newSubject;
  },

  updateExamSubject: (tenantId = 'default', subjectId, subjectData) => {
    const list = examStore.getExamSubjects(tenantId);
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
    examStore.saveExamSubjects(tenantId, updated);
  },

  deleteExamSubject: (tenantId = 'default', subjectId) => {
    const list = examStore.getExamSubjects(tenantId);
    const updated = list.filter((s) => String(s.id) !== String(subjectId));
    examStore.saveExamSubjects(tenantId, updated);
  },

  deleteExamSubjectsByExamId: (tenantId = 'default', examId) => {
    const list = examStore.getExamSubjects(tenantId);
    const updated = list.filter((s) => String(s.examId) !== String(examId));
    examStore.saveExamSubjects(tenantId, updated);
  },

  // ── 4. EXAM MARKS ENTRY & SUBMISSION LIFECYCLE ──────────────────────────────
  getExamMarks: (tenantId = 'default', examId = null, examSubjectId = null) => {
    const key = `spr_exam_marks_${tenantId}`;
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
    const key = `spr_exam_marks_${tenantId}`;
    writeJSON(key, marksList);
    return marksList;
  },

  saveBatchMarks: (tenantId = 'default', { examId, examSubjectId, marksEntries, status = 'DRAFT' }) => {
    const allMarks = examStore.getExamMarks(tenantId);
    const otherMarks = allMarks.filter(
      (m) => !(String(m.examId) === String(examId) && String(m.examSubjectId) === String(examSubjectId))
    );

    const now = new Date().toISOString();
    const formattedEntries = marksEntries.map((entry) => ({
      id: entry.id || `mark_${examId}_${examSubjectId}_${entry.studentId}`,
      examId,
      examSubjectId,
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
      status, // 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED'
      updatedAt: now,
    }));

    const updated = [...otherMarks, ...formattedEntries];
    examStore.saveExamMarks(tenantId, updated);
    return formattedEntries;
  },

  deleteExamMarksByExamId: (tenantId = 'default', examId) => {
    const list = examStore.getExamMarks(tenantId);
    const updated = list.filter((m) => String(m.examId) !== String(examId));
    examStore.saveExamMarks(tenantId, updated);
  },

  // ── 5. STUDENT MARK REVIEW / RECHECK REQUESTS ───────────────────────────────
  getExamReviews: (tenantId = 'default', examId = null) => {
    const key = `spr_exam_reviews_${tenantId}`;
    const stored = readJSON(key, []);
    if (examId) {
      return stored.filter((r) => String(r.examId) === String(examId));
    }
    return stored;
  },

  submitReviewRequest: (tenantId = 'default', reviewData) => {
    const key = `spr_exam_reviews_${tenantId}`;
    const list = readJSON(key, []);
    const newReview = {
      id: reviewData.id || `rev_${Date.now()}`,
      examId: reviewData.examId,
      examSubjectId: reviewData.examSubjectId,
      studentId: String(reviewData.studentId),
      studentName: reviewData.studentName || '',
      subjectName: reviewData.subjectName || '',
      currentMarks: Number(reviewData.currentMarks) || 0,
      requestedMarks: reviewData.requestedMarks !== undefined ? Number(reviewData.requestedMarks) : null,
      studentReason: reviewData.studentReason || '',
      status: 'PENDING', // 'PENDING' | 'APPROVED' | 'REJECTED'
      reviewerRemarks: '',
      resolvedAt: null,
      createdAt: new Date().toISOString(),
    };
    const updated = [newReview, ...list];
    writeJSON(key, updated);
    return newReview;
  },

  resolveReviewRequest: (tenantId = 'default', reviewId, { status, updatedMarks, reviewerRemarks }) => {
    const key = `spr_exam_reviews_${tenantId}`;
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
      const allMarks = examStore.getExamMarks(tenantId);
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
      examStore.saveExamMarks(tenantId, updatedMarksList);
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
    const exam = examStore.getExamById(tenantId, examId);
    if (!exam) return { studentsData: [], subjects: [], gradingSystem: null };

    const gradingSystems = examStore.getGradingSystems(tenantId);
    const gradingSystem = gradingSystems.find((g) => g.id === exam.gradingSystemId) || gradingSystems[0] || DEFAULT_GRADING_SYSTEMS[0];
    const rules = gradingSystem.rules || [];

    // Filter subjects for class & section
    let subjects = examStore.getExamSubjects(tenantId, examId).filter(
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
    const allMarks = examStore.getExamMarks(tenantId, examId);
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
      // Prioritize passed students if failSubjectRule is active
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
