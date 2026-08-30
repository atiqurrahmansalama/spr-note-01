import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  SessionsIcon,
  CalendarIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckCircleIcon,
} from "../../../../components/ui/Icons";
import ActionMenu from "../../../../components/ui/ActionMenu";
import DataTable from "../../../../components/ui/DataTable";
import CustomButton from "../../../../components/ui/CustomButton";
import { academicYearsStore, getAcademicYearStatus } from "../../../../utils/localStore";
import { getHijriDetails } from "../../../../utils/hijriUtils";
import { useTenant } from "../../../../context/TenantContext";
import { useAcademicSession } from "../../../../context/AcademicSessionContext";
import { useToast } from "../../../../context/ToastContext";
import { useRightSidebar } from "../../../../context/RightSidebarContext";

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

function getHijriYearSpan(startStr, endStr) {
  if (!startStr || !endStr) return "";
  try {
    const sDetails = getHijriDetails(new Date(startStr));
    const eDetails = getHijriDetails(new Date(endStr));
    if (sDetails?.year && eDetails?.year) {
      if (sDetails.year === eDetails.year) {
        return `${sDetails.year} AH`;
      }
      return `${sDetails.year}–${eDetails.year} AH`;
    }
    return "";
  } catch {
    return "";
  }
}

function getAcademicYearProgress(startStr, endStr) {
  if (!startStr || !endStr) return null;
  const today = new Date();
  const start = new Date(startStr);
  const end = new Date(endStr);

  const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  if (totalDays <= 0) return null;

  if (today < start) {
    const daysUntil = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    return {
      percentage: 0,
      statusText: `Starts in ${daysUntil} days (${formatDateDisplay(startStr)})`,
      isOngoing: false,
    };
  }

  if (today > end) {
    return {
      percentage: 100,
      statusText: `Completed on ${formatDateDisplay(endStr)}`,
      isOngoing: false,
    };
  }

  const elapsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const percentage = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  return {
    percentage,
    statusText: `${elapsedDays} of ${totalDays} days (${percentage}%) • ${remainingDays} days left`,
    isOngoing: true,
  };
}

function getTermProgress(startStr, endStr) {
  if (!startStr || !endStr) {
    return { status: "UPCOMING", percentage: 0, label: "Not Scheduled" };
  }
  const today = new Date();
  const start = new Date(startStr);
  const end = new Date(endStr);

  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);

  if (today < start) {
    const daysUntil = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
    return {
      status: "UPCOMING",
      percentage: 0,
      totalDays,
      label: `Starts in ${daysUntil} days`,
    };
  }

  if (today > end) {
    return {
      status: "COMPLETED",
      percentage: 100,
      totalDays,
      label: "Completed",
    };
  }

  const elapsedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
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

export default function AcademicYearsManagementView() {
  const { activeTenantId } = useTenant();
  const { activeYear: globalActiveYear } = useAcademicSession();
  const { showToast } = useToast();
  const { openDrawer } = useRightSidebar();

  const [academicYears, setAcademicYears] = useState([]);

  // Load from store
  const loadData = useCallback(() => {
    try {
      const data = academicYearsStore.getAcademicYears(activeTenantId);
      setAcademicYears(data || []);
    } catch (err) {
      console.error("Failed to load academic years:", err);
      showToast("Failed to load academic years.", "error");
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

  // Displayed academic year matches the global active year or date-based active year
  const displayedYear = useMemo(() => {
    return globalActiveYear || academicYears.find((y) => getAcademicYearStatus(y.startDate, y.endDate) === "ACTIVE") || academicYears[0] || null;
  }, [academicYears, globalActiveYear]);

  const isDisplayedGlobalActive = displayedYear && String(globalActiveYear?.id) === String(displayedYear.id);

  // Term Columns Generator
  const getTermColumns = useCallback((parentYear) => [
    {
      key: "index",
      header: "No",
      align: "center",
      headerClassName: "w-14 text-center font-mono text-xs",
      cellClassName: "w-14 text-center font-mono text-xs",
      render: (_, rowIdx) => (
        <span className="font-mono text-xs font-bold theme-text-secondary">
          {rowIdx + 1}
        </span>
      ),
    },
    {
      key: "name",
      header: "Term / Semester",
      headerClassName: "w-56 min-w-[180px]",
      cellClassName: "w-56 min-w-[180px]",
      render: (item) => {
        const duration = calculateDurationDays(item.startDate, item.endDate);

        return (
          <div className="py-1">
            <span className="font-bold theme-text-primary text-sm block">
              {item.name}
            </span>
            <span className="text-xs font-mono theme-text-secondary mt-0.5 block">
              {duration}
            </span>
          </div>
        );
      },
    },
    {
      key: "dates",
      header: "Term Dates",
      headerClassName: "w-52 min-w-[170px]",
      cellClassName: "w-52 min-w-[170px]",
      render: (item) => (
        <div className="py-1 space-y-1 font-mono text-xs">
          <div className="flex items-center gap-1.5 theme-text-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 w-10 shrink-0">From:</span>
            <span className="font-medium theme-text-primary">{formatDateDisplay(item.startDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 theme-text-secondary">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 w-10 shrink-0">To:</span>
            <span className="font-medium theme-text-primary">{formatDateDisplay(item.endDate)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      headerClassName: "w-32 min-w-[120px] text-center",
      cellClassName: "w-32 min-w-[120px] text-center",
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
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-muted inline-flex items-center">
              COMPLETED
            </span>
          );
        }
        return (
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary inline-flex items-center">
            UPCOMING
          </span>
        );
      },
    },
    {
      key: "progress",
      header: "Timeline Progress",
      headerClassName: "min-w-[240px]",
      cellClassName: "min-w-[240px]",
      render: (item) => {
        const prog = getTermProgress(item.startDate, item.endDate);
        return (
          <div className="w-full space-y-1.5 py-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span
                className={
                  prog.status === "ACTIVE"
                    ? "theme-accent font-bold"
                    : prog.status === "COMPLETED"
                    ? "theme-text-muted"
                    : "theme-text-secondary"
                }
              >
                {prog.label}
              </span>
              {prog.status === "ACTIVE" && (
                <span className="theme-accent font-bold">{prog.percentage}%</span>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full theme-bg-sub border theme-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  prog.status === "ACTIVE"
                    ? "theme-bg-accent"
                    : prog.status === "COMPLETED"
                    ? "theme-bg-sub border theme-border"
                    : "theme-bg-sub"
                }`}
                style={{ width: `${prog.percentage}%` }}
              />
            </div>
          </div>
        );
      },
    },
  ], []);

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
        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={handleOpenAdd}
          className="mt-2"
        >
          Create Academic Year
        </CustomButton>
      </div>
    );
  }

  const displayedStatus = displayedYear ? getAcademicYearStatus(displayedYear.startDate, displayedYear.endDate) : "UPCOMING";
  const displayedHijri = displayedYear ? getHijriYearSpan(displayedYear.startDate, displayedYear.endDate) : "";
  const displayedTermsCount = displayedYear && Array.isArray(displayedYear.terms) ? displayedYear.terms.length : 0;
  const displayedProgress = displayedYear ? getAcademicYearProgress(displayedYear.startDate, displayedYear.endDate) : null;
  const displayedTermSystemLabel = displayedYear
    ? displayedYear.termSystem === "SEMESTER"
      ? "2 Terms"
      : displayedYear.termSystem === "TRIMESTER"
      ? "3 Terms"
      : displayedYear.termSystem === "QUARTER"
      ? "4 Terms"
      : displayedYear.termSystem === "ANNUAL"
      ? "1 Term"
      : `${displayedTermsCount} Custom Terms`
    : "";

  const displayedActionMenuItems = displayedYear
    ? [
        {
          label: "Change Active Session",
          icon: SessionsIcon,
          onClick: () => {
            openDrawer("campus-action", { type: "switch_session", yearId: displayedYear.id });
          },
        },
        ...(!isDisplayedGlobalActive
          ? [
              {
                label: "Set as Active Session",
                icon: CheckCircleIcon,
                onClick: () => {
                  setActiveYear(displayedYear);
                  showToast(`Set "${displayedYear.name}" as active academic session.`, "success");
                },
              },
            ]
          : []),
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
      {/* ─── 1. Unified Active Academic Session Card ─── */}
      <div className="rounded-2xl border theme-border theme-bg-surface p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Header: Session Profile & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {displayedYear && (
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDisplayedGlobalActive
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
                  {isDisplayedGlobalActive ? (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-accent theme-accent-text shadow-2xs flex items-center gap-1">
                      <CheckCircleIcon className="w-3 h-3" />
                      <span>Active Session</span>
                    </span>
                  ) : displayedStatus === "ACTIVE" ? (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-accent">
                      Ongoing
                    </span>
                  ) : displayedStatus === "UPCOMING" ? (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-secondary">
                      Upcoming
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-sub border theme-border theme-text-muted">
                      Past Session
                    </span>
                  )}
                </div>

                <div className="text-xs font-mono theme-text-secondary mt-1 flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
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

          {/* Right Controls: Action Menu */}
          <div className="flex items-center gap-2.5 shrink-0">
            <ActionMenu items={displayedActionMenuItems} />
          </div>
        </div>

        {/* Dynamic Progress Bar & Timeline Stats */}
        {displayedProgress && (
          <div className="pt-3 border-t theme-border space-y-2">
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

      {/* ─── 2. Terms & Semesters Breakdown Table ─── */}
      {displayedYear && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 theme-accent" />
              <h5 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Terms &amp; Semesters Breakdown ({displayedTermsCount})
              </h5>
            </div>
            <span className="text-xs font-mono theme-text-secondary font-semibold">
              Total {calculateDurationDays(displayedYear.startDate, displayedYear.endDate)}
            </span>
          </div>

          <DataTable
            columns={getTermColumns(displayedYear)}
            data={displayedYear.terms || []}
            keyExtractor={(t, idx) => t.id || `term_${idx}`}
            cellPaddingClass="py-3.5 px-4 sm:px-5"
            headerCellClassName="py-3 px-4 sm:px-5 text-xs uppercase tracking-wider font-bold"
            emptyTitle="No Terms Configured"
            emptySubMessage="No semesters or terms have been configured for this academic year."
          />
        </div>
      )}
    </div>
  );
}
