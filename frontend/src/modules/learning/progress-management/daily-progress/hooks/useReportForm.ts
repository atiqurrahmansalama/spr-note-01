import { useState, useEffect, useRef, useCallback } from "react";
import { useToast } from "@/context/ToastContext";
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
import { recordStudentUsage } from "@/utils/studentUsageTracker";
import { getClassroomTodayDate } from "@/constants/calendarConstants";
import type { JuzRowData, DetailRowData, DailyProgressDraft } from "../types";

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
