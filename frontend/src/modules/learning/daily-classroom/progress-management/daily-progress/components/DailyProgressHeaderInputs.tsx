import React, { useMemo, useState, useEffect } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import { curriculumStore } from "@/stores";
import { useTenant } from "@/context/TenantContext";
import { useFeatureControl } from "@/context/FeatureControlContext";
import type { StudentProfileOption, SessionItem } from "../types";

import StudentSelector, {
  type StudentSelectorProps as StudentInputSectionProps,
} from "../../../components/StudentSelector";

// ══════════════════════════════════════════════════════════════════════════════
// 1. STUDENT INPUT SECTION (Re-exported from Shared Enterprise StudentSelector)
// ══════════════════════════════════════════════════════════════════════════════
export { StudentSelector as StudentInputSection };
export type { StudentInputSectionProps };


// ══════════════════════════════════════════════════════════════════════════════
// 2. SESSION INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface SessionInputSectionProps {
  sessionList?: (string | SessionItem)[];
  selectedSession?: string;
  onSessionChange?: (val: string) => void;
  actionLabel?: string | null;
  actionTo?: string | null;
}

export function SessionInputSection({
  sessionList = [],
  selectedSession = "",
  onSessionChange,
  actionLabel,
  actionTo,
}: SessionInputSectionProps) {
  const { isFeatureEnabled } = useFeatureControl();
  const canAddSession = isFeatureEnabled('progress_action_add_session');

  const effectiveActionLabel = actionLabel !== undefined
    ? actionLabel
    : (canAddSession ? "+ Add Session" : undefined);
  const effectiveActionTo = actionTo !== undefined
    ? actionTo
    : (canAddSession ? "/admin-tools?tab=report-sessions" : undefined);

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
        actionLabel={effectiveActionLabel}
        actionTo={effectiveActionTo}
        actionTitle="Add or manage sessions"
        size="md"
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. LESSON INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface LessonInputSectionProps {
  lessonTitle?: string;
  onLessonChange?: (val: string) => void;
  selectedClassId?: string;
  selectedSectionId?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function LessonInputSection({
  lessonTitle = "",
  onLessonChange,
  selectedClassId,
  selectedSectionId,
  label = "LESSON",
  placeholder = "e.g. Lesson title, topic, or chapter...",
  disabled = false,
}: LessonInputSectionProps) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || "default";

  // Load curriculum books & lessons to provide intelligent suggestions
  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const items = curriculumStore?.getCurriculumItems?.(tenantId) || [];
      setCurriculumItems(Array.isArray(items) ? items : []);
    } catch {
      setCurriculumItems([]);
    }
  }, [tenantId]);

  const lessonOptions: AutocompleteOption[] = useMemo(() => {
    const list: AutocompleteOption[] = [];
    const seen = new Set<string>();

    (curriculumItems || []).forEach((item: any) => {
      const title = (item?.title || item?.name || item?.subject || "").trim();
      if (title && !seen.has(title.toLowerCase())) {
        seen.add(title.toLowerCase());
        list.push({
          label: title,
          value: title,
          sub: item?.subject || item?.category || undefined,
        });
      }
    });

    return list;
  }, [curriculumItems]);

  const handleSelectOption = (option: any) => {
    if (!onLessonChange) return;
    if (typeof option === "string") {
      onLessonChange(option);
    } else if (typeof option === "object" && option !== null) {
      onLessonChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={lessonOptions}
        value={lessonTitle}
        onChange={handleSelectOption}
        onQueryChange={(val) => onLessonChange && onLessonChange(val || "")}
        onAddNew={(val) => onLessonChange && onLessonChange(val || "")}
        placeholder={placeholder}
        label={label}
        // actionLabel="+ Plan Lesson"
        // actionTo="/studies/daily-classroom?tab=lessons"
        // actionTitle="Open Lesson Management"
        size="md"
        disabled={disabled}
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. BOOK / SUBJECT NAME INPUT SECTION
// ══════════════════════════════════════════════════════════════════════════════

export interface BookSubjectInputSectionProps {
  bookTitle?: string;
  onBookChange?: (val: string) => void;
  selectedClassId?: string;
  selectedSectionId?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function BookSubjectInputSection({
  bookTitle = "",
  onBookChange,
  selectedClassId,
  selectedSectionId,
  label = "BOOK / SUBJECT NAME",
  placeholder = "e.g. Bukhari, Math, English...",
  disabled = false,
}: BookSubjectInputSectionProps) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || "default";

  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);

  useEffect(() => {
    try {
      const items =
        curriculumStore?.getItems?.(tenantId) ||
        curriculumStore?.getCurriculumItems?.(tenantId) ||
        [];
      setCurriculumItems(Array.isArray(items) ? items : []);
    } catch {
      setCurriculumItems([]);
    }
  }, [tenantId]);

  const bookOptions: AutocompleteOption[] = useMemo(() => {
    const list: AutocompleteOption[] = [];
    const seen = new Set<string>();

    (curriculumItems || []).forEach((item: any) => {
      const name = (item?.name || item?.title || item?.subject || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({
          label: name,
          value: name,
          sub: item?.subject || item?.className || item?.category || undefined,
        });
      }
    });

    return list;
  }, [curriculumItems]);

  const handleSelectOption = (option: any) => {
    if (!onBookChange) return;
    if (typeof option === "string") {
      onBookChange(option);
    } else if (typeof option === "object" && option !== null) {
      onBookChange(option.value || option.label || "");
    }
  };

  return (
    <div className="w-full">
      <AutocompleteDropdown
        options={bookOptions}
        value={bookTitle}
        onChange={handleSelectOption}
        onQueryChange={(val) => onBookChange && onBookChange(val || "")}
        onAddNew={(val) => onBookChange && onBookChange(val || "")}
        placeholder={placeholder}
        label={label}
        actionLabel="+ Add Book"
        actionTo="/studies/daily-classroom?tab=curriculum"
        actionTitle="Open Curriculum Books & Subjects"
        size="md"
        disabled={disabled}
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}
