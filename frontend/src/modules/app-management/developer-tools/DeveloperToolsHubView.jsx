import React, { useState, useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import SettingsSplitLayout from "../../../components/common/SettingsSplitLayout";
import CompactTaxonomyManager from "../../../components/common/CompactTaxonomyManager";
import {
  BuildingOfficeIcon,
  SparklesIcon,
  CalendarIcon,
  ChecklistIcon,
  RefreshIcon,
  CheckCircleIcon,
  TrashIcon,
} from "../../../components/ui/Icons";
import {
  getInstitutionCategories,
  createInstitutionCategory,
  updateInstitutionCategory,
  deleteInstitutionCategory,
} from "../../../api/institutions";
import {
  calendarEventTypesStore,
  calendarEventKindsStore,
  calendarImpactScopesStore,
} from "../../../utils/localStore";
import { APP_VERSION, APP_BUILD_DATE, APP_BUILD_TIME } from "../../../constants/version";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";

const SECTIONS = [
  {
    id: "categories",
    title: "Academy Categories",
    description: "Manage institution types, curriculum categories, and taxonomies",
    icon: BuildingOfficeIcon,
  },
  {
    id: "event-types",
    title: "Schedule & Event Types",
    description: "Manage pre-configured schedule titles, exam types, and calendar events",
    icon: CalendarIcon,
  },
  {
    id: "impact-scopes",
    title: "System Impact Scopes",
    description: "Configure system modules affected by calendar events (Attendance, Notifications, etc.)",
    icon: ChecklistIcon,
  },
  {
    id: "system",
    title: "System & Environment",
    description: "Platform version, environment diagnostics, and local cache manager",
    icon: SparklesIcon,
  },
];

export default function DeveloperToolsHubView() {
  const { showToast } = useToast();
  const { activeTenantId, isMultiTenantAdmin } = useTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const [eventKinds, setEventKinds] = useState(() => calendarEventKindsStore.getKinds(activeTenantId));

  useEffect(() => {
    const handleKindsUpdated = () => {
      setEventKinds(calendarEventKindsStore.getKinds(activeTenantId));
    };
    window.addEventListener("spr_calendar_event_kinds_updated", handleKindsUpdated);
    return () => window.removeEventListener("spr_calendar_event_kinds_updated", handleKindsUpdated);
  }, [activeTenantId]);

  const activeSection = searchParams.get("tab") || "categories";

  const handleSectionChange = (sectionId) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", sectionId);
        return next;
      },
      { replace: true }
    );
  };

  const handleClearCache = () => {
    if (window.confirm("Are you sure you want to clear local cache and temporary session data?")) {
      try {
        const preserveKeys = ["spr_auth_token", "spr_user_profile", "spr_tenant_id", "spr_theme_mode"];
        const toRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && !preserveKeys.includes(k) && !k.startsWith("spr_tenant_")) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();
        showToast("Local application cache cleared successfully!", "success");
      } catch (err) {
        showToast("Failed to clear cache", "error");
      }
    }
  };

  return (
    <SettingsSplitLayout
      title="Developer & System Tools"
      subtitle="Configure low-level system taxonomies, academy categories, calendar presets, and runtime diagnostics."
      headerIcon={SparklesIcon}
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      <div className="w-full">
        {/* Section 1: Academy Categories */}
        {activeSection === "categories" && (
          <CompactTaxonomyManager
            title="Academy Categories"
            description="Manage institution types, curriculum models, and structural taxonomy divisions."
            fetchItems={getInstitutionCategories}
            createItem={createInstitutionCategory}
            updateItem={updateInstitutionCategory}
            deleteItem={deleteInstitutionCategory}
            itemTypeName="Category"
            icon={BuildingOfficeIcon}
          />
        )}

        {/* Section 2: Schedule & Event Types */}
        {activeSection === "event-types" && (
          <CompactTaxonomyManager
            title="Schedule & Event Types"
            description="Pre-configured event titles and schedule categories available in the Calendar & Events picker dropdown."
            fetchItems={async () => calendarEventTypesStore.getEventTypes(activeTenantId)}
            createItem={async (payload) => calendarEventTypesStore.addEventType(activeTenantId, payload)}
            updateItem={async (id, payload) => calendarEventTypesStore.updateEventType(activeTenantId, id, payload)}
            deleteItem={async (id) => calendarEventTypesStore.deleteEventType(activeTenantId, id)}
            itemTypeName="Event Type"
            typeOptions={eventKinds}
            typeLabel="Event Type"
            hideStatus={true}
            icon={CalendarIcon}
          />
        )}

        {/* Section 3: System Impact Scopes */}
        {activeSection === "impact-scopes" && (
          <CompactTaxonomyManager
            title="System Impact Scopes"
            description="Manage integration modules and services affected by calendar schedules & events (e.g. Attendance, Push Notifications, Daily Routine, etc.)."
            fetchItems={async () => calendarImpactScopesStore.getScopes(activeTenantId)}
            createItem={async (payload) => calendarImpactScopesStore.addScope(activeTenantId, payload)}
            updateItem={async (id, payload) => calendarImpactScopesStore.updateScope(activeTenantId, id, payload)}
            deleteItem={async (id) => calendarImpactScopesStore.deleteScope(activeTenantId, id)}
            itemTypeName="Impact Scope"
            icon={ChecklistIcon}
          />
        )}

        {/* Section 4: System Diagnostics & Cache */}
        {activeSection === "system" && (
          <div className="space-y-4 animate-fade-in text-left">
            {/* Environment Overview Card */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold theme-text-primary">
                    System Environment & Build Info
                  </h3>
                  <p className="text-xs theme-text-secondary mt-0.5">
                    Core client runtime build metadata and environment parameters.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1">
                  <span className="text-[11px] font-semibold theme-text-secondary block">App Version</span>
                  <div className="text-sm font-bold font-mono theme-accent">{APP_VERSION}</div>
                </div>

                <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1">
                  <span className="text-[11px] font-semibold theme-text-secondary block">Build Date</span>
                  <div className="text-xs font-bold theme-text-primary">{APP_BUILD_DATE}</div>
                </div>

                <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/60 space-y-1">
                  <span className="text-[11px] font-semibold theme-text-secondary block">Active Tenant</span>
                  <div className="text-xs font-mono font-bold theme-text-primary truncate">{activeTenantId || "default"}</div>
                </div>
              </div>
            </div>

            {/* Cache Utilities Card */}
            <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4">
              <div className="space-y-1 pb-2 border-b theme-border">
                <h4 className="text-sm font-bold theme-text-primary">Local Storage Cache Purge</h4>
                <p className="text-xs theme-text-secondary">
                  Reset temporary offline datasets, cached dropdown lists, and UI state without logging out.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl theme-bg-sub border theme-border">
                <div>
                  <span className="text-xs font-bold theme-text-primary block">Purge Local Dataset Cache</span>
                  <span className="text-[11px] theme-text-secondary">Clears client-side cached query snapshots</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="px-3.5 py-1.5 rounded-xl border border-rose-500/25 text-rose-600 hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Purge Cache</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SettingsSplitLayout>
  );
}
