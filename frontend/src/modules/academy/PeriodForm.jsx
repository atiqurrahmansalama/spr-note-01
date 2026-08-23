import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import {
  TimerIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomTimePicker from '../../components/ui/CustomTimePicker';
import { createPeriodSlot, updatePeriodSlot } from '../../api/academy';

const SLOT_TYPES = [
  { label: 'Academic Teaching Period', value: 'TEACHING_PERIOD' },
  { label: 'Break / Tiffin Interval', value: 'BREAK_TIFFIN' },
  { label: 'Salah / Prayer Break', value: 'PRAYER_BREAK' },
  { label: 'Mutala / Self Study Session', value: 'MUTALA_SESSION' },
];

export default function PeriodForm({
  editingSlot = null,
  defaultDepartmentId = null,
  defaultClassId = null,
  nextOrder = 1,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(editingSlot?.id);

  const [formData, setFormData] = useState({
    period_name: '',
    slot_type: 'TEACHING_PERIOD',
    period_order: nextOrder,
    start_time: '08:00',
    end_time: '08:45',
    department: defaultDepartmentId || '',
    student_class: defaultClassId || '',
    teacher: '',
  });

  const [durationMinutes, setDurationMinutes] = useState(45);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Auto-calculate duration whenever start_time or end_time changes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      try {
        const [h1, m1] = formData.start_time.split(':').map(Number);
        const [h2, m2] = formData.end_time.split(':').map(Number);
        let mins1 = h1 * 60 + m1;
        let mins2 = h2 * 60 + m2;
        if (mins2 < mins1) {
          mins2 += 24 * 60; // overnight
        }
        const diff = mins2 - mins1;
        setDurationMinutes(diff > 0 ? diff : 0);
      } catch {
        setDurationMinutes(0);
      }
    }
  }, [formData.start_time, formData.end_time]);

  useEffect(() => {
    loadLookups();
    if (editingSlot) {
      setFormData({
        period_name: editingSlot.period_name || '',
        slot_type: editingSlot.slot_type || 'TEACHING_PERIOD',
        period_order: editingSlot.period_order ?? nextOrder,
        start_time: editingSlot.start_time ? editingSlot.start_time.slice(0, 5) : '08:00',
        end_time: editingSlot.end_time ? editingSlot.end_time.slice(0, 5) : '08:45',
        department: editingSlot.department || '',
        student_class: editingSlot.student_class || '',
        teacher: editingSlot.teacher || '',
      });
    } else {
      setFormData({
        period_name: '',
        slot_type: 'TEACHING_PERIOD',
        period_order: nextOrder,
        start_time: '08:00',
        end_time: '08:45',
        department: defaultDepartmentId || '',
        student_class: defaultClassId || '',
        teacher: '',
      });
    }
  }, [editingSlot, defaultDepartmentId, defaultClassId, nextOrder]);

  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const [deptRes, classRes, staffRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/departments/'),
        fetchWithAuth('/api/v1/classes/'),
        fetchWithAuth('/api/v1/staff/'),
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
        const d = await deptRes.value.json();
        setDepartments(Array.isArray(d) ? d : d.results || []);
      }
      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
        const d = await staffRes.value.json();
        setTeachers(Array.isArray(d) ? d : d.results || []);
      }
    } catch {
      // Lookups fail gracefully
    } finally {
      setLoadingLookups(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.period_name.trim()) {
      showToast('Period name is required.', 'warning');
      return;
    }
    if (!formData.start_time || !formData.end_time) {
      showToast('Start and end times are required.', 'warning');
      return;
    }

    setSubmitting(true);
    const payload = {
      period_name: formData.period_name.trim(),
      slot_type: formData.slot_type,
      period_order: parseInt(formData.period_order, 10) || 1,
      start_time: formData.start_time,
      end_time: formData.end_time,
      department: formData.department || null,
      student_class: formData.student_class || null,
      branch: null,
      teacher: formData.teacher || null,
      is_active: true,
    };

    try {
      if (isEdit) {
        await updatePeriodSlot(editingSlot.id, payload);
      } else {
        await createPeriodSlot(payload);
      }
      onSaved?.();
    } catch (err) {
      showToast(err.message || 'Failed to save period slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const deptOptions = [
    { label: 'All Departments', value: '' },
    ...departments.map((d) => ({
      label: d.name,
      value: String(d.id),
    })),
  ];

  const filteredClasses = formData.department
    ? classes.filter((c) => String(c.department) === String(formData.department))
    : classes;

  const classOptions = [
    { label: 'All Classes in Department', value: '' },
    ...filteredClasses.map((c) => ({
      label: `${c.name}${c.code ? ` (${c.code})` : ''}`,
      value: String(c.id),
    })),
  ];

  const teacherOptions = [
    { label: 'No Specific Teacher Assigned', value: '' },
    ...teachers.map((t) => ({
      label: `${t.user_name || t.employee_id || 'Teacher'} (${t.designation || 'Faculty'})`,
      value: String(t.id),
    })),
  ];

  return (
    <div className="p-4 sm:p-5 space-y-4 h-full overflow-y-auto theme-text-primary text-left">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Slot Name */}
        <div>
          <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
            Period Name <span className="theme-accent font-bold">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 1st Period: Hifz Revision, Tiffin Break, Zuhr Salah"
            value={formData.period_name}
            onChange={(e) =>
              setFormData({ ...formData, period_name: e.target.value })
            }
            className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-medium theme-text-primary placeholder-[var(--text-secondary)]/50 transition-all"
          />
        </div>

        {/* Slot Category & Order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Period Category
            </label>
            <CustomSelect
              options={SLOT_TYPES}
              value={formData.slot_type}
              onChange={(val) =>
                setFormData({ ...formData, slot_type: val })
              }
              placeholder="Select Slot Type"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Order
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.period_order}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  period_order: parseInt(e.target.value, 10) || 1,
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/60 text-xs font-mono theme-text-primary transition-all"
            />
          </div>
        </div>

        {/* Start Time & End Time (Custom Time Picker) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <CustomTimePicker
              label="Start Time"
              required
              value={formData.start_time}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, start_time: val }))
              }
            />
          </div>

          <div>
            <CustomTimePicker
              label="End Time"
              required
              value={formData.end_time}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, end_time: val }))
              }
            />
          </div>
        </div>

        {/* Calculated Slot Duration Display Chip */}
        <div className="theme-bg-sub border theme-border p-3.5 rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <TimerIcon className="w-4 h-4 theme-accent" />
            <span className="text-xs font-medium theme-text-secondary">Calculated Slot Duration:</span>
          </div>
          <span className="px-3 py-1 theme-bg-accent-soft theme-accent font-mono font-bold text-xs rounded-xl border border-[var(--accent-main)]/20 shadow-xs">
            {durationMinutes} Minutes
          </span>
        </div>

        {/* Department Scope */}
        <div>
          <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
            Target Department
          </label>
          <CustomSelect
            options={deptOptions}
            value={formData.department}
            onChange={(val) =>
              setFormData({ ...formData, department: val, student_class: '' })
            }
            placeholder="All Departments"
            disabled={loadingLookups}
          />
        </div>

        {/* Class & Assigned Teacher */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Target Class
            </label>
            <CustomSelect
              options={classOptions}
              value={formData.student_class}
              onChange={(val) =>
                setFormData({ ...formData, student_class: val })
              }
              placeholder="All Classes"
              disabled={loadingLookups}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
              Assigned Teacher (Optional)
            </label>
            <CustomSelect
              options={teacherOptions}
              value={formData.teacher}
              onChange={(val) =>
                setFormData({ ...formData, teacher: val })
              }
              placeholder="Select Teacher"
              disabled={loadingLookups}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t theme-border flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl theme-bg-sub border theme-border text-xs font-bold theme-text-primary hover:theme-bg-elevated transition cursor-pointer disabled:opacity-50 text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-2 text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-95 shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <SleekCheckIcon className="w-3.5 h-3.5" />
            )}
            <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Period Slot'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
