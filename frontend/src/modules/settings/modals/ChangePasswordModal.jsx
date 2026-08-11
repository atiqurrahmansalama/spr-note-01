import { useState } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { CloseIcon, CheckIcon } from "../components/Icons";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { showToast } = useToast();

  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // Real-time password strength meter evaluation
  const newPass = form.new_password;
  const hasMinLength = newPass.length >= 6;
  const hasUpper = /[A-Z]/.test(newPass);
  const hasNumber = /[0-9]/.test(newPass);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPass);

  const score = [hasMinLength, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (!newPass) return { text: "Too Short", color: "theme-text-secondary", bar: "theme-bg-sub", width: "w-0" };
    if (score === 1) return { text: "Weak", color: "theme-danger", bar: "bg-rose-500", width: "w-1/4" };
    if (score === 2) return { text: "Fair", color: "text-amber-400", bar: "bg-amber-500", width: "w-2/4" };
    if (score === 3) return { text: "Good", color: "theme-accent", bar: "theme-bg-accent", width: "w-3/4" };
    return { text: "Very Strong", color: "theme-accent", bar: "theme-bg-accent", width: "w-full" };
  };

  const strength = getStrengthLabel();

  const extractErrorMessage = (errData) => {
    if (!errData) return "Failed to update password.";

    if (typeof errData === "string") return errData;

    if (errData.detail) {
      return typeof errData.detail === "string" ? errData.detail : JSON.stringify(errData.detail);
    }
    if (errData.old_password) {
      const val = errData.old_password;
      return Array.isArray(val) ? val[0] : String(val);
    }
    if (errData.new_password) {
      const val = errData.new_password;
      return Array.isArray(val) ? val[0] : String(val);
    }
    if (errData.non_field_errors) {
      const val = errData.non_field_errors;
      return Array.isArray(val) ? val[0] : String(val);
    }
    if (errData.error) {
      return typeof errData.error === "string" ? errData.error : JSON.stringify(errData.error);
    }

    return "Failed to update password. Please check your current password.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.old_password || !form.new_password) {
      setErrorMsg("Please fill in current and new password fields.");
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setErrorMsg("New password and confirm password do not match.");
      return;
    }
    if (form.new_password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    setSaving(true);
    const payload = {
      old_password: form.old_password,
      new_password: form.new_password,
      current_password: form.old_password,
    };

    try {
      let res = await fetchWithAuth("/api/v1/auth/change-password/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetchWithAuth("/change-password/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        res = await fetchWithAuth("/api/change-password/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        showToast("Password updated successfully!", "success");
        setForm({ old_password: "", new_password: "", confirm_password: "" });
        onClose();
      } else {
        const errData = await res.json().catch(() => ({}));
        const parsedError = extractErrorMessage(errData);
        setErrorMsg(parsedError);
        showToast(parsedError, "error");
      }
    } catch (err) {
      const msg = err.message || "Network error updating password.";
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 theme-text-primary relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border pb-3.5">
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">Change Password</h2>
            <p className="text-xs theme-text-secondary font-normal mt-0.5">Update account security credentials</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl theme-bg-danger-soft border border-rose-500/30 theme-danger text-xs font-semibold flex items-start gap-2">
            <span className="shrink-0 font-bold">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-1">
            <label className="text-xs font-medium theme-text-secondary">Current Password</label>
            <div className="relative">
              <input
                type={showOldPass ? "text" : "password"}
                value={form.old_password}
                onChange={(e) => setForm({ ...form, old_password: e.target.value })}
                placeholder="Enter current password"
                className="w-full theme-bg-sub border theme-border theme-text-primary pr-12 pl-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:theme-border transition-colors font-medium"
              />
              <button
                type="button"
                onClick={() => setShowOldPass(!showOldPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                {showOldPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-medium theme-text-secondary">New Password</label>
            <div className="relative">
              <input
                type={showNewPass ? "text" : "password"}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                placeholder="Enter new password"
                className="w-full theme-bg-sub border theme-border theme-text-primary pr-12 pl-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:theme-border transition-colors font-medium"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                {showNewPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Real-time Password Strength Visualizer */}
          {form.new_password && (
            <div className="space-y-2 p-3 rounded-xl theme-bg-sub border theme-border">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="theme-text-secondary">Password Strength:</span>
                <span className={`font-semibold ${strength.color}`}>{strength.text}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 theme-bg-elevated rounded-full overflow-hidden">
                <div className={`h-full ${strength.bar} ${strength.width} transition-all duration-300`} />
              </div>

              {/* Requirements List */}
              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                <div className={`flex items-center gap-1 ${hasMinLength ? "theme-accent" : "theme-text-secondary"}`}>
                  <CheckIcon className="w-3 h-3" />
                  <span>Min 6 characters</span>
                </div>
                <div className={`flex items-center gap-1 ${hasUpper ? "theme-accent" : "theme-text-secondary"}`}>
                  <CheckIcon className="w-3 h-3" />
                  <span>1 Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1 ${hasNumber ? "theme-accent" : "theme-text-secondary"}`}>
                  <CheckIcon className="w-3 h-3" />
                  <span>1 Number</span>
                </div>
                <div className={`flex items-center gap-1 ${hasSpecial ? "theme-accent" : "theme-text-secondary"}`}>
                  <CheckIcon className="w-3 h-3" />
                  <span>1 Special character</span>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-xs font-medium theme-text-secondary">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirmPass ? "text" : "password"}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="Re-enter new password"
                className="w-full theme-bg-sub border theme-border theme-text-primary pr-12 pl-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:theme-border transition-colors font-medium"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                {showConfirmPass ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t theme-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.old_password || !form.new_password}
              className="px-5 py-2.5 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold shadow transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
