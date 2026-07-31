import { useState } from "react";
import Sidebar from "./components/sidebar/Sidebar";
import HifzReportForm from "./components/HifzReportForm";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");

  return (
    <div className="min-h-screen bg-[#17181a] text-slate-200 flex">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        timeZone={timeZone}
        setTimeZone={setTimeZone}
        dateFormat={dateFormat}
        setDateFormat={setDateFormat}
      />

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-6 left-6 z-30 w-10 h-10 rounded-full bg-[#212327] border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center shadow-2xl transition hover:scale-105"
        title="Toggle Menu"
      >
        ☰
      </button>

      <main className="flex-1 lg:ml-72 p-4 md:p-8">
        <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
      </main>
    </div>
  );
}