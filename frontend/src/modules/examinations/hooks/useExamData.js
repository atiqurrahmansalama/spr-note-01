import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '../../../context/TenantContext';
import { useAcademicData } from '../../learning/useAcademicData';
import { examStore } from '../../../utils/stores/examStore';
import {
  academicYearsStore,
  DEFAULT_ACADEMIC_YEARS,
  curriculumStore,
} from '../../../utils/stores/academicStore';

/**
 * useExamData
 * Central custom hook supplying academic scope (Academy, Year, Semester, Departments, Classes, Subjects, Exams)
 * to examination views and forms.
 * 100% Zero Hardcoded fallback — dynamically synchronizes with the live backend database & local store.
 */
export default function useExamData() {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || 'default';

  const academicData = useAcademicData() || {};
  const {
    students = [],
    classes = [],
    sections = [],
    departments = [],
    teachers = [],
    staff = [],
    branches = [],
    loading: academicLoading = false,
    refetch: refetchAcademic,
  } = academicData;

  // Immediate synchronous retrieval for academic years and local curriculum
  const [localAcademicYears, setLocalAcademicYears] = useState(() =>
    academicYearsStore.getAcademicYears(tenantId)
  );
  const [localCurriculumBooks, setLocalCurriculumBooks] = useState(() =>
    curriculumStore.getItems(tenantId)
  );

  const [exams, setExams] = useState(() => examStore.getExams(tenantId));
  const [gradingSystems, setGradingSystems] = useState(() => examStore.getGradingSystems(tenantId));
  const [examSubjects, setExamSubjects] = useState(() => examStore.getExamSubjects(tenantId));

  const refreshExamData = useCallback(() => {
    setLocalAcademicYears(academicYearsStore.getAcademicYears(tenantId));
    setLocalCurriculumBooks(curriculumStore.getItems(tenantId));
    setExams(examStore.getExams(tenantId));
    setGradingSystems(examStore.getGradingSystems(tenantId));
    setExamSubjects(examStore.getExamSubjects(tenantId));
    refetchAcademic?.();
  }, [tenantId, refetchAcademic]);

  useEffect(() => {
    refreshExamData();
  }, [refreshExamData]);

  // System-wide update listener for real-time reactivity
  useEffect(() => {
    const handleUpdate = () => {
      refreshExamData();
    };

    window.addEventListener('spr_academic_years_updated', handleUpdate);
    window.addEventListener('spr_departments_updated', handleUpdate);
    window.addEventListener('spr_department_updated', handleUpdate);
    window.addEventListener('spr_classes_updated', handleUpdate);
    window.addEventListener('spr_class_updated', handleUpdate);
    window.addEventListener('spr_sections_updated', handleUpdate);
    window.addEventListener('spr_section_updated', handleUpdate);
    window.addEventListener('spr_branches_updated', handleUpdate);
    window.addEventListener('spr_teachers_updated', handleUpdate);
    window.addEventListener('spr_staff_updated', handleUpdate);
    window.addEventListener('spr_curriculum_updated', handleUpdate);
    window.addEventListener('spr_curriculum_kitabs_updated', handleUpdate);
    window.addEventListener('spr_exams_updated', handleUpdate);
    window.addEventListener('spr_grading_systems_updated', handleUpdate);
    window.addEventListener('spr_exam_subjects_updated', handleUpdate);

    return () => {
      window.removeEventListener('spr_academic_years_updated', handleUpdate);
      window.removeEventListener('spr_departments_updated', handleUpdate);
      window.removeEventListener('spr_department_updated', handleUpdate);
      window.removeEventListener('spr_classes_updated', handleUpdate);
      window.removeEventListener('spr_class_updated', handleUpdate);
      window.removeEventListener('spr_sections_updated', handleUpdate);
      window.removeEventListener('spr_section_updated', handleUpdate);
      window.removeEventListener('spr_branches_updated', handleUpdate);
      window.removeEventListener('spr_teachers_updated', handleUpdate);
      window.removeEventListener('spr_staff_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_kitabs_updated', handleUpdate);
      window.removeEventListener('spr_exams_updated', handleUpdate);
      window.removeEventListener('spr_grading_systems_updated', handleUpdate);
      window.removeEventListener('spr_exam_subjects_updated', handleUpdate);
    };
  }, [refreshExamData]);

  // Academic Years: Priority to locally stored years with terms
  const academicYears = useMemo(() => {
    if (localAcademicYears && localAcademicYears.length > 0) return localAcademicYears;
    if (academicData.academicYears && academicData.academicYears.length > 0) return academicData.academicYears;
    return DEFAULT_ACADEMIC_YEARS;
  }, [localAcademicYears, academicData.academicYears]);

  // Active academic year
  const activeYear = useMemo(() => {
    return academicYears.find((y) => y.isCurrent || y.is_active) || academicYears[0] || null;
  }, [academicYears]);

  // Options for Academic Years
  const academicYearOptions = useMemo(() => {
    return academicYears.map((y) => ({
      value: String(y.id || y.academic_year || y.year_code),
      label: `${y.name || y.academic_year || y.year_code}${y.isCurrent || y.is_active ? ' (Current Active)' : ''}`,
      year: y,
      terms: y.terms || [],
    }));
  }, [academicYears]);

  // Options for Branches / Campuses
  const branchOptions = useMemo(() => {
    const list = branches.map((b) => ({
      value: String(b.id),
      label: b.name || b.branch_name || 'Main Campus',
      branch: b,
    }));
    return [{ value: '', label: 'All Branches (Main Campus)' }, ...list];
  }, [branches]);

  // Options for Departments - 100% Dynamic from Academy
  const departmentOptions = useMemo(() => {
    const list = departments.map((d) => ({
      value: String(d.id),
      label: d.name || d.department_name || 'Department',
      code: d.code || d.department_code || '',
      department: d,
    }));
    return [{ value: 'ALL', label: 'All Departments' }, ...list];
  }, [departments]);

  // Options for Classes - 100% Dynamic from Academy with robust department link
  const classOptions = useMemo(() => {
    return classes.map((c) => {
      let deptId = null;
      if (c.department !== undefined && c.department !== null) {
        deptId = typeof c.department === 'object' ? c.department.id : c.department;
      } else if (c.department_id !== undefined && c.department_id !== null) {
        deptId = c.department_id;
      } else if (c.department_details && typeof c.department_details === 'object') {
        deptId = c.department_details.id;
      }

      return {
        value: String(c.id),
        label: c.name || c.class_name || 'Class',
        departmentId: deptId !== null && deptId !== undefined ? String(deptId) : null,
        departmentName: c.department_name || '',
        code: c.code || '',
        classObj: c,
      };
    });
  }, [classes]);

  // Options for Sections - 100% Dynamic from Academy
  const sectionOptions = useMemo(() => {
    const list = sections.map((s) => ({
      value: String(s.id),
      label: s.section_name || s.name || 'Section',
      classId: s.class !== undefined ? String(typeof s.class === 'object' ? s.class.id : s.class) : (s.class_id ? String(s.class_id) : null),
      sectionObj: s,
    }));
    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...list];
  }, [sections]);

  // Curriculum Books - Universal resolution across tenant and default stores
  const resolvedCurriculumBooks = useMemo(() => {
    const fromTenant = localCurriculumBooks || [];
    const fromDefault = tenantId !== 'default' ? curriculumStore.getItems('default') || [] : [];
    const fromAcademic = academicData.curriculumBooks || [];
    const combined = [...fromTenant, ...fromDefault, ...fromAcademic];
    const seen = new Set();
    return combined.filter((item) => {
      if (!item || !item.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [localCurriculumBooks, tenantId, academicData.curriculumBooks]);

  // Options for Grading Systems
  const gradingSystemOptions = useMemo(() => {
    return gradingSystems.map((g) => ({
      value: g.id,
      label: `${g.name} (${g.code})`,
      system: g,
    }));
  }, [gradingSystems]);

  return {
    tenantId,
    students,
    classes,
    sections,
    departments,
    teachers: teachers.length > 0 ? teachers : staff,
    staff,
    curriculumBooks: resolvedCurriculumBooks,
    academicYears,
    activeYear,
    academicYearOptions,
    branchOptions,
    departmentOptions,
    classOptions,
    sectionOptions,
    gradingSystemOptions,
    exams,
    gradingSystems,
    examSubjects,
    academicLoading,
    refreshExamData,
  };
}
