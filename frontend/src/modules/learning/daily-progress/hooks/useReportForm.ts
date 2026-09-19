import { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithAuth } from "../../../../utils/authService";
import { useToast } from "../../../../context/ToastContext";
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
} from "../../../../utils/localStore";
import { saveReportLocally, syncSessionsAndComments } from "../../../../utils/syncEngine";
import { createReport } from "../../../../api/reports";
import { DetailRowData, JuzRowData, DailyProgressDraft, DailyProgressData } from "../types";

export function useReportForm() {
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [studentName, setStudentName] = useState<string>("");
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

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");

  const [studentDatabase, setStudentDatabase] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const historyStackRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isRestoringRef = useRef(false);
  const [, setHistoryVersion] = useState(0);

  const captureSnapshot = useCallback(() => {
    return JSON.stringify({
      studentName,
      groupName,
      selectedSession,
      juzPageData,
      mistakeData,
      stuckData,
      comment,
    });
  }, [studentName, groupName, selectedSession, juzPageData, mistakeData, stuckData, comment]);

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
    if (currentSnap) {
      redoStackRef.current.push(currentSnap);
    }
    setHistoryVersion((v) => v + 1);

    const prevSnapStr = stack[stack.length - 1];
    if (prevSnapStr) {
      try {
        const data = JSON.parse(prevSnapStr);
        isRestoringRef.current = true;
        setStudentName(data.studentName || "");
        setGroupName(data.groupName || "");
        setSelectedSession(data.selectedSession || "");
        if (data.juzPageData) setJuzPageData(data.juzPageData);
        if (data.mistakeData) setMistakeData(data.mistakeData);
        if (data.stuckData) setStuckData(data.stuckData);
        setComment(data.comment || "");
        showToast("Undo: Restored previous draft state", "info");
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
      setGroupName(data.groupName || "");
      setSelectedSession(data.selectedSession || "");
      if (data.juzPageData) setJuzPageData(data.juzPageData);
      if (data.mistakeData) setMistakeData(data.mistakeData);
      if (data.stuckData) setStuckData(data.stuckData);
      setComment(data.comment || "");
      showToast("Redo: Restored next draft state", "info");
    } catch (err) {
      console.error("Redo restore failed", err);
    }
  }, [showToast]);

  const canUndoDraft = historyStackRef.current.length > 1;
  const canRedoDraft = redoStackRef.current.length > 0;
  const [isOffline, setIsOffline] = useState(!isOnline());
  const [draftInfo, setDraftInfo] = useState<DailyProgressDraft[] | null>(null);

  const [currentDraftId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("recover_draft_id") || "active_report_draft";
  });

  const [editingReport, setEditingReport] = useState<any | null>(null);

  const applyReportToForm = useCallback((rep: any) => {
    if (!rep) return;

    const sName = rep.student_name || rep.student || "";
    const gName = rep.student_group || rep.subject_course || "";
    const sSession = rep.session_name || rep.session || "";

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
          return;
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

    const interval = setInterval(() => {
      if (hasAnyContent) {
        draftReport.save(currentDraftId, draftPayload);
        saveStatusStore.set("local", "Saved");
      }
    }, 90000);

    return () => clearInterval(interval);
  }, [studentName, groupName, selectedSession, selectedDate, juzPageData, mistakeData, stuckData, comment, currentDraftId]);

  const recoverDraft = (draft: any) => {
    if (!draft) return;
    if (draft.studentName !== undefined) setStudentName(draft.studentName);
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

  useEffect(() => {
    const handleEditReport = (e: any) => {
      const rep = e.detail;
      if (!rep) return;

      const formHasData = Boolean(
        studentName.trim() ||
        groupName.trim() ||
        selectedSession ||
        comment.trim() ||
        juzPageData.some((d) => d.juz || (d.ranges || []).some((r) => r.start || r.end)) ||
        mistakeData.some((m) => m.page || m.juz || (m.ayahs || []).some((a) => a.value)) ||
        stuckData.some((s) => s.page || s.juz || (s.ayahs || []).some((a) => a.value))
      );

      if (formHasData) {
        const confirmed = window.confirm(
          `The form currently has unsaved data for "${studentName || "a student"}".\n\nDiscard current data and load "${rep.student_name || "selected"}"'s report for editing?`
        );
        if (!confirmed) return;
      }

      applyReportToForm(rep);
    };

    window.addEventListener("spr_edit_report", handleEditReport);
    return () => window.removeEventListener("spr_edit_report", handleEditReport);
  }, [applyReportToForm, studentName, groupName, selectedSession, comment, juzPageData, mistakeData, stuckData]);

  const fetchData = async () => {
    const cachedStudents = studentStore.getAll();
    const cachedSessions = sessionStore.getAll();

    if (cachedStudents.length > 0) {
      setStudentDatabase(cachedStudents);
      const safeCachedGroups = Array.from(
        new Set(
          cachedStudents
            .map((s: any) =>
              typeof s === "object" && typeof s?.sub === "string"
                ? s.sub
                : typeof s === "object" && (s?.group || s?.group_name)
                ? String(s.group || s.group_name)
                : typeof s === "string"
                ? s
                : ""
            )
            .filter((g: any) => typeof g === "string" && g.trim() !== "")
        )
      ) as string[];
      setAvailableGroups(safeCachedGroups);
    }
    if (cachedSessions.length > 0) {
      setSessionList(cachedSessions);
    }

    if (cachedStudents.length > 0 || cachedSessions.length > 0) {
      setIsLoading(false);
    }

    if (!isOnline()) {
      setIsLoading(false);
      return;
    }

    try {
      await syncSessionsAndComments();

      const [studentsRes, sessionsRes, messagesRes] = await Promise.all([
        fetchWithAuth("/students/"),
        fetchWithAuth("/sessions/"),
        fetchWithAuth("/messages/?category=report_builder_comments"),
      ]);

      if (studentsRes.ok) {
        const rawStudents = await studentsRes.json();
        const apiStudents = (Array.isArray(rawStudents) ? rawStudents : []).map((s: any) => {
          const subVal =
            typeof s === "object" && typeof s?.sub === "string"
              ? s.sub
              : typeof s === "object" && (s?.group_name || s?.group)
              ? String(s.group_name || s.group)
              : "General Group";

          return {
            id: typeof s === "object" ? s.id : null,
            label: typeof s === "object" ? (s.name || s.student_name || s.label || String(s)) : String(s),
            sub: subVal,
          };
        });

        const localStudents = studentStore.getAll();
        const merged = mergeStudents(apiStudents, localStudents);
        setStudentDatabase(merged);
        const safeMergedGroups = Array.from(
          new Set(
            merged
              .map((s: any) =>
                typeof s === "object" && typeof s?.sub === "string"
                  ? s.sub
                  : typeof s === "object" && (s?.group || s?.group_name)
                  ? String(s.group || s.group_name)
                  : typeof s === "string"
                  ? s
                  : ""
              )
              .filter((g: any) => typeof g === "string" && g.trim() !== "")
          )
        ) as string[];
        setAvailableGroups(safeMergedGroups);
      }

      if (sessionsRes.ok) {
        const rawSessions = await sessionsRes.json();
        const apiSessions = (Array.isArray(rawSessions) ? rawSessions : []).map((s: any) => ({
          id: typeof s === "object" ? (s.id || s.name) : String(s),
          name: typeof s === "object" ? (s.name || s.session_name || s.label || String(s)) : String(s),
        }));
        const localSessions = sessionStore.getAll();
        const merged = mergeSessions(apiSessions, localSessions);
        setSessionList(merged);
      }

      if (messagesRes.ok) {
        const rawMessages = await messagesRes.json();
        const apiComments = (Array.isArray(rawMessages) ? rawMessages : [])
          .map((m: any) => (typeof m === "object" ? { id: m.id, text: m.text || m.comment || "" } : { text: String(m) }))
          .filter((c: any) => Boolean(c.text && c.text.trim()));
        const localComments = commentStore.getAll();
        const mergedComments = mergeComments(apiComments, localComments);
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initLoad();

    const handleTenantChanged = () => {
      if (isMounted) {
        fetchData();
      }
    };

    window.addEventListener("spr_tenant_changed", handleTenantChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("spr_tenant_changed", handleTenantChanged);
    };
  }, []);

  const handleSaveResult = async (result: any) => {
    const newStudent = {
      id: `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label: result.name,
      sub: result.group || "General Group",
      _local: true,
    };

    let updatedList;
    let oldStudentId = null;
    if (result.mode === "REPLACE" && result.oldStudent) {
      const oldStudentObj = studentDatabase.find((s) => s.label === result.oldStudent || s.name === result.oldStudent);
      if (oldStudentObj) {
        oldStudentId = oldStudentObj.id;
      }
      studentStore.remove(result.oldStudent);
      updatedList = studentStore.add(newStudent);

      const localReps = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
      const updatedReps = localReps.map((rep: any) => {
        if (rep.student_name === result.oldStudent) {
          return {
            ...rep,
            student_name: result.name,
            student_group: result.group || rep.student_group,
          };
        }
        return rep;
      });
      localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedReps));
      window.dispatchEvent(new CustomEvent("spr_report_saved"));
      window.dispatchEvent(new CustomEvent("spr_project_changed"));
    } else {
      updatedList = studentStore.add(newStudent);
    }
    setStudentDatabase(updatedList);
    const safeUpdatedGroups = Array.from(
      new Set(
        (updatedList || [])
          .map((s: any) =>
            typeof s === "object" && typeof s?.sub === "string"
              ? s.sub
              : typeof s === "object" && (s?.group || s?.group_name)
              ? String(s.group || s.group_name)
              : typeof s === "string"
              ? s
              : ""
          )
          .filter((g: any) => typeof g === "string" && g.trim() !== "")
      )
    ) as string[];
    setAvailableGroups(safeUpdatedGroups);
    setStudentName(result.name);
    setGroupName(result.group || "General Group");

    if (isOnline()) {
      try {
        const isReplace = result.mode === "REPLACE" && result.oldStudent && oldStudentId && !String(oldStudentId).startsWith("stu_");
        const endpoint = isReplace ? `/students/${oldStudentId}/` : "/students/";
        const method = isReplace ? "PATCH" : "POST";
        const payload = {
          name: result.name,
          group: result.group || "General Group",
        };
        const response = await fetchWithAuth(endpoint, {
          method: method,
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          showToast(`Student "${result.name}" saved to database!`, "success");
          saveStatusStore.set("database", "Database Synced");
          await fetchData();
        } else {
          showToast(`"${result.name}" saved locally. Will sync when possible.`, "info");
          saveStatusStore.set("local", "Saved (Local)");
        }
      } catch {
        showToast(`"${result.name}" saved locally (offline).`, "info");
        saveStatusStore.set("local", "Saved (Local)");
      }
    } else {
      showToast(`"${result.name}" saved locally (offline).`, "info");
      saveStatusStore.set("local", "Saved (Local)");
    }
  };

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
    setJuzPageData([{ id: crypto.randomUUID(), juz: "", ranges: [{ id: crypto.randomUUID(), start: "", end: "" }] }]);
    setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setComment("");
    draftReport.remove(currentDraftId);
    setDraftInfo(null);
    setEditingReport(null);
  };

  const cancelEditMode = () => {
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

      const selectedStudent = studentDatabase.find(
        (s) => (s.label || s.name || "").trim().toLowerCase() === studentName.trim().toLowerCase()
      );
      const studentId = selectedStudent && !String(selectedStudent.id).startsWith("stu_") ? selectedStudent.id : null;

      const payload = {
        student: studentId || studentName.trim(),
        session: selectedSession.trim(),
        report_date: selectedDate || new Date().toISOString().split("T")[0],
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
        const allReports = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
        const updatedReports = allReports.map((r: any) => {
          const rId = r.id || r.report_unique_id;
          if (rId && String(rId) === String(repId)) {
            return { ...r, ...payload, id: r.id, report_unique_id: r.report_unique_id };
          }
          return r;
        });
        localStorage.setItem("spr_reports_local_v1", JSON.stringify(updatedReports));

        if (isOnline() && editingReport.id) {
          try {
            const response = await fetchWithAuth(`/reports/${editingReport.id}/`, {
              method: "PATCH",
              body: JSON.stringify(payload),
            });
            if (response.ok) {
              showToast(`Report for "${studentName}" updated in Database!`, "success");
              saveStatusStore.set("database", "Database Synced");
            } else {
              showToast(`Report updated locally. Will sync when possible.`, "info");
              saveStatusStore.set("local", "Saved (Local)");
            }
          } catch (error: any) {
            showToast("Updated locally. Server connection issue: " + error.message, "info");
            saveStatusStore.set("local", "Saved (Local)");
          }
        } else {
          showToast(`Report for "${studentName}" updated locally!`, "success");
          saveStatusStore.set("local", "Saved (Local)");
        }

        window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: isOnline() ? "database" : "local" } }));
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
        });

        if (isOnline()) {
          try {
            const apiResult = await createReport({
              studentId,
              studentName: studentName.trim(),
              groupName: groupName || "General Group",
              selectedSession: selectedSession.trim(),
              selectedDate,
              juzPageData,
              mistakeData: cleanMistakes,
              stuckData: cleanStucks,
              comment,
            });

            if (apiResult.success) {
              const createdData = apiResult.data;

              try {
                const allLocal = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
                const syncedLocal = allLocal.map((r: any) => {
                  if (
                    r.id === localSavedReport.id ||
                    r.report_unique_id === localSavedReport.report_unique_id ||
                    (createdData.report_unique_id && r.report_unique_id === createdData.report_unique_id)
                  ) {
                    return {
                      ...r,
                      ...createdData,
                      id: createdData.id,
                      report_unique_id: createdData.report_unique_id || r.report_unique_id,
                      sync_status: "SYNCED",
                    };
                  }
                  return r;
                });
                localStorage.setItem("spr_reports_local_v1", JSON.stringify(syncedLocal));

                const pendingQ = JSON.parse(localStorage.getItem("spr_reports_pending_queue") || "[]");
                const cleanedQ = pendingQ.filter((id: any) => id !== localSavedReport.id && id !== createdData.id);
                localStorage.setItem("spr_reports_pending_queue", JSON.stringify(cleanedQ));
              } catch (storageErr) {
                console.warn("[useReportForm] Error updating local sync status:", storageErr);
              }

              showToast(`Report #${createdData.report_unique_id || createdData.id || ""} for "${studentName}" recorded to Database!`, "success");
              saveStatusStore.set("database", "Database Synced");
              window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "database", data: createdData } }));
            } else if (apiResult.isOffline) {
              showToast(`Report for "${studentName}" saved locally (Server offline).`, "info");
              saveStatusStore.set("local", "Saved (Local)");
              window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local" } }));
            } else {
              const errData = apiResult.errors || {};
              const targetError = errData.details || errData;
              showToast(targetError, "error");
              return;
            }
          } catch (error: any) {
            showToast("Saved locally. Server connection issue: " + error.message, "info");
            saveStatusStore.set("local", "Saved (Local)");
            window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local" } }));
          }
        } else {
          showToast(`Report for "${studentName}" saved locally (offline).`, "info");
          saveStatusStore.set("local", "Saved (Local)");
          window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local" } }));
        }
      }

      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSession = async (sessionName: string | { label?: string; name?: string }) => {
    const trimmed = typeof sessionName === "string" ? sessionName.trim() : (sessionName?.label || sessionName?.name || "");
    if (!trimmed) return;

    const { updated } = sessionStore.add(trimmed);
    setSessionList(updated);
    setSelectedSession(trimmed);
    showToast(`Session "${trimmed}" saved!`, "success");
    saveStatusStore.set("local", "Saved (Local)");

    if (isOnline()) {
      try {
        const response = await fetchWithAuth("/sessions/", {
          method: "POST",
          body: JSON.stringify({ name: trimmed }),
        });
        if (response.ok) {
          saveStatusStore.set("database", "Database Synced");
          await fetchData();
        }
      } catch (err: any) {
        console.warn("[useReportForm] Online session save failed:", err.message);
      }
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

  const handleMistakeRefresh = () => {
    setMistakeData([
      { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] },
    ]);
    showToast("Mistakes section reset", "info");
  };

  const handleStuckRefresh = () => {
    setStuckData([
      { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] },
    ]);
    showToast("Stuck section reset", "info");
  };

  return {
    selectedDate,
    setSelectedDate,
    studentName,
    setStudentName,
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
    isPanelOpen,
    setIsPanelOpen,
    pendingName,
    setPendingName,
    studentDatabase,
    availableGroups,
    sessionList,
    isLoading,
    isSaving,
    isOffline,
    draftInfo,
    recoverDraft,
    discardDraft,
    editingReport,
    cancelEditMode,
    handleSaveResult,
    handleSaveSession,
    handleSaveRecord,
    handleJuzPageRefresh,
    handleMistakeRefresh,
    handleStuckRefresh,
    handleUndo,
    handleRedo,
    canUndoDraft,
    canRedoDraft,
  };
}
