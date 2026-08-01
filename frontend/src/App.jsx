import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import UserProfileDrawer from "./components/layout/UserProfileDrawer";
import HifzReportForm from "./components/session/HifzReportForm";

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [timeZone, setTimeZone] = useState("Asia/Dhaka");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try { return JSON.parse(savedUser); } catch { return null; }
    }
    return null;
  });

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
    setIsProfileOpen(false);
    window.location.reload();
  };

  const avatarChar = user 
    ? (user.first_name ? user.first_name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase())
    : "S";

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#121315]">
      
      {/* Global Top Navigation Bar */}
      <header className="bg-[#18191b] border-b border-slate-800 px-4 py-3 flex justify-between items-center z-30 shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#1c1d1f] hover:bg-slate-800 text-xs font-medium transition flex items-center gap-2"
            title="Toggle Left Menu"
          >
            <span>☰</span>
            <span className="hidden sm:inline">Menu</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base tracking-wide">SPR Note</span>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 hidden sm:inline-block">v1.93.0</span>
          </div>
        </div>

        {/* Right Top Action Button */}
        <div>
          {user ? (
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 bg-[#1c1d1f] hover:bg-slate-800 border border-slate-700/80 px-3 py-1.5 rounded-xl transition text-left"
            >
              <div className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-xs text-indigo-400 font-bold flex items-center justify-center">
                {avatarChar}
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden md:inline truncate max-w-30">
                {user.first_name ? `${user.first_name}` : user.username}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-xs text-indigo-400 hover:underline font-semibold"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <div className="flex flex-1 h-full overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          timeZone={timeZone}
          setTimeZone={setTimeZone}
          dateFormat={dateFormat}
          setDateFormat={setDateFormat}
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />

        {/* Center Main Content */}
        <main className="flex-1 h-full overflow-y-auto p-4 sm:p-6 transition-all duration-300 flex justify-center items-start">
          <HifzReportForm timeZone={timeZone} dateFormat={dateFormat} />
        </main>

        {/* Right Sidebar */}
        <UserProfileDrawer 
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}