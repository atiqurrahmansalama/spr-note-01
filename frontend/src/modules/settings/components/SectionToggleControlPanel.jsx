import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
import { useFeatureControl } from "../../../context/FeatureControlContext";
import { getSectionConfig, saveSectionConfig } from "../../../config/defaultSectionConfig";

const DEFAULT_PANEL_CATEGORIES = [
  {
    id: 1,
    key: "header",
    title: "Header & Timestamps",
    sections: [
      { id: 1, section_key: "headerDate", title: "Date & Time Header", description: "Controls visibility of report date & session time selector", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
  {
    id: 2,
    key: "student",
    title: "Student & Group Selection",
    sections: [
      { id: 2, section_key: "studentSelect", title: "Student Selection Input", description: "Controls student search and selection dropdown", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
  {
    id: 3,
    key: "session",
    title: "Session Presets",
    sections: [
      { id: 3, section_key: "sessionSelect", title: "Session Preset Selector", description: "Controls morning/evening session selection", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
  {
    id: 4,
    key: "progress",
    title: "Quran Evaluation & Juz Inputs",
    sections: [
      { id: 4, section_key: "juzPageInput", title: "Juz & Page Range Input", description: "Controls Para, Surah, Page & Line input fields", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
  {
    id: 5,
    key: "details",
    title: "Mistake & Stuck Trackers",
    sections: [
      { id: 5, section_key: "mistakeTracker", title: "Mistake Tracker Section", description: "Controls Galti, Bhool, and Atki counter controls", effective_enabled: true, inheritance_origin: "GLOBAL" },
      { id: 6, section_key: "stuckTracker", title: "Stuck/Pause Tracker Section", description: "Controls stuck evaluation and review flags", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
  {
    id: 6,
    key: "comments",
    title: "Teacher Comments & Notes",
    sections: [
      { id: 7, section_key: "commentSection", title: "Teacher Comment & Presets", description: "Controls teacher comment textarea and quick presets", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
  {
    id: 7,
    key: "actions",
    title: "Export & Action Buttons",
    sections: [
      { id: 8, section_key: "actionButtons", title: "Save & Generate Report", description: "Controls save report, copy card, and PDF export buttons", effective_enabled: true, inheritance_origin: "GLOBAL" },
      { id: 9, section_key: "pdfExport", title: "PDF Download & Printing", description: "Controls PDF generation and print button controls", effective_enabled: true, inheritance_origin: "GLOBAL" },
    ],
  },
];

export default function SectionToggleControlPanel() {
  const { showToast } = useToast();
  const { refetchConfig } = useFeatureControl();

  const [activeScope, setActiveScope] = useState("global"); // 'global' | 'role' | 'group' | 'user' | 'audit'
  const [selectedRole, setSelectedRole] = useState("TEACHER");
  const [selectedGroup, setSelectedGroup] = useState("All Groups");
  const [selectedUser, setSelectedUser] = useState(""); // user id or phone
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);

  // Control Rules Data State
  const [categories, setCategories] = useState([]);  // start empty — no flash of wrong defaults
  const [modifiedFlags, setModifiedFlags] = useState({}); // { [section_key]: boolean }
  const [loading, setLoading] = useState(true);  // start true so we show skeleton until server responds
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [dbRoles, setDbRoles] = useState([]);

  // 1. Fetch available Halqa Groups & Dynamic Roles for Scope Selectors
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetchWithAuth("/api/groups/");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          const groupNames = list.map((g) => (typeof g === "string" ? g : g.name || g.group_name || "General Group"));
          setGroupOptions(Array.from(new Set(["All Groups", ...groupNames])));
        }
      } catch {
        setGroupOptions(["All Groups"]);
      }
    };

    const fetchRoles = async () => {
      try {
        const res = await fetchWithAuth("/api/v1/roles/");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setDbRoles(list);
        }
      } catch {
        setDbRoles([]);
      }
    };

    fetchGroups();
    fetchRoles();
  }, []);

  // 2. Target Identifier Computation based on Scope
  const currentTargetId = useMemo(() => {
    if (activeScope === "role") return selectedRole;
    if (activeScope === "group") return selectedGroup;
    if (activeScope === "user") return selectedUser;
    return "";
  }, [activeScope, selectedRole, selectedGroup, selectedUser]);

  // 3. Fetch Rules for selected scope and target
  const loadRules = useCallback(async () => {
    if (activeScope === "audit") return;
    setLoading(true);
    setModifiedFlags({});
    try {
      let url = `/api/v1/control-panel/rules/?scope=${activeScope}`;
      if (currentTargetId) {
        url += `&target_id=${encodeURIComponent(currentTargetId)}`;
      }

      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        const resCats = Array.isArray(data) ? data : data.categories || [];
        if (resCats.length > 0) {
          setCategories(resCats);
        } else {
          // Fallback: show default panel structure if server returns empty
          setCategories(DEFAULT_PANEL_CATEGORIES);
        }
      } else {
        setCategories(DEFAULT_PANEL_CATEGORIES);
      }
    } catch {
      setCategories(DEFAULT_PANEL_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, [activeScope, currentTargetId]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  // 4. Fetch Audit Logs when Audit tab is active
  const loadAuditLogs = useCallback(async () => {
    if (activeScope !== "audit") return;
    setLoadingLogs(true);
    try {
      const res = await fetchWithAuth("/api/v1/control-panel/audit-logs/");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      showToast("Failed to load audit logs", "error");
    } finally {
      setLoadingLogs(false);
    }
  }, [activeScope, showToast]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

  // 5. User Search Auto-complete for User Scope
  useEffect(() => {
    if (activeScope !== "user" || !userSearchQuery.trim()) {
      setUserSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchWithAuth(`/api/users/?search=${encodeURIComponent(userSearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.results || [];
          setUserSearchResults(list.slice(0, 5));
        }
      } catch {
        setUserSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [activeScope, userSearchQuery]);

  // Handle Toggle Switch Change
  const handleToggle = (sectionKey, currentEffectiveVal) => {
    const nextVal = modifiedFlags[sectionKey] !== undefined ? !modifiedFlags[sectionKey] : !currentEffectiveVal;
    setModifiedFlags((prev) => ({
      ...prev,
      [sectionKey]: nextVal,
    }));
  };

  // Save Batch Updates
  const handleSaveBatch = async () => {
    const keys = Object.keys(modifiedFlags);
    if (keys.length === 0) {
      showToast("No flag changes to save.", "info");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        scope_type: activeScope.toUpperCase(),
        scope: activeScope,
        target_identifier: currentTargetId,
        target_id: currentTargetId,
        updates: keys.map((k) => ({
          section_key: k,
          is_enabled: modifiedFlags[k],
        })),
      };

      let res = await fetchWithAuth("/api/v1/admin/section-control/update/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        res = await fetchWithAuth("/api/v1/control-panel/rules/batch-update/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const data = await res.json();
        showToast(data.message || "Section rules saved successfully!", "success");

        if (activeScope === "global") {
          try {
            const currentLocal = getSectionConfig();
            const updatedLocal = { ...currentLocal };
            keys.forEach((k) => {
              updatedLocal[k] = { ...updatedLocal[k], enabled: modifiedFlags[k] };
            });
            saveSectionConfig(updatedLocal);
            window.dispatchEvent(new CustomEvent("spr_section_config_updated", { detail: updatedLocal }));
          } catch {}
        } else {
          window.dispatchEvent(new CustomEvent("spr_section_config_updated"));
        }

        // Broadcast to all active browser tabs
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("spr_section_control_channel");
            bc.postMessage({ type: "SECTION_CONTROL_UPDATED", timestamp: Date.now() });
            bc.close();
          }
        } catch {}

        setModifiedFlags({});
        refetchConfig();
        loadRules();
      } else {
        showToast("Failed to save section rule updates.", "error");
      }
    } catch {
      showToast("Error updating rules on server.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Reset Overrides back to defaults
  const handleResetOverrides = async () => {
    if (activeScope === "global") {
      showToast("Global defaults cannot be reset. Modify individual flags instead.", "warning");
      return;
    }

    if (!window.confirm(`Reset all ${activeScope.toUpperCase()} overrides for "${currentTargetId}" back to default defaults?`)) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetchWithAuth("/api/v1/control-panel/rules/reset/", {
        method: "POST",
        body: JSON.stringify({ scope: activeScope, target_id: currentTargetId }),
      });

      if (res.ok) {
        showToast(`Reset ${activeScope.toUpperCase()} overrides back to default`, "success");
        setModifiedFlags({});
        window.dispatchEvent(new CustomEvent("spr_section_config_updated"));
        refetchConfig();
        loadRules();
      } else {
        showToast("Failed to reset section overrides", "error");
      }
    } catch {
      showToast("Error resetting overrides on server", "error");
    } finally {
      setResetting(false);
    }
  };

  // Force-apply Global Default to ALL accounts by clearing conflicting Role & User overrides
  const handleClearOverridesGlobally = async () => {
    const targetKeys = Object.keys(modifiedFlags);
    if (targetKeys.length === 0) {
      showToast("Toggle sections first, then click this to force-apply globally.", "info");
      return;
    }
    if (!window.confirm(
      `This will SAVE the current Global changes AND delete all Role/User overrides for:\n\n${targetKeys.join(", ")}\n\nAll accounts will immediately inherit the new Global defaults. Proceed?`
    )) return;

    setSaving(true);
    try {
      // 1. Save the Global Default changes first (with cascade_clear_overrides=true)
      const payload = {
        scope_type: "GLOBAL",
        scope: "global",
        cascade_clear_overrides: true,
        updates: targetKeys.map((k) => ({ section_key: k, is_enabled: modifiedFlags[k] })),
      };

      const res = await fetchWithAuth("/api/v1/admin/section-control/update/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const clearedCount = data.cleared_overrides ?? 0;
        showToast(
          clearedCount > 0
            ? `Saved & cleared ${clearedCount} conflicting override(s). All accounts now use Global Defaults!`
            : `Global defaults saved. No conflicting overrides found.`,
          "success"
        );
        setModifiedFlags({});

        // Broadcast to all open tabs
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("spr_section_control_channel");
            bc.postMessage({ type: "SECTION_CONTROL_UPDATED", timestamp: Date.now() });
            bc.close();
          }
        } catch {}

        window.dispatchEvent(new CustomEvent("spr_section_config_updated"));
        refetchConfig();
        loadRules();
      } else {
        showToast("Failed to force-apply global defaults.", "error");
      }
    } catch {
      showToast("Error applying global defaults across all accounts.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Render Origin Inheritance Badges
  const renderOriginBadge = (origin) => {
    switch (origin) {
      case "USER":
        return (
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            User Override
          </span>
        );
      case "GROUP":
        return (
          <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Group Override
          </span>
        );
      case "ROLE":
        return (
          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Role Override
          </span>
        );
      default:
        return (
          <span className="theme-bg-sub border theme-border theme-text-secondary text-[10px] font-mono px-2 py-0.5 rounded-md font-medium inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Global Default
          </span>
        );
    }
  };

  const modifiedCount = Object.keys(modifiedFlags).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 font-sans theme-text-primary animate-fade-in p-2 sm:p-4 select-none">
      
      {/* 1. CONTROL PANEL ENTERPRISE HEADER */}
      <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight theme-text-primary flex items-center gap-2.5">
            <svg className="w-5 h-5 theme-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Feature Flagging & Section Control Panel</span>
          </h1>
          <p className="text-xs theme-text-secondary mt-1">
            Enterprise 4-Tier Precedence Evaluation System (User Override &gt; Group Override &gt; Role Override &gt; Global Default).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeScope === "global" && modifiedCount > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={handleClearOverridesGlobally}
              title="Save Global changes AND delete all conflicting Role/User overrides, so every account inherits the new default immediately."
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {saving ? "Applying..." : "Force Apply to All Accounts"}
            </button>
          )}

          {activeScope !== "global" && activeScope !== "audit" && (
            <button
              type="button"
              disabled={resetting}
              onClick={handleResetOverrides}
              className="px-3 py-2 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary transition-colors cursor-pointer disabled:opacity-50"
            >
              {resetting ? "Resetting..." : "Reset Scope Overrides"}
            </button>
          )}

          {activeScope !== "audit" && (
            <button
              type="button"
              disabled={saving || modifiedCount === 0}
              onClick={handleSaveBatch}
              className="theme-bg-accent hover:opacity-90 theme-accent-text font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{saving ? "Saving..." : `Save Changes ${modifiedCount > 0 ? `(${modifiedCount})` : ""}`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 4-TIER SCOPE SELECTOR TABS */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 scrollbar-none border-b theme-border">
        <div className="flex items-center gap-2">
          {[
            { id: "global", label: "Global Defaults", icon: "🌐" },
            { id: "role", label: "Role Overrides", icon: "🛡️" },
            { id: "group", label: "Group / Halqa Overrides", icon: "👥" },
            { id: "user", label: "User Overrides", icon: "👤" },
            { id: "audit", label: "Audit Logs", icon: "📜" },
          ].map((tab) => {
            const isActive = activeScope === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveScope(tab.id);
                  setModifiedFlags({});
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all cursor-pointer whitespace-nowrap border-t border-x ${
                  isActive
                    ? "theme-bg-surface theme-text-primary border-t-[var(--accent-main)] theme-border shadow-sm border-b-transparent"
                    : "theme-bg-sub theme-text-secondary hover:theme-text-primary theme-border border-b-theme-border"
                }`}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeScope !== "audit" && (
          <div className="relative w-64 hidden sm:block">
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search section keys..."
              className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
            />
          </div>
        )}
      </div>

      {/* 3. DYNAMIC TARGET SELECTOR SUB-BAR */}
      {activeScope === "role" && (
        <div className="p-4 theme-bg-surface border theme-border rounded-xl flex items-center gap-3">
          <span className="text-xs font-semibold theme-text-secondary shrink-0">Target Role:</span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {(dbRoles.length > 0
              ? dbRoles.map((r) => ({ id: r.code, label: `${r.code} (${r.name})` }))
              : [
                  { id: "TEACHER", label: "TEACHER (Teacher / Ustadh)" },
                  { id: "GUARDIAN", label: "GUARDIAN (Guardian / Parent)" },
                  { id: "ADMIN", label: "ADMIN (Admin / Nazim)" },
                  { id: "SUPER_ADMIN", label: "SUPER_ADMIN (Super Admin)" },
                ]
            ).map((roleObj) => (
              <button
                key={roleObj.id}
                type="button"
                onClick={() => setSelectedRole(roleObj.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer border whitespace-nowrap ${
                  selectedRole === roleObj.id
                    ? "theme-bg-accent theme-accent-text border-transparent shadow-sm"
                    : "theme-bg-sub theme-text-secondary hover:theme-text-primary theme-border"
                }`}
              >
                {roleObj.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeScope === "group" && (
        <div className="p-4 theme-bg-surface border theme-border rounded-xl flex items-center gap-3">
          <span className="text-xs font-semibold theme-text-secondary">Target Halqa Group:</span>
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-xl text-xs focus:outline-none"
          >
            {groupOptions.map((grp) => (
              <option key={grp} value={grp}>
                {grp}
              </option>
            ))}
          </select>
        </div>
      )}

      {activeScope === "user" && (
        <div className="p-4 theme-bg-surface border theme-border rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="text-xs font-semibold theme-text-secondary whitespace-nowrap">Target User Search:</span>
            
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search user by phone or name..."
                className="w-full theme-bg-sub border theme-border theme-text-primary px-3 py-1.5 rounded-xl text-xs focus:outline-none focus:border-[var(--accent-main)]/50"
              />

              {userSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 theme-bg-surface border theme-border rounded-xl shadow-2xl z-50 p-1 space-y-0.5 text-xs">
                  {userSearchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(String(u.id));
                        setUserSearchQuery(`${u.first_name || u.phone_number} (ID: ${u.id})`);
                        setUserSearchResults([]);
                      }}
                      className="w-full px-3 py-2 rounded-lg text-left hover:theme-bg-elevated theme-text-primary transition-colors flex items-center justify-between"
                    >
                      <span className="font-semibold">{u.first_name || "User"} ({u.phone_number})</span>
                      <span className="theme-text-secondary font-mono text-[10px]">ID #{u.id}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <span className="text-xs font-mono theme-accent font-bold">
                Selected User ID: #{selectedUser}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 4. AUDIT LOG VIEW TAB */}
      {activeScope === "audit" ? (
        <div className="theme-bg-surface border theme-border rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <h2 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
              Feature Flag Change Audit Trail
            </h2>
            <button
              type="button"
              onClick={loadAuditLogs}
              className="text-xs font-semibold px-3 py-1 rounded-lg theme-bg-sub border theme-border hover:theme-bg-elevated transition-colors"
            >
              Refresh Logs
            </button>
          </div>

          {loadingLogs ? (
            <div className="py-8 text-center text-xs theme-text-secondary animate-pulse">
              Loading audit log records...
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs theme-text-secondary italic">
              No audit log changes recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="theme-bg-sub border-b theme-border text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                    <th className="py-2.5 px-3">TIMESTAMP</th>
                    <th className="py-2.5 px-3">CHANGED BY</th>
                    <th className="py-2.5 px-3">SCOPE</th>
                    <th className="py-2.5 px-3">TARGET</th>
                    <th className="py-2.5 px-3">SECTION KEY</th>
                    <th className="py-2.5 px-3">CHANGE</th>
                  </tr>
                </thead>
                <tbody className="border-t theme-border divide-y theme-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:theme-bg-elevated transition-colors font-mono">
                      <td className="py-2.5 px-3 theme-text-secondary whitespace-nowrap">{log.timestamp}</td>
                      <td className="py-2.5 px-3 theme-text-primary font-semibold">{log.changed_by}</td>
                      <td className="py-2.5 px-3">
                        <span className="theme-bg-sub border theme-border px-2 py-0.5 rounded text-[10px]">
                          {log.scope_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 theme-text-primary">{log.target_identifier}</td>
                      <td className="py-2.5 px-3 theme-accent font-bold">{log.section_key}</td>
                      <td className="py-2.5 px-3 font-semibold">
                        <span className={log.previous_state ? "text-emerald-400" : "text-zinc-500"}>
                          {String(log.previous_state)}
                        </span>
                        <span className="theme-text-secondary mx-1">&rarr;</span>
                        <span className={log.new_state ? "text-emerald-400" : "text-red-400"}>
                          {String(log.new_state)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* 5. MAIN FEATURE SECTION RULES GRID */
        <div className="space-y-6">
          {loading ? (
            <div className="p-8 theme-bg-surface border theme-border rounded-2xl space-y-4 animate-pulse">
              <div className="h-6 theme-bg-sub rounded-lg w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-20 theme-bg-sub rounded-xl" />
                <div className="h-20 theme-bg-sub rounded-xl" />
              </div>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-8 theme-bg-surface border theme-border rounded-2xl text-center text-xs theme-text-secondary">
              No categories or section rules found for the selected scope.
            </div>
          ) : (
            categories.map((cat) => {
              const filteredSections = cat.sections.filter((sec) => {
                if (!searchFilter.trim()) return true;
                const search = searchFilter.toLowerCase();
                return (
                  sec.section_key.toLowerCase().includes(search) ||
                  sec.title.toLowerCase().includes(search) ||
                  sec.description.toLowerCase().includes(search)
                );
              });

              if (filteredSections.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary px-1 flex items-center justify-between">
                    <span>{cat.title}</span>
                    <span className="font-mono text-[10px] theme-accent opacity-80">
                      Category Key: {cat.key}
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredSections.map((sec) => {
                      const hasLocalMod = modifiedFlags[sec.section_key] !== undefined;
                      const activeValue = hasLocalMod ? modifiedFlags[sec.section_key] : sec.effective_enabled;

                      return (
                        <div
                          key={sec.id}
                          onClick={() => handleToggle(sec.section_key, activeValue)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-4 ${
                            activeValue
                              ? "theme-bg-surface border-[var(--accent-main)]/50 shadow-sm"
                              : "theme-bg-sub border-transparent opacity-60 hover:opacity-80"
                          } ${hasLocalMod ? "ring-2 ring-[var(--accent-main)]/70" : ""}`}
                        >
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold theme-text-primary truncate">
                                {sec.title}
                              </span>
                              {renderOriginBadge(sec.inheritance_origin)}
                              {hasLocalMod && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold">
                                  Unsaved
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] theme-text-secondary leading-snug">
                              {sec.description || "No description provided."}
                            </p>

                            <p className="text-[10px] font-mono theme-text-secondary opacity-70">
                              Key: <span className="theme-accent font-semibold">{sec.section_key}</span>
                            </p>
                          </div>

                          {/* Custom Styled Switch Control */}
                          <div
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                              activeValue ? "theme-bg-accent justify-end" : "bg-zinc-700 justify-start"
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
