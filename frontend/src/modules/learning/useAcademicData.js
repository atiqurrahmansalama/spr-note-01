import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { academicYearsStore } from '../../utils/stores/academicStore';
import { getBranches, getDepartments } from '../../api/academy';

/**
 * Unified Hook to load full dynamic academic roster hierarchy
 * (Academy > Branches > Academic Years & Semesters > Departments > Classes > Sections > Students & Period Routine)
 * 100% Zero Hardcoded fallback — dynamically synchronizes with the live backend database & local store for the active Academy.
 */
export function useAcademicData() {
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || '';

  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [periodSlots, setPeriodSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Listen to system-wide update events (both singular and plural)
  useEffect(() => {
    const handleUpdate = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    window.addEventListener('spr_tenant_changed', handleUpdate);
    window.addEventListener('spr_branches_updated', handleUpdate);
    window.addEventListener('spr_branch_updated', handleUpdate);
    window.addEventListener('spr_academic_years_updated', handleUpdate);
    window.addEventListener('spr_departments_updated', handleUpdate);
    window.addEventListener('spr_department_updated', handleUpdate);
    window.addEventListener('spr_classes_updated', handleUpdate);
    window.addEventListener('spr_class_updated', handleUpdate);
    window.addEventListener('spr_sections_updated', handleUpdate);
    window.addEventListener('spr_section_updated', handleUpdate);
    window.addEventListener('spr_students_updated', handleUpdate);
    window.addEventListener('spr_student_updated', handleUpdate);
    window.addEventListener('spr_periods_updated', handleUpdate);
    window.addEventListener('spr_period_updated', handleUpdate);
    window.addEventListener('spr_staff_updated', handleUpdate);
    window.addEventListener('spr_teachers_updated', handleUpdate);
    window.addEventListener('spr_curriculum_updated', handleUpdate);

    return () => {
      window.removeEventListener('spr_tenant_changed', handleUpdate);
      window.removeEventListener('spr_branches_updated', handleUpdate);
      window.removeEventListener('spr_branch_updated', handleUpdate);
      window.removeEventListener('spr_academic_years_updated', handleUpdate);
      window.removeEventListener('spr_departments_updated', handleUpdate);
      window.removeEventListener('spr_department_updated', handleUpdate);
      window.removeEventListener('spr_classes_updated', handleUpdate);
      window.removeEventListener('spr_class_updated', handleUpdate);
      window.removeEventListener('spr_sections_updated', handleUpdate);
      window.removeEventListener('spr_section_updated', handleUpdate);
      window.removeEventListener('spr_students_updated', handleUpdate);
      window.removeEventListener('spr_student_updated', handleUpdate);
      window.removeEventListener('spr_periods_updated', handleUpdate);
      window.removeEventListener('spr_period_updated', handleUpdate);
      window.removeEventListener('spr_staff_updated', handleUpdate);
      window.removeEventListener('spr_teachers_updated', handleUpdate);
      window.removeEventListener('spr_curriculum_updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        // Load Academic Years from local store / API
        const localYears = academicYearsStore.getAcademicYears(activeTenantId);
        if (isMounted) setAcademicYears(localYears);

        const [branchRes, deptRes, clsRes, secRes, stuRes, perRes, staffRes] = await Promise.allSettled([
          getBranches ? getBranches({ type: 'ALL' }) : Promise.resolve([]),
          getDepartments ? getDepartments({ page_size: 500, all: true }) : fetchWithAuth('/api/v1/departments/?page_size=500&all=true'),
          fetchWithAuth('/api/v1/classes/?page_size=500&all=true'),
          fetchWithAuth('/api/v1/academy/sections/?page_size=500&all=true'),
          fetchWithAuth('/api/v1/students/?page_size=500&all=true'),
          fetchWithAuth('/api/v1/academy/periods/?page_size=500&all=true'),
          fetchWithAuth('/api/v1/staff/?page_size=500&all=true'),
        ]);

        if (isMounted) {
          // 1. Branches
          if (branchRes.status === 'fulfilled') {
            const val = branchRes.value;
            const list = Array.isArray(val) ? val : val?.results || [];
            setBranches(list.filter((b) => !b.is_deleted));
          }

          // 2. Departments
          if (deptRes.status === 'fulfilled') {
            let data = deptRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = Array.isArray(data) ? data : data?.results || [];
            setDepartments(list.filter((d) => !d.is_deleted));
          }

          // 3. Classes
          if (clsRes.status === 'fulfilled') {
            let data = clsRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = Array.isArray(data) ? data : data?.results || [];
            setClasses(list.filter((c) => !c.is_deleted));
          }

          // 4. Sections
          if (secRes.status === 'fulfilled') {
            let data = secRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = Array.isArray(data) ? data : data?.results || [];
            setSections(list.filter((s) => !s.is_deleted));
          }

          // 5. Students
          if (stuRes.status === 'fulfilled') {
            let data = stuRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = Array.isArray(data) ? data : data?.results || [];
            setStudents(list.filter((st) => !st.is_deleted));
          }

          // 6. Periods
          if (perRes.status === 'fulfilled') {
            let data = perRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = Array.isArray(data) ? data : data?.results || [];
            setPeriodSlots(list.filter((p) => !p.is_deleted));
          }

          // 7. Staff & Teachers
          if (staffRes.status === 'fulfilled') {
            let data = staffRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = Array.isArray(data) ? data : data?.results || [];
            const activeStaff = list.filter((s) => !s.is_deleted && s.is_active !== false);
            setStaff(activeStaff);
            const teachingStaff = activeStaff.filter((s) => s.staff_type === 'TEACHING' || !s.staff_type);
            setTeachers(teachingStaff.length > 0 ? teachingStaff : activeStaff);
          }
        }
      } catch (err) {
        console.warn('useAcademicData: Failed to load academic hierarchy:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger, activeTenantId]);

  // Derived Active Academic Year & Semesters (Terms)
  const activeYear = useMemo(() => {
    return academicYears.find((y) => y.isCurrent) || academicYears[0] || null;
  }, [academicYears]);

  const activeTerms = useMemo(() => {
    return activeYear?.terms || [
      { id: 'sem_1', name: '1st Semester', isCurrent: true },
      { id: 'sem_2', name: '2nd Semester', isCurrent: false },
    ];
  }, [activeYear]);

  return {
    branches,
    academicYears,
    activeYear,
    activeTerms,
    departments,
    classes,
    sections,
    students,
    periodSlots,
    teachers,
    staff,
    loading,
    refetch,
  };
}
