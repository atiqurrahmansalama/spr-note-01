import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { formatDate } from "@/utils/reportGenerator";
import {
  CloudIcon,
  UsersIcon,
  RefreshIcon,
  TrashIcon,
  CopyIcon,
  TableIcon,
  Squares2X2Icon,
  TrendingUpIcon,
  ChevronIcon,
} from "@/components/ui/Icons";
import { ConfirmModal } from "@/components/ui/Modal";
import { useTranslation } from "@/i18n";
import CustomSelect from "@/components/ui/CustomSelect";
import IconButton from "@/components/ui/IconButton";
import SelectionActionBar from "@/components/ui/SelectionActionBar";
import { DateRangePicker } from "@/components/selectors";
import SegmentedSwitch from "@/components/ui/SegmentedSwitch";
import DailyClassroomFilterControls from "../../components/DailyClassroomFilterControls";
import { StudentSelector } from "../../components";
import { ProgressAnalyticsDashboard } from "../../components/progress-analytics";
import { normalizeToISODate } from "../../utils/dailyClassroomUtils";
import { useAcademicData } from "@/hooks/useAcademicData";
import { useTenant } from "@/context/TenantContext";
import {
  RecordReportsTable,
  RecordReportsCardGrid,
  StudentGroupedTable,
  StudentGroupedCardGrid,
  ReportContextMenu,
  SyncErrorsAlertBanner,
  ReportsTableSkeleton,
} from "./components";
import {
  useProgressReportsData,
  useProgressReportsFilters,
} from "./hooks";
import {
  ProgressReportsViewProps,
  ReportItem,
  StudentGroupedItem,
  ContextMenuState,
} from "./types";

export default function ProgressReportsView({
  hideHeader = false,
  isEmbedded = false,
  className = "",
  filterProps = null,
  defaultReportView,
}: ProgressReportsViewProps) {
  const { t } = useTranslation("progressReports");
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const academicData: any = useAcademicData() || {};
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Data management hook (IndexedDB caching, sync queue, multi-endpoint API, permanent delete)
  const {
    reportsList,
    loading,
    offline,
    isSyncing,
    isRefreshing,
    syncErrors,
    setSyncErrors,
    pendingSyncCount,
    handleRefresh,
    handleSyncOfflineReports,
    handleSyncSingleReport,
    handleSyncSelectedReports,
    reportToDelete,
    setReportToDelete,
    isDeleting,
    handleDeleteReport,
    handleConfirmDelete,
  } = useProgressReportsData({
    activeTenantId,
    academicData,
    showToast,
  });

  // 2. Filters & Selection hook (Search, department/class/section, date boundaries, grouping)
  const {
    effectiveFilterProps,
    searchQuery,
    setSearchQuery,
    selectedStudentId,
    setSelectedStudentId,
    selectedGroupFilter,
    setSelectedGroupFilter,
    selectedSessionFilter,
    setSelectedSessionFilter,
    selectedTeacherFilter,
    setSelectedTeacherFilter,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedIds,
    isAllExpanded,
    handleToggleExpandAll,
    minEarliestDate,
    todayMaxDate,
    groupOptions,
    sessionOptions,
    selectedDeptFilter,
    selectedClsFilter,
    selectedSecFilter,
    filteredReports,
    studentGroupedData,
    toggleSelectAll,
    toggleSelectReport,
    handleBatchSelect,
    handleDeselectAll,
    handleResetAllFilters,
  } = useProgressReportsFilters({
    reportsList,
    filterProps,
    academicData,
    showToast,
  });

  // View modes resolution: "RECORD_REPORTS" | "STUDENT_VIEW" synced with URL
  const getResolvedViewMode = useCallback((): "RECORD_REPORTS" | "STUDENT_VIEW" => {
    const p = window.location.pathname.toLowerCase();
    if (p.includes("/by-student")) return "STUDENT_VIEW";
    if (p.includes("/records")) return "RECORD_REPORTS";
    if (defaultReportView) return defaultReportView;
    return "RECORD_REPORTS";
  }, [defaultReportView]);

  const [viewMode, setViewMode] = useState<"RECORD_REPORTS" | "STUDENT_VIEW">(getResolvedViewMode);

  // Keep viewMode synchronized when browser navigation (back/forward) occurs
  useEffect(() => {
    const handlePopState = () => {
      const resolved = getResolvedViewMode();
      setViewMode((prev) => (prev !== resolved ? resolved : prev));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [getResolvedViewMode]);

  // Zero-flicker view mode switcher
  const handleViewModeChange = (newMode: "RECORD_REPORTS" | "STUDENT_VIEW") => {
    setViewMode(newMode);
    const targetSub = newMode === "STUDENT_VIEW" ? "by-student" : "records";
    const p = window.location.pathname.toLowerCase();
    let targetPath = `/studies/progress-reports/${targetSub}`;
    if (p.includes("/by-student") || p.includes("/records")) {
      targetPath = window.location.pathname.replace(/\/by-student|\/records/i, `/${targetSub}`);
    } else if (p.includes("/progress-reports")) {
      targetPath = `${window.location.pathname.replace(/\/$/, "")}/${targetSub}`;
    }
    const finalUrl = `${targetPath}${window.location.search}`;
    // Using window.history.replaceState avoids router remounting that caused flicker
    window.history.replaceState(null, "", finalUrl);
  };

  // Layout mode: "table" | "card" (persisted across sessions)
  const [layoutMode, setLayoutMode] = useState<"table" | "card">(() => {
    try {
      return (localStorage.getItem("spr_progress_reports_layout") as "table" | "card") || "table";
    } catch {
      return "table";
    }
  });

  const handleLayoutModeChange = (mode: "table" | "card") => {
    setLayoutMode(mode);
    try {
      localStorage.setItem("spr_progress_reports_layout", mode);
    } catch {}
  };

  // Collapsible Analytics State (persisted & synced with ?analytics=true)
  const [showAnalytics, setShowAnalytics] = useState<boolean>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("analytics") === "true") return true;
      return localStorage.getItem("spr_progress_reports_show_analytics") === "true";
    } catch {
      return false;
    }
  });

  const handleToggleAnalytics = () => {
    setShowAnalytics((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("spr_progress_reports_show_analytics", String(next));
      } catch {}
      return next;
    });
  };

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const getActiveTargetReports = useCallback((targetReports: any = null): ReportItem[] => {
    if (Array.isArray(targetReports)) return targetReports;
    if (targetReports && typeof targetReports === "object" && !Array.isArray(targetReports)) {
      return [targetReports];
    }
    if (selectedIds.size > 0) {
      return filteredReports.filter((r) => {
        const id = r.id;
        const uniqId = r.report_unique_id;
        const srvId = r.server_id;
        return (
          (id !== undefined && id !== null && (selectedIds.has(id) || selectedIds.has(String(id)) || (!isNaN(Number(id)) && selectedIds.has(Number(id))))) ||
          (uniqId && (selectedIds.has(uniqId) || selectedIds.has(String(uniqId)))) ||
          (srvId !== undefined && srvId !== null && (selectedIds.has(srvId) || selectedIds.has(String(srvId)) || (!isNaN(Number(srvId)) && selectedIds.has(Number(srvId)))))
        );
      });
    }
    return filteredReports;
  }, [selectedIds, filteredReports]);

  // Context Menu triggers
  const handleContextMenu = (e: React.MouseEvent, report: ReportItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      report,
      targetList: [report],
    });
  };

  const handleStudentContextMenu = (e: React.MouseEvent, studentObj: StudentGroupedItem) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      report: studentObj.reports[0] || { student_name: studentObj.student_name, session_name: "All Student Reports" },
      targetList: studentObj.reports,
    });
  };

  // Action: Copy Text Report Summary
  const handleCopyTextReport = (target: any) => {
    const reportsToCopy = getActiveTargetReports(target);
    if (reportsToCopy.length === 0) return;

    const formattedTexts = reportsToCopy.map(
      (rep) =>
        `Student: ${rep.student_name} (${rep.student_group})\nDate: ${rep.formattedDate} ${rep.formattedTime}\nSession: ${rep.session_name}\nPages: ${rep.totalPages}p | Mistakes: ${rep.mistakesCount} | Stucks: ${rep.stucksCount}\nComment: ${rep.comment || "N/A"}`
    );

    navigator.clipboard.writeText(formattedTexts.join("\n\n---\n\n"));
    showToast(`Copied summary for ${reportsToCopy.length} report(s)!`, "info");
  };

  // Edit single report
  const handleEditReport = (rep: ReportItem) => {
    const isBook = Boolean(
      rep.mode === "BOOK" ||
      rep.progress_mode === "BOOK" ||
      rep.curriculum_book_name ||
      rep.book_name ||
      rep.book_title ||
      rep.lesson_title ||
      rep.lesson_covered ||
      (Array.isArray(rep.bookPageData) && rep.bookPageData.length > 0)
    );
    const targetMode = isBook ? "book" : "quran";
    const rawDate = rep.report_date || rep.isoDateOnly || rep.date || rep.record_date || rep.selectedDate;
    const normalizedDate = normalizeToISODate(rawDate);
    const query = normalizedDate ? `?date=${encodeURIComponent(normalizedDate)}` : "";

    localStorage.setItem("spr_daily_progress_mode", isBook ? "BOOK" : "QURAN");
    localStorage.setItem("spr_editing_report", JSON.stringify(rep));
    window.dispatchEvent(new CustomEvent("spr_daily_progress_mode_change", { detail: isBook ? "BOOK" : "QURAN" }));
    window.dispatchEvent(new CustomEvent("spr_edit_report", { detail: rep }));
    navigate(`/studies/daily-progress/${targetMode}${query}`);
    showToast(`Loaded report for "${rep.student_name}" for editing!`, "info");
  };

  // Batch delete selected reports
  const handleBatchDeleteReports = () => {
    const selected = getActiveTargetReports();
    if (selected.length === 0) return;
    setReportToDelete(selected);
  };

  // Reusable Table Action Toolbar
  const renderTableActionToolbar = (extraRightControls?: React.ReactNode) => {
    if (selectedIds.size > 0) {
      return (
        <SelectionActionBar
          fullWidth={true}
          bordered={false}
          selectedCount={selectedIds.size}
          totalCount={filteredReports.length}
          onToggleSelectAll={toggleSelectAll}
          onClearSelection={handleDeselectAll}
          actions={[
            {
              id: "sync",
              label: `Sync to DB (${selectedIds.size})`,
              shortLabel: `Sync to DB (${selectedIds.size})`,
              icon: CloudIcon,
              variant: "sub",
              disabled: offline || isSyncing,
              loading: isSyncing,
              onClick: () => handleSyncSelectedReports(getActiveTargetReports()),
            },
            {
              id: "copy",
              label: `Copy Summary (${selectedIds.size})`,
              shortLabel: "Copy Summary",
              icon: CopyIcon,
              variant: "sub",
              onClick: () => handleCopyTextReport(getActiveTargetReports()),
            },
            {
              id: "delete",
              label: `Delete (${selectedIds.size})`,
              shortLabel: `Delete (${selectedIds.size})`,
              icon: TrashIcon,
              variant: "danger",
              disabled: isDeleting,
              onClick: handleBatchDeleteReports,
            },
          ]}
        />
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 w-full">
        {/* Left: Reports Count */}
        <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-semibold theme-text-secondary select-none">
          <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
          <span className="theme-text-primary font-bold">
            {filteredReports.length} / {reportsList.length}
          </span>
          <span>Reports</span>
        </div>

        {/* Center: Reusable Segmented Switch (Record Reports vs By Student) */}
        <div className="flex items-center justify-center">
          <SegmentedSwitch<"RECORD_REPORTS" | "STUDENT_VIEW">
            value={viewMode}
            onChange={handleViewModeChange}
            options={[
              {
                value: "RECORD_REPORTS",
                label: "Record Reports",
                icon: CloudIcon,
              },
              {
                value: "STUDENT_VIEW",
                label: "By Student",
                icon: UsersIcon,
              },
            ]}
          />
        </div>

        {/* Right: Actions / Pending Sync + Cards/Table Toggle + Extra Controls */}
        <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0">
          {pendingSyncCount > 0 && !offline && (
            <button
              type="button"
              onClick={handleSyncOfflineReports}
              disabled={loading || isSyncing}
              className="py-1 px-2.5 rounded-xl text-xs font-semibold theme-bg-amber/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sync offline reports to database"
            >
              {isSyncing ? (
                <RefreshIcon className="w-3.5 h-3.5 shrink-0 animate-spin" />
              ) : (
                <CloudIcon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {isSyncing ? "Syncing..." : `Sync to DB (${pendingSyncCount})`}
              </span>
            </button>
          )}

          {/* Expand All / Collapse All Button when Analytics is Expanded */}
          {showAnalytics && (
            <button
              type="button"
              onClick={handleToggleExpandAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
              title={isAllExpanded ? t("collapseAll", "Collapse All") : t("expandAll", "Expand All")}
            >
              <ChevronIcon isOpen={isAllExpanded} className="w-3.5 h-3.5 shrink-0" />
              <span>{isAllExpanded ? t("collapseAll", "Collapse All") : t("expandAll", "Expand All")}</span>
            </button>
          )}

          {/* Single Toggle Button for Cards / Table View */}
          <button
            type="button"
            onClick={() => handleLayoutModeChange(layoutMode === "card" ? "table" : "card")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none"
            title={layoutMode === "card" ? "Switch to Table View" : "Switch to Cards View"}
          >
            {layoutMode === "card" ? (
              <>
                <TableIcon className="w-3.5 h-3.5 theme-accent" />
                <span>Table</span>
              </>
            ) : (
              <>
                <Squares2X2Icon className="w-3.5 h-3.5 theme-accent" />
                <span>Cards</span>
              </>
            )}
          </button>

          {extraRightControls}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${isEmbedded ? "" : "max-w-6xl mx-auto"} space-y-4 theme-text-primary flex flex-col items-center justify-start ${
        isEmbedded ? "py-1 px-0" : "py-4 px-3 sm:px-6"
      } ${className}`}
    >
      {/* 1. Primary Filter Controls */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        collapsible={true}
        filterProps={effectiveFilterProps}
        showPeriodSwitcher={false}
        hasTeachers={true}
        selectedTeacherId={selectedTeacherFilter}
        onTeacherChange={(tId: any) => setSelectedTeacherFilter(tId ? String(tId) : "ALL")}
        searchControl={
          <StudentSelector
            studentName={searchQuery}
            studentId={selectedStudentId}
            departmentId={selectedDeptFilter}
            classId={selectedClsFilter}
            sectionId={selectedSecFilter}
            size="md"
            label="STUDENT"
            placeholder="Search student, session, roll..."
            onStudentSelect={(selected) => {
              if (!selected) {
                setSearchQuery("");
                setSelectedStudentId(null);
              } else if (typeof selected === "string") {
                setSearchQuery(selected);
                setSelectedStudentId(null);
              } else {
                setSearchQuery(selected.label || selected.name || "");
                setSelectedStudentId(selected.id ? String(selected.id) : null);
              }
            }}
          />
        }
        sessionControl={
          <CustomSelect
            label="Session"
            placeholder="All Sessions"
            options={sessionOptions}
            value={selectedSessionFilter === "ALL" ? "" : selectedSessionFilter}
            onChange={(val: any) => {
              const selectedVal = typeof val === "object" ? (val?.value || val?.id) : val;
              setSelectedSessionFilter(selectedVal || "ALL");
            }}
            size="md"
          />
        }
        customDateComponent={
          <DateRangePicker
            label="Date Range"
            showTimezone={true}
            timezoneLink="/admin-tools?tab=classroom-config"
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={(start: string, end: string) => {
              setStartDate(start);
              setEndDate(end);
            }}
            minDate={minEarliestDate}
            maxDate={todayMaxDate}
            isHijriEnabled={false}
            onReset={() => {
              setStartDate("");
              setEndDate("");
            }}
          />
        }
      >
        {/* Filter Box Bottom Footer Row */}
        <div className="pt-2.5 border-t theme-border w-full">
          {showAnalytics ? (
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 text-xs font-semibold theme-text-secondary select-none">
                <span className="w-2 h-2 rounded-full theme-bg-accent animate-pulse shrink-0" />
                <span className="theme-text-primary font-bold">
                  {filteredReports.length} / {reportsList.length}
                </span>
                <span>Reports Filtered</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleAnalytics}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none theme-bg-accent theme-accent-text border-[var(--accent-main)]"
                  title={t("hideAnalytics", "Hide Analytics")}
                >
                  <TrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("hideAnalytics", "Hide Analytics")}</span>
                  <ChevronIcon isOpen={true} className="w-3 h-3 shrink-0" />
                </button>

                <IconButton
                  icon={RefreshIcon}
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={isRefreshing || isSyncing}
                  variant="sub"
                  size="sm"
                  shape="rounded"
                  title="Refresh Reports & Sync with Database"
                  ariaLabel="Refresh Reports & Sync with Database"
                />
              </div>
            </div>
          ) : (
            renderTableActionToolbar(
              <>
                <button
                  type="button"
                  onClick={handleToggleAnalytics}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary"
                  title={t("showAnalytics", "Show Analytics")}
                >
                  <TrendingUpIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("analytics", "Analytics")}</span>
                  <ChevronIcon isOpen={false} className="w-3 h-3 shrink-0" />
                </button>

                <IconButton
                  icon={RefreshIcon}
                  onClick={handleRefresh}
                  loading={isRefreshing}
                  disabled={isRefreshing || isSyncing}
                  variant="sub"
                  size="sm"
                  shape="rounded"
                  title="Refresh Reports & Sync with Database"
                  ariaLabel="Refresh Reports & Sync with Database"
                />
              </>
            )
          )}
        </div>
      </DailyClassroomFilterControls>

      {/* 2. Real-Time Analytics & Trends Dashboard */}
      {showAnalytics && (
        <ProgressAnalyticsDashboard
          reports={filteredReports}
          startDate={startDate}
          endDate={endDate}
          variant="full"
          collapsible={false}
          className="w-full"
        />
      )}

      {/* 2a. Sync Errors Alert Banner */}
      {syncErrors && syncErrors.length > 0 && (
        <SyncErrorsAlertBanner
          syncErrors={syncErrors}
          reportsList={reportsList}
          isSyncing={isSyncing}
          loading={loading}
          onRetrySync={handleSyncOfflineReports}
          onDismiss={() => setSyncErrors(null)}
          onEditReport={handleEditReport}
          onDeleteReport={handleDeleteReport}
        />
      )}

      {/* 2b. Offline Banner */}
      {offline && (
        <div className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs">
            Offline mode active — showing cached reports from LocalStorage.
          </span>
        </div>
      )}

      {/* 2c. Dedicated Table Controls Box when Analytics is Expanded */}
      {showAnalytics && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-2.5 sm:px-4 sm:py-2.5 shadow-2xs select-none">
          {renderTableActionToolbar()}
        </div>
      )}

      {/* VIEW MODES */}
      {loading ? (
        <ReportsTableSkeleton />
      ) : (
        <>
          {viewMode === "RECORD_REPORTS" && (
            layoutMode === "table" ? (
              <RecordReportsTable
                reports={filteredReports}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            ) : (
              <RecordReportsCardGrid
                reports={filteredReports}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            )
          )}

          {viewMode === "STUDENT_VIEW" && (
            layoutMode === "table" ? (
              <StudentGroupedTable
                studentGroupedData={studentGroupedData}
                reportsList={reportsList}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onStudentContextMenu={handleStudentContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            ) : (
              <StudentGroupedCardGrid
                studentGroupedData={studentGroupedData}
                reportsList={reportsList}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelectReport}
                onBatchSelect={handleBatchSelect}
                onDeselectAll={handleDeselectAll}
                onContextMenu={handleContextMenu}
                onStudentContextMenu={handleStudentContextMenu}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
                onSync={handleSyncSingleReport}
                onCopyText={(rep) => handleCopyTextReport(rep)}
                onResetFilters={handleResetAllFilters}
                onRefresh={handleRefresh}
                isAllExpanded={isAllExpanded}
                onToggleExpandAll={handleToggleExpandAll}
                hideBatchToolbar={showAnalytics}
              />
            )
          )}
        </>
      )}

      {/* Right Click Popup Context Menu */}
      {contextMenu && (
        <ReportContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          report={contextMenu.report}
          targetList={contextMenu.targetList}
          onClose={() => setContextMenu(null)}
          onSync={handleSyncSingleReport}
          onCopyText={() => handleCopyTextReport(contextMenu.targetList || contextMenu.report)}
          onEdit={handleEditReport}
          onDelete={handleDeleteReport}
        />
      )}

      {/* Reusable Enterprise Delete Confirmation Modal */}
      {reportToDelete && (
        <ConfirmModal
          isOpen={Boolean(reportToDelete)}
          onClose={() => !isDeleting && setReportToDelete(null)}
          onConfirm={handleConfirmDelete}
          confirmLoading={isDeleting}
          title={
            Array.isArray(reportToDelete)
              ? t("deleteBatchReportsTitle", `Delete ${reportToDelete.length} Progress Reports`)
              : t("deleteReportTitle", "Delete Progress Report")
          }
          subtitle={
            Array.isArray(reportToDelete)
              ? t(
                  "deleteBatchReportsSubtitle",
                  `Are you sure you want to permanently delete ${reportToDelete.length} selected progress reports? This action cannot be undone.`
                )
              : t(
                  "deleteReportSubtitle",
                  `Are you sure you want to delete report "${reportToDelete.report_unique_id || `#${reportToDelete.id}`}" for ${reportToDelete.student_name}?`
                )
          }
          confirmText={t("delete", "Delete")}
          cancelText={t("cancel", "Cancel")}
          confirmVariant="danger"
          confirmIcon={TrashIcon}
          summaryItems={
            Array.isArray(reportToDelete)
              ? [
                  {
                    label: t("totalSelected", "Total Selected"),
                    value: `${reportToDelete.length} reports`,
                  },
                ]
              : [
                  {
                    label: t("student", "Student"),
                    value: reportToDelete.student_name,
                    subLabel:
                      reportToDelete.student_unique_id ||
                      (reportToDelete.student_roll ? `Roll ${reportToDelete.student_roll}` : undefined),
                  },
                  {
                    label: t("reportId", "Report ID"),
                    value: reportToDelete.report_unique_id || `#${reportToDelete.id}`,
                  },
                  {
                    label: t("date", "Date"),
                    value: formatDate(reportToDelete.date || reportToDelete.created_at || ""),
                  },
                ]
          }
        />
      )}
    </div>
  );
}
