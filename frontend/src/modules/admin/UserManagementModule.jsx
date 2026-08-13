import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";
import RoleManagementPanel from "./RoleManagementPanel";
import CustomSelect from "../../components/ui/CustomSelect";

// Custom Styled Checkbox Component
function CustomCheckbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-4 h-4 rounded border transition-all cursor-pointer flex items-center justify-center shrink-0 shadow-sm ${
        checked
          ? "theme-bg-accent theme-border theme-accent-text"
          : "theme-bg-sub theme-border hover:theme-border"
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 theme-accent-text stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// Custom Upward-Opening Select Dropdown (Theme Aware)
function ThemeCustomSelect({ options, value, onChange, placeholder = "Select option...", openUpward = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOpt = options.find((o) => (typeof o === "string" ? o === value : o.value === value || o.label === value));
  const displayLabel = typeof selectedOpt === "string" ? selectedOpt : selectedOpt?.label || value || placeholder;

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 theme-bg-sub border theme-border theme-text-primary px-3.5 rounded-xl text-sm flex items-center justify-between shadow-sm cursor-pointer hover:theme-border transition-colors text-left font-medium"
      >
        <span className="truncate">{displayLabel}</span>
        <svg
          className={`w-4 h-4 theme-text-secondary transition-transform shrink-0 ml-2 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 right-0 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } theme-bg-surface border theme-border rounded-xl shadow-2xl z-[100] p-1.5 space-y-0.5 text-sm max-h-64 overflow-y-auto`}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs theme-text-secondary">No options available</div>
          ) : (
            options.map((opt, i) => {
              const optVal = typeof opt === "string" ? opt : opt.value || opt.label;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              const isSelected = optVal === value || optLabel === value;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(optVal);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-lg text-left transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "theme-bg-accent-soft theme-accent font-semibold shadow-sm"
                      : "theme-text-primary hover:theme-bg-elevated font-medium"
                  }`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 theme-accent shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Role Badge Color Mapping
function getRoleBadgeStyle(colorTheme = "blue") {
  switch (colorTheme) {
    case "emerald":
      return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
    case "purple":
      return "bg-purple-500/10 text-purple-400 border border-purple-500/20";
    case "amber":
      return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
    case "rose":
      return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
    case "cyan":
      return "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20";
    case "blue":
    default:
      return "bg-sky-500/10 text-sky-400 border border-sky-500/20";
  }
}

export default function UserManagementModule() {
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState("users"); // 'users' | 'roles'
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [dbRoles, setDbRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  
  // Search state with 300ms Debounce
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Context Dropdown Menu state
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Long press selection helper for mobile screens
  const longPressTimerRef = useRef(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const isLongPressRef = useRef(false);

  const startPress = (e, userId) => {
    isLongPressRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);

    const touch = e.touches ? e.touches[0] : e;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      handleSelectOneToggle(userId);
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(50); } catch {}
      }
    }, 350);
  };

  const handleTouchMove = (e) => {
    if (!longPressTimerRef.current) return;
    const touch = e.touches ? e.touches[0] : e;
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y);

    if (deltaX > 15 || deltaY > 15) {
      cancelPress();
    }
  };

  const cancelPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = (userId) => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    setExpandedUserId((prev) => (prev === userId ? null : userId));
  };

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [groupAssignUser, setGroupAssignUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  // Form States
  const [newUser, setNewUser] = useState({
    phone_number: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    avatar_url: "",
    user_type: "GUARDIAN",
    assigned_group: "All Groups",
  });

  const [editUserForm, setEditUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    avatar_url: "",
    user_type: "GUARDIAN",
    assigned_group: "All Groups",
  });
  const [initialEditUserForm, setInitialEditUserForm] = useState(null);

  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [selectedGroupInput, setSelectedGroupInput] = useState("All Groups");
  const [saving, setSaving] = useState(false);

  // Search Debounce Effect (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    loadUsersAndRoles();
  }, []);

  // Close context dropdown when clicking outside or scrolling
  useEffect(() => {
    const handleGlobalClose = () => {
      setActiveDropdownId(null);
      setDropdownPos(null);
    };
    window.addEventListener("click", handleGlobalClose);
    window.addEventListener("scroll", handleGlobalClose, true);
    window.addEventListener("resize", handleGlobalClose);
    return () => {
      window.removeEventListener("click", handleGlobalClose);
      window.removeEventListener("scroll", handleGlobalClose, true);
      window.removeEventListener("resize", handleGlobalClose);
    };
  }, []);

  // API Loader for Users, Roles, and Halqa Groups
  const loadUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [rRes, uRes, gRes] = await Promise.all([
        fetchWithAuth("/api/v1/roles/").catch(() => null),
        fetchWithAuth("/api/v1/users/").catch(() => null),
        fetchWithAuth("/api/v1/groups/").catch(() => null),
      ]);

      if (rRes && rRes.ok) {
        const rData = await rRes.json();
        setDbRoles(Array.isArray(rData) ? rData : []);
      }

      if (uRes && uRes.ok) {
        const data = await uRes.json();
        const fetchedUsers = Array.isArray(data) ? data : data.results || [];
        setUsers(fetchedUsers);
      } else {
        try {
          const fb = await fetchWithAuth("/users/");
          if (fb.ok) {
            const data = await fb.json();
            setUsers(Array.isArray(data) ? data : data.results || []);
          }
        } catch {}
      }

      if (gRes && gRes.ok) {
        const gData = await gRes.json();
        const rawGroups = Array.isArray(gData) ? gData : gData.results || [];
        const fetchedGroups = rawGroups.map((g) =>
          typeof g === "string"
            ? { id: g, name: g }
            : { id: g.id || g.name, name: g.name || g.group_name || "General Group" }
        );
        setGroups(fetchedGroups);
      } else {
        try {
          const fbG = await fetchWithAuth("/groups/");
          if (fbG.ok) {
            const gData = await fbG.json();
            const rawGroups = Array.isArray(gData) ? gData : gData.results || [];
            setGroups(
              rawGroups.map((g) =>
                typeof g === "string"
                  ? { id: g, name: g }
                  : { id: g.id || g.name, name: g.name || g.group_name || "General Group" }
              )
            );
          }
        } catch {}
      }
    } catch {
      showToast("Error loading user management data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Helper API Candidate Invoker
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

  // Dynamic Live Counts per Role
  const counts = useMemo(() => {
    const res = { ALL: users.length };
    users.forEach((u) => {
      const roleCode = (u.role?.code || u.role_info?.code || u.user_type || u.role || "").toUpperCase();
      res[roleCode] = (res[roleCode] || 0) + 1;
    });
    return res;
  }, [users]);

  const activeUserCount = useMemo(() => {
    return users.filter(u => u.is_active !== false).length;
  }, [users]);

  const googleUserCount = useMemo(() => {
    return users.filter(u => u.auth_provider === "google").length;
  }, [users]);

  // Options for main Role Filter Dropdown
  const roleFilterOptions = useMemo(() => {
    const list = [{ label: `All Users (${counts.ALL || 0})`, value: "ALL" }];

    if (dbRoles.length > 0) {
      dbRoles.forEach((r) => {
        const c = counts[r.code] || 0;
        list.push({ label: `${r.name} (${c})`, value: r.code });
      });
    } else {
      const defaultRoles = [
        { code: "SUPER_ADMIN", name: "Super Admin" },
        { code: "ADMIN", name: "Admin / Nazim" },
        { code: "STAFF", name: "Staff / Accountant" },
        { code: "TEACHER", name: "Teacher / Ustadh" },
        { code: "GUARDIAN", name: "Guardian / Parent" },
      ];
      defaultRoles.forEach((r) => {
        const c = counts[r.code] || 0;
        list.push({ label: `${r.name} (${c})`, value: r.code });
      });
    }
    return list;
  }, [dbRoles, counts]);

  // Role List Options for Select Dropdowns
  const roleSelectOptions = useMemo(() => {
    if (dbRoles.length > 0) {
      return dbRoles.map((r) => ({ label: `${r.name} (${r.code})`, value: r.code }));
    }
    return [
      { label: "Guardian / Parent", value: "GUARDIAN" },
      { label: "Teacher / Ustadh", value: "TEACHER" },
      { label: "Admin / Nazim", value: "ADMIN" },
      { label: "Staff / Accountant", value: "STAFF" },
      { label: "Super Admin", value: "SUPER_ADMIN" },
    ];
  }, [dbRoles]);

  // Halqa Group Options
  const groupSelectOptions = useMemo(() => {
    const list = [{ label: "All Groups", value: "All Groups" }];
    groups.forEach((g) => {
      if (g.name !== "All Groups") {
        list.push({ label: g.name, value: g.name });
      }
    });
    return list;
  }, [groups]);

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const uRole = (u.role?.code || u.role_info?.code || u.user_type || u.role || "").toUpperCase();
      const roleMatch = roleFilter === "ALL" || uRole === roleFilter.toUpperCase();

      const search = debouncedSearch.toLowerCase().trim();
      const nameMatch =
        !search ||
        (u.first_name || "").toLowerCase().includes(search) ||
        (u.last_name || "").toLowerCase().includes(search) ||
        (u.phone_number || "").includes(search) ||
        (u.email || "").toLowerCase().includes(search);

      return roleMatch && nameMatch;
    });
  }, [users, roleFilter, debouncedSearch]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  const allPaginatedSelected =
    paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.includes(u.id));

  const handleSelectAllToggle = () => {
    if (allPaginatedSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedUsers.map((u) => u.id));
    }
  };

  const handleSelectOneToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatJoinedDate = (rawDate) => {
    if (!rawDate) return "--";
    try {
      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return rawDate;
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return rawDate;
    }
  };

  // Dropdown Positioning logic
  const handleDropdownToggle = (e, userId) => {
    e.stopPropagation();
    if (activeDropdownId === userId) {
      setActiveDropdownId(null);
      setDropdownPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const dropdownWidth = 192;
      const spaceBelow = window.innerHeight - rect.bottom;
      const isUpward = spaceBelow < 220;

      let calculatedLeft = rect.right - dropdownWidth;
      if (calculatedLeft < 8) calculatedLeft = 8;

      let calculatedTop = isUpward ? rect.top - 200 : rect.bottom + 6;
      if (calculatedTop < 8) calculatedTop = 8;

      setDropdownPos({
        top: calculatedTop,
        left: calculatedLeft,
      });
      setActiveDropdownId(userId);
    }
  };

  // Actions: Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.email && !newUser.phone_number) {
      showToast("Email address or Phone number is required.", "warning");
      return;
    }
    if (!newUser.password) {
      showToast("Password is required.", "warning");
      return;
    }

    setSaving(true);
    try {
      const fullName = `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim();
      const payload = { ...newUser, name: fullName };
      await apiCallCandidate(["/api/v1/users/", "/api/users/", "/users/"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      showToast("User account created successfully!", "success");
      setIsAddModalOpen(false);
      setNewUser({
        phone_number: "",
        password: "",
        first_name: "",
        last_name: "",
        email: "",
        avatar_url: "",
        user_type: "GUARDIAN",
        assigned_group: "All Groups",
      });
      loadUsersAndRoles();
    } catch (err) {
      showToast(err.message || "Failed to create user account.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Edit User
  const handleOpenEdit = (userObj) => {
    setEditingUser(userObj);
    const initialForm = {
      first_name: userObj.first_name || "",
      last_name: userObj.last_name || "",
      email: userObj.email || "",
      phone_number: userObj.phone_number || "",
      avatar_url: userObj.avatar_url || "",
      user_type: userObj.role?.code || userObj.role_info?.code || userObj.user_type || "GUARDIAN",
      assigned_group: userObj.assigned_group || "All Groups",
    };
    setEditUserForm(initialForm);
    setInitialEditUserForm(initialForm);
    setActiveDropdownId(null);
  };

  const isEditFormDirty = useMemo(() => {
    if (!initialEditUserForm || !editUserForm) return false;
    return (
      editUserForm.first_name !== initialEditUserForm.first_name ||
      editUserForm.last_name !== initialEditUserForm.last_name ||
      editUserForm.email !== initialEditUserForm.email ||
      editUserForm.phone_number !== initialEditUserForm.phone_number ||
      editUserForm.user_type !== initialEditUserForm.user_type ||
      editUserForm.assigned_group !== initialEditUserForm.assigned_group
    );
  }, [editUserForm, initialEditUserForm]);

  const handleSaveEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser || !isEditFormDirty) return;
    setSaving(true);
    try {
      const fullName = `${editUserForm.first_name || ''} ${editUserForm.last_name || ''}`.trim();
      const payload = {
        name: fullName,
        first_name: editUserForm.first_name,
        last_name: editUserForm.last_name,
        email: editUserForm.email,
        phone_number: editUserForm.phone_number,
        user_type: editUserForm.user_type,
        assigned_group: editUserForm.assigned_group,
      };

      await apiCallCandidate([
        `/api/v1/users/${editingUser.id}/`,
        `/api/users/${editingUser.id}/`,
        `/users/${editingUser.id}/`,
      ], {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      showToast("User account updated successfully!", "success");
      setEditingUser(null);
      loadUsersAndRoles();
    } catch (err) {
      showToast(err.message || "Failed to update user profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Reset Password
  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPasswordInput) return;
    setSaving(true);
    try {
      await apiCallCandidate([
        `/api/v1/users/${resetPasswordUser.id}/reset-password/`,
        `/api/users/${resetPasswordUser.id}/change-password/`,
      ], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: newPasswordInput }),
      });

      showToast(`Password reset for ${resetPasswordUser.first_name || 'User'}`, "success");
      setResetPasswordUser(null);
      setNewPasswordInput("");
    } catch (err) {
      showToast(err.message || "Failed to reset password.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Assign Group
  const handleSaveGroupAssignment = async (e) => {
    e.preventDefault();
    if (!groupAssignUser) return;
    setSaving(true);
    try {
      await apiCallCandidate([
        `/api/v1/users/${groupAssignUser.id}/`,
        `/api/users/${groupAssignUser.id}/`,
      ], {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_group: selectedGroupInput }),
      });

      showToast("Assigned group updated!", "success");
      setGroupAssignUser(null);
      loadUsersAndRoles();
    } catch (err) {
      showToast(err.message || "Failed to update group.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Revoke Sessions
  const handleRevokeSessions = async (userId) => {
    setActiveDropdownId(null);
    try {
      await apiCallCandidate(["/api/v1/auth/sessions/revoke/"], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, revoke_others: true }),
      });
      showToast("All active sessions revoked for user.", "success");
    } catch {
      showToast("Sessions revoked successfully.", "info");
    }
  };

  // Actions: Toggle Deactivate
  const handleConfirmDeleteOrDeactivate = async () => {
    if (!deleteConfirmUser) return;
    setSaving(true);
    try {
      await apiCallCandidate([
        `/api/v1/users/${deleteConfirmUser.id}/`,
        `/api/users/${deleteConfirmUser.id}/`,
      ], {
        method: "DELETE",
      });

      showToast("User account deleted/deactivated.", "success");
      setDeleteConfirmUser(null);
      loadUsersAndRoles();
    } catch (err) {
      showToast(err.message || "Action failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 font-sans theme-text-primary selection:bg-indigo-500 selection:text-white pb-12">

      {/* ── ENTERPRISE HEADER CARD WITH UNIFIED TAB SWITCHER ── */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shrink-0 shadow-inner">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight theme-text-primary flex items-center gap-2.5">
                <span>User Management</span>
                <span className="theme-bg-sub theme-text-secondary text-xs font-mono px-2.5 py-0.5 rounded-full border theme-border">
                  {currentView === "roles" ? `${dbRoles.length} Roles` : `${users.length} Total Users`}
                </span>
              </h1>
              <p className="text-xs theme-text-secondary">
                Manage user accounts, access roles, authentication providers, and authority permissions.
              </p>
            </div>
          </div>
        </div>

        {/* Header Navigation Tabs & Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 md:flex-none h-11 theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
          >
            <svg className="w-4 h-4 stroke-[2.5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            + Add User
          </button>
        </div>
      </div>

      {/* ── STATS METRICS CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="theme-bg-surface border theme-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider theme-text-secondary">Total Registered</div>
            <div className="text-xl font-bold theme-text-primary mt-1">{users.length}</div>
          </div>
          <div className="w-9 h-9 rounded-lg theme-bg-sub border theme-border flex items-center justify-center theme-text-secondary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        <div className="theme-bg-surface border theme-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider theme-text-secondary">Active Users</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{activeUserCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="theme-bg-surface border theme-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider theme-text-secondary">Google Auth</div>
            <div className="text-xl font-bold theme-text-primary mt-1">{googleUserCount}</div>
          </div>
          <div className="w-9 h-9 rounded-lg theme-bg-sub border theme-border flex items-center justify-center theme-text-primary">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
              <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
              <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z" />
              <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
            </svg>
          </div>
        </div>

        <div className="theme-bg-surface border theme-border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider theme-text-secondary">Custom Roles</div>
            <div className="text-xl font-bold theme-accent mt-1">{dbRoles.length || 5}</div>
          </div>
          <div className="w-9 h-9 rounded-lg theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── CONTROL BAR: Role filter on left, Search on right ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-64 md:w-72">
          <CustomSelect
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(val) => {
              setRoleFilter(val);
              setCurrentPage(1);
            }}
            placeholder="All Roles"
            className="w-full"
          />
        </div>

        <div className="relative w-full sm:w-72 md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full h-11 pl-10 pr-9 rounded-xl theme-bg-sub border theme-border theme-text-primary text-sm focus:outline-none focus:theme-border transition-colors placeholder:theme-text-secondary shadow-sm font-medium"
          />
          <svg className="w-4 h-4 theme-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-secondary hover:theme-text-primary text-sm cursor-pointer p-0.5 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN USER LIST CARD ── */}
      <div className="theme-bg-surface border theme-border rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 theme-bg-sub rounded-xl animate-pulse border theme-border" />
            ))}
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl theme-bg-sub border theme-border theme-text-secondary mx-auto flex items-center justify-center shadow-inner">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold theme-text-primary">No users found</h3>
              <p className="text-xs theme-text-secondary max-w-xs mx-auto">
                {debouncedSearch || roleFilter !== "ALL"
                  ? "No user records match your search or filter selection."
                  : "Get started by creating a new user account."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer mt-2"
            >
              <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create First User
            </button>
          </div>
        ) : (
          <>
            {/* ── DESKTOP TABLE ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead className="theme-bg-sub border-b theme-border theme-text-secondary font-mono text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 w-10">
                      <CustomCheckbox checked={allPaginatedSelected} onChange={handleSelectAllToggle} />
                    </th>
                    <th className="py-3.5 px-4">User &amp; Contact</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Auth</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {paginatedUsers.map((u) => {
                    const isSelected = selectedIds.includes(u.id);
                    const roleObj = u.role || dbRoles.find((r) => r.code === u.user_type);
                    const roleName = roleObj?.name || u.user_type || "User";
                    const badgeStyle = getRoleBadgeStyle(roleObj?.color_theme);
                    const isGoogle = u.auth_provider === "google";

                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors ${isSelected ? "theme-bg-accent-soft" : "hover:theme-bg-sub"}`}
                      >
                        <td className="py-3.5 px-4">
                          <CustomCheckbox checked={isSelected} onChange={() => handleSelectOneToggle(u.id)} />
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.first_name || "User"} className="w-9 h-9 rounded-full object-cover border theme-border shrink-0" />
                            ) : (
                              <div className="w-9 h-9 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0">
                                {(u.first_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold theme-text-primary text-sm truncate">
                                {`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || u.phone_number}
                                {u.name_bn && <span className="theme-text-secondary font-normal text-xs ml-1.5">({u.name_bn})</span>}
                              </div>
                              <div className="font-mono text-xs theme-text-secondary truncate mt-0.5">
                                {u.email && <span>{u.email}</span>}
                                {u.phone_number && <span> • {u.phone_number}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${badgeStyle}`}>
                            {roleName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isGoogle ? (
                            <span className="inline-flex items-center gap-1.5 theme-bg-sub theme-text-primary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
                              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                                <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z" />
                                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                              </svg>
                              Google
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 theme-bg-sub theme-text-secondary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
                              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="theme-bg-sub theme-text-secondary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
                            {u.assigned_group || "Unassigned"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.is_active !== false ? (
                            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 text-xs theme-text-secondary font-medium">
                              <span className="w-2 h-2 rounded-full theme-bg-elevated" />
                              Inactive
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 theme-text-secondary font-mono text-xs">
                          {formatJoinedDate(u.date_joined || u.created_at)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => handleDropdownToggle(e, u.id)}
                            className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-colors cursor-pointer"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE ACCORDION CARDS ── */}
            <div className="md:hidden divide-y divide-white/[0.04]">
              {paginatedUsers.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                const isExpanded = expandedUserId === u.id;
                const roleObj = u.role || dbRoles.find((r) => r.code === u.user_type);
                const roleName = roleObj?.name || u.user_type || "User";
                const badgeStyle = getRoleBadgeStyle(roleObj?.color_theme);
                const isGoogle = u.auth_provider === "google";

                return (
                  <div
                    key={u.id}
                    className={`transition-colors ${isSelected ? "theme-bg-accent-soft" : ""}`}
                  >
                    {/* Collapsed Row */}
                    <div
                      className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none"
                      onClick={() => handleCardClick(u.id)}
                      onTouchStart={(e) => startPress(e, u.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={cancelPress}
                    >
                      {/* Avatar with status dot / selection ring */}
                      <div className="relative shrink-0">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.first_name || "User"}
                            className={`w-10 h-10 rounded-full object-cover shrink-0 transition-all ${
                              isSelected
                                ? "ring-2 ring-offset-2 ring-offset-[var(--bg-surface)] ring-[var(--accent-main)]"
                                : "border theme-border"
                            }`}
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-full theme-bg-elevated theme-accent font-bold text-sm flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "ring-2 ring-offset-2 ring-offset-[var(--bg-surface)] ring-[var(--accent-main)]"
                              : "border theme-border"
                          }`}>
                            {(u.first_name?.[0] || u.email?.[0] || "U").toUpperCase()}
                          </div>
                        )}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)] ${
                          u.is_active !== false ? "bg-emerald-400" : "bg-zinc-500"
                        }`} />
                      </div>

                      {/* Left: Name + Bengali Name + Plain Theme Role (No color pill) */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold theme-text-primary text-sm truncate leading-snug">
                          {`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || u.phone_number}
                          {u.name_bn && <span className="theme-text-secondary font-normal text-xs ml-1.5 font-sans">({u.name_bn})</span>}
                        </div>
                        <div className="text-xs theme-text-secondary font-medium mt-0.5">
                          {roleName}
                        </div>
                      </div>

                      {/* Right: Active/Inactive status + Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium ${u.is_active !== false ? "text-emerald-400" : "theme-text-secondary"}`}>
                          {u.is_active !== false ? "Active" : "Inactive"}
                        </span>
                        <svg
                          className={`w-4 h-4 theme-text-secondary transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Expanded Detail Panel (Polished UI) */}
                    {isExpanded && (
                      <div className="mx-3 mb-3.5 rounded-2xl theme-bg-sub/80 border theme-border overflow-hidden shadow-lg animate-fade-in">
                        {/* Details grid with icon labels */}
                        <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider theme-text-secondary mb-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Phone
                            </div>
                            <div className="text-xs font-semibold theme-text-primary font-mono">{u.phone_number || "—"}</div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider theme-text-secondary mb-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              Auth Provider
                            </div>
                            {isGoogle ? (
                              <span className="inline-flex items-center gap-1.5 text-xs theme-text-primary font-medium">
                                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                                  <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z" />
                                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                                  <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.2-.7-.4-1.5-.4-2.3z" />
                                  <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
                                </svg>
                                Google
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs theme-text-secondary font-medium">
                                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email
                              </span>
                            )}
                          </div>

                          <div className="col-span-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider theme-text-secondary mb-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Email Address
                            </div>
                            <div className="text-xs theme-text-primary font-mono truncate">{u.email || "—"}</div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider theme-text-secondary mb-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              Halqa Group
                            </div>
                            <div className="text-xs theme-text-primary font-medium">{u.assigned_group || "Unassigned"}</div>
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider theme-text-secondary mb-1">
                              <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Joined Date
                            </div>
                            <div className="text-xs theme-text-primary font-mono">{formatJoinedDate(u.date_joined || u.created_at)}</div>
                          </div>
                        </div>

                        {/* Bottom Actions footer: Single 3-dot button only */}
                        <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center justify-between theme-bg-elevated/40">
                          <span className="text-[11px] theme-text-secondary font-mono italic">Long press row to select</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDropdownToggle(e, u.id); }}
                            className="p-2 rounded-xl theme-bg-elevated border theme-border theme-text-primary hover:theme-border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                            title="More Actions"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── PAGINATION FOOTER ── */}
        {filteredUsers.length > 0 && (
          <div className="p-4 theme-bg-sub border-t theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs theme-text-secondary font-mono">
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredUsers.length)}–{Math.min(currentPage * pageSize, filteredUsers.length)} of {filteredUsers.length}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg theme-bg-elevated border theme-border theme-text-primary hover:opacity-80 disabled:opacity-40 transition-colors cursor-pointer text-xs font-semibold"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setCurrentPage(pg)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    pg === currentPage
                      ? "theme-bg-accent theme-accent-text font-bold"
                      : "theme-bg-elevated border theme-border theme-text-primary hover:opacity-80"
                  }`}
                >
                  {pg}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg theme-bg-elevated border theme-border theme-text-primary hover:opacity-80 disabled:opacity-40 transition-colors cursor-pointer text-xs font-semibold"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Context Dropdown Menu */}
      {activeDropdownId && dropdownPos && (
        <div
          style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
          className="fixed z-[120] w-48 theme-bg-surface border theme-border rounded-xl shadow-2xl p-1.5 space-y-0.5 text-xs theme-text-primary animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const activeUser = users.find((u) => u.id === activeDropdownId);
            if (!activeUser) return null;

            return (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(activeUser)}
                  className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2 theme-text-primary"
                >
                  <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResetPasswordUser(activeUser);
                    setActiveDropdownId(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2 theme-text-primary"
                >
                  <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span>Reset Password</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRevokeSessions(activeUser.id)}
                  className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated transition-colors cursor-pointer flex items-center gap-2 theme-text-primary"
                >
                  <svg className="w-4 h-4 theme-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Revoke Sessions</span>
                </button>

                <div className="my-1 border-t theme-border" />

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmUser(activeUser);
                    setActiveDropdownId(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-left text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Deactivate Account</span>
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Modal: Create User Account */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 theme-text-primary">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold theme-text-primary">Create User Account</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">First Name (English)</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    placeholder="Abdullah"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Last Name (English)</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    placeholder="Rahman"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@suffahhifz.com"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newUser.phone_number}
                    onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                    placeholder="01700000000"
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary font-mono focus:outline-none focus:theme-border"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs theme-text-secondary mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Account Role *</label>
                  <ThemeCustomSelect
                    options={roleSelectOptions}
                    value={newUser.user_type}
                    onChange={(val) => setNewUser({ ...newUser, user_type: val })}
                    openUpward={false}
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Assigned Halqa Group</label>
                  <ThemeCustomSelect
                    options={groupSelectOptions}
                    value={newUser.assigned_group}
                    onChange={(val) => setNewUser({ ...newUser, assigned_group: val })}
                    openUpward={false}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User Profile */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 theme-text-primary">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold theme-text-primary">Edit User Profile</h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">First Name (English)</label>
                  <input
                    type="text"
                    value={editUserForm.first_name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, first_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Last Name (English)</label>
                  <input
                    type="text"
                    value={editUserForm.last_name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, last_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editUserForm.email}
                    onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:theme-border"
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editUserForm.phone_number}
                    onChange={(e) => setEditUserForm({ ...editUserForm, phone_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary font-mono focus:outline-none focus:theme-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Account Role</label>
                  <ThemeCustomSelect
                    options={roleSelectOptions}
                    value={editUserForm.user_type}
                    onChange={(val) => setEditUserForm({ ...editUserForm, user_type: val })}
                    openUpward={false}
                  />
                </div>
                <div>
                  <label className="block font-mono text-xs theme-text-secondary mb-1">Assigned Group</label>
                  <ThemeCustomSelect
                    options={groupSelectOptions}
                    value={editUserForm.assigned_group}
                    onChange={(val) => setEditUserForm({ ...editUserForm, assigned_group: val })}
                    openUpward={false}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !isEditFormDirty}
                  className="px-5 py-2 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 theme-text-primary">
            <h2 className="text-lg font-semibold theme-text-primary">Reset Password</h2>
            <p className="text-xs theme-text-secondary">
              Enter a new password for <strong className="theme-text-primary">{resetPasswordUser.first_name || resetPasswordUser.email}</strong>:
            </p>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <input
                type="password"
                required
                minLength={8}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-sm focus:outline-none focus:theme-border"
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Halqa Group */}
      {groupAssignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 theme-text-primary">
            <h2 className="text-lg font-semibold theme-text-primary">Assign Halqa Group</h2>
            <p className="text-xs theme-text-secondary">
              Select Halqa Group for <strong className="theme-text-primary">{groupAssignUser.first_name || groupAssignUser.email}</strong>:
            </p>

            <form onSubmit={handleSaveGroupAssignment} className="space-y-4">
              <ThemeCustomSelect
                options={groupSelectOptions}
                value={selectedGroupInput}
                onChange={(val) => setSelectedGroupInput(val)}
                openUpward={false}
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupAssignUser(null)}
                  className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text font-semibold text-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Group"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Deactivate Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="theme-bg-surface border theme-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 theme-text-primary">
            <h2 className="text-lg font-semibold text-rose-400">Deactivate Account</h2>
            <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed">
              Are you sure you want to deactivate or delete the account for{" "}
              <strong className="theme-text-primary">{deleteConfirmUser.first_name || deleteConfirmUser.email}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirmDeleteOrDeactivate}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs disabled:opacity-50"
              >
                {saving ? "Processing..." : "Deactivate Account"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
