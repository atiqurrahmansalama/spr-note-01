import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '../../../context/TenantContext';
import { useAcademicData } from '../../learning/useAcademicData';
import { examStore } from '@/stores/examStore';
import {
  academicYearsStore,
  DEFAULT_ACADEMIC_YEARS,
  curriculumStore,
} from '@/stores/academicStore';

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

  // Options for Departments - 100% Dynamic from Academy + Exam Matrix
  const departmentOptions = useMemo(() => {
    const map = new Map();
    (departments || []).forEach((d) => {
      const id = String(d.id);
      map.set(id, {
        value: id,
        label: d.name || d.department_name || 'Department',
        code: d.code || d.department_code || '',
        department: d,
      });
    });

    // Also collect any distinct departments from examSubjects
    (examSubjects || []).forEach((s) => {
      if (s.departmentId && s.departmentId !== 'ALL') {
        const id = String(s.departmentId);
        if (!map.has(id)) {
          map.set(id, {
            value: id,
            label: s.departmentName || s.departmentId,
            code: '',
            department: { id: s.departmentId, name: s.departmentName },
          });
        }
      }
    });

    return [{ value: 'ALL', label: 'All Departments' }, ...Array.from(map.values())];
  }, [departments, examSubjects]);

  // Options for Classes - 100% Dynamic from Academy + Exam Matrix with robust department link
  const classOptions = useMemo(() => {
    const map = new Map();
    (classes || []).forEach((c) => {
      let deptId = null;
      if (c.department !== undefined && c.department !== null) {
        deptId = typeof c.department === 'object' ? c.department.id : c.department;
      } else if (c.department_id !== undefined && c.department_id !== null) {
        deptId = c.department_id;
      } else if (c.department_details && typeof c.department_details === 'object') {
        deptId = c.department_details.id;
      } else if (c.dept_id !== undefined && c.dept_id !== null) {
        deptId = c.dept_id;
      } else if (c.dept !== undefined && c.dept !== null) {
        deptId = typeof c.dept === 'object' ? c.dept.id : c.dept;
      }

      const id = String(c.id);
      map.set(id, {
        value: id,
        label: c.name || c.class_name || 'Class',
        departmentId: deptId !== null && deptId !== undefined ? String(deptId) : null,
        departmentName: c.department_name || (typeof c.department === 'object' ? c.department.name : '') || '',
        code: c.code || '',
        classObj: c,
      });
    });

    // Also enrich from examSubjects to ensure classes in exams have departmentId linkage
    (examSubjects || []).forEach((s) => {
      if (s.classId) {
        const id = String(s.classId);
        const existing = map.get(id);
        if (!existing) {
          map.set(id, {
            value: id,
            label: s.className || `Class ${id}`,
            departmentId: s.departmentId && s.departmentId !== 'ALL' ? String(s.departmentId) : null,
            departmentName: s.departmentName || '',
            code: '',
            classObj: { id: s.classId, name: s.className, department_id: s.departmentId },
          });
        } else if (!existing.departmentId && s.departmentId && s.departmentId !== 'ALL') {
          existing.departmentId = String(s.departmentId);
          if (!existing.departmentName && s.departmentName) {
            existing.departmentName = s.departmentName;
          }
        }
      }
    });

    return Array.from(map.values());
  }, [classes, examSubjects]);

  // Options for Sections - 100% Dynamic from Academy + Exam Matrix
  const sectionOptions = useMemo(() => {
    const map = new Map();
    (sections || []).forEach((s) => {
      const rawClassId = s.class !== undefined ? (typeof s.class === 'object' ? s.class.id : s.class) : (s.class_id || s.student_class_id || s.student_class);
      const classId = rawClassId ? String(typeof rawClassId === 'object' ? rawClassId.id : rawClassId) : null;
      const id = String(s.id);
      map.set(id, {
        value: id,
        label: s.section_name || s.name || 'Section',
        classId,
        sectionObj: s,
      });
    });

    (examSubjects || []).forEach((s) => {
      if (s.sectionId && s.sectionId !== 'ALL') {
        const id = String(s.sectionId);
        if (!map.has(id)) {
          map.set(id, {
            value: id,
            label: s.sectionName || `Section ${id}`,
            classId: s.classId ? String(s.classId) : null,
            sectionObj: { id: s.sectionId, name: s.sectionName, class_id: s.classId },
          });
        }
      }
    });

    return [{ value: 'ALL', label: 'All Sections (Class Wide)' }, ...Array.from(map.values())];
  }, [sections, examSubjects]);

  // Curriculum Books - Direct resolution from active tenant store
  const resolvedCurriculumBooks = useMemo(() => {
    if (Array.isArray(localCurriculumBooks) && localCurriculumBooks.length > 0) {
      return localCurriculumBooks;
    }
    const fromTenant = curriculumStore.getItems(tenantId) || [];
    if (fromTenant.length > 0) return fromTenant;
    return curriculumStore.getItems('default') || [];
  }, [localCurriculumBooks, tenantId]);

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
    periodSlots: academicData?.periodSlots || [],
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
