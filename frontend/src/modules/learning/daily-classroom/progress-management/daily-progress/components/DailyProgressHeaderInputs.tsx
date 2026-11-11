import React, { useMemo, useState, useEffect, useCallback } from "react";
import AutocompleteDropdown, { type AutocompleteOption } from "@/components/ui/AutocompleteDropdown";
import { curriculumStore, learningStore } from "@/stores";
import { getDailyLessons } from "@/api/learning";
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

  const effectiveActionLabel = canAddSession
    ? (actionLabel !== undefined ? actionLabel : "+ Add Session")
    : null;
  const effectiveActionTo = canAddSession
    ? (actionTo !== undefined ? actionTo : "/admin-tools?tab=report-sessions")
    : null;

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
        showAllOptionsOnFocus={true}
      />
    </div>
  );
}

/**
 * Shared live catalog hook for Book / Subject & Lesson inputs in Book mode.
 * Reads curriculumStore.getItems + learningStore.getDailyLessons + backend daily-lessons API
 * and listens for system-wide update events so suggestions stay populated and never hidden.
 */
function useBookAndLessonCatalog(tenantId: string) {
  const [curriculumItems, setCurriculumItems] = useState<any[]>([]);
  const [dailyLessons, setDailyLessons] = useState<any[]>([]);

  const loadLocalCatalog = useCallback(() => {
    try {
      const books = curriculumStore?.getItems?.(tenantId) || [];
      setCurriculumItems(Array.isArray(books) ? books : []);
    } catch {
      setCurriculumItems([]);
    }
    try {
      const localLessons = learningStore?.getDailyLessons?.(tenantId) || [];
      if (Array.isArray(localLessons) && localLessons.length > 0) {
        setDailyLessons(localLessons);
      }
    } catch {}
  }, [tenantId]);

  useEffect(() => {
    loadLocalCatalog();

    let isMounted = true;
    getDailyLessons({ page_size: 200 })
      .then((res: any) => {
        if (!isMounted) return;
        const rows = Array.isArray(res) ? res : (Array.isArray(res?.results) ? res.results : []);
        if (rows.length > 0) {
          setDailyLessons(rows);
        }
      })
      .catch(() => {});

    const syncEvents = [
      "spr_curriculum_updated",
      "spr_lessons_updated",
      "spr_lesson_plans_updated",
      "spr_tenant_changed",
    ];
    syncEvents.forEach((evt) => window.addEventListener(evt, loadLocalCatalog));
    return () => {
      isMounted = false;
      syncEvents.forEach((evt) => window.removeEventListener(evt, loadLocalCatalog));
    };
  }, [loadLocalCatalog]);

  return { curriculumItems, dailyLessons };
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
  label = "LESSON",
  placeholder = "e.g. Lesson title, topic, or chapter...",
  disabled = false,
}: LessonInputSectionProps) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || "default";
  const { curriculumItems, dailyLessons } = useBookAndLessonCatalog(tenantId);

  const lessonOptions: AutocompleteOption[] = useMemo(() => {
    const list: AutocompleteOption[] = [];
    const seen = new Set<string>();

    const pushOption = (rawTitle: any, sub?: string) => {
      const title = String(rawTitle || "").trim();
      if (title && !seen.has(title.toLowerCase())) {
        seen.add(title.toLowerCase());
        list.push({ label: title, value: title, sub: sub || undefined });
      }
    };

    (dailyLessons || []).forEach((lesson: any) => {
      pushOption(
        lesson?.lesson_title || lesson?.lesson_topic,
        lesson?.curriculum_book_name || lesson?.subject_name || lesson?.class_name
      );
    });

    (curriculumItems || []).forEach((item: any) => {
      pushOption(
        item?.current_lesson || item?.title || item?.name || item?.subject,
        item?.subject || item?.category
      );
    });

    return list;
  }, [curriculumItems, dailyLessons]);

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
  label = "BOOK / SUBJECT NAME",
  placeholder = "e.g. Bukhari, Math, English...",
  disabled = false,
}: BookSubjectInputSectionProps) {
  const { activeTenantId } = useTenant();
  const tenantId = activeTenantId || "default";
  const { curriculumItems, dailyLessons } = useBookAndLessonCatalog(tenantId);

  const bookOptions: AutocompleteOption[] = useMemo(() => {
    const list: AutocompleteOption[] = [];
    const seen = new Set<string>();

    const pushOption = (rawName: any, sub?: string) => {
      const name = String(rawName || "").trim();
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        list.push({ label: name, value: name, sub: sub || undefined });
      }
    };

    (curriculumItems || []).forEach((item: any) => {
      pushOption(
        item?.name || item?.title || item?.subject,
        item?.subject || item?.className || item?.category
      );
    });

    (dailyLessons || []).forEach((lesson: any) => {
      pushOption(
        lesson?.curriculum_book_name || lesson?.subject_name,
        lesson?.class_name || lesson?.department_name
      );
    });

    return list;
  }, [curriculumItems, dailyLessons]);

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
