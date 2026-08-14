import { useState, useEffect } from "react";
import apiClient from "../../../api/axios";
import { useToast } from "../../../context/ToastContext";

export default function QuickAdmissionForm({ onCancel, onSuccess, sharedData, setSharedData }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [newGroupActive, setNewGroupActive] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    // Fetch available groups/classes
    apiClient.get("/groups/")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setGroups(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to load student groups", err);
      });
  }, []);

  const handleChange = (field, val) => {
    setSharedData((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!sharedData.name?.trim()) {
      showToast("Student English Name is required", "warning");
      return;
    }
    if (!sharedData.guardian_phone?.trim()) {
      showToast("Guardian Phone Number is required", "warning");
      return;
    }

    setLoading(true);
    const finalGroupName = newGroupActive ? newGroupName : (sharedData.group_name || "General Group");

    const payload = {
      name: sharedData.name,
      student_id_card_number: sharedData.student_id_card_number || null,
      group_name: finalGroupName,
      admission_mode: "QUICK",
      status: "ACTIVE",
      guardian_data: {
        primary_guardian_phone: sharedData.guardian_phone,
        primary_guardian_name: "Guardian of " + sharedData.name,
        guardian_relation: "Father",
      },
    };

    try {
      const response = await apiClient.post("/students/admission/", payload);
      if (response.status === 201) {
        showToast("Student enrolled successfully", "success");
        if (onSuccess) {
          onSuccess(response.data);
        }
      }
    } catch (err) {
      console.error(err);
      const errors = err.response?.data;
      if (errors && typeof errors === "object") {
        const firstError = Object.values(errors)[0];
        showToast(Array.isArray(firstError) ? firstError[0] : "Failed to enroll student", "error");
      } else {
        showToast("Failed to enroll student. Please check your inputs.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleEnroll} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold theme-text-secondary mb-1">
          Student Full Name (English) *
        </label>
        <input
          type="text"
          value={sharedData.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          placeholder="e.g. Abdullah bin Arif"
          className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold theme-text-secondary mb-1">
            Student ID / Roll (Optional)
          </label>
          <input
            type="text"
            value={sharedData.student_id_card_number || ""}
            onChange={(e) => handleChange("student_id_card_number", e.target.value)}
            placeholder="e.g. STU-2026-001"
            className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold theme-text-secondary mb-1">
            Guardian Phone Number *
          </label>
          <input
            type="text"
            value={sharedData.guardian_phone || ""}
            onChange={(e) => handleChange("guardian_phone", e.target.value)}
            required
            placeholder="e.g. 01712345678"
            className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-xs font-semibold theme-text-secondary">
            Class / Group *
          </label>
          <button
            type="button"
            onClick={() => setNewGroupActive(!newGroupActive)}
            className="text-[11px] text-[var(--accent-main)] hover:underline focus:outline-none cursor-pointer"
          >
            {newGroupActive ? "Select Existing Class" : "Create New Class"}
          </button>
        </div>

        {newGroupActive ? (
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
            placeholder="Enter new class/group name..."
            className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          />
        ) : (
          <select
            value={sharedData.group_name || ""}
            onChange={(e) => handleChange("group_name", e.target.value)}
            className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          >
            <option value="">Select a Group/Class</option>
            {groups.map((grp) => (
              <option key={grp.id} value={grp.name}>
                {grp.name}
              </option>
            ))}
            {groups.length === 0 && <option value="General Group">General Group</option>}
          </select>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold theme-text-secondary mb-1">
          Initial Juz / Completion Level (Optional)
        </label>
        <input
          type="number"
          min="0"
          max="30"
          value={sharedData.initial_completed_juz || 0}
          onChange={(e) => handleChange("initial_completed_juz", e.target.value)}
          placeholder="e.g. 5"
          className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
        />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t theme-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium theme-bg-sub theme-text-primary hover:theme-bg-sub-hover rounded-xl transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          {loading ? "Enrolling..." : "Save and Enroll Student"}
        </button>
      </div>
    </form>
  );
}
