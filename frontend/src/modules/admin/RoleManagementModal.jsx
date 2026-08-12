import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";

const COLOR_PALETTES = [
  { id: "emerald", label: "Emerald", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "blue", label: "Blue", badge: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "purple", label: "Purple", badge: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "amber", label: "Amber", badge: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "rose", label: "Rose", badge: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  { id: "cyan", label: "Cyan", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
];

export function getRoleBadgeStyle(colorTheme) {
  const match = COLOR_PALETTES.find((p) => p.id === colorTheme);
  return match
    ? match.badge
    : "bg-blue-500/10 text-blue-400 border-blue-500/20";
}

export default function RoleManagementModal({ isOpen, onClose, onRoleUpdated }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'editor'
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    hierarchy_level: 5,
    color_theme: "blue",
    action_permissions: {
      can_create_student: true,
      can_edit_student: true,
      can_delete_report: false,
      can_export_reports: true,
      can_manage_users: false,
    },
  });

  const loadRoles = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth("/api/v1/roles/");
      if (res.ok) {
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch {
      showToast("Failed to load roles from server", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRoles();
      setActiveTab("list");
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setEditingRoleId(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      hierarchy_level: 5,
      color_theme: "blue",
      action_permissions: {
        can_create_student: true,
        can_edit_student: true,
        can_delete_report: false,
        can_export_reports: true,
        can_manage_users: false,
      },
    });
  };

  const handleNameChange = (val) => {
    const nextForm = { ...formData, name: val };
    if (!editingRoleId) {
      nextForm.code = val
        .toUpperCase()
        .trim()
        .replace(/[^A-Z0-9]/g, "_")
        .replace(/_+/g, "_");
    }
    setFormData(nextForm);
  };

  const handleEditRole = (role) => {
    setEditingRoleId(role.id);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || "",
      hierarchy_level: role.hierarchy_level || 5,
      color_theme: role.color_theme || "blue",
      action_permissions: {
        can_create_student: role.action_permissions?.can_create_student ?? true,
        can_edit_student: role.action_permissions?.can_edit_student ?? true,
        can_delete_report: role.action_permissions?.can_delete_report ?? false,
        can_export_reports: role.action_permissions?.can_export_reports ?? true,
        can_manage_users: role.action_permissions?.can_manage_users ?? false,
      },
    });
    setActiveTab("editor");
  };

  const handleCloneRole = async (role) => {
    try {
      const res = await fetchWithAuth(`/api/v1/roles/${role.id}/clone/`, {
        method: "POST",
      });
      if (res.ok) {
        const cloned = await res.json();
        showToast(`Role cloned as '${cloned.name}'`, "success");
        loadRoles();
        if (onRoleUpdated) onRoleUpdated();
        handleEditRole(cloned);
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to clone role", "error");
      }
    } catch {
      showToast("Error executing role clone", "error");
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.is_system_role) {
      showToast("System roles are protected and cannot be deleted.", "warning");
      return;
    }
    if (role.user_count > 0) {
      showToast(`Cannot delete role: ${role.user_count} user(s) currently assigned.`, "warning");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete custom role '${role.name}'?`)) return;

    try {
      const res = await fetchWithAuth(`/api/v1/roles/${role.id}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Role '${role.name}' deleted successfully`, "success");
        loadRoles();
        if (onRoleUpdated) onRoleUpdated();
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to delete role", "error");
      }
    } catch {
      showToast("Error deleting role", "error");
    }
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("Role name is required", "warning");
      return;
    }
    if (!formData.code.trim()) {
      showToast("Role code is required", "warning");
      return;
    }

    const targetCode = formData.code.trim().toUpperCase();
    const existingCodeRole = roles.find((r) => r.code.toUpperCase() === targetCode && r.id !== editingRoleId);
    if (existingCodeRole) {
      showToast(`Role code '${targetCode}' already exists (${existingCodeRole.name}). Please use a unique role code.`, "warning");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingRoleId);
      const url = isEdit ? `/api/v1/roles/${editingRoleId}/` : "/api/v1/roles/";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        showToast(
          isEdit ? `Role '${formData.name}' updated!` : `Role '${formData.name}' created!`,
          "success"
        );
        loadRoles();
        if (onRoleUpdated) onRoleUpdated();
        setActiveTab("list");
        resetForm();
      } else {
        const errData = await res.json();
        let msg = "Failed to save role";
        if (errData) {
          if (typeof errData === "string") msg = errData;
          else if (errData.error) msg = errData.error;
          else if (errData.detail) msg = errData.detail;
          else {
            const msgs = Object.entries(errData)
              .map(([key, val]) => `${key !== "detail" && key !== "error" ? key + ": " : ""}${Array.isArray(val) ? val.join(" ") : String(val)}`)
              .join(" | ");
            if (msgs) msg = msgs;
          }
        }
        showToast(msg, "error");
      }
    } catch {
      showToast("Network error saving role", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (key) => {
    setFormData((prev) => ({
      ...prev,
      action_permissions: {
        ...prev.action_permissions,
        [key]: !prev.action_permissions[key],
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-4xl bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Enterprise Role & Access Control Management</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Define custom authority hierarchies, color codes, and action permissions.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Dual Tabs Nav */}
        <div className="px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === "list"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm"
                  : "bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/50"
              }`}
            >
              <span>Existing Roles ({roles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab("editor");
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                activeTab === "editor"
                  ? "bg-zinc-800 text-zinc-100 border-zinc-700 shadow-sm"
                  : "bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/50"
              }`}
            >
              <span>{editingRoleId ? "Edit Role" : "+ Create Custom Role"}</span>
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "list" ? (
            <div>
              {loading ? (
                <div className="py-12 text-center text-sm text-zinc-500 font-mono">
                  Loading dynamic system & custom roles...
                </div>
              ) : roles.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-500">
                  No roles configured in database.
                </div>
              ) : (
                <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/30">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800/80 bg-zinc-900/80 text-zinc-400 font-mono uppercase tracking-wider">
                        <th className="py-3 px-4 font-semibold">Role Name</th>
                        <th className="py-3 px-4 font-semibold">Role Code</th>
                        <th className="py-3 px-4 font-semibold text-center">Hierarchy Rank</th>
                        <th className="py-3 px-4 font-semibold text-center">Active Users</th>
                        <th className="py-3 px-4 font-semibold text-center">Theme Badge</th>
                        <th className="py-3 px-4 font-semibold text-center">Status</th>
                        <th className="py-3 px-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {roles.map((role) => {
                        const badgeClass = getRoleBadgeStyle(role.color_theme);
                        return (
                          <tr key={role.id} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-zinc-200">
                              <div>{role.name}</div>
                              {role.description && (
                                <div className="text-[11px] text-zinc-500 truncate max-w-xs">
                                  {role.description}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-400">
                              {role.code}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-zinc-300">
                              Level {role.hierarchy_level}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-zinc-300">
                              {role.user_count}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${badgeClass}`}>
                                {role.color_theme}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {role.is_system_role ? (
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  System Protected
                                </span>
                              ) : (
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                                  Custom
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCloneRole(role)}
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
                                  title="Clone Role"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEditRole(role)}
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition-colors cursor-pointer"
                                  title="Edit Role"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  disabled={role.is_system_role || role.user_count > 0}
                                  onClick={() => handleDeleteRole(role)}
                                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/80 text-rose-400 border border-zinc-700/80 hover:border-rose-800/80 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={
                                    role.is_system_role
                                      ? "System role cannot be deleted"
                                      : role.user_count > 0
                                      ? "Cannot delete role with assigned users"
                                      : "Delete Role"
                                  }
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSaveRole} className="space-y-5">
              {/* Basic Details */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-4">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  1. Role Basic Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Role Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Senior Ustadh / সিনিয়র ওস্তাদ"
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-zinc-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">
                      Role Unique Code *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={Boolean(editingRoleId && roles.find((r) => r.id === editingRoleId)?.is_system_role)}
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
                        })
                      }
                      placeholder="e.g. SENIOR_USTADH"
                      className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-zinc-700 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Role Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Briefly describe the operational scope for this role..."
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 px-3.5 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-zinc-700 resize-none"
                  />
                </div>
              </div>

              {/* Hierarchy Rank & Color Palette */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                      2. Hierarchy Level Rank
                    </h3>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                      Level {formData.hierarchy_level}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Lower number = Higher authority (1 = Super Admin, 5 = Staff / Evaluation, 10 = Guardian).
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={formData.hierarchy_level}
                    onChange={(e) =>
                      setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) || 5 })
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                    3. Color Theme Badge
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Pick a visual theme palette for role badges across tables and tabs.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {COLOR_PALETTES.map((palette) => {
                      const isSelected = formData.color_theme === palette.id;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, color_theme: palette.id })}
                          className={`px-3 py-1 rounded-full text-xs font-mono font-medium border transition-all cursor-pointer ${
                            palette.badge
                          } ${isSelected ? "ring-2 ring-emerald-500 scale-105" : "opacity-60 hover:opacity-100"}`}
                        >
                          {palette.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Permissions Matrix Grid */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-xl space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                  4. Action Level Permission Matrix
                </h3>
                <p className="text-[11px] text-zinc-500">
                  Enable or disable specific action capabilities granted to this role.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {[
                    { key: "can_create_student", label: "Create Students", desc: "Allow creating new student records" },
                    { key: "can_edit_student", label: "Edit Students", desc: "Allow editing student details" },
                    { key: "can_delete_report", label: "Delete Reports", desc: "Allow deleting daily evaluation notes" },
                    { key: "can_export_reports", label: "Export Data", desc: "Allow exporting reports to PDF/Excel" },
                    { key: "can_manage_users", label: "Manage Users", desc: "Allow creating and provisioning users" },
                  ].map((item) => {
                    const isChecked = Boolean(formData.action_permissions[item.key]);
                    return (
                      <div
                        key={item.key}
                        onClick={() => togglePermission(item.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? "bg-zinc-900/80 border-emerald-500/40"
                            : "bg-zinc-900/20 border-zinc-800 hover:bg-zinc-900/40"
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? "bg-emerald-600 border-emerald-500 text-white"
                              : "border-zinc-700 bg-zinc-950"
                          }`}
                        >
                          {isChecked && (
                            <svg className="w-3 h-3 text-current stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-zinc-200">{item.label}</div>
                          <div className="text-[10px] text-zinc-500 mt-0.5">{item.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("list");
                  }}
                  className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-6 py-2 rounded-lg text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Role..." : "Save Role"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
