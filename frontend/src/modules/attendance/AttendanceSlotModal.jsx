import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon, ClockIcon } from '../../components/ui/Icons';
import { createAttendanceSlot, updateAttendanceSlot } from '../../api/attendance';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';

export default function AttendanceSlotModal({ isOpen, onClose, slotData, onSaved }) {
  const { showToast } = useToast();
  const isEditing = Boolean(slotData);

  const [form, setForm] = useState({
    name: '',
    slot_type: 'DAILY_GENERAL',
    department: '',
    student_class: '',
    start_time: '08:00',
    end_time: '14:00',
    late_cutoff_time: '08:30',
    order_rank: 1,
  });

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMetadata = async () => {
      try {
        const [deptRes, clsRes] = await Promise.all([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/classes/'),
        ]);

        if (deptRes.ok) {
          const dData = await deptRes.json();
          setDepartments(Array.isArray(dData) ? dData : dData.results || []);
        }
        if (clsRes.ok) {
          const cData = await clsRes.json();
          setClasses(Array.isArray(cData) ? cData : cData.results || []);
        }
      } catch (err) {
        console.warn('Error fetching departments/classes for slot:', err);
      }
    };

    fetchMetadata();
  }, [isOpen]);

  useEffect(() => {
    if (slotData) {
      setForm({
        name: slotData.name || '',
        slot_type: slotData.slot_type || 'DAILY_GENERAL',
        department: slotData.department || '',
        student_class: slotData.student_class || '',
        start_time: slotData.start_time ? slotData.start_time.slice(0, 5) : '08:00',
        end_time: slotData.end_time ? slotData.end_time.slice(0, 5) : '14:00',
        late_cutoff_time: slotData.late_cutoff_time ? slotData.late_cutoff_time.slice(0, 5) : '08:30',
        order_rank: slotData.order_rank ?? 1,
      });
    } else {
      setForm({
        name: '',
        slot_type: 'DAILY_GENERAL',
        department: '',
        student_class: '',
        start_time: '08:00',
        end_time: '14:00',
        late_cutoff_time: '08:30',
        order_rank: 1,
      });
    }
  }, [slotData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Slot name is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        slot_type: form.slot_type,
        department: form.department || null,
        student_class: form.student_class ? Number(form.student_class) : null,
        start_time: form.start_time ? `${form.start_time}:00` : null,
        end_time: form.end_time ? `${form.end_time}:00` : null,
        late_cutoff_time: form.late_cutoff_time ? `${form.late_cutoff_time}:00` : null,
        order_rank: Number(form.order_rank) || 1,
      };

      if (isEditing) {
        await updateAttendanceSlot(slotData.id, payload);
        showToast('Attendance slot updated successfully!', 'success');
      } else {
        await createAttendanceSlot(payload);
        showToast('New attendance slot created!', 'success');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving slot:', err);
      showToast(err.message || 'Failed to save attendance slot', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner">
              <ClockIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">
                {isEditing ? 'Edit Attendance Slot' : 'Add New Attendance Slot'}
              </h2>
              <p className="text-xs theme-text-secondary">
                Configure roll-call timing, prayer slots, or class periods
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Slot Name */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Slot / Period Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Fajr Sabaq Roll Call, 1st Period, Daily General"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
            />
          </div>

          {/* Slot Type */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Slot Classification
            </label>
            <select
              value={form.slot_type}
              onChange={(e) => setForm({ ...form, slot_type: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
            >
              <option value="DAILY_GENERAL">Daily General Roll Call</option>
              <option value="PERIOD">Class Academic Period (1st, 2nd, etc.)</option>
              <option value="RESIDENTIAL_PRAYER">Residential / Boarding Prayer (Fajr/Maghrib)</option>
              <option value="EVENING_COACHING">Evening Coaching / Night Sabaq</option>
              <option value="SPECIAL_PROGRAM">Special Extra-Curricular Program</option>
            </select>
          </div>

          {/* Department & Class Scoping */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Department Scope
              </label>
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              >
                <option value="">-- All Departments --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Class Scope
              </label>
              <select
                value={form.student_class}
                onChange={(e) => setForm({ ...form, student_class: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              >
                <option value="">-- All Classes --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Timings: Start Time & End Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                End Time
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>
          </div>

          {/* Late Cutoff & Order Rank */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Late Cutoff Time
              </label>
              <input
                type="time"
                value={form.late_cutoff_time}
                onChange={(e) => setForm({ ...form, late_cutoff_time: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Display Order Rank
              </label>
              <input
                type="number"
                min={1}
                value={form.order_rank}
                onChange={(e) => setForm({ ...form, order_rank: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t theme-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Slot' : 'Create Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
