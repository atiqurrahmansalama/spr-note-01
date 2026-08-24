import React, { useState, useEffect } from 'react';
import {
  DutyIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/ui/Icons';
import { getStaffDuties, assignGeneralDuty, deleteGeneralDuty } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import { DrawerContainer, DrawerBanner, DrawerSection, DrawerFooter } from '../../components/layout';

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
    <DrawerContainer padding="normal" spacing="normal">
      {/* Staff Header Banner */}
      <DrawerBanner
        icon={DutyIcon}
        title={staff?.user_name || staff?.employee_id || 'Staff Member'}
        subtitle={`${staff?.designation || 'Staff'} • ${staff?.department_name || 'Support Dept'}`}
      />

      {/* Add New Duty Form */}
      <form onSubmit={handleDutySubmit}>
        <DrawerSection title="Assign General / Residential Duty" icon={PlusIcon}>
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
            <CustomInput
              label="Duty Title"
              required
              placeholder="e.g. Night Dormitory Head Watch"
              value={form.title}
              onChange={(val) => setForm({ ...form, title: val })}
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
            <CustomInput
              label="Campus Location / Building"
              optional
              placeholder="e.g. Block B, 2nd Floor"
              value={form.location}
              onChange={(val) => setForm({ ...form, location: val })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <CustomInput
              type="time"
              label="Start Time"
              value={form.start_time}
              onChange={(val) => setForm({ ...form, start_time: val })}
            />
          </div>

          <div>
            <CustomInput
              type="time"
              label="End Time"
              value={form.end_time}
              onChange={(val) => setForm({ ...form, end_time: val })}
            />
          </div>
        </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Assigning...' : 'Assign Duty'}</span>
            </button>
          </div>
        </DrawerSection>
      </form>

      {/* Existing Duties List */}
      <DrawerSection
        title="Active Scheduled Duties"
        icon={DutyIcon}
        badge={String(duties.length)}
      >

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
      </DrawerSection>

      {onCancel && (
        <DrawerFooter onCancel={onCancel} cancelLabel="Close" />
      )}
    </DrawerContainer>
  );
}
