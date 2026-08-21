import React, { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/ui/PageHeader";
import TabSwitcher from "../../components/ui/TabSwitcher";
import MasterTimeCalendar from "../../components/common/MasterTimeCalendar";
import TimeScheduleDrawerForm from "../../components/common/TimeScheduleDrawerForm";
import { masterCalendarStore } from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { useToast } from "../../context/ToastContext";
import { useRightSidebar } from "../../context/RightSidebarContext";
import {
  CalendarIcon,
  TimerIcon,
  PrintIcon,
  RefreshIcon,
  PlusIcon,
} from "../../components/ui/Icons";

const TABS = [
  { id: "WORKING_HOURS", label: "Working Hours", icon: TimerIcon },
  { id: "ACADEMIC_EVENT", label: "Academic Events", icon: CalendarIcon },
];

export default function TimeCalendarManagerView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState("WORKING_HOURS");
  const [isLoading, setIsLoading] = useState(true);

  // Load events from tenant store
  const loadEvents = useCallback(() => {
    try {
      const data = masterCalendarStore.getEvents(activeTenantId);
      setEvents(data || []);
    } catch (err) {
      console.error("Failed to load master calendar events:", err);
      showToast("Failed to load calendar events", "error");
    } finally {
      setIsLoading(false);
    }
  }, [activeTenantId, showToast]);

  useEffect(() => {
    loadEvents();

    const handleUpdate = () => loadEvents();
    window.addEventListener("spr_calendar_events_updated", handleUpdate);
    return () => window.removeEventListener("spr_calendar_events_updated", handleUpdate);
  }, [loadEvents]);

  // Handle Save Event
  const handleSaveEvent = (eventData) => {
    try {
      if (eventData.id) {
        masterCalendarStore.updateEvent(activeTenantId, eventData.id, eventData);
        showToast("Schedule updated successfully!", "success");
      } else {
        masterCalendarStore.addEvent(activeTenantId, eventData);
        showToast("New schedule / event created successfully!", "success");
      }
      loadEvents();
    } catch (err) {
      showToast("Failed to save event", "error");
    }
  };

  // Handle Delete Event
  const handleDeleteEvent = (eventId) => {
    try {
      masterCalendarStore.deleteEvent(activeTenantId, eventId);
      showToast("Schedule removed successfully.", "info");
      loadEvents();
    } catch (err) {
      showToast("Failed to delete event", "error");
    }
  };

  // Open Right Sidebar for adding new entry from top TabSwitcher
  const handleOpenAddDrawer = () => {
    openRightSidebar({
      title: activeTab === "WORKING_HOURS" ? "Add Working Hours" : "Add Academic Event",
      width: 520,
      content: (
        <TimeScheduleDrawerForm
          defaultCategory={activeTab}
          onSave={(savedData) => {
            handleSaveEvent(savedData);
            closeRightSidebar();
          }}
          onCancel={closeRightSidebar}
        />
      ),
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = "ID,Title,Category,Audience,Start Date,End Date,Start Time,End Time,Repeats,Timezone\n";
    events.forEach((e) => {
      csv += `"${e.id}","${e.title || ""}","${e.category || ""}","${e.audience || ""}","${e.startDate || ""}","${e.endDate || ""}","${e.startTime || ""}","${e.endTime || ""}","${e.repeats ? "YES" : "NO"}","${e.timezone || ""}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `institution_calendar_events_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("Master schedule exported successfully.", "success");
  };

  // Reset Defaults
  const handleResetDefaults = () => {
    if (window.confirm("Reset calendar & events to standard institutional defaults? Custom changes will be restored.")) {
      localStorage.removeItem(`spr_master_calendar_${activeTenantId || "default"}`);
      loadEvents();
      showToast("Calendar reset to defaults.", "info");
    }
  };

  const actionMenuItems = [
    {
      label: "Export Schedule (CSV)",
      icon: PrintIcon,
      onClick: handleExportCSV,
    },
    {
      label: "Print Calendar",
      icon: PrintIcon,
      onClick: () => window.print(),
    },
    {
      label: "Reset to Standard Defaults",
      icon: RefreshIcon,
      onClick: handleResetDefaults,
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-6 px-4 sm:px-6 space-y-6 font-sans text-left min-h-screen theme-text-primary animate-fade-in select-none">
      
      {/* ─── 1. Header Overview with Reusable PageHeader ──────────── */}
      <div className="print:hidden">
        <PageHeader
          icon={CalendarIcon}
          title="Calendar & Events"
          subtitle="Master institutional console for managing operational working hours, faculty shifts, public holidays, and academic event schedules."
        />
      </div>

      {/* ─── 2. Top Tab Switcher with Add Button on Far Right (Matching Classes & Groups) ─── */}
      <div className="print:hidden">
        <TabSwitcher
          tabs={TABS}
          activeTab={activeTab}
          onChange={setActiveTab}
          rightContent={
            <button
              type="button"
              onClick={handleOpenAddDrawer}
              className="w-full sm:w-auto px-4 sm:px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          }
        />
      </div>

      {/* ─── 3. Reusable Master Calendar Engine ────────────────────── */}
      <div className="min-h-[640px]">
        <MasterTimeCalendar
          events={events}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          selectedCategory={activeTab}
          actionMenuItems={actionMenuItems}
        />
      </div>
    </div>
  );
}
