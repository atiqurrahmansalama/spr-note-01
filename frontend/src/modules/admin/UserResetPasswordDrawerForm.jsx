import React, { useState } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { KeyIcon, LockIcon, SaveIcon, UserIcon } from "../../components/ui/Icons";
import CustomInput from "../../components/ui/CustomInput";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../components/layout";

export default function UserResetPasswordDrawerForm({
  user,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim() || user?.email || "User";

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      showToast("Password must be at least 8 characters long.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const endpoints = [
        `/api/v1/users/${user.id}/reset-password/`,
        `/api/users/${user.id}/change-password/`,
        `/users/${user.id}/change-password/`,
      ];

      let success = false;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetchWithAuth(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ new_password: newPassword, password: newPassword }),
          });

          if (res.ok) {
            success = true;
            break;
          } else if (res.status >= 400 && res.status < 500) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.detail || "Failed to reset password.");
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (success) {
        showToast(`Password successfully reset for ${displayName}`, "success");
        onSaved?.();
      } else {
        throw lastError || new Error("Failed to reset password.");
      }
    } catch (err) {
      showToast(err.message || "Failed to reset password.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* User Identity Info Card */}
        <div className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border theme-border font-bold text-sm">
            {(user?.first_name?.[0] || user?.email?.[0] || "U").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold theme-text-primary truncate">{displayName}</h4>
            <p className="text-xs theme-text-secondary font-mono truncate">{user?.email || user?.phone_number || "No email"}</p>
          </div>
        </div>

        {/* Password Reset Section */}
        <DrawerSection title="Security Credentials" icon={LockIcon}>
          <div className="space-y-3.5">
            <CustomInput
              label="New Password"
              type="password"
              placeholder="Minimum 8 characters"
              icon={KeyIcon}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required={true}
              helperText="Must contain at least 8 alphanumeric characters."
            />

            <CustomInput
              label="Confirm New Password"
              type="password"
              placeholder="Re-type new password"
              icon={KeyIcon}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required={true}
            />
          </div>
        </DrawerSection>

        {/* Action Footer */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isDisabled={!newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
          saveLabel="Update Password"
          saveIcon={SaveIcon}
        />
      </form>
    </DrawerContainer>
  );
}
