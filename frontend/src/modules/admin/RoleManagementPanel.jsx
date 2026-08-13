import { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";

const DEFAULT_SYSTEM_ROLES = [
  { id: 1, name: "Super Administrator", code: "SUPER_ADMIN", hierarchy_level: 1, description: "Full system access & section control", action_permissions: { can_create_student: true, can_edit_student: true, can_delete_report: true, can_export_reports: true, can_manage_users: true } },
  { id: 2, name: "Administrator", code: "ADMIN", hierarchy_level: 2, description: "Institute admin with user & report controls", action_permissions: { can_create_student: true, can_edit_student: true, can_delete_report: true, can_export_reports: true, can_manage_users: true } },
  { id: 3, name: "Hifz Teacher / Ustadh", code: "TEACHER", hierarchy_level: 5, description: "Evaluates daily Sabaq, Sabqi & Amukhta", action_permissions: { can_create_student: true, can_edit_student: true, can_delete_report: false, can_export_reports: true, can_manage_users: false } },
  { id: 4, name: "Guardian / Parent", code: "GUARDIAN", hierarchy_level: 10, description: "View student progress reports & copy cards", action_permissions: { can_create_student: false, can_edit_student: false, can_delete_report: false, can_export_reports: true, can_manage_users: false } },
];

export default function RoleManagementPanel({ onBack, onRoleUpdated, showHeaderCard = true }) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState("list"); // 'list' | 'editor'
  const [roles, setRoles] = useState(() => {
    try {
      const saved = localStorage.getItem("spr_local_roles_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_SYSTEM_ROLES;
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  // Form State
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    hierarchy_level: 5,
    action_permissions: {
      can_create_student: true,
      can_edit_student: true,
      can_delete_report: false,
      can_export_reports: true,
      can_manage_users: false,
    },
  });

  // Candidate API helper to ensure fallback endpoints work 100%
  const apiCallCandidate = async (candidatePaths, options = {}) => {
    let lastError = null;
    let lastRes = null;

    for (const path of candidatePaths) {
      try {
        const res = await fetchWithAuth(path, options);
        if (res.ok) return res;
        lastRes = res;
        if (res.status >= 400 && res.status < 500) {
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (lastRes) {
      let errorMsg = `Server Error (${lastRes.status})`;
      try {
        const errData = await lastRes.json();
        if (errData) {
          if (typeof errData === "string") {
            errorMsg = errData;
          } else if (errData.error) {
            errorMsg = errData.error;
          } else if (errData.detail) {
            errorMsg = errData.detail;
          } else {
            const msgs = Object.entries(errData)
              .map(([key, val]) => {
                const text = Array.isArray(val) ? val.join(" ") : String(val);
                return `${key !== "detail" && key !== "error" ? key + ": " : ""}${text}`;
              })
              .join(" | ");
            if (msgs) errorMsg = msgs;
          }
        }
      } catch {}
      throw new Error(errorMsg);
    }

    throw lastError || new Error("Failed to reach API endpoint");
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadRoles = async () => {
    try {
      const res = await apiCallCandidate(["/api/v1/roles/", "/api/roles/", "/roles/"]);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (list.length > 0) {
        setRoles(list);
        localStorage.setItem("spr_local_roles_v1", JSON.stringify(list));
      }
    } catch {
      // Keep cached or default roles silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []);

  const resetForm = () => {
    setEditingRoleId(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      hierarchy_level: 5,
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
      const res = await apiCallCandidate([
        `/api/v1/roles/${role.id}/clone/`,
        `/api/roles/${role.id}/clone/`,
        `/roles/${role.id}/clone/`,
      ], {
        method: "POST",
      });
      const cloned = await res.json();
      showToast(`Role cloned as '${cloned.name}'`, "success");
      loadRoles();
      if (onRoleUpdated) onRoleUpdated();
      handleEditRole(cloned);
    } catch (err) {
      showToast(err.message || "Error cloning role", "error");
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.code === "SUPER_ADMIN") {
      showToast("Super Admin role is system protected and cannot be deleted.", "warning");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete role '${role.name}'?`)) return;

    try {
      await apiCallCandidate([
        `/api/v1/roles/${role.id}/`,
        `/api/roles/${role.id}/`,
        `/roles/${role.id}/`,
      ], {
        method: "DELETE",
      });
      showToast(`Role '${role.name}' deleted successfully`, "success");
      loadRoles();
      if (onRoleUpdated) onRoleUpdated();
    } catch (err) {
      showToast(err.message || "Error deleting role", "error");
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
      const paths = isEdit
        ? [`/api/v1/roles/${editingRoleId}/`, `/api/roles/${editingRoleId}/`, `/roles/${editingRoleId}/`]
        : ["/api/v1/roles/", "/api/roles/", "/roles/"];
      const method = isEdit ? "PATCH" : "POST";

      await apiCallCandidate(paths, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      showToast(
        isEdit ? `Role '${formData.name}' updated!` : `Role '${formData.name}' created!`,
        "success"
      );
      loadRoles();
      if (onRoleUpdated) onRoleUpdated();
      setActiveTab("list");
      resetForm();
    } catch (err) {
      showToast(err.message || "Network error saving role", "error");
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

  return (
    <div className="space-y-5 font-sans animate-fade-in theme-text-primary select-none w-full max-w-6xl mx-auto">

      {/* ── HEADER CARD: Optionally shown ── */}
      {showHeaderCard && (
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-10 h-10 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-border border theme-text-primary transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                title="Back to User Management"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight theme-text-primary flex items-center gap-2.5">
                <span>Role &amp; Access Control Management</span>
                <span className="theme-bg-sub theme-text-secondary text-xs font-mono px-2.5 py-0.5 rounded-full border theme-border">
                  {roles.length} Roles
                </span>
              </h1>
              <p className="text-xs theme-text-secondary">
                Configure system authority levels, action permissions, and custom role definitions.
              </p>
            </div>
          </div>

          {/* View Switcher Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`flex-1 md:flex-none h-11 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap border flex items-center justify-center gap-2 ${
                activeTab === "list"
                  ? "theme-bg-accent theme-accent-text shadow-md border-transparent"
                  : "theme-bg-sub theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated theme-border"
              }`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Existing Roles ({roles.length})
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab("editor");
              }}
              className={`flex-1 md:flex-none h-11 px-4 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap border flex items-center justify-center gap-2 ${
                activeTab === "editor"
                  ? "theme-bg-accent theme-accent-text shadow-md border-transparent"
                  : "theme-bg-sub theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated theme-border"
              }`}
            >
              <svg className="w-4 h-4 stroke-[2.5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {editingRoleId ? "Edit Role" : "Create Custom Role"}
            </button>
          </div>
        </div>
      )}

      {/* Internal View Switcher if header is hidden */}
      {!showHeaderCard && (
        <div className="flex items-center justify-between gap-3 theme-bg-surface border theme-border rounded-2xl p-4 shadow-md">
          <div className="text-sm font-semibold theme-text-primary flex items-center gap-2">
            <span>Role Configuration &amp; Permissions</span>
            <span className="theme-bg-sub theme-text-secondary text-xs font-mono px-2 py-0.5 rounded-md border theme-border">
              {roles.length} Active Roles
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === "list"
                  ? "theme-bg-accent theme-accent-text shadow-sm border-transparent"
                  : "theme-bg-sub theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated theme-border"
              }`}
            >
              Role List ({roles.length})
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setActiveTab("editor");
              }}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                activeTab === "editor"
                  ? "theme-bg-accent theme-accent-text shadow-sm border-transparent"
                  : "theme-bg-sub theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated theme-border"
              }`}
            >
              {editingRoleId ? "Edit Role" : "+ Create Role"}
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      <div className="theme-bg-surface border theme-border rounded-2xl overflow-hidden shadow-xl w-full">
        {activeTab === "list" ? (
          <div>
            {loading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 theme-bg-sub rounded-xl animate-pulse border theme-border" />
                ))}
              </div>
            ) : roles.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl theme-bg-sub border theme-border theme-text-secondary mx-auto flex items-center justify-center shadow-inner">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold theme-text-primary">No custom roles defined</h3>
                  <p className="text-xs theme-text-secondary max-w-xs mx-auto">
                    Create custom authority roles to manage permissions across your academy.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("editor");
                  }}
                  className="px-5 py-2.5 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer mt-2"
                >
                  Create First Role
                </button>
              </div>
            ) : (
              <>
                {/* ── DESKTOP ROLES TABLE (hidden on < md) ── */}
                <div className="hidden md:block overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead className="theme-bg-sub border-b border-white/[0.06] theme-text-secondary font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-5 font-semibold">Role Name</th>
                        <th className="py-3.5 px-4 font-semibold">Role Code</th>
                        <th className="py-3.5 px-4 font-semibold text-center">Hierarchy Rank</th>
                        <th className="py-3.5 px-4 font-semibold text-center">Users</th>
                        <th className="py-3.5 px-4 font-semibold text-center">Protection</th>
                        <th className="py-3.5 px-5 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {roles.map((role) => (
                        <tr key={role.id} className="hover:theme-bg-sub transition-colors">
                          <td className="py-4 px-5">
                            <div className="font-semibold theme-text-primary text-sm">
                              {role.name}
                            </div>
                            {role.description && (
                              <div className="text-xs theme-text-secondary truncate max-w-md mt-0.5 font-sans">
                                {role.description}
                              </div>
                            )}
                          </td>

                          <td className="py-4 px-4 font-mono text-xs theme-text-secondary">
                            <span className="theme-bg-sub border theme-border px-2.5 py-1 rounded-lg">
                              {role.code}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-medium theme-bg-accent-soft theme-accent border theme-border">
                              Level {role.hierarchy_level}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center font-mono text-xs font-semibold theme-text-primary">
                            {role.user_count}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {role.code === "SUPER_ADMIN" ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Protected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-lg theme-bg-sub theme-text-secondary border theme-border">
                                Configurable
                              </span>
                            )}
                          </td>

                          {/* ── 3-DOT CONTEXT ACTION MENU ── */}
                          <td className="py-4 px-5 text-right relative">
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === role.id ? null : role.id);
                                }}
                                className="w-8 h-8 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-border border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer flex items-center justify-center"
                                title="Actions"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                                </svg>
                              </button>

                              {activeDropdownId === role.id && (
                                <div
                                  ref={dropdownRef}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className="absolute right-5 top-12 w-44 rounded-xl theme-bg-surface border theme-border shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 text-xs font-medium theme-text-primary text-left"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleCloneRole(role);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2.5 theme-text-primary"
                                  >
                                    <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                    <span>Clone Role</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleEditRole(role);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2.5 theme-text-primary"
                                  >
                                    <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    <span>Edit Role</span>
                                  </button>

                                  {role.code !== "SUPER_ADMIN" && (
                                    <>
                                      <div className="my-1 border-t border-white/[0.06]" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveDropdownId(null);
                                          handleDeleteRole(role);
                                        }}
                                        className="w-full px-3 py-2 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-2.5 font-medium"
                                      >
                                        <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Delete Role</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── MOBILE ROLES LIST CARDS (hidden on >= md) ── */}
                <div className="md:hidden divide-y divide-white/[0.04]">
                  {roles.map((role) => (
                    <div key={role.id} className="p-4 space-y-3 relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-semibold theme-text-primary text-base">
                            {role.name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs theme-text-secondary theme-bg-sub border theme-border px-2 py-0.5 rounded-md">
                              {role.code}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium theme-bg-accent-soft theme-accent border theme-border">
                              Level {role.hierarchy_level}
                            </span>
                          </div>
                        </div>

                        {/* Mobile 3-Dot Button */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === role.id ? null : role.id);
                            }}
                            className="w-8 h-8 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-border border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer flex items-center justify-center"
                            title="Actions"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                            </svg>
                          </button>

                          {activeDropdownId === role.id && (
                            <div
                              ref={dropdownRef}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="absolute right-0 top-10 w-44 rounded-xl theme-bg-surface border theme-border shadow-2xl p-1.5 z-50 animate-fade-in space-y-0.5 text-xs font-medium theme-text-primary text-left"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleCloneRole(role);
                                }}
                                className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2.5 theme-text-primary"
                              >
                                <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Clone Role</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleEditRole(role);
                                }}
                                className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2.5 theme-text-primary"
                              >
                                <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span>Edit Role</span>
                              </button>

                              {role.code !== "SUPER_ADMIN" && (
                                <>
                                  <div className="my-1 border-t border-white/[0.06]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownId(null);
                                      handleDeleteRole(role);
                                    }}
                                    className="w-full px-3 py-2 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-2.5 font-medium"
                                  >
                                    <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <span>Delete Role</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {role.description && (
                        <p className="text-xs theme-text-secondary leading-relaxed">
                          {role.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── EDITOR FORM TAB ── */
          <form onSubmit={handleSaveRole} className="p-4 sm:p-6 space-y-6">

            {/* Basic Details Card */}
            <div className="p-5 theme-bg-sub/80 border border-white/[0.06] rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full theme-bg-accent" />
                1. Role Basic Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium theme-text-secondary mb-1.5">
                    Role Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Senior Ustadh"
                    className="w-full theme-bg-surface border theme-border theme-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:theme-border font-medium transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium theme-text-secondary mb-1.5">
                    Role Unique Code *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingRoleId && roles.find((r) => r.id === editingRoleId)?.code === "SUPER_ADMIN")}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "_"),
                      })
                    }
                    placeholder="e.g. SENIOR_USTADH"
                    className="w-full theme-bg-surface border theme-border theme-text-primary px-4 py-2.5 rounded-xl text-sm font-mono focus:outline-none focus:theme-border disabled:opacity-50 font-medium transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium theme-text-secondary mb-1.5">
                  Role Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Briefly describe the operational scope for this role..."
                  className="w-full theme-bg-surface border theme-border theme-text-primary px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:theme-border resize-none font-medium transition-colors"
                />
              </div>
            </div>

            {/* Hierarchy Rank Card */}
            <div className="p-5 theme-bg-sub/80 border border-white/[0.06] rounded-2xl space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full theme-bg-accent" />
                  2. Authority Hierarchy Rank (1 - 10)
                </h3>
                <span className="text-xs font-mono font-semibold px-3 py-1 rounded-xl theme-bg-surface theme-text-primary border theme-border shadow-sm">
                  Level {formData.hierarchy_level}
                </span>
              </div>
              <p className="text-xs theme-text-secondary">
                Lower number = Higher authority (1 = Super Admin, 2 = Admin, 3 = Staff, 4 = Teacher, 10 = Guardian).
              </p>
              <div className="pt-2">
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={formData.hierarchy_level}
                  onChange={(e) =>
                    setFormData({ ...formData, hierarchy_level: parseInt(e.target.value) || 5 })
                  }
                  className="w-full accent-[var(--accent-main)] cursor-pointer h-2 theme-bg-surface rounded-lg border theme-border"
                />
                <div className="flex justify-between text-[11px] theme-text-secondary font-mono pt-2">
                  <span>Level 1 (Highest)</span>
                  <span>Level 5 (Medium)</span>
                  <span>Level 10 (Lowest)</span>
                </div>
              </div>
            </div>

            {/* Action Permissions Matrix Grid */}
            <div className="p-5 theme-bg-sub/80 border border-white/[0.06] rounded-2xl space-y-4 shadow-sm">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full theme-bg-accent" />
                3. Action Level Permission Matrix
              </h3>
              <p className="text-xs theme-text-secondary">
                Enable or disable specific action capabilities granted to this role in the backend.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
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
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked
                          ? "theme-bg-surface border-[var(--accent-main)] shadow-md"
                          : "theme-bg-surface/60 theme-border hover:theme-bg-surface"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "theme-bg-accent theme-accent-text border-[var(--accent-main)]"
                            : "theme-border theme-bg-sub"
                        }`}
                      >
                        {isChecked && (
                          <svg className="w-3 h-3 text-current stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold theme-text-primary">{item.label}</div>
                        <div className="text-[11px] theme-text-secondary mt-0.5">{item.desc}</div>
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
                className="px-5 py-2.5 text-xs font-medium theme-text-secondary hover:theme-text-primary theme-bg-sub hover:theme-bg-elevated border theme-border rounded-xl transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                disabled={saving}
                className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-6 py-2.5 rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? "Saving Role..." : "Save Role"}
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}
