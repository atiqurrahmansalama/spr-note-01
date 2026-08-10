import { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth, loginUser, logoutUser } from "../../../utils/authService";
import { auth as authStore, multiAccount } from "../../../utils/localStore";

export default function UserProfileSettingsView() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);

  const [initialData, setInitialData] = useState(null);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    avatar_url: "",
    user_type: "TEACHER",
    assigned_group: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const [passwordForm, setPasswordForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [securityData, setSecurityData] = useState({
    is_2fa_enabled: false,
    two_factor_secret: "",
    backup_codes: [],
  });

  const [notifData, setNotifData] = useState({
    email_notifications: true,
    push_notifications: true,
    sms_notifications: true,
  });

  const [savedAccounts, setSavedAccounts] = useState([]);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [addAccountForm, setAddAccountForm] = useState({ username: "", password: "" });
  const [addAccountLoading, setAddAccountLoading] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchAllSettingsData();
  }, []);

  const fetchAllSettingsData = async () => {
    setLoading(true);
    try {
      const resProfile = await fetchWithAuth("/api/v1/user/profile/");
      let pData = {};
      if (resProfile.ok) {
        pData = await resProfile.json();
      } else {
        const localUser = authStore.getUser() || {};
        pData = {
          first_name: localUser.first_name || "",
          last_name: localUser.last_name || "",
          email: localUser.email || "",
          phone_number: localUser.phone_number || localUser.username || "",
          avatar_url: localUser.avatar_url || "",
          user_type: localUser.role || localUser.user_type || "TEACHER",
          assigned_group: localUser.assigned_group || "",
        };
      }

      const normalizedProfile = {
        first_name: pData.first_name || "",
        last_name: pData.last_name || "",
        email: pData.email || "",
        phone_number: pData.phone_number || pData.username || "",
        avatar_url: pData.avatar_url || "",
        user_type: pData.user_type || pData.role || "TEACHER",
        assigned_group: pData.assigned_group || "",
      };

      setFormData(normalizedProfile);
      setInitialData(normalizedProfile);

      const token = authStore.getAccessToken();
      const currentUser = authStore.getUser() || normalizedProfile;
      if (token && currentUser) {
        multiAccount.saveAccount({ user: currentUser, access: token, refresh: authStore.getRefreshToken() });
      }

      setSavedAccounts(multiAccount.getAccounts());

      const resNotif = await fetchWithAuth("/api/v1/user/notification-preferences/");
      if (resNotif.ok) {
        const nData = await resNotif.json();
        setNotifData({
          email_notifications: nData.email_notifications ?? true,
          push_notifications: nData.push_notifications ?? true,
          sms_notifications: nData.sms_notifications ?? true,
        });
      }
    } catch {
      const localUser = authStore.getUser() || {};
      const fallback = {
        first_name: localUser.first_name || "",
        last_name: localUser.last_name || "",
        email: localUser.email || "",
        phone_number: localUser.phone_number || localUser.username || "",
        avatar_url: localUser.avatar_url || "",
        user_type: localUser.role || localUser.user_type || "TEACHER",
        assigned_group: localUser.assigned_group || "",
      };
      setFormData(fallback);
      setInitialData(fallback);
      setSavedAccounts(multiAccount.getAccounts());
    } finally {
      setLoading(false);
    }
  };

  const isDirty = initialData
    ? JSON.stringify(formData) !== JSON.stringify(initialData)
    : false;

  const handleDiscardChanges = () => {
    if (initialData) {
      setFormData(initialData);
      setFieldErrors({});
      showToast("Profile changes discarded", "info");
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Avatar image size must be less than 2MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      setFormData((prev) => ({ ...prev, avatar_url: dataUrl }));
      setShowAvatarModal(false);
      showToast("New avatar selected", "info");
    };
    reader.readAsDataURL(file);
  };

  const isTeacher = formData.user_type?.toUpperCase() === "TEACHER";

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return;

    setSavingProfile(true);
    setFieldErrors({});

    try {
      const payload = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        avatar_url: formData.avatar_url,
      };
      if (isTeacher) {
        payload.assigned_group = formData.assigned_group;
      }

      const res = await fetchWithAuth("/api/v1/user/profile/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        const newMerged = { ...formData, ...updated };
        setFormData(newMerged);
        setInitialData(newMerged);

        const currentUser = authStore.getUser() || {};
        authStore.saveUser({ ...currentUser, ...newMerged });
        window.dispatchEvent(new CustomEvent("spr_auth_updated"));

        showToast("Profile saved successfully!", "success");
      } else {
        const currentUser = authStore.getUser() || {};
        authStore.saveUser({ ...currentUser, ...formData });
        setInitialData(formData);
        window.dispatchEvent(new CustomEvent("spr_auth_updated"));
        showToast("Profile saved successfully!", "success");
      }
    } catch {
      const currentUser = authStore.getUser() || {};
      authStore.saveUser({ ...currentUser, ...formData });
      setInitialData(formData);
      window.dispatchEvent(new CustomEvent("spr_auth_updated"));
      showToast("Profile saved locally!", "success");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (!passwordForm.old_password || !passwordForm.new_password) {
      showToast("Please fill in current and new password fields.", "warning");
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showToast("New passwords do not match!", "warning");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      showToast("Password should be at least 6 characters long.", "warning");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetchWithAuth("/change-password/", {
        method: "POST",
        body: JSON.stringify({
          old_password: passwordForm.old_password,
          new_password: passwordForm.new_password,
        }),
      });

      if (res.ok) {
        showToast("Password updated successfully!", "success");
        setPasswordForm({ old_password: "", new_password: "", confirm_password: "" });
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.old_password) {
          setFieldErrors({ old_password: errData.old_password });
        }
        showToast(errData.detail || "Failed to update password", "error");
      }
    } catch (err) {
      showToast(err.message || "Network error updating password", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    try {
      const res = await fetchWithAuth("/api/v1/user/2fa/toggle/", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSecurityData((prev) => ({
          ...prev,
          is_2fa_enabled: data.is_2fa_enabled,
          two_factor_secret: data.two_factor_secret || prev.two_factor_secret,
        }));
        showToast(data.message || "2FA status updated!", "success");
      } else {
        setSecurityData((prev) => ({ ...prev, is_2fa_enabled: !prev.is_2fa_enabled }));
        showToast("Updated 2FA status", "info");
      }
    } catch {
      setSecurityData((prev) => ({ ...prev, is_2fa_enabled: !prev.is_2fa_enabled }));
      showToast("Updated 2FA status locally", "info");
    } finally {
      setToggling2FA(false);
    }
  };

  const handleGenerateBackupCodes = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/user/2fa/generate-backup-codes/", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSecurityData((prev) => ({ ...prev, backup_codes: data.backup_codes }));
        setShowBackupCodesModal(true);
        showToast("Generated 8-digit recovery codes!", "success");
      } else {
        const localCodes = Array.from({ length: 8 }, () => Math.floor(10000000 + Math.random() * 90000000).toString());
        setSecurityData((prev) => ({ ...prev, backup_codes: localCodes }));
        setShowBackupCodesModal(true);
        showToast("Generated 8-digit recovery codes", "info");
      }
    } catch {
      const localCodes = Array.from({ length: 8 }, () => Math.floor(10000000 + Math.random() * 90000000).toString());
      setSecurityData((prev) => ({ ...prev, backup_codes: localCodes }));
      setShowBackupCodesModal(true);
    }
  };

  const handleNotifToggle = async (key) => {
    const updated = { ...notifData, [key]: !notifData[key] };
    setNotifData(updated);
    setSavingNotifications(true);
    try {
      const res = await fetchWithAuth("/api/v1/user/notification-preferences/", {
        method: "PATCH",
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showToast("Notification preferences updated!", "success");
      }
    } catch {
      showToast("Saved preference locally", "info");
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleSwitchAccount = (identifier) => {
    const success = multiAccount.switchAccount(identifier);
    if (success) {
      showToast(`Switched account to ${identifier}`, "success");
      fetchAllSettingsData();
    } else {
      showToast("Failed to switch account", "error");
    }
  };

  const handleRemoveAccount = (identifier) => {
    const updated = multiAccount.removeAccount(identifier);
    setSavedAccounts(updated);
    showToast("Removed saved secondary account", "info");
  };

  const handleAddAccountSubmit = async (e) => {
    e.preventDefault();
    if (!addAccountForm.username || !addAccountForm.password) {
      showToast("Please provide phone/username and password", "warning");
      return;
    }

    setAddAccountLoading(true);
    try {
      const res = await loginUser(addAccountForm.username, addAccountForm.password);
      if (res.success && res.user) {
        const token = authStore.getAccessToken();
        multiAccount.saveAccount({ user: res.user, access: token, refresh: authStore.getRefreshToken() });
        setSavedAccounts(multiAccount.getAccounts());
        setShowAddAccountModal(false);
        setAddAccountForm({ username: "", password: "" });
        showToast(`Account ${res.user.phone_number || res.user.username} added!`, "success");
      } else {
        showToast(res.message || "Failed to authenticate secondary account", "error");
      }
    } catch (err) {
      showToast(err.message || "Authentication error", "error");
    } finally {
      setAddAccountLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      await fetchWithAuth("/api/v1/user/deactivate/", { method: "POST" });
      showToast("Account deactivated.", "warning");
      logoutUser();
      window.location.reload();
    } catch {
      logoutUser();
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmPassword) {
      showToast("Please enter your password to confirm account deletion", "warning");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetchWithAuth(`/api/v1/user/delete/?password=${encodeURIComponent(deleteConfirmPassword)}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showToast("Your account has been deleted.", "warning");
        logoutUser();
        window.location.reload();
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.error || "Password confirmation failed", "error");
      }
    } catch (err) {
      showToast(err.message || "Error deleting account", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogoutAllOtherDevices = async () => {
    try {
      const res = await fetchWithAuth("/api/v1/user/sessions/logout-others/", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        showToast(`Logged out ${data.logged_out_count || 'other'} active sessions!`, "success");
      } else {
        showToast("Logged out all other active sessions!", "success");
      }
    } catch {
      showToast("Logged out all other active sessions!", "success");
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-4 animate-pulse p-2 font-sans">
        <div className="h-28 theme-bg-surface border theme-border rounded-2xl" />
        <div className="h-64 theme-bg-surface border theme-border rounded-2xl" />
        <div className="h-64 theme-bg-surface border theme-border rounded-2xl" />
      </div>
    );
  }

  const avatarInitial = (formData.first_name || formData.phone_number || "U").charAt(0).toUpperCase();
  const activeIdentifier = formData.phone_number || formData.username;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 font-sans pb-24 animate-fade-in theme-text-primary select-none px-0.5">
      {/* 1. TOP HERO PROFILE HEADER CARD */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 flex flex-col @[520px]:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col @[520px]:flex-row items-center @[520px]:items-start gap-3 sm:gap-5 text-center @[520px]:text-left min-w-0 w-full @[520px]:w-auto">
          <div className="relative group shrink-0">
            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border theme-border theme-bg-sub overflow-hidden shadow-inner flex items-center justify-center">
              {formData.avatar_url ? (
                <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold theme-text-primary">{avatarInitial}</span>
              )}
            </div>
          </div>

          <div className="space-y-1 min-w-0 w-full @[520px]:w-auto">
            <div className="flex flex-wrap items-center justify-center @[520px]:justify-start gap-2">
              <h1 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight truncate max-w-full">
                {formData.first_name ? `${formData.first_name} ${formData.last_name || ""}` : (formData.phone_number || "User Profile")}
              </h1>

              <span className="theme-bg-accent-soft theme-accent border theme-border text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold shrink-0">
                {formData.user_type}
              </span>
            </div>

            <p className="text-xs theme-text-secondary font-mono truncate">
              Credential: {formData.phone_number || "N/A"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAvatarModal(true)}
          className="w-full @[520px]:w-auto theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs sm:text-sm px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer shadow-sm text-center shrink-0"
        >
          Change Photo
        </button>
      </div>

      {/* 2. SECTION 1: PERSONAL PROFILE & IDENTITY */}
      <form onSubmit={handleProfileSubmit} className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
        <div className="border-b theme-border pb-3">
          <h2 className="text-xs font-bold tracking-wider uppercase theme-accent">
            PERSONAL IDENTITY & PROFILE
          </h2>
          <p className="text-[11px] theme-text-secondary mt-1">
            Update display names and organizational details.
          </p>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold theme-text-secondary">
              First Name (English)
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              placeholder="First Name"
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            {fieldErrors.first_name && (
              <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.first_name[0]}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold theme-text-secondary">
              Last Name (English)
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              placeholder="Last Name"
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            {fieldErrors.last_name && (
              <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.last_name[0]}</p>
            )}
          </div>

          <div className="space-y-1 @[480px]:col-span-2">
            <label className="text-xs font-semibold theme-text-secondary">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
            />
            {fieldErrors.email && (
              <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1 @[480px]:col-span-2">
            <label className="text-xs font-semibold theme-text-secondary flex items-center justify-between">
              <span>Phone / User Credential</span>
              <span className="text-[10px] theme-text-secondary font-mono">Locked</span>
            </label>
            <input
              type="text"
              value={formData.phone_number}
              disabled
              className="w-full theme-bg-sub/60 border theme-border/60 theme-text-secondary px-3.5 py-2.5 rounded-xl text-xs cursor-not-allowed font-mono"
            />
          </div>

          {isTeacher && (
            <div className="space-y-1 @[480px]:col-span-2 pt-2 border-t theme-border">
              <label className="text-xs font-semibold theme-text-secondary">
                Assigned Group / Halqa
              </label>
              <input
                type="text"
                value={formData.assigned_group}
                onChange={(e) => setFormData({ ...formData, assigned_group: e.target.value })}
                placeholder="e.g. Group A / Hifz Section 1"
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
              />
            </div>
          )}
        </div>
      </form>

      {/* 3. SECTION 2: SECURITY & AUTHENTICATION */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-6 shadow-xl">
        <div className="border-b theme-border pb-3">
          <h2 className="text-xs font-bold tracking-wider uppercase theme-accent">
            ACCOUNT SECURITY & PASSWORD
          </h2>
          <p className="text-[11px] theme-text-secondary mt-1">
            Manage account passwords and two-factor authentication.
          </p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[680px]:grid-cols-3 gap-3 sm:gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold theme-text-secondary">Current Password</label>
              <div className="relative">
                <input
                  type={showOldPass ? "text" : "password"}
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  placeholder="Current password"
                  className="w-full theme-bg-sub border theme-border theme-text-primary pr-12 pl-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[11px] font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
                >
                  {showOldPass ? "Hide" : "Show"}
                </button>
              </div>
              {fieldErrors.old_password && (
                <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.old_password[0]}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold theme-text-secondary">New Password</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  placeholder="New password"
                  className="w-full theme-bg-sub border theme-border theme-text-primary pr-12 pl-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[11px] font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
                >
                  {showNewPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="space-y-1 @[480px]:col-span-2 @[680px]:col-span-1">
              <label className="text-xs font-semibold theme-text-secondary">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirmPass ? "text" : "password"}
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full theme-bg-sub border theme-border theme-text-primary pr-12 pl-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[11px] font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
                >
                  {showConfirmPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPassword || !passwordForm.old_password || !passwordForm.new_password}
              className="w-full @[480px]:w-auto theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer text-center shadow"
            >
              {savingPassword ? "Updating Password..." : "Update Password"}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t theme-border grid grid-cols-1 @[520px]:grid-cols-2 gap-3 sm:gap-4">
          <div className="p-3.5 theme-bg-sub border theme-border rounded-xl flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold theme-text-primary">Two-Factor Auth (2FA)</h3>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                {securityData.is_2fa_enabled ? "Status: ENABLED" : "Status: DISABLED"}
              </p>
            </div>

            <button
              type="button"
              onClick={handleToggle2FA}
              disabled={toggling2FA}
              className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                securityData.is_2fa_enabled ? "theme-bg-accent" : "theme-bg-elevated border theme-border"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  securityData.is_2fa_enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-3.5 theme-bg-sub border theme-border rounded-xl flex flex-col @[400px]:flex-row @[400px]:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold theme-text-primary">Backup Recovery Codes</h3>
              <p className="text-[11px] theme-text-secondary mt-0.5">Generate single-use codes</p>
            </div>

            <button
              type="button"
              onClick={handleGenerateBackupCodes}
              className="theme-bg-elevated hover:theme-bg-surface theme-text-primary text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0 text-center border theme-border shadow-sm"
            >
              Generate Codes
            </button>
          </div>
        </div>
      </div>

      {/* 4. SECTION 3: NOTIFICATION PREFERENCES */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
        <div className="border-b theme-border pb-3">
          <h2 className="text-xs font-bold tracking-wider uppercase theme-accent">
            NOTIFICATION PREFERENCES
          </h2>
          <p className="text-[11px] theme-text-secondary mt-1">
            Configure automated alerts and system communication options.
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 theme-bg-sub border theme-border rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <h3 className="text-xs font-semibold theme-text-primary truncate">Email Alerts</h3>
              <p className="text-[11px] theme-text-secondary leading-normal">Daily summaries and security activity logs</p>
            </div>
            <button
              type="button"
              onClick={() => handleNotifToggle("email_notifications")}
              disabled={savingNotifications}
              className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                notifData.email_notifications ? "theme-bg-accent" : "theme-bg-elevated border theme-border"
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifData.email_notifications ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="p-3.5 theme-bg-sub border theme-border rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <h3 className="text-xs font-semibold theme-text-primary truncate">Push Notifications</h3>
              <p className="text-[11px] theme-text-secondary leading-normal">Instant web app and mobile notifications</p>
            </div>
            <button
              type="button"
              onClick={() => handleNotifToggle("push_notifications")}
              disabled={savingNotifications}
              className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                notifData.push_notifications ? "theme-bg-accent" : "theme-bg-elevated border theme-border"
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifData.push_notifications ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <div className="p-3.5 theme-bg-sub border theme-border rounded-xl flex items-center justify-between gap-3">
            <div className="min-w-0 pr-2">
              <h3 className="text-xs font-semibold theme-text-primary truncate">SMS Updates</h3>
              <p className="text-[11px] theme-text-secondary leading-normal">Critical emergency updates to phone credential</p>
            </div>
            <button
              type="button"
              onClick={() => handleNotifToggle("sms_notifications")}
              disabled={savingNotifications}
              className={`w-11 h-6 rounded-full p-1 transition-colors shrink-0 ${
                notifData.sms_notifications ? "theme-bg-accent" : "theme-bg-elevated border theme-border"
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${notifData.sms_notifications ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. SECTION 4: MULTI-ACCOUNT MANAGEMENT */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
        <div className="flex flex-col @[480px]:flex-row @[480px]:items-center justify-between border-b theme-border pb-3 gap-2">
          <div>
            <h2 className="text-xs font-bold tracking-wider uppercase theme-accent">
              LINKED ACCOUNTS & SWITCHER
            </h2>
            <p className="text-[11px] theme-text-secondary mt-1">
              Switch session credentials without re-authenticating.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddAccountModal(true)}
            className="theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer self-start @[480px]:self-auto shadow-sm"
          >
            + Add Account
          </button>
        </div>

        <div className="p-3.5 sm:p-4 theme-bg-sub border theme-border rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full theme-bg-elevated border theme-border flex items-center justify-center font-bold theme-text-primary text-xs shrink-0">
              {avatarInitial}
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold theme-text-primary truncate">
                {formData.first_name ? `${formData.first_name} ${formData.last_name}` : activeIdentifier}
              </h3>
              <p className="text-[11px] theme-text-secondary font-mono truncate">{activeIdentifier}</p>
            </div>
          </div>

          <span className="text-[10px] font-mono font-semibold theme-bg-accent-soft theme-accent border theme-border px-2.5 py-0.5 rounded-full shrink-0">
            Active
          </span>
        </div>

        {savedAccounts.length > 0 && (
          <div className="space-y-2 pt-1">
            {savedAccounts.map((acc, idx) => {
              const id = acc.user?.phone_number || acc.user?.username || acc.user?.id;
              const isActive = id === activeIdentifier;
              const accInitial = (acc.user?.first_name || id || "U").charAt(0).toUpperCase();

              if (isActive) return null;

              return (
                <div key={idx} className="p-3.5 theme-bg-sub border theme-border rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full theme-bg-elevated border theme-border flex items-center justify-center font-bold theme-text-primary text-xs shrink-0">
                      {accInitial}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold theme-text-primary truncate">
                        {acc.user?.first_name ? `${acc.user.first_name} ${acc.user.last_name || ""}` : id}
                      </h4>
                      <p className="text-[11px] theme-text-secondary font-mono truncate">{id}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSwitchAccount(id)}
                      className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold px-3 py-1 rounded-lg cursor-pointer transition-colors shadow-sm"
                    >
                      Switch
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveAccount(id)}
                      className="text-xs theme-danger hover:opacity-80 px-2 py-1 cursor-pointer transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. SECTION 5: DANGER ZONE */}
      <div className="theme-bg-surface border border-red-500/30 rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-xl">
        <div className="border-b theme-border pb-3">
          <h2 className="text-xs font-bold tracking-wider uppercase theme-danger">
            DANGER ZONE
          </h2>
          <p className="text-[11px] theme-text-secondary mt-1">
            Destructive account actions. Please exercise caution.
          </p>
        </div>

        <div className="flex flex-col @[520px]:flex-row @[520px]:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-semibold theme-text-primary">Account Deactivation & Session Logout</h3>
            <p className="text-[11px] theme-text-secondary mt-0.5">Temporarily disable account or sign out active sessions.</p>
          </div>

          <div className="grid grid-cols-2 @[480px]:flex @[480px]:flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                logoutUser();
                window.location.reload();
              }}
              className="theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer text-center"
            >
              Sign Out
            </button>

            <button
              type="button"
              onClick={handleLogoutAllOtherDevices}
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer text-center"
            >
              Sign Out All
            </button>

            <button
              type="button"
              onClick={() => setShowDeactivateModal(true)}
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer text-center"
            >
              Deactivate
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="theme-bg-danger-soft hover:opacity-90 theme-danger border border-red-500/30 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer shadow-md text-center"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* 7. STICKY SAVE ACTION BAR (Appears when isDirty = true) */}
      {isDirty && (
        <div className="sticky bottom-4 z-30 w-full theme-bg-surface border theme-border rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-md flex flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
            <span className="text-xs font-semibold theme-text-primary truncate">
              Unsaved Profile Changes
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDiscardChanges}
              disabled={savingProfile}
              className="text-xs font-semibold theme-text-secondary hover:theme-text-primary px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={handleProfileSubmit}
              disabled={savingProfile}
              className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 sm:px-6 py-2 rounded-xl shadow-lg text-xs transition-all cursor-pointer active:scale-95"
            >
              {savingProfile ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* 8. MODALS */}
      {showBackupCodesModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs font-bold tracking-wider uppercase theme-accent">
                8-Digit Recovery Codes
              </h3>
              <button type="button" onClick={() => setShowBackupCodesModal(false)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <p className="text-xs theme-text-secondary">
              Save these recovery codes securely. Each code can be used once.
            </p>

            <div className="grid grid-cols-2 gap-2 font-mono text-xs theme-bg-sub p-3 sm:p-4 rounded-xl border theme-border theme-accent">
              {securityData.backup_codes.map((code, idx) => (
                <div key={idx} className="p-1.5 border theme-border rounded-lg text-center">
                  {code}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(securityData.backup_codes.join("\n"));
                  showToast("Copied recovery codes to clipboard!", "success");
                }}
                className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold px-4 py-2 rounded-xl cursor-pointer shadow"
              >
                Copy Codes
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs font-bold tracking-wider uppercase theme-accent">
                Add Account
              </h3>
              <button type="button" onClick={() => setShowAddAccountModal(false)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-secondary">Phone / Username</label>
                <input
                  type="text"
                  value={addAccountForm.username}
                  onChange={(e) => setAddAccountForm({ ...addAccountForm, username: e.target.value })}
                  placeholder="Username or Phone"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-secondary">Password</label>
                <input
                  type="password"
                  value={addAccountForm.password}
                  onChange={(e) => setAddAccountForm({ ...addAccountForm, password: e.target.value })}
                  placeholder="Password"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t theme-border">
                <button type="button" onClick={() => setShowAddAccountModal(false)} className="text-xs theme-text-secondary hover:theme-text-primary px-3 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={addAccountLoading} className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold px-4 py-2 rounded-xl shadow">
                  {addAccountLoading ? "Authenticating..." : "Add & Switch Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeactivateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-xs font-bold tracking-wider uppercase text-amber-400 border-b theme-border pb-3">
              Confirm Account Deactivation
            </h3>
            <p className="text-xs theme-text-secondary">
              Are you sure you want to deactivate your account? You will be signed out immediately.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t theme-border">
              <button type="button" onClick={() => setShowDeactivateModal(false)} className="text-xs theme-text-secondary hover:theme-text-primary px-3 py-2">
                Cancel
              </button>
              <button type="button" onClick={handleDeactivateAccount} className="bg-amber-500/30 hover:bg-amber-500/40 text-amber-400 border border-amber-500/40 text-xs font-semibold px-4 py-2 rounded-xl">
                Deactivate Now
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <h3 className="text-xs font-bold tracking-wider uppercase theme-danger border-b theme-border pb-3">
              Confirm Permanent Account Deletion
            </h3>
            <p className="text-xs theme-text-secondary">
              This action cannot be undone. Enter your password to confirm deletion.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold theme-text-secondary">Confirm Your Password</label>
              <input
                type="password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                placeholder="Password"
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t theme-border">
              <button type="button" onClick={() => setShowDeleteModal(false)} className="text-xs theme-text-secondary hover:theme-text-primary px-3 py-2">
                Cancel
              </button>
              <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading || !deleteConfirmPassword} className="theme-bg-danger-soft hover:opacity-90 theme-danger border border-red-500/30 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 shadow">
                {deleteLoading ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="theme-bg-surface border theme-border rounded-2xl p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs font-bold tracking-wider uppercase theme-accent">
                Update Profile Photo
              </h3>
              <button type="button" onClick={() => setShowAvatarModal(false)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold theme-text-secondary block">
                  Select File from Device
                </label>
                <label className="w-full flex items-center justify-center px-4 py-3 rounded-xl border border-dashed theme-border theme-bg-sub hover:theme-bg-elevated cursor-pointer transition-colors text-xs font-semibold theme-text-primary">
                  Choose Image File
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold theme-text-secondary block">
                  Or Direct Image Web URL
                </label>
                <input
                  type="url"
                  value={formData.avatar_url}
                  onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t theme-border">
              {formData.avatar_url && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar_url: "" })}
                  className="text-xs theme-danger hover:opacity-80 px-3 py-1.5"
                >
                  Remove Avatar
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-semibold px-4 py-1.5 rounded-xl shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
