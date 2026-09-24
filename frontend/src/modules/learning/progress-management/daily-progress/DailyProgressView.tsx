import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { DocLabQuickReportModal } from "@/components/print";
import {
  DAILY_PROGRESS_SCOPE_ID,
  buildDailyProgressReportData,
} from "./dailyProgressDocLabKeys";
import SkeletonLoader from "@/components/common/SkeletonLoader";
import { PageContainer } from "@/components/layout";
import { useToast } from "@/context/ToastContext";
import { useFont } from "@/context/useFont";
import { useUndoRedo } from "@/context/useUndoRedo";
import {
  ClockIcon,
  CloseIcon,
  EditIcon,
  RefreshIcon,
  DragHandleIcon,
} from "@/components/ui/Icons";
import IconButton from "@/components/ui/IconButton";
import CustomButton from "@/components/ui/CustomButton";
import CustomInput from "@/components/ui/CustomInput";
import CustomSelect from "@/components/ui/CustomSelect";
import PageRangeInput, { type PageRange } from "@/components/ui/PageRangeInput";
import TemplateTextarea from "@/components/ui/TemplateTextarea";
import AutocompleteDropdown, { AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import { useFeatureControl } from "@/context/FeatureControlContext";
import DailyClassroomFilterControls from "../../components/DailyClassroomFilterControls";
import { useAcademicData } from "@/hooks/useAcademicData";
import {
  students as studentStore,
  sessions as sessionStore,
  savedComments as commentStore,
  isOnline,
  mergeStudents,
  mergeSessions,
  mergeComments,
  draftReport,
  saveStatusStore,
} from "@/utils/localStore";
import {
  saveReportLocally,
  syncSessionsAndComments,
  scheduleGracePeriodSync,
  clearGracePeriodTimer,
} from "@/utils/syncEngine";
import { fetchWithAuth } from "@/utils/authService";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
  getDepartmentId,
  getClassId,
  getSectionId,
} from "../../utils/dailyClassroomUtils";
import { sortStudentsByUsage, recordStudentUsage } from "@/utils/studentUsageTracker";
import { getClassroomTodayDate } from "@/constants/calendarConstants";
import { handleEnterFocusNext, handleBackspaceFocusPrev } from "@/utils/keyboardUtils";

// ══════════════════════════════════════════════════════════════════════════════
// 1. DOMAIN RULES & QURAN RECITATION SESSION
// ══════════════════════════════════════════════════════════════════════════════

export const QURAN_RULES = {
  MIN_JUZ: 1,
  MAX_JUZ: 30,
  MIN_PAGE: 1,
  MIN_AYAH: 1,
  MAX_AYAH: 286,
} as const;

export function getMaxPageForJuz(juzNum?: string | number): number {
  if (!juzNum || String(juzNum).trim() === "") return 25;
  const j = parseInt(String(juzNum), 10);
  if (isNaN(j)) return 25;
  if (j === 30) return 25;
  if (j === 29) return 24;
  if (j >= 1 && j <= 28) return 20;
  return 25;
}

export function getJuzPageBounds(
  juzNum?: string | number,
  juzPageData?: any[]
): { minPage: number; maxPage: number } {
  let effectiveJuz = juzNum;
  if (
    (effectiveJuz === undefined || effectiveJuz === null || String(effectiveJuz).trim() === "") &&
    Array.isArray(juzPageData)
  ) {
    const activeRow = juzPageData.find((r) => r.juz && String(r.juz).trim() !== "");
    if (activeRow) {
      effectiveJuz = activeRow.juz;
    }
  }

  const defaultMax = getMaxPageForJuz(effectiveJuz);

  if (juzPageData && Array.isArray(juzPageData) && juzPageData.length > 0 && effectiveJuz) {
    const matchingRows = juzPageData.filter(
      (row) => row.juz && String(row.juz).trim() === String(effectiveJuz).trim()
    );

    if (matchingRows.length > 0) {
      let maxEnd = -Infinity;
      matchingRows.forEach((row) => {
        (row.ranges || []).forEach((r: any) => {
          const e = parseInt(String(r.end), 10);
          if (!isNaN(e) && e > 0 && e > maxEnd) maxEnd = e;
        });
      });

      const effectiveMax =
        maxEnd !== -Infinity && maxEnd >= 1
          ? Math.max(maxEnd, defaultMax)
          : defaultMax;

      return { minPage: 1, maxPage: effectiveMax };
    }
  }

  return { minPage: 1, maxPage: defaultMax };
}

class QuranTrackingSessionStore {
  private lastPage: number | null = null;
  private lastAyah: number | null = null;
  private listeners: Set<() => void> = new Set();

  getLastPage(): number | null {
    return this.lastPage;
  }

  getLastAyah(): number | null {
    return this.lastAyah;
  }

  setLastPage(val: string | number | null | undefined) {
    if (val === "" || val === null || val === undefined) return;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      if (this.lastPage !== num) {
        this.lastPage = num;
        this.notify();
      }
    }
  }

  setLastAyah(val: string | number | null | undefined) {
    if (val === "" || val === null || val === undefined) return;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      if (this.lastAyah !== num) {
        this.lastAyah = num;
        this.notify();
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset() {
    this.lastPage = null;
    this.lastAyah = null;
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error in QuranTrackingSessionStore listener", err);
      }
    });
  }
}

export const quranTrackingSession = new QuranTrackingSessionStore();

export function useQuranTrackingSession() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return quranTrackingSession.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    lastPage: quranTrackingSession.getLastPage(),
    lastAyah: quranTrackingSession.getLastAyah(),
    setLastPage: (val: string | number | null | undefined) => quranTrackingSession.setLastPage(val),
    setLastAyah: (val: string | number | null | undefined) => quranTrackingSession.setLastAyah(val),
    resetSession: () => quranTrackingSession.reset(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. TYPE DEFINITIONS & INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface DetailAyahItem {
  id: string;
  value: string | number;
}

export interface DetailRowData {
  id: string;
  juz: string | number;
  page: string | number;
  ayahs: DetailAyahItem[];
}

export interface JuzRowData {
  id: string;
  juz: string | number;
  juzInputId?: string;
  ranges: PageRange[];
}

export interface DailyProgressDraft {
  id: string;
  studentName?: string;
  groupName?: string;
  selectedSession?: string;
  selectedDate?: string;
  juzPageData?: JuzRowData[];
  mistakeData?: DetailRowData[];
  stuckData?: DetailRowData[];
  comment?: string;
  savedAtDate?: string;
  savedAtTime?: string;
  timestamp?: number;
}

export interface DailyProgressData {
  studentName?: string;
  groupName?: string;
  departmentName?: string;
  className?: string;
  sectionName?: string;
  selectedSession?: string;
  selectedDate?: string;
  juzPageData?: JuzRowData[];
  mistakeData?: DetailRowData[];
  stuckData?: DetailRowData[];
  comment?: string;
  report_unique_id?: string;
  id?: string;
  teacherName?: string;
  formattedDate?: string;
}

export interface SectionVisibilityConfig {
  headerDate?: { enabled?: boolean };
  studentSelect?: { enabled?: boolean };
  sessionSelect?: { enabled?: boolean };
  juzPageInput?: { enabled?: boolean };
  mistakeTracker?: { enabled?: boolean };
  stuckTracker?: { enabled?: boolean };
  commentSection?: { enabled?: boolean };
  actionButtons?: { enabled?: boolean };
  pdfExport?: { enabled?: boolean };
}

export interface StudentProfileOption {
  id?: string | number;
  label?: string;
  name?: string;
  name_en?: string;
  sub?: string;
  group_name?: string;
  section_name?: string;
  student_class_name?: string;
  department?: string | number;
  department_id?: string | number;
  department_name?: string;
  student_class?: string | number;
  class_id?: string | number;
  student_section?: string | number;
  section_id?: string | number;
  roll_number?: number | string;
  student_id_card_number?: string;
  uniq_id?: string;
  badge?: string;
  originalData?: any;
}

export interface SessionItem {
  name?: string;
  label?: string;
  value?: string;
}

export interface DailyProgressFilterProps {
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  dateFormat?: string;
  selectedDepartmentId?: string;
  onDepartmentChange?: (val: string) => void;
  departmentSelectOptions?: Array<{ label: string; value: string; [key: string]: any }>;
  hasDepartments?: boolean;
  selectedClassId?: string;
  onClassChange?: (val: string) => void;
  classSelectOptions?: Array<{ label: string; value: string; [key: string]: any }>;
  selectedSectionId?: string;
  onSectionChange?: (val: string) => void;
  sectionSelectOptions?: Array<{ label: string; value: string; [key: string]: any }>;
  hasSectionsForClass?: boolean;
  onBatchHierarchyChange?: (params: { departmentId?: string; classId?: string; sectionId?: string }) => void;
  setAcademicFilters?: (params: { departmentId?: string; classId?: string; sectionId?: string }) => void;
  [key: string]: any;
}

export interface DailyProgressViewProps {
  timeZone?: string;
  dateFormat?: string;
  filterProps?: DailyProgressFilterProps | null;
  isEmbedded?: boolean;
  maxWidth?: "full" | "7xl" | "6xl" | "5xl" | "4xl" | "3xl";
  className?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. UI ACTION & ROW BUTTON COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

export function RowRemoveButton({
  onRemove,
  title = "Remove Row",
  className = "",
}: {
  onRemove?: () => void;
  title?: string;
  className?: string;
}) {
  if (!onRemove) return <div className="shrink-0" />;
  return (
    <button
      type="button"
      onClick={onRemove}
      className={`p-1 theme-text-secondary hover:theme-danger transition-colors shrink-0 flex items-center justify-center h-[38px] sm:h-10 cursor-pointer ml-auto ${className}`}
      title={title}
    >
      <CloseIcon className="w-3.5 h-3.5" />
    </button>
  );
}

export function RowAddCircleButton({
  onAdd,
  title = "Add",
  className = "",
}: {
  onAdd: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`w-5 h-5 sm:w-6 sm:h-6 text-xs sm:text-sm rounded-full border theme-border flex items-center justify-center theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated transition-all shrink-0 cursor-pointer ${className}`}
      title={title}
    >
      +
    </button>
  );
}

export function SectionHeaderBar({
  title,
  count = 0,
  showReset = false,
  onReset,
  resetTitle = "Reset",
}: {
  title: string;
  count?: number;
  showReset?: boolean;
  onReset?: () => void;
  resetTitle?: string;
}) {
  return (
    <div className="flex items-center justify-between min-h-[34px] sm:min-h-[38px] mb-2 sm:mb-2.5 select-none">
      <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
        {title}
        {count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border theme-border font-mono shadow-sm">
            {count}
          </span>
        )}
      </h3>
      {showReset && onReset ? (
        <IconButton
          icon={RefreshIcon}
          size="sm"
          variant="ghost"
          shape="circle"
          onClick={onReset}
          title={resetTitle}
          ariaLabel={resetTitle}
          className="hover:text-rose-400 hover:!text-rose-400 active:text-rose-500 shrink-0"
        />
      ) : (
        <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 pointer-events-none opacity-0" />
      )}
    </div>
  );
}

export function AddMoreSectionButton({
  onClick,
  label = "+ Add More",
  className = "",
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex justify-center sm:justify-start sm:pl-[80px] pt-3.5 mt-2 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className="px-4 py-1.5 rounded-full border theme-border border-dashed hover:border-solid theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary text-xs font-semibold transition-all cursor-pointer shadow-sm"
      >
        {label}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. SUB-COMPONENTS (STUDENT, SESSION, QURAN JUZ, DETAIL ROWS, COMMENTS)
// ══════════════════════════════════════════════════════════════════════════════

export function StudentInputSection({
  studentDatabase = [],
  studentName = "",
  studentId = null,
  departmentId,
  classId,
  sectionId,
  onStudentSelect,
}: {
  studentDatabase?: StudentProfileOption[];
  studentName?: string;
  studentId?: string | number | null;
  departmentId?: string;
  classId?: string;
  sectionId?: string;
  onStudentSelect?: (selected: StudentProfileOption | string) => void;
}) {
  const options: AutocompleteOption[] = useMemo(() => {
    return (studentDatabase || []).map((s: any) => {
      const clsName =
        typeof s === "object"
          ? s.student_class_name || s.class_name || (typeof s.class === "object" ? s.class?.name : null) || ""
          : "";
      const secName =
        typeof s === "object"
          ? s.section_name || s.student_section_name || (typeof s.section === "object" ? s.section?.name : null) || ""
          : "";

      let subVal = "";
      if (clsName && secName) {
        subVal = `${clsName} • ${secName}`;
      } else if (secName) {
        subVal = secName;
      } else if (clsName) {
        subVal = clsName;
      } else if (typeof s === "object" && s?.sub) {
        subVal = String(s.sub);
      } else if (typeof s === "object" && (s?.group_name || s?.group)) {
        subVal = String(s.group_name || s.group);
      }

      const deptVal =
        typeof s === "object" && (s.department || s.department_id)
          ? String(s.department || s.department_id)
          : undefined;
      const classVal =
        typeof s === "object" && (s.student_class || s.class_id || s.class)
          ? String(s.student_class || s.class_id || s.class)
          : undefined;
      const secVal =
        typeof s === "object" && (s.student_section || s.section_id || s.section)
          ? String(s.student_section || s.section_id || s.section)
          : undefined;

      const roll = typeof s === "object" ? (s.roll_number ?? s.originalData?.roll_number) : undefined;
      const cardNo = typeof s === "object" ? (s.student_id_card_number ?? s.originalData?.student_id_card_number) : undefined;
      const uniq = typeof s === "object" ? (s.uniq_id ?? s.originalData?.uniq_id) : undefined;
      const rawId = typeof s === "object" ? (s.id ?? s.student_id ?? s.originalData?.id) : undefined;
      const badge =
        typeof s === "object" && s.badge
          ? s.badge
          : roll != null
          ? `Roll: ${roll}`
          : cardNo
          ? `ID: ${cardNo}`
          : uniq
          ? `ID: ${uniq}`
          : rawId != null
          ? `ID: ${rawId}`
          : undefined;

      return {
        id: rawId != null ? String(rawId) : undefined,
        label: typeof s === "object" ? s.label || s.name_en || s.name || "" : String(s || ""),
        sub: subVal || undefined,
        badge,
        roll_number: roll,
        student_id_card_number: cardNo,
        uniq_id: uniq,
        department: deptVal,
        department_name: typeof s === "object" ? s.department_name : undefined,
        student_class: classVal,
        student_class_name: clsName || undefined,
        student_section: secVal,
        section_name: secName || undefined,
        originalData: s,
      };
    });
  }, [studentDatabase]);

  const handleSelect = (option: any) => {
    if (!onStudentSelect) return;
    if (typeof option === "string") {
      onStudentSelect(option);
      return;
    }
    if (typeof option === "object" && option !== null) {
      const safeSub = typeof option?.sub === "string" ? option.sub : undefined;
      onStudentSelect({
        id: option.id,
        label: typeof option.label === "string" ? option.label : String(option.label || ""),
        name: typeof option.label === "string" ? option.label : String(option.label || ""),
        sub: safeSub,
        group_name: safeSub,
        roll_number: option.roll_number,
        student_id_card_number: option.student_id_card_number,
        uniq_id: option.uniq_id,
        badge: option.badge,
        department: option.department,
        department_name: option.department_name,
        student_class: option.student_class,
        student_class_name: option.student_class_name,
        student_section: option.student_section,
        section_name: option.section_name,
        originalData: option.originalData || option,
      });
    }
  };

  const getActionUrl = (searchTerm: string) => {
    const effectiveName = (searchTerm || studentName || "").trim();
    const params = new URLSearchParams();
    params.set("tab", "quick");
    if (effectiveName) params.set("name", effectiveName);
    if (departmentId && String(departmentId) !== "ALL") params.set("dept", String(departmentId));
    if (classId && String(classId) !== "ALL") params.set("class", String(classId));
    if (sectionId && String(sectionId) !== "ALL") params.set("section", String(sectionId));
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    const returnToUrl = currentPath ? `${currentPath}${currentSearch || ""}` : "/studies/daily-progress";
    params.set("returnTo", returnToUrl);
    return `/admission?${params.toString()}`;
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={options}
        value={studentName}
        selectedId={studentId ? String(studentId) : undefined}
        onChange={handleSelect}
        onQueryChange={(val) => onStudentSelect && onStudentSelect(val)}
        placeholder="Enter student name..."
        label="STUDENT"
        actionLabel="+ Add Student"
        actionTo={getActionUrl}
        actionTitle="Add new student (Quick Admission)"
        size="md"
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}

export function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
}: {
  sessionList?: (string | SessionItem)[];
  selectedSession?: string;
  onSessionChange?: (val: string) => void;
}) {
  const sessionOptions: AutocompleteOption[] = useMemo(() => {
    return sessionList.map((s) => ({
      label: typeof s === "object" ? (s.name || s.label || "") : String(s),
      value: typeof s === "object" ? (s.name || s.value || "") : String(s),
    }));
  }, [sessionList]);

  const handleSelectOption = (option: any) => {
    if (!onSessionChange) return;
    if (typeof option === "string") {
      onSessionChange(option);
    } else if (typeof option === "object" && option !== null) {
      onSessionChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={sessionOptions}
        value={selectedSession}
        onChange={handleSelectOption}
        onQueryChange={(val) => onSessionChange && onSessionChange(val || "")}
        placeholder="e.g. Sobok, Dour..."
        label="SESSION"
        actionLabel="+ Add Session"
        actionTo="/admin-tools?tab=report-sessions"
        actionTitle="Add or manage sessions"
        size="md"
      />
    </div>
  );
}

export function JuzRow({
  rowData,
  onChange,
  onRemoveJuz,
  onAddJuz,
}: {
  rowData: JuzRowData;
  onChange: (updater: (prevRow: JuzRowData) => JuzRowData) => void;
  onRemoveJuz?: () => void;
  onAddJuz?: () => void;
}) {
  const handleJuzChange = (val: string | number) => {
    onChange((prevRow) => ({ ...prevRow, juz: val }));
  };

  const handleJuzBlur = () => {
    if (rowData.juz !== "" && rowData.juz !== undefined && rowData.juz !== null) {
      let j = parseInt(String(rowData.juz), 10);
      if (!isNaN(j)) {
        if (j < QURAN_RULES.MIN_JUZ) j = QURAN_RULES.MIN_JUZ;
        if (j > QURAN_RULES.MAX_JUZ) j = QURAN_RULES.MAX_JUZ;
        if (j !== Number(rowData.juz)) handleJuzChange(j);
      }
    }
  };

  const handleRangeChange = (index: number, newRange: PageRange) => {
    onChange((prevRow) => {
      const newRanges = [...prevRow.ranges];
      newRanges[index] = newRange;
      return { ...prevRow, ranges: newRanges };
    });
  };

  const addRange = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ranges: [...prevRow.ranges, { id: newId, start: "", end: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`${newId}-start`);
      if (el) el.focus();
    }, 100);
  };

  const removeRange = (index: number) => {
    onChange((prevRow) => {
      if (prevRow.ranges.length > 1) {
        const newRanges = prevRow.ranges.filter((_, idx) => idx !== index);
        return { ...prevRow, ranges: newRanges };
      }
      return prevRow;
    });
  };

  return (
    <div className="flex items-start gap-2 sm:gap-4 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group hover:theme-bg-elevated transition-colors duration-150 select-none">
      <div className="flex items-center gap-1 shrink-0 h-[38px] sm:h-10 self-start">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary select-none">Juz</label>
        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm shrink-0 transition-all focus-within:border-[var(--accent-main)]/50 focus-within:ring-1 focus-within:ring-[var(--accent-main)]/30 flex items-center justify-center">
          <CustomInput
            id={rowData.juzInputId}
            type="number"
            variant="borderless"
            scrollable={true}
            allowDecimals={false}
            value={rowData.juz}
            onChange={handleJuzChange}
            onBlur={handleJuzBlur}
            onEnter={handleEnterFocusNext}
            onAddShift={onAddJuz}
            onEmptyBackspace={(e: any) => {
              if (onRemoveJuz) onRemoveJuz();
              handleBackspaceFocusPrev(e, true);
            }}
            min={QURAN_RULES.MIN_JUZ}
            max={QURAN_RULES.MAX_JUZ}
            placeholder="--"
            className="w-full h-full p-0 min-h-0"
            wrapperClassName="w-full h-full"
            inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
        {(rowData.ranges || []).map((range, index) => {
          const isLastRange = index === (rowData.ranges?.length || 0) - 1;
          return (
            <div key={range.id || index} className="flex items-center gap-1.5 shrink-0">
              <PageRangeInput
                idPrefix={range.id}
                startValue={range.start}
                endValue={range.end}
                min={QURAN_RULES.MIN_PAGE}
                max={getMaxPageForJuz(rowData.juz)}
                onChange={(newRange) => handleRangeChange(index, newRange)}
                onRemove={index > 0 ? () => removeRange(index) : undefined}
                onAddShift={isLastRange ? addRange : undefined}
                onEnter={handleEnterFocusNext}
              />
              {isLastRange && <RowAddCircleButton onAdd={addRange} title="Add another Page Range" />}
            </div>
          );
        })}
      </div>

      <RowRemoveButton onRemove={onRemoveJuz} title="Remove Juz Row" />
    </div>
  );
}

export function JuzPageSection({
  data,
  onChange,
  onReset,
}: {
  data: JuzRowData[];
  onChange: (updater: JuzRowData[] | ((prevData: JuzRowData[]) => JuzRowData[])) => void;
  onReset?: () => void;
}) {
  const handleRowChange = (index: number, rowUpdater: JuzRowData | ((prevRow: JuzRowData) => JuzRowData)) => {
    onChange((prevData) => {
      const newData = [...prevData];
      const oldRow = newData[index];
      newData[index] = typeof rowUpdater === "function" ? rowUpdater(oldRow) : rowUpdater;
      return newData;
    });
  };

  const handleRemoveJuz = (index: number) => {
    onChange((prevData) => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const addJuzRow = () => {
    const newJuzId = `juz-input-${crypto.randomUUID()}`;
    onChange((prevData) => [
      ...prevData,
      {
        id: crypto.randomUUID(),
        juz: "",
        juzInputId: newJuzId,
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
      },
    ]);

    setTimeout(() => {
      const el = document.getElementById(newJuzId);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 100);
  };

  const totalPages = (data || []).reduce((sum, row) => {
    const hasJuz = row.juz && String(row.juz).trim() !== "";
    if (!hasJuz) return sum;

    const rowSum = (row.ranges || []).reduce((rSum, range) => {
      const hasStart = range.start !== undefined && String(range.start).trim() !== "";
      const hasEnd = range.end !== undefined && String(range.end).trim() !== "";
      if (hasStart && hasEnd) {
        const start = parseInt(String(range.start), 10);
        const end = parseInt(String(range.end), 10);
        if (!isNaN(start) && !isNaN(end) && end >= start) {
          return rSum + (end - start + 1);
        }
      }
      return rSum;
    }, 0);
    return sum + rowSum;
  }, 0);

  return (
    <div className="relative">
      <SectionHeaderBar
        title="JUZ / PAGE DETAILS"
        count={totalPages}
        showReset={true}
        onReset={onReset}
        resetTitle="Reset Juz & Page Section"
      />

      <div className="space-y-1 sm:space-y-2">
        {data.map((row, index) => (
          <JuzRow
            key={row.id || index}
            rowData={row}
            onChange={(updater) => handleRowChange(index, updater)}
            onRemoveJuz={data.length > 1 ? () => handleRemoveJuz(index) : undefined}
            onAddJuz={index === data.length - 1 ? addJuzRow : undefined}
          />
        ))}
      </div>

      <AddMoreSectionButton onClick={addJuzRow} label="+ Add More Juz" />
    </div>
  );
}

export function DetailRow({
  rowData,
  onChange,
  onRemoveRow,
  onAddNewRow,
  availableJuzs,
  juzPageData,
  listType = "mistake",
  index,
  isLastRow = false,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
}: {
  rowData: DetailRowData;
  onChange: (updater: (prevRow: DetailRowData) => DetailRowData) => void;
  onRemoveRow?: () => void;
  onAddNewRow?: () => void;
  onNextSection?: () => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  listType?: string;
  index: number;
  isLastRow?: boolean;
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (sourceListType: string, sourceIndex: number, targetListType: string, targetIndex?: number, isCopy?: boolean) => void;
}) {
  const [dropPosition, setDropPosition] = useState<"before" | "after" | null>(null);
  const isDragging = Boolean(draggedItem && draggedItem.listType === listType && draggedItem.index === index);

  const { lastPage, lastAyah } = useQuranTrackingSession();

  const effectiveJuz =
    availableJuzs && availableJuzs.length === 1
      ? availableJuzs[0]
      : availableJuzs && availableJuzs.length > 1
      ? (rowData.juz && availableJuzs.some((j) => String(j) === String(rowData.juz)) ? rowData.juz : availableJuzs[0])
      : (rowData.juz || (juzPageData && Array.isArray(juzPageData) && juzPageData.find((r) => r.juz && String(r.juz).trim() !== "")?.juz) || "");

  const { minPage, maxPage } = getJuzPageBounds(effectiveJuz, juzPageData);

  useEffect(() => {
    if (effectiveJuz && String(rowData.juz || "") !== String(effectiveJuz)) {
      onChange((prev) => {
        if (String(prev.juz || "") !== String(effectiveJuz)) {
          return { ...prev, juz: effectiveJuz };
        }
        return prev;
      });
    }
  }, [effectiveJuz, rowData.juz, onChange]);

  const handlePageChange = (val: string | number) => {
    onChange((prev) => ({ ...prev, page: val }));
    if (val !== "" && val !== undefined && val !== null) {
      quranTrackingSession.setLastPage(val);
    }
  };

  const handlePageBlur = () => {
    if (rowData.page !== "" && rowData.page !== undefined && rowData.page !== null) {
      let p = parseInt(String(rowData.page), 10);
      if (!isNaN(p)) {
        if (p < minPage) p = minPage;
        if (p > maxPage) p = maxPage;
        if (p !== Number(rowData.page)) {
          handlePageChange(p);
        } else {
          quranTrackingSession.setLastPage(p);
        }
      }
    }
  };

  const handleAyahChange = (ayahIndex: number, val: string | number) => {
    onChange((prevRow) => {
      const newAyahs = [...prevRow.ayahs];
      newAyahs[ayahIndex] = { ...newAyahs[ayahIndex], value: val };
      return { ...prevRow, ayahs: newAyahs };
    });
    if (val !== "" && val !== undefined && val !== null) {
      quranTrackingSession.setLastAyah(val);
    }
  };

  const handleAyahBlur = (ayahIndex: number) => {
    const ayah = rowData.ayahs[ayahIndex];
    if (ayah && ayah.value !== "" && ayah.value !== undefined && ayah.value !== null) {
      let a = parseInt(String(ayah.value), 10);
      if (!isNaN(a)) {
        if (a < QURAN_RULES.MIN_AYAH) a = QURAN_RULES.MIN_AYAH;
        if (a > QURAN_RULES.MAX_AYAH) a = QURAN_RULES.MAX_AYAH;
        if (a !== Number(ayah.value)) {
          handleAyahChange(ayahIndex, a);
        } else {
          quranTrackingSession.setLastAyah(a);
        }
      }
    }
  };

  const handleAyahEnter = (ayahIndex: number, e: any, isLastAyah: boolean) => {
    handleAyahBlur(ayahIndex);
    if (isLastRow && isLastAyah && onAddNewRow) {
      if (e && e.preventDefault) e.preventDefault();
      onAddNewRow();
    } else {
      handleEnterFocusNext(e);
    }
  };

  const addAyah = () => {
    const newId = crypto.randomUUID();
    onChange((prevRow) => ({
      ...prevRow,
      ayahs: [...prevRow.ayahs, { id: newId, value: "" }],
    }));
    setTimeout(() => {
      const el = document.getElementById(`ayah-${newId}`);
      if (el) el.focus();
    }, 100);
  };

  const removeAyah = (ayahIndex: number) => {
    onChange((prevRow) => {
      if (prevRow.ayahs.length > 1) {
        const newAyahs = prevRow.ayahs.filter((_, idx) => idx !== ayahIndex);
        return { ...prevRow, ayahs: newAyahs };
      }
      return prevRow;
    });
  };

  const handleRowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDragOver) onDragOver(e);
    if (isDragging) {
      setDropPosition(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top;
    setDropPosition(offset < rect.height / 2 ? "before" : "after");
  };

  const handleRowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const targetIdx = dropPosition === "after" ? index + 1 : index;
    setDropPosition(null);

    let sourceListType =
      draggedItem?.listType ||
      (typeof window !== "undefined" ? (window as any).__spr_active_drag_item?.listType : undefined);
    let sourceIndex =
      draggedItem?.index ??
      (typeof window !== "undefined" ? (window as any).__spr_active_drag_item?.index : undefined);

    const isCopy = e.ctrlKey || e.altKey;

    if (onReorderRows && sourceListType !== undefined && sourceIndex !== undefined) {
      onReorderRows(sourceListType, sourceIndex, listType, targetIdx, isCopy);
    } else if (onDrop) {
      onDrop(e, listType, targetIdx);
    }
  };

  return (
    <div
      data-detail-row="true"
      data-list-type={listType}
      data-row-index={index}
      onDragOver={handleRowDragOver}
      onDragLeave={() => setDropPosition(null)}
      onDrop={handleRowDrop}
      className={`flex items-start gap-2 sm:gap-4 w-full py-2 px-1 sm:px-3 -mx-1 sm:-mx-3 rounded-xl relative group transition-all duration-150 select-none ${
        isDragging ? "opacity-35 scale-[0.98] border border-dashed theme-border theme-bg-sub" : "hover:theme-bg-elevated"
      }`}
    >
      {dropPosition === "before" && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--accent-main)] rounded-full z-20 pointer-events-none" />
      )}
      {dropPosition === "after" && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--accent-main)] rounded-full z-20 pointer-events-none" />
      )}

      <div
        draggable={true}
        onDragStart={(e) => onDragStart && onDragStart(e, listType, index)}
        onDragEnd={() => {
          setDropPosition(null);
          onDragEnd && onDragEnd();
        }}
        className="w-5 h-10 flex items-center justify-center cursor-grab active:cursor-grabbing theme-text-secondary hover:theme-text-primary shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
        title="Drag to reorder"
      >
        <DragHandleIcon className="w-3.5 h-3.5" />
      </div>

      {availableJuzs && availableJuzs.length > 1 && (
        <div className="flex items-center gap-1 shrink-0 h-[38px] sm:h-10 self-start">
          <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary">Juz</label>
          <div className="w-16 sm:w-20">
            <CustomSelect
              value={effectiveJuz}
              onChange={(val) => onChange((prev) => ({ ...prev, juz: val }))}
              options={availableJuzs.map((j) => ({ value: String(j), label: `Juz ${j}` }))}
              size="sm"
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-1 shrink-0 h-[38px] sm:h-10 self-start">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary">Page</label>
        <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm shrink-0 flex items-center justify-center">
          <CustomInput
            id={`page-${rowData.id}`}
            type="number"
            variant="borderless"
            scrollable={true}
            allowDecimals={false}
            value={rowData.page}
            onChange={handlePageChange}
            onBlur={handlePageBlur}
            onEnter={handleEnterFocusNext}
            onEmptyBackspace={(e: any) => {
              if (onRemoveRow) onRemoveRow();
              handleBackspaceFocusPrev(e, true);
            }}
            min={minPage}
            max={maxPage}
            initialScrollValue={lastPage !== null ? lastPage : minPage}
            placeholder="--"
            className="w-full h-full p-0 min-h-0"
            wrapperClassName="w-full h-full"
            inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
          />
        </div>
      </div>

      <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3 min-w-0">
        <label className="text-[11px] sm:text-xs font-semibold theme-text-secondary shrink-0 h-[38px] sm:h-10 flex items-center">
          Ayah
        </label>
        {(rowData.ayahs || []).map((ayah, aIdx) => {
          const isLastAyah = aIdx === (rowData.ayahs?.length || 0) - 1;
          return (
            <div key={ayah.id || aIdx} className="flex items-center gap-1.5 shrink-0">
              <div className="theme-bg-sub rounded-lg border theme-border overflow-hidden h-[38px] sm:h-10 w-14 sm:w-16 shadow-sm shrink-0 flex items-center justify-center">
                <CustomInput
                  id={`ayah-${ayah.id}`}
                  type="number"
                  variant="borderless"
                  scrollable={true}
                  allowDecimals={false}
                  value={ayah.value}
                  onChange={(val) => handleAyahChange(aIdx, val)}
                  onBlur={() => handleAyahBlur(aIdx)}
                  onEnter={(e: any) => handleAyahEnter(aIdx, e, isLastAyah)}
                  onAddShift={isLastAyah ? addAyah : undefined}
                  onEmptyBackspace={(e: any) => {
                    if (aIdx > 0) removeAyah(aIdx);
                    handleBackspaceFocusPrev(e, true);
                  }}
                  min={QURAN_RULES.MIN_AYAH}
                  max={QURAN_RULES.MAX_AYAH}
                  initialScrollValue={lastAyah !== null ? lastAyah : QURAN_RULES.MIN_AYAH}
                  placeholder="--"
                  className="w-full h-full p-0 min-h-0"
                  wrapperClassName="w-full h-full"
                  inputClassName="w-full h-full text-center text-xs sm:text-sm theme-text-primary font-semibold font-mono p-0"
                />
              </div>
              {isLastAyah && <RowAddCircleButton onAdd={addAyah} title="Add another Ayah" />}
            </div>
          );
        })}
      </div>

      <RowRemoveButton onRemove={onRemoveRow} title={`Remove ${listType === "mistake" ? "Mistake" : "Stuck"} Row`} />
    </div>
  );
}

export function DetailSection({
  title,
  listType,
  data,
  onChange,
  availableJuzs,
  juzPageData,
  draggedItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onReorderRows,
  onReset,
}: {
  title: string;
  listType: "mistake" | "stuck" | string;
  data: DetailRowData[];
  onChange: (updater: DetailRowData[] | ((prevData: DetailRowData[]) => DetailRowData[])) => void;
  availableJuzs?: (string | number)[];
  juzPageData?: any[];
  draggedItem?: { listType: string; index: number } | null;
  onDragStart?: (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, listType: string, index?: number) => void;
  onReorderRows?: (sourceListType: string, sourceIndex: number, targetListType: string, targetIndex?: number, isCopy?: boolean) => void;
  onReset?: () => void;
}) {
  const addRow = () => {
    const newId = crypto.randomUUID();
    onChange((prevData) => {
      const defaultJuz =
        (availableJuzs && availableJuzs.length > 0 ? availableJuzs[0] : "") ||
        (juzPageData?.find((r) => r.juz && String(r.juz).trim() !== "")?.juz || "");
      const lastJuz =
        prevData.length > 0 && prevData[prevData.length - 1].juz
          ? prevData[prevData.length - 1].juz
          : defaultJuz;
      const rowJuz =
        availableJuzs && availableJuzs.length === 1
          ? availableJuzs[0]
          : availableJuzs && availableJuzs.length > 1
          ? (lastJuz && availableJuzs.some((j) => String(j) === String(lastJuz)) ? lastJuz : availableJuzs[0])
          : (lastJuz || defaultJuz);
      return [
        ...prevData,
        {
          id: newId,
          juz: rowJuz,
          page: "",
          ayahs: [{ id: crypto.randomUUID(), value: "" }],
        },
      ];
    });

    setTimeout(() => {
      const el = document.getElementById(`page-${newId}`);
      if (el) {
        el.focus();
        if (typeof (el as HTMLInputElement).select === "function") (el as HTMLInputElement).select();
      }
    }, 60);
  };

  const handleRemoveRow = (index: number) => {
    onChange((prevData) => {
      if (prevData.length > 1) {
        return prevData.filter((_, idx) => idx !== index);
      }
      return prevData;
    });
  };

  const handleRowChange = (index: number, newRow: DetailRowData | ((prevRow: DetailRowData) => DetailRowData)) => {
    onChange((prevData) => {
      const newData = [...prevData];
      newData[index] = typeof newRow === "function" ? newRow(newData[index]) : newRow;
      return newData;
    });
  };

  const totalCount = (data || []).reduce((sum, row) => {
    if (row.page && String(row.page).trim() !== "") {
      const filledAyahs = (row.ayahs || []).filter((a) => a.value && String(a.value).trim() !== "");
      return sum + filledAyahs.length;
    }
    return sum;
  }, 0);

  return (
    <div className="relative">
      <SectionHeaderBar
        title={title}
        count={totalCount}
        showReset={true}
        onReset={onReset}
        resetTitle={`Reset ${title}`}
      />

      <div className="space-y-1 sm:space-y-2">
        {data.map((row, index) => (
          <DetailRow
            key={row.id || index}
            rowData={row}
            onChange={(updater) => handleRowChange(index, updater)}
            onRemoveRow={data.length > 1 ? () => handleRemoveRow(index) : undefined}
            onAddNewRow={index === data.length - 1 ? addRow : undefined}
            availableJuzs={availableJuzs}
            juzPageData={juzPageData}
            listType={listType}
            index={index}
            isLastRow={index === data.length - 1}
            draggedItem={draggedItem}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onReorderRows={onReorderRows}
          />
        ))}
      </div>

      <AddMoreSectionButton onClick={addRow} label={`+ Add More ${listType === "mistake" ? "Mistake" : "Stuck"}`} />
    </div>
  );
}

export function CommentSection({
  comment = "",
  setComment,
  savedComments = [],
  onAddToRecord,
  onMakeReport,
  showActions = true,
  isEditMode = false,
  isSaving = false,
}: {
  comment?: string;
  setComment: (val: string) => void;
  savedComments?: string[];
  onAddToRecord: () => void;
  onMakeReport: () => void;
  showActions?: boolean;
  isEditMode?: boolean;
  isSaving?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="theme-bg-surface rounded-2xl p-5 shadow-lg relative z-0 space-y-3 border theme-border">
        <TemplateTextarea
          id="comment-textarea"
          label="Comments"
          value={comment}
          onChange={setComment}
          namespace="report_builder_comments"
          initialTemplates={savedComments}
          placeholder="Enter comment..."
          rows={5}
          onSaveShortcut={onMakeReport}
          onSubmitShortcut={onAddToRecord}
        />
      </div>

      {showActions && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center lg:justify-between gap-3 pt-1 w-full">
          <CustomButton
            type="button"
            size="lg"
            variant={isEditMode ? "primary" : "surface"}
            loading={isSaving}
            loadingText={isEditMode ? "Updating Report..." : "Saving..."}
            icon={false}
            onClick={onAddToRecord}
            className="w-full sm:flex-1 lg:flex-initial lg:w-auto lg:min-w-[180px] shadow-md hover:shadow-lg"
          >
            {isEditMode ? "Confirm Edit" : "Add to Record"}
          </CustomButton>

          <CustomButton
            type="button"
            size="lg"
            variant="primary"
            onClick={onMakeReport}
            data-shortcut="make-report"
            className="w-full sm:flex-1 lg:flex-initial lg:w-auto lg:min-w-[180px] shadow-md hover:shadow-lg"
          >
            Make Report
          </CustomButton>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. PROGRESS REPORT STATE & FORM HOOK
// ══════════════════════════════════════════════════════════════════════════════

export function useReportForm() {
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(() => getClassroomTodayDate());
  const [studentName, setStudentName] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");

  const [juzPageData, setJuzPageData] = useState<JuzRowData[]>([
    {
      id: crypto.randomUUID(),
      juz: "",
      ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
    },
  ]);

  const [mistakeData, setMistakeData] = useState<DetailRowData[]>([
    { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] },
  ]);

  const [stuckData, setStuckData] = useState<DetailRowData[]>([
    { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] },
  ]);

  const [comment, setComment] = useState<string>("");
  const [savedComments, setSavedComments] = useState<string[]>(() => commentStore.getAll());

  const [studentDatabase, setStudentDatabase] = useState<any[]>([]);
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReport, setEditingReport] = useState<any | null>(null);

  const historyStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringRef = useRef(false);
  const [, setHistoryVersion] = useState(0);

  const captureSnapshot = useCallback(() => {
    return JSON.stringify({
      studentName,
      selectedStudentId,
      groupName,
      selectedSession,
      selectedDate,
      juzPageData,
      mistakeData,
      stuckData,
      comment,
      savedReportId: editingReport?.id,
      savedReportKey: editingReport?.report_unique_id,
      isGracePeriod: editingReport?.isGracePeriod,
    });
  }, [studentName, selectedStudentId, groupName, selectedSession, selectedDate, juzPageData, mistakeData, stuckData, comment, editingReport]);

  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    const snap = captureSnapshot();
    const stack = historyStackRef.current;
    if (stack.length === 0 || stack[stack.length - 1] !== snap) {
      stack.push(snap);
      if (stack.length > 35) stack.shift();
      redoStackRef.current = [];
      setHistoryVersion((v) => v + 1);
    }
  }, [captureSnapshot]);

  const handleUndo = useCallback(() => {
    const stack = historyStackRef.current;
    if (stack.length <= 1) {
      showToast("Nothing to undo", "info");
      return;
    }
    const currentSnap = stack.pop();
    if (currentSnap) redoStackRef.current.push(currentSnap);
    setHistoryVersion((v) => v + 1);

    const prevSnapStr = stack[stack.length - 1];
    if (prevSnapStr) {
      try {
        const data = JSON.parse(prevSnapStr);
        isRestoringRef.current = true;
        setStudentName(data.studentName || "");
        setSelectedStudentId(data.selectedStudentId || null);
        setGroupName(data.groupName || "");
        setSelectedSession(data.selectedSession || "");
        if (data.selectedDate) setSelectedDate(data.selectedDate);
        if (data.juzPageData) setJuzPageData(data.juzPageData);
        if (data.mistakeData) setMistakeData(data.mistakeData);
        if (data.stuckData) setStuckData(data.stuckData);
        setComment(data.comment || "");

        if (data.savedReportId || data.savedReportKey) {
          if (data.savedReportId) clearGracePeriodTimer(data.savedReportId);
          setEditingReport({
            id: data.savedReportId,
            report_unique_id: data.savedReportKey,
            student_name: data.studentName,
            isGracePeriod: data.isGracePeriod ?? true,
          });
          showToast(`Restored report #${data.savedReportKey || ""}. You can edit and confirm changes.`, "info");
        } else {
          setEditingReport(null);
          showToast("Undo: Restored previous draft state", "info");
        }
      } catch (err) {
        console.error("Undo restore failed", err);
      }
    }
  }, [showToast]);

  const handleRedo = useCallback(() => {
    const rStack = redoStackRef.current;
    if (rStack.length === 0) {
      showToast("Nothing to redo", "info");
      return;
    }
    const nextSnapStr = rStack.pop();
    if (!nextSnapStr) return;
    historyStackRef.current.push(nextSnapStr);
    setHistoryVersion((v) => v + 1);

    try {
      const data = JSON.parse(nextSnapStr);
      isRestoringRef.current = true;
      setStudentName(data.studentName || "");
      setSelectedStudentId(data.selectedStudentId || null);
      setGroupName(data.groupName || "");
      setSelectedSession(data.selectedSession || "");
      if (data.selectedDate) setSelectedDate(data.selectedDate);
      if (data.juzPageData) setJuzPageData(data.juzPageData);
      if (data.mistakeData) setMistakeData(data.mistakeData);
      if (data.stuckData) setStuckData(data.stuckData);
      setComment(data.comment || "");

      if (data.savedReportId || data.savedReportKey) {
        if (data.savedReportId) clearGracePeriodTimer(data.savedReportId);
        setEditingReport({
          id: data.savedReportId,
          report_unique_id: data.savedReportKey,
          student_name: data.studentName,
          isGracePeriod: data.isGracePeriod ?? true,
        });
      } else {
        setEditingReport(null);
      }
      showToast("Redo: Restored next draft state", "info");
    } catch (err) {
      console.error("Redo restore failed", err);
    }
  }, [showToast]);

  const canUndoDraft = historyStackRef.current.length > 1;
  const canRedoDraft = redoStackRef.current.length > 0;
  const [draftInfo, setDraftInfo] = useState<DailyProgressDraft[] | null>(null);

  const [currentDraftId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("recover_draft_id") || "active_report_draft";
  });

  const applyReportToForm = useCallback((rep: any) => {
    if (!rep) return;

    const sName = rep.student_name || rep.student || "";
    const gName = rep.student_group || rep.subject_course || "";
    const sSession = rep.session_name || rep.session || "";
    const sId =
      rep.student_id ||
      rep.studentId ||
      (typeof rep.student === "object" ? rep.student?.id : null) ||
      (typeof rep.student === "number" || (typeof rep.student === "string" && !isNaN(Number(rep.student)))
        ? rep.student
        : null);

    let rawDate = rep.report_date || rep.record_date || rep.date || rep.isoDateOnly || rep.date_time || rep.created_at;
    let rDate = "";
    if (rawDate) {
      if (typeof rawDate === "string") {
        rDate = rawDate.split("T")[0].split(" ")[0];
      } else {
        try {
          rDate = new Date(rawDate).toISOString().split("T")[0];
        } catch {
          rDate = "";
        }
      }
    }

    setStudentName(sName);
    setSelectedStudentId(sId != null ? String(sId) : null);
    setGroupName(gName);
    setSelectedSession(sSession);
    if (rDate) setSelectedDate(rDate);

    if (Array.isArray(rep.juz_and_pages) && rep.juz_and_pages.length > 0) {
      setJuzPageData(
        rep.juz_and_pages.map((jp: any) => ({
          id: crypto.randomUUID(),
          juz: String(jp.juz || ""),
          ranges: Array.isArray(jp.ranges)
            ? jp.ranges.map((r: any) => ({
                id: crypto.randomUUID(),
                start: String(r.start || r.page_start || ""),
                end: String(r.end || r.page_end || ""),
              }))
            : [{ id: crypto.randomUUID(), start: "", end: "" }],
        }))
      );
    } else {
      setJuzPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
    }

    const mistakesList = rep.mistake_details || rep.mistakes || [];
    if (Array.isArray(mistakesList) && mistakesList.length > 0) {
      setMistakeData(
        mistakesList.map((m: any) => ({
          id: crypto.randomUUID(),
          juz: String(m.juz || ""),
          page: String(m.page || ""),
          ayahs: Array.isArray(m.ayahs)
            ? m.ayahs.map((a: any) => ({ id: crypto.randomUUID(), value: String(a.value || a || "") }))
            : m.ayah
            ? [{ id: crypto.randomUUID(), value: String(m.ayah) }]
            : [{ id: crypto.randomUUID(), value: "" }],
        }))
      );
    } else {
      setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    }

    const stucksList = rep.stuck_details || rep.stucks || [];
    if (Array.isArray(stucksList) && stucksList.length > 0) {
      setStuckData(
        stucksList.map((s: any) => ({
          id: crypto.randomUUID(),
          juz: String(s.juz || ""),
          page: String(s.page || ""),
          ayahs: Array.isArray(s.ayahs)
            ? s.ayahs.map((a: any) => ({ id: crypto.randomUUID(), value: String(a.value || a || "") }))
            : s.ayah
            ? [{ id: crypto.randomUUID(), value: String(s.ayah) }]
            : [{ id: crypto.randomUUID(), value: "" }],
        }))
      );
    } else {
      setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    }

    setComment(rep.comment || "");
    setDraftInfo(null);
    draftReport.remove(currentDraftId);
    setEditingReport(rep);
  }, [currentDraftId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recoverId = params.get("recover_draft_id");
    if (recoverId) {
      const recovered = draftReport.getById(recoverId);
      if (recovered) {
        if (recovered.studentName !== undefined) setStudentName(recovered.studentName);
        if (recovered.selectedStudentId !== undefined) setSelectedStudentId(recovered.selectedStudentId);
        if (recovered.groupName !== undefined) setGroupName(recovered.groupName);
        if (recovered.selectedSession !== undefined) setSelectedSession(recovered.selectedSession);
        if (recovered.selectedDate !== undefined) setSelectedDate(recovered.selectedDate);
        if (recovered.juzPageData?.length) setJuzPageData(recovered.juzPageData);
        if (recovered.mistakeData?.length) setMistakeData(recovered.mistakeData);
        if (recovered.stuckData?.length) setStuckData(recovered.stuckData);
        if (recovered.comment !== undefined) setComment(recovered.comment);

        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        showToast("Report draft recovered successfully!", "success");
      }
    } else {
      const recovered = draftReport.getById("active_report_draft");
      if (recovered) {
        if (recovered.studentName !== undefined) setStudentName(recovered.studentName);
        if (recovered.selectedStudentId !== undefined) setSelectedStudentId(recovered.selectedStudentId);
        if (recovered.groupName !== undefined) setGroupName(recovered.groupName);
        if (recovered.selectedSession !== undefined) setSelectedSession(recovered.selectedSession);
        if (recovered.selectedDate !== undefined) setSelectedDate(recovered.selectedDate);
        if (recovered.juzPageData?.length) setJuzPageData(recovered.juzPageData);
        if (recovered.mistakeData?.length) setMistakeData(recovered.mistakeData);
        if (recovered.stuckData?.length) setStuckData(recovered.stuckData);
        if (recovered.comment !== undefined) setComment(recovered.comment);
      }
    }

    const allDrafts = draftReport.getAll();
    const unsavedDrafts = allDrafts.filter((d: any) => {
      const hasContent = d.studentName || d.comment || d.selectedSession || d.hasData;
      return hasContent && d.id !== currentDraftId && d.id !== "active_report_draft";
    });

    if (unsavedDrafts.length > 0) {
      setDraftInfo(unsavedDrafts);
    }

    const pendingEditRaw = localStorage.getItem("spr_editing_report");
    if (pendingEditRaw) {
      try {
        const pendingEdit = JSON.parse(pendingEditRaw);
        if (pendingEdit && typeof pendingEdit === "object") {
          localStorage.removeItem("spr_editing_report");
          applyReportToForm(pendingEdit);
        }
      } catch (err) {
        console.error("Failed to parse pending edit report:", err);
      }
    }
  }, [currentDraftId, applyReportToForm, showToast]);

  useEffect(() => {
    commentStore.saveAll(savedComments);
  }, [savedComments]);

  useEffect(() => {
    const hasAnyContent = Boolean(
      studentName.trim() ||
      groupName.trim() ||
      selectedSession ||
      comment.trim() ||
      juzPageData.some((d) => d.juz || (d.ranges || []).some((r) => r.start || r.end)) ||
      mistakeData.some((m) => m.page || m.juz || (m.ayahs || []).some((a) => a.value)) ||
      stuckData.some((s) => s.page || s.juz || (s.ayahs || []).some((a) => a.value))
    );

    const draftPayload = {
      studentName,
      selectedStudentId,
      groupName,
      selectedSession,
      selectedDate,
      juzPageData,
      mistakeData,
      stuckData,
      comment,
      hasData: hasAnyContent,
    };

    if (hasAnyContent) {
      draftReport.save(currentDraftId, draftPayload);
      saveStatusStore.set("local", "Saved");
    } else {
      draftReport.remove(currentDraftId);
    }
  }, [studentName, selectedStudentId, groupName, selectedSession, selectedDate, juzPageData, mistakeData, stuckData, comment, currentDraftId]);

  const recoverDraft = (draft: any) => {
    if (!draft) return;
    if (draft.studentName !== undefined) setStudentName(draft.studentName);
    if (draft.selectedStudentId !== undefined) setSelectedStudentId(draft.selectedStudentId);
    if (draft.groupName !== undefined) setGroupName(draft.groupName);
    if (draft.selectedSession !== undefined) setSelectedSession(draft.selectedSession);
    if (draft.selectedDate !== undefined) setSelectedDate(draft.selectedDate);
    if (draft.juzPageData?.length) setJuzPageData(draft.juzPageData);
    if (draft.mistakeData?.length) setMistakeData(draft.mistakeData);
    if (draft.stuckData?.length) setStuckData(draft.stuckData);
    if (draft.comment !== undefined) setComment(draft.comment);

    setDraftInfo((prev) => (prev ? prev.filter((d) => d.id !== draft.id) : null));
    draftReport.remove(draft.id);
    showToast("Report draft recovered successfully!", "success");
    saveStatusStore.set("local", "Saved (Local)");
  };

  const discardDraft = (draft: any) => {
    if (!draft) return;
    setDraftInfo((prev) => {
      const updated = prev ? prev.filter((d) => d.id !== draft.id) : null;
      return updated && updated.length > 0 ? updated : null;
    });
    draftReport.remove(draft.id);
    showToast("Report draft discarded", "info");
  };

  const fetchData = async () => {
    const cachedStudents = studentStore.getAll();
    const cachedSessions = sessionStore.getAll();

    if (cachedStudents.length > 0) setStudentDatabase(cachedStudents);
    if (cachedSessions.length > 0) setSessionList(cachedSessions);
    if (cachedStudents.length > 0 || cachedSessions.length > 0) setIsLoading(false);
    if (!isOnline()) return;

    try {
      await syncSessionsAndComments();
      const [studentsRes, sessionsRes, messagesRes] = await Promise.all([
        fetchWithAuth("/students/"),
        fetchWithAuth("/sessions/"),
        fetchWithAuth("/messages/?category=report_builder_comments"),
      ]);

      if (studentsRes.ok) {
        const rawStudents = await studentsRes.json();
        const apiStudents = (Array.isArray(rawStudents) ? rawStudents : []).map((s: any) => ({
          ...(typeof s === "object" ? s : {}),
          id: typeof s === "object" ? s.id : null,
          label: typeof s === "object" ? (s.name_en || s.name || s.student_name || s.label || String(s)) : String(s),
          sub: s?.section_name || s?.student_section_name || s?.sub || s?.group_name || "",
          section_name: s?.section_name || s?.student_section_name || s?.sub || "",
          student_section: s?.student_section || s?.section_id || s?.section,
          student_class: s?.student_class || s?.class_id,
        }));
        const merged = mergeStudents(apiStudents, studentStore.getAll());
        setStudentDatabase(merged);
      }

      if (sessionsRes.ok) {
        const rawSessions = await sessionsRes.json();
        const apiSessions = (Array.isArray(rawSessions) ? rawSessions : []).map((s: any) => ({
          id: typeof s === "object" ? (s.id || s.name) : String(s),
          name: typeof s === "object" ? (s.name || s.session_name || s.label || String(s)) : String(s),
        }));
        const merged = mergeSessions(apiSessions, sessionStore.getAll());
        setSessionList(merged);
      }

      if (messagesRes.ok) {
        const rawMessages = await messagesRes.json();
        const apiComments = (Array.isArray(rawMessages) ? rawMessages : [])
          .map((m: any) => (typeof m === "object" ? { id: m.id, text: m.text || m.comment || "" } : { text: String(m) }))
          .filter((c: any) => Boolean(c.text && c.text.trim()));
        const mergedComments = mergeComments(apiComments, commentStore.getAll());
        setSavedComments(mergedComments);
      }
    } catch (error: any) {
      console.warn("[useReportForm] API unreachable, using cached data:", error.message);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function initLoad() {
      try {
        await fetchData();
      } catch (err) {
        console.error("Init load error:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    initLoad();

    const handleTenantChanged = () => isMounted && fetchData();
    const handleStudentsUpdated = () => {
      if (isMounted) {
        const cached = studentStore.getAll();
        if (cached && cached.length > 0) setStudentDatabase(cached);
      }
    };

    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    window.addEventListener("spr_students_updated", handleStudentsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
      window.removeEventListener("spr_students_updated", handleStudentsUpdated);
    };
  }, []);

  const validateReportForm = () => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return false;
    }
    if (!selectedSession.trim()) {
      showToast("Please select a session first", "warning");
      return false;
    }
    const hasJuzPageData = juzPageData.some(
      (d) => d.juz || (d.ranges || []).some((r) => r.start || r.end)
    );
    if (!hasJuzPageData) {
      showToast("Please enter Juz & Page information first", "warning");
      return false;
    }
    return true;
  };

  const resetForm = () => {
    localStorage.removeItem("spr_editing_report");
    setStudentName("");
    setGroupName("");
    setSelectedSession("");
    setSelectedDate(getClassroomTodayDate());
    setJuzPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
    setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setComment("");
    draftReport.remove(currentDraftId);
    setDraftInfo(null);
    setEditingReport(null);
  };

  const cancelEditMode = () => {
    if (editingReport?.id && editingReport.isGracePeriod) {
      scheduleGracePeriodSync(editingReport.id, 10 * 60 * 1000);
    }
    resetForm();
    showToast("Edit cancelled. Form cleared.", "info");
  };

  const handleSaveRecord = async () => {
    if (isSaving) return;
    if (!validateReportForm()) return;
    setIsSaving(true);

    try {
      const cleanMistakes = mistakeData.filter(
        (m) => (m.page && String(m.page).trim()) || ((m.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      const cleanStucks = stuckData.filter(
        (s) => (s.page && String(s.page).trim()) || ((s.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );

      const editedAt = new Date().toISOString();
      const isEditing = Boolean(editingReport);

      const allKnown = [
        ...(studentDatabase || []),
        ...(studentStore.getAll() || []),
      ];
      let selectedStudent: any = null;
      if (selectedStudentId) {
        selectedStudent = allKnown.find((s: any) => String(s.id) === String(selectedStudentId));
      }
      if (!selectedStudent) {
        selectedStudent = allKnown.find(
          (s: any) => (s.label || s.name || s.name_en || "").trim().toLowerCase() === studentName.trim().toLowerCase()
        );
      }
      const studentId = (selectedStudentId && !String(selectedStudentId).startsWith("stu_"))
        ? selectedStudentId
        : (selectedStudent && !String(selectedStudent.id).startsWith("stu_") ? selectedStudent.id : null);

      recordStudentUsage(selectedStudent || studentName.trim());

      const payload = {
        student: studentId || studentName.trim(),
        session: selectedSession.trim(),
        report_date: selectedDate || getClassroomTodayDate(),
        subject_course: groupName || "General Group",
        juz_and_pages: juzPageData,
        mistakes: cleanMistakes,
        stucks: cleanStucks,
        comment: comment,
        overall_status: "COMPLETED",
        client_updated_at: editedAt,
        ...(isEditing ? { edited_at: editedAt, is_edited: true } : {}),
      };

      if (isEditing) {
        const repId = editingReport.id || editingReport.report_unique_id;
        const repUniqueId = editingReport.report_unique_id || (typeof repId === "string" && repId.startsWith("REP-") ? repId : `REP-${String(repId).slice(0, 8)}`);

        const allReports = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
        const existingRepIndex = allReports.findIndex((r: any) => {
          const rId = r.id || r.report_unique_id;
          return rId && String(rId) === String(repId);
        });

        const existingRep = existingRepIndex > -1 ? allReports[existingRepIndex] : null;
        const isGracePeriod = editingReport.isGracePeriod || existingRep?.sync_status === "GRACE_PERIOD" || !existingRep?.server_id;

        const updatedRecord = {
          ...(existingRep || {}),
          ...payload,
          id: editingReport.id || existingRep?.id || crypto.randomUUID(),
          report_unique_id: repUniqueId,
          client_updated_at: editedAt,
          studentId,
          studentName: studentName.trim(),
          groupName: groupName || "General Group",
          selectedSession: selectedSession.trim(),
          selectedDate,
          juzPageData,
          mistakeData: cleanMistakes,
          stuckData: cleanStucks,
        };

        if (isGracePeriod) {
          saveReportLocally(updatedRecord, { graceMinutes: 10, syncStatus: "GRACE_PERIOD" });
          scheduleGracePeriodSync(updatedRecord.id, 10 * 60 * 1000);
          showToast(`Report #${repUniqueId} for "${studentName}" updated!`, "success");
          saveStatusStore.set("local", "Saved (Local)");
          window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: updatedRecord } }));
        } else if (isOnline() && (editingReport.server_id || editingReport.id)) {
          const targetId = editingReport.server_id || editingReport.id;
          try {
            const response = await fetchWithAuth(`/reports/${targetId}/`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
            if (response.ok) {
              const resData = await response.json();
              saveReportLocally({ ...updatedRecord, ...resData, sync_status: "SYNCED" }, { skipGrace: true, syncStatus: "SYNCED" });
              showToast(`Report #${repUniqueId} for "${studentName}" updated in Database!`, "success");
              saveStatusStore.set("database", "Database Synced");
              window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "database", data: resData } }));
            } else {
              saveReportLocally(updatedRecord, { skipGrace: true, syncStatus: "PENDING" });
              showToast(`Report updated locally. Will sync when possible.`, "info");
              saveStatusStore.set("local", "Saved (Local)");
              window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: updatedRecord } }));
            }
          } catch (error: any) {
            saveReportLocally(updatedRecord, { skipGrace: true, syncStatus: "PENDING" });
            showToast("Updated locally: " + error.message, "info");
            saveStatusStore.set("local", "Saved (Local)");
            window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: updatedRecord } }));
          }
        } else {
          saveReportLocally(updatedRecord, { skipGrace: true, syncStatus: "PENDING" });
          showToast(`Report #${repUniqueId} for "${studentName}" updated locally!`, "success");
          saveStatusStore.set("local", "Saved (Local)");
          window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: updatedRecord } }));
        }

        const savedSnapshot = JSON.stringify({
          studentName: studentName.trim(),
          groupName: groupName || "General Group",
          selectedSession: selectedSession.trim(),
          selectedDate,
          juzPageData,
          mistakeData: cleanMistakes,
          stuckData: cleanStucks,
          comment,
          savedReportId: updatedRecord.id,
          savedReportKey: repUniqueId,
          isGracePeriod,
        });
        if (historyStackRef.current.length > 0) {
          historyStackRef.current[historyStackRef.current.length - 1] = savedSnapshot;
        } else {
          historyStackRef.current.push(savedSnapshot);
        }
      } else {
        const localSavedReport = saveReportLocally({
          ...payload,
          studentId,
          studentName: studentName.trim(),
          groupName: groupName || "General Group",
          selectedSession: selectedSession.trim(),
          selectedDate,
          juzPageData,
          mistakeData: cleanMistakes,
          stuckData: cleanStucks,
        }, { graceMinutes: 10 });

        scheduleGracePeriodSync(localSavedReport.id, 10 * 60 * 1000);

        showToast(`Report #${localSavedReport.report_unique_id} for "${studentName}" added to record!`, "success");
        saveStatusStore.set("local", "Saved (Local)");
        window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: localSavedReport } }));

        const savedSnapshot = JSON.stringify({
          studentName: studentName.trim(),
          groupName: groupName || "General Group",
          selectedSession: selectedSession.trim(),
          selectedDate,
          juzPageData,
          mistakeData: cleanMistakes,
          stuckData: cleanStucks,
          comment,
          savedReportId: localSavedReport.id,
          savedReportKey: localSavedReport.report_unique_id,
          isGracePeriod: true,
        });
        if (historyStackRef.current.length > 0) {
          historyStackRef.current[historyStackRef.current.length - 1] = savedSnapshot;
        } else {
          historyStackRef.current.push(savedSnapshot);
        }
      }

      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleJuzPageRefresh = () => {
    setJuzPageData([
      {
        id: crypto.randomUUID(),
        juz: "",
        juzInputId: `juz-input-${crypto.randomUUID()}`,
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
      },
    ]);
    showToast("Juz & Page section reset", "info");
  };

  return {
    selectedDate,
    setSelectedDate,
    studentName,
    setStudentName,
    selectedStudentId,
    setSelectedStudentId,
    groupName,
    setGroupName,
    selectedSession,
    setSelectedSession,
    juzPageData,
    setJuzPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
    comment,
    setComment,
    savedComments,
    setSavedComments,
    studentDatabase,
    sessionList,
    isLoading,
    isSaving,
    draftInfo,
    recoverDraft,
    discardDraft,
    editingReport,
    cancelEditMode,
    handleSaveRecord,
    handleJuzPageRefresh,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. MAIN CONSOLIDATED DAILY PROGRESS VIEW
// ══════════════════════════════════════════════════════════════════════════════

export default function DailyProgressView({
  timeZone,
  dateFormat,
  filterProps = null,
  isEmbedded = false,
  maxWidth = "7xl",
  className = "",
}: DailyProgressViewProps) {
  const { showToast } = useToast();
  const { activeFont, activeFontSize } = useFont();
  const { isFeatureEnabled, loading: featureLoading } = useFeatureControl();

  const sectionConfig: SectionVisibilityConfig = useMemo(
    () => ({
      headerDate: { enabled: isFeatureEnabled("headerDate") },
      studentSelect: { enabled: isFeatureEnabled("studentSelect") },
      sessionSelect: { enabled: isFeatureEnabled("sessionSelect") },
      juzPageInput: { enabled: isFeatureEnabled("juzPageInput") },
      mistakeTracker: { enabled: isFeatureEnabled("mistakeTracker") },
      stuckTracker: { enabled: isFeatureEnabled("stuckTracker") },
      commentSection: { enabled: isFeatureEnabled("commentSection") },
      actionButtons: { enabled: isFeatureEnabled("actionButtons") },
      pdfExport: { enabled: isFeatureEnabled("pdfExport") },
    }),
    [isFeatureEnabled]
  );

  const {
    selectedDate,
    setSelectedDate,
    studentName,
    setStudentName,
    selectedStudentId,
    setSelectedStudentId,
    groupName,
    setGroupName,
    selectedSession,
    setSelectedSession,
    juzPageData,
    setJuzPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
    comment,
    setComment,
    savedComments,
    studentDatabase,
    sessionList,
    isLoading,
    isSaving,
    draftInfo,
    recoverDraft,
    discardDraft,
    editingReport,
    cancelEditMode,
    handleSaveRecord,
    handleJuzPageRefresh,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  } = useReportForm();

  const academicData = useAcademicData();
  const {
    departments = [],
    classes = [],
    sections = [],
    students: academicStudents = [],
  } = academicData || {};

  useEffect(() => {
    if (filterProps?.selectedDate && filterProps.selectedDate !== selectedDate) {
      setSelectedDate(filterProps.selectedDate);
    }
  }, [filterProps?.selectedDate, selectedDate, setSelectedDate]);

  const PROGRESS_FILTERS_KEY = "spr_daily_progress_filters_v1";

  const [localDeptId, setLocalDeptId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("dept");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(PROGRESS_FILTERS_KEY);
      return saved ? JSON.parse(saved).departmentId || "" : "";
    } catch {
      return "";
    }
  });

  const [localClassId, setLocalClassId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("class");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(PROGRESS_FILTERS_KEY);
      return saved ? JSON.parse(saved).classId || "" : "";
    } catch {
      return "";
    }
  });

  const [localSectionId, setLocalSectionId] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("section");
      if (fromUrl) return fromUrl;
      const saved = localStorage.getItem(PROGRESS_FILTERS_KEY);
      return saved ? JSON.parse(saved).sectionId || "" : "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        PROGRESS_FILTERS_KEY,
        JSON.stringify({
          departmentId: localDeptId || "",
          classId: localClassId || "",
          sectionId: localSectionId || "",
        })
      );
    } catch {
      // Ignore
    }
  }, [localDeptId, localClassId, localSectionId]);

  const selectedDepartmentId =
    filterProps?.selectedDepartmentId !== undefined ? filterProps.selectedDepartmentId : localDeptId;
  const rawOnDepartmentChange =
    filterProps?.onDepartmentChange ||
    ((val: string) => {
      setLocalDeptId(val);
      setLocalClassId("");
      setLocalSectionId("");
    });
  const departmentSelectOptions =
    filterProps?.departmentSelectOptions ||
    (departments || []).map((d: any) => ({
      value: String(d.id),
      label: d.name || d.department_name || `Department ${d.id}`,
    }));
  const hasDepartments =
    filterProps?.hasDepartments !== undefined ? filterProps.hasDepartments : departments && departments.length > 0;

  const selectedClassId =
    filterProps?.selectedClassId !== undefined ? filterProps.selectedClassId : localClassId;
  const rawOnClassChange =
    filterProps?.onClassChange ||
    ((val: string) => {
      setLocalClassId(val);
      setLocalSectionId("");
    });
  const classSelectOptions =
    filterProps?.classSelectOptions ||
    (classes || [])
      .filter((c: any) => !selectedDepartmentId || doesStudentMatchDepartment(c, selectedDepartmentId, departments, classes))
      .map((c: any) => ({
        value: String(c.id),
        label: c.name || c.class_name || `Class ${c.id}`,
      }));

  const selectedSectionId =
    filterProps?.selectedSectionId !== undefined ? filterProps.selectedSectionId : localSectionId;
  const rawOnSectionChange = filterProps?.onSectionChange || setLocalSectionId;

  const updateHierarchy = (deptId: string, clsId: string, secId: string) => {
    const finalDept = deptId || "";
    const finalCls = clsId || "";
    const finalSec = secId || "";

    setLocalDeptId(finalDept);
    setLocalClassId(finalCls);
    setLocalSectionId(finalSec);

    if (filterProps?.onBatchHierarchyChange) {
      filterProps.onBatchHierarchyChange({ departmentId: finalDept, classId: finalCls, sectionId: finalSec });
    } else if (filterProps?.setAcademicFilters) {
      filterProps.setAcademicFilters({ departmentId: finalDept, classId: finalCls, sectionId: finalSec });
    } else {
      if (filterProps?.onDepartmentChange) {
        filterProps.onDepartmentChange(finalDept);
      }
      if (filterProps?.onClassChange) {
        filterProps.onClassChange(finalCls);
      }
      if (filterProps?.onSectionChange) {
        filterProps.onSectionChange(finalSec);
      }
    }
  };

  const allStudentDatabase = useMemo(() => {
    const fullList: any[] = [];
    const seenKeys = new Set<string>();

    const appendStudent = (st: any) => {
      const stName = (typeof st === "object" ? st.name_en || st.name || st.label : String(st || "")).trim();
      if (!stName) return;

      const secSub =
        typeof st === "object"
          ? st.section_name ||
            st.student_section_name ||
            (st.section && typeof st.section === "object" ? st.section.section_name : null) ||
            st.sub ||
            st.group_name ||
            st.student_class_name ||
            ""
          : "";

      const roll = typeof st === "object" ? (st.roll_number ?? st.originalData?.roll_number) : undefined;
      const cardNo = typeof st === "object" ? (st.student_id_card_number ?? st.originalData?.student_id_card_number) : undefined;
      const uniq = typeof st === "object" ? (st.uniq_id ?? st.originalData?.uniq_id) : undefined;
      const rawId = typeof st === "object" && (st?.id != null ? String(st.id) : (st?.student_id != null ? String(st.student_id) : null));
      const key = rawId
        ? `id_${rawId}`
        : uniq
        ? `uniq_${uniq}`
        : cardNo
        ? `card_${cardNo}`
        : roll != null
        ? `roll_${stName.toLowerCase()}_${secSub.toLowerCase()}_${roll}`
        : `raw_${stName.toLowerCase()}_${secSub.toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);

      const badge =
        typeof st === "object" && st.badge
          ? st.badge
          : roll != null
          ? `Roll: ${roll}`
          : cardNo
          ? `ID: ${cardNo}`
          : uniq
          ? `ID: ${uniq}`
          : rawId != null
          ? `ID: ${rawId}`
          : undefined;

      const stClsId = typeof st === "object" ? getClassId(st) || (st.student_class || st.class_id) : undefined;
      const stSecId = typeof st === "object" ? getSectionId(st) || (st.student_section || st.section_id) : undefined;
      const stDeptId = typeof st === "object" ? getDepartmentId(st) || (st.department || st.department_id) : undefined;

      fullList.push({
        id: rawId || undefined,
        label: stName,
        name: stName,
        name_en: typeof st === "object" ? st.name_en || stName : stName,
        sub: secSub,
        section_name: (typeof st === "object" ? st.section_name || st.student_section_name : null) || secSub || undefined,
        roll_number: roll,
        student_id_card_number: cardNo,
        uniq_id: uniq,
        badge,
        student_class: stClsId,
        student_class_name: typeof st === "object" ? st.student_class_name || st.class_name : undefined,
        student_section: stSecId,
        department: stDeptId,
        department_name: typeof st === "object" ? st.department_name : undefined,
        originalData: st,
      });
    };

    (academicStudents || []).forEach(appendStudent);
    (studentDatabase || []).forEach(appendStudent);
    (studentStore.getAll() || []).forEach(appendStudent);

    return sortStudentsByUsage(fullList);
  }, [studentDatabase, academicStudents]);

  const handleDepartmentChange = (newDeptId: string) => {
    setLocalDeptId(newDeptId);
    setLocalClassId("");
    setLocalSectionId("");
    setGroupName("");
    rawOnDepartmentChange(newDeptId);
  };

  const handleClassChange = (newClassId: string) => {
    setLocalClassId(newClassId);
    setLocalSectionId("");
    setGroupName("");
    rawOnClassChange(newClassId);
  };

  const handleSectionChange = (newSecId: string) => {
    setLocalSectionId(newSecId);
    rawOnSectionChange(newSecId);
    if (newSecId) {
      const secObj = (sections || []).find((s: any) => String(s.id) === String(newSecId));
      if (secObj) setGroupName(secObj.section_name || secObj.name || "");
    } else {
      setGroupName("");
    }
  };

  const sectionSelectOptions =
    filterProps?.sectionSelectOptions ||
    (sections || [])
      .filter((s: any) => !selectedClassId || doesStudentMatchClass(s, selectedClassId, classes))
      .map((s: any) => ({
        value: String(s.id),
        label: s.section_name || s.name || `Section ${s.id}`,
      }));

  const hasSectionsForClass =
    filterProps?.hasSectionsForClass !== undefined
      ? filterProps.hasSectionsForClass
      : (sections || []).filter((s: any) => !selectedClassId || doesStudentMatchClass(s, selectedClassId, classes)).length > 0;

  const resolvedAcademicContext = useMemo(() => {
    let deptName = "";
    if (selectedDepartmentId) {
      const opt = (departmentSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedDepartmentId) || String(o.label) === String(selectedDepartmentId)
      );
      deptName = opt?.label || "";
      if (!deptName) {
        const d = (departments || []).find((x: any) => String(x.id) === String(selectedDepartmentId));
        deptName = d?.name || d?.department_name || d?.title || d?.label || "";
      }
    }

    let clsName = "";
    if (selectedClassId) {
      const opt = (classSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedClassId) || String(o.label) === String(selectedClassId)
      );
      clsName = opt?.label || "";
      if (!clsName) {
        const c = (classes || []).find((x: any) => String(x.id) === String(selectedClassId));
        clsName = c?.name || c?.class_name || c?.title || c?.label || "";
      }
    }

    let secName = "";
    if (selectedSectionId) {
      const opt = (sectionSelectOptions || []).find(
        (o: any) => String(o.value) === String(selectedSectionId) || String(o.label) === String(selectedSectionId)
      );
      secName = opt?.label || "";
      if (!secName) {
        const s = (sections || []).find((x: any) => String(x.id) === String(selectedSectionId));
        secName = s?.section_name || s?.name || s?.title || s?.label || "";
      }
    }

    return {
      departmentName: deptName.trim(),
      className: clsName.trim(),
      sectionName: secName.trim(),
    };
  }, [
    selectedDepartmentId,
    selectedClassId,
    selectedSectionId,
    departmentSelectOptions,
    classSelectOptions,
    sectionSelectOptions,
    departments,
    classes,
    sections,
  ]);

  const dailyProgressReportData = useMemo(() => {
    return buildDailyProgressReportData(
      {
        studentName,
        groupName: resolvedAcademicContext.sectionName,
        departmentName: resolvedAcademicContext.departmentName,
        className: resolvedAcademicContext.className,
        sectionName: resolvedAcademicContext.sectionName,
        selectedSession,
        selectedDate,
        juzPageData,
        mistakeData,
        stuckData,
        comment,
      },
      resolvedAcademicContext
    );
  }, [
    studentName,
    resolvedAcademicContext,
    selectedSession,
    selectedDate,
    juzPageData,
    mistakeData,
    stuckData,
    comment,
  ]);

  const isSelectingStudentRef = useRef(false);
  const lastSelectedStudentNameRef = useRef("");

  const handleStudentSelect = (sel: any) => {
    if (!sel) {
      setStudentName("");
      setSelectedStudentId(null);
      setGroupName("");
      lastSelectedStudentNameRef.current = "";
      return;
    }

    let chosenName = "";
    let chosenSub = "";
    let matchedStudent: any = null;
    const isExplicitSelection = typeof sel === "object" && sel !== null;

    if (isExplicitSelection) {
      chosenName = typeof sel.label === "string" ? sel.label : typeof sel.name === "string" ? sel.name : "";
      chosenSub = typeof sel.sub === "string" ? sel.sub : typeof sel.group_name === "string" ? sel.group_name : "";
      matchedStudent = sel.originalData || sel;
    } else {
      chosenName = typeof sel === "string" ? sel : "";
    }

    setStudentName(chosenName);
    const studentExplicitId =
      matchedStudent?.id != null
        ? String(matchedStudent.id)
        : matchedStudent?.student_id != null
        ? String(matchedStudent.student_id)
        : null;
    setSelectedStudentId(studentExplicitId);

    if (!chosenName.trim()) {
      lastSelectedStudentNameRef.current = "";
      return;
    }

    lastSelectedStudentNameRef.current = chosenName.trim();
    if (isExplicitSelection) isSelectingStudentRef.current = true;

    // 1. Locate best academic profile from all student sources
    let academicProfile: any = null;
    if (studentExplicitId) {
      academicProfile =
        (allStudentDatabase || []).find((a: any) => String(a.id) === studentExplicitId) ||
        (academicStudents || []).find((a: any) => String(a.id) === studentExplicitId) ||
        (studentStore.getAll() || []).find((a: any) => String(a.id) === studentExplicitId);
    } else if (chosenName.trim()) {
      const nameMatches = (allStudentDatabase || []).filter(
        (a: any) => (a.name_en || a.name || a.label || "").toLowerCase().trim() === chosenName.toLowerCase().trim()
      );
      if (nameMatches.length === 1) {
        academicProfile = nameMatches[0];
      } else if (nameMatches.length > 1) {
        academicProfile =
          (selectedSectionId && nameMatches.find((a: any) => String(a.student_section || a.section_id) === String(selectedSectionId))) ||
          (selectedClassId && nameMatches.find((a: any) => String(a.student_class || a.class_id) === String(selectedClassId))) ||
          (selectedDepartmentId && nameMatches.find((a: any) => String(a.department || a.department_id) === String(selectedDepartmentId))) ||
          nameMatches[0];
      }
    }

    const candidate = academicProfile || matchedStudent;

    if (candidate) {
      const resolvedId = candidate.id != null ? String(candidate.id) : studentExplicitId;
      if (resolvedId) setSelectedStudentId(resolvedId);
      if (!chosenSub && (candidate.section_name || candidate.student_section_name || candidate.sub || candidate.group_name)) {
        chosenSub = candidate.section_name || candidate.student_section_name || candidate.sub || candidate.group_name;
      }
      recordStudentUsage(candidate);

      // A. Extract Section
      let candSecId =
        getSectionId(candidate) ||
        getSectionId(candidate?.originalData) ||
        getSectionId(matchedStudent) ||
        "";
      if (!candSecId && (candidate.student_section || candidate.section_id || candidate.section)) {
        const rawSec = candidate.student_section || candidate.section_id || candidate.section;
        candSecId = typeof rawSec === "object" ? String(rawSec?.id || "") : String(rawSec || "");
      }
      if (!candSecId && (candidate.section_name || candidate.student_section_name || chosenSub)) {
        const secSearch = (candidate.section_name || candidate.student_section_name || chosenSub).toLowerCase().trim();
        const matchedSec = (sections || []).find(
          (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === secSearch
        );
        if (matchedSec) candSecId = String(matchedSec.id);
      }
      const secObj = candSecId ? (sections || []).find((s: any) => String(s.id) === String(candSecId)) : null;

      // B. Extract Class
      let candClassId =
        getClassId(candidate) ||
        getClassId(candidate?.originalData) ||
        getClassId(matchedStudent) ||
        (secObj ? getClassId(secObj) : "");

      if (!candClassId && (candidate.student_class || candidate.class_id || candidate.academic_class || candidate.academic_class_id)) {
        const rawCls = candidate.student_class || candidate.class_id || candidate.academic_class || candidate.academic_class_id;
        candClassId = typeof rawCls === "object" ? String(rawCls?.id || "") : String(rawCls || "");
      }
      if (!candClassId && (candidate.student_class_name || candidate.class_name)) {
        const targetClsName = (candidate.student_class_name || candidate.class_name || "").toLowerCase().trim();
        const matchedCls = (classes || []).find(
          (c: any) => (c.name || c.class_name || "").toLowerCase().trim() === targetClsName ||
                      (c.code || "").toLowerCase().trim() === targetClsName
        );
        if (matchedCls) candClassId = String(matchedCls.id);
      }
      const classObj = candClassId ? (classes || []).find((c: any) => String(c.id) === String(candClassId)) : null;

      // C. Extract Department
      let candDeptId =
        getDepartmentId(candidate) ||
        getDepartmentId(candidate?.originalData) ||
        getDepartmentId(matchedStudent) ||
        (classObj ? getDepartmentId(classObj) : "") ||
        (secObj ? getDepartmentId(secObj) : "");

      if (!candDeptId && (candidate.department || candidate.department_id || candidate.dept_id)) {
        const rawDept = candidate.department || candidate.department_id || candidate.dept_id;
        candDeptId = typeof rawDept === "object" ? String(rawDept?.id || "") : String(rawDept || "");
      }
      if (!candDeptId && (candidate.department_name || classObj?.department_name)) {
        const targetDeptName = (candidate.department_name || classObj?.department_name || "").toLowerCase().trim();
        const matchedDept = (departments || []).find(
          (d: any) => (d.name || d.department_name || "").toLowerCase().trim() === targetDeptName ||
                      (d.code || "").toLowerCase().trim() === targetDeptName
        );
        if (matchedDept) candDeptId = String(matchedDept.id);
      }

      const effectiveGroupName =
        secObj?.section_name || secObj?.name || candidate.section_name || candidate.student_section_name || candidate.sub || chosenSub || "";
      setGroupName(effectiveGroupName || "");

      // Auto-select resolved Department, Class, and Section
      const targetDept = candDeptId || (classObj ? getDepartmentId(classObj) : "") || selectedDepartmentId || "";
      const targetClass = candClassId || (secObj ? getClassId(secObj) : "") || selectedClassId || "";
      const targetSec = candSecId || "";

      updateHierarchy(targetDept, targetClass, targetSec);
    } else if (chosenSub) {
      const matchedSec = (sections || []).find(
        (s: any) => (s.section_name || s.name || "").toLowerCase().trim() === chosenSub.toLowerCase().trim()
      );
      if (matchedSec) {
        const secClassId = getClassId(matchedSec);
        const classObj = secClassId ? (classes || []).find((c: any) => String(c.id) === String(secClassId)) : null;
        const deptId = classObj ? getDepartmentId(classObj) : "";
        setGroupName(matchedSec.section_name || matchedSec.name || chosenSub);
        updateHierarchy(deptId || selectedDepartmentId || "", secClassId || selectedClassId || "", String(matchedSec.id));
      } else {
        setGroupName(chosenSub);
      }
    }
  };

  const { registerScopeHandler } = useUndoRedo();
  const location = useLocation();
  const isEditMode = Boolean(editingReport);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  useEffect(() => {
    return registerScopeHandler(
      [
        "/studies/daily-classroom",
        "/studies",
        "/studies/daily-progress",
        "/daily-progress",
        location.pathname,
      ],
      {
        undo: handleUndo,
        redo: handleRedo,
        canUndo: canUndoDraft,
        canRedo: canRedoDraft,
        undoTitle: "Restore previous draft state",
        redoTitle: "Restore next draft state",
      }
    );
  }, [registerScopeHandler, handleUndo, handleRedo, canUndoDraft, canRedoDraft, location.pathname]);

  const initialFocusDoneRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !featureLoading && !initialFocusDoneRef.current) {
      initialFocusDoneRef.current = true;
      setTimeout(() => {
        const studentInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="student"], input[placeholder*="Search"]'
        );
        if (studentInput) studentInput.focus();
      }, 150);
    }
  }, [isLoading, featureLoading]);

  const handleMakeReportClick = () => {
    const safeStudent = (studentName || "").trim();
    const safeSession = (selectedSession || "").trim();

    if (sectionConfig.studentSelect?.enabled && !safeStudent) {
      showToast("Please specify a student name first", "warning");
      return;
    }
    if (sectionConfig.sessionSelect?.enabled && !safeSession) {
      showToast("Please select a session first", "warning");
      return;
    }
    const hasJuzPageData = juzPageData.some(
      (d) =>
        String(d.juz || "").trim() !== "" ||
        (d.ranges || []).some(
          (r) => String(r.start || "").trim() !== "" || String(r.end || "").trim() !== ""
        )
    );
    if (sectionConfig.juzPageInput?.enabled && !hasJuzPageData) {
      showToast("Please enter Juz & Page information first", "warning");
      return;
    }

    setIsReportModalOpen(true);
  };

  const createBlankRow = () => ({
    id: crypto.randomUUID(),
    juz: "",
    page: "",
    ayahs: [{ id: crypto.randomUUID(), value: "" }],
  });

  const mistakeRefreshCount = useRef(0);
  const handleMistakeRefresh = () => {
    mistakeRefreshCount.current += 1;
    if (mistakeRefreshCount.current === 1) {
      setMistakeData([createBlankRow()]);
      showToast("Mistakes section reset", "info");
    } else if (mistakeRefreshCount.current >= 2) {
      setMistakeData([createBlankRow()]);
      setStuckData([createBlankRow()]);
      showToast("Mistakes & Stuck sections reset", "info");
      mistakeRefreshCount.current = 0;
    }
  };

  const handleStuckRefresh = () => {
    setStuckData([createBlankRow()]);
    showToast("Stuck section reset", "info");
  };

  const activeDragRef = useRef<{ listType: string; index: number } | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ listType: string; index: number } | null>(null);

  const handleDragStart = (e: React.DragEvent | React.PointerEvent, listType: string, index: number) => {
    const payload = { listType, index };
    activeDragRef.current = payload;
    (window as any).__spr_active_drag_item = payload;
    setDraggedItem(payload);
    if ("dataTransfer" in e && e.dataTransfer) {
      e.dataTransfer.effectAllowed = "copyMove";
      try {
        const json = JSON.stringify(payload);
        e.dataTransfer.setData("application/json", json);
        e.dataTransfer.setData("text/plain", json);
      } catch {
        // Ignore
      }
    }
  };

  const handleDragEnd = () => {
    setTimeout(() => {
      activeDragRef.current = null;
      (window as any).__spr_active_drag_item = null;
      setDraggedItem(null);
    }, 120);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) {
      e.dataTransfer.dropEffect = "copy";
    } else {
      e.dataTransfer.dropEffect = "move";
    }
  };

  const handleReorderRows = (
    sourceListType: string,
    sourceIndex: number,
    targetListType: string,
    targetIndex?: number,
    isCopy: boolean = false
  ) => {
    let newMistake = [...mistakeData];
    let newStuck = [...stuckData];

    let sourceList = sourceListType === "mistake" ? newMistake : newStuck;
    let targetList = targetListType === "mistake" ? newMistake : newStuck;

    const isRowBlank = (r?: any) => {
      if (!r) return true;
      const hasPage = r.page !== undefined && r.page !== null && String(r.page).trim() !== "";
      const hasAyahs = (r.ayahs || []).some(
        (a: any) => a.value !== undefined && a.value !== null && String(a.value).trim() !== ""
      );
      return !hasPage && !hasAyahs;
    };

    if (isCopy) {
      const sourceItem = sourceList[sourceIndex];
      if (!sourceItem) return;

      const itemCopy = {
        ...sourceItem,
        id: crypto.randomUUID(),
        ayahs: (sourceItem.ayahs || []).map((a) => ({ ...a, id: crypto.randomUUID() })),
      };

      if (targetList.length === 1 && isRowBlank(targetList[0])) {
        targetList.splice(0, 1, itemCopy);
      } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
        targetList.splice(targetIndex, 0, itemCopy);
      } else {
        targetList.push(itemCopy);
      }
    } else {
      if (sourceListType === targetListType) {
        if (
          targetIndex !== undefined &&
          targetIndex >= 0 &&
          sourceIndex >= 0 &&
          sourceIndex < targetList.length
        ) {
          const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
          if (adjustedTarget !== sourceIndex) {
            const [movedItem] = targetList.splice(sourceIndex, 1);
            targetList.splice(adjustedTarget, 0, movedItem);
          }
        }
      } else {
        if (sourceIndex >= 0 && sourceIndex < sourceList.length) {
          const [movedItem] = sourceList.splice(sourceIndex, 1);
          if (targetList.length === 1 && isRowBlank(targetList[0])) {
            targetList.splice(0, 1, movedItem);
          } else if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= targetList.length) {
            targetList.splice(targetIndex, 0, movedItem);
          } else {
            targetList.push(movedItem);
          }
          if (sourceList.length === 0) {
            sourceList.push(createBlankRow());
          }
        }
      }
    }

    setMistakeData(newMistake);
    setStuckData(newStuck);
    activeDragRef.current = null;
    (window as any).__spr_active_drag_item = null;
    setDraggedItem(null);
  };

  const handleDrop = (e: React.DragEvent, targetListType: string, targetIndex?: number) => {
    e.preventDefault();

    let sourceListType =
      activeDragRef.current?.listType ||
      (window as any).__spr_active_drag_item?.listType ||
      draggedItem?.listType;
    let sourceIndex =
      activeDragRef.current?.index ??
      (window as any).__spr_active_drag_item?.index ??
      draggedItem?.index;

    if (sourceListType === undefined || sourceIndex === undefined) {
      try {
        const raw = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
        if (raw) {
          const parsed = JSON.parse(raw);
          sourceListType = parsed.listType;
          sourceIndex = parsed.index;
        }
      } catch {
        // Ignore
      }
    }

    if (sourceListType === undefined || sourceIndex === undefined) return;

    const isCopy = e.ctrlKey || e.altKey;
    handleReorderRows(sourceListType, sourceIndex, targetListType, targetIndex, isCopy);
  };

  const availableJuzs = Array.from(
    new Set(
      juzPageData
        .map((d) => d.juz)
        .filter((j) => j !== "" && j !== undefined && j !== null)
    )
  );

  if (isLoading || featureLoading) {
    return <SkeletonLoader type="form" />;
  }

  return (
    <PageContainer
      isEmbedded={isEmbedded || Boolean(filterProps)}
      maxWidth={maxWidth}
      style={{ fontFamily: activeFont?.css, fontSize: activeFontSize?.px }}
      className={`space-y-6 pb-12 transition-all ${className}`}
    >
      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="w-full theme-bg-sub border theme-border rounded-xl p-2.5 sm:p-3 shadow-md flex items-center justify-between gap-2.5 animate-fade-in select-none">
          <div className="flex items-center gap-2 min-w-0 text-left">
            <div className="p-1 rounded-lg theme-bg-accent-soft shrink-0 flex items-center justify-center">
              <EditIcon className="w-4 h-4 theme-accent" />
            </div>
            <div className="text-xs theme-text-primary truncate font-medium">
              Editing report for <span className="font-bold theme-accent">{editingReport?.student_name}</span>
              {editingReport?.formattedDate && (
                <span className="theme-text-secondary"> · {editingReport.formattedDate}</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={cancelEditMode}
            className="theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1"
          >
            <CloseIcon className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Draft Recovery Notification Banner */}
      {draftInfo && Array.isArray(draftInfo) && draftInfo.length > 0 && (
        <div className="w-full theme-bg-surface border theme-border rounded-2xl p-4 shadow-xl space-y-3 animate-fade-in select-none text-left">
          <div className="flex items-center gap-2 border-b theme-border pb-2">
            <ClockIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Unsaved Drafts Found ({draftInfo.length})
            </h4>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {draftInfo.map((draft) => {
              const infoText = draft.studentName
                ? `Student: ${draft.studentName}`
                : draft.comment
                ? `Comment: "${draft.comment.substring(0, 20)}..."`
                : "Empty Draft";
              const timeStr = `${draft.savedAtTime || ""} (${draft.savedAtDate || ""})`;

              return (
                <div
                  key={draft.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-2 rounded-xl theme-bg-sub border theme-border gap-2 hover:border-[var(--accent-main)]/30 transition-colors"
                >
                  <div className="min-w-0 text-xs">
                    <div className="font-bold theme-text-primary truncate">{infoText}</div>
                    <div className="text-[10px] theme-text-secondary mt-0.5">Auto-saved at {timeStr}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => recoverDraft(draft)}
                      className="theme-bg-accent hover:opacity-90 theme-accent-text text-[10px] px-2 py-0.5 rounded-lg font-semibold transition shadow cursor-pointer active:scale-95"
                      title="Load this draft in this window"
                    >
                      Recover
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.open(`/?recover_draft_id=${draft.id}`, "_blank");
                        discardDraft(draft);
                      }}
                      className="theme-bg-elevated hover:theme-bg-accent-soft hover:theme-accent theme-text-primary text-[10px] px-2 py-0.5 rounded-lg font-semibold transition border theme-border cursor-pointer active:scale-95"
                      title="Open this draft in a new tab"
                    >
                      Open in New Tab
                    </button>
                    <IconButton
                      icon={CloseIcon}
                      size="xs"
                      variant="ghost"
                      onClick={() => discardDraft(draft)}
                      title="Discard Draft"
                      ariaLabel="Discard Draft"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Classroom Filter Controls Box */}
      <DailyClassroomFilterControls
        showCardWrapper={true}
        showDate={sectionConfig.headerDate?.enabled !== false}
        dateLabel="Date"
        selectedDate={selectedDate || getClassroomTodayDate()}
        onDateChange={(dateStr: string) => {
          setSelectedDate(dateStr);
          if (filterProps?.onDateChange) filterProps.onDateChange(dateStr);
        }}
        dateFormat={dateFormat || "DD/MM/YYYY"}
        hasDepartments={hasDepartments}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={handleDepartmentChange}
        departmentSelectOptions={departmentSelectOptions}
        selectedClassId={selectedClassId}
        onClassChange={handleClassChange}
        classSelectOptions={classSelectOptions}
        hasSectionsForClass={hasSectionsForClass}
        selectedSectionId={selectedSectionId}
        onSectionChange={handleSectionChange}
        sectionSelectOptions={sectionSelectOptions}
        showPeriodSwitcher={false}
      />

      {/* Card 1: Student & Session Information */}
      {(sectionConfig.studentSelect?.enabled || sectionConfig.sessionSelect?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-6 shadow-xl border theme-border space-y-4">
          <div
            className={`grid grid-cols-1 ${
              sectionConfig.studentSelect?.enabled && sectionConfig.sessionSelect?.enabled
                ? "@[640px]:grid-cols-2"
                : "grid-cols-1"
            } gap-4`}
          >
            {sectionConfig.studentSelect?.enabled && (
              <StudentInputSection
                studentDatabase={allStudentDatabase}
                studentName={studentName}
                studentId={selectedStudentId}
                departmentId={selectedDepartmentId}
                classId={selectedClassId}
                sectionId={selectedSectionId}
                onStudentSelect={handleStudentSelect}
              />
            )}

            {sectionConfig.sessionSelect?.enabled && (
              <SessionInputSection
                sessionList={sessionList}
                selectedSession={selectedSession}
                onSessionChange={setSelectedSession}
              />
            )}
          </div>
        </div>
      )}

      {/* Card 2: Recitation Progress (JUZ / PAGE, MISTAKES, STUCK) */}
      {(sectionConfig.juzPageInput?.enabled ||
        sectionConfig.mistakeTracker?.enabled ||
        sectionConfig.stuckTracker?.enabled) && (
        <div className="theme-bg-surface rounded-2xl p-4 sm:p-6 shadow-xl border theme-border space-y-6">
          {sectionConfig.juzPageInput?.enabled && (
            <JuzPageSection
              data={juzPageData}
              onChange={setJuzPageData}
              onReset={handleJuzPageRefresh}
            />
          )}

          {sectionConfig.juzPageInput?.enabled &&
            (sectionConfig.mistakeTracker?.enabled || sectionConfig.stuckTracker?.enabled) && (
              <div className="border-t theme-border border-opacity-30 my-4 sm:my-5" />
            )}

          {sectionConfig.mistakeTracker?.enabled && (
            <DetailSection
              title="MISTAKE DETAILS"
              listType="mistake"
              data={mistakeData}
              onChange={setMistakeData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
              onReset={handleMistakeRefresh}
            />
          )}

          {sectionConfig.mistakeTracker?.enabled && sectionConfig.stuckTracker?.enabled && (
            <div className="border-t theme-border border-opacity-30 my-4 sm:my-5" />
          )}

          {sectionConfig.stuckTracker?.enabled && (
            <DetailSection
              title="STUCK DETAILS"
              listType="stuck"
              data={stuckData}
              onChange={setStuckData}
              availableJuzs={availableJuzs}
              juzPageData={juzPageData}
              draggedItem={draggedItem}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onReorderRows={handleReorderRows}
              onReset={handleStuckRefresh}
            />
          )}
        </div>
      )}

      {/* Card 3: Comment Section & Action Buttons */}
      {sectionConfig.commentSection?.enabled && (
        <CommentSection
          comment={comment}
          setComment={setComment}
          savedComments={savedComments}
          onAddToRecord={handleSaveRecord}
          onMakeReport={handleMakeReportClick}
          showActions={sectionConfig.actionButtons?.enabled !== false}
          isEditMode={isEditMode}
          isSaving={isSaving}
        />
      )}

      {/* DocLab Quick Report Modal */}
      <DocLabQuickReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        scopeId={DAILY_PROGRESS_SCOPE_ID}
        scopeName="Daily Progress"
        title="Daily Progress Report"
        returnUrl="/studies/daily-progress"
        dataRecord={dailyProgressReportData}
      />
    </PageContainer>
  );
}
