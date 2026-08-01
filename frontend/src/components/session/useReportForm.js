import { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/authService";
import { useToast } from "../../context/ToastContext";

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

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");

  const [studentDatabase, setStudentDatabase] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [sessionList, setSessionList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 ১. ডাটাবেজ থেকে সরাসরি /students/ এবং /sessions/ থেকে লোড করা
  const fetchData = async () => {
    try {
      const [studentsRes, sessionsRes] = await Promise.all([
        fetchWithAuth("/students/"),
        fetchWithAuth("/sessions/"),
      ]);

      if (studentsRes.ok) {
        const students = await studentsRes.json();
        const formattedStudents = students.map((s) => ({
          label: typeof s === "object" ? (s.name || s.student_name || s.label) : s,
          sub: typeof s === "object" ? (s.group || s.group_name || s.sub || "General Group") : "General Group",
        }));

        setStudentDatabase(formattedStudents);
        setAvailableGroups(Array.from(new Set(formattedStudents.map((s) => s.sub))));
      }

      if (sessionsRes.ok) {
        const sessions = await sessionsRes.json();
        setSessionList(sessions);
      }
    } catch (error) {
      console.error("Data fetching error:", error);
    }
  };

  // 🚀 ২. ইনিশিয়াল মাউন্ট
  useEffect(() => {
    let isMounted = true;

    async function initLoad() {
      try {
        await fetchData();
      } catch (err) {
        console.error("Init load error:", err);
        if (isMounted) {
          showToast("Failed to connect to backend server", "error");
        }
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

  // 🚀 ৩. নতুন স্টুডেন্ট সেভ হ্যান্ডলার
  const handleSaveResult = async (result) => {
    const payload = {
      name: result.name,
      group: result.group || "General Group",
    };

    try {
      const response = await fetchWithAuth("/students/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast(`Student "${result.name}" saved successfully!`, "success");
        setStudentName(result.name);
        setGroupName(result.group);
        await fetchData();
      } else {
        const errData = await response.json();
        showToast(typeof errData === "string" ? errData : "Failed to save student", "error");
      }
    } catch (error) {
      showToast("Server Connection Failed: " + error.message, "error");
    }
  };

  // 🚀 ৪. মেইন রিপোর্ট সেভ বাটন হ্যান্ডলার
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
      juz_and_pages: juzPageData, // 👈 Added this
      mistakes: mistakeData,
      stucks: stuckData,
      overall_status: "COMPLETED",
      client_updated_at: new Date().toISOString(),
    };

    try {
      const response = await fetchWithAuth("/reports/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        showToast(`Report for "${studentName}" saved to Database!`, "success");
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
      } else {
        const errData = await response.json();
        showToast(typeof errData === "string" ? errData : "Failed to save report", "error");
      }
    } catch (error) {
      showToast("Server Connection Failed: " + error.message, "error");
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
    isPanelOpen,
    setIsPanelOpen,
    pendingName,
    setPendingName,
    studentDatabase,
    availableGroups,
    sessionList,
    isLoading,
    handleSaveResult,
    handleSaveRecord,
  };
}