import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
import { StudentRecord, StudentMetrics, BulkActionType } from "../types";

export function useStudentDirectoryData(onTenantReset?: () => void) {
  const { showToast } = useToast() as any;

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<StudentMetrics>({
    total_students: 0,
    active_students: 0,
    new_admissions_this_month: 0,
    avg_juz_completed: 0.0,
  });

  const loadClassesAndGroups = useCallback(async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        fetchWithAuth("/api/v1/classes/"),
        fetchWithAuth("/api/v1/groups/"),
      ]);
      if (cRes.ok) {
        const cData = await cRes.json();
        setClasses(Array.isArray(cData) ? cData : cData.results || []);
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setGroups(Array.isArray(gData) ? gData : gData.results || []);
      }
    } catch {}
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/students/");
      if (res.ok) {
        const data = await res.json();
        setStudents(data.results || data);
      }
    } catch {
      showToast("Failed to load students.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/v1/students/metrics/");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {}
  }, []);

  const refreshData = useCallback(() => {
    loadStudents();
    loadClassesAndGroups();
    loadMetrics();
  }, [loadStudents, loadClassesAndGroups, loadMetrics]);

  useEffect(() => {
    refreshData();

    const handleTenantChanged = () => {
      onTenantReset?.();
      refreshData();
    };
    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => window.removeEventListener("spr_tenant_changed", handleTenantChanged);
  }, [refreshData, onTenantReset]);

  const handleDeleteSingle = async (id: string | number, studentName?: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete student record "${studentName || ""}"? This action cannot be undone.`
      )
    ) {
      return false;
    }

    try {
      const res = await fetchWithAuth(`/api/v1/students/${id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Student record deleted.", "success");
        loadStudents();
        loadMetrics();
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
        loadStudents();
        loadMetrics();
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
    classes,
    groups,
    loading,
    metrics,
    refreshData,
    handleDeleteSingle,
    handleBulkAction,
  };
}
