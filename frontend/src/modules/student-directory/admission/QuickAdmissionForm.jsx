import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import CustomSelect from "../../../components/ui/CustomSelect";
import { CheckCircleIcon } from "../../../components/ui/Icons";

export default function QuickAdmissionForm({ onCancel, onSuccess, sharedData, setSharedData }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    // Fetch available institutional classes
    fetchWithAuth("/api/v1/classes/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const list = Array.isArray(data) ? data : (data.results || []);
        setClasses(list.map((c) => ({ label: c.name, value: c.id, name: c.name })));
      })
      .catch((err) => {
        console.error("Failed to load classes", err);
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
      showToast("Student Full Name is required", "warning");
      return;
    }
    if (!sharedData.student_class && !sharedData.education_status) {
      showToast("Please select an Institutional Class", "warning");
      return;
    }
    if (!sharedData.guardian_phone?.trim()) {
      showToast("Primary Guardian Phone is required", "warning");
      return;
    }

    setLoading(true);

    const selectedClassObj = classes.find((c) => c.value === sharedData.student_class);

    const parsedRoll = sharedData.roll_number && parseInt(sharedData.roll_number, 10) > 0 
      ? parseInt(sharedData.roll_number, 10) 
      : null;

    const payload = {
      name: sharedData.name,
      student_id_card_number: sharedData.student_id_card_number || null,
      student_class: sharedData.student_class || null,
      roll_number: parsedRoll,
      education_status: selectedClassObj ? selectedClassObj.name : (sharedData.education_status || ""),
      admission_mode: "QUICK",
      status: "ACTIVE",
      guardian_data: {
        primary_guardian_phone: sharedData.guardian_phone,
        primary_guardian_name: "Guardian of " + sharedData.name,
        guardian_relation: "Father",
      },
    };

    try {
      const response = await fetchWithAuth("/api/v1/students/admission/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        showToast("Student enrolled successfully!", "success");
        if (onSuccess) {
          onSuccess(data);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        let errorMsg = "Failed to enroll student. Please check inputs.";
        if (typeof errorData === "object" && errorData !== null) {
          const firstVal = Object.values(errorData)[0];
          if (Array.isArray(firstVal) && firstVal.length > 0) {
            errorMsg = firstVal[0];
          } else if (typeof firstVal === "string") {
            errorMsg = firstVal;
          }
        }
        showToast(errorMsg, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network connection error. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleEnroll} className="space-y-5 animate-fade-in text-left py-2">
      <div>
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
          Student Full Name (English) <span className="theme-danger">*</span>
        </label>
        <input
          type="text"
          value={sharedData.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          placeholder="e.g. Abdullah bin Arif"
          className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Class Selector from Dynamic Classes */}
        <div>
          <CustomSelect
            label="Enrolling Class / Track *"
            options={classes}
            value={sharedData.student_class || ""}
            onChange={(clsId) => {
              const clsObj = classes.find((c) => c.value === clsId);
              setSharedData((prev) => ({
                ...prev,
                student_class: clsId,
                education_status: clsObj ? clsObj.name : "",
              }));
            }}
            placeholder={classes.length > 0 ? "Select Institutional Class..." : "No classes found"}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
            Primary Guardian Phone <span className="theme-danger">*</span>
          </label>
          <input
            type="text"
            value={sharedData.guardian_phone || ""}
            onChange={(e) => handleChange("guardian_phone", e.target.value.replace(/[^\d]/g, ""))}
            required
            placeholder="e.g. 01712345678"
            className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
          />
        </div>
      </div>

      {/* Optional Numeric Roll */}
      <div>
        <label className="block text-xs font-bold theme-text-secondary uppercase tracking-wider mb-2">
          Class Roll Number (Optional)
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={sharedData.roll_number || ""}
          onChange={(e) => handleChange("roll_number", e.target.value)}
          placeholder="e.g. 101 (Leave blank for auto sequential roll)"
          className="w-full px-4 py-3 min-h-[46px] rounded-2xl theme-bg-sub border theme-border text-xs sm:text-sm font-semibold theme-text-primary focus:outline-none focus:border-[var(--accent-main)] focus:ring-2 focus:ring-[var(--accent-main)]/20 transition-all"
        />
      </div>

      {/* Auto Roll Notification */}
      <div className="p-3.5 rounded-2xl theme-bg-accent-soft border theme-border text-xs flex items-center justify-between gap-3 theme-accent">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4 theme-accent shrink-0" />
          <span>
            {sharedData.roll_number 
              ? `Manually set roll: #${sharedData.roll_number}` 
              : "Leave blank to automatically calculate and assign the next sequential roll number."}
          </span>
        </div>
        <span className="px-2.5 py-0.5 rounded-xl theme-bg-elevated theme-accent font-mono font-bold text-[10px] uppercase shrink-0 border theme-border">
          Roll Ready
        </span>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t theme-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-xs font-bold theme-bg-sub theme-text-secondary hover:theme-text-primary rounded-2xl transition cursor-pointer border theme-border"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 text-xs font-black theme-bg-accent theme-accent-text hover:opacity-90 rounded-2xl transition cursor-pointer disabled:opacity-50 shadow-md flex items-center gap-1.5"
        >
          {loading ? "Enrolling Student..." : "Fast-Enroll Student"}
        </button>
      </div>
    </form>
  );
}
