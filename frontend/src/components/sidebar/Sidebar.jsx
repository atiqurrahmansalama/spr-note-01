import { useState } from "react";
import CalendarSettings from "./CalendarSettings";
import SessionManager from "./SessionManager";
import UserProfileCard from "./UserProfileCard";
import ChevronIcon from "../common/ChevronIcon"; // 🚀 কাস্টম SVG আইকন ইমপোর্ট

export default function Sidebar({ 
  isOpen, 
  onClose, 
  timeZone, 
  setTimeZone, 
  dateFormat, 
  setDateFormat,
  isProfileOpen,
  setIsProfileOpen 
}) {
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
      {/* Mobile Overlay Layer */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Responsive Sidebar Wrapper */}
      <aside
        className={`
          fixed lg:static top-0 left-0 z-50 h-full w-72 bg-[#1c1d1f] text-slate-300 border-r border-slate-800 
          shrink-0 flex flex-col justify-between shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Mobile Header with Close Cross */}
        <div className="p-4 border-b border-slate-800 bg-[#18191b] flex justify-between items-center lg:hidden">
          <span className="font-bold text-white text-sm">Navigation</span>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 text-sm rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-sm font-medium">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => handleTabClick(item)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 ${
                  activeTab === item.name
                    ? "bg-slate-800 text-white font-semibold"
                    : "hover:bg-slate-800/50 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{item.name}</span>
                
                {/* 🚀 ইমোজি সরিয়ে স্মুথ SVG তীরের আউটলাইন যুক্ত করা হলো */}
                {item.hasSub && (
                  <ChevronIcon 
                    isOpen={openSubMenu === item.name} 
                    className="w-3.5 h-3.5 text-slate-400"
                  />
                )}
              </button>

              {/* Settings Sub-Menu */}
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

              {/* Sessions & Comments Sub-Menu */}
              {item.name === "Sessions & Comments" && openSubMenu === "Sessions & Comments" && (
                <div className="mt-1 pl-2">
                  <SessionManager />
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Minimal Clean Profile Card */}
        <UserProfileCard
          isProfileOpen={isProfileOpen}
          setIsProfileOpen={setIsProfileOpen}
        />
      </aside>
    </>
  );
}