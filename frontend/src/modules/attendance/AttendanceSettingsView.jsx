import React, { useState, useEffect, useCallback } from 'react';
import {
  SettingsIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  EditIcon,
  ClockIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import {
  getAttendanceSlots,
  deleteAttendanceSlot,
  getAttendancePolicy,
  updateAttendancePolicy,
} from '../../api/attendance';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import AttendanceSlotModal from './AttendanceSlotModal';

export default function AttendanceSettingsView() {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();

  // Policy Settings States
  const [policy, setPolicy] = useState({
    weekend_days: ['FRIDAY', 'SATURDAY'],
    default_mode: 'DAILY_SINGLE',
    default_late_cutoff_time: '08:30:00',
    auto_excuse_holidays: true,
    auto_notify_absent: false,
  });

  // Slots List State
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  // Load Policies and Slots
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [policyRes, slotsRes] = await Promise.all([
        getAttendancePolicy(),
        getAttendanceSlots({}),
      ]);

      if (policyRes) {
        setPolicy({
          weekend_days: policyRes.weekend_days || ['FRIDAY', 'SATURDAY'],
          default_mode: policyRes.default_mode || 'DAILY_SINGLE',
          default_late_cutoff_time: policyRes.default_late_cutoff_time || '08:30:00',
          auto_excuse_holidays: policyRes.auto_excuse_holidays ?? true,
          auto_notify_absent: policyRes.auto_notify_absent ?? false,
        });
      }

      setSlots(Array.isArray(slotsRes) ? slotsRes : slotsRes.results || []);
    } catch (err) {
      console.error('Error loading attendance settings:', err);
      showToast('Failed to load attendance settings', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData, activeTenantId]);

  // Weekend Day Toggle
  const toggleWeekendDay = (day) => {
    setPolicy((prev) => {
      const current = prev.weekend_days || [];
      const updated = current.includes(day)
        ? current.filter((d) => d !== day)
        : [...current, day];
      return { ...prev, weekend_days: updated };
    });
  };

  // Save Policy
  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    try {
      await updateAttendancePolicy(policy);
      showToast('Attendance policies updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating policy:', err);
      showToast(err.message || 'Failed to update attendance policies', 'error');
    } finally {
      setIsSavingPolicy(false);
    }
  };

  // Delete Slot
  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to deactivate this attendance slot?')) return;

    try {
      await deleteAttendanceSlot(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      showToast('Attendance slot deactivated.', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to delete slot', 'error');
    }
  };

  const allWeekdays = [
    { id: 'FRIDAY', label: 'Friday (Jummah)' },
    { id: 'SATURDAY', label: 'Saturday' },
    { id: 'SUNDAY', label: 'Sunday' },
    { id: 'THURSDAY', label: 'Thursday' },
    { id: 'MONDAY', label: 'Monday' },
    { id: 'TUESDAY', label: 'Tuesday' },
    { id: 'WEDNESDAY', label: 'Wednesday' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen theme-text-primary animate-fade-in select-none">
      {/* 1. Header Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-slate-500/10 text-slate-400 border border-slate-500/20 shadow-inner">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight theme-text-primary flex items-center gap-2">
                Attendance Policies & Period Slots
              </h1>
              <p className="text-xs theme-text-secondary">
                Configure institutional weekend days, late cutoffs, prayer roll calls, and custom class period slots
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => {
              setEditingSlot(null);
              setIsSlotModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Slot / Period</span>
          </button>
        </div>
      </div>

      {/* 2. Main Two Column Configuration Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Institutional Policies & Weekend Rule (1 Col on lg) */}
        <div className="rounded-3xl theme-bg-surface border theme-border p-5 space-y-5 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b theme-border pb-3">
              <h2 className="text-sm font-bold theme-text-primary">Institutional Attendance Policy</h2>
              <p className="text-[11px] theme-text-secondary">
                Global rules for weekend recognition and auto-excusing
              </p>
            </div>

            {/* Weekend Days Selector */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary mb-2">
                Official Weekend Days (Off-Days)
              </label>
              <div className="space-y-1.5">
                {allWeekdays.map((day) => {
                  const isChecked = policy.weekend_days.includes(day.id);
                  return (
                    <label
                      key={day.id}
                      onClick={() => toggleWeekendDay(day.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                          : 'theme-bg-sub border-transparent theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      <span>{day.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Default Attendance Tracking Mode */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary mb-1">
                Default Attendance Tracking Mode
              </label>
              <select
                value={policy.default_mode}
                onChange={(e) => setPolicy({ ...policy, default_mode: e.target.value })}
                className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              >
                <option value="DAILY_SINGLE">Daily Single Roll Call</option>
                <option value="PERIOD_WISE">Period-Wise Dynamic Roll Call</option>
                <option value="DUAL_SESSION_PRAYER">Morning + Evening / Prayer Dual Tracking</option>
              </select>
            </div>

            {/* Default Late Cutoff Time */}
            <div>
              <label className="block text-xs font-bold theme-text-secondary mb-1">
                Default Late Cutoff Time
              </label>
              <input
                type="time"
                value={policy.default_late_cutoff_time ? policy.default_late_cutoff_time.slice(0, 5) : '08:30'}
                onChange={(e) => setPolicy({ ...policy, default_late_cutoff_time: `${e.target.value}:00` })}
                className="w-full px-3 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary font-mono focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>

            {/* Checkbox Toggles */}
            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.auto_excuse_holidays}
                  onChange={(e) => setPolicy({ ...policy, auto_excuse_holidays: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs theme-text-primary font-medium">
                  Auto-excuse scheduled calendar holidays
                </span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={policy.auto_notify_absent}
                  onChange={(e) => setPolicy({ ...policy, auto_notify_absent: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs theme-text-primary font-medium">
                  Auto-queue guardian SMS notification on Unexcused Absence
                </span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t theme-border">
            <button
              onClick={handleSavePolicy}
              disabled={isSavingPolicy}
              className="w-full py-2.5 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <SleekCheckIcon className="w-4 h-4" />
              <span>{isSavingPolicy ? 'Saving Changes...' : 'Save Policies'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Dynamic Period & Session Slots List (2 Cols on lg) */}
        <div className="lg:col-span-2 rounded-3xl theme-bg-surface border theme-border p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <div>
              <h2 className="text-sm font-bold theme-text-primary">Configured Attendance Slots & Periods</h2>
              <p className="text-[11px] theme-text-secondary">
                Unlimited period slots per class or department (Fajr Sabaq, Period 1-8, Evening Dars)
              </p>
            </div>

            <button
              onClick={() => {
                setEditingSlot(null);
                setIsSlotModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              + Add Slot
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs theme-text-secondary flex flex-col items-center gap-3">
              <RefreshIcon className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Loading attendance slots...</span>
            </div>
          ) : slots.length === 0 ? (
            <div className="p-12 text-center text-xs theme-text-secondary theme-bg-sub rounded-2xl border theme-border">
              No custom attendance slots defined. The system will use the standard Daily Single Roll Call.
            </div>
          ) : (
            <div className="space-y-3">
              {slots.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl theme-bg-sub border theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold font-mono text-sm shrink-0">
                      #{s.order_rank}
                    </div>

                    <div>
                      <div className="text-sm font-bold theme-text-primary flex items-center gap-2">
                        <span>{s.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold theme-bg-surface border theme-border">
                          {s.slot_type_display}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs theme-text-secondary font-mono flex-wrap">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-indigo-400" />
                          {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                        </span>

                        {s.late_cutoff_time && (
                          <span className="text-amber-400">
                            Cutoff: {s.late_cutoff_time?.slice(0, 5)}
                          </span>
                        )}

                        {(s.department_name || s.class_name) && (
                          <span className="theme-text-primary font-medium">
                            Scope: {s.department_name || ''} {s.class_name ? `(${s.class_name})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => {
                        setEditingSlot(s);
                        setIsSlotModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary border theme-border cursor-pointer"
                      title="Edit Slot"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSlot(s.id)}
                      className="p-1.5 rounded-lg hover:theme-bg-elevated theme-text-secondary hover:text-rose-400 border theme-border cursor-pointer"
                      title="Delete Slot"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isSlotModalOpen && (
        <AttendanceSlotModal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          slotData={editingSlot}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
