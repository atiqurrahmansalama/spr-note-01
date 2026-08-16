import React, { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { AlertTriangleIcon, ShieldIcon, TransferIcon, CloseIcon } from "../../../components/ui/Icons";

export default function DepartmentMigrationModal({ isOpen, onClose, department, onMigrated }) {
  const { showToast } = useToast();
  const [departments, setDepartments] = useState([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (isOpen && department) {
      loadDepartments();
      setTargetDepartmentId("");
    }
  }, [isOpen, department]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/departments/");
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        // Guardrail 1: Strictly exclude the source department (Self-Target Prevention)
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
        showToast(data.message || "Department decommissioned and classes migrated successfully!", "success");
        onMigrated?.();
        onClose();
      } else {
        const err = await res.json();
        const errDetails = err.details?.target_department_id || err.error || "Decommissioning failed.";
        showToast(String(errDetails), "error");
      }
    } catch {
      showToast("Network connection error.", "error");
    } finally {
      setMigrating(false);
    }
  };

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none">
      <div className="w-full max-w-md theme-bg-surface border theme-border rounded-3xl shadow-2xl overflow-hidden animate-zoom-in">
        {/* Header */}
        <div className="px-6 py-5 border-b theme-border flex justify-between items-center bg-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <AlertTriangleIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-rose-400">Decommission Department</h2>
              <p className="text-xs theme-text-secondary mt-0.5">Atomic Class &amp; Roster Safe Migration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
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
            <div className="p-3.5 rounded-2xl bg-black/20 border theme-border">
              <span className="text-[10px] uppercase font-bold theme-text-secondary block">Assigned Classes</span>
              <span className="text-xl font-extrabold text-sky-400 mt-0.5 block">
                {department.classes_count ?? 0}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-black/20 border theme-border">
              <span className="text-[10px] uppercase font-bold theme-text-secondary block">Enrolled Students</span>
              <span className="text-xl font-extrabold text-emerald-400 mt-0.5 block">
                {department.students_count ?? 0}
              </span>
            </div>
          </div>

          {/* Destination Department Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Select Destination Department <span className="text-rose-400">*</span>
            </label>
            {loading ? (
              <div className="h-10 w-full bg-zinc-800 animate-pulse rounded-xl" />
            ) : departments.length === 0 ? (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                No alternative active departments found. Please create another department before decommissioning this one.
              </div>
            ) : (
              <select
                value={targetDepartmentId}
                onChange={(e) => setTargetDepartmentId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-elevated focus:outline-none focus:border-sky-500 text-xs font-medium cursor-pointer"
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

          {/* Actions */}
          <div className="pt-4 border-t theme-border flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={migrating || departments.length === 0 || !targetDepartmentId}
              onClick={handleDecommission}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <TransferIcon className="w-3.5 h-3.5" />
              <span>{migrating ? "Migrating & Decommissioning..." : "Migrate Classes & Decommission"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
