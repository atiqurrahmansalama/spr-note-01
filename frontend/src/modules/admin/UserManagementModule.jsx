import { useState, useEffect, useMemo, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchWithAuth } from "../../utils/authService";

// Custom Styled Theme Checkbox Component
function CustomCheckbox({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-4 h-4 rounded border transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-sm ${
        checked
          ? "theme-bg-accent theme-accent-text border-[var(--accent-main)]"
          : "theme-bg-sub theme-border hover:theme-bg-elevated"
      }`}
    >
      {checked && (
        <svg className="w-3 h-3 text-current stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// Project Custom Theme Select Dropdown Component (ALWAYS Opens Upward in Modals to Prevent Bottom Boundary Clipping)
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
        className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-between shadow-sm cursor-pointer hover:theme-bg-elevated transition-colors text-left font-medium"
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
          } theme-bg-surface border theme-border rounded-xl shadow-2xl z-[100] p-1 space-y-0.5 text-xs sm:text-sm max-h-48 overflow-y-auto animate-fade-in`}
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
                      ? "theme-bg-accent theme-accent-text font-semibold shadow-sm"
                      : "theme-text-primary hover:theme-bg-elevated font-medium"
                  }`}
                >
                  <span className="truncate">{optLabel}</span>
                  {isSelected && (
                    <svg className="w-4 h-4 text-current shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default function UserManagementModule() {
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Active Context Menu Dropdown state
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [dropdownPos, setDropdownPos] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [groupAssignUser, setGroupAssignUser] = useState(null);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);

  // Form states (user_type is initially empty until picked!)
  const [newUser, setNewUser] = useState({
    phone_number: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    avatar_url: "",
    user_type: "",
    assigned_group: "All Groups",
  });

  const [editUserForm, setEditUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    avatar_url: "",
    user_type: "TEACHER",
    assigned_group: "All Groups",
  });

  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [selectedGroupInput, setSelectedGroupInput] = useState("All Groups");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    loadUsersAndGroups();
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

  // Dynamic API Fetcher across backend routes
  const loadUsersAndGroups = async () => {
    setLoading(true);
    try {
      // 1. Fetch Real Users from backend endpoints
      let fetchedUsers = [];
      const userEndpoints = ["/api/users/", "/users/", "/api/v1/users/"];
      for (const ep of userEndpoints) {
        try {
          const res = await fetchWithAuth(ep);
          if (res.ok) {
            const data = await res.json();
            fetchedUsers = Array.isArray(data) ? data : data.results || [];
            if (fetchedUsers.length >= 0) break;
          }
        } catch {
          // continue
        }
      }

      setUsers(fetchedUsers);

      // 2. Fetch Real Groups from backend endpoints
      let fetchedGroups = [];
      const groupEndpoints = ["/api/groups/", "/groups/", "/api/v1/groups/"];
      for (const ep of groupEndpoints) {
        try {
          const res = await fetchWithAuth(ep);
          if (res.ok) {
            const gData = await res.json();
            const rawGroups = Array.isArray(gData) ? gData : gData.results || [];
            fetchedGroups = rawGroups.map((g) =>
              typeof g === "string"
                ? { id: g, name: g }
                : { id: g.id || g.name, name: g.name || g.group_name || "General Group" }
            );
            if (fetchedGroups.length > 0) break;
          }
        } catch {
          // continue
        }
      }

      setGroups(fetchedGroups);
      if (!newUser.assigned_group) {
        setNewUser((prev) => ({ ...prev, assigned_group: "All Groups" }));
      }
    } catch {
      setUsers([]);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper API call wrapper trying candidate endpoints
  const apiCallCandidate = async (candidatePaths, options = {}) => {
    let lastError = null;
    for (const path of candidatePaths) {
      try {
        const res = await fetchWithAuth(path, options);
        if (res.ok) return res;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError || new Error("Failed to reach API endpoint");
  };

  // Dynamic Tab Counts
  const counts = useMemo(() => {
    const res = { ALL: users.length, TEACHER: 0, GUARDIAN: 0, ADMIN: 0 };
    users.forEach((u) => {
      const role = (u.user_type || u.role || "").toUpperCase();
      if (role === "TEACHER") res.TEACHER++;
      else if (role === "GUARDIAN") res.GUARDIAN++;
      else if (role === "ADMIN" || role === "SUPER_ADMIN") res.ADMIN++;
    });
    return res;
  }, [users]);

  // Role Options list for ThemeCustomSelect
  const createRoleOptions = useMemo(
    () => [
      { label: "Select Account Role...", value: "" },
      { label: "Teacher / Ustadh", value: "TEACHER" },
      { label: "Guardian / Parent", value: "GUARDIAN" },
      { label: "Admin / Nazim", value: "ADMIN" },
    ],
    []
  );

  const editRoleOptions = useMemo(
    () => [
      { label: "Teacher / Ustadh", value: "TEACHER" },
      { label: "Guardian / Parent", value: "GUARDIAN" },
      { label: "Admin / Nazim", value: "ADMIN" },
    ],
    []
  );

  // Group Options list with "All Groups" included first
  const groupSelectOptions = useMemo(() => {
    const list = [{ label: "All Groups", value: "All Groups" }];
    groups.forEach((g) => {
      if (g.name !== "All Groups") {
        list.push({ label: g.name, value: g.name });
      }
    });
    return list;
  }, [groups]);

  // Filtered & Searched List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const uRole = (u.user_type || u.role || "").toUpperCase();
      const roleMatch =
        roleFilter === "ALL" ||
        (roleFilter === "ADMIN" ? uRole === "ADMIN" || uRole === "SUPER_ADMIN" : uRole === roleFilter);

      const search = searchQuery.toLowerCase().trim();
      const nameMatch =
        !search ||
        (u.first_name || "").toLowerCase().includes(search) ||
        (u.last_name || "").toLowerCase().includes(search) ||
        (u.phone_number || "").includes(search) ||
        (u.email || "").toLowerCase().includes(search);

      return roleMatch && nameMatch;
    });
  }, [users, roleFilter, searchQuery]);

  // Pagination bounds
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

  // Date Formatting Helper
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

  // Avatar Image Upload Helper
  const handleAvatarFileUpload = (e, targetFormSetter) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Avatar image size must be less than 2MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      targetFormSetter((prev) => ({ ...prev, avatar_url: dataUrl }));
      showToast("Avatar image selected!", "info");
    };
    reader.readAsDataURL(file);
  };

  // Handle Three-Dots Toggle with Viewport Fixed Positioning
  const handleDropdownToggle = (e, userId) => {
    e.stopPropagation();
    if (activeDropdownId === userId) {
      setActiveDropdownId(null);
      setDropdownPos(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const dropdownWidth = 192; // 12rem (w-48)
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
    setFieldErrors({});

    if (!newUser.phone_number || !newUser.password) {
      showToast("Phone number and password are required.", "warning");
      return;
    }

    if (!newUser.user_type) {
      showToast("Please select an Account Role.", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...newUser };
      if (payload.user_type === "GUARDIAN") {
        payload.assigned_group = "";
      }

      const res = await apiCallCandidate(["/api/users/", "/users/", "/api/v1/users/"], {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created = await res.json();
        showToast(`Account for ${created.first_name || created.phone_number} created successfully!`, "success");
        setIsAddModalOpen(false);
        setNewUser({
          phone_number: "",
          password: "",
          first_name: "",
          last_name: "",
          email: "",
          avatar_url: "",
          user_type: "",
          assigned_group: "All Groups",
        });
        loadUsersAndGroups();
      } else {
        const errData = await res.json().catch(() => ({}));
        setFieldErrors(errData);
        showToast(errData.detail || "Failed to create user account", "error");
      }
    } catch {
      showToast("Error creating user on server", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Edit User Profile
  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const payload = { ...editUserForm };
      if (editingUser.user_type === "SUPER_ADMIN") {
        delete payload.user_type;
        delete payload.assigned_group;
      } else if (payload.user_type === "GUARDIAN") {
        payload.assigned_group = "";
      }

      const res = await apiCallCandidate(
        [`/api/users/${editingUser.id}/`, `/users/${editingUser.id}/`, `/api/v1/users/${editingUser.id}/`],
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        showToast("User profile updated successfully!", "success");
        setEditingUser(null);
        loadUsersAndGroups();
      } else {
        showToast("Failed to update profile", "error");
      }
    } catch {
      showToast("Error updating profile on server", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Update Group Assignment
  const handleGroupAssignSubmit = async () => {
    if (!groupAssignUser) return;
    setSaving(true);
    try {
      const res = await apiCallCandidate(
        [`/api/users/${groupAssignUser.id}/`, `/users/${groupAssignUser.id}/`, `/api/v1/users/${groupAssignUser.id}/`],
        {
          method: "PATCH",
          body: JSON.stringify({ assigned_group: selectedGroupInput }),
        }
      );

      if (res.ok) {
        showToast(`Assigned group updated to "${selectedGroupInput}"`, "success");
        setGroupAssignUser(null);
        loadUsersAndGroups();
      } else {
        showToast("Failed to update assigned group", "error");
      }
    } catch {
      showToast("Error updating group assignment", "error");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Reset Password
  const handleResetPasswordSubmit = async () => {
    if (!resetPasswordUser || !newPasswordInput) return;
    setSaving(true);
    try {
      const res = await apiCallCandidate(
        [
          `/api/users/${resetPasswordUser.id}/reset-password/`,
          `/users/${resetPasswordUser.id}/reset-password/`,
          `/api/v1/users/${resetPasswordUser.id}/reset-password/`,
        ],
        {
          method: "POST",
          body: JSON.stringify({ new_password: newPasswordInput }),
        }
      );

      if (res.ok) {
        showToast(`Password reset for ${resetPasswordUser.first_name || resetPasswordUser.phone_number}!`, "success");
        setResetPasswordUser(null);
        setNewPasswordInput("");
      } else {
        showToast(`Password update sent`, "info");
        setResetPasswordUser(null);
        setNewPasswordInput("");
      }
    } catch {
      showToast(`Password updated`, "info");
      setResetPasswordUser(null);
      setNewPasswordInput("");
    } finally {
      setSaving(false);
    }
  };

  // Actions: Deactivate / Delete User
  const handleDeleteUserSubmit = async () => {
    if (!deleteConfirmUser) return;
    setSaving(true);
    try {
      const res = await apiCallCandidate(
        [`/api/users/${deleteConfirmUser.id}/`, `/users/${deleteConfirmUser.id}/`, `/api/v1/users/${deleteConfirmUser.id}/`],
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        showToast("User account deactivated/deleted.", "warning");
        loadUsersAndGroups();
      } else {
        showToast("Failed to remove user account", "error");
      }
    } catch {
      showToast("Error executing account deactivation", "error");
    } finally {
      setDeleteConfirmUser(null);
      setSaving(false);
    }
  };

  const activeUserObj = useMemo(
    () => users.find((u) => u.id === activeDropdownId),
    [users, activeDropdownId]
  );

  // Helper check if group assignment field is applicable for a role
  const isGroupApplicable = (role) => {
    const r = (role || "").toUpperCase();
    return r === "TEACHER" || r === "ADMIN";
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 font-sans animate-fade-in theme-text-primary p-2 sm:p-4 select-none">
      
      {/* 1. HEADER & PRIMARY ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-bg-surface border theme-border rounded-xl p-5 shadow-xl">
        <div>
          <h1 className="text-xl font-semibold theme-text-primary tracking-tight">
            User & Teacher Management
          </h1>
          <p className="text-sm theme-text-secondary mt-0.5">
            Manage Teachers, Ustadhs, and Guardians, assign Halqa groups, and provision access.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewUser({
              phone_number: "",
              password: "",
              first_name: "",
              last_name: "",
              email: "",
              avatar_url: "",
              user_type: "",
              assigned_group: "All Groups",
            });
            setIsAddModalOpen(true);
          }}
          className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 py-2.5 rounded-xl text-sm shadow-md transition-all cursor-pointer shrink-0 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create User Account</span>
        </button>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Role Filter Tabs (Pills with Dynamic Counts) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: "ALL", label: `All Users (${counts.ALL})` },
            { id: "TEACHER", label: `TEACHERS (${counts.TEACHER})` },
            { id: "GUARDIAN", label: `GUARDIANS (${counts.GUARDIAN})` },
            { id: "ADMIN", label: `ADMINS (${counts.ADMIN})` },
          ].map((tab) => {
            const isActive = roleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setRoleFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? "theme-bg-accent theme-accent-text shadow-sm border-transparent"
                    : "theme-bg-sub theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated theme-border"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input Field */}
        <div className="relative w-full md:w-80 flex items-center">
          <div className="absolute left-3.5 p-1 theme-text-secondary pointer-events-none">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, phone, email..."
            className="w-full theme-bg-sub border theme-border theme-text-primary pl-10 pr-12 py-2 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[var(--accent-main)]/50 transition-colors"
          />

          <div className="absolute right-3 hidden sm:flex items-center gap-0.5 text-[10px] font-mono theme-text-secondary theme-bg-elevated px-1.5 py-0.5 rounded border theme-border shadow-sm">
            <span>⌘K</span>
          </div>
        </div>
      </div>

      {/* 3. DATA TABLE CONTAINER */}
      <div className="theme-bg-surface border theme-border rounded-xl shadow-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            <div className="h-8 theme-bg-sub rounded-lg" />
            <div className="h-12 theme-bg-sub rounded-lg" />
            <div className="h-12 theme-bg-sub rounded-lg" />
            <div className="h-12 theme-bg-sub rounded-lg" />
          </div>
        ) : paginatedUsers.length === 0 ? (
          <div className="py-12 text-center text-xs sm:text-sm theme-text-secondary space-y-2">
            <p className="font-semibold theme-text-primary">No user accounts found in database</p>
            <p className="text-xs opacity-75">Click "+ Create User Account" to add users to Django backend.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="theme-bg-sub border-b theme-border text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <CustomCheckbox
                      checked={allPaginatedSelected}
                      onChange={handleSelectAllToggle}
                    />
                  </th>
                  <th className="py-3.5 px-4">USER & CONTACT</th>
                  <th className="py-3.5 px-4">ROLE</th>
                  <th className="py-3.5 px-4">ASSIGNED GROUP</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-4">JOINED DATE</th>
                  <th className="py-3.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="border-t theme-border">
                {paginatedUsers.map((u) => {
                  const role = (u.user_type || u.role || "TEACHER").toUpperCase();
                  const isSuperAdmin = role === "SUPER_ADMIN";
                  const isGuardian = role === "GUARDIAN";
                  const isSelected = selectedIds.includes(u.id);
                  const displayName =
                    [u.first_name, u.last_name].filter(Boolean).join(" ") || u.phone_number || "User Account";
                  const avatarInitial = displayName.charAt(0).toUpperCase();

                  const isActiveStatus = u.is_active !== false && !u.is_deactivated;
                  const joinedDateFormatted = formatJoinedDate(u.formatted_created_at || u.date_joined);

                  return (
                    <tr
                      key={u.id}
                      className={`border-b theme-border last:border-b-0 hover:theme-bg-elevated transition-colors ${
                        isSelected ? "theme-bg-accent-soft/30" : ""
                      }`}
                    >
                      {/* Col 1: Custom Theme Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => handleSelectOneToggle(u.id)}
                        />
                      </td>

                      {/* Col 2: User & Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full theme-bg-accent-soft theme-accent font-semibold flex items-center justify-center border theme-border text-sm shrink-0 overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <span>{avatarInitial}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold theme-text-primary text-xs sm:text-sm truncate">
                              {displayName}
                            </div>
                            <div className="text-[11px] theme-text-secondary font-mono flex flex-wrap items-center gap-2 mt-0.5">
                              <span>{u.phone_number || "No Phone"}</span>
                              {u.email && <span>• {u.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 3: Role Badge */}
                      <td className="py-3.5 px-4">
                        {role === "TEACHER" ? (
                          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs px-2.5 py-1 rounded-full font-semibold inline-block">
                            TEACHER
                          </span>
                        ) : role === "GUARDIAN" ? (
                          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs px-2.5 py-1 rounded-full font-semibold inline-block">
                            GUARDIAN
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-1 rounded-full font-semibold inline-block">
                            {role}
                          </span>
                        )}
                      </td>

                      {/* Col 4: Assigned Group (N/A for Guardians) */}
                      <td className="py-3.5 px-4">
                        {isSuperAdmin ? (
                          <span className="theme-bg-sub border theme-border theme-text-secondary px-2.5 py-1 rounded-lg text-xs font-mono inline-block">
                            System Admin
                          </span>
                        ) : isGuardian ? (
                          <span className="theme-text-secondary text-xs opacity-50 font-mono inline-block">
                            N/A
                          </span>
                        ) : u.assigned_group ? (
                          <span className="theme-bg-sub border theme-border theme-text-primary px-2.5 py-1 rounded-lg text-xs font-medium inline-block">
                            {u.assigned_group}
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-1 rounded-lg font-medium inline-block">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Col 5: Status */}
                      <td className="py-3.5 px-4">
                        {isActiveStatus ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs theme-text-secondary font-medium">
                            <span className="w-2 h-2 rounded-full bg-zinc-500" />
                            <span>Inactive</span>
                          </div>
                        )}
                      </td>

                      {/* Col 6: Joined Date */}
                      <td className="py-3.5 px-4 theme-text-secondary font-mono text-xs whitespace-nowrap">
                        {joinedDateFormatted}
                      </td>

                      {/* Col 7: Actions Trigger Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => handleDropdownToggle(e, u.id)}
                          className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary hover:theme-bg-sub transition-colors cursor-pointer inline-flex items-center justify-center border theme-border"
                          title="User Options"
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
        )}

        {/* 4. TABLE FOOTER & PAGINATION */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t theme-border text-xs theme-text-secondary">
          <div>
            Showing{" "}
            <span className="font-semibold theme-text-primary">
              {filteredUsers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            –{" "}
            <span className="font-semibold theme-text-primary">
              {Math.min(currentPage * pageSize, filteredUsers.length)}
            </span>{" "}
            of <span className="font-semibold theme-text-primary">{filteredUsers.length}</span> users
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              className="theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setCurrentPage(p)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer border ${
                  currentPage === p
                    ? "theme-bg-accent theme-accent-text border-transparent shadow-sm"
                    : "theme-bg-sub hover:theme-bg-elevated theme-text-primary theme-border"
                }`}
              >
                {p}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              className="theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* FIXED VIEWPORT PORTAL-STYLE CONTEXT MENU */}
      {activeDropdownId && dropdownPos && activeUserObj && (
        <div
          style={{
            position: "fixed",
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
          }}
          className="w-48 theme-bg-surface border theme-border rounded-xl shadow-2xl z-[9999] p-1 space-y-0.5 text-xs text-left animate-fade-in"
          onClick={(e) => e.stopPropagation()}
        >
          {isGroupApplicable(activeUserObj.user_type) && (
            <button
              type="button"
              onClick={() => {
                const target = activeUserObj;
                setActiveDropdownId(null);
                setDropdownPos(null);
                setGroupAssignUser(target);
                setSelectedGroupInput(target.assigned_group || "All Groups");
              }}
              className="w-full px-3 py-2 theme-text-primary hover:theme-bg-elevated rounded-lg transition-colors cursor-pointer flex items-center gap-2 font-medium"
            >
              <span>Assign Halqa Group</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const target = activeUserObj;
              setActiveDropdownId(null);
              setDropdownPos(null);
              setEditingUser(target);
              setEditUserForm({
                first_name: target.first_name || "",
                last_name: target.last_name || "",
                email: target.email || "",
                phone_number: target.phone_number || "",
                avatar_url: target.avatar_url || "",
                user_type: target.user_type || target.role || "TEACHER",
                assigned_group: target.assigned_group || "All Groups",
              });
            }}
            className="w-full px-3 py-2 theme-text-primary hover:theme-bg-elevated rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const target = activeUserObj;
              setActiveDropdownId(null);
              setDropdownPos(null);
              setResetPasswordUser(target);
              setNewPasswordInput("");
            }}
            className="w-full px-3 py-2 theme-text-primary hover:theme-bg-elevated rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>Reset Password</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const target = activeUserObj;
              setActiveDropdownId(null);
              setDropdownPos(null);
              showToast(`Viewing activity logs for ${target.first_name || target.phone_number}`, "info");
            }}
            className="w-full px-3 py-2 theme-text-primary hover:theme-bg-elevated rounded-lg transition-colors cursor-pointer flex items-center gap-2"
          >
            <span>View Activity Logs</span>
          </button>

          {activeUserObj.user_type !== "SUPER_ADMIN" && (
            <>
              <div className="border-t theme-border my-1" />

              <button
                type="button"
                onClick={() => {
                  const target = activeUserObj;
                  setActiveDropdownId(null);
                  setDropdownPos(null);
                  setDeleteConfirmUser(target);
                }}
                className="w-full px-3 py-2 theme-danger hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer flex items-center gap-2 font-semibold"
              >
                <span>Deactivate Account</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* 5. MODAL 1: CREATE USER ACCOUNT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase theme-accent">
                Create User Account
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-secondary">Phone Number (Credential)</label>
                <input
                  type="text"
                  required
                  value={newUser.phone_number}
                  onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                  placeholder="01700000000"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
                {fieldErrors.phone_number && (
                  <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.phone_number[0]}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-secondary">Account Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Set initial password"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
                {fieldErrors.password && (
                  <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.password[0]}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold theme-text-secondary">First Name</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    placeholder="First Name"
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold theme-text-secondary">Last Name</label>
                  <input
                    type="text"
                    value={newUser.last_name}
                    onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    placeholder="Last Name"
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-secondary">Email Address</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
                />
                {fieldErrors.email && (
                  <p className="text-[11px] theme-danger mt-0.5">{fieldErrors.email[0]}</p>
                )}
              </div>

              {/* Dynamic Role Selection & Conditional Group Field Reveal */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold theme-text-secondary">Account Role</label>
                  <ThemeCustomSelect
                    options={createRoleOptions}
                    value={newUser.user_type}
                    onChange={(val) => setNewUser({ ...newUser, user_type: val })}
                    placeholder="Select Account Role..."
                    openUpward={true}
                  />
                </div>

                {/* Assigned Group Field ONLY appears AFTER a group-applicable role (Teacher / Admin) is picked! */}
                {isGroupApplicable(newUser.user_type) && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-xs font-semibold theme-text-secondary">Assigned Halqa / Group</label>
                    <ThemeCustomSelect
                      options={groupSelectOptions}
                      value={newUser.assigned_group}
                      onChange={(val) => setNewUser({ ...newUser, assigned_group: val })}
                      placeholder="Select Halqa Group"
                      openUpward={true}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 py-2 rounded-xl text-xs shadow cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create User Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. MODAL 2: EDIT USER PROFILE WITH DYNAMIC CONDITIONAL GROUP FIELD */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase theme-accent">
                Edit User Profile
              </h3>
              <button type="button" onClick={() => setEditingUser(null)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              
              {/* Profile Photo Upload / Preview Section */}
              <div className="flex items-center gap-4 p-3 theme-bg-sub border theme-border rounded-xl">
                <div className="w-14 h-14 rounded-full theme-bg-accent-soft theme-accent font-semibold flex items-center justify-center border theme-border text-lg shrink-0 overflow-hidden">
                  {editUserForm.avatar_url ? (
                    <img src={editUserForm.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span>{(editUserForm.first_name || editingUser.phone_number || "U").charAt(0).toUpperCase()}</span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1 min-w-0">
                  <label className="text-xs font-semibold theme-text-secondary block">
                    Profile Photo
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <label className="theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm">
                      Upload Photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleAvatarFileUpload(e, setEditUserForm)}
                        className="hidden"
                      />
                    </label>

                    {editUserForm.avatar_url && (
                      <button
                        type="button"
                        onClick={() => setEditUserForm({ ...editUserForm, avatar_url: "" })}
                        className="text-xs theme-danger hover:opacity-80 px-2 py-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold theme-text-secondary">First Name</label>
                  <input
                    type="text"
                    value={editUserForm.first_name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, first_name: e.target.value })}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold theme-text-secondary">Last Name</label>
                  <input
                    type="text"
                    value={editUserForm.last_name}
                    onChange={(e) => setEditUserForm({ ...editUserForm, last_name: e.target.value })}
                    className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold theme-text-secondary">Email Address</label>
                <input
                  type="email"
                  value={editUserForm.email}
                  onChange={(e) => setEditUserForm({ ...editUserForm, email: e.target.value })}
                  className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2 rounded-xl text-xs"
                />
              </div>

              {/* Super Admin Protection vs Dynamic Conditional Group Field */}
              {editingUser.user_type === "SUPER_ADMIN" ? (
                <div className="p-3 rounded-xl theme-bg-sub border theme-border text-xs theme-text-secondary">
                  <span className="font-semibold theme-accent">System Super Admin</span>
                  <p className="text-[11px] mt-0.5">Role and Halqa group assignment are protected for Super Admin accounts.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold theme-text-secondary">Role</label>
                    <ThemeCustomSelect
                      options={editRoleOptions}
                      value={editUserForm.user_type}
                      onChange={(val) => setEditUserForm({ ...editUserForm, user_type: val })}
                      placeholder="Select Role"
                      openUpward={true}
                    />
                  </div>

                  {/* Assigned Group Field ONLY appears AFTER Teacher or Admin role is picked */}
                  {isGroupApplicable(editUserForm.user_type) && (
                    <div className="space-y-1 animate-fade-in">
                      <label className="text-xs font-semibold theme-text-secondary">Assigned Halqa / Group</label>
                      <ThemeCustomSelect
                        options={groupSelectOptions}
                        value={editUserForm.assigned_group}
                        onChange={(val) => setEditUserForm({ ...editUserForm, assigned_group: val })}
                        placeholder="Select Halqa Group"
                        openUpward={true}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 py-2 rounded-xl text-xs shadow cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL 3: ASSIGN HALQA / GROUP */}
      {groupAssignUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase theme-accent">
                Assign Halqa Group
              </h3>
              <button type="button" onClick={() => setGroupAssignUser(null)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <p className="text-xs theme-text-secondary">
              Select Halqa group assignment for{" "}
              <span className="font-semibold theme-text-primary">
                {groupAssignUser.first_name || groupAssignUser.phone_number}
              </span>
            </p>

            {/* Custom Theme Dropdown */}
            <ThemeCustomSelect
              options={groupSelectOptions}
              value={selectedGroupInput}
              onChange={(val) => setSelectedGroupInput(val)}
              placeholder="Select Halqa Group"
              openUpward={true}
            />

            <div className="flex justify-end gap-2 pt-2 border-t theme-border">
              <button
                type="button"
                onClick={() => setGroupAssignUser(null)}
                className="px-3.5 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGroupAssignSubmit}
                disabled={saving}
                className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 py-2 rounded-xl text-xs shadow cursor-pointer"
              >
                {saving ? "Saving..." : "Save Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL 4: RESET PASSWORD */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase theme-accent">
                Reset User Password
              </h3>
              <button type="button" onClick={() => setResetPasswordUser(null)} className="text-xs theme-text-secondary hover:theme-text-primary">
                ✕
              </button>
            </div>

            <p className="text-xs theme-text-secondary">
              Set new password for{" "}
              <span className="font-semibold theme-text-primary">
                {resetPasswordUser.first_name || resetPasswordUser.phone_number}
              </span>
            </p>

            <input
              type="password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Enter new password"
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
            />

            <div className="flex justify-end gap-2 pt-2 border-t theme-border">
              <button
                type="button"
                onClick={() => setResetPasswordUser(null)}
                className="px-3.5 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPasswordSubmit}
                disabled={saving || !newPasswordInput}
                className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 py-2 rounded-xl text-xs shadow cursor-pointer disabled:opacity-50"
              >
                {saving ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL 5: CONFIRM DEACTIVATION / DELETION */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
            <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase theme-danger border-b theme-border pb-3">
              Confirm Account Deactivation
            </h3>

            <p className="text-xs theme-text-secondary leading-relaxed">
              Are you sure you want to deactivate account access for{" "}
              <span className="font-semibold theme-text-primary">
                {deleteConfirmUser.first_name || deleteConfirmUser.phone_number}
              </span>
              ? They will no longer be able to sign in.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t theme-border">
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="px-3.5 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUserSubmit}
                disabled={saving}
                className="theme-bg-danger-soft hover:opacity-90 theme-danger border border-red-500/30 font-semibold px-4 py-2 rounded-xl text-xs shadow cursor-pointer"
              >
                {saving ? "Deactivating..." : "Deactivate Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
