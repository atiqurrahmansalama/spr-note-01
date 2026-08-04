import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";
import { students as studentStore, sessions as sessionStore, savedComments as commentStore, isOnline } from "../../utils/localStore";

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
  const [isOffline, setIsOffline] = useState(!isOnline());

  // 💾 savedComments পরিবর্তন হলে LocalStorage-এ সেভ করা
  useEffect(() => {
    commentStore.saveAll(savedComments);
  }, [savedComments]);

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
   * 
   * Strategy:
   * 1. LocalStorage থেকে আগেই ডেটা লোড করে (instant)
   * 2. API call করার চেষ্টা করে
   * 3. API সফল হলে → LocalStorage cache আপডেট
   * 4. API ব্যর্থ হলে → LocalStorage ডেটাই ব্যবহার (offline mode)
   */
  const fetchData = async () => {
    // Step 1: LocalStorage থেকে তাৎক্ষণিকভাবে ডেটা দেখাও
    const cachedStudents = studentStore.getAll();
    const cachedSessions = sessionStore.getAll();

    if (cachedStudents.length > 0) {
      setStudentDatabase(cachedStudents);
      setAvailableGroups(Array.from(new Set(cachedStudents.map((s) => s.sub))).filter(Boolean));
    }
    if (cachedSessions.length > 0) {
      setSessionList(cachedSessions);
    }

    // Step 2: API থেকে fresh data আনার চেষ্টা
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
        const formattedStudents = rawStudents.map((s) => ({
          label: typeof s === "object" ? (s.name || s.student_name || s.label) : s,
          sub: typeof s === "object" ? (s.group || s.group_name || s.sub || "General Group") : "General Group",
        }));

        // ✅ API সফল: cache আপডেট করো
        studentStore.saveAll(formattedStudents);
        setStudentDatabase(formattedStudents);
        setAvailableGroups(Array.from(new Set(formattedStudents.map((s) => s.sub))));
      }

      if (sessionsRes.ok) {
        const rawSessions = await sessionsRes.json();
        // ✅ API সফল: cache আপডেট করো
        sessionStore.saveAll(rawSessions);
        setSessionList(rawSessions);
      }
    } catch (error) {
      // ❌ API ব্যর্থ: cached ডেটাই ব্যবহার হবে (ইতোমধ্যে set হয়েছে)
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

    // 💾 সবার আগে LocalStorage-এ সেভ করো (offline-first)
    let updatedList;
    if (result.mode === "REPLACE" && result.oldStudent) {
      updatedList = studentStore.replace(result.oldStudent, newStudent);
    } else {
      updatedList = studentStore.add(newStudent);
    }
    setStudentDatabase(updatedList);
    setAvailableGroups(Array.from(new Set(updatedList.map((s) => s.sub))).filter(Boolean));
    setStudentName(result.name);
    setGroupName(result.group || "General Group");

    // 🌐 অনলাইনে থাকলে API-তেও পাঠাও
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
          // API থেকে fresh data আনো (server-assigned ID পেতে)
          await fetchData();
        } else {
          showToast(`"${result.name}" saved locally. Will sync when possible.`, "info");
        }
      } catch {
        showToast(`"${result.name}" saved locally (offline).`, "info");
      }
    } else {
      showToast(`"${result.name}" saved locally (offline).`, "info");
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

    // 🌐 অনলাইনে থাকলে API-তে পাঠাও
    if (isOnline()) {
      try {
        const response = await fetchWithAuth("/reports/", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          showToast(`Report for "${studentName}" saved to Database!`, "success");
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
      // অফলাইনে syncEngine দিয়ে local-এ সেভ
      showToast(`Report saved locally (offline). Will sync later.`, "info");
    }

    // ফর্ম রিসেট
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
    handleSaveResult,
    handleSaveRecord,
    handleMakeReport,
  };
}