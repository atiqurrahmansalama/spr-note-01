import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarIcon,
  PlusIcon,
  RefreshIcon,
  CloseIcon,
  TrashIcon,
  EditIcon,
  SparklesIcon,
  ClockIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import {
  getCalendarEvents,
  deleteCalendarEvent,
  getInstitutionalTasks,
  deleteInstitutionalTask,
  toggleTaskComplete,
  createInstitutionalTask,
} from '../../api/calendar';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import EventFormModal from './EventFormModal';
import TaskFormModal from './TaskFormModal';

export default function CalendarHubView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week' | 'agenda'
  const [selectedDay, setSelectedDay] = useState(null);

  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Task side-panel state
  const [taskFilter, setTaskFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'HIGH' | 'COMPLETED'
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [isAddingQuickTask, setIsAddingQuickTask] = useState(false);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Load calendar events & tasks
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [eventsRes, tasksRes] = await Promise.all([
        getCalendarEvents({ year: currentYear, month: currentMonth }),
        getInstitutionalTasks({}),
      ]);

      setEvents(Array.isArray(eventsRes) ? eventsRes : eventsRes.results || []);
      setTasks(Array.isArray(tasksRes) ? tasksRes : tasksRes.results || []);
    } catch (err) {
      console.error('Error loading calendar data:', err);
      showToast('Failed to load calendar events and tasks', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentYear, currentMonth, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  // Calendar Navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Task Actions
  const handleToggleTask = async (taskId) => {
    try {
      const updated = await toggleTaskComplete(taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      showToast(updated.is_completed ? 'Task marked completed.' : 'Task marked pending.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to update task', 'error');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteInstitutionalTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      showToast('Task removed.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete task', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteCalendarEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      showToast('Calendar event deleted.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete event', 'error');
    }
  };

  const handleQuickTaskAdd = async (e) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    setIsAddingQuickTask(true);
    try {
      const newTask = await createInstitutionalTask({
        title: quickTaskTitle.trim(),
        priority: 'MEDIUM',
        category: 'GENERAL',
        due_date: new Date().toISOString().split('T')[0],
      });
      setTasks((prev) => [newTask, ...prev]);
      setQuickTaskTitle('');
      showToast('Task created!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to add quick task', 'error');
    } finally {
      setIsAddingQuickTask(false);
    }
  };

  // Generate Month Days Grid
  const getDaysInMonth = () => {
    const year = currentYear;
    const month = currentMonth - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startingDayIndex = firstDay.getDay(); // 0 = Sunday

    // Previous month padding
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevLastDay - i,
        isCurrentMonth: false,
        dateStr: new Date(year, month - 1, prevLastDay - i).toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr,
      });
    }

    // Next month padding
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr: new Date(year, month + 1, i).toISOString().split('T')[0],
      });
    }

    return days;
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const todayStr = new Date().toISOString().split('T')[0];
  const monthDays = getDaysInMonth();

  // Filter Tasks for Side Panel
  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'PENDING') return !t.is_completed;
    if (taskFilter === 'COMPLETED') return t.is_completed;
    if (taskFilter === 'HIGH') return t.priority === 'HIGH' && !t.is_completed;
    return true;
  });

  const pendingTaskCount = tasks.filter((t) => !t.is_completed).length;

  return (
    <div className="p-3 @sm:p-4 @md:p-6 space-y-5 @sm:space-y-6 max-w-7xl mx-auto min-h-screen theme-text-primary animate-fade-in select-none w-full min-w-0 @container">
      {/* 1. Header Hub */}
      <div className="flex flex-col @md:flex-row @md:items-center justify-between gap-3 @sm:gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner shrink-0">
              <CalendarIcon className="w-5 h-5 @sm:w-6 @sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg @sm:text-xl @md:text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
                Institutional Calendar & Tasks
              </h1>
              <p className="text-[11px] @sm:text-xs theme-text-secondary">
                Academic schedule, holiday awareness engine, and institutional To-Do checklist
              </p>
            </div>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2 @sm:gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-xl theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl theme-bg-surface border theme-border hover:theme-bg-elevated theme-text-primary text-xs font-semibold transition-colors cursor-pointer"
          >
            <PlusIcon className="w-4 h-4 text-amber-400" />
            <span>Add Task</span>
          </button>

          <button
            onClick={() => {
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Event / Holiday</span>
          </button>
        </div>
      </div>

      {/* 2. Main Calendar & To-Do Panel Split Layout */}
      <div className="grid grid-cols-1 @2xl:grid-cols-3 gap-4 @lg:gap-6 w-full min-w-0">
        {/* LEFT & CENTER: Calendar Interactive Hub (2 Cols on @2xl) */}
        <div className="@2xl:col-span-2 space-y-4 min-w-0">
          {/* Calendar Month Selector Bar */}
          <div className="p-4 rounded-2xl theme-bg-surface border theme-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold tracking-tight theme-text-primary">
                {monthName} {currentYear}
              </h2>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-primary cursor-pointer"
              >
                Today
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
                title="Previous Month"
              >
                ← Prev
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
                title="Next Month"
              >
                Next →
              </button>

              <div className="inline-flex p-0.5 theme-bg-sub border theme-border rounded-xl ml-2">
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    calendarView === 'month' ? 'theme-bg-accent theme-accent-text' : 'theme-text-secondary'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setCalendarView('agenda')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    calendarView === 'agenda' ? 'theme-bg-accent theme-accent-text' : 'theme-text-secondary'
                  }`}
                >
                  Agenda
                </button>
              </div>
            </div>
          </div>

          {/* Month Grid View */}
          {calendarView === 'month' ? (
            <div className="rounded-3xl theme-bg-surface border theme-border overflow-hidden shadow-xl">
              {/* Day Headers (Sun - Sat) */}
              <div className="grid grid-cols-7 border-b theme-border theme-bg-sub text-center py-2 text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                <div className="text-rose-400">Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div className="text-amber-400">Fri</div>
                <div className="text-amber-400">Sat</div>
              </div>

              {/* Day Cells Grid */}
              <div className="grid grid-cols-7 divide-x divide-y theme-border">
                {monthDays.map((cell, idx) => {
                  const dayEvents = events.filter(
                    (e) => e.start_date <= cell.dateStr && e.end_date >= cell.dateStr
                  );
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = selectedDay === cell.dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedDay(cell.dateStr)}
                      className={`min-h-[90px] md:min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer ${
                        !cell.isCurrentMonth
                          ? 'opacity-30 bg-black/20'
                          : isToday
                          ? 'theme-bg-elevated/80 ring-1 ring-[var(--accent-main)]/40'
                          : 'hover:theme-bg-elevated/40'
                      } ${isSelected ? 'ring-2 ring-[var(--accent-main)]' : ''}`}
                    >
                      {/* Cell Header */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold font-mono inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday
                              ? 'theme-bg-accent theme-accent-text shadow-md'
                              : 'theme-text-primary'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {dayEvents.length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </div>

                      {/* Day Events Badges */}
                      <div className="space-y-1 my-1 overflow-y-auto max-h-[60px] scrollbar-none">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            style={{ borderLeftColor: ev.color_code || '#10b981' }}
                            className="text-[10px] truncate px-1.5 py-0.5 rounded theme-bg-sub border-l-2 font-medium theme-text-primary"
                            title={`${ev.title} (${ev.event_type_display})`}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] theme-text-secondary font-mono">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>

                      {/* Cell Bottom Indicator */}
                      <div className="text-[9px] theme-text-secondary flex justify-end">
                        {isToday && <span className="font-semibold text-emerald-400">Today</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda List View */
            <div className="rounded-3xl theme-bg-surface border theme-border p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-bold theme-text-primary">
                Upcoming Events & Holidays in {monthName}
              </h3>
              {events.length === 0 ? (
                <div className="p-8 text-center text-xs theme-text-secondary">
                  No scheduled events or holidays for this month.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl theme-bg-sub border theme-border flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          style={{ backgroundColor: `${ev.color_code}20`, borderColor: `${ev.color_code}40`, color: ev.color_code }}
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs border"
                        >
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold theme-text-primary">{ev.title}</div>
                          <div className="text-xs theme-text-secondary font-mono mt-0.5">
                            {ev.start_date} {ev.end_date !== ev.start_date ? `→ ${ev.end_date}` : ''} • ({ev.duration_days} Days)
                          </div>
                          {ev.description && (
                            <p className="text-xs theme-text-secondary mt-1">{ev.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-semibold theme-bg-surface border theme-border">
                          {ev.event_type_display}
                        </span>
                        <button
                          onClick={() => {
                            setEditingEvent(ev);
                            setIsEventModalOpen(true);
                          }}
                          className="p-1 rounded hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary cursor-pointer"
                        >
                          <EditIcon className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1 rounded hover:theme-bg-elevated theme-text-secondary hover:text-rose-400 cursor-pointer"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT PANEL: Institutional To-Do & Task Manager */}
        <div className="rounded-3xl theme-bg-surface border theme-border p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            {/* Side Panel Header */}
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <SparklesIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold theme-text-primary">Institutional Tasks</h3>
                  <p className="text-[11px] theme-text-secondary">
                    {pendingTaskCount} pending action item{pendingTaskCount === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="p-1.5 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs cursor-pointer"
                title="Add Task"
              >
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Task Inline Adder */}
            <form onSubmit={handleQuickTaskAdd} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Quick add new task..."
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl theme-bg-sub border theme-border theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
              />
              <button
                type="submit"
                disabled={isAddingQuickTask || !quickTaskTitle.trim()}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white shrink-0 cursor-pointer"
              >
                + Add
              </button>
            </form>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-semibold">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'HIGH', label: '🔥 High' },
                { id: 'COMPLETED', label: 'Done' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTaskFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    taskFilter === f.id
                      ? 'theme-bg-accent theme-accent-text shadow-sm'
                      : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Task Checklist Items */}
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-xs theme-text-secondary theme-bg-sub rounded-2xl border theme-border">
                No tasks in this view.
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                {filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-2xl theme-bg-sub border theme-border flex items-start justify-between gap-3 transition-all ${
                      t.is_completed ? 'opacity-50' : 'hover:theme-bg-elevated/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t.id)}
                        className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                          t.is_completed
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'theme-bg-surface theme-border hover:border-emerald-500'
                        }`}
                      >
                        {t.is_completed && <SleekCheckIcon className="w-3 h-3" />}
                      </button>

                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            t.is_completed
                              ? 'line-through theme-text-secondary'
                              : 'theme-text-primary'
                          }`}
                        >
                          {t.title}
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px] theme-text-secondary flex-wrap">
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono font-bold ${
                              t.priority === 'HIGH'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : t.priority === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'theme-bg-surface theme-text-secondary border theme-border'
                            }`}
                          >
                            {t.priority}
                          </span>

                          {t.due_date && (
                            <span className="flex items-center gap-1 font-mono">
                              <ClockIcon className="w-3 h-3" />
                              {t.due_date}
                            </span>
                          )}

                          {t.assigned_to_name && (
                            <span className="theme-text-primary font-medium">
                              @{t.assigned_to_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(t.id)}
                      className="p-1 rounded hover:theme-bg-elevated theme-text-secondary hover:text-rose-400 cursor-pointer shrink-0"
                      title="Delete Task"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t theme-border text-[11px] theme-text-secondary flex items-center justify-between">
            <span>SPR Calendar Ecosystem</span>
            <span className="font-mono">{new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isEventModalOpen && (
        <EventFormModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          eventData={editingEvent}
          initialDate={selectedDay}
          onSaved={() => loadData(true)}
        />
      )}

      {isTaskModalOpen && (
        <TaskFormModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          taskData={editingTask}
          initialDate={selectedDay}
          onSaved={() => loadData(true)}
        />
      )}
    </div>
  );
}
