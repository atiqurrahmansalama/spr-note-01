import React, { useState } from 'react';
import CustomInput from '../../components/ui/CustomInput';
import CustomTimePicker from '../../components/ui/CustomTimePicker';
import { FilledCheckCircleIcon } from '../../components/ui/Icons';
import { useToast } from '../../context/ToastContext';

const PRESET_TITLES = [
  'Night Dormitory Bed Check',
  'Morning Fajr Wakeup & Attendance',
  'Evening Maghrib Study Roll Call',
  'Afternoon Asr Checkpoint',
  'Midday Zuhr Attendance',
  'Dining Hall Meal Attendance',
  'Tahajjud & Early Morning Check',
  'Dormitory Cleaning & Inspection',
];

export default function CheckpointForm({
  editingCheckpoint,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: editingCheckpoint ? editingCheckpoint.name : '',
    time: editingCheckpoint ? editingCheckpoint.time || '22:00' : '22:00',
    effective_from: editingCheckpoint ? (editingCheckpoint.effective_from || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Please enter a checkpoint title', 'warning');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    let history = editingCheckpoint?.history_log ? [...editingCheckpoint.history_log] : [];

    if (editingCheckpoint) {
      const diffs = [];
      if (editingCheckpoint.name !== formData.name.trim()) {
        diffs.push(`Name changed: "${editingCheckpoint.name}" -> "${formData.name.trim()}"`);
      }
      if (editingCheckpoint.time !== formData.time) {
        diffs.push(`Time adjusted: ${editingCheckpoint.time} -> ${formData.time}`);
      }
      if (diffs.length > 0) {
        history.push({
          timestamp: new Date().toISOString(),
          action: 'MODIFIED',
          effective_date: formData.effective_from || todayStr,
          details: diffs.join('; '),
          diffs,
        });
      }
    } else {
      history = [{
        timestamp: new Date().toISOString(),
        action: 'CREATED',
        effective_date: formData.effective_from || todayStr,
        details: `Residential checkpoint "${formData.name.trim()}" created at ${formData.time}.`,
      }];
    }

    const checkpointData = editingCheckpoint
      ? {
          ...editingCheckpoint,
          name: formData.name.trim(),
          time: formData.time,
          effective_from: formData.effective_from || todayStr,
          history_log: history,
        }
      : {
          id: `chk_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          name: formData.name.trim(),
          time: formData.time,
          effective_from: formData.effective_from || todayStr,
          is_active: true,
          history_log: history,
        };

    onSaved?.(checkpointData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 text-xs theme-text-primary">
      {/* Quick Preset Chips */}
      <div>
        <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-2">
          Quick Suggestions:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_TITLES.map((title) => (
            <button
              key={title}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, name: title }))}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium border transition cursor-pointer ${
                formData.name === title
                  ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)] font-bold'
                  : 'theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      </div>

      {/* Checkpoint Name */}
      <div>
        <CustomInput
          label="Checkpoint Title"
          required
          placeholder="e.g. Night Dormitory Bed Check, Fajr Roll Call"
          value={formData.name}
          onChange={(val) => setFormData((prev) => ({ ...prev, name: val }))}
        />
      </div>

      {/* Time Picker */}
      <div>
        <CustomTimePicker
          label="Roll Call Scheduled Time"
          required
          value={formData.time}
          onChange={(val) => setFormData((prev) => ({ ...prev, time: val }))}
        />
      </div>

      {/* Effective From Date */}
      <div>
        <CustomInput
          type="date"
          label="Effective From Date"
          value={formData.effective_from}
          onChange={(val) => setFormData((prev) => ({ ...prev, effective_from: val }))}
          helperText="Date from which this checkpoint is active in the hostel routine"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 shadow-md cursor-pointer transition-all flex items-center gap-1.5"
        >
          <FilledCheckCircleIcon className="w-4 h-4 text-white" />
          <span>{editingCheckpoint ? 'Save Changes' : 'Add Checkpoint Row'}</span>
        </button>
      </div>
    </form>
  );
}
