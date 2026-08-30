import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../../context/ToastContext";
import { useTenant } from "../../../context/TenantContext";
import { getBranches } from "../../../api/academy";
import { fetchWithAuth } from "../../../utils/authService";
import {
  academicYearsStore,
  admissionSettingsStore,
  getAcademicYearStatus,
  getBranchDisplayName,
  DEFAULT_PREVIOUS_CLASSES,
} from "../../../utils/localStore";
import {
  CalendarIcon,
  BuildingOfficeIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  SparklesIcon,
  UserCheckIcon,
  EyeIcon,
  BookOpenIcon,
  CloseIcon,
  RefreshIcon,
} from "../../../components/ui/Icons";
import CustomSelect from "../../../components/ui/CustomSelect";

/**
 * Reusable Section Wrapper Card with standard Header, Icon, Title, Description, and Policy Badge.
 */
function PolicySectionCard({
  icon: Icon,
  title,
  description,
  badgeLabel,
  badgeValue,
  badgeVariant = "accent",
  children,
}) {
  return (
    <div className="theme-bg-surface border theme-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b theme-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border theme-border shadow-inner shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold theme-text-primary truncate">{title}</h3>
            <p className="text-xs theme-text-secondary leading-relaxed">{description}</p>
          </div>
        </div>
        {badgeValue && (
          <div className="flex items-center gap-2 shrink-0">
            {badgeLabel && (
              <span className="text-[11px] font-bold theme-text-secondary uppercase tracking-wider">
                {badgeLabel}:
              </span>
            )}
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-bold shadow-2xs ${
                badgeVariant === "accent"
                  ? "theme-bg-accent theme-accent-text"
                  : "theme-bg-sub theme-text-primary border theme-border"
              }`}
            >
              {badgeValue}
            </span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Reusable Branch Configuration Summary Cards Grid.
 */
function BranchSummaryGrid({
  title,
  branches = [],
  activeBranchId,
  onSelectBranch,
  renderCardContent,
}) {
  if (!branches || branches.length === 0) return null;

  return (
    <div className="p-4 rounded-2xl theme-bg-sub/40 border theme-border space-y-2.5 animate-fade-in">
      {title && (
        <div className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
          {title}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {branches.map((b) => {
          const isSelected = activeBranchId && String(activeBranchId) === String(b.id);
          const { subtitle, badgeText, badgeVariant = "accent", onClickOverride } = renderCardContent(b, isSelected);

          return (
            <div
              key={b.id}
              onClick={() => (onClickOverride ? onClickOverride() : onSelectBranch?.(b.id))}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                isSelected
                  ? "theme-bg-accent-soft border-[var(--accent-main)] shadow-2xs ring-1 ring-[var(--accent-main)]/30"
                  : "theme-bg-surface hover:theme-bg-elevated theme-border"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold theme-text-primary truncate">
                  {getBranchDisplayName(b)}
                </div>
                {subtitle && (
                  <div className="text-[10px] theme-text-secondary font-mono truncate mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
              {badgeText && (
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 border theme-border ${
                    badgeVariant === "success"
                      ? "theme-bg-success-soft theme-success"
                      : badgeVariant === "danger"
                      ? "theme-bg-danger-soft theme-danger"
                      : badgeVariant === "warning"
                      ? "theme-bg-warning-soft theme-warning"
                      : "theme-bg-accent-soft theme-accent"
                  }`}
                >
                  {badgeText}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Admission Policies & Controls Panel
 * Fully reusable, modular architecture adhering to zero-hardcoding enterprise design guidelines.
 */
export default function AdmissionSettingsPanel() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [settings, setSettings] = useState(() => admissionSettingsStore.getSettings(activeTenantId));
  const [academicYears, setAcademicYears] = useState(() => academicYearsStore.getAcademicYears(activeTenantId));
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Load Branches, Departments & Classes
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoadingBranches(true);
      setLoadingMetadata(true);
      try {
        const [branchData, deptRes, classRes] = await Promise.all([
          getBranches().catch(() => []),
          fetchWithAuth("/api/v1/departments/").catch(() => null),
          fetchWithAuth("/api/v1/classes/?page_size=500&all=true").catch(() => null),
        ]);

        if (isMounted) {
          const bList = Array.isArray(branchData) ? branchData : branchData.results || [];
          setBranches(bList);

          if (deptRes && deptRes.ok) {
            const dData = await deptRes.json();
            setDepartments(Array.isArray(dData) ? dData : dData.results || []);
          }

          if (classRes && classRes.ok) {
            const cData = await classRes.json();
            setClasses(Array.isArray(cData) ? cData : cData.results || []);
          }
        }
      } catch (err) {
        console.warn("Failed to load metadata for admission settings:", err);
      } finally {
        if (isMounted) {
          setLoadingBranches(false);
          setLoadingMetadata(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  // Sync on localStore updates
  useEffect(() => {
    const handleAcademicUpdate = () => {
      setAcademicYears(academicYearsStore.getAcademicYears(activeTenantId));
    };
    const handleSettingsUpdate = () => {
      setSettings(admissionSettingsStore.getSettings(activeTenantId));
    };
    window.addEventListener("spr_academic_years_updated", handleAcademicUpdate);
    window.addEventListener("spr_admission_settings_updated", handleSettingsUpdate);
    return () => {
      window.removeEventListener("spr_academic_years_updated", handleAcademicUpdate);
      window.removeEventListener("spr_admission_settings_updated", handleSettingsUpdate);
    };
  }, [activeTenantId]);

  // Active academic year currently in store
  const currentActiveAcademicYear = useMemo(() => {
    return academicYearsStore.getActiveYear(activeTenantId);
  }, [activeTenantId, academicYears]);

  // Options for academic years dropdown
  const academicYearOptions = useMemo(() => {
    const opts = [
      {
        label: `Active Academic Year (Auto: ${currentActiveAcademicYear?.name || "Active Session"})`,
        value: "ACTIVE_YEAR",
      },
    ];

    academicYears.forEach((ay) => {
      const status = getAcademicYearStatus(ay.startDate, ay.endDate);
      const tag = status === "ACTIVE" ? " (Active)" : status === "UPCOMING" ? " (Upcoming)" : " (Completed)";
      opts.push({
        label: `${ay.name}${tag}`,
        value: ay.id,
      });
    });

    return opts;
  }, [academicYears, currentActiveAcademicYear]);

  // -------------------------------------------------------------
  // OPEN BRANCHES FILTERING (Respects Section 2 Open Branches Policy)
  // -------------------------------------------------------------
  const openBranches = useMemo(() => {
    if (settings.branch_admission_mode === "SPECIFIC") {
      const allowed = (settings.allowed_admission_branches || []).map(String);
      if (allowed.length > 0) {
        return branches.filter((b) => allowed.includes(String(b.id)));
      }
      return [];
    }
    return branches;
  }, [branches, settings.branch_admission_mode, settings.allowed_admission_branches]);

  // All Branches Options (specifically for Section 2: Allowed Branches selector)
  const allBranchOptions = useMemo(() => {
    return branches.map((b) => {
      const bName = getBranchDisplayName(b);
      const bCode = b.branch_code || b.code;
      return {
        label: bName + (bCode ? ` (${bCode})` : ""),
        value: String(b.id),
      };
    });
  }, [branches]);

  // Open Branch Options (specifically for Section 3, 4, 5, 6: Select Branch selector)
  const openBranchOptions = useMemo(() => {
    return openBranches.map((b) => {
      const bName = getBranchDisplayName(b);
      const bCode = b.branch_code || b.code;
      return {
        label: bName + (bCode ? ` (${bCode})` : ""),
        value: String(b.id),
      };
    });
  }, [openBranches]);

  // -------------------------------------------------------------
  // BRANCH SPECIFIC SELECTORS STATE
  // -------------------------------------------------------------
  const [selectedGenderBranchId, setSelectedGenderBranchId] = useState(null);
  const [selectedMotherConfigBranchId, setSelectedMotherConfigBranchId] = useState(null);
  const [selectedDeptConfigBranchId, setSelectedDeptConfigBranchId] = useState(null);
  const [selectedClassConfigBranchId, setSelectedClassConfigBranchId] = useState(null);

  useEffect(() => {
    if (openBranches.length > 0) {
      const validIds = openBranches.map((b) => String(b.id));
      if (!selectedGenderBranchId || !validIds.includes(String(selectedGenderBranchId))) {
        setSelectedGenderBranchId(openBranches[0].id);
      }
      if (!selectedMotherConfigBranchId || !validIds.includes(String(selectedMotherConfigBranchId))) {
        setSelectedMotherConfigBranchId(openBranches[0].id);
      }
      if (!selectedDeptConfigBranchId || !validIds.includes(String(selectedDeptConfigBranchId))) {
        setSelectedDeptConfigBranchId(openBranches[0].id);
      }
      if (!selectedClassConfigBranchId || !validIds.includes(String(selectedClassConfigBranchId))) {
        setSelectedClassConfigBranchId(openBranches[0].id);
      }
    }
  }, [openBranches, selectedGenderBranchId, selectedMotherConfigBranchId, selectedDeptConfigBranchId, selectedClassConfigBranchId]);

  const activeGenderBranchId =
    selectedGenderBranchId && openBranches.some((b) => String(b.id) === String(selectedGenderBranchId))
      ? selectedGenderBranchId
      : openBranches[0]?.id;

  const activeMotherBranchId =
    selectedMotherConfigBranchId && openBranches.some((b) => String(b.id) === String(selectedMotherConfigBranchId))
      ? selectedMotherConfigBranchId
      : openBranches[0]?.id;

  const activeDeptBranchId =
    selectedDeptConfigBranchId && openBranches.some((b) => String(b.id) === String(selectedDeptConfigBranchId))
      ? selectedDeptConfigBranchId
      : openBranches[0]?.id;

  const activeClassBranchId =
    selectedClassConfigBranchId && openBranches.some((b) => String(b.id) === String(selectedClassConfigBranchId))
      ? selectedClassConfigBranchId
      : openBranches[0]?.id;

  // Helper to extract department ID from class
  const getDeptIdFromClass = (c) => {
    if (!c) return null;
    const val = c.department !== undefined && c.department !== null ? c.department : c.department_id;
    return val && typeof val === "object" ? val.id : val;
  };

  // Options for departments under a specific active branch
  const branchDepartmentOptions = useMemo(() => {
    if (!activeDeptBranchId) return [];
    return departments
      .filter((d) => {
        const bVal = d.branch !== undefined && d.branch !== null ? d.branch : d.branch_id;
        const bId = bVal && typeof bVal === "object" ? bVal.id : bVal;
        return !bId || String(bId) === String(activeDeptBranchId);
      })
      .map((d) => {
        const bVal = d.branch !== undefined && d.branch !== null ? d.branch : d.branch_id;
        const isGlobal = !bVal;
        return {
          label: `${d.code ? `${d.name} (${d.code})` : d.name}${isGlobal ? " (All Branches)" : ""}`,
          value: String(d.id),
          raw: d,
        };
      });
  }, [departments, activeDeptBranchId]);

  // Options for classes dropdown under BRANCH_SPECIFIC class mode
  const branchClassOptions = useMemo(() => {
    let list = classes;
    if (activeClassBranchId) {
      list = list.filter((c) => {
        const cBranchVal = c.branch !== undefined && c.branch !== null ? c.branch : c.branch_id;
        const cBranchId = cBranchVal && typeof cBranchVal === "object" ? cBranchVal.id : cBranchVal;
        if (cBranchId && String(cBranchId) !== String(activeClassBranchId)) {
          return false;
        }

        const dId = getDeptIdFromClass(c);
        if (dId) {
          const deptObj = departments.find((d) => String(d.id) === String(dId));
          if (deptObj) {
            const deptBranchVal = deptObj.branch !== undefined && deptObj.branch !== null ? deptObj.branch : deptObj.branch_id;
            const deptBranchId = deptBranchVal && typeof deptBranchVal === "object" ? deptBranchVal.id : deptBranchVal;
            if (deptBranchId && String(deptBranchId) !== String(activeClassBranchId)) {
              return false;
            }
          }
        }
        return true;
      });

      if (settings.department_admission_mode === "BRANCH_SPECIFIC") {
        const bDepts = settings.branch_department_rules?.[activeClassBranchId];
        if (Array.isArray(bDepts) && bDepts.length > 0) {
          const allowedDepts = bDepts.map(String);
          list = list.filter((c) => {
            const dId = getDeptIdFromClass(c);
            return dId ? allowedDepts.includes(String(dId)) : false;
          });
        }
      }
    }

    return list.map((c) => {
      const deptName = c.department_name || (c.department && typeof c.department === "object" ? c.department.name : "");
      return {
        label: c.code ? `${c.name} (${c.code})${deptName ? ` - ${deptName}` : ""}` : c.name,
        value: String(c.id),
        raw: c,
      };
    });
  }, [classes, departments, settings.department_admission_mode, settings.branch_department_rules, activeClassBranchId]);

  // Handle Save Settings
  const handleSave = (updated) => {
    const nextSettings = { ...settings, ...updated };
    setSettings(nextSettings);
    admissionSettingsStore.saveSettings(activeTenantId, nextSettings);
    showToast("Admission configuration saved successfully", "success");
  };

  const selectedYearIds = Array.isArray(settings.allowed_admission_years) ? settings.allowed_admission_years : [];

  // Branch Rule Handlers
  const handleBranchDepartmentChange = (branchId, selectedDeptIds) => {
    const nextBranchRules = {
      ...(settings.branch_department_rules || {}),
      [branchId]: Array.isArray(selectedDeptIds) ? selectedDeptIds : [selectedDeptIds],
    };
    handleSave({ branch_department_rules: nextBranchRules });
  };

  const handleBranchClassChange = (branchId, selectedClassIds) => {
    const nextBranchRules = {
      ...(settings.branch_class_rules || {}),
      [branchId]: Array.isArray(selectedClassIds) ? selectedClassIds : [selectedClassIds],
    };
    handleSave({ branch_class_rules: nextBranchRules });
  };

  const handleBranchGenderChange = (branchId, genderRule) => {
    const nextBranchRules = {
      ...(settings.branch_gender_rules || {}),
      [branchId]: genderRule,
    };
    handleSave({ branch_gender_rules: nextBranchRules });
  };

  const handleBranchMotherInfoChange = (branchId, visibility) => {
    const nextRules = {
      ...(settings.branch_mother_info_rules || {}),
      [branchId]: visibility,
    };
    handleSave({ branch_mother_info_rules: nextRules });
  };

  // Section 7: Previous Classes Handlers
  const [newPrevClassInput, setNewPrevClassInput] = useState("");

  const handleAddPreviousClass = () => {
    const trimmed = newPrevClassInput.trim();
    if (!trimmed) {
      showToast("Please enter a valid class name", "warning");
      return;
    }
    const currentList = settings.previous_classes_list || DEFAULT_PREVIOUS_CLASSES;
    if (currentList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast("This class already exists in the roster", "warning");
      return;
    }
    const updated = [...currentList, trimmed];
    handleSave({ previous_classes_list: updated });
    setNewPrevClassInput("");
    showToast(`Added "${trimmed}" to previous classes roster`, "success");
  };

  const handleRemovePreviousClass = (clsName) => {
    const currentList = settings.previous_classes_list || DEFAULT_PREVIOUS_CLASSES;
    const updated = currentList.filter((c) => c !== clsName);
    handleSave({ previous_classes_list: updated });
    showToast(`Removed "${clsName}" from previous classes roster`, "info");
  };

  const handleResetPreviousClasses = () => {
    handleSave({ previous_classes_list: DEFAULT_PREVIOUS_CLASSES });
    showToast("Previous classes reset to standard defaults", "success");
  };

  const branchGenderOptions = [
    { label: "Boys Only (Male)", value: "MALE_ONLY" },
    { label: "Girls Only (Female)", value: "FEMALE_ONLY" },
  ];

  const motherVisibilityOptions = [
    { label: "Visible (Enabled)", value: "VISIBLE" },
    { label: "Hidden (Disabled)", value: "HIDDEN" },
  ];

  return (
    <div className="w-full space-y-6 animate-fade-in text-left">
      {/* ─── Top Header Card ────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
          <div className="p-2.5 rounded-xl theme-bg-accent-soft theme-accent shrink-0 mt-0.5 sm:mt-0 shadow-inner">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                Admission Policies &amp; Controls
              </h2>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md theme-bg-sub border theme-border theme-text-secondary">
                Configuration
              </span>
            </div>
            <p className="text-xs theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Configure open admission academic sessions, branch campus permissions, department offerings, class availability, campus gender locks, and applicant field visibility.
            </p>
          </div>
        </div>

        {/* Right Header Status Indicator */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <span className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse" />
            <span>Auto Saved</span>
          </span>
        </div>
      </div>

      {/* ────────────────── SECTION 1: ONGOING ADMISSION ACADEMIC YEAR ────────────────── */}
      <PolicySectionCard
        icon={CalendarIcon}
        title="Ongoing Admission Academic Year"
        description="Select which Academic Sessions are open for applicant admissions. Multiple sessions can be checked."
        badgeLabel="Active Target"
        badgeValue={
          selectedYearIds.length > 0
            ? `${selectedYearIds.length} Session(s) Selected`
            : `Default (${currentActiveAcademicYear?.name || "Active Session"})`
        }
      >
        <div className="max-w-md">
          <CustomSelect
            label="Open Academic Sessions"
            multiple={true}
            options={academicYearOptions}
            value={selectedYearIds}
            onChange={(val) => {
              const updated = Array.isArray(val) ? val : [val];
              handleSave({ allowed_admission_years: updated });
            }}
            placeholder="Select academic sessions..."
          />
        </div>
      </PolicySectionCard>

      {/* ────────────────── SECTION 2: OPEN ADMISSION BRANCHES ────────────────── */}
      <PolicySectionCard
        icon={BuildingOfficeIcon}
        title="Open Admission Branches"
        description="Control which branches or campuses are eligible for applicant admissions across the institution."
        badgeLabel="Branch Policy"
        badgeValue={
          settings.branch_admission_mode === "SPECIFIC"
            ? `${(settings.allowed_admission_branches || []).length} Selected`
            : "All Branches Open"
        }
      >
        <div className="space-y-4">
          <div
            className={`grid gap-4 sm:gap-5 ${
              settings.branch_admission_mode === "SPECIFIC"
                ? "grid-cols-1 md:grid-cols-2 max-w-3xl"
                : "grid-cols-1 max-w-md"
            }`}
          >
            <div>
              <CustomSelect
                label="Branch Admission Mode"
                options={[
                  { label: "All Branches Open", value: "ALL" },
                  { label: "Specific Branches Only", value: "SPECIFIC" },
                ]}
                value={settings.branch_admission_mode || "ALL"}
                onChange={(val) => handleSave({ branch_admission_mode: val })}
                searchable={false}
              />
            </div>

            {settings.branch_admission_mode === "SPECIFIC" && (
              <div className="animate-fade-in">
                <CustomSelect
                  label="Allowed Branches"
                  multiple={true}
                  options={allBranchOptions}
                  value={settings.allowed_admission_branches || []}
                  onChange={(val) => {
                    const updated = Array.isArray(val) ? val : [val];
                    handleSave({ allowed_admission_branches: updated });
                  }}
                  placeholder="Select allowed branches..."
                  searchable={true}
                />
              </div>
            )}
          </div>

          {/* Configured Branch Summary when Specific Mode is active */}
          {settings.branch_admission_mode === "SPECIFIC" && (
            <BranchSummaryGrid
              title="Configured Branches Admission Status"
              branches={branches}
              renderCardContent={(b) => {
                const isAllowed = (settings.allowed_admission_branches || []).map(String).includes(String(b.id));
                return {
                  subtitle: isAllowed ? "Open for Admissions" : "Admissions Closed",
                  badgeText: isAllowed ? "Open" : "Closed",
                  badgeVariant: isAllowed ? "success" : "danger",
                  onClickOverride: () => {
                    const current = (settings.allowed_admission_branches || []).map(String);
                    const updated = isAllowed
                      ? current.filter((id) => id !== String(b.id))
                      : [...current, String(b.id)];
                    handleSave({ allowed_admission_branches: updated });
                  },
                };
              }}
            />
          )}
        </div>
      </PolicySectionCard>

      {/* ────────────────── SECTION 3: OPEN ADMISSION DEPARTMENTS ────────────────── */}
      <PolicySectionCard
        icon={BuildingLibraryIcon}
        title="Open Admission Departments"
        description="Control which departments are eligible for admissions per branch campus."
        badgeLabel="Department Policy"
        badgeValue={
          settings.department_admission_mode === "BRANCH_SPECIFIC"
            ? "Branch-Specific"
            : "All Open"
        }
      >
        <div className="space-y-4">
          <div
            className={`grid gap-4 sm:gap-5 ${
              settings.department_admission_mode === "BRANCH_SPECIFIC"
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 max-w-md"
            }`}
          >
            <div>
              <CustomSelect
                label="Department Admission Mode"
                options={[
                  { label: "All Departments Open", value: "ALL" },
                  { label: "Branch-Specific Rules", value: "BRANCH_SPECIFIC" },
                ]}
                value={settings.department_admission_mode === "ALL" ? "ALL" : "BRANCH_SPECIFIC"}
                onChange={(val) => handleSave({ department_admission_mode: val })}
                searchable={false}
              />
            </div>

            {settings.department_admission_mode === "BRANCH_SPECIFIC" && (
              <>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Select Branch"
                    options={openBranchOptions}
                    value={activeDeptBranchId}
                    onChange={(val) => setSelectedDeptConfigBranchId(val)}
                    placeholder={openBranchOptions.length === 0 ? "No Open Branches..." : "Select Branch..."}
                    searchable={false}
                    disabled={openBranchOptions.length === 0}
                  />
                </div>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Branch Allowed Departments"
                    multiple={true}
                    options={branchDepartmentOptions}
                    value={settings.branch_department_rules?.[activeDeptBranchId] || []}
                    onChange={(val) => handleBranchDepartmentChange(activeDeptBranchId, val)}
                    placeholder="Select departments..."
                    searchable={true}
                    disabled={!activeDeptBranchId || openBranchOptions.length === 0}
                  />
                </div>
              </>
            )}
          </div>

          {settings.department_admission_mode === "BRANCH_SPECIFIC" && openBranches.length > 0 && (
            <BranchSummaryGrid
              title="Configured Branch Departments Summary (Open Branches)"
              branches={openBranches}
              activeBranchId={activeDeptBranchId}
              onSelectBranch={(bId) => setSelectedDeptConfigBranchId(bId)}
              renderCardContent={(b) => {
                const allowedDepts = settings.branch_department_rules?.[b.id] || [];
                return {
                  subtitle: allowedDepts.length === 0 ? "All Departments Open" : `${allowedDepts.length} Department(s)`,
                  badgeText: allowedDepts.length === 0 ? "All" : `${allowedDepts.length} Selected`,
                  badgeVariant: allowedDepts.length === 0 ? "success" : "accent",
                };
              }}
            />
          )}
        </div>
      </PolicySectionCard>

      {/* ────────────────── SECTION 4: OPEN ADMISSION CLASSES ────────────────── */}
      <PolicySectionCard
        icon={AcademicCapIcon}
        title="Open Admission Classes"
        description="Control which classes are open for applicant admission globally or configure individual branch offerings."
        badgeLabel="Class Policy"
        badgeValue={
          settings.class_admission_mode === "BRANCH_SPECIFIC"
            ? "Branch-Specific"
            : "All Open"
        }
      >
        <div className="space-y-4">
          <div
            className={`grid gap-4 sm:gap-5 ${
              settings.class_admission_mode === "BRANCH_SPECIFIC"
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 max-w-md"
            }`}
          >
            <div>
              <CustomSelect
                label="Class Admission Mode"
                options={[
                  { label: "All Classes Open", value: "ALL" },
                  { label: "Branch-Specific Rules", value: "BRANCH_SPECIFIC" },
                ]}
                value={settings.class_admission_mode === "ALL" ? "ALL" : "BRANCH_SPECIFIC"}
                onChange={(val) => handleSave({ class_admission_mode: val })}
                searchable={false}
              />
            </div>

            {settings.class_admission_mode === "BRANCH_SPECIFIC" && (
              <>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Select Branch"
                    options={openBranchOptions}
                    value={activeClassBranchId}
                    onChange={(val) => setSelectedClassConfigBranchId(val)}
                    placeholder={openBranchOptions.length === 0 ? "No Open Branches..." : "Select Branch..."}
                    searchable={false}
                    disabled={openBranchOptions.length === 0}
                  />
                </div>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Branch Allowed Classes"
                    multiple={true}
                    options={branchClassOptions}
                    value={settings.branch_class_rules?.[activeClassBranchId] || []}
                    onChange={(val) => handleBranchClassChange(activeClassBranchId, val)}
                    placeholder="Select classes..."
                    searchable={true}
                    disabled={!activeClassBranchId || openBranchOptions.length === 0}
                  />
                </div>
              </>
            )}
          </div>

          {settings.class_admission_mode === "BRANCH_SPECIFIC" && openBranches.length > 0 && (
            <BranchSummaryGrid
              title="Configured Branch Classes Summary (Open Branches)"
              branches={openBranches}
              activeBranchId={activeClassBranchId}
              onSelectBranch={(bId) => setSelectedClassConfigBranchId(bId)}
              renderCardContent={(b) => {
                const allowedCls = settings.branch_class_rules?.[b.id] || [];
                return {
                  subtitle: allowedCls.length === 0 ? "All Classes Open" : `${allowedCls.length} Class(es)`,
                  badgeText: allowedCls.length === 0 ? "All" : `${allowedCls.length} Selected`,
                  badgeVariant: allowedCls.length === 0 ? "success" : "accent",
                };
              }}
            />
          )}
        </div>
      </PolicySectionCard>

      {/* ────────────────── SECTION 5: GENDER LOCK & CAMPUS POLICY ────────────────── */}
      <PolicySectionCard
        icon={UserCheckIcon}
        title="Gender Lock &amp; Campus Policy"
        description="Restrict admissions to specific genders globally or configure per-branch restrictions (e.g. Boys Branch vs Girls Branch)."
        badgeLabel="Campus Policy"
        badgeValue={
          settings.gender_policy === "BRANCH_SPECIFIC"
            ? "Branch-Specific"
            : settings.gender_policy === "FEMALE_ONLY"
            ? "Girls Only"
            : "Boys Only"
        }
      >
        <div className="space-y-4">
          <div
            className={`grid gap-4 sm:gap-5 ${
              settings.gender_policy === "BRANCH_SPECIFIC"
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 max-w-md"
            }`}
          >
            <div>
              <CustomSelect
                label="Default Institutional Policy"
                options={[
                  { label: "Boys Only (Male)", value: "MALE_ONLY" },
                  { label: "Girls Only (Female)", value: "FEMALE_ONLY" },
                  { label: "Branch-Specific Rules", value: "BRANCH_SPECIFIC" },
                ]}
                value={
                  settings.gender_policy === "ALL" || !settings.gender_policy
                    ? "BRANCH_SPECIFIC"
                    : settings.gender_policy
                }
                onChange={(val) => handleSave({ gender_policy: val })}
                searchable={false}
              />
            </div>

            {settings.gender_policy === "BRANCH_SPECIFIC" && (
              <>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Select Branch"
                    options={openBranchOptions}
                    value={activeGenderBranchId}
                    onChange={(val) => setSelectedGenderBranchId(val)}
                    placeholder={openBranchOptions.length === 0 ? "No Open Branches..." : "Select Branch..."}
                    searchable={false}
                    disabled={openBranchOptions.length === 0}
                  />
                </div>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Allowed Gender"
                    options={branchGenderOptions}
                    value={settings.branch_gender_rules?.[activeGenderBranchId] || "MALE_ONLY"}
                    onChange={(val) => handleBranchGenderChange(activeGenderBranchId, val)}
                    searchable={false}
                    disabled={!activeGenderBranchId || openBranchOptions.length === 0}
                  />
                </div>
              </>
            )}
          </div>

          {settings.gender_policy === "BRANCH_SPECIFIC" && openBranches.length > 0 && (
            <BranchSummaryGrid
              title="Configured Branch Policies Summary (Open Branches)"
              branches={openBranches}
              activeBranchId={activeGenderBranchId}
              onSelectBranch={(bId) => setSelectedGenderBranchId(bId)}
              renderCardContent={(b) => {
                const rule = settings.branch_gender_rules?.[b.id] || "MALE_ONLY";
                return {
                  subtitle: rule === "FEMALE_ONLY" ? "Girls Only" : "Boys Only",
                  badgeText: rule === "FEMALE_ONLY" ? "Female" : "Male",
                  badgeVariant: rule === "FEMALE_ONLY" ? "warning" : "accent",
                };
              }}
            />
          )}
        </div>
      </PolicySectionCard>

      {/* ────────────────── SECTION 6: MOTHER INFORMATION & EMERGENCY CONTACTS ────────────────── */}
      <PolicySectionCard
        icon={EyeIcon}
        title="Mother Information &amp; Emergency Contacts"
        description="Enable or hide Mother Information (Name, Phone) and Emergency Contacts globally or per branch campus."
        badgeLabel="Visibility Policy"
        badgeValue={
          settings.mother_info_visibility === "BRANCH_SPECIFIC"
            ? "Branch-Specific"
            : settings.mother_info_visibility === "HIDDEN"
            ? "Hidden (Disabled)"
            : "Visible (Enabled)"
        }
      >
        <div className="space-y-4">
          <div
            className={`grid gap-4 sm:gap-5 ${
              settings.mother_info_visibility === "BRANCH_SPECIFIC"
                ? "grid-cols-1 md:grid-cols-3"
                : "grid-cols-1 max-w-md"
            }`}
          >
            <div>
              <CustomSelect
                label="Default Institutional Visibility"
                options={[
                  { label: "Visible (Enabled for All)", value: "VISIBLE" },
                  { label: "Hidden (Disabled for All)", value: "HIDDEN" },
                  { label: "Branch-Specific Rules", value: "BRANCH_SPECIFIC" },
                ]}
                value={settings.mother_info_visibility || "VISIBLE"}
                onChange={(val) => handleSave({ mother_info_visibility: val })}
                searchable={false}
              />
            </div>

            {settings.mother_info_visibility === "BRANCH_SPECIFIC" && (
              <>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Select Branch"
                    options={openBranchOptions}
                    value={activeMotherBranchId}
                    onChange={(val) => setSelectedMotherConfigBranchId(val)}
                    placeholder={openBranchOptions.length === 0 ? "No Open Branches..." : "Select Branch..."}
                    searchable={false}
                    disabled={openBranchOptions.length === 0}
                  />
                </div>
                <div className="animate-fade-in">
                  <CustomSelect
                    label="Mother Info Status"
                    options={motherVisibilityOptions}
                    value={settings.branch_mother_info_rules?.[activeMotherBranchId] || "VISIBLE"}
                    onChange={(val) => handleBranchMotherInfoChange(activeMotherBranchId, val)}
                    searchable={false}
                    disabled={!activeMotherBranchId || openBranchOptions.length === 0}
                  />
                </div>
              </>
            )}
          </div>

          {settings.mother_info_visibility === "BRANCH_SPECIFIC" && openBranches.length > 0 && (
            <BranchSummaryGrid
              title="Configured Branch Mother Info Summary (Open Branches)"
              branches={openBranches}
              activeBranchId={activeMotherBranchId}
              onSelectBranch={(bId) => setSelectedMotherConfigBranchId(bId)}
              renderCardContent={(b) => {
                const isVisible = (settings.branch_mother_info_rules?.[b.id] || "VISIBLE") !== "HIDDEN";
                return {
                  subtitle: isVisible ? "Mother Info Visible" : "Mother Info Hidden",
                  badgeText: isVisible ? "Visible" : "Hidden",
                  badgeVariant: isVisible ? "success" : "danger",
                };
              }}
            />
          )}
        </div>
      </PolicySectionCard>

      {/* ================================================================================================= */}
      {/* SECTION 7: PREVIOUS CLASSES / PRIOR EDUCATION ROSTER (পূর্ববর্তী শ্রেণির তালিকা) */}
      {/* ================================================================================================= */}
      <PolicySectionCard
        icon={BookOpenIcon}
        title="Previous Classes / Prior Education Roster"
        description="Configure and manage the predetermined previous classes and educational stages available in admission forms."
        badgeLabel="Configured"
        badgeValue={`${(settings.previous_classes_list || DEFAULT_PREVIOUS_CLASSES).length} Classes`}
        badgeVariant="accent"
      >
        <div className="space-y-5">
          {/* Add New Previous Class Input Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newPrevClassInput}
                onChange={(e) => setNewPrevClassInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPreviousClass();
                  }
                }}
                placeholder="Type new previous class name (e.g. Class 11, Hifz 20 Para, Hifz Completion...)"
                className="w-full px-4 py-2.5 rounded-xl theme-bg-sub border theme-border theme-text-primary text-xs font-medium focus:outline-none focus:border-[var(--accent-main)] transition-colors shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddPreviousClass}
                className="px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold transition-all hover:opacity-90 cursor-pointer shadow-xs whitespace-nowrap"
              >
                + Add Class
              </button>
              <button
                type="button"
                onClick={handleResetPreviousClasses}
                className="px-3.5 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-secondary hover:theme-text-primary hover:border-[var(--border-hover)] transition-all cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap"
                title="Reset to recommended standard classes"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
            </div>
          </div>

          {/* Active Previous Classes Tags / Pills Matrix */}
          <div className="p-4 rounded-2xl theme-bg-sub/40 border theme-border space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider theme-text-secondary">
              <span>Active Previous Classes List</span>
              <span className="font-mono text-[11px] lowercase opacity-75">click ✕ to remove</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(settings.previous_classes_list || DEFAULT_PREVIOUS_CLASSES).map((clsName, idx) => (
                <div
                  key={`${clsName}-${idx}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-surface border theme-border text-xs font-semibold theme-text-primary shadow-2xs hover:border-[var(--border-hover)] transition-all group"
                >
                  <span>{clsName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePreviousClass(clsName)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer ml-1"
                    title={`Remove ${clsName}`}
                  >
                    <CloseIcon className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PolicySectionCard>
    </div>
  );
}
