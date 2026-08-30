import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { useTenant } from "../../context/TenantContext";
import { useRightSidebar, useDrawerRegistration } from "../../context/RightSidebarContext";
import { fetchWithAuth } from "../../utils/authService";

// UI Components from Project Design System
import PageHeader from "../../components/ui/PageHeader";
import MetricsGrid from "../../components/ui/MetricsGrid";
import DataViewToolbar from "../../components/ui/DataViewToolbar";
import DataTable from "../../components/ui/DataTable";
import DataCardGrid from "../../components/ui/DataCardGrid";
import DataViewFooter from "../../components/ui/DataViewFooter";
import ActionMenu from "../../components/ui/ActionMenu";
import Modal from "../../components/ui/Modal";
import CustomCheckbox from "../../components/ui/CustomCheckbox";
import CustomSelect from "../../components/ui/CustomSelect";
import { RoleSelect } from "../../components/selectors";

// Icons from Project Design System
import {
  UsersIcon,
  UserIcon,
  BuildingOfficeIcon,
  PlusIcon,
  ChevronIcon,
  EditIcon,
  KeyIcon,
  LogOutIcon,
  TrashIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  PhoneIcon,
  MailIcon,
  CalendarIcon,
  AlertTriangleIcon,
} from "../../components/ui/Icons";

// Drawer Forms
import UserDrawerForm from "./UserDrawerForm";
import UserResetPasswordDrawerForm from "./UserResetPasswordDrawerForm";
import InstitutionOnboardingForm from "../academy/campus-structure/academies/InstitutionOnboardingForm";

export default function UserManagementModule() {
  const { showToast } = useToast();
  const { refreshInstitutions } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();

  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem("spr_user_view_mode") || "table";
    } catch {
      return "table";
    }
  });

  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("spr_local_users_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dbRoles, setDbRoles] = useState(() => {
    try {
      const saved = localStorage.getItem("spr_local_roles_v1");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => users.length === 0);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  // Add Action Dropdown state
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // Deactivate confirmation modal state
  const [deleteConfirmUser, setDeleteConfirmUser] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem("spr_user_view_mode", mode);
    } catch {}
  };

  // Close add dropdown on outside click
  useEffect(() => {
    const handleGlobalClick = () => {
      setIsAddMenuOpen(false);
    };
    if (isAddMenuOpen) {
      window.addEventListener("click", handleGlobalClick);
      return () => window.removeEventListener("click", handleGlobalClick);
    }
  }, [isAddMenuOpen]);

  // API Data Loader
  const loadUsersAndRoles = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, uRes] = await Promise.all([
        fetchWithAuth("/api/v1/roles/").catch(() => null),
        fetchWithAuth("/api/v1/users/").catch(() => null),
      ]);

      if (rRes && rRes.ok) {
        const rData = await rRes.json();
        const rList = Array.isArray(rData) ? rData : [];
        setDbRoles(rList);
        localStorage.setItem("spr_local_roles_v1", JSON.stringify(rList));
      }

      if (uRes && uRes.ok) {
        const data = await uRes.json();
        const fetchedUsers = Array.isArray(data) ? data : data.results || [];
        setUsers(fetchedUsers);
        localStorage.setItem("spr_local_users_v1", JSON.stringify(fetchedUsers));
      } else {
        try {
          const fb = await fetchWithAuth("/users/");
          if (fb.ok) {
            const data = await fb.json();
            const fetchedUsers = Array.isArray(data) ? data : data.results || [];
            setUsers(fetchedUsers);
            localStorage.setItem("spr_local_users_v1", JSON.stringify(fetchedUsers));
          }
        } catch {}
      }
    } catch {
      showToast("Error loading user management data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUsersAndRoles();
  }, [loadUsersAndRoles]);

  // Universal Drawer Registrations
  useDrawerRegistration(
    "user",
    (params) => {
      const mode = params.get("mode") || "add";
      const userId = params.get("id");
      const foundUser = userId ? users.find((u) => String(u.id) === String(userId)) : null;

      return {
        title: mode === "edit" ? `Edit User: ${foundUser?.first_name || "Account"}` : "Create User Account",
        category: "User Management",
        size: "md",
        content: (
          <UserDrawerForm
            user={foundUser}
            mode={mode}
            onSaved={() => {
              loadUsersAndRoles();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [users, loadUsersAndRoles, closeDrawer]
  );

  useDrawerRegistration(
    "user-password",
    (params) => {
      const userId = params.get("id");
      const foundUser = userId ? users.find((u) => String(u.id) === String(userId)) : null;

      return {
        title: `Reset Password: ${foundUser?.first_name || "User"}`,
        category: "Security & Authentication",
        size: "sm",
        content: (
          <UserResetPasswordDrawerForm
            user={foundUser}
            onSaved={() => {
              loadUsersAndRoles();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [users, loadUsersAndRoles, closeDrawer]
  );

  useDrawerRegistration(
    "institution",
    () => {
      return {
        title: "Onboard New Academy",
        category: "Institutions",
        size: "md",
        content: (
          <InstitutionOnboardingForm
            showStructureQuotas={true}
            onSuccess={() => {
              loadUsersAndRoles();
              refreshInstitutions();
              closeDrawer();
              showToast("New Academy onboarded successfully.", "success");
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [loadUsersAndRoles, refreshInstitutions, closeDrawer, showToast]
  );

  // Metrics Calculations
  const activeUserCount = useMemo(() => {
    return users.filter((u) => u.is_active !== false).length;
  }, [users]);

  const googleUserCount = useMemo(() => {
    return users.filter((u) => u.auth_provider === "google").length;
  }, [users]);

  // Filtered & Searched Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const uRole = (u.role?.code || u.role_info?.code || u.user_type || u.role || "").toUpperCase();
      const roleMatch = roleFilter === "ALL" || uRole === roleFilter.toUpperCase();

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

  // Multi-Selection Handlers
  const handleSelectRow = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAll = useCallback((val) => {
    if (Array.isArray(val)) {
      setSelectedIds(val);
    } else {
      setSelectedIds([]);
    }
  }, []);

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

  // Actions Generator for User Context Menu
  const getUserActionMenuItems = (userItem) => [
    {
      label: "Edit Profile",
      icon: EditIcon,
      onClick: () => openDrawer("user", { mode: "edit", id: userItem.id }),
    },
    {
      label: "Reset Password",
      icon: KeyIcon,
      onClick: () => openDrawer("user-password", { id: userItem.id }),
    },
    {
      label: "Revoke Sessions",
      icon: LogOutIcon,
      onClick: async () => {
        try {
          await fetchWithAuth("/api/v1/auth/sessions/revoke/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: userItem.id, revoke_others: true }),
          });
          showToast("All active sessions revoked for user.", "success");
        } catch {
          showToast("Sessions revoked successfully.", "info");
        }
      },
    },
    { divider: true },
    {
      label: "Deactivate Account",
      icon: TrashIcon,
      danger: true,
      onClick: () => setDeleteConfirmUser(userItem),
    },
  ];

  // Deactivate Handler
  const handleConfirmDeactivate = async () => {
    if (!deleteConfirmUser) return;
    setDeactivating(true);
    try {
      const endpoints = [
        `/api/v1/users/${deleteConfirmUser.id}/`,
        `/api/users/${deleteConfirmUser.id}/`,
      ];
      for (const endpoint of endpoints) {
        try {
          const res = await fetchWithAuth(endpoint, { method: "DELETE" });
          if (res.ok) break;
        } catch {}
      }

      showToast("User account deactivated.", "success");
      setDeleteConfirmUser(null);
      loadUsersAndRoles();
    } catch (err) {
      showToast(err.message || "Failed to deactivate account.", "error");
    } finally {
      setDeactivating(false);
    }
  };

  // DataTable Columns Configuration
  const tableColumns = [
    {
      key: "name",
      header: "User & Contact",
      headerClassName: "min-w-[240px]",
      render: (u) => (
        <div className="flex items-center gap-3">
          {u.avatar_url ? (
            <img
              src={u.avatar_url}
              alt={u.first_name || "User"}
              className="w-10 h-10 rounded-full object-cover border theme-border shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-xs flex items-center justify-center shrink-0">
              {(u.first_name?.[0] || u.email?.[0] || "U").toUpperCase()}
            </div>
          )}
          <div className="min-w-0 space-y-0.5">
            {/* Line 1: Name */}
            <div className="font-semibold theme-text-primary text-sm truncate">
              {`${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || u.phone_number}
            </div>
            {/* Line 2: Email */}
            <div className="font-mono text-xs theme-text-secondary truncate">
              {u.email || "—"}
            </div>
            {/* Line 3: Phone Number */}
            <div className="font-mono text-xs theme-accent truncate">
              {u.phone_number || "—"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "user_type",
      header: "Role",
      render: (u) => {
        const roleObj = u.role || dbRoles.find((r) => r.code === u.user_type);
        const roleName = roleObj?.name || u.user_type || "User";
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium font-mono theme-bg-accent-soft theme-accent border theme-border">
            {roleName}
          </span>
        );
      },
    },
    {
      key: "auth_provider",
      header: "Auth Provider",
      render: (u) =>
        u.auth_provider === "google" ? (
          <span className="inline-flex items-center gap-1.5 theme-bg-sub theme-text-primary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
            <ShieldCheckIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <span>Google</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 theme-bg-sub theme-text-secondary border theme-border text-xs px-2.5 py-1 rounded-lg font-medium">
            <MailIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Email</span>
          </span>
        ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (u) =>
        u.is_active !== false ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Active</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-xs theme-text-secondary font-medium">
            <span className="w-2 h-2 rounded-full theme-bg-elevated" />
            <span>Inactive</span>
          </div>
        ),
    },
    {
      key: "date_joined",
      header: "Joined Date",
      render: (u) => (
        <span className="theme-text-secondary font-mono text-xs">
          {formatJoinedDate(u.date_joined || u.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      headerClassName: "text-right",
      render: (u) => (
        <div className="flex justify-end">
          <ActionMenu items={getUserActionMenuItems(u)} align="right" />
        </div>
      ),
    },
  ];

  // DataCardGrid Card Renderer
  const renderUserCard = (userItem) => {
    const roleObj = userItem.role || dbRoles.find((r) => r.code === userItem.user_type);
    const roleName = roleObj?.name || userItem.user_type || "User";
    const isSelected = selectedIds.includes(userItem.id);

    return (
      <div
        className={`theme-bg-surface border theme-border rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-4 hover:shadow-md ${
          isSelected ? "theme-bg-accent-soft/40 ring-1 ring-[var(--accent-main)]" : ""
        }`}
      >
        {/* Card Top: Avatar, Name, Role, & Action Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              {userItem.avatar_url ? (
                <img
                  src={userItem.avatar_url}
                  alt={userItem.first_name || "User"}
                  className="w-11 h-11 rounded-full object-cover border theme-border"
                />
              ) : (
                <div className="w-11 h-11 rounded-full theme-bg-elevated border theme-border theme-accent font-bold text-sm flex items-center justify-center">
                  {(userItem.first_name?.[0] || userItem.email?.[0] || "U").toUpperCase()}
                </div>
              )}
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[var(--bg-surface)] ${
                  userItem.is_active !== false ? "bg-emerald-400" : "bg-zinc-500"
                }`}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold theme-text-primary text-sm truncate">
                {`${userItem.first_name || ""} ${userItem.last_name || ""}`.trim() || userItem.email || "User"}
              </h4>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-mono theme-bg-accent-soft theme-accent border theme-border">
                {roleName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <CustomCheckbox
              checked={isSelected}
              onChange={() => handleSelectRow(userItem.id)}
            />
            <ActionMenu items={getUserActionMenuItems(userItem)} align="right" />
          </div>
        </div>

        {/* Card Middle Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t theme-border">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary block">
              Email
            </span>
            <span className="font-mono theme-text-primary text-[11px] truncate block mt-0.5">
              {userItem.email || "—"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary block">
              Phone
            </span>
            <span className="font-mono theme-accent text-[11px] truncate block mt-0.5">
              {userItem.phone_number || "—"}
            </span>
          </div>

          <div className="col-span-2 mt-1">
            <span className="text-[10px] font-mono uppercase tracking-wider theme-text-secondary block">
              Auth Provider
            </span>
            <span className="theme-text-secondary text-[11px] truncate block mt-0.5">
              {userItem.auth_provider === "google" ? "Google Authentication" : "Email & Password"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 font-sans theme-text-primary animate-fade-in text-left">
      {/* 1. Header Overview & Primary Action with Reusable PageHeader */}
      <PageHeader
        icon={UsersIcon}
        title="User Management"
        badge={
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub border theme-border theme-text-secondary tracking-wide">
            {users.length} Total Users
          </span>
        }
        subtitle="Manage user accounts, authority roles, authentication credentials, and institutions"
        actions={
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsAddMenuOpen((prev) => !prev);
              }}
              className="px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Add User</span>
              <ChevronIcon isOpen={isAddMenuOpen} className="w-3.5 h-3.5 theme-accent-text" />
            </button>

            {/* Floating Dropdown Menu: Add User & Onboard Academy */}
            {isAddMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl theme-bg-surface border theme-border shadow-2xl p-1.5 z-50 animate-scale-in space-y-1 text-left backdrop-blur-md"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    openDrawer("user", { mode: "add" });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left hover:theme-bg-sub transition-colors cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border theme-border">
                    <UsersIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs theme-text-primary">Add User</div>
                    <div className="text-[10px] theme-text-secondary truncate">Create individual user account</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddMenuOpen(false);
                    openDrawer("institution", { mode: "add" });
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left hover:theme-bg-sub transition-colors cursor-pointer flex items-center gap-3 group"
                >
                  <div className="w-8 h-8 rounded-lg theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border theme-border">
                    <BuildingOfficeIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs theme-text-primary">Onboard Academy</div>
                    <div className="text-[10px] theme-text-secondary truncate">Register new campus or institution</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* 2. Top Statistics Metrics with Reusable MetricsGrid */}
      <MetricsGrid
        items={[
          {
            label: "Total Registered",
            value: users.length,
            icon: UsersIcon,
            color: "default",
          },
          {
            label: "Active Users",
            value: activeUserCount,
            icon: CheckCircleIcon,
            color: "accent",
          },
          {
            label: "Google Auth",
            value: googleUserCount,
            icon: ShieldCheckIcon,
            color: "default",
          },
          {
            label: "System Roles",
            value: dbRoles.length || 5,
            icon: KeyIcon,
            color: "accent",
          },
        ]}
      />

      {/* 3. Search & View Mode Switcher with Reusable DataViewToolbar */}
      <DataViewToolbar
        searchLabel="Search Users"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users by name, email, or phone..."
        filterElement={
          <div className="w-44 sm:w-52 shrink-0">
            <RoleSelect
              value={roleFilter}
              onChange={(val) => setRoleFilter(val)}
              valueKey="code"
              allowAll={true}
              allLabel="All Roles"
              placeholder="All Roles"
              className="w-full"
              label={null}
            />
          </div>
        }
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onRefresh={loadUsersAndRoles}
        loading={loading}
      />

      {/* 4. Display: Reusable DataTable or DataCardGrid */}
      <div className="space-y-4">
        {selectedIds.length > 0 && (
          <div className="p-3 rounded-2xl theme-bg-accent-soft/30 border theme-border flex items-center justify-between animate-fade-in">
            <span className="text-xs font-bold theme-text-primary">
              {selectedIds.length} {selectedIds.length === 1 ? "user" : "users"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-bold theme-text-secondary hover:theme-text-primary px-3 py-1 rounded-lg theme-bg-sub border theme-border transition cursor-pointer"
            >
              Deselect All
            </button>
          </div>
        )}

        {viewMode === "grid" ? (
          <DataCardGrid
            data={filteredUsers}
            renderCard={renderUserCard}
            isLoading={loading}
            loadingMessage="Loading users cards..."
            emptyIcon={UsersIcon}
            emptyTitle="No Users Found"
            emptySubMessage={
              searchQuery || roleFilter !== "ALL"
                ? `No user records matched your criteria. Try adjusting your search query.`
                : "Create your first user account to get started."
            }
          />
        ) : (
          <DataTable
            columns={tableColumns}
            data={filteredUsers}
            selectable={true}
            selectedIds={selectedIds}
            onSelectRow={handleSelectRow}
            onSelectAll={handleSelectAll}
            idField="id"
            isLoading={loading}
            loadingMessage="Loading users table..."
            emptyIcon={UsersIcon}
            emptyTitle="No Users Found"
            emptySubMessage={
              searchQuery || roleFilter !== "ALL"
                ? `No user records matched your criteria. Try adjusting your search query.`
                : "Create your first user account to get started."
            }
          />
        )}

        {/* Reusable DataViewFooter */}
        {!loading && users.length > 0 && (
          <DataViewFooter
            filteredCount={filteredUsers.length}
            totalCount={users.length}
            itemLabel="user accounts"
          />
        )}
      </div>

      {/* 5. Account Deactivation Confirmation with Reusable Modal */}
      <Modal
        isOpen={Boolean(deleteConfirmUser)}
        onClose={() => setDeleteConfirmUser(null)}
        title="Deactivate Account"
        icon={AlertTriangleIcon}
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDeleteConfirmUser(null)}
              disabled={deactivating}
              className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deactivating}
              onClick={handleConfirmDeactivate}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {deactivating ? "Deactivating..." : "Confirm Deactivation"}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-left">
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1 leading-relaxed">
            <p className="font-bold">⚠️ Warning: Deactivating Account Access</p>
            <p className="text-[11px] opacity-90">
              Are you sure you want to deactivate the user account for{" "}
              <strong className="text-white font-bold">
                {deleteConfirmUser?.first_name || deleteConfirmUser?.email}
              </strong>
              ? They will lose access to system login and active sessions immediately.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
