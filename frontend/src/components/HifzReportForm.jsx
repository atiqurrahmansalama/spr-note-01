import { useState, useEffect } from "react";
import HeaderDateControl from "./HeaderDateControl";
import AutocompleteDropdown from "./common/AutocompleteDropdown";
import StudentSavePanel from "./StudentSavePanel";

export default function HifzReportForm({ timeZone, dateFormat }) {
  const [selectedDate, setSelectedDate] = useState("");
  const [studentName, setStudentName] = useState("");
  const [groupName, setGroupName] = useState("");

  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [pendingName, setPendingName] = useState("");

  const [studentDatabase, setStudentDatabase] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 ১. ব্যাকএন্ড ডাটাবেজ থেকে লাইভ স্টুডেন্ট ও গ্রুপ লোড
  useEffect(() => {
    let isMounted = true;

    async function loadDatabaseRecords() {
      try {
        const response = await fetch("http://127.0.0.1:8000/reports/");
        if (response.ok) {
          const reports = await response.json();

          const studentMap = new Map();
          const groupSet = new Set();

          reports.forEach((item) => {
            if (item.student_id) {
              studentMap.set(item.student_id, {
                label: item.student_id,
                sub: item.subject_course || "General Group",
              });
            }
            if (item.subject_course) {
              groupSet.add(item.subject_course);
            }
          });

          const uniqueStudents = Array.from(studentMap.values());
          const uniqueGroups = Array.from(groupSet);

          if (isMounted) {
            setStudentDatabase(uniqueStudents);
            setAvailableGroups(uniqueGroups);

            if (uniqueStudents.length > 0) {
              setStudentName(uniqueStudents[0].label);
              setGroupName(uniqueStudents[0].sub);
            }
          }
        }
      } catch (error) {
        console.error("Backend connection error:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDatabaseRecords();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshRecords = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/reports/");
      if (response.ok) {
        const reports = await response.json();
        const studentMap = new Map();
        const groupSet = new Set();

        reports.forEach((item) => {
          if (item.student_id) {
            studentMap.set(item.student_id, {
              label: item.student_id,
              sub: item.subject_course || "General Group",
            });
          }
          if (item.subject_course) {
            groupSet.add(item.subject_course);
          }
        });

        setStudentDatabase(Array.from(studentMap.values()));
        setAvailableGroups(Array.from(groupSet));
      }
    } catch (error) {
      console.error("Refresh error:", error);
    }
  };

  const handleStudentSelect = (selected) => {
    if (typeof selected === "object") {
      setStudentName(selected.label);
      if (selected.sub) setGroupName(selected.sub);
    } else {
      setStudentName(selected);
    }
  };

  const handleOpenSavePanel = (typedName) => {
    setPendingName(typedName);
    setIsPanelOpen(true);
  };

  // 🚀 ২. নতুন নাম বা রিপ্লেস করা নাম ব্যাকএন্ডে POST করা (With client_updated_at)
  const handleSaveResult = async (result) => {
    const payload = {
      student_id: result.name,
      subject_course: result.group || "General Group",
      report_date: selectedDate || new Date().toISOString().split("T")[0],
      overall_status: "IN_PROGRESS",
      client_updated_at: new Date().toISOString(),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/reports/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`Success! "${result.name}" saved to Django backend database!`);
        setStudentName(result.name);
        setGroupName(result.group);
        await refreshRecords();
      } else {
        const errData = await response.json();
        alert("Backend Error: " + JSON.stringify(errData));
      }
    } catch (error) {
      alert("Failed to connect to Django server: " + error.message);
    }
  };

  // 🚀 ৩. মেইন রিপোর্ট রেকর্ড ব্যাকএন্ডে POST করা (With client_updated_at)
  const handleSaveRecord = async () => {
    if (!studentName.trim()) {
      alert("Please specify a student name.");
      return;
    }

    const payload = {
      student_id: studentName,
      report_date: selectedDate || new Date().toISOString().split("T")[0],
      subject_course: groupName || "General Group",
      overall_status: "COMPLETED",
      client_updated_at: new Date().toISOString(),
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/reports/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert(`Report for "${studentName}" directly saved to Django Database!`);
        await refreshRecords();
      } else {
        const errData = await response.json();
        alert("Save Failed: " + JSON.stringify(errData));
      }
    } catch (error) {
      alert("Server Connection Failed: " + error.message);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-slate-500 text-xs font-mono">Connecting to Backend Database...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-12 font-sans text-slate-200">
      {/* 1. Header Card */}
      <div className="bg-[#212327] rounded-2xl p-6 text-center shadow-lg space-y-3">
        <h1 className="text-2xl font-serif font-bold text-slate-100 tracking-wide">
          Hifz Daily Progress Report
        </h1>
        <HeaderDateControl
          timeZone={timeZone}
          dateFormat={dateFormat}
          onDateChange={(customDate) => setSelectedDate(customDate)}
        />
      </div>

      {/* 2. Student Section */}
      <div className="bg-[#212327] rounded-2xl p-5 shadow-lg space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            STUDENT
          </label>
          <div className="flex-1">
            <AutocompleteDropdown
              options={studentDatabase}
              value={studentName}
              onChange={handleStudentSelect}
              onAddNew={handleOpenSavePanel}
              placeholder="Search or type student name..."
            />

            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full bg-transparent text-[11px] text-slate-500 mt-1 pl-1 focus:outline-none focus:text-slate-300"
              placeholder="Group Name"
            />
          </div>
        </div>

        {/* Dynamic Action Panel */}
        <StudentSavePanel
          isOpen={isPanelOpen}
          onClose={() => setIsPanelOpen(false)}
          initialName={pendingName}
          studentOptions={studentDatabase}
          groups={availableGroups}
          onSave={handleSaveResult}
        />
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <button
          onClick={handleSaveRecord}
          className="w-full bg-[#2c2d31] hover:bg-[#34353a] text-slate-200 font-semibold py-3.5 px-4 rounded-2xl shadow-lg transition"
        >
          Add to Record
        </button>
      </div>
    </div>
  );
}