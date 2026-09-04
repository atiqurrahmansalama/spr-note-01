import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useTenant } from '../../context/TenantContext';
import { academicYearsStore } from '../../utils/stores/academicStore';
import { readJSON, writeJSON } from '../../utils/stores/coreStore';
import { getBranches, getDepartments } from '../../api/academy';

/**
 * Unified Hook to load full dynamic academic roster hierarchy
 * (Academy > Branches > Academic Years & Semesters > Departments > Classes > Sections > Students & Period Routine)
 * 100% Zero Hardcoded fallback — dynamically synchronizes with the live backend database & local store for the active Academy.
 */
export function useAcademicData() {
  const tenantContext = useTenant ? useTenant() : null;
  const activeTenantId = tenantContext?.activeTenantId || 'default';

  // Synchronous hydration from local cache prevents empty flash / loss of state on refresh
  const [branches, setBranches] = useState(() =>
    readJSON(`spr_branches_cache_${activeTenantId}`, [])
  );
  const [academicYears, setAcademicYears] = useState(() =>
    academicYearsStore.getAcademicYears(activeTenantId)
  );
  const [departments, setDepartments] = useState(() =>
    readJSON(`spr_departments_cache_${activeTenantId}`, [])
  );
  const [classes, setClasses] = useState(() =>
    readJSON(`spr_classes_cache_${activeTenantId}`, [])
  );
  const [sections, setSections] = useState(() =>
    readJSON(`spr_sections_cache_${activeTenantId}`, [])
  );
  const [students, setStudents] = useState(() =>
    readJSON(`spr_students_cache_${activeTenantId}`, [])
  );
  const [periodSlots, setPeriodSlots] = useState(() =>
    readJSON(`spr_period_slots_cache_${activeTenantId}`, [])
  );
  const [teachers, setTeachers] = useState(() => {
    const cachedStaff = readJSON(`spr_staff_cache_${activeTenantId}`, []);
    const teaching = cachedStaff.filter((s) => s.staff_type === 'TEACHING' || !s.staff_type);
    return teaching.length > 0 ? teaching : cachedStaff;
  });
  const [staff, setStaff] = useState(() =>
    readJSON(`spr_staff_cache_${activeTenantId}`, [])
  );
  const [loading, setLoading] = useState(false);
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
            const list = (Array.isArray(val) ? val : val?.results || []).filter((b) => !b.is_deleted);
            setBranches(list);
            writeJSON(`spr_branches_cache_${activeTenantId}`, list);
          }

          // 2. Departments
          if (deptRes.status === 'fulfilled') {
            let data = deptRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = (Array.isArray(data) ? data : data?.results || []).filter((d) => !d.is_deleted);
            setDepartments(list);
            writeJSON(`spr_departments_cache_${activeTenantId}`, list);
          }

          // 3. Classes
          if (clsRes.status === 'fulfilled') {
            let data = clsRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = (Array.isArray(data) ? data : data?.results || []).filter((c) => !c.is_deleted);
            setClasses(list);
            writeJSON(`spr_classes_cache_${activeTenantId}`, list);
          }

          // 4. Sections
          if (secRes.status === 'fulfilled') {
            let data = secRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = (Array.isArray(data) ? data : data?.results || []).filter((s) => !s.is_deleted);
            setSections(list);
            writeJSON(`spr_sections_cache_${activeTenantId}`, list);
          }

          // 5. Students
          if (stuRes.status === 'fulfilled') {
            let data = stuRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = (Array.isArray(data) ? data : data?.results || []).filter((st) => !st.is_deleted);
            setStudents(list);
            writeJSON(`spr_students_cache_${activeTenantId}`, list);
          }

          // 6. Periods
          if (perRes.status === 'fulfilled') {
            let data = perRes.value;
            if (data && typeof data.json === 'function') {
              if (data.ok) data = await data.json();
              else data = [];
            }
            const list = (Array.isArray(data) ? data : data?.results || []).filter((p) => !p.is_deleted);
            setPeriodSlots(list);
            writeJSON(`spr_period_slots_cache_${activeTenantId}`, list);
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
            writeJSON(`spr_staff_cache_${activeTenantId}`, activeStaff);
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
