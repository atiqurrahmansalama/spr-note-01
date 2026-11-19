import { useState, useMemo, useEffect } from 'react';
import { Subject, OptionItem } from '../../types';

export interface UseMarkEntryScopeParams {
  propExamId?: string | number | null;
  propSubjectId?: string | number | null;
  propDeptId?: string | number | null;
  propClassId?: string | number | null;
  propSectionId?: string | number | null;
  propSelectedSubject?: Subject | null;
  hideFilterBar?: boolean;
  exams: any[];
  examSubjects: any[];
  students: any[];
  classOptions: OptionItem[];
  departmentOptions: OptionItem[];
  sectionOptions: OptionItem[];
  gradingSystems: any[];
}

export function useMarkEntryScope({
  propExamId = null,
  propSubjectId = null,
  propDeptId = null,
  propClassId = null,
  propSectionId = null,
  propSelectedSubject = null,
  hideFilterBar = false,
  exams = [],
  examSubjects = [],
  students = [],
  classOptions = [],
  departmentOptions = [],
  sectionOptions = [],
  gradingSystems = [],
}: UseMarkEntryScopeParams) {
  // URL Search Params Hydration for standalone mode
  const urlParams = useMemo(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, []);

  const urlExamId = urlParams.get('examId') || urlParams.get('exam');
  const urlSubjectId = urlParams.get('subjectId') || urlParams.get('subject');
  const urlDeptId = urlParams.get('departmentId') || urlParams.get('dept');
  const urlClassId = urlParams.get('classId') || urlParams.get('class');
  const urlSectionId = urlParams.get('sectionId') || urlParams.get('section');

  // Standalone Selection States (only active when not provided via props from parent hub)
  const [internalExamId, setInternalExamId] = useState<string>(
    propExamId ? String(propExamId) : urlExamId || (exams[0]?.id ? String(exams[0].id) : '')
  );
  const [internalDeptId, setInternalDeptId] = useState<string>(
    propDeptId ? String(propDeptId) : urlDeptId || 'ALL'
  );
  const [internalClassId, setInternalClassId] = useState<string>(
    propClassId ? String(propClassId) : urlClassId || ''
  );
  const [internalSectionId, setInternalSectionId] = useState<string>(
    propSectionId ? String(propSectionId) : urlSectionId || 'ALL'
  );
  const [internalSubjectId, setInternalSubjectId] = useState<string>(
    propSubjectId ? String(propSubjectId) : urlSubjectId || ''
  );

  // Resolved Scope
  const activeExamId = propExamId !== null && propExamId !== undefined ? String(propExamId) : internalExamId;
  const activeDeptId = propDeptId !== null && propDeptId !== undefined ? String(propDeptId) : internalDeptId;
  const activeClassId = propClassId !== null && propClassId !== undefined ? String(propClassId) : internalClassId;
  const activeSectionId = propSectionId !== null && propSectionId !== undefined ? String(propSectionId) : internalSectionId;
  const activeSubjectId = propSubjectId !== null && propSubjectId !== undefined ? String(propSubjectId) : internalSubjectId;

  // Selected Exam Session
  const selectedExam = useMemo(() => {
    return exams.find((e: any) => String(e.id) === String(activeExamId)) || null;
  }, [exams, activeExamId]);

  // Exam Options
  const examOptions = useMemo(() => {
    return exams.map((e: any) => ({
      value: String(e.id),
      label: `${e.name} (${e.academicYearName || 'Session'})`,
      exam: e,
    }));
  }, [exams]);

  // Filtered Class Options (for standalone mode)
  const filteredClassOptions = useMemo(() => {
    let list = classOptions;

    if (selectedExam && Array.isArray(selectedExam.targetClassIds) && selectedExam.targetClassIds.length > 0) {
      const targetSet = new Set(selectedExam.targetClassIds.map((id: any) => String(id)));
      const hasMatch = list.some((c: OptionItem) => targetSet.has(String(c.value)));
      if (hasMatch) {
        list = list.filter((c: OptionItem) => targetSet.has(String(c.value)));
      }
    }

    if (activeDeptId && activeDeptId !== 'ALL') {
      list = list.filter((c: OptionItem) => {
        if (c.departmentId && String(c.departmentId) === String(activeDeptId)) {
          return true;
        }
        return (examSubjects || []).some(
          (s: any) =>
            String(s.classId) === String(c.value) &&
            (s.departmentId === 'ALL' || String(s.departmentId) === String(activeDeptId))
        );
      });
    }

    return [{ value: '', label: 'All Classes' }, ...list];
  }, [classOptions, selectedExam, activeDeptId, examSubjects]);

  // Filtered Section Options (for standalone mode)
  const filteredSectionOptions = useMemo(() => {
    let rawList = sectionOptions.filter((s: OptionItem) => s.value !== 'ALL');

    if (activeClassId) {
      rawList = rawList.filter((s: OptionItem) => {
        if (s.classId && String(s.classId) === String(activeClassId)) return true;
        return (examSubjects || []).some(
          (sub: any) =>
            String(sub.classId) === String(activeClassId) &&
            String(sub.sectionId) === String(s.value)
        );
      });
    } else if (activeDeptId && activeDeptId !== 'ALL') {
      const allowedClassIds = new Set(
        filteredClassOptions
          .map((c: OptionItem) => String(c.value))
          .filter((v: string) => v && v !== '')
      );
      rawList = rawList.filter((s: OptionItem) => s.classId && allowedClassIds.has(String(s.classId)));
    }

    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...rawList];
  }, [sectionOptions, activeClassId, activeDeptId, filteredClassOptions, examSubjects]);

  // Cascading Auto-Select for standalone mode
  useEffect(() => {
    if (hideFilterBar) return;
    const validClasses = filteredClassOptions.filter((c: OptionItem) => c.value && c.value !== '');
    if (validClasses.length > 0) {
      const isValidClass = validClasses.some((c: OptionItem) => String(c.value) === String(internalClassId));
      if (!isValidClass) {
        setInternalClassId(String(validClasses[0].value));
        setInternalSectionId('ALL');
      }
    } else {
      setInternalClassId('');
      setInternalSectionId('ALL');
    }
  }, [internalDeptId, filteredClassOptions, internalClassId, hideFilterBar]);

  // Cascading Auto-Reset for standalone mode
  useEffect(() => {
    if (hideFilterBar) return;
    if (internalSectionId && internalSectionId !== 'ALL') {
      const isValidSection = filteredSectionOptions.some(
        (s: OptionItem) => s.value !== 'ALL' && String(s.value) === String(internalSectionId)
      );
      if (!isValidSection) {
        setInternalSectionId('ALL');
      }
    }
  }, [internalClassId, filteredSectionOptions, internalSectionId, hideFilterBar]);

  // Filtered Subject Routines
  const availableSubjects = useMemo(() => {
    if (!activeExamId) return [];
    let list = (examSubjects || []).filter((s: any) => String(s.examId) === String(activeExamId));

    if (activeDeptId && activeDeptId !== 'ALL') {
      list = list.filter(
        (s: any) => s.departmentId === 'ALL' || String(s.departmentId) === String(activeDeptId)
      );
    }

    if (activeClassId) {
      list = list.filter((s: any) => String(s.classId) === String(activeClassId));
    }

    if (activeSectionId && activeSectionId !== 'ALL') {
      list = list.filter(
        (s: any) => s.sectionId === 'ALL' || String(s.sectionId) === String(activeSectionId)
      );
    }

    return list;
  }, [examSubjects, activeExamId, activeDeptId, activeClassId, activeSectionId]);

  // Subject Dropdown Options
  const subjectOptions = useMemo(() => {
    return availableSubjects.map((s: any) => {
      const book = (s.curriculumBookName || '').trim();
      const subject = (s.subjectName || 'Subject').trim();
      const code = (s.subjectCode || '').trim();

      let label = subject;
      if (book && book.toLowerCase() !== subject.toLowerCase()) {
        label = `${book} — ${subject}`;
      }
      if (code && !label.includes(code)) {
        label = `${label} (${code})`;
      }

      return {
        value: String(s.id),
        label,
        subject: s,
      };
    });
  }, [availableSubjects]);

  // Selected Subject Routine
  const selectedSubject = useMemo(() => {
    if (propSelectedSubject) return propSelectedSubject;
    if (!activeSubjectId) {
      return availableSubjects[0] || null;
    }
    return (
      availableSubjects.find((s: any) => String(s.id) === String(activeSubjectId)) ||
      availableSubjects[0] ||
      null
    );
  }, [propSelectedSubject, availableSubjects, activeSubjectId]);

  // Synchronize standalone filter states to URL search parameters
  useEffect(() => {
    if (hideFilterBar || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    let changed = false;

    if (internalExamId) {
      if (url.searchParams.get('examId') !== internalExamId) {
        url.searchParams.set('examId', internalExamId);
        changed = true;
      }
    } else if (url.searchParams.has('examId')) {
      url.searchParams.delete('examId');
      changed = true;
    }

    if (internalClassId) {
      if (url.searchParams.get('classId') !== internalClassId) {
        url.searchParams.set('classId', internalClassId);
        changed = true;
      }
    } else if (url.searchParams.has('classId')) {
      url.searchParams.delete('classId');
      changed = true;
    }

    if (internalSectionId && internalSectionId !== 'ALL') {
      if (url.searchParams.get('sectionId') !== internalSectionId) {
        url.searchParams.set('sectionId', internalSectionId);
        changed = true;
      }
    } else if (url.searchParams.has('sectionId')) {
      url.searchParams.delete('sectionId');
      changed = true;
    }

    if (internalDeptId && internalDeptId !== 'ALL') {
      if (url.searchParams.get('departmentId') !== internalDeptId) {
        url.searchParams.set('departmentId', internalDeptId);
        changed = true;
      }
    } else if (url.searchParams.has('departmentId')) {
      url.searchParams.delete('departmentId');
      changed = true;
    }

    if (internalSubjectId) {
      if (url.searchParams.get('subjectId') !== internalSubjectId) {
        url.searchParams.set('subjectId', internalSubjectId);
        changed = true;
      }
    } else if (url.searchParams.has('subjectId')) {
      url.searchParams.delete('subjectId');
      changed = true;
    }

    if (changed) {
      window.history.replaceState(null, '', url.toString());
    }
  }, [hideFilterBar, internalExamId, internalClassId, internalSectionId, internalDeptId, internalSubjectId]);

  // Filter Target Enrolled Students
  const targetStudents = useMemo(() => {
    if (!selectedSubject) return [];
    return students.filter((st: any) => {
      if (!st) return false;
      const rawClass =
        st.class_id !== undefined
          ? st.class_id
          : st.student_class !== undefined
          ? st.student_class
          : st.classId || st.class;
      const stClassId = typeof rawClass === 'object' ? rawClass?.id : rawClass;
      if (stClassId && selectedSubject?.classId && String(stClassId) !== String(selectedSubject.classId)) {
        return false;
      }

      if (selectedSubject?.sectionId && selectedSubject.sectionId !== 'ALL') {
        const rawSec =
          st.section !== undefined
            ? st.section
            : st.section_id !== undefined
            ? st.section_id
            : st.sectionId || st.student_section;
        const stSecId = typeof rawSec === 'object' ? rawSec?.id : rawSec;
        if (stSecId && String(stSecId) !== String(selectedSubject.sectionId)) {
          return false;
        }
      }

      return true;
    });
  }, [students, selectedSubject?.id, selectedSubject?.classId, selectedSubject?.sectionId]);

  // Active Grading System
  const activeGradingSystem = useMemo(() => {
    if (!selectedExam) return gradingSystems[0] || null;
    return (
      gradingSystems.find((g: any) => g.id === selectedExam.gradingSystemId) ||
      gradingSystems[0] ||
      null
    );
  }, [gradingSystems, selectedExam]);

  return {
    internalExamId,
    setInternalExamId,
    internalDeptId,
    setInternalDeptId,
    internalClassId,
    setInternalClassId,
    internalSectionId,
    setInternalSectionId,
    internalSubjectId,
    setInternalSubjectId,
    activeExamId,
    activeDeptId,
    activeClassId,
    activeSectionId,
    activeSubjectId,
    selectedExam,
    examOptions,
    filteredClassOptions,
    filteredSectionOptions,
    availableSubjects,
    subjectOptions,
    selectedSubject,
    targetStudents,
    activeGradingSystem,
  };
}

export default useMarkEntryScope;
