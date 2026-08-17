import { useState, useEffect, useCallback } from "react";
import {
  SettingsIcon,
  RefreshIcon,
  TrashIcon,
  EditIcon,
  ClockIcon,
  SleekCheckIcon,
  CloseIcon,
  SaveIcon,
  TeacherIcon
} from "../../components/ui/Icons";
import {
  getAttendancePolicy,
  updateAttendancePolicy,
} from "../../api/attendance";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { useTenant } from "../../context/TenantContext";

export default function AttendanceSettingsView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [activeTab, setActiveTab] = useState("policy"); // 'policy' | 'slots' | 'routines'

  // Policy Settings States
  const [policy, setPolicy] = useState({
    weekend_days: ["FRIDAY", "SATURDAY"],
    default_mode: "DAILY_SINGLE",
    default_late_cutoff_time: "08:30:00",
    auto_excuse_holidays: true,
    auto_notify_absent: false,
  });
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Dynamic Period Slots States
  const [periodSlots, setPeriodSlots] = useState([]);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({
    period_name: "",
    period_order: 1,
    start_time: "08:00",
    end_time: "08:45",
    is_active: true
  });
  const [savingSlot, setSavingSlot] = useState(false);

  // Teacher Routine Schedules States
  const [routines, setRoutines] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [routineForm, setRoutineForm] = useState({
    teacher: "",
    period_slot: "",
    student_class: "",
    student_group: "",
    subject_or_kitab_name: "",
    day_of_week: "ALL",
    is_active: true
  });
  const [savingRoutine, setSavingRoutine] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  // Load Policies and Slots
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [policyRes, slotsRes, routinesRes, tchRes, clsRes, grpRes] = await Promise.all([
        getAttendancePolicy(),
        fetchWithAuth("/attendance/period-slots/"),
        fetchWithAuth("/attendance/routines/"),
        fetchWithAuth("/staff/teachers/"),
        fetchWithAuth("/classes/"),
        fetchWithAuth("/groups/")
      ]);

      if (policyRes) {
        setPolicy({
          weekend_days: policyRes.weekend_days || ["FRIDAY", "SATURDAY"],
          default_mode: policyRes.default_mode || "DAILY_SINGLE",
          default_late_cutoff_time: policyRes.default_late_cutoff_time || "08:30:00",
          auto_excuse_holidays: policyRes.auto_excuse_holidays ?? true,
          auto_notify_absent: policyRes.auto_notify_absent ?? false,
        });
      }

      setPeriodSlots(slotsRes?.results || (Array.isArray(slotsRes) ? slotsRes : []));
      setRoutines(routinesRes?.results || (Array.isArray(routinesRes) ? routinesRes : []));
      setTeachers(tchRes?.results || (Array.isArray(tchRes) ? tchRes : []));
      setClasses(clsRes?.results || (Array.isArray(clsRes) ? clsRes : []));
      setGroups(grpRes?.results || (Array.isArray(grpRes) ? grpRes : []));
    } catch (err) {
      showToast("Failed to load attendance configuration", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  // Weekend Day Toggle
  const toggleWeekendDay = (day) => {
    setPolicy((prev) => {
      const current = prev.weekend_days || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, weekend_days: updated };
    });
  };

  // Save Policy
  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    try {
      await updateAttendancePolicy(policy);
      showToast("Attendance policies updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update attendance policies", "error");
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // --- Dynamic Period Slot Handlers ---
  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setSlotForm({
      period_name: `Period ${periodSlots.length + 1}`,
      period_order: periodSlots.length + 1,
      start_time: "08:00",
      end_time: "08:45",
      is_active: true
    });
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot) => {
    setEditingSlot(slot);
    setSlotForm({
      period_name: slot.period_name,
      period_order: slot.period_order,
      start_time: slot.start_time ? slot.start_time.slice(0, 5) : "08:00",
      end_time: slot.end_time ? slot.end_time.slice(0, 5) : "08:45",
      is_active: slot.is_active
    });
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.period_name.trim()) {
      showToast("Period name is required.", "warning");
      return;
    }
    setSavingSlot(true);
    try {
      if (editingSlot) {
        await fetchWithAuth(`/attendance/period-slots/${editingSlot.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slotForm)
        });
        showToast("Period slot updated.", "success");
      } else {
        await fetchWithAuth("/attendance/period-slots/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(slotForm)
        });
        showToast("Period slot created.", "success");
      }
      setIsSlotModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to save period slot.", "error");
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Are you sure you want to delete this period slot?")) return;
    try {
      await fetchWithAuth(`/attendance/period-slots/${id}/`, { method: "DELETE" });
      showToast("Period slot deleted.", "success");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete slot.", "error");
    }
  };

  // --- Teacher Routine Schedule Handlers ---
  const handleOpenAddRoutine = () => {
    setEditingRoutine(null);
    setRoutineForm({
      teacher: teachers[0]?.id || "",
      period_slot: periodSlots[0]?.id || "",
      student_class: classes[0]?.id || "",
      student_group: "",
      subject_or_kitab_name: "",
      day_of_week: "ALL",
      is_active: true
    });
    setIsRoutineModalOpen(true);
  };

  const handleOpenEditRoutine = (r) => {
    setEditingRoutine(r);
    setRoutineForm({
      teacher: r.teacher || "",
      period_slot: r.period_slot || "",
      student_class: r.student_class || "",
      student_group: r.student_group || "",
      subject_or_kitab_name: r.subject_or_kitab_name || "",
      day_of_week: r.day_of_week || "ALL",
      is_active: r.is_active
    });
    setIsRoutineModalOpen(true);
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!routineForm.teacher || !routineForm.period_slot || !routineForm.student_class || !routineForm.subject_or_kitab_name.trim()) {
      showToast("Teacher, Period Slot, Class, and Kitab/Subject are required.", "warning");
      return;
    }
    setSavingRoutine(true);
    try {
      const payload = {
        ...routineForm,
        student_group: routineForm.student_group || null
      };

      if (editingRoutine) {
        await fetchWithAuth(`/attendance/routines/${editingRoutine.id}/`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast("Routine schedule updated.", "success");
      } else {
        await fetchWithAuth("/attendance/routines/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        showToast("Routine schedule assigned.", "success");
      }
      setIsRoutineModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to save routine.", "error");
    } finally {
      setSavingRoutine(false);
    }
  };

  const handleDeleteRoutine = async (id) => {
    if (!window.confirm("Are you sure you want to delete this routine schedule?")) return;
    try {
      await fetchWithAuth(`/attendance/routines/${id}/`, { method: "DELETE" });
      showToast("Routine schedule deleted.", "success");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete routine.", "error");
    }
  };

  const DAYS_OF_WEEK = [
    { key: "FRIDAY", label: "Friday" },
    { key: "SATURDAY", label: "Saturday" },
    { key: "SUNDAY", label: "Sunday" },
    { key: "MONDAY", label: "Monday" },
    { key: "TUESDAY", label: "Tuesday" },
    { key: "WEDNESDAY", label: "Wednesday" },
    { key: "THURSDAY", label: "Thursday" }
  ];

  return (
    <div className="flex flex-col h-full theme-bg-app theme-text-primary">
      {/* Top Banner */}
      <div className="p-4 border-b theme-border flex flex-wrap items-center justify-between gap-4 theme-bg-surface shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Slots, Routines & Attendance Policy</h1>
            <p className="text-xs theme-text-secondary">
              Configure institution weekends, dynamic periods, and teacher routine assignments.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="p-2 rounded-lg border theme-border theme-bg-sub hover:theme-bg-elevated theme-text-secondary transition"
          title="Refresh All"
        >
          <RefreshIcon className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4 border-b theme-border flex items-center gap-2 theme-bg-surface shrink-0 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("policy")}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === "policy"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Attendance Policy & Weekends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("slots")}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === "slots"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <ClockIcon className="w-4 h-4" />
          <span>Dynamic Period Slots ({periodSlots.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("routines")}
          className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${
            activeTab === "routines"
              ? "border-emerald-500 text-emerald-400 font-bold"
              : "border-transparent theme-text-secondary hover:theme-text-primary"
          }`}
        >
          <TeacherIcon className="w-4 h-4" />
          <span>Teacher Routine Schedules ({routines.length})</span>
        </button>
      </div>

      {/* Tab 1: Attendance Policy */}
      {activeTab === "policy" && (
        <div className="flex-1 p-4 overflow-y-auto max-w-4xl space-y-6">
          {/* Weekend Configuration */}
          <div className="border theme-border rounded-2xl p-5 theme-bg-surface shadow-md space-y-4">
            <div>
              <h2 className="text-sm font-bold">Institutional Weekend Days</h2>
              <p className="text-xs theme-text-secondary mt-0.5">
                Selected days will automatically be excused as weekend holidays across student & teacher registers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = (policy.weekend_days || []).includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleWeekendDay(d.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-2 ${
                      isSelected
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm"
                        : "theme-bg-sub theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated"
                    }`}
                  >
                    <span>{d.label}</span>
                    {isSelected && <SleekCheckIcon className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Policy Toggles */}
          <div className="border theme-border rounded-2xl p-5 theme-bg-surface shadow-md space-y-4 text-xs">
            <h2 className="text-sm font-bold">Automation & Cutoff Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Default Late Cutoff Time</label>
                <input
                  type="time"
                  value={policy.default_late_cutoff_time || "08:30:00"}
                  onChange={(e) => setPolicy({ ...policy, default_late_cutoff_time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border theme-border theme-bg-sub theme-text-primary font-mono text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col justify-end space-y-3">
                <label className="flex items-center gap-2.5 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={policy.auto_excuse_holidays}
                    onChange={(e) => setPolicy({ ...policy, auto_excuse_holidays: e.target.checked })}
                    className="w-4 h-4 rounded border theme-border text-emerald-500 focus:ring-0"
                  />
                  <span>Auto-excuse academic calendar holidays in register</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={policy.auto_notify_absent}
                    onChange={(e) => setPolicy({ ...policy, auto_notify_absent: e.target.checked })}
                    className="w-4 h-4 rounded border theme-border text-emerald-500 focus:ring-0"
                  />
                  <span>Send instant SMS/Guardian notification on absence</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t theme-border flex justify-end">
              <button
                type="button"
                onClick={handleSavePolicy}
                disabled={isSavingPolicy}
                className="px-4 py-2 rounded-xl font-bold theme-bg-accent text-white shadow-md hover:opacity-90 active:scale-95 flex items-center gap-1.5 transition"
              >
                <SaveIcon className="w-4 h-4" />
                <span>{isSavingPolicy ? "Saving Policies..." : "Save Policies"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dynamic Period Slots */}
      {activeTab === "slots" && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Dynamic Period Slots ({periodSlots.length})</h2>
            <button
              type="button"
              onClick={handleOpenAddSlot}
              className="text-xs px-3.5 py-1.5 rounded-lg font-bold theme-bg-accent text-white shadow-sm hover:opacity-90 transition"
            >
              + Add Period Slot
            </button>
          </div>

          <div className="border theme-border rounded-2xl overflow-hidden shadow-md theme-bg-surface">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-sub/70 font-bold theme-text-secondary text-[11px] uppercase">
                  <th className="p-3 w-16 text-center">Order</th>
                  <th className="p-3">Period Name</th>
                  <th className="p-3">Time Span</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {periodSlots.map((slot) => (
                  <tr key={slot.id} className="hover:theme-bg-elevated/40 transition">
                    <td className="p-3 text-center font-mono font-bold text-xs theme-accent">
                      #{slot.period_order}
                    </td>
                    <td className="p-3 font-bold theme-text-primary text-sm">
                      {slot.period_name}
                    </td>
                    <td className="p-3 font-mono text-xs theme-text-secondary">
                      {slot.start_time ? `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}` : "No fixed time"}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${slot.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 theme-text-secondary"}`}>
                        {slot.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSlot(slot)}
                          className="p-1 rounded hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="p-1 rounded hover:theme-bg-sub text-rose-400 hover:text-rose-300 transition"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Teacher Routine Schedules */}
      {activeTab === "routines" && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">Assigned Teacher Routines ({routines.length})</h2>
            <button
              type="button"
              onClick={handleOpenAddRoutine}
              className="text-xs px-3.5 py-1.5 rounded-lg font-bold theme-bg-accent text-white shadow-sm hover:opacity-90 transition"
            >
              + Assign Routine
            </button>
          </div>

          <div className="border theme-border rounded-2xl overflow-hidden shadow-md theme-bg-surface">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b theme-border theme-bg-sub/70 font-bold theme-text-secondary text-[11px] uppercase">
                  <th className="p-3">Teacher</th>
                  <th className="p-3">Period Slot</th>
                  <th className="p-3">Class & Group</th>
                  <th className="p-3">Kitab / Subject</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {routines.map((r) => (
                  <tr key={r.id} className="hover:theme-bg-elevated/40 transition">
                    <td className="p-3 font-bold theme-text-primary">
                      {r.teacher_name}
                    </td>
                    <td className="p-3 font-medium">
                      <span className="theme-accent font-semibold">{r.period_slot_name}</span>
                      {r.period_start_time && (
                        <span className="text-[10px] theme-text-secondary block font-mono">
                          {r.period_start_time.slice(0, 5)} - {r.period_end_time.slice(0, 5)}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="font-semibold">{r.student_class_name}</span>
                      {r.student_group_name && (
                        <span className="text-[10px] theme-text-secondary block">Group: {r.student_group_name}</span>
                      )}
                    </td>
                    <td className="p-3 font-bold theme-accent">
                      {r.subject_or_kitab_name}
                    </td>
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditRoutine(r)}
                          className="p-1 rounded hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRoutine(r.id)}
                          className="p-1 rounded hover:theme-bg-sub text-rose-400 hover:text-rose-300 transition"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Period Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b theme-border flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingSlot ? "Edit Period Slot" : "Add Period Slot"}</h3>
              <button
                type="button"
                onClick={() => setIsSlotModalOpen(false)}
                className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Period Name</label>
                <input
                  type="text"
                  value={slotForm.period_name}
                  onChange={(e) => setSlotForm({ ...slotForm, period_name: e.target.value })}
                  placeholder="e.g. Period 1, Morning Hifz, Night Mutala'a"
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Order Rank</label>
                  <input
                    type="number"
                    value={slotForm.period_order}
                    onChange={(e) => setSlotForm({ ...slotForm, period_order: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Start Time</label>
                  <input
                    type="time"
                    value={slotForm.start_time}
                    onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">End Time</label>
                  <input
                    type="time"
                    value={slotForm.end_time}
                    onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border theme-border theme-bg-sub font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-4 py-1.5 rounded-lg font-bold theme-bg-accent text-white hover:opacity-90 transition"
                >
                  {savingSlot ? "Saving..." : editingSlot ? "Update Slot" : "Create Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Routine Schedule Modal */}
      {isRoutineModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b theme-border flex items-center justify-between">
              <h3 className="font-bold text-sm">{editingRoutine ? "Edit Routine Schedule" : "Assign Teacher Routine"}</h3>
              <button
                type="button"
                onClick={() => setIsRoutineModalOpen(false)}
                className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoutine} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Teacher</label>
                <select
                  value={routineForm.teacher}
                  onChange={(e) => setRoutineForm({ ...routineForm, teacher: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name_en || t.user_phone || `Teacher #${t.id}`}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Period Slot</label>
                <select
                  value={routineForm.period_slot}
                  onChange={(e) => setRoutineForm({ ...routineForm, period_slot: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {periodSlots.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.period_order} - {s.period_name} {s.start_time ? `(${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Class / Grade</label>
                  <select
                    value={routineForm.student_class}
                    onChange={(e) => setRoutineForm({ ...routineForm, student_class: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 theme-text-secondary">Group (Optional)</label>
                  <select
                    value={routineForm.student_group}
                    onChange={(e) => setRoutineForm({ ...routineForm, student_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">No Group / All</option>
                    {groups
                      .filter((g) => !routineForm.student_class || String(g.student_class) === String(routineForm.student_class))
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 theme-text-secondary">Kitab / Subject Name</label>
                <input
                  type="text"
                  value={routineForm.subject_or_kitab_name}
                  onChange={(e) => setRoutineForm({ ...routineForm, subject_or_kitab_name: e.target.value })}
                  placeholder="e.g. Sahih al-Bukhari, Hifz Sabak, Math"
                  className="w-full px-3 py-2 rounded-lg border theme-border theme-bg-sub theme-text-primary font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRoutineModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border theme-border theme-bg-sub font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRoutine}
                  className="px-4 py-1.5 rounded-lg font-bold theme-bg-accent text-white hover:opacity-90 transition"
                >
                  {savingRoutine ? "Saving..." : editingRoutine ? "Update Routine" : "Assign Routine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
