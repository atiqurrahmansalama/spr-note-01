import { useState } from "react";
import CalendarSettings from "./CalendarSettings";

export default function Sidebar({ isOpen, onClose, timeZone, setTimeZone, dateFormat, setDateFormat }) {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [openSubMenu, setOpenSubMenu] = useState("Settings");

  const menuItems = [
    { id: "Dashboard", name: "Dashboard" },
    { id: "Profiles", name: "Profiles" },
    { id: "Appearance", name: "Appearance" },
    { id: "Settings", name: "Settings", hasSub: true },
    { id: "Groups", name: "Groups & Students", hasSub: true },
    { id: "Sessions", name: "Sessions & Comments", hasSub: true },
    { id: "Shortcuts", name: "Shortcuts" },
    { id: "AppGuide", name: "App Guide" },
    { id: "About", name: "About" },
  ];

  const handleTabClick = (item) => {
    setActiveTab(item.name);
    if (item.hasSub) {
      setOpenSubMenu(openSubMenu === item.name ? null : item.name);
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose}></div>
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-[#1c1d1f] text-slate-300 z-50 transform transition-transform duration-300 ease-in-out border-r border-slate-800/80 flex flex-col shadow-2xl ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="p-5 flex justify-between items-center border-b border-slate-800/80 bg-[#18191b]">
          <div>
            <h2 className="font-bold text-white text-base tracking-wide">SPR Note</h2>
            <p className="text-[11px] text-slate-500 font-medium">Enterprise Progress Tracker</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-sm font-medium">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleTabClick(item)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                  activeTab === item.name
                    ? "bg-slate-800 text-white font-semibold shadow-inner"
                    : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{item.name}</span>
                {item.hasSub && (
                  <span className={`text-[10px] text-slate-500 transition-transform ${openSubMenu === item.name ? "rotate-180" : ""}`}>
                    ▼
                  </span>
                )}
              </button>

              {item.name === "Settings" && openSubMenu === "Settings" && (
                <div className="mt-1 pl-2">
                  <CalendarSettings
                    timeZone={timeZone}
                    setTimeZone={setTimeZone}
                    dateFormat={dateFormat}
                    setDateFormat={setDateFormat}
                  />
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/80 bg-[#17181a]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              S
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">Not signed in</p>
              <p className="text-[10px] text-indigo-400 hover:underline cursor-pointer">Tap to sign in →</p>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-600 text-center font-mono">
            SPR Note · v1.93.0
          </div>
        </div>
      </aside>
    </>
  );
}