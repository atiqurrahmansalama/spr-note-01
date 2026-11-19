import { useState, useEffect, useCallback, useRef } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import { useTenant } from "../../../../context/TenantContext";
import { readJSON, writeJSON } from "../../../../stores/coreStore";
import { academicYearsStore } from "../../../../stores/academicStore";
import { students as studentStore } from "../../../../utils/localStore";
import { StudentRecord, StudentMetrics, BulkActionType } from "../types";

/**
 * Normalizes student fields from either Django REST API or LocalStorage cache
 * into a single unified StudentRecord shape with full academic metadata.
 */
function normalizeStudentRecord(s: any): StudentRecord {
  if (!s || typeof s !== "object") return s;
  const id = String(s.id ?? s._id ?? s.uniq_id ?? `stu_${Date.now()}`);
  const name_en = s.name_en || s.name || s.label || "Student";
  const name = s.name || s.name_en || s.label || "Student";
  const className =
    s.student_class_name ||
    s.class_name ||
    (typeof s.student_class === "object" ? s.student_class?.name : null) ||
    "";
  const sectionName =
    s.section_name ||
    s.student_section_name ||
    (typeof s.section === "object" ? s.section?.section_name || s.section?.name : null) ||
    "";
  const groupName =
    s.student_group_name ||
    s.group_name ||
    (typeof s.student_group === "object" ? s.student_group?.name : null) ||
    "";
  const roll = s.roll_number !== undefined ? s.roll_number : s.roll !== undefined ? s.roll : "";
  const status = s.status || (s.is_active === false ? "Inactive" : "Active");

  const studentClassId =
    s.student_class_id ||
    (typeof s.student_class === "object" ? s.student_class?.id : s.student_class) ||
    "";
  const sectionId =
    s.section_id ||
    s.student_section ||
    (typeof s.section === "object" ? s.section?.id : s.section) ||
    "";
  const studentGroupId =
    s.student_group_id ||
    (typeof s.student_group === "object" ? s.student_group?.id : s.student_group) ||
    "";

  const deptId = String(
    s.department_id ||
    s.department ||
    (typeof s.department === "object" ? s.department?.id : null) ||
    (typeof s.student_class === "object"
      ? s.student_class?.department?.id || s.student_class?.department_id || s.student_class?.department
      : null) ||
    ""
  );

  const deptName = String(
    s.department_name ||
    (typeof s.department === "object" ? s.department?.name : null) ||
    (typeof s.student_class === "object"
      ? s.student_class?.department?.name || s.student_class?.department_name
      : null) ||
    ""
  );

  const acadYear = String(
    s.academic_year ||
    s.session_year ||
    (s.admission_date ? String(s.admission_date).split("-")[0] : "") ||
    (s.created_at ? String(s.created_at).split("-")[0] : "") ||
    ""
  ).trim();

  return {
    ...s,
    id,
    name_en,
    name,
    student_class_id: studentClassId,
    student_class_name: className,
    class_name: className,
    section_id: sectionId,
    section_name: sectionName,
    student_section_name: sectionName,
    student_group_id: studentGroupId,
    group_name: groupName,
    student_group_name: groupName,
    department_id: deptId,
    department: deptId,
    department_name: deptName,
    academic_year: acadYear,
    session_year: acadYear,
    roll_number: roll,
    roll: roll,
    status,
    details: {
      ...(s.details || {}),
      guardian_phone: s.details?.guardian_phone || s.guardian_phone || s.phone || "",
      father_name: s.details?.father_name || s.father_name || "",
      guardian_name: s.details?.guardian_name || s.guardian_name || "",
    },
  };
}

export function useStudentDirectoryData(onTenantReset?: () => void) {
  const { showToast } = useToast() as any;
  const tenantCtx = useTenant?.() || {};
  const activeTenantId =
    tenantCtx.activeTenantId ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("active_tenant_id") || "default" : "default");

  // Helper to read cached local students for instant reactivity & offline resilience
  const getCachedStudents = useCallback((): StudentRecord[] => {
    try {
      const cacheKey = `spr_students_cache_${activeTenantId}`;
      const cached = readJSON(cacheKey, null);
      if (Array.isArray(cached) && cached.length > 0) {
        return cached.map(normalizeStudentRecord);
      }
      const localStoreList = studentStore.getAll?.() || [];
      if (Array.isArray(localStoreList) && localStoreList.length > 0) {
        return localStoreList.map(normalizeStudentRecord);
      }
    } catch (e) {
      console.warn("Failed reading student cache:", e);
    }
    return [];
  }, [activeTenantId]);

  const [students, setStudents] = useState<StudentRecord[]>(() => getCachedStudents());
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(() => getCachedStudents().length === 0);
  const [metrics, setMetrics] = useState<StudentMetrics>(() => {
    const initial = getCachedStudents();
    return {
      total_students: initial.length,
      active_students: initial.filter((s) => (s.status || "Active").toLowerCase() === "active").length,
      new_admissions_this_month: 0,
      avg_juz_completed: 0.0,
    };
  });

  const loadClassesAndGroups = useCallback(async () => {
    try {
      const [cRes, gRes, sRes, dRes] = await Promise.allSettled([
        fetchWithAuth("/api/v1/classes/?page_size=500&all=true"),
        fetchWithAuth("/api/v1/groups/?page_size=500&all=true"),
        fetchWithAuth("/api/v1/sections/?page_size=500&all=true"),
        fetchWithAuth("/api/v1/departments/?page_size=500&all=true"),
      ]);
      if (cRes.status === "fulfilled" && cRes.value.ok) {
        const cData = await cRes.value.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }
      if (gRes.status === "fulfilled" && gRes.value.ok) {
        const gData = await gRes.value.json();
        setGroups(Array.isArray(gData) ? gData : gData.results || []);
      }
      if (sRes.status === "fulfilled" && sRes.value.ok) {
        const sData = await sRes.value.json();
        setSections(Array.isArray(sData) ? sData : sData.results || []);
      }
      if (dRes.status === "fulfilled" && dRes.value.ok) {
        const dData = await dRes.value.json();
        setDepartments(Array.isArray(dData) ? dData : dData.results || []);
      }

      // Load Academic Years
      const yearsList = academicYearsStore.getAcademicYears(activeTenantId) || [];
      setAcademicYears(yearsList);
    } catch {}
  }, [activeTenantId]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/v1/students/?page_size=500&all=true");
      if (res.ok) {
        const data = await res.json();
        const rawList = Array.isArray(data) ? data : data.results || [];
        if (rawList.length > 0) {
          const normalized = rawList.map(normalizeStudentRecord);
          setStudents(normalized);
          writeJSON(`spr_students_cache_${activeTenantId}`, normalized);
        } else {
          // If online endpoint returns empty for this tenant, fallback to local storage
          const localFallback = getCachedStudents();
          if (localFallback.length > 0) {
            setStudents(localFallback);
          } else {
            setStudents([]);
          }
        }
      } else {
        // Fallback gracefully on HTTP error (401, 403, 500)
        const localFallback = getCachedStudents();
        if (localFallback.length > 0) {
          setStudents(localFallback);
        }
      }
    } catch (err) {
      console.warn("loadStudents online fetch warning:", err);
      const localFallback = getCachedStudents();
      if (localFallback.length > 0) {
        setStudents(localFallback);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, getCachedStudents]);

  const studentsRef = useRef<StudentRecord[]>(students);
  studentsRef.current = students;

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/v1/students/metrics/");
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          setMetrics(data);
          return;
        }
      }
    } catch {}

    // Dynamic metrics fallback computed from current student records without causing render loops
    setMetrics((prev) => {
      const currentList = studentsRef.current.length > 0 ? studentsRef.current : getCachedStudents();
      return {
        total_students: currentList.length,
        active_students: currentList.filter(
          (s) => (s.status || "Active").toLowerCase() === "active"
        ).length,
        new_admissions_this_month: prev.new_admissions_this_month || 0,
        avg_juz_completed: prev.avg_juz_completed || 0.0,
      };
    });
  }, [getCachedStudents]);

  const refreshData = useCallback(() => {
    loadStudents();
    loadClassesAndGroups();
    loadMetrics();
  }, [loadStudents, loadClassesAndGroups, loadMetrics]);

  // Initial mount trigger & tenant changes: ONLY re-runs when activeTenantId actually changes
  useEffect(() => {
    refreshData();

    const handleDataUpdated = () => {
      const updatedLocal = getCachedStudents();
      if (updatedLocal.length > 0) {
        setStudents(updatedLocal);
      }
      refreshData();
    };

    const handleTenantChanged = () => {
      onTenantReset?.();
      const tenantLocal = getCachedStudents();
      setStudents(tenantLocal);
      refreshData();
    };

    window.addEventListener("spr_students_updated", handleDataUpdated);
    window.addEventListener("spr_student_admitted", handleDataUpdated);
    window.addEventListener("spr_student_updated", handleDataUpdated);
    window.addEventListener("spr_tenant_changed", handleTenantChanged);

    return () => {
      window.removeEventListener("spr_students_updated", handleDataUpdated);
      window.removeEventListener("spr_student_admitted", handleDataUpdated);
      window.removeEventListener("spr_student_updated", handleDataUpdated);
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
    };
  }, [activeTenantId]);

  const handleDeleteSingle = async (id: string | number, studentName?: string) => {
    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Student record deleted.", "success");
        // Update local cache
        const cacheKey = `spr_students_cache_${activeTenantId}`;
        const cached = readJSON(cacheKey, []);
        const filtered = cached.filter((s: any) => String(s.id) !== String(id));
        writeJSON(cacheKey, filtered);
        studentStore.remove?.(id);
        window.dispatchEvent(new CustomEvent("spr_students_updated"));
        refreshData();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Failed to delete record.", "error");
        return false;
      }
    } catch {
      showToast("Failed to delete record.", "error");
      return false;
    }
  };

  const handleBulkAction = async (
    actionType: BulkActionType,
    selectedIds: (string | number)[],
    statusInput: string
  ) => {
    if (!actionType) return false;
    if (selectedIds.length === 0) {
      showToast("No students selected.", "warning");
      return false;
    }

    try {
      const payload: any = {
        action: actionType,
        student_ids: selectedIds,
      };

      if (actionType === "change_status") {
        payload.status = statusInput;
      }

      const res = await fetchWithAuth("/api/v1/students/bulk-action/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Bulk operation successful!", "success");
        window.dispatchEvent(new CustomEvent("spr_students_updated"));
        refreshData();
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Bulk action failed.", "error");
        return false;
      }
    } catch {
      showToast("Error processing bulk action.", "error");
      return false;
    }
  };

  return {
    students,
    departments,
    classes,
    groups,
    sections,
    academicYears,
    loading,
    metrics,
    refreshData,
    handleDeleteSingle,
    handleBulkAction,
  };
}
