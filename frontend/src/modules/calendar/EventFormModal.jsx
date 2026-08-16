import React, { useState, useEffect } from 'react';
import { CalendarIcon, CloseIcon } from '../../components/ui/Icons';
import { createCalendarEvent, updateCalendarEvent } from '../../api/calendar';
import { useToast } from '../../context/ToastContext';

export default function EventFormModal({ isOpen, onClose, eventData, onSaved, initialDate }) {
  const { showToast } = useToast();
  const isEditing = Boolean(eventData);

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_type: 'INSTITUTIONAL_HOLIDAY',
    start_date: initialDate || new Date().toISOString().split('T')[0],
    end_date: initialDate || new Date().toISOString().split('T')[0],
    affects_students: true,
    affects_staff: true,
    is_residential_active: false,
    color_code: '#10b981',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventData) {
      setForm({
        title: eventData.title || '',
        description: eventData.description || '',
        event_type: eventData.event_type || 'INSTITUTIONAL_HOLIDAY',
        start_date: eventData.start_date || new Date().toISOString().split('T')[0],
        end_date: eventData.end_date || new Date().toISOString().split('T')[0],
        affects_students: eventData.affects_students ?? true,
        affects_staff: eventData.affects_staff ?? true,
        is_residential_active: eventData.is_residential_active ?? false,
        color_code: eventData.color_code || '#10b981',
      });
    } else if (initialDate) {
      setForm((prev) => ({
        ...prev,
        start_date: initialDate,
        end_date: initialDate,
      }));
    }
  }, [eventData, initialDate, isOpen]);

  if (!isOpen) return null;

  const colorPresets = [
    { label: 'Emerald', hex: '#10b981' },
    { label: 'Sky Blue', hex: '#0284c7' },
    { label: 'Indigo', hex: '#6366f1' },
    { label: 'Amber', hex: '#f59e0b' },
    { label: 'Rose', hex: '#f43f5e' },
    { label: 'Purple', hex: '#a855f7' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Event/Holiday title is required.', 'error');
      return;
    }

    if (form.end_date < form.start_date) {
      showToast('End date cannot be earlier than start date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await updateCalendarEvent(eventData.id, form);
        showToast('Calendar event updated successfully!', 'success');
      } else {
        await createCalendarEvent(form);
        showToast('Calendar event / holiday created!', 'success');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving calendar event:', err);
      showToast(err.message || 'Failed to save calendar event', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-lg rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">
                {isEditing ? 'Edit Calendar Event' : 'Add Event / Holiday'}
              </h2>
              <p className="text-xs theme-text-secondary">
                Configure academic holidays, exam schedules, and institutional breaks
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Event / Holiday Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Eid-ul-Fitr Vacation, Annual Exam Week"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Event Classification
            </label>
            <select
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
            >
              <option value="INSTITUTIONAL_HOLIDAY">Institutional Holiday (Madrasa / School Off)</option>
              <option value="PUBLIC_HOLIDAY">National / Public Holiday</option>
              <option value="VACATION">Vacation / Semester Break</option>
              <option value="EXAM_PERIOD">Examination Period</option>
              <option value="SPECIAL_EVENT">Special Academic Event / Annual Program</option>
              <option value="TRAINING">Faculty / Staff Training Workshop</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Start Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                End Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>
          </div>

          {/* Color Code Picker */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
              Highlight Color Code
            </label>
            <div className="flex items-center gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setForm({ ...form, color_code: c.hex })}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    form.color_code === c.hex ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Scope Checkboxes */}
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border space-y-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.affects_students}
                onChange={(e) => setForm({ ...form, affects_students: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 theme-bg-surface theme-border"
              />
              <span className="text-xs theme-text-primary font-medium">
                Holiday applies to Student Attendance (Auto-soften roll call)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.affects_staff}
                onChange={(e) => setForm({ ...form, affects_staff: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 theme-bg-surface theme-border"
              />
              <span className="text-xs theme-text-primary font-medium">
                Holiday applies to Faculty & Staff Members
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_residential_active}
                onChange={(e) => setForm({ ...form, is_residential_active: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 theme-bg-surface theme-border"
              />
              <span className="text-xs theme-text-secondary font-medium">
                Residential Hifz/Boarding activities continue during this break
              </span>
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Additional institutional notice or instructions..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary resize-none"
            />
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Event' : 'Add to Calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
