import { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithAuth } from "../../../utils/authService";
import { useToast } from "../../../context/ToastContext";
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
} from "../../../utils/localStore";
import { saveReportLocally, syncSessionsAndComments } from "../../../utils/syncEngine";
import { createReport } from "../../../api/reports";

export function useReportForm() {
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [studentName, setStudentName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  
  const [juzPageData, setJuzPageData] = useState([
    {
      id: crypto.randomUUID(),
      juz: "",
      ranges: [{ id: crypto.randomUUID(), start: "", end: "" }]
    }
  ]);

  const [mistakeData, setMistakeData] = useState([
    { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }
  ]);

  const [stuckData, setStuckData] = useState([
    { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }
  ]);

  const [comment, setComment] = useState("");

  const [savedComments, setSavedComments] = useState(() => commentStore.getAll());

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");

  const [studentDatabase, setStudentDatabase] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const historyStackRef = useRef([]);
  const redoStackRef = useRef([]);
  const isRestoringRef = useRef(false);

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
    }
  }, [captureSnapshot]);

  const handleUndo = useCallback(() => {
    const stack = historyStackRef.current;
    if (stack.length <= 1) {
      showToast("Nothing to undo", "info");
      return;
    }
    const currentSnap = stack.pop();
    redoStackRef.current.push(currentSnap);

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
    historyStackRef.current.push(nextSnapStr);

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
  const [isOffline, setIsOffline] = useState(!isOnline());

  const [draftInfo, setDraftInfo] = useState(null);

  // Edit Mode state — tracks the report being edited
  const [editingReport, setEditingReport] = useState(null);

  // Helper to load report object into form state
  const applyReportToForm = useCallback((rep) => {
    if (!rep) return;

    const sName = rep.student_name || rep.student || "";
    const gName = rep.student_group || rep.subject_course || "";
    const sSession = rep.session_name || rep.session || "";
    
    // Extract date from all possible report date field formats into clean YYYY-MM-DD format
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
        rep.juz_and_pages.map((jp) => ({
          id: crypto.randomUUID(),
          juz: String(jp.juz || ""),
          ranges: Array.isArray(jp.ranges)
            ? jp.ranges.map((r) => ({
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
        mistakesList.map((m) => ({
          id: crypto.randomUUID(),
          juz: String(m.juz || ""),
          page: String(m.page || ""),
          ayahs: Array.isArray(m.ayahs)
            ? m.ayahs.map((a) => ({ id: crypto.randomUUID(), value: String(a.value || a || "") }))
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
        stucksList.map((s) => ({
          id: crypto.randomUUID(),
          juz: String(s.juz || ""),
          page: String(s.page || ""),
          ayahs: Array.isArray(s.ayahs)
            ? s.ayahs.map((a) => ({ id: crypto.randomUUID(), value: String(a.value || a || "") }))
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
    draftReport.clear();
    setEditingReport(rep);
  }, []);

  // Mount effect: Check for pending report to edit in localStorage OR auto-recover draft
  useEffect(() => {
    const existing = draftReport.get();
    const hasUnsavedDraft = Boolean(
      existing && (existing.studentName || existing.comment || existing.selectedSession || existing.hasData)
    );

    const pendingEditRaw = localStorage.getItem("spr_editing_report");
    if (pendingEditRaw) {
      try {
        const pendingEdit = JSON.parse(pendingEditRaw);
        if (pendingEdit && typeof pendingEdit === "object") {
          // If there is existing unsaved draft data, ask user for confirmation before discarding
          if (hasUnsavedDraft) {
            const stuName = existing.studentName || "a student";
            const targetName = pendingEdit.student_name || pendingEdit.student || "selected student";
            const confirmed = window.confirm(
              `The report form currently has unsaved draft data for "${stuName}".\n\nDo you want to discard this draft and load "${targetName}"'s report for editing?`
            );
            if (!confirmed) {
              localStorage.removeItem("spr_editing_report");
              setDraftInfo(existing);
              return;
            }
          }

          localStorage.removeItem("spr_editing_report");
          applyReportToForm(pendingEdit);
          return;
        }
      } catch (err) {
        console.error("Failed to parse pending edit report:", err);
      }
    }

    if (!hasUnsavedDraft) return;

    // Always show the recovery banner — let the user decide to recover or discard
    setDraftInfo(existing);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    commentStore.saveAll(savedComments);
  }, [savedComments]);

  useEffect(() => {
    const hasAnyContent = Boolean(
      studentName.trim() || 
      groupName.trim() || 
      selectedSession || 
      comment.trim() || 
      juzPageData.some(d => d.juz || d.ranges.some(r => r.start || r.end)) ||
      mistakeData.some(m => m.page || m.ayahs.some(a => a.value)) ||
      stuckData.some(s => s.page || s.ayahs.some(a => a.value))
    );

    if (!hasAnyContent) return;

    const draftPayload = {
      studentName,
      groupName,
      selectedSession,
      selectedDate,
      juzPageData,
      mistakeData,
      stuckData,
      comment,
      hasData: true,
    };

    draftReport.save(draftPayload);
    saveStatusStore.set("local", "Saved");

    const interval = setInterval(() => {
      draftReport.save(draftPayload);
      saveStatusStore.set("local", "Saved");
    }, 90000);

    return () => clearInterval(interval);
  }, [studentName, groupName, selectedSession, selectedDate, juzPageData, mistakeData, stuckData, comment]);

  const recoverDraft = () => {
    if (!draftInfo) return;
    if (draftInfo.studentName !== undefined) setStudentName(draftInfo.studentName);
    if (draftInfo.groupName !== undefined) setGroupName(draftInfo.groupName);
    if (draftInfo.selectedSession !== undefined) setSelectedSession(draftInfo.selectedSession);
    if (draftInfo.selectedDate !== undefined) setSelectedDate(draftInfo.selectedDate);
    if (draftInfo.juzPageData?.length) setJuzPageData(draftInfo.juzPageData);
    if (draftInfo.mistakeData?.length) setMistakeData(draftInfo.mistakeData);
    if (draftInfo.stuckData?.length) setStuckData(draftInfo.stuckData);
    if (draftInfo.comment !== undefined) setComment(draftInfo.comment);

    setDraftInfo(null);
    draftReport.clear();
    showToast("Report draft recovered successfully!", "success");
    saveStatusStore.set("local", "Saved (Local)");
  };

  const discardDraft = () => {
    setDraftInfo(null);
    draftReport.clear();
    showToast("Report draft discarded", "info");
  };

  // Listen for live edit report event dispatched while already mounted
  useEffect(() => {
    const handleEditReport = (e) => {
      const rep = e.detail;
      if (!rep) return;

      const formHasData = Boolean(
        studentName.trim() ||
        groupName.trim() ||
        selectedSession ||
        comment.trim() ||
        juzPageData.some((d) => d.juz || d.ranges.some((r) => r.start || r.end)) ||
        mistakeData.some((m) => m.page || m.juz || m.ayahs.some((a) => a.value)) ||
        stuckData.some((s) => s.page || s.juz || s.ayahs.some((a) => a.value))
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

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    const cachedStudents = studentStore.getAll();
    const cachedSessions = sessionStore.getAll();

    if (cachedStudents.length > 0) {
      setStudentDatabase(cachedStudents);
      setAvailableGroups(Array.from(new Set(cachedStudents.map((s) => s.sub))).filter(Boolean));
    }
    if (cachedSessions.length > 0) {
      setSessionList(cachedSessions);
    }

    // Immediately unblock UI if local cache exists
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
        fetchWithAuth("/messages/"),
      ]);

      if (studentsRes.ok) {
        const rawStudents = await studentsRes.json();
        const apiStudents = (Array.isArray(rawStudents) ? rawStudents : []).map((s) => ({
          id: typeof s === "object" ? s.id : null,
          label: typeof s === "object" ? (s.name || s.student_name || s.label || String(s)) : String(s),
          sub: typeof s === "object" ? (s.group_name || s.group || s.sub || "General Group") : "General Group",
        }));

        const localStudents = studentStore.getAll();
        const merged = mergeStudents(apiStudents, localStudents);
        setStudentDatabase(merged);
        setAvailableGroups(Array.from(new Set(merged.map((s) => s.sub))).filter(Boolean));
      }

      if (sessionsRes.ok) {
        const rawSessions = await sessionsRes.json();
        const apiSessions = (Array.isArray(rawSessions) ? rawSessions : []).map((s) => ({
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
          .map((m) => (typeof m === "object" ? { id: m.id, text: m.text || m.comment || "" } : { text: String(m) }))
          .filter((c) => Boolean(c.text && c.text.trim()));
        const localComments = commentStore.getAll();
        const mergedComments = mergeComments(apiComments, localComments);
        setSavedComments(mergedComments);
      }
    } catch (error) {
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

    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveResult = async (result) => {
    const newStudent = {
      id: `stu_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      label: result.name,
      sub: result.group || "General Group",
      _local: true,
    };

    let updatedList;
    if (result.mode === "REPLACE" && result.oldStudent) {
      studentStore.remove(result.oldStudent);
      updatedList = studentStore.add(newStudent);
    } else {
      updatedList = studentStore.add(newStudent);
    }
    setStudentDatabase(updatedList);
    setAvailableGroups(Array.from(new Set(updatedList.map((s) => s.sub))).filter(Boolean));
    setStudentName(result.name);
    setGroupName(result.group || "General Group");


    if (isOnline()) {
      try {
        const payload = {
          name: result.name,
          group: result.group || "General Group",
        };
        const response = await fetchWithAuth("/students/", {
          method: "POST",
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
      (d) => d.juz.trim() || d.ranges.some((r) => r.start.trim() || r.end.trim())
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
    draftReport.clear();
    setDraftInfo(null);
    setEditingReport(null);
  };

  const cancelEditMode = () => {
    resetForm();
    showToast("Edit cancelled. Form cleared.", "info");
  };

  const handleSaveRecord = async () => {
    if (!validateReportForm()) return;
    setIsSaving(true);

    try {
      const cleanMistakes = mistakeData.filter(
        (m) => m.juz.trim() || m.page.trim() || m.ayahs.some((a) => a.value.trim())
      );
      const cleanStucks = stuckData.filter(
        (s) => s.juz.trim() || s.page.trim() || s.ayahs.some((a) => a.value.trim())
      );

      const editedAt = new Date().toISOString();
      const isEditing = Boolean(editingReport);

      const payload = {
        student: studentName.trim(),
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
        // Update report in local store
        const repId = editingReport.id || editingReport.report_unique_id;
        const allReports = JSON.parse(localStorage.getItem("spr_reports_local_v1") || "[]");
        const updatedReports = allReports.map((r) => {
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
              showToast(`Report for "${studentName}" updated in Database! ✏️`, "success");
              saveStatusStore.set("database", "Database Synced");
            } else {
              showToast(`Report updated locally. Will sync when possible.`, "info");
              saveStatusStore.set("local", "Saved (Local)");
            }
          } catch (error) {
            showToast("Updated locally. Server connection issue: " + error.message, "info");
            saveStatusStore.set("local", "Saved (Local)");
          }
        } else {
          showToast(`Report for "${studentName}" updated locally! ✏️`, "success");
          saveStatusStore.set("local", "Saved (Local)");
        }

        window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: isOnline() ? "database" : "local" } }));

      } else {
        // New report — POST
        saveReportLocally(payload);

        if (isOnline()) {
          try {
            const apiResult = await createReport({
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
              showToast(`Report #${createdData.report_unique_id || createdData.id || ''} for "${studentName}" recorded to Database!`, "success");
              saveStatusStore.set("database", "Database Synced");
              window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "database", data: createdData } }));
            } else if (apiResult.isOffline) {
              showToast(`Report for "${studentName}" saved locally (Server offline).`, "info");
              saveStatusStore.set("local", "Saved (Local)");
              window.dispatchEvent(new CustomEvent("spr_report_saved", { detail: { source: "local" } }));
            } else {
              const errData = apiResult.errors || {};
              let errorMsg = "Failed to save report to server";
              if (typeof errData === "string" && errData.trim()) {
                errorMsg = errData;
              } else if (errData && typeof errData === "object") {
                if (errData.detail) {
                  errorMsg = String(errData.detail);
                } else {
                  const formatted = Object.entries(errData)
                    .map(([field, errs]) => `${field}: ${Array.isArray(errs) ? errs.join(", ") : errs}`)
                    .filter(Boolean)
                    .join(" | ");
                  if (formatted) errorMsg = formatted;
                }
              }
              showToast(errorMsg, "error");
              return;
            }
          } catch (error) {
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
      await fetchData();
    } finally {
      setIsSaving(false);
    }
  };


  const handleMakeReport = () => {
    if (!validateReportForm()) return;
    showToast(`Generating report preview for "${studentName}"...`, "info");
    setIsReportModalOpen(true);
  };

  const handleSaveSession = async (sessionName) => {
    const trimmed = typeof sessionName === "string" ? sessionName.trim() : (sessionName?.label || "");
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
      } catch (err) {
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
      { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }
    ]);
    showToast("Mistakes section reset", "info");
  };

  const handleStuckRefresh = () => {
    setStuckData([
      { id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }
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
    isOffline,
    draftInfo,
    recoverDraft,
    discardDraft,
    editingReport,
    cancelEditMode,
    handleSaveResult,
    handleSaveSession,
    handleSaveRecord,
    handleMakeReport,
    handleJuzPageRefresh,
    handleMistakeRefresh,
    handleStuckRefresh,
    handleUndo,
    handleRedo,
  };
}
