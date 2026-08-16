import React, { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { ShieldIcon, TransferIcon } from "../../../components/ui/Icons";

export default function DepartmentMigrationForm({ department, onMigrated, onCancel }) {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (department) {
      loadDepartments();
      setTargetDepartmentId("");
    }
  }, [department]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        // Strictly exclude the source department
        const available = list.filter((d) => String(d.id) !== String(department?.id) && !d.is_deleted);
        setDepartments(available);
        if (available.length > 0) {
          setTargetDepartmentId(available[0].id);
        }
      }
    } catch {
      showToast("Failed to fetch destination departments.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDecommission = async () => {
    if (!targetDepartmentId) {
      showToast("Please select a target destination department.", "warning");
      return;
    }

    if (String(targetDepartmentId) === String(department?.id)) {
      showToast("Cannot migrate to the department being decommissioned.", "error");
      return;
    }

    setMigrating(true);
    try {
      const res = await fetchWithAuth(`/api/v1/departments/${department.id}/delete-with-migration/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_department_id: targetDepartmentId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.status || "Department successfully decommissioned and classes migrated.", "success");
        onMigrated?.();
      } else {
        const err = await res.json();
        showToast(err.target_department_id?.[0] || err.error || "Decommission failed.", "error");
      }
    } catch {
      showToast("Network connection error.", "error");
    } finally {
      setMigrating(false);
    }
  };

  if (!department) return null;

  return (
    <div className="p-4 sm:p-5 space-y-4 h-full overflow-y-auto theme-text-primary">
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
        <div className="font-bold flex items-center gap-1.5">
          <ShieldIcon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Zero-Downtime Safe Decommission</span>
        </div>
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          Decommissioning <strong>"{department.name}"</strong> will reassign all active classes to your chosen target department. Existing student profiles and class structures will be completely preserved.
        </p>
      </div>

      {/* Impact Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl theme-bg-sub border theme-border">
          <span className="text-[10px] uppercase font-bold theme-text-secondary block">Assigned Classes</span>
          <span className="text-xl font-extrabold text-sky-400 mt-0.5 block">
            {department.classes_count ?? 0}
          </span>
        </div>
        <div className="p-3 rounded-2xl theme-bg-sub border theme-border">
          <span className="text-[10px] uppercase font-bold theme-text-secondary block">Enrolled Students</span>
          <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">
            {department.students_count ?? 0}
          </span>
        </div>
      </div>

      {/* Destination Department Selector */}
      <div>
        <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
          Select Destination Department <span className="text-rose-400">*</span>
        </label>
        {loading ? (
          <div className="h-10 w-full theme-bg-sub animate-pulse rounded-xl" />
        ) : departments.length === 0 ? (
          <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            No alternative active departments found. Please create another department before decommissioning this one.
          </div>
        ) : (
          <select
            value={targetDepartmentId}
            onChange={(e) => setTargetDepartmentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-medium cursor-pointer theme-text-primary"
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.code ? `(${d.code})` : ""} • {d.classes_count || 0} classes
              </option>
            ))}
          </select>
        )}
        <p className="text-[10px] theme-text-secondary mt-1">
          Self-migration is prohibited. All classes from "{department.name}" will move to this target.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t theme-border flex justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={migrating}
          className="px-3.5 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={migrating || departments.length === 0 || !targetDepartmentId}
          onClick={handleDecommission}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
        >
          <TransferIcon className="w-3.5 h-3.5" />
          <span>{migrating ? "Migrating..." : "Migrate & Decommission"}</span>
        </button>
      </div>
    </div>
  );
}
