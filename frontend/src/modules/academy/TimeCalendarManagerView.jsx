import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import TabSwitcher from "../../components/ui/TabSwitcher";
import MasterTimeCalendar from "../../components/common/MasterTimeCalendar";
import TimeScheduleDrawerForm from "../../components/common/TimeScheduleDrawerForm";
import TimeScheduleDetailDrawer from "../../components/common/TimeScheduleDetailDrawer";
import { masterCalendarStore } from "../../utils/localStore";
import { useTenant } from "../../context/TenantContext";
import { useToast } from "../../context/ToastContext";
import { useRightSidebar, useDrawerRegistration } from "../../context/RightSidebarContext";
import {
  CalendarIcon,
  TimerIcon,
  PrintIcon,
  RefreshIcon,
  PlusIcon,
  ChecklistIcon,
} from "../../components/ui/Icons";

const TABS = [
  { id: "WORKING_HOURS", label: "Working Hours", icon: TimerIcon },
  { id: "ACADEMIC_EVENT", label: "Academic Events", icon: CalendarIcon },
  { id: "AGENDA", label: "Agenda", icon: ChecklistIcon },
];

export default function TimeCalendarManagerView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const [searchParams, setSearchParams] = useSearchParams();

  const [events, setEvents] = useState([]);
  const activeTab = searchParams.get("tab") || "WORKING_HOURS";
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimelineDate, setSelectedTimelineDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [calendarDisplayMode, setCalendarDisplayMode] = useState(() => {
    try {
      return localStorage.getItem("spr_calendar_display_mode") || "grid";
    } catch {
      return "grid";
    }
  });

  const setActiveTab = (tabId) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabId);
      return next;
    }, { replace: true });
  };

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
  const handleSaveEvent = useCallback((eventData) => {
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
  }, [activeTenantId, showToast, loadEvents]);

  // Handle Delete Event (Supports scoped recurring deletion)
  const handleDeleteEvent = useCallback((eventOrId, options = {}) => {
    try {
      const id = typeof eventOrId === "object" ? eventOrId.id : eventOrId;
      const opts = typeof eventOrId === "object" ? eventOrId : options;
      masterCalendarStore.deleteEvent(activeTenantId, id, opts);
      showToast("Schedule removed successfully.", "info");
      loadEvents();
    } catch (err) {
      showToast("Failed to delete event", "error");
    }
  }, [activeTenantId, showToast, loadEvents]);

  // Universal Drawer Registration for Schedule / Event (survives full browser reload / F5)
  useDrawerRegistration(
    "schedule",
    (params) => {
      const mode = params.get("mode") || "add";
      const eventId = params.get("eventId");
      const targetDate = params.get("date") || "";
      const foundEvent = eventId ? events.find((e) => String(e.id) === String(eventId)) : null;
      const defaultTabCategory = activeTab === "AGENDA" ? "WORKING_HOURS" : activeTab;
      const targetCategory = foundEvent?.category || params.get("category") || defaultTabCategory;

      const isWorkingHours = targetCategory === "WORKING_HOURS";

      if (mode === "detail" && foundEvent) {
        return {
          title: isWorkingHours ? "Working Hours Details" : "Academic Event Details",
          category: "Schedule & Calendar",
          size: "md",
          content: (
            <TimeScheduleDetailDrawer
              event={foundEvent}
              currentDate={targetDate}
              onEdit={() => {
                openDrawer("schedule", {
                  mode: "edit",
                  eventId: foundEvent.id,
                  category: foundEvent.category,
                  date: targetDate,
                });
              }}
              onDelete={(deleteInfo) => {
                handleDeleteEvent(deleteInfo || foundEvent.id);
                closeDrawer();
              }}
              onClose={closeDrawer}
            />
          ),
        };
      }

      return {
        title: mode === "add"
          ? (isWorkingHours ? "Add Working Hours" : "Add Academic Event")
          : "Edit Schedule / Event",
        category: "Schedule & Calendar",
        size: "md",
        content: (
          <TimeScheduleDrawerForm
            key={`schedule-form-${mode}-${eventId || 'new'}-${targetDate}-${targetCategory}`}
            event={foundEvent}
            initialDate={targetDate}
            defaultCategory={targetCategory}
            onSave={(savedData) => {
              handleSaveEvent(savedData);
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [events, activeTab, handleSaveEvent, handleDeleteEvent, openDrawer, closeDrawer]
  );

  // Open Right Sidebar for adding new entry from top TabSwitcher
  const handleOpenAddDrawer = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const currentMode = localStorage.getItem("spr_calendar_display_mode") || calendarDisplayMode || "grid";
    const targetDate = currentMode === "timeline" ? (selectedTimelineDate || todayStr) : todayStr;
    openDrawer("schedule", {
      mode: "add",
      date: targetDate,
      category: activeTab === "AGENDA" ? "WORKING_HOURS" : activeTab,
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
    <div className="w-full max-w-7xl mx-auto py-2 @sm:py-4 px-1 @sm:px-3 @lg:px-6 space-y-3 @sm:space-y-6 font-sans text-left min-h-screen theme-text-primary animate-fade-in select-none min-w-0">
      
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
              className="px-3 sm:px-4 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              title="Add Schedule or Academic Event"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add</span>
            </button>
          }
        />
      </div>

      {/* ─── 3. Reusable Master Calendar Engine ────────────────────── */}
      <div className="min-h-[640px] w-full min-w-0">
        <MasterTimeCalendar
          events={events}
          onSaveEvent={handleSaveEvent}
          onDeleteEvent={handleDeleteEvent}
          selectedCategory={activeTab === "AGENDA" ? "ALL" : activeTab}
          viewMode={activeTab === "AGENDA" ? "list" : "month"}
          actionMenuItems={actionMenuItems}
          onDateSelect={setSelectedTimelineDate}
          onDisplayModeChange={setCalendarDisplayMode}
        />
      </div>
    </div>
  );
}
