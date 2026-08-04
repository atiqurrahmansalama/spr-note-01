import { useState, useEffect, useRef, useCallback } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { 
  students as studentStore, 
  sessions as sessionStore, 
  savedComments as commentStore, 
  isOnline, 
  mergeStudents, 
  mergeSessions,
  draftReport,
  saveStatusStore,
} from "../../utils/localStore";

export function useReportForm() {
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState("");
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

  // 💾 savedComments LocalStorage থেকে initialize
  const [savedComments, setSavedComments] = useState(() => commentStore.getAll());

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");

  const [studentDatabase, setStudentDatabase] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ↩️ Undo / Redo History Stack Management
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

  // 📝 Unsaved Draft state detection on mount
  const [draftInfo, setDraftInfo] = useState(() => {
    const existing = draftReport.get();
    if (existing && (existing.studentName || existing.comment || existing.selectedSession || existing.hasData)) {
      return existing;
    }
    return null;
  });

  // 💾 savedComments পরিবর্তন হলে LocalStorage-এ সেভ করা
  useEffect(() => {
    commentStore.saveAll(savedComments);
  }, [savedComments]);

  // 💾 Auto-Save Draft to LocalStorage every 1.5 - 2 minutes (90s) & when form inputs change
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

    // Save to LocalStorage immediately
    draftReport.save(draftPayload);
    saveStatusStore.set("local", "Saved");

    // Periodic 90s (1.5 min) re-trigger auto-save
    const interval = setInterval(() => {
      draftReport.save(draftPayload);
      saveStatusStore.set("local", "Saved");
    }, 90000);

    return () => clearInterval(interval);
  }, [studentName, groupName, selectedSession, selectedDate, juzPageData, mistakeData, stuckData, comment]);

  // 🔄 Recover draft handler
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

  // 🗑️ Discard draft handler
  const discardDraft = () => {
    setDraftInfo(null);
    draftReport.clear();
    showToast("Report draft discarded", "info");
  };

  // 🌐 Online/offline status monitor
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchData(); // অনলাইনে আসলে ডেটা sync করবে
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 🚀 ডেটা লোড করার মূল ফাংশন
   */
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

    if (!isOnline()) {
      console.info("[useReportForm] Offline — using cached data.");
      return;
    }

    try {
      const [studentsRes, sessionsRes] = await Promise.all([
        fetchWithAuth("/students/"),
        fetchWithAuth("/sessions/"),
      ]);

      if (studentsRes.ok) {
        const rawStudents = await studentsRes.json();
        const apiStudents = rawStudents.map((s) => ({
          label: typeof s === "object" ? (s.name || s.student_name || s.label) : s,
          sub: typeof s === "object" ? (s.group || s.group_name || s.sub || "General Group") : "General Group",
        }));

        const localStudents = studentStore.getAll();
        const merged = mergeStudents(apiStudents, localStudents);
        setStudentDatabase(merged);
        setAvailableGroups(Array.from(new Set(merged.map((s) => s.sub))).filter(Boolean));
      }

      if (sessionsRes.ok) {
        const rawSessions = await sessionsRes.json();
        const localSessions = sessionStore.getAll();
        const merged = mergeSessions(rawSessions, localSessions);
        setSessionList(merged);
      }
    } catch (error) {
      console.warn("[useReportForm] API unreachable, using cached data:", error.message);
    }
  };

  // 🚀 ইনিশিয়াল মাউন্ট
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

  // 🚀 নতুন স্টুডেন্ট সেভ হ্যান্ডলার
  const handleSaveResult = async (result) => {
    const newStudent = {
      label: result.name,
      sub: result.group || "General Group",
    };

    let updatedList;
    if (result.mode === "REPLACE" && result.oldStudent) {
      updatedList = studentStore.replace(result.oldStudent, { ...newStudent, _local: true });
    } else {
      updatedList = studentStore.add({ ...newStudent, _local: true });
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

  // 🚀 মেইন রিপোর্ট সেভ বাটন হ্যান্ডলার
  const handleSaveRecord = async () => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return;
    }

    const payload = {
      student: studentName,
      session: selectedSession,
      report_date: selectedDate || new Date().toISOString().split("T")[0],
      subject_course: groupName || "General Group",
      juz_and_pages: juzPageData,
      mistakes: mistakeData,
      stucks: stuckData,
      overall_status: "COMPLETED",
      client_updated_at: new Date().toISOString(),
    };

    if (isOnline()) {
      try {
        const response = await fetchWithAuth("/reports/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          showToast(`Report for "${studentName}" saved to Database!`, "success");
          saveStatusStore.set("database", "Database Synced");
        } else {
          const errData = await response.json();
          showToast(typeof errData === "string" ? errData : "Failed to save report", "error");
          return;
        }
      } catch (error) {
        showToast("Server Connection Failed: " + error.message, "error");
        return;
      }
    } else {
      showToast(`Report saved locally (offline). Will sync later.`, "info");
      saveStatusStore.set("local", "Saved (Local)");
    }

    // Clear local report draft upon successful save
    draftReport.clear();
    setDraftInfo(null);

    // Reset Form
    setStudentName("");
    setGroupName("");
    setSelectedSession("");
    setJuzPageData([{
      id: crypto.randomUUID(),
      juz: "",
      ranges: [{ id: crypto.randomUUID(), start: "", end: "" }]
    }]);
    setMistakeData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    setStuckData([{ id: crypto.randomUUID(), juz: "", page: "", ayahs: [{ id: crypto.randomUUID(), value: "" }] }]);
    await fetchData();
  };

  // 🚀 মেক রিপোর্ট বাটন হ্যান্ডলার
  const handleMakeReport = async () => {
    if (!studentName.trim()) {
      showToast("Please specify a student name first", "warning");
      return;
    }
    showToast(`Generating report for "${studentName}"...`, "info");
    await handleSaveRecord();
  };

  // 🚀 নতুন সেশন সেভ হ্যান্ডলার (মেইন রিপোর্ট ফর্মের সেশন ড্রপডাউন থেকে)
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
    handleSaveResult,
    handleSaveSession,
    handleSaveRecord,
    handleMakeReport,
    handleUndo,
    handleRedo,
  };
}