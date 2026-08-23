import React, { useState, useEffect } from 'react';
import {
  DutyIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/ui/Icons';
import { getStaffDuties, assignGeneralDuty, deleteGeneralDuty } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import CustomSelect from '../../components/ui/CustomSelect';

export default function GeneralDutyDrawerForm({ staff, onUpdated, onCancel }) {
  const { showToast } = useToast();

  const [duties, setDuties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New duty form
  const [form, setForm] = useState({
    duty_type: 'DORMITORY_SUPERVISION',
    title: '',
    description: '',
    assigned_day_of_week: 'ALL',
    start_time: '20:00',
    end_time: '23:00',
    location: '',
  });

  useEffect(() => {
    if (!staff) return;

    const loadDuties = async () => {
      setIsLoading(true);
      try {
        const res = await getStaffDuties({ staff: staff.id });
        setDuties(Array.isArray(res) ? res : res.results || []);
      } catch (err) {
        console.error('Failed to load duties:', err);
        showToast('Failed to load staff duties', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDuties();
  }, [staff, showToast]);

  const handleDutySubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Please provide a duty title or assignment name.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        staff: staff.id,
        duty_type: form.duty_type,
        title: form.title,
        description: form.description,
        assigned_day_of_week: form.assigned_day_of_week === 'ALL' ? null : form.assigned_day_of_week,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location,
      };

      await assignGeneralDuty(payload);
      showToast('General duty assigned successfully!', 'success');

      // Refresh duties
      const updated = await getStaffDuties({ staff: staff.id });
      setDuties(Array.isArray(updated) ? updated : updated.results || []);
      if (onUpdated) onUpdated();

      // Reset form title
      setForm((prev) => ({
        ...prev,
        title: '',
        description: '',
        location: '',
      }));
    } catch (err) {
      console.error('Failed to assign duty:', err);
      showToast(err.message || 'Failed to assign general duty', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDuty = async (dutyId) => {
    try {
      await deleteGeneralDuty(dutyId);
      showToast('Duty assignment removed.', 'success');
      setDuties((prev) => prev.filter((d) => d.id !== dutyId));
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to remove duty assignment', 'error');
    }
  };

  const dutyTypeOptions = [
    { value: 'DORMITORY_SUPERVISION', label: 'Dormitory & Residential Supervision' },
    { value: 'DINING_HALL', label: 'Dining Hall / Food Supervision' },
    { value: 'GATE_SECURITY', label: 'Gate & Campus Security' },
    { value: 'MOSQUE_SUPERVISION', label: 'Prayer / Mosque Supervision' },
    { value: 'CLEANING_HYGIENE', label: 'Cleaning & Hygiene Inspection' },
    { value: 'EVENT_COORDINATION', label: 'Event Coordination / Special Duty' },
  ];

  const dayOptions = [
    { value: 'ALL', label: 'Every Day (Daily Routine)' },
    { value: 'FRIDAY', label: 'Friday' },
    { value: 'SATURDAY', label: 'Saturday' },
    { value: 'SUNDAY', label: 'Sunday' },
    { value: 'MONDAY', label: 'Monday' },
    { value: 'TUESDAY', label: 'Tuesday' },
    { value: 'WEDNESDAY', label: 'Wednesday' },
    { value: 'THURSDAY', label: 'Thursday' },
  ];

  return (
    <div className="p-4 sm:p-5 space-y-5 h-full overflow-y-auto theme-text-primary text-left">
      {/* Staff Header Banner */}
      <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0">
          <DutyIcon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold theme-text-primary">
            {staff?.user_name || staff?.employee_id || 'Staff Member'}
          </h4>
          <p className="text-xs theme-text-secondary">
            {staff?.designation} • {staff?.department_name || 'Support Dept'}
          </p>
        </div>
      </div>

      {/* Add New Duty Form */}
      <form onSubmit={handleDutySubmit} className="space-y-4 p-4 rounded-2xl theme-bg-sub border theme-border">
        <div className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4 theme-accent" />
          <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Assign General / Residential Duty
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <CustomSelect
              label="Duty Category *"
              options={dutyTypeOptions}
              value={form.duty_type}
              onChange={(val) => setForm({ ...form, duty_type: val })}
              placeholder="Select Category"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Duty Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Night Dormitory Head Watch"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <CustomSelect
              label="Recurring Day"
              options={dayOptions}
              value={form.assigned_day_of_week}
              onChange={(val) => setForm({ ...form, assigned_day_of_week: val })}
              placeholder="Select Day"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Campus Location / Building
            </label>
            <input
              type="text"
              placeholder="e.g. Block B, 2nd Floor"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Start Time
            </label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              End Time
            </label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border theme-border theme-bg-surface text-xs font-medium theme-text-primary font-mono"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{isSubmitting ? 'Assigning...' : 'Assign Duty'}</span>
          </button>
        </div>
      </form>

      {/* Existing Duties List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
          Configured General Duties ({duties.length})
        </h4>

        {isLoading ? (
          <div className="p-4 text-center text-xs theme-text-secondary">
            Loading duties...
          </div>
        ) : duties.length === 0 ? (
          <div className="p-6 rounded-2xl theme-bg-sub border theme-border text-center text-xs theme-text-secondary">
            No general or residential duties currently configured for this staff.
          </div>
        ) : (
          <div className="space-y-2">
            {duties.map((duty) => (
              <div
                key={duty.id}
                className="p-3 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs theme-text-primary truncate">
                      {duty.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent font-medium">
                      {duty.duty_type_display || duty.duty_type}
                    </span>
                  </div>
                  <div className="text-[11px] theme-text-secondary mt-0.5">
                    {duty.assigned_day_of_week ? `${duty.assigned_day_of_week} • ` : 'Daily • '}
                    {duty.start_time ? `${duty.start_time} - ${duty.end_time}` : 'Full Day'}
                    {duty.location ? ` • ${duty.location}` : ''}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteDuty(duty.id)}
                  className="p-1.5 rounded-lg border theme-border hover:bg-rose-500/10 hover:text-rose-500 text-zinc-400 transition-colors cursor-pointer"
                  title="Remove Duty"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {onCancel && (
        <div className="pt-4 border-t theme-border flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
