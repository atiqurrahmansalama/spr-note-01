import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  SessionsIcon,
  CalendarIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
  TimerIcon,
} from "../../../components/ui/Icons";
import ActionMenu from "../../../components/ui/ActionMenu";
import DataTable from "../../../components/ui/DataTable";
import CustomSelect from "../../../components/ui/CustomSelect";
import { academicYearsStore, getAcademicYearStatus } from "../../../utils/localStore";
import { getHijriDetails } from "../../../utils/hijriUtils";
import { useTenant } from "../../../context/TenantContext";
import { useToast } from "../../../context/ToastContext";
import { useRightSidebar } from "../../../context/RightSidebarContext";

function calculateDurationDays(start, end) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  if (isNaN(diffDays)) return "—";
  return `${diffDays} days`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return "—";
  try {
    const parts = dateStr.split("-");
    if (parts.length < 3) return dateStr;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = parts[2];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    const y = parts[0];
    return `${d} ${m} ${y}`;
  } catch {
    return dateStr;
  }
}

function getHijriYearSpan(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return "";
  try {
    const sHijri = getHijriDetails(new Date(startDateStr));
    const eHijri = getHijriDetails(new Date(endDateStr));
    if (sHijri?.year && eHijri?.year) {
      return sHijri.year === eHijri.year
        ? `${sHijri.year} AH`
        : `${sHijri.year}-${eHijri.year} AH`;
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Calculates dynamic academic session timeline & progress
 */
function getAcademicYearProgress(startDate, endDate) {
  if (!startDate || !endDate) {
    return {
      status: "UPCOMING",
      percentage: 0,
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      statusText: "Not Started",
    };
  }

  const s = new Date(startDate);
  const e = new Date(endDate);
  const today = new Date();
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalTime = e - s;
  const totalDays = Math.max(1, Math.round(totalTime / (1000 * 60 * 60 * 24)) + 1);

  if (today < s) {
    const daysUntil = Math.round((s - today) / (1000 * 60 * 60 * 24));
    return {
      status: "UPCOMING",
      percentage: 0,
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      statusText: `Starts in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`,
    };
  }

  if (today > e) {
    return {
      status: "COMPLETED",
      percentage: 100,
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      statusText: `Completed (${totalDays} days)`,
    };
  }

  const elapsedTime = today - s;
  const elapsedDays = Math.min(totalDays, Math.round(elapsedTime / (1000 * 60 * 60 * 24)) + 1);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    status: "ACTIVE",
    percentage,
    totalDays,
    elapsedDays,
    remainingDays,
    statusText: `${elapsedDays} of ${totalDays} days (${percentage}%) • ${remainingDays} days remaining`,
  };
}

/**
 * Calculates individual semester / term timeline & progress
 */
function getTermProgress(startDate, endDate) {
  if (!startDate || !endDate) {
    return {
      status: "UPCOMING",
      percentage: 0,
      totalDays: 0,
      elapsedDays: 0,
      remainingDays: 0,
      label: "Dates Not Set",
    };
  }

  const s = new Date(startDate);
  const e = new Date(endDate);
  const today = new Date();
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const totalTime = e - s;
  const totalDays = Math.max(1, Math.round(totalTime / (1000 * 60 * 60 * 24)) + 1);

  if (today < s) {
    const daysUntil = Math.round((s - today) / (1000 * 60 * 60 * 24));
    return {
      status: "UPCOMING",
      percentage: 0,
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      label: `Starts in ${daysUntil} ${daysUntil === 1 ? "day" : "days"}`,
    };
  }

  if (today > e) {
    return {
      status: "COMPLETED",
      percentage: 100,
      totalDays,
      elapsedDays: totalDays,
      remainingDays: 0,
      label: `Completed (${totalDays} days)`,
    };
  }

  const elapsedTime = today - s;
  const elapsedDays = Math.min(totalDays, Math.round(elapsedTime / (1000 * 60 * 60 * 24)) + 1);
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    status: "ACTIVE",
    percentage,
    totalDays,
    elapsedDays,
    remainingDays,
    label: `${elapsedDays} of ${totalDays} days (${percentage}%) • ${remainingDays} days left`,
  };
}

export default function AcademicYearsManagementView({
  isEmbedded = false,
  hideHeader = false,
  hideMetrics = false,
}) {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openDrawer } = useRightSidebar();

  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYearFilter, setSelectedYearFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);

  // Load from store
  const loadData = useCallback(() => {
    try {
      const data = academicYearsStore.getAcademicYears(activeTenantId);
      setAcademicYears(data || []);
    } catch (err) {
      console.error("Failed to load academic years:", err);
      showToast("Failed to load academic years.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("spr_tenant_changed", handleUpdate);
    window.addEventListener("spr_academic_years_updated", handleUpdate);
    return () => {
      window.removeEventListener("spr_tenant_changed", handleUpdate);
      window.removeEventListener("spr_academic_years_updated", handleUpdate);
    };
  }, [loadData]);

  // Delete Academic Year
  const handleDelete = (id, yearName) => {
    if (window.confirm(`Are you sure you want to delete "${yearName}"?`)) {
      academicYearsStore.deleteAcademicYear(activeTenantId, id);
      loadData();
      showToast(`Academic year "${yearName}" deleted.`, "info");
    }
  };

  // Open Drawer for Add/Edit
  const handleOpenAdd = () => {
    openDrawer("campus-action", { type: "academic_years", mode: "add" });
  };

  const handleOpenEdit = (year) => {
    openDrawer("campus-action", { type: "academic_years", mode: "edit", yearId: year.id });
  };

  // Active / Selected year overview calculation
  const activeYear = useMemo(() => {
    return academicYearsStore.getActiveYear(activeTenantId) || academicYears[0] || null;
  }, [academicYears, activeTenantId]);

  const displayedYear = useMemo(() => {
    if (selectedYearFilter !== "ALL") {
      return academicYears.find((y) => y.id === selectedYearFilter) || activeYear;
    }
    return activeYear;
  }, [academicYears, selectedYearFilter, activeYear]);

  // Filter options for CustomSelect
  const yearFilterOptions = useMemo(() => {
    return [
      { value: "ALL", label: "All Academic Years" },
      ...academicYears.map((y) => {
        const status = getAcademicYearStatus(y.startDate, y.endDate);
        const statusSuffix = status === "ACTIVE" ? " (Active)" : status === "UPCOMING" ? " (Upcoming)" : "";
        return {
          value: y.id,
          label: `${y.name}${statusSuffix}`,
        };
      }),
    ];
  }, [academicYears]);

  // Filtered Academic Years based on dropdown selection
  const filteredYears = useMemo(() => {
    if (selectedYearFilter === "ALL") return academicYears;
    return academicYears.filter((y) => y.id === selectedYearFilter);
  }, [academicYears, selectedYearFilter]);

  // Ultra-Clean, Minimal & Spacious Terms DataTable columns
  const termColumns = [
    {
      key: "index",
      header: "#",
      headerClassName: "w-12 text-center font-mono text-xs",
      render: (_, rowIdx) => (
        <span className="font-mono text-xs font-bold theme-text-secondary text-center block">
          {rowIdx + 1}
        </span>
      ),
    },
    {
      key: "name",
      header: "Term / Semester",
      render: (item) => {
        const duration = calculateDurationDays(item.startDate, item.endDate);
        return (
          <div className="py-1">
            <div className="font-bold theme-text-primary text-sm">
              {item.name}
            </div>
            <div className="text-xs font-mono theme-text-secondary mt-0.5">
              {formatDateDisplay(item.startDate)} – {formatDateDisplay(item.endDate)} ({duration})
            </div>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-28",
      render: (item) => {
        const prog = getTermProgress(item.startDate, item.endDate);
        if (prog.status === "ACTIVE") {
          return (
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-accent theme-accent-text shadow-2xs inline-flex items-center gap-1">
              <CheckCircleIcon className="w-2.5 h-2.5" />
              <span>ACTIVE</span>
            </span>
          );
        }
        if (prog.status === "COMPLETED") {
          return (
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-muted">
              COMPLETED
            </span>
          );
        }
        return (
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary">
            UPCOMING
          </span>
        );
      },
    },
    {
      key: "progress",
      header: "Timeline Progress",
      render: (item) => {
        const prog = getTermProgress(item.startDate, item.endDate);
        return (
          <div className="w-full max-w-sm space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span
                className={
                  prog.status === "ACTIVE"
                    ? "theme-accent font-semibold"
                    : prog.status === "COMPLETED"
                    ? "text-emerald-500 font-semibold"
                    : "theme-text-secondary"
                }
              >
                {prog.label}
              </span>
              <span className="font-bold text-xs theme-text-primary ml-2 shrink-0">
                {prog.percentage}%
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full theme-bg-sub border theme-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  prog.status === "ACTIVE"
                    ? "theme-bg-accent"
                    : prog.status === "COMPLETED"
                    ? "bg-emerald-500"
                    : "theme-bg-sub"
                }`}
                style={{ width: `${prog.percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ];

  if (academicYears.length === 0) {
    return (
      <div className="p-12 text-center border theme-border rounded-2xl theme-bg-sub/30 flex flex-col items-center justify-center gap-3">
        <div className="p-3 rounded-2xl theme-bg-surface border theme-border theme-text-secondary opacity-60 shadow-xs">
          <SessionsIcon className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-bold theme-text-primary">No Academic Years Found</h4>
          <p className="text-xs theme-text-secondary mt-0.5">
            Create an academic year to configure semesters and terms.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="mt-2 px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 transition shadow-sm flex items-center gap-1.5 cursor-pointer"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          <span>Create Academic Year</span>
        </button>
      </div>
    );
  }

  const displayedStatus = displayedYear ? getAcademicYearStatus(displayedYear.startDate, displayedYear.endDate) : "UPCOMING";
  const isDisplayedActive = displayedStatus === "ACTIVE";
  const displayedHijri = displayedYear ? getHijriYearSpan(displayedYear.startDate, displayedYear.endDate) : "";
  const displayedTermsCount = displayedYear && Array.isArray(displayedYear.terms) ? displayedYear.terms.length : 0;
  const displayedProgress = displayedYear ? getAcademicYearProgress(displayedYear.startDate, displayedYear.endDate) : null;
  const displayedTermSystemLabel = displayedYear
    ? displayedYear.termSystem === "SEMESTER"
      ? "Semester System (2 Terms)"
      : displayedYear.termSystem === "TRIMESTER"
      ? "Trimester System (3 Terms)"
      : displayedYear.termSystem === "QUARTER"
      ? "Quarter System (4 Terms)"
      : displayedYear.termSystem === "ANNUAL"
      ? "Annual Session (1 Term)"
      : `${displayedTermsCount} Custom Terms`
    : "";

  const displayedActionMenuItems = displayedYear
    ? [
        {
          label: "Edit Academic Year",
          icon: EditIcon,
          onClick: () => handleOpenEdit(displayedYear),
        },
        {
          label: "Delete Academic Year",
          icon: TrashIcon,
          danger: true,
          onClick: () => handleDelete(displayedYear.id, displayedYear.name),
        },
      ]
    : [];

  return (
    <div className="flex flex-col w-full space-y-5">
      {/* ─── 1. Top Card: Academic Year Overview Ribbon & Right-Side Filter ─── */}
      <div className="rounded-2xl border theme-border theme-bg-surface p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left Side: Session Details Profile */}
          {displayedYear && (
            <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDisplayedActive
                    ? "theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20 shadow-xs"
                    : "theme-bg-sub border theme-border theme-text-secondary"
                }`}
              >
                <SessionsIcon className="w-5 h-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold theme-text-primary truncate">
                    {displayedYear.name}
                  </h3>
                  {displayedHijri && (
                    <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-accent">
                      {displayedHijri}
                    </span>
                  )}
                  {isDisplayedActive ? (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-accent theme-accent-text shadow-2xs flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>ACTIVE SESSION</span>
                    </span>
                  ) : displayedStatus === "UPCOMING" ? (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary">
                      UPCOMING
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-muted">
                      PAST SESSION
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono theme-text-secondary mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
                    <span>
                      {formatDateDisplay(displayedYear.startDate)} – {formatDateDisplay(displayedYear.endDate)}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="font-semibold theme-text-primary">
                    {displayedTermSystemLabel}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Right Side (Same Line): Academic Year Filter Selector & ActionMenu */}
          <div className="flex items-center gap-2.5 self-stretch lg:self-center shrink-0">
            <div className="w-full sm:w-60">
              <CustomSelect
                name="yearFilter"
                value={selectedYearFilter}
                onChange={(val) => setSelectedYearFilter(val)}
                options={yearFilterOptions}
                placeholder="Filter Academic Year..."
              />
            </div>

            <div className="shrink-0">
              <ActionMenu items={displayedActionMenuItems} />
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar & Timeline Stats for the Academic Year */}
        {displayedProgress && (
          <div className="pt-3.5 border-t theme-border space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono">
              <span className="theme-text-secondary font-medium">
                {displayedProgress.statusText}
              </span>
              <span className="theme-accent font-bold self-start sm:self-auto">
                {displayedProgress.percentage}% Elapsed
              </span>
            </div>

            <div className="w-full h-1.5 rounded-full theme-bg-sub border theme-border overflow-hidden">
              <div
                className="h-full rounded-full theme-bg-accent transition-all duration-500"
                style={{ width: `${displayedProgress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── 2. Terms & Semesters Breakdown Table (Spacious, Minimal & Lightweight) ─── */}
      <div className="space-y-4">
        {filteredYears.map((year) => {
          const termsCount = Array.isArray(year.terms) ? year.terms.length : 0;

          return (
            <div key={year.id} className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 px-1">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 theme-accent" />
                  <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                    Terms & Semesters Breakdown {selectedYearFilter === "ALL" ? `(${year.name})` : `(${termsCount})`}
                  </h5>
                </div>
                <span className="text-xs font-mono theme-text-secondary font-semibold">
                  Total {calculateDurationDays(year.startDate, year.endDate)}
                </span>
              </div>

              <DataTable
                columns={termColumns}
                data={year.terms || []}
                keyExtractor={(t, idx) => t.id || `term_${idx}`}
                cellPaddingClass="py-3.5 px-4 sm:px-5"
                headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
                emptyTitle="No Terms Configured"
                emptySubMessage="No semesters or terms have been configured for this academic year."
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
