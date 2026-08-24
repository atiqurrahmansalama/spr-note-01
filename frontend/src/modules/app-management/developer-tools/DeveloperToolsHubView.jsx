import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import SettingsSplitLayout from "../../../components/common/SettingsSplitLayout";
import CompactTaxonomyManager from "../../../components/common/CompactTaxonomyManager";
import {
  BuildingOfficeIcon,
  SparklesIcon,
  CalendarIcon,
  ChecklistIcon,
  ClockIcon,
  RefreshIcon,
  CheckCircleIcon,
  TrashIcon,
  TeacherIcon,
  SessionsIcon,
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
  calendarWorkingSchedulesStore,
  staffRanksStore,
  STAFF_CATEGORY_OPTIONS,
  documentTypesStore,
  INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS,
  resolveAllowedFormatsConfig,
  classAdmissionRequirementsStore,
  staffRecruitmentRequirementsStore,
} from "../../../utils/localStore";
import { APP_VERSION, APP_BUILD_DATE, APP_BUILD_TIME } from "../../../constants/version";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";

const SECTIONS = [
  // Group 1: Academic & Faculty Structure
  {
    id: "categories",
    group: "Academic Structure",
    title: "Academy Categories",
    description: "Manage institution types, curriculum categories, and taxonomies",
    icon: BuildingOfficeIcon,
  },
  {
    id: "staff-ranks",
    group: "Academic Structure",
    title: "Staff Ranks & Designations",
    description: "Institutional hierarchy, designations, rank priorities (মুহতামিম/প্রিন্সিপাল, শায়খুল হাদিস, ইত্যাদি)",
    icon: TeacherIcon,
  },

  // Group 2: Event & Calendar Schedules
  {
    id: "working-schedules",
    group: "Calendar & Schedules",
    title: "Working Hours & Shifts",
    description: "Manage pre-configured operational shifts, duty hours, and faculty sessions",
    icon: ClockIcon,
  },
  {
    id: "event-types",
    group: "Calendar & Schedules",
    title: "Schedule & Event Types",
    description: "Manage pre-configured schedule titles, exam types, and calendar events",
    icon: CalendarIcon,
  },
  {
    id: "impact-scopes",
    group: "Calendar & Schedules",
    title: "System Impact Scopes",
    description: "Configure system modules affected by calendar events (Attendance, Notifications, etc.)",
    icon: ChecklistIcon,
  },

  // Group 3: Admissions & Recruitment Rules
  {
    id: "document-types",
    group: "Admissions & Recruitment",
    title: "Document Titles",
    description: "Manage pre-configured document titles, sanads, certificates, and identity credentials for staff and students",
    icon: SessionsIcon,
  },
  {
    id: "admission-doc-requirements",
    group: "Admissions & Recruitment",
    title: "Admission Requirements",
    description: "Configure mandatory admission document requirements by class (প্লে-৫ম, হিফজ, ৬ষ্ঠ-১০ম, দাওরায়ে হাদিস)",
    icon: ChecklistIcon,
  },
  {
    id: "staff-recruitment-rules",
    group: "Admissions & Recruitment",
    title: "Staff Recruitment Rules",
    description: "Configure mandatory verification and credential documents required for onboarding different staff categories (Teaching Faculty, Administrative Staff, Finance, Support)",
    icon: ChecklistIcon,
  },

  // Group 4: System & Platform Environment
  {
    id: "system",
    group: "System & Runtime",
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
  const [docTypes, setDocTypes] = useState(() => documentTypesStore.getDocumentTypes(activeTenantId));

  useEffect(() => {
    const handleKindsUpdated = () => {
      setEventKinds(calendarEventKindsStore.getKinds(activeTenantId));
    };
    const handleDocsUpdated = () => {
      setDocTypes(documentTypesStore.getDocumentTypes(activeTenantId));
    };
    window.addEventListener("spr_calendar_event_kinds_updated", handleKindsUpdated);
    window.addEventListener("spr_document_types_updated", handleDocsUpdated);
    return () => {
      window.removeEventListener("spr_calendar_event_kinds_updated", handleKindsUpdated);
      window.removeEventListener("spr_document_types_updated", handleDocsUpdated);
    };
  }, [activeTenantId]);

  const availableDocTitles = useMemo(() => {
    return docTypes.map((d) => ({
      value: d.name,
      label: d.name,
    }));
  }, [docTypes]);

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
      title="Admin Tools"
      subtitle="Configure institutional taxonomies, academy categories, calendar presets, admission rules, and system runtime."
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

        {/* Section: Staff Ranks & Designations */}
        {activeSection === "staff-ranks" && (
          <CompactTaxonomyManager
            title="Staff Ranks & Designations"
            description="Manage institutional hierarchy, staff designations, and priority rank order (e.g. Principal / Muhtamim, Vice Principal, Shaikhul Hadith, etc.). Lower rank numbers indicate higher institutional authority."
            fetchItems={async () => staffRanksStore.getRanks(activeTenantId)}
            createItem={async (payload) => staffRanksStore.addRank(activeTenantId, payload)}
            updateItem={async (id, payload) => staffRanksStore.updateRank(activeTenantId, id, payload)}
            deleteItem={async (id) => staffRanksStore.deleteRank(activeTenantId, id)}
            itemTypeName="Staff Rank"
            typeOptions={STAFF_CATEGORY_OPTIONS}
            typeLabel="Staff Category"
            onManageTypes={true}
            icon={TeacherIcon}
          />
        )}

        {/* Section 2: Working Hours & Shifts */}
        {activeSection === "working-schedules" && (
          <CompactTaxonomyManager
            title="Working Hours & Operational Shifts"
            description="Manage pre-configured operational shifts, lecture sessions, and faculty duty hours available in the Working Hours entry picker."
            fetchItems={async () => calendarWorkingSchedulesStore.getSchedules(activeTenantId)}
            createItem={async (payload) => calendarWorkingSchedulesStore.addSchedule(activeTenantId, payload)}
            updateItem={async (id, payload) => calendarWorkingSchedulesStore.updateSchedule(activeTenantId, id, payload)}
            deleteItem={async (id) => calendarWorkingSchedulesStore.deleteSchedule(activeTenantId, id)}
            itemTypeName="Working Schedule"
            hideStatus={true}
            icon={ClockIcon}
          />
        )}

        {/* Section 3: Schedule & Event Types */}
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
            onManageTypes={true}
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

        {/* Section: Document Titles & Types */}
        {activeSection === "document-types" && (
          <CompactTaxonomyManager
            title="Document Titles"
            description="Manage pre-configured document titles, sanads, academic certificates, and identity credentials available across Staff Onboarding and Student Admissions (e.g. Dawra-e-Hadith, Kamil, Hifz, Birth Certificate, NID, etc.)."
            fetchItems={async () => documentTypesStore.getTypes(activeTenantId)}
            createItem={async (payload) => documentTypesStore.addType(activeTenantId, payload)}
            updateItem={async (id, payload) => documentTypesStore.updateType(activeTenantId, id, payload)}
            deleteItem={async (id) => documentTypesStore.deleteType(activeTenantId, id)}
            itemTypeName="Document Type"
            hideStatus={true}
            icon={SessionsIcon}
            extraFields={[
              {
                name: "allowed_formats",
                label: "Allowed File Formats",
                type: "multiselect",
                multiple: true,
                options: INDIVIDUAL_DOCUMENT_FORMAT_OPTIONS,
                defaultValue: ["PDF", "JPG", "PNG", "WEBP"],
                tableHeader: "Allowed Formats",
                renderBadge: (val) => {
                  const tags = resolveAllowedFormatsConfig(val).tags;
                  return (
                    <div className="flex flex-wrap gap-1 items-center">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="px-2 py-0.5 rounded-md theme-bg-sub border theme-border font-mono text-[10px] font-bold theme-text-primary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  );
                },
              },
            ]}
          />
        )}

        {/* Section: Class Admission Document Requirements */}
        {activeSection === "admission-doc-requirements" && (
          <CompactTaxonomyManager
            title="Admission Requirements"
            description="Configure mandatory admission documents and credentials per academic class or track (e.g. Primary & Hifz requires BRN + Guardian NID; Secondary & Higher requires Transfer Certificate + Marksheets). Required documents will automatically open in the Admission Wizard and cannot be removed."
            fetchItems={async () => classAdmissionRequirementsStore.getRequirements(activeTenantId)}
            createItem={async (payload) => classAdmissionRequirementsStore.addRequirement(activeTenantId, payload)}
            updateItem={async (id, payload) => classAdmissionRequirementsStore.updateRequirement(activeTenantId, id, payload)}
            deleteItem={async (id) => classAdmissionRequirementsStore.deleteRequirement(activeTenantId, id)}
            itemTypeName="Admission Rule"
            extraFields={[
              {
                name: "required_docs",
                label: "Mandatory Required Documents",
                type: "multiselect",
                multiple: true,
                options: availableDocTitles,
                defaultValue: ["Birth Registration Certificate (BRN)", "Guardian National ID (NID)"],
                tableHeader: "Required Document Checklists",
                renderBadge: (val) => {
                  const docs = Array.isArray(val) ? val : [];
                  if (docs.length === 0) return <span className="theme-text-secondary text-xs">—</span>;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {docs.map((doc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  );
                },
              },
            ]}
            hideStatus={true}
            icon={ChecklistIcon}
          />
        )}

        {/* Section: Staff Recruitment Document Rules */}
        {activeSection === "staff-recruitment-rules" && (
          <CompactTaxonomyManager
            title="Staff Recruitment Rules"
            description="Configure mandatory verification documents, academic sanads, and credential checklists required for onboarding different staff categories (Teaching Faculty, Administrative Staff, Finance, Support)."
            fetchItems={async () => staffRecruitmentRequirementsStore.getRequirements(activeTenantId)}
            createItem={async (payload) => staffRecruitmentRequirementsStore.addRequirement(activeTenantId, payload)}
            updateItem={async (id, payload) => staffRecruitmentRequirementsStore.updateRequirement(activeTenantId, id, payload)}
            deleteItem={async (id) => staffRecruitmentRequirementsStore.deleteRequirement(activeTenantId, id)}
            itemTypeName="Recruitment Rule"
            extraFields={[
              {
                name: "target_staff_type",
                label: "Target Staff Category",
                type: "select",
                options: [
                  { label: "All Staff Categories", value: "ALL_STAFF" },
                  ...STAFF_CATEGORY_OPTIONS,
                ],
                defaultValue: "TEACHING",
                tableHeader: "Target Category",
                renderBadge: (val) => {
                  const found = STAFF_CATEGORY_OPTIONS.find((c) => c.value === val);
                  return (
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold theme-bg-sub border theme-border theme-text-primary">
                      {val === "ALL_STAFF" ? "All Categories" : found?.label || val || "All Staff"}
                    </span>
                  );
                },
              },
              {
                name: "required_docs",
                label: "Mandatory Required Documents",
                type: "multiselect",
                multiple: true,
                options: availableDocTitles,
                defaultValue: ["National ID Card (NID)", "Curriculum Vitae (CV) / Resume"],
                tableHeader: "Required Document Checklists",
                renderBadge: (val) => {
                  const docs = Array.isArray(val) ? val : [];
                  if (docs.length === 0) return <span className="theme-text-secondary text-xs">—</span>;
                  return (
                    <div className="flex flex-wrap gap-1">
                      {docs.map((doc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20"
                        >
                          {doc}
                        </span>
                      ))}
                    </div>
                  );
                },
              },
            ]}
            hideStatus={true}
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
                  className="px-3.5 py-1.5 rounded-xl theme-bg-danger-soft theme-danger border theme-border hover:opacity-80 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
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
