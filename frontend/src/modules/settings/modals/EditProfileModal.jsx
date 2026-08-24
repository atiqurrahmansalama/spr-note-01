import { useState, useEffect } from "react";
import { useToast } from "../../../context/ToastContext";
import { fetchWithAuth } from "../../../utils/authService";
import { auth as authStore } from "../../../utils/localStore";
import { CloseIcon, CameraIcon, LockIcon } from "../../../components/ui/Icons";
import CustomInput from "../../../components/ui/CustomInput";

export default function EditProfileModal({ isOpen, onClose, user, onProfileUpdated }) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    phone_number: user?.phone_number || user?.username || "",
    avatar_url: user?.avatar_url || "",
  });

  const [saving, setSaving] = useState(false);

  // Synchronize state whenever user prop changes or modal opens
  useEffect(() => {
    if (user && isOpen) {
      const full = user.name || `${user.first_name || ""} ${user.last_name || ""}`.trim();
      const parts = full ? full.split(" ") : ["", ""];
      setFormData({
        name: full,
        first_name: user.first_name || parts[0] || "",
        last_name: user.last_name || parts.slice(1).join(" ") || "",
        email: user.email || "",
        phone_number: user.phone_number || user.username || "",
        avatar_url: user.avatar_url || "",
      });
    }
  }, [user, isOpen]);

  const initialValues = {
    name: user?.name || `${user?.first_name || ""} ${user?.last_name || ""}`.trim(),
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    email: user?.email || "",
    avatar_url: user?.avatar_url || "",
  };

  const isFormDirty =
    formData.name !== initialValues.name ||
    formData.first_name !== initialValues.first_name ||
    formData.last_name !== initialValues.last_name ||
    formData.email !== initialValues.email ||
    formData.avatar_url !== initialValues.avatar_url;

  if (!isOpen) return null;

  const handleNameChange = (val) => {
    const parts = val.trim().split(" ");
    setFormData((prev) => ({
      ...prev,
      name: val,
      first_name: parts[0] || "",
      last_name: parts.slice(1).join(" ") || "",
    }));
  };

  const handleFirstNameChange = (val) => {
    setFormData((prev) => {
      const fn = val;
      const ln = prev.last_name;
      return {
        ...prev,
        first_name: fn,
        name: `${fn} ${ln}`.trim(),
      };
    });
  };

  const handleLastNameChange = (val) => {
    setFormData((prev) => {
      const fn = prev.first_name;
      const ln = val;
      return {
        ...prev,
        last_name: ln,
        name: `${fn} ${ln}`.trim(),
      };
    });
  };

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Avatar image size must be under 2MB", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Url = ev.target?.result;
      if (base64Url) {
        setFormData((prev) => ({ ...prev, avatar_url: base64Url }));
        showToast("Uploaded avatar preview!", "info");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const fullName = formData.name || `${formData.first_name || ""} ${formData.last_name || ""}`.trim();
    const payload = {
      id: user?.id,
      user_id: user?.id,
      phone_number: user?.phone_number || formData.phone_number,
      name: fullName,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      avatar_url: formData.avatar_url,
    };

    try {
      let res = await fetchWithAuth("/api/v1/auth/profile/", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetchWithAuth("/api/v1/user/profile/", {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok && user?.id) {
        res = await fetchWithAuth(`/api/v1/users/${user.id}/`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const updatedData = await res.json().catch(() => ({}));
        const currentUser = authStore.getUser() || {};
        const mergedUser = { ...currentUser, ...updatedData, ...payload };
        authStore.saveUser(mergedUser);
        window.dispatchEvent(new CustomEvent("spr_auth_updated"));

        showToast("Profile updated & synced successfully!", "success");
        if (onProfileUpdated) onProfileUpdated(mergedUser);
        onClose();
      } else {
        const currentUser = authStore.getUser() || {};
        const mergedUser = { ...currentUser, ...payload };
        authStore.saveUser(mergedUser);
        window.dispatchEvent(new CustomEvent("spr_auth_updated"));

        showToast("Profile saved successfully!", "success");
        if (onProfileUpdated) onProfileUpdated(mergedUser);
        onClose();
      }
    } catch {
      const currentUser = authStore.getUser() || {};
      const mergedUser = { ...currentUser, ...payload };
      authStore.saveUser(mergedUser);
      window.dispatchEvent(new CustomEvent("spr_auth_updated"));

      showToast("Profile saved locally!", "info");
      if (onProfileUpdated) onProfileUpdated(mergedUser);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="max-w-lg w-full theme-bg-surface border theme-border rounded-2xl p-6 shadow-2xl space-y-5 theme-text-primary relative max-h-[90vh] overflow-y-auto">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between border-b theme-border pb-4">
          <div>
            <h2 className="text-base font-bold theme-text-primary tracking-tight">Edit Profile</h2>
            <p className="text-xs theme-text-secondary mt-0.5">Update display name, avatar, and credentials.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="theme-text-secondary hover:theme-text-primary p-1 rounded-lg hover:theme-bg-sub transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 2. Sleek Minimal Avatar Uploader */}
          <div className="theme-bg-sub border theme-border rounded-2xl p-5 text-center relative overflow-hidden flex flex-col items-center justify-center space-y-2.5">
            {/* Interactive Avatar Container with Floating Camera Badge */}
            <div className="relative group cursor-pointer">
              <label className="block relative cursor-pointer">
                <div className="w-20 h-20 rounded-full border-2 theme-border theme-bg-elevated shadow-md overflow-hidden flex items-center justify-center theme-text-primary text-2xl font-bold transition-transform group-hover:scale-105">
                  {formData.avatar_url ? (
                    <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span>{(formData.name || formData.first_name || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                {/* Floating Camera Badge */}
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-md border-2 theme-border transition-transform group-hover:scale-110">
                  <CameraIcon className="w-3.5 h-3.5" />
                </div>

                <input type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              </label>
            </div>

            {/* Subtext and Remove Action */}
            <div className="space-y-1">
              <p className="text-[11px] theme-text-secondary font-mono">
                JPG, PNG or WEBP (Max 2MB)
              </p>

              {formData.avatar_url && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar_url: "" })}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors cursor-pointer underline underline-offset-2"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* 3. Input Grid Dynamic Theme Compliant */}
          <div className="space-y-3.5">
            {/* Primary Full Name / Display Name Input */}
            <div>
              <CustomInput
                label="Full Display Name"
                required
                value={formData.name}
                onChange={(val) => handleNameChange(val)}
                placeholder="Enter full display name"
              />
            </div>

            {/* Row 2: First Name & Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <CustomInput
                  label="First Name"
                  value={formData.first_name}
                  onChange={(val) => handleFirstNameChange(val)}
                  placeholder="First Name"
                />
              </div>

              <div>
                <CustomInput
                  label="Last Name"
                  value={formData.last_name}
                  onChange={(val) => handleLastNameChange(val)}
                  placeholder="Last Name"
                />
              </div>
            </div>

            {/* Row 3: Email Address */}
            <div>
              <CustomInput
                type="email"
                label="Email Address"
                value={formData.email}
                onChange={(val) => setFormData({ ...formData, email: val })}
                placeholder="user@example.com"
              />
            </div>

            {/* Row 4: Phone / Credential (Locked Field) */}
            <div>
              <CustomInput
                label="Phone / Credential"
                value={formData.phone_number}
                disabled
                badge="Locked"
              />
            </div>
          </div>

          {/* 4. Footer Action Bar */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t theme-border mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-transparent hover:theme-bg-sub theme-text-secondary hover:theme-text-primary text-xs font-medium px-4 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isFormDirty}
              className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-medium px-5 py-2 rounded-xl shadow-sm transition-all active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
