import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  auth as authStore,
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
  getLocalReports,
  syncSessionsAndComments,
  scheduleGracePeriodSync,
  clearGracePeriodTimer,
  commitReportToCloud,
} from "@/utils/syncEngine";
import { dailyProgressRepository } from "@/offline";
import { updateReport } from "@/api/reports";
import { fetchWithAuth } from "@/utils/authService";
import { recordStudentUsage } from "@/utils/studentUsageTracker";
import { getClassroomTodayDate } from "@/constants/calendarConstants";
import { useAcademicData } from "@/hooks/useAcademicData";
import {
  doesStudentMatchDepartment,
  doesStudentMatchClass,
  doesStudentMatchSection,
  normalizeToISODate,
} from "@/modules/learning/daily-classroom/utils/dailyClassroomUtils";
import type { JuzRowData, DetailRowData, DailyProgressDraft } from "../types";

export interface AcademicValidationContext {
  departmentId?: string | number | null;
  classId?: string | number | null;
  sectionId?: string | number | null;
  allStudents?: any[];
  departments?: any[];
  classes?: any[];
  sections?: any[];
}

export function useReportForm() {
  const { showToast } = useToast();
  const academicData = (useAcademicData() as any) || {};
  const {
    departments: defaultDepartments = [],
    classes: defaultClasses = [],
    sections: defaultSections = [],
    students: defaultAcademicStudents = [],
  } = academicData;

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlDate = params.get("date");
      if (urlDate) {
        const norm = normalizeToISODate(urlDate);
        if (norm) return norm;
      }
    }
    return getClassroomTodayDate();
  });
  const [studentName, setStudentName] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | number | null>(null);
  const [groupName, setGroupName] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");

  // Current logged-in user as default teacher (guaranteed fallback to never be empty)
  const authContext = (useAuth() as any) || {};
  const user = authContext.user;

  const defaultTeacherId = useMemo(() => {
    const u = user || authStore.getUser?.() || authStore.getUserProfile?.() || null;
    if (u?.id) return String(u.id);
    if (u?.user_id) return String(u.user_id);
    if (u?.staff_id) return String(u.staff_id);
    if (u?.pk) return String(u.pk);
    return "";
  }, [user]);

  const defaultTeacherName = useMemo(() => {
    const u = user || authStore.getUser?.() || authStore.getUserProfile?.() || null;
    if (u?.full_name) return String(u.full_name);
    if (u?.name) return String(u.name);
    if (u?.first_name || u?.last_name) {
      return [u.first_name, u.last_name].filter(Boolean).join(" ");
    }
    if (u?.user_name) return String(u.user_name);
    if (u?.username) return String(u.username);
    return "Staff Teacher";
  }, [user]);

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => defaultTeacherId);
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>(() => defaultTeacherName);

  // Guarantee teacher is never empty or "ALL" in Daily Progress
  useEffect(() => {
    if (defaultTeacherId && (!selectedTeacherId || selectedTeacherId === "ALL" || selectedTeacherId === "")) {
      setSelectedTeacherId(defaultTeacherId);
    }
    if (defaultTeacherName && (!selectedTeacherName || selectedTeacherName === "All Teachers" || selectedTeacherName === "")) {
      setSelectedTeacherName(defaultTeacherName);
    }
  }, [defaultTeacherId, defaultTeacherName, selectedTeacherId, selectedTeacherName]);

  const [progressMode, setProgressModeState] = useState<"QURAN" | "BOOK">(() => {
    if (typeof window !== "undefined") {
      if (window.location.pathname.includes("/daily-progress/book")) return "BOOK";
      if (window.location.pathname.includes("/daily-progress/quran")) return "QURAN";
    }
    try {
      return (localStorage.getItem("spr_daily_progress_mode") as "QURAN" | "BOOK") || "QURAN";
    } catch {
      return "QURAN";
    }
  });

  const setProgressMode = useCallback((mode: "QURAN" | "BOOK") => {
    setProgressModeState(mode);
    try {
      localStorage.setItem("spr_daily_progress_mode", mode);
      window.dispatchEvent(new CustomEvent("spr_daily_progress_mode_change", { detail: mode }));
      if (typeof window !== "undefined") {
        const curPath = window.location.pathname;
        if (curPath.includes("/daily-progress/")) {
          const target = `/studies/daily-progress/${mode.toLowerCase()}${window.location.search}`;
          if (curPath !== `/studies/daily-progress/${mode.toLowerCase()}`) {
            window.history.replaceState(null, "", target);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleSync = (e: any) => {
      if (e?.detail && (e.detail === "QURAN" || e.detail === "BOOK")) {
        setProgressModeState(e.detail);
      }
    };
    window.addEventListener("spr_daily_progress_mode_change", handleSync);
    return () => window.removeEventListener("spr_daily_progress_mode_change", handleSync);
  }, []);

  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window !== "undefined") {
        if (window.location.pathname.includes("/daily-progress/book")) {
          setProgressModeState("BOOK");
        } else if (window.location.pathname.includes("/daily-progress/quran")) {
          setProgressModeState("QURAN");
        }
      }
    };
    window.addEventListener("popstate", handleUrlSync);
    return () => window.removeEventListener("popstate", handleUrlSync);
  }, []);

  const [bookTitle, setBookTitle] = useState<string>("");
  const [lessonTitle, setLessonTitle] = useState<string>("");

  // Single Unified Form Engine State
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

  // Backward-compatible unified aliases
  const bookPageData = juzPageData;
  const setBookPageData = setJuzPageData;
  const bookMistakeData = mistakeData;
  const setBookMistakeData = setMistakeData;
  const bookStuckData = stuckData;
  const setBookStuckData = setStuckData;

  const [comment, setComment] = useState<string>("");
  const [savedComments, setSavedComments] = useState<string[]>(() => commentStore.getAll());

  const [studentDatabase, setStudentDatabase] = useState<any[]>(() => {
    try {
      const fromStore = studentStore.getAll() || [];
      if (fromStore.length > 0) return fromStore;
      const tenantId = localStorage.getItem("spr_active_tenant_id") || "default";
      const fromCache = JSON.parse(localStorage.getItem(`spr_students_cache_${tenantId}`) || "[]");
      if (Array.isArray(fromCache) && fromCache.length > 0) {
        return fromCache.map((s: any) => ({
          ...(typeof s === "object" ? s : {}),
          id: typeof s === "object" ? s.id : null,
          label: typeof s === "object" ? (s.name_en || s.name || s.student_name || s.label || String(s)) : String(s),
          sub: s?.section_name || s?.student_section_name || s?.sub || s?.group_name || "",
          section_name: s?.section_name || s?.student_section_name || s?.sub || "",
          student_section: s?.student_section || s?.section_id || s?.section,
          student_class: s?.student_class || s?.class_id,
        }));
      }
      return [];
    } catch {
      return [];
    }
  });
  const [sessionList, setSessionList] = useState<any[]>(() => {
    try {
      return sessionStore.getAll() || [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingReport, setEditingReport] = useState<any | null>(null);

  const historyStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringRef = useRef(false);
  const [canUndoDraft, setCanUndoDraft] = useState(false);
  const [canRedoDraft, setCanRedoDraft] = useState(false);

  const captureSnapshot = useCallback(() => {
    return JSON.stringify({
      studentName,
      selectedStudentId,
      groupName,
      selectedSession,
      progressMode,
      bookTitle,
      lessonTitle,
      selectedDate,
      juzPageData,
      mistakeData,
      stuckData,
      bookPageData,
      bookMistakeData,
      bookStuckData,
      comment,
      savedReportId: editingReport?.id,
      savedReportKey: editingReport?.report_unique_id,
      serverId: editingReport?.server_id,
      isGracePeriod: editingReport?.isGracePeriod,
    });
  }, [
    studentName,
    selectedStudentId,
    groupName,
    selectedSession,
    progressMode,
    bookTitle,
    lessonTitle,
    selectedDate,
    juzPageData,
    mistakeData,
    stuckData,
    bookPageData,
    bookMistakeData,
    bookStuckData,
    comment,
    editingReport,
  ]);

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
      setCanUndoDraft(stack.length > 1);
      setCanRedoDraft(false);
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
    setCanUndoDraft(stack.length > 1);
    setCanRedoDraft(redoStackRef.current.length > 0);

    const prevSnapStr = stack[stack.length - 1];
    if (prevSnapStr) {
      try {
        const data = JSON.parse(prevSnapStr);
        isRestoringRef.current = true;
        setStudentName(data.studentName || "");
        setSelectedStudentId(data.selectedStudentId || null);
        setGroupName(data.groupName || "");
        setSelectedSession(data.selectedSession || "");
        if (data.progressMode) {
          setProgressMode(data.progressMode);
        }
        setBookTitle(data.bookTitle || "");
        setLessonTitle(data.lessonTitle || "");
        if (data.selectedDate) setSelectedDate(data.selectedDate);

        // Restore pages (unified engine)
        const resolvedPages =
          (Array.isArray(data.juzPageData) && data.juzPageData.length > 0)
            ? data.juzPageData
            : (Array.isArray(data.bookPageData) && data.bookPageData.length > 0)
            ? data.bookPageData
            : [];
        if (resolvedPages.length > 0) {
          setJuzPageData(resolvedPages);
        } else {
          setJuzPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
        }

        // Restore mistakes
        const resolvedMistakes =
          (Array.isArray(data.mistakeData) && data.mistakeData.length > 0)
            ? data.mistakeData
            : (Array.isArray(data.bookMistakeData) && data.bookMistakeData.length > 0)
            ? data.bookMistakeData
            : [];
        if (resolvedMistakes.length > 0) {
          setMistakeData(resolvedMistakes);
        } else {
          setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
        }

        // Restore stucks
        const resolvedStucks =
          (Array.isArray(data.stuckData) && data.stuckData.length > 0)
            ? data.stuckData
            : (Array.isArray(data.bookStuckData) && data.bookStuckData.length > 0)
            ? data.bookStuckData
            : [];
        if (resolvedStucks.length > 0) {
          setStuckData(resolvedStucks);
        } else {
          setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
        }

        setComment(data.comment || "");

        if (data.savedReportId || data.savedReportKey || data.serverId) {
          if (data.savedReportId) clearGracePeriodTimer(data.savedReportId);
          setEditingReport({
            id: data.savedReportId,
            server_id: data.serverId,
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
    setCanUndoDraft(historyStackRef.current.length > 1);
    setCanRedoDraft(rStack.length > 0);

    try {
      const data = JSON.parse(nextSnapStr);
      isRestoringRef.current = true;
      setStudentName(data.studentName || "");
      setSelectedStudentId(data.selectedStudentId || null);
      setGroupName(data.groupName || "");
      setSelectedSession(data.selectedSession || "");
      if (data.progressMode) {
        setProgressMode(data.progressMode);
      }
      setBookTitle(data.bookTitle || "");
      setLessonTitle(data.lessonTitle || "");
      if (data.selectedDate) setSelectedDate(data.selectedDate);

      // Restore pages (unified engine)
      const resolvedPages =
        (Array.isArray(data.juzPageData) && data.juzPageData.length > 0)
          ? data.juzPageData
          : (Array.isArray(data.bookPageData) && data.bookPageData.length > 0)
          ? data.bookPageData
          : [];
      if (resolvedPages.length > 0) {
        setJuzPageData(resolvedPages);
      } else {
        setJuzPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
      }

      // Restore mistakes
      const resolvedMistakes =
        (Array.isArray(data.mistakeData) && data.mistakeData.length > 0)
          ? data.mistakeData
          : (Array.isArray(data.bookMistakeData) && data.bookMistakeData.length > 0)
          ? data.bookMistakeData
          : [];
      if (resolvedMistakes.length > 0) {
        setMistakeData(resolvedMistakes);
      } else {
        setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
      }

      // Restore stucks
      const resolvedStucks =
        (Array.isArray(data.stuckData) && data.stuckData.length > 0)
          ? data.stuckData
          : (Array.isArray(data.bookStuckData) && data.bookStuckData.length > 0)
          ? data.bookStuckData
          : [];
      if (resolvedStucks.length > 0) {
        setStuckData(resolvedStucks);
      } else {
        setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
      }

      setComment(data.comment || "");

      if (data.savedReportId || data.savedReportKey || data.serverId) {
        if (data.savedReportId) clearGracePeriodTimer(data.savedReportId);
        setEditingReport({
          id: data.savedReportId,
          server_id: data.serverId,
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
  const [draftInfo, setDraftInfo] = useState<DailyProgressDraft[] | null>(null);

  const [currentDraftId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("recover_draft_id") || "active_report_draft";
  });

  const applyReportToForm = useCallback((rep: any) => {
    if (!rep) return;

    let sName = rep.student_name || rep.studentName || (typeof rep.student === "object" ? rep.student?.name || rep.student?.name_en : null) || (typeof rep.student === "string" && isNaN(Number(rep.student)) ? rep.student : "") || "";
    const gName = rep.student_group || rep.subject_course || "";
    const sSession = rep.session_name || rep.session || "";
    const sId =
      rep.student_id ||
      rep.studentId ||
      (typeof rep.student === "object" ? rep.student?.id : null) ||
      (typeof rep.student === "number" || (typeof rep.student === "string" && !isNaN(Number(rep.student)))
        ? rep.student
        : null);

    const isNumericName = Boolean(sName && /^\d+$/.test(String(sName).trim()));
    if (isNumericName) {
      const realCandidate =
        rep.student_details?.name_en ||
        rep.student_details?.name ||
        rep.student_details?.label ||
        (sId ? defaultAcademicStudents.find((s: any) => String(s.id) === String(sId))?.name_en : null) ||
        (sId ? defaultAcademicStudents.find((s: any) => String(s.id) === String(sId))?.name : null);
      if (realCandidate) {
        sName = realCandidate;
      }
    }

    const rDate = normalizeToISODate(
      rep.report_date ||
      rep.isoDateOnly ||
      rep.date ||
      rep.record_date ||
      rep.selectedDate ||
      rep.date_time ||
      rep.created_at
    );

    setStudentName(sName);
    setSelectedStudentId(sId != null ? String(sId) : null);
    setGroupName(gName);
    setSelectedSession(sSession);
    if (rDate) setSelectedDate(rDate);

    const repTeacherId =
      rep.teacher_id ||
      rep.teacher?.id ||
      (typeof rep.teacher === "number" || (typeof rep.teacher === "string" && /^\d+$/.test(rep.teacher)) ? String(rep.teacher) : "");
    const repTeacherName =
      rep.teacher_name ||
      rep.teacher?.name ||
      rep.teacher?.user_name ||
      (typeof rep.teacher === "string" && isNaN(Number(rep.teacher)) ? rep.teacher : "");

    setSelectedTeacherId(repTeacherId || defaultTeacherId);
    setSelectedTeacherName(repTeacherName || defaultTeacherName);

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

    const isBookMode = Boolean(
      rep.mode === "BOOK" ||
      rep.progress_mode === "BOOK" ||
      rep.book_title ||
      rep.curriculum_book_name ||
      rep.lesson_title ||
      rep.lesson_covered ||
      (Array.isArray(rep.bookPageData) && rep.bookPageData.length > 0)
    );
    if (isBookMode) {
      setProgressMode("BOOK");
      const bookPagesSource = rep.bookPageData || rep.juz_and_pages || rep.portions || [];
      if (Array.isArray(bookPagesSource) && bookPagesSource.length > 0) {
        setJuzPageData(
          bookPagesSource.map((jp: any) => ({
            id: crypto.randomUUID(),
            juz: "",
            ranges: Array.isArray(jp.ranges)
              ? jp.ranges.map((r: any) => ({
                  id: crypto.randomUUID(),
                  start: String(r.start || r.page_start || ""),
                  end: String(r.end || r.page_end || ""),
                }))
              : [{ id: crypto.randomUUID(), start: "", end: "" }],
          }))
        );
      }
      const bookMistakesSource = rep.bookMistakeData || rep.mistake_details || rep.mistakes || (Array.isArray(rep.error_details) ? rep.error_details.filter((e: any) => e.type === "Mistake") : []);
      if (Array.isArray(bookMistakesSource) && bookMistakesSource.length > 0) {
        setMistakeData(
          bookMistakesSource.map((m: any) => ({
            id: crypto.randomUUID(),
            juz: "",
            page: String(m.page || ""),
            ayahs: Array.isArray(m.ayahs)
              ? m.ayahs.map((a: any) => ({ id: crypto.randomUUID(), value: String(a.value || a || "") }))
              : [{ id: crypto.randomUUID(), value: String(m.ayah || "") }],
          }))
        );
      }
      const bookStucksSource = rep.bookStuckData || rep.stuck_details || rep.stucks || (Array.isArray(rep.error_details) ? rep.error_details.filter((e: any) => e.type === "Stuck") : []);
      if (Array.isArray(bookStucksSource) && bookStucksSource.length > 0) {
        setStuckData(
          bookStucksSource.map((s: any) => ({
            id: crypto.randomUUID(),
            juz: "",
            page: String(s.page || ""),
            ayahs: Array.isArray(s.ayahs)
              ? s.ayahs.map((a: any) => ({ id: crypto.randomUUID(), value: String(a.value || a || "") }))
              : [{ id: crypto.randomUUID(), value: String(s.ayah || "") }],
          }))
        );
      }
    } else {
      setProgressMode("QURAN");
    }

    setComment(rep.comment || "");
    setBookTitle(rep.curriculum_book_name || rep.book_name || rep.bookName || rep.bookTitle || rep.book || "");
    setLessonTitle(rep.lesson_title || rep.lesson_covered || rep.lessonTitle || rep.lesson || "");
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
        if (recovered.progressMode) setProgressMode(recovered.progressMode);
        if (recovered.bookTitle !== undefined) setBookTitle(recovered.bookTitle);
        if (recovered.lessonTitle !== undefined) setLessonTitle(recovered.lessonTitle);
        if (recovered.bookPageData?.length) setBookPageData(recovered.bookPageData);
        if (recovered.bookMistakeData?.length) setBookMistakeData(recovered.bookMistakeData);
        if (recovered.bookStuckData?.length) setBookStuckData(recovered.bookStuckData);
        if (recovered.comment !== undefined) setComment(recovered.comment);

        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        showToast("Report draft recovered successfully!", "success");
      }
    } else {
      // Check for unsaved drafts with substantive content across storage
      const allDrafts = draftReport.getAll();
      const unsavedDrafts = allDrafts.filter((d: any) => {
        const hasContent = Boolean(
          (d.studentName && String(d.studentName).trim()) ||
          (d.comment && String(d.comment).trim()) ||
          d.selectedSession ||
          (d.bookTitle && String(d.bookTitle).trim()) ||
          (d.lessonTitle && String(d.lessonTitle).trim()) ||
          (Array.isArray(d.juzPageData) && d.juzPageData.some((j: any) => j.juz || (j.ranges || []).some((r: any) => r.start || r.end))) ||
          (Array.isArray(d.mistakeData) && d.mistakeData.some((m: any) => m.page || (m.ayahs || []).some((a: any) => a.value))) ||
          (Array.isArray(d.bookPageData) && d.bookPageData.some((b: any) => (b.ranges || []).some((r: any) => r.start || r.end))) ||
          d.hasData
        );
        return hasContent;
      });

      if (unsavedDrafts.length > 0) {
        setDraftInfo(unsavedDrafts);
      } else {
        // Fallback: check Central IndexedDB draft if localStorage was cleared
        dailyProgressRepository.getDraft(currentDraftId).then((idbDraft) => {
          if (idbDraft && typeof idbDraft === "object") {
            const hasIdbContent = Boolean(
              idbDraft.studentName || idbDraft.comment || idbDraft.selectedSession || idbDraft.hasData
            );
            if (hasIdbContent) {
              setDraftInfo([{ id: currentDraftId, ...idbDraft }]);
            }
          }
        }).catch(() => {});
      }
    }

    const pendingEditRaw = localStorage.getItem("spr_editing_report");
    if (pendingEditRaw) {
      try {
        const pendingEdit = JSON.parse(pendingEditRaw);
        if (pendingEdit && typeof pendingEdit === "object") {
          applyReportToForm(pendingEdit);
          setTimeout(() => {
            try {
              localStorage.removeItem("spr_editing_report");
            } catch {}
          }, 800);
        }
      } catch (err) {
        console.error("Failed to parse pending edit report:", err);
      }
    }
  }, [currentDraftId, applyReportToForm, showToast]);

  useEffect(() => {
    const handleEditEvent = (e: any) => {
      const rep = e?.detail;
      if (rep && typeof rep === "object") {
        applyReportToForm(rep);
      }
    };
    window.addEventListener("spr_edit_report", handleEditEvent);
    return () => window.removeEventListener("spr_edit_report", handleEditEvent);
  }, [applyReportToForm]);

  useEffect(() => {
    commentStore.saveAll(savedComments);
  }, [savedComments]);

  useEffect(() => {
    const hasAnyContent = Boolean(
      studentName.trim() ||
      groupName.trim() ||
      selectedSession ||
      bookTitle.trim() ||
      lessonTitle.trim() ||
      comment.trim() ||
      juzPageData.some((d) => d.juz || (d.ranges || []).some((r) => r.start || r.end)) ||
      mistakeData.some((m) => m.page || m.juz || (m.ayahs || []).some((a) => a.value)) ||
      stuckData.some((s) => s.page || s.juz || (s.ayahs || []).some((a) => a.value)) ||
      bookPageData.some((d) => (d.ranges || []).some((r) => r.start || r.end)) ||
      bookMistakeData.some((m) => m.page || (m.ayahs || []).some((a) => a.value)) ||
      bookStuckData.some((s) => s.page || (s.ayahs || []).some((a) => a.value))
    );

    const activeStudentObj = (studentDatabase || []).find(
      (s: any) =>
        (selectedStudentId && String(s.id) === String(selectedStudentId)) ||
        (studentName && (s.name === studentName || s.name_en === studentName))
    );

    const draftPayload = {
      id: currentDraftId,
      studentName,
      selectedStudentId,
      groupName,
      selectedSession,
      progressMode,
      bookTitle,
      lessonTitle,
      selectedDate,
      juzPageData,
      mistakeData,
      stuckData,
      bookPageData,
      bookMistakeData,
      bookStuckData,
      comment,
      departmentId: activeStudentObj?.department_id || activeStudentObj?.department,
      classId: activeStudentObj?.academic_class_id || activeStudentObj?.class_id || activeStudentObj?.student_class,
      sectionId: activeStudentObj?.section_id || activeStudentObj?.student_section,
      hasData: hasAnyContent,
    };

    if (hasAnyContent) {
      draftReport.save(currentDraftId, draftPayload);
      dailyProgressRepository.saveDraft(currentDraftId, draftPayload).catch(() => {});
      saveStatusStore.set("local", "Saved");
    } else {
      draftReport.remove(currentDraftId);
      dailyProgressRepository.clearDraft(currentDraftId).catch(() => {});
    }
  }, [
    studentName,
    selectedStudentId,
    groupName,
    selectedSession,
    progressMode,
    bookTitle,
    lessonTitle,
    selectedDate,
    juzPageData,
    mistakeData,
    stuckData,
    bookPageData,
    bookMistakeData,
    bookStuckData,
    comment,
    currentDraftId,
  ]);

  const recoverDraft = (draft: any) => {
    if (!draft) return;
    if (draft.studentName !== undefined) setStudentName(draft.studentName);
    if (draft.selectedStudentId !== undefined) setSelectedStudentId(draft.selectedStudentId);
    if (draft.groupName !== undefined) setGroupName(draft.groupName);
    if (draft.selectedSession !== undefined) setSelectedSession(draft.selectedSession);
    if (draft.progressMode !== undefined) setProgressMode(draft.progressMode);
    if (draft.bookTitle !== undefined) setBookTitle(draft.bookTitle);
    if (draft.lessonTitle !== undefined) setLessonTitle(draft.lessonTitle);
    if (draft.selectedDate !== undefined) setSelectedDate(draft.selectedDate);
    if (draft.juzPageData?.length) setJuzPageData(draft.juzPageData);
    if (draft.mistakeData?.length) setMistakeData(draft.mistakeData);
    if (draft.stuckData?.length) setStuckData(draft.stuckData);
    if (draft.bookPageData?.length) setBookPageData(draft.bookPageData);
    if (draft.bookMistakeData?.length) setBookMistakeData(draft.bookMistakeData);
    if (draft.bookStuckData?.length) setBookStuckData(draft.bookStuckData);
    if (draft.comment !== undefined) setComment(draft.comment);

    // Sync academic hierarchy if stored with draft
    if (
      draft.departmentId ||
      draft.classId ||
      draft.sectionId ||
      draft.selectedDepartmentId ||
      draft.selectedClassId ||
      draft.selectedSectionId
    ) {
      window.dispatchEvent(
        new CustomEvent("spr_edit_report", {
          detail: {
            departmentId: draft.departmentId || draft.selectedDepartmentId,
            classId: draft.classId || draft.selectedClassId,
            sectionId: draft.sectionId || draft.selectedSectionId,
            student_name: draft.studentName,
            selectedDate: draft.selectedDate,
          },
        })
      );
    }

    setDraftInfo((prev) => (prev ? prev.filter((d) => d.id !== draft.id) : null));
    draftReport.remove(draft.id);
    dailyProgressRepository.clearDraft(draft.id).catch(() => {});
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
    dailyProgressRepository.clearDraft(draft.id).catch(() => {});
    showToast("Report draft discarded", "info");
  };

  const dismissDraft = (draft: any) => {
    if (!draft) return;
    setDraftInfo((prev) => {
      const updated = prev ? prev.filter((d) => d.id !== draft.id) : null;
      return updated && updated.length > 0 ? updated : null;
    });
  };

  const fetchData = async () => {
    const cachedStudents = studentStore.getAll();
    const cachedSessions = sessionStore.getAll();

    if (cachedStudents.length > 0) setStudentDatabase(cachedStudents);
    if (cachedSessions.length > 0) setSessionList(cachedSessions);
    if (cachedStudents.length > 0 || cachedSessions.length > 0) setIsLoading(false);
    if (!isOnline()) return;

    // Run sync in the background without blocking UI initialization
    syncSessionsAndComments().catch((err) => {
      console.warn("[useReportForm] Background sync error:", err);
    });

    try {
      const [studentsSettled, sessionsSettled, messagesSettled] = await Promise.allSettled([
        fetchWithAuth("/students/"),
        fetchWithAuth("/sessions/"),
        fetchWithAuth("/messages/?category=report_builder_comments"),
      ]);

      if (studentsSettled.status === "fulfilled" && studentsSettled.value.ok) {
        const rawStudents = await studentsSettled.value.json();
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

      if (sessionsSettled.status === "fulfilled" && sessionsSettled.value.ok) {
        const rawSessions = await sessionsSettled.value.json();
        const apiSessions = (Array.isArray(rawSessions) ? rawSessions : []).map((s: any) => ({
          id: typeof s === "object" ? (s.id || s.name) : String(s),
          name: typeof s === "object" ? (s.name || s.session_name || s.label || String(s)) : String(s),
        }));
        const merged = mergeSessions(apiSessions, sessionStore.getAll());
        setSessionList(merged);
      }

      if (messagesSettled.status === "fulfilled" && messagesSettled.value.ok) {
        const rawMessages = await messagesSettled.value.json();
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

  const resolveStudentFromInputs = (context?: AcademicValidationContext) => {
    const currentDepts = context?.departments || defaultDepartments;
    const currentClasses = context?.classes || defaultClasses;
    const currentSections = context?.sections || defaultSections;

    const allCandidates: any[] = [
      ...(context?.allStudents || []),
      ...(defaultAcademicStudents || []),
      ...(studentDatabase || []),
      ...(studentStore.getAll() || []),
    ];

    const query = (studentName || "").trim().toLowerCase();
    const idQuery = selectedStudentId != null ? String(selectedStudentId).trim() : "";

    let matched: any = null;

    if (idQuery) {
      matched = allCandidates.find(
        (s: any) => String(s.id) === idQuery || (s.uniq_id && String(s.uniq_id) === idQuery)
      );
    }

    if (!matched && query) {
      matched = allCandidates.find(
        (s: any) =>
          String(s.id) === query ||
          (s.uniq_id && String(s.uniq_id).toLowerCase() === query) ||
          (s.student_id_card_number && String(s.student_id_card_number).toLowerCase() === query)
      );
    }

    if (!matched && query) {
      const nameMatches = allCandidates.filter(
        (s: any) =>
          (s.name_en || s.name || s.label || s.bangla_name || "").trim().toLowerCase() === query
      );
      if (nameMatches.length === 1) {
        matched = nameMatches[0];
      } else if (nameMatches.length > 1) {
        const activeSec = context?.sectionId;
        const activeCls = context?.classId;
        const activeDept = context?.departmentId;
        matched =
          (activeSec && nameMatches.find((s: any) => doesStudentMatchSection(s, activeSec, currentSections))) ||
          (activeCls && nameMatches.find((s: any) => doesStudentMatchClass(s, activeCls, currentClasses))) ||
          (activeDept && nameMatches.find((s: any) => doesStudentMatchDepartment(s, activeDept, currentDepts, currentClasses))) ||
          nameMatches[0];
      }
    }

    if (!matched && query && /^\d+$/.test(query)) {
      const rollMatches = allCandidates.filter(
        (s: any) => String(s.roll_number ?? s.roll ?? "").trim() === query
      );
      if (rollMatches.length === 1) {
        matched = rollMatches[0];
      } else if (rollMatches.length > 1) {
        const activeSec = context?.sectionId;
        const activeCls = context?.classId;
        matched =
          (activeSec && rollMatches.find((s: any) => doesStudentMatchSection(s, activeSec, currentSections))) ||
          (activeCls && rollMatches.find((s: any) => doesStudentMatchClass(s, activeCls, currentClasses))) ||
          rollMatches[0];
      }
    }

    return matched;
  };

  const validateReportForm = (context?: AcademicValidationContext) => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return false;
    }

    const currentDepts = context?.departments || defaultDepartments;
    const currentClasses = context?.classes || defaultClasses;
    const currentSections = context?.sections || defaultSections;

    const matchedStudent = resolveStudentFromInputs(context);
    const queryName = studentName.trim();

    // Strict Check 1: Student Existence in Admissions DB
    if (!matchedStudent) {
      showToast(`No student found with name "${queryName}" in Admissions Directory`, "error");
      return false;
    }

    const displayName = matchedStudent.name_en || matchedStudent.name || matchedStudent.label || queryName;

    // Strict Check 2: Academic Hierarchy Matching
    const activeDeptId = context?.departmentId && String(context.departmentId) !== "ALL" ? String(context.departmentId) : null;
    const activeClassId = context?.classId && String(context.classId) !== "ALL" ? String(context.classId) : null;
    const activeSecId = context?.sectionId && String(context.sectionId) !== "ALL" ? String(context.sectionId) : null;

    if (activeDeptId && !doesStudentMatchDepartment(matchedStudent, activeDeptId, currentDepts, currentClasses)) {
      const activeDeptObj = currentDepts.find((d: any) => String(d.id) === activeDeptId);
      const activeDeptName = activeDeptObj?.name || activeDeptObj?.department_name || activeDeptId;
      const stuDeptName = matchedStudent.department_name || (typeof matchedStudent.department === 'string' ? matchedStudent.department : null);
      if (!stuDeptName) {
        showToast(`Student "${displayName}" has no department assigned. Selected: "${activeDeptName}".`, "error");
      } else {
        showToast(`Student "${displayName}" belongs to "${stuDeptName}", not "${activeDeptName}".`, "error");
      }
      return false;
    }

    if (activeClassId && !doesStudentMatchClass(matchedStudent, activeClassId, currentClasses)) {
      const activeClassObj = currentClasses.find((c: any) => String(c.id) === activeClassId);
      const activeClassName = activeClassObj?.name || activeClassObj?.class_name || activeClassId;
      const stuClassName = matchedStudent.student_class_name || matchedStudent.class_name || (typeof matchedStudent.student_class === 'string' ? matchedStudent.student_class : null);
      if (!stuClassName) {
        showToast(`Student "${displayName}" has no class assigned. Selected: "${activeClassName}".`, "error");
      } else {
        showToast(`Student "${displayName}" belongs to class "${stuClassName}", not "${activeClassName}".`, "error");
      }
      return false;
    }

    if (activeSecId && !doesStudentMatchSection(matchedStudent, activeSecId, currentSections)) {
      const activeSecObj = currentSections.find((s: any) => String(s.id) === activeSecId);
      const activeSecName = activeSecObj?.section_name || activeSecObj?.name || activeSecId;
      const stuSecName = matchedStudent.section_name || matchedStudent.student_section_name || (typeof matchedStudent.section === 'string' ? matchedStudent.section : null) || matchedStudent.sub || matchedStudent.group_name;
      if (!stuSecName) {
        showToast(`Student "${displayName}" has no section assigned. Selected: "${activeSecName}".`, "error");
      } else {
        showToast(`Student "${displayName}" belongs to section "${stuSecName}", not "${activeSecName}".`, "error");
      }
      return false;
    }

    if (!selectedSession.trim()) {
      showToast("Please select a session first", "warning");
      return false;
    }

    if (progressMode === "BOOK") {
      if (!bookTitle.trim()) {
        showToast("Please specify a Book / Subject Title first", "warning");
        return false;
      }
      const hasBookData = juzPageData.some(
        (d) => (d.ranges || []).some((r) => (r.start && String(r.start).trim()) || (r.end && String(r.end).trim()))
      );
      if (!hasBookData) {
        showToast("Please enter Book Page details first", "warning");
        return false;
      }
      for (let i = 0; i < juzPageData.length; i++) {
        const row = juzPageData[i];
        const validRanges = (row.ranges || []).filter(
          (r) => (r.start && String(r.start).trim()) || (r.end && String(r.end).trim())
        );
        for (const r of validRanges) {
          const sPage = parseInt(String(r.start || ""), 10);
          if (isNaN(sPage) || sPage < 1) {
            showToast(`Please enter a valid start page for row #${i + 1}.`, "warning");
            return false;
          }
          if (r.end && String(r.end).trim()) {
            const ePage = parseInt(String(r.end), 10);
            if (isNaN(ePage) || ePage < sPage) {
              showToast(`End page cannot be less than start page for row #${i + 1}.`, "warning");
              return false;
            }
          }
        }
      }

      // Check Mistake pages for Book mode
      const cleanMistakes = mistakeData.filter(
        (m) => (m.page && String(m.page).trim()) || ((m.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      for (let i = 0; i < cleanMistakes.length; i++) {
        const m = cleanMistakes[i];
        if (!m.page || String(m.page).trim() === "") {
          showToast(`Please specify a valid Page number for Mistake entry #${i + 1}.`, "warning");
          return false;
        }
      }

      // Check Stuck pages for Book mode
      const cleanStucks = stuckData.filter(
        (s) => (s.page && String(s.page).trim()) || ((s.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      for (let i = 0; i < cleanStucks.length; i++) {
        const s = cleanStucks[i];
        if (!s.page || String(s.page).trim() === "") {
          showToast(`Please specify a valid Page number for Stuck entry #${i + 1}.`, "warning");
          return false;
        }
      }
    } else {
      // QURAN MODE: Strict Juz & Page Validation
      const activeJuzRows = juzPageData.filter(
        (row) => (row.juz && String(row.juz).trim() !== "") || (row.ranges || []).some((r) => r.start || r.end)
      );

      if (activeJuzRows.length === 0) {
        showToast("Please enter Juz & Page information first", "warning");
        return false;
      }

      // Check each recitation entry for valid Juz number (1-30) and valid page ranges
      for (let i = 0; i < activeJuzRows.length; i++) {
        const row = activeJuzRows[i];
        const rawJuz = String(row.juz || "").trim();
        const jNum = parseInt(rawJuz, 10);

        if (!rawJuz || isNaN(jNum) || jNum < 1 || jNum > 30) {
          showToast(`Please enter a valid Juz number (1–30) for recitation entry #${i + 1}.`, "warning");
          return false;
        }

        const validRanges = (row.ranges || []).filter(
          (r) => (r.start && String(r.start).trim()) || (r.end && String(r.end).trim())
        );

        if (validRanges.length === 0) {
          showToast(`Please enter page range for Juz ${jNum}.`, "warning");
          return false;
        }

        for (const range of validRanges) {
          const sPage = parseInt(String(range.start || ""), 10);
          if (isNaN(sPage) || sPage < 1) {
            showToast(`Please enter a valid start page for Juz ${jNum}.`, "warning");
            return false;
          }
          if (range.end && String(range.end).trim()) {
            const ePage = parseInt(String(range.end), 10);
            if (isNaN(ePage) || ePage < sPage) {
              showToast(`End page cannot be less than start page for Juz ${jNum}.`, "warning");
              return false;
            }
          }
        }
      }

      // Strict Validation for Mistakes: each recorded mistake row must have a valid Juz and Page
      const cleanMistakes = mistakeData.filter(
        (m) => (m.page && String(m.page).trim()) || ((m.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      for (let i = 0; i < cleanMistakes.length; i++) {
        const m = cleanMistakes[i];
        if (!m.page || String(m.page).trim() === "") {
          showToast(`Please specify a valid Page number for Mistake entry #${i + 1}.`, "warning");
          return false;
        }
        const rawJuz = String(m.juz || "").trim();
        const jNum = parseInt(rawJuz, 10);
        if (!rawJuz || isNaN(jNum) || jNum < 1 || jNum > 30) {
          const inheritedJuz = parseInt(String(activeJuzRows[0]?.juz || ""), 10);
          if (inheritedJuz >= 1 && inheritedJuz <= 30) {
            m.juz = inheritedJuz;
          } else {
            showToast(`Please specify a valid Juz number (1–30) for Mistake entry #${i + 1}.`, "warning");
            return false;
          }
        }
      }

      // Strict Validation for Stucks: each recorded stuck row must have a valid Juz and Page
      const cleanStucks = stuckData.filter(
        (s) => (s.page && String(s.page).trim()) || ((s.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      for (let i = 0; i < cleanStucks.length; i++) {
        const s = cleanStucks[i];
        if (!s.page || String(s.page).trim() === "") {
          showToast(`Please specify a valid Page number for Stuck entry #${i + 1}.`, "warning");
          return false;
        }
        const rawJuz = String(s.juz || "").trim();
        const jNum = parseInt(rawJuz, 10);
        if (!rawJuz || isNaN(jNum) || jNum < 1 || jNum > 30) {
          const inheritedJuz = parseInt(String(activeJuzRows[0]?.juz || ""), 10);
          if (inheritedJuz >= 1 && inheritedJuz <= 30) {
            s.juz = inheritedJuz;
          } else {
            showToast(`Please specify a valid Juz number (1–30) for Stuck entry #${i + 1}.`, "warning");
            return false;
          }
        }
      }
    }

    return true;
  };

  const resetForm = () => {
    localStorage.removeItem("spr_editing_report");
    setStudentName("");
    setSelectedStudentId(null);
    setGroupName("");
    // Note: Retain selectedSession so the teacher doesn't have to re-select the session for consecutive student records
    setSelectedTeacherId(defaultTeacherId);
    setSelectedTeacherName(defaultTeacherName);
    setSelectedDate(getClassroomTodayDate());
    setJuzPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
    setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setBookPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
    setBookMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setBookStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setComment("");
    setBookTitle("");
    setLessonTitle("");
    draftReport.remove(currentDraftId);
    dailyProgressRepository.clearDraft(currentDraftId).catch(() => {});
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

  const handleSaveRecord = async (context?: AcademicValidationContext) => {
    if (isSaving) return;
    if (!validateReportForm(context)) return;
    setIsSaving(true);

    try {
      const selectedStudent = resolveStudentFromInputs(context);
      if (!selectedStudent) {
        setIsSaving(false);
        showToast(`No student found with name "${studentName.trim()}" in Admissions Directory.`, "error");
        return;
      }

      const cleanActiveMistakes = mistakeData.filter(
        (m) => (m.page && String(m.page).trim()) || ((m.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      const cleanActiveStucks = stuckData.filter(
        (s) => (s.page && String(s.page).trim()) || ((s.ayahs || []).some((a) => a.value && String(a.value).trim()))
      );
      const activePages = juzPageData;

      const editedAt = new Date().toISOString();
      const isEditing = Boolean(editingReport);

      const realStudentName = (
        selectedStudent.name_en ||
        selectedStudent.name ||
        selectedStudent.label ||
        selectedStudent.bangla_name ||
        studentName.trim()
      );
      const studentNumericId =
        selectedStudent.id && !isNaN(Number(selectedStudent.id))
          ? Number(selectedStudent.id)
          : (selectedStudentId && !isNaN(Number(selectedStudentId)) ? Number(selectedStudentId) : null);
      const studentRollNumber = selectedStudent.roll_number ?? selectedStudent.roll ?? "";
      const studentUniqId = selectedStudent.uniq_id || selectedStudent.student_id_card_number || "";

      // Ensure form state reflects authoritative student name
      setStudentName(realStudentName);
      if (studentNumericId) setSelectedStudentId(String(studentNumericId));

      recordStudentUsage(selectedStudent);

      const finalTeacherId =
        selectedTeacherId && selectedTeacherId !== "ALL"
          ? selectedTeacherId
          : defaultTeacherId;

      const resolvedTeacherId =
        finalTeacherId && !isNaN(Number(finalTeacherId))
          ? Number(finalTeacherId)
          : finalTeacherId || null;

      const finalTeacherName =
        selectedTeacherName && selectedTeacherName !== "All Teachers"
          ? selectedTeacherName
          : defaultTeacherName || "Staff Teacher";

      const payload = {
        student: studentNumericId || realStudentName,
        student_name: realStudentName,
        teacher: resolvedTeacherId,
        teacher_id: resolvedTeacherId,
        teacher_name: finalTeacherName,
        session: selectedSession.trim(),
        session_name: selectedSession.trim(),
        progress_mode: progressMode,
        mode: progressMode,
        book_title: (bookTitle || "").trim(),
        curriculum_book_name: (bookTitle || "").trim(),
        book_name: (bookTitle || "").trim(),
        bookTitle: (bookTitle || "").trim(),
        lesson_title: (lessonTitle || "").trim(),
        lesson_covered: (lessonTitle || "").trim(),
        lessonTitle: (lessonTitle || "").trim(),
        lesson: (lessonTitle || "").trim(),
        report_date: selectedDate || getClassroomTodayDate(),
        subject_course: (bookTitle.trim() || groupName || ""),
        juz_and_pages: activePages,
        mistakes: cleanActiveMistakes,
        stucks: cleanActiveStucks,
        comment: comment,
        overall_status: "Completed",
        status: "Completed",
        client_updated_at: editedAt,
        ...(isEditing ? { edited_at: editedAt, is_edited: true } : {}),
      };

      if (isEditing) {
        const repId = editingReport.id || editingReport.report_unique_id;
        const repUniqueId = editingReport.report_unique_id || (typeof repId === "string" && repId.startsWith("REP-") ? repId : `REP-${String(repId).slice(0, 8)}`);
        const allReports = getLocalReports();
        const existingRepIndex = allReports.findIndex((r: any) => {
          return (
            (r.id && (String(r.id) === String(repId) || (editingReport.server_id && String(r.id) === String(editingReport.server_id)))) ||
            (r.server_id && editingReport.server_id && String(r.server_id) === String(editingReport.server_id)) ||
            (r.report_unique_id && (String(r.report_unique_id) === String(repUniqueId) || String(r.report_unique_id) === String(repId)))
          );
        });

        const existingRep = existingRepIndex > -1 ? allReports[existingRepIndex] : null;
        const resolvedServerId =
          editingReport.server_id ||
          existingRep?.server_id ||
          (!isNaN(Number(editingReport.id)) && !String(editingReport.id).includes("-") ? Number(editingReport.id) : null) ||
          (existingRep && !isNaN(Number(existingRep.id)) && !String(existingRep.id).includes("-") ? Number(existingRep.id) : null);

        const updatedRecord = {
          ...(existingRep || {}),
          ...payload,
          id: existingRep?.id || editingReport.id || crypto.randomUUID(),
          server_id: resolvedServerId || undefined,
          report_unique_id: existingRep?.report_unique_id || repUniqueId,
          client_updated_at: editedAt,
          teacher: resolvedTeacherId || existingRep?.teacher,
          teacher_id: resolvedTeacherId || existingRep?.teacher_id,
          teacher_name: selectedTeacherName || defaultTeacherName || existingRep?.teacher_name || "",
          student: studentNumericId || realStudentName,
          studentId: studentNumericId,
          studentName: realStudentName,
          student_name: realStudentName,
          student_details: selectedStudent || existingRep?.student_details || undefined,
          rollNumber: studentRollNumber || existingRep?.rollNumber,
          roll_number: studentRollNumber || existingRep?.roll_number,
          uniqId: studentUniqId || existingRep?.uniqId,
          uniq_id: studentUniqId || existingRep?.uniq_id,
          className: selectedStudent?.student_class_name || selectedStudent?.class_name || existingRep?.className,
          student_class_name: selectedStudent?.student_class_name || selectedStudent?.class_name || existingRep?.student_class_name,
          sectionName: selectedStudent?.student_section_name || selectedStudent?.section_name || existingRep?.sectionName,
          student_section_name: selectedStudent?.student_section_name || selectedStudent?.section_name || existingRep?.student_section_name,
          departmentCode: selectedStudent?.department_code || selectedStudent?.dept_code || existingRep?.departmentCode,
          groupName: groupName || "",
          progress_mode: progressMode,
          mode: progressMode,
          book_title: (bookTitle || "").trim(),
          curriculum_book_name: (bookTitle || "").trim(),
          book_name: (bookTitle || "").trim(),
          bookTitle: (bookTitle || "").trim(),
          lesson_title: (lessonTitle || "").trim(),
          lesson_covered: (lessonTitle || "").trim(),
          lessonTitle: (lessonTitle || "").trim(),
          lesson: (lessonTitle || "").trim(),
          subject_course: (bookTitle.trim() || groupName || ""),
          selectedSession: selectedSession.trim(),
          session_name: selectedSession.trim(),
          selectedDate,
          juz_and_pages: activePages,
          mistakes: cleanActiveMistakes,
          stucks: cleanActiveStucks,
          juzPageData: activePages,
          bookPageData: progressMode === "BOOK" ? activePages : [],
          mistakeData: cleanActiveMistakes,
          bookMistakeData: progressMode === "BOOK" ? cleanActiveMistakes : [],
          stuckData: cleanActiveStucks,
          bookStuckData: progressMode === "BOOK" ? cleanActiveStucks : [],
        };

        if (isOnline() && (authStore.getAccessToken() || authStore.getRefreshToken())) {
          if (resolvedServerId) {
            try {
              const apiResult = await updateReport(resolvedServerId, payload);
              if (apiResult.success && apiResult.data) {
                const resData = apiResult.data;
                saveReportLocally({ ...updatedRecord, ...resData, server_id: resolvedServerId, sync_status: "SYNCED" }, { skipGrace: true, syncStatus: "SYNCED" });
                showToast(`Report #${repUniqueId} for "${realStudentName}" updated in Database!`, "success");
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
            // Local report without database server_id yet: commit to database directly!
            saveReportLocally(updatedRecord, { skipGrace: true, syncStatus: "PENDING" });
            const syncResult = await commitReportToCloud(updatedRecord.id);
            if (syncResult && syncResult.success) {
              const finalId = syncResult.data?.report_unique_id || repUniqueId;
              showToast(`Report #${finalId} for "${realStudentName}" saved to Database!`, "success");
              saveStatusStore.set("database", "Database Synced");
            } else {
              showToast(`Report #${repUniqueId} for "${realStudentName}" updated locally!`, "info");
              saveStatusStore.set("local", "Saved (Local)");
            }
            window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: updatedRecord } }));
          }
        } else {
          saveReportLocally(updatedRecord, { skipGrace: true, syncStatus: "PENDING" });
          showToast(`Report #${repUniqueId} for "${realStudentName}" updated locally!`, "success");
          saveStatusStore.set("local", "Saved (Local)");
          window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: updatedRecord } }));
        }

        const savedSnapshot = JSON.stringify({
          studentName: realStudentName,
          selectedStudentId: studentNumericId,
          groupName: groupName || "",
          selectedSession: selectedSession.trim(),
          progressMode,
          bookTitle: bookTitle.trim(),
          lessonTitle: lessonTitle.trim(),
          selectedDate,
          juzPageData,
          mistakeData,
          stuckData,
          comment,
          savedReportId: updatedRecord.id,
          savedReportKey: repUniqueId,
          serverId: resolvedServerId,
          isGracePeriod: false,
        });
        if (historyStackRef.current.length > 0) {
          historyStackRef.current[historyStackRef.current.length - 1] = savedSnapshot;
        } else {
          historyStackRef.current.push(savedSnapshot);
        }
      } else {
        const localSavedReport = saveReportLocally({
          ...payload,
          teacher: resolvedTeacherId,
          teacher_id: resolvedTeacherId,
          teacher_name: selectedTeacherName || defaultTeacherName || "",
          student: studentNumericId || realStudentName,
          studentId: studentNumericId,
          studentName: realStudentName,
          student_name: realStudentName,
          student_details: selectedStudent || undefined,
          rollNumber: studentRollNumber,
          roll_number: studentRollNumber,
          uniqId: studentUniqId,
          uniq_id: studentUniqId,
          className:
            selectedStudent?.student_class_name ||
            selectedStudent?.class_name ||
            (context?.classes?.find((c: any) => String(c.id) === String(context.classId))?.name) ||
            undefined,
          student_class_name:
            selectedStudent?.student_class_name ||
            selectedStudent?.class_name ||
            (context?.classes?.find((c: any) => String(c.id) === String(context.classId))?.name) ||
            undefined,
          sectionName:
            selectedStudent?.student_section_name ||
            selectedStudent?.section_name ||
            (context?.sections?.find((s: any) => String(s.id) === String(context.sectionId))?.section_name) ||
            groupName ||
            undefined,
          student_section_name:
            selectedStudent?.student_section_name ||
            selectedStudent?.section_name ||
            (context?.sections?.find((s: any) => String(s.id) === String(context.sectionId))?.section_name) ||
            groupName ||
            undefined,
          departmentCode: selectedStudent?.department_code || selectedStudent?.dept_code,
          groupName: groupName || (context?.sections?.find((s: any) => String(s.id) === String(context.sectionId))?.section_name) || "",
          progress_mode: progressMode,
          mode: progressMode,
          book_title: (bookTitle || "").trim(),
          curriculum_book_name: (bookTitle || "").trim(),
          book_name: (bookTitle || "").trim(),
          bookTitle: (bookTitle || "").trim(),
          lesson_title: (lessonTitle || "").trim(),
          lesson_covered: (lessonTitle || "").trim(),
          lessonTitle: (lessonTitle || "").trim(),
          lesson: (lessonTitle || "").trim(),
          subject_course: (bookTitle.trim() || groupName || ""),
          selectedSession: selectedSession.trim(),
          session_name: selectedSession.trim(),
          selectedDate,
          juz_and_pages: activePages,
          mistakes: cleanActiveMistakes,
          stucks: cleanActiveStucks,
          juzPageData: activePages,
          bookPageData: progressMode === "BOOK" ? activePages : [],
          mistakeData: cleanActiveMistakes,
          bookMistakeData: progressMode === "BOOK" ? cleanActiveMistakes : [],
          stuckData: cleanActiveStucks,
          bookStuckData: progressMode === "BOOK" ? cleanActiveStucks : [],
        }, { skipGrace: true, syncStatus: "PENDING" });

        // Enterprise Direct Cloud Commit: when online and authenticated, commit immediately to PostgreSQL!
        let authoritativeServerId: any = null;
        if (isOnline() && (authStore.getAccessToken() || authStore.getRefreshToken())) {
          saveStatusStore.set("saving", "Saving to Database...");
          const syncResult = await commitReportToCloud(localSavedReport.id);
          if (syncResult && syncResult.success) {
            authoritativeServerId = syncResult.data?.id || localSavedReport.server_id;
            const finalId = syncResult.data?.report_unique_id || localSavedReport.report_unique_id;
            showToast(`Report #${finalId} for "${realStudentName}" saved to Database!`, "success");
            saveStatusStore.set("database", "Database Synced");
          } else {
            showToast(`Report #${localSavedReport.report_unique_id} for "${realStudentName}" added (will auto-sync)!`, "info");
            saveStatusStore.set("local", "Saved (Local)");
          }
        } else {
          showToast(`Report #${localSavedReport.report_unique_id} for "${realStudentName}" added to record (Offline)!`, "success");
          saveStatusStore.set("local", "Saved (Local)");
        }
        window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local", data: localSavedReport } }));

        const savedSnapshot = JSON.stringify({
          studentName: realStudentName,
          selectedStudentId: studentNumericId,
          groupName: groupName || "",
          selectedSession: selectedSession.trim(),
          progressMode,
          bookTitle: bookTitle.trim(),
          lessonTitle: lessonTitle.trim(),
          selectedDate,
          juzPageData,
          mistakeData,
          stuckData,
          bookPageData,
          bookMistakeData,
          bookStuckData,
          comment,
          savedReportId: localSavedReport.id,
          savedReportKey: localSavedReport.report_unique_id,
          serverId: authoritativeServerId || localSavedReport.server_id,
          isGracePeriod: false,
        });
        if (historyStackRef.current.length > 0) {
          historyStackRef.current[historyStackRef.current.length - 1] = savedSnapshot;
        } else {
          historyStackRef.current.push(savedSnapshot);
        }
      }

      resetForm();
      // Auto-focus student input so teacher can immediately type the next student's name
      setTimeout(() => {
        const el = document.getElementById("daily-progress-student-input") as HTMLInputElement;
        el?.focus();
        el?.select?.();
      }, 60);
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

  const handleBookPageReset = () => {
    setBookPageData([
      {
        id: crypto.randomUUID(),
        juz: "",
        ranges: [{ id: crypto.randomUUID(), start: "", end: "" }],
      },
    ]);
    showToast("Page section reset", "info");
  };

  const handleBookMistakeReset = () => {
    setBookMistakeData([
      { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] },
    ]);
    showToast("Mistakes section reset", "info");
  };

  const handleBookStuckReset = () => {
    setBookStuckData([
      { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] },
    ]);
    showToast("Stuck section reset", "info");
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
    selectedTeacherId,
    setSelectedTeacherId,
    selectedTeacherName,
    setSelectedTeacherName,
    defaultTeacherId,
    defaultTeacherName,
    progressMode,
    setProgressMode,
    bookTitle,
    setBookTitle,
    lessonTitle,
    setLessonTitle,
    juzPageData,
    setJuzPageData,
    mistakeData,
    setMistakeData,
    stuckData,
    setStuckData,
    bookPageData,
    setBookPageData,
    bookMistakeData,
    setBookMistakeData,
    bookStuckData,
    setBookStuckData,
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
    dismissDraft,
    editingReport,
    cancelEditMode,
    handleSaveRecord,
    validateReportForm,
    resolveStudentFromInputs,
    handleJuzPageRefresh,
    handleBookPageReset,
    handleBookMistakeReset,
    handleBookStuckReset,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  };
}
