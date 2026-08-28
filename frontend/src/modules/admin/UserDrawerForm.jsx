import React, { useState, useEffect, useMemo } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import {
  UsersIcon,
  UserIcon,
  KeyIcon,
  MailIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SaveIcon,
} from "../../components/ui/Icons";
import CustomInput from "../../components/ui/CustomInput";
import CustomCheckbox from "../../components/ui/CustomCheckbox";
import { RoleSelect } from "../../components/selectors";
import { DrawerContainer, DrawerSection, DrawerFooter } from "../../components/layout";

export default function UserDrawerForm({
  user = null,
  mode = "add",
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const isEditing = mode === "edit" && Boolean(user);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    password: "",
    user_type: "GUARDIAN",
    is_active: true,
  });

  const [initialData, setInitialData] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && user) {
      const initial = {
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone_number: user.phone_number || "",
        password: "",
        user_type: user.role?.code || user.role_info?.code || user.user_type || "GUARDIAN",
        is_active: user.is_active !== false,
      };
      setFormData(initial);
      setInitialData(initial);
    } else {
      const initial = {
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        password: "",
        user_type: "GUARDIAN",
        is_active: true,
      };
      setFormData(initial);
      setInitialData(initial);
    }
  }, [user, isEditing]);

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    if (!isEditing) {
      return Boolean(
        formData.first_name ||
          formData.last_name ||
          formData.email ||
          formData.phone_number ||
          formData.password
      );
    }
    return (
      formData.first_name !== initialData.first_name ||
      formData.last_name !== initialData.last_name ||
      formData.email !== initialData.email ||
      formData.phone_number !== initialData.phone_number ||
      formData.user_type !== initialData.user_type ||
      formData.is_active !== initialData.is_active ||
      Boolean(formData.password)
    );
  }, [formData, initialData, isEditing]);

  const isValid = useMemo(() => {
    if (!formData.email && !formData.phone_number) return false;
    if (!isEditing && !formData.password) return false;
    return true;
  }, [formData, isEditing]);

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    if (!formData.email && !formData.phone_number) {
      showToast("Email address or phone number is required.", "error");
      return;
    }
    if (!isEditing && !formData.password) {
      showToast("Initial password is required.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const fullName = `${formData.first_name || ""} ${formData.last_name || ""}`.trim();
      const payload = {
        name: fullName,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || undefined,
        phone_number: formData.phone_number || undefined,
        user_type: formData.user_type,
        is_active: formData.is_active,
      };

      if (!isEditing && formData.password) {
        payload.password = formData.password;
      }

      const endpoints = isEditing
        ? [`/api/v1/users/${user.id}/`, `/api/users/${user.id}/`, `/users/${user.id}/`]
        : ["/api/v1/users/", "/api/users/", "/users/"];

      let lastError = null;
      let success = false;

      for (const endpoint of endpoints) {
        try {
          const res = await fetchWithAuth(endpoint, {
            method: isEditing ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (res.ok) {
            success = true;
            break;
          } else if (res.status >= 400 && res.status < 500) {
            const errData = await res.json().catch(() => ({}));
            const msg =
              errData.error ||
              errData.detail ||
              Object.values(errData).flat().join(" ") ||
              "Request validation failed";
            throw new Error(msg);
          }
        } catch (err) {
          lastError = err;
        }
      }

      if (success) {
        showToast(
          isEditing ? "User account updated successfully!" : "User account created successfully!",
          "success"
        );
        onSaved?.();
      } else {
        throw lastError || new Error("Failed to save user account.");
      }
    } catch (err) {
      showToast(err.message || "Operation failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-5 text-left">
        {/* Personal & Identity Section */}
        <DrawerSection title="Personal Information" icon={UserIcon}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <CustomInput
              label="First Name"
              placeholder="e.g. Abdullah"
              value={formData.first_name}
              onChange={(val) => setFormData({ ...formData, first_name: val })}
            />
            <CustomInput
              label="Last Name"
              placeholder="e.g. Rahman"
              value={formData.last_name}
              onChange={(val) => setFormData({ ...formData, last_name: val })}
            />
          </div>
        </DrawerSection>

        {/* Contact & Authentication Credentials */}
        <DrawerSection title="Contact & Authentication" icon={ShieldCheckIcon}>
          <div className="space-y-3.5">
            <CustomInput
              label="Email Address"
              type="email"
              placeholder="user@suffahhifz.com"
              icon={MailIcon}
              value={formData.email}
              onChange={(val) => setFormData({ ...formData, email: val })}
              required={!formData.phone_number}
            />

            <CustomInput
              label="Phone Number"
              type="tel"
              placeholder="017XXXXXXXX"
              icon={PhoneIcon}
              value={formData.phone_number}
              onChange={(val) => setFormData({ ...formData, phone_number: val })}
              required={!formData.email}
            />

            {!isEditing && (
              <CustomInput
                label="Initial Password"
                type="password"
                placeholder="Minimum 8 characters"
                icon={KeyIcon}
                value={formData.password}
                onChange={(val) => setFormData({ ...formData, password: val })}
                required={true}
              />
            )}
          </div>
        </DrawerSection>

        {/* Role & Access Hierarchy */}
        <DrawerSection title="Role Assignment" icon={UsersIcon}>
          <div>
            <RoleSelect
              label="Account Role *"
              value={formData.user_type}
              onChange={(val) => setFormData({ ...formData, user_type: val })}
              valueKey="code"
              allowAll={false}
              required={true}
              placeholder="Select Role..."
            />
          </div>

          <div className="pt-2">
            <div className="flex items-center gap-2.5 p-3 rounded-xl theme-bg-sub border theme-border">
              <CustomCheckbox
                checked={formData.is_active}
                onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <div className="text-xs">
                <span className="font-semibold theme-text-primary">Active Account Status</span>
                <p className="theme-text-secondary text-[11px]">
                  When active, the user can authenticate and access permissions assigned to their role.
                </p>
              </div>
            </div>
          </div>
        </DrawerSection>

        {/* Action Footer */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isDisabled={!isDirty || !isValid}
          saveLabel={isEditing ? "Update User" : "Create User"}
          saveIcon={SaveIcon}
        />
      </form>
    </DrawerContainer>
  );
}
