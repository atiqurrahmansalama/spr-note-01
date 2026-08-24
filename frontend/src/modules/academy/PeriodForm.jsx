import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import {
  TimerIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import { ClassSelect, TeacherSelect } from '../../components/selectors';
import CustomTimePicker from '../../components/ui/CustomTimePicker';
import { createPeriodSlot, updatePeriodSlot } from '../../api/academy';
import { DrawerContainer, DrawerFooter } from '../../components/layout';

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

  // Determine if form has been modified
  const isDirty = Boolean(
    !editingSlot
      ? formData.period_name.trim() || formData.start_time !== '08:00' || formData.end_time !== '08:45'
      : formData.period_name !== (editingSlot.period_name || '') ||
        formData.slot_type !== (editingSlot.slot_type || 'TEACHING_PERIOD') ||
        formData.period_order !== (editingSlot.period_order ?? nextOrder) ||
        formData.start_time !== (editingSlot.start_time ? editingSlot.start_time.slice(0, 5) : '08:00') ||
        formData.end_time !== (editingSlot.end_time ? editingSlot.end_time.slice(0, 5) : '08:45') ||
        formData.department !== (editingSlot.department || '') ||
        formData.student_class !== (editingSlot.student_class || '') ||
        formData.teacher !== (editingSlot.teacher || '')
  );

  const isFormValid = Boolean(formData.period_name.trim() && formData.start_time && formData.end_time);
  const canSave = isDirty && isFormValid && !submitting;

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
        {/* Slot Name */}
        <div>
          <CustomInput
            label="Period Name"
            required
            placeholder="e.g. 1st Period: Hifz Revision, Tiffin Break, Zuhr Salah"
            value={formData.period_name}
            onChange={(val) =>
              setFormData({ ...formData, period_name: val })
            }
          />
        </div>

        {/* Slot Category & Order */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <CustomSelect
              label="Period Category"
              options={SLOT_TYPES}
              value={formData.slot_type}
              onChange={(val) =>
                setFormData({ ...formData, slot_type: val })
              }
              placeholder="Select Slot Type"
            />
          </div>

          <div>
            <CustomInput
              type="number"
              label="Order Rank"
              min={1}
              max={50}
              value={formData.period_order}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  period_order: parseInt(val, 10) || 1,
                })
              }
            />
          </div>
        </div>

        {/* Start Time & End Time (Custom Time Picker) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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
        <div className="theme-bg-sub border theme-border p-3.5 rounded-2xl flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <TimerIcon className="w-4 h-4 theme-accent" />
            <span className="text-xs font-medium theme-text-secondary">Calculated Slot Duration:</span>
          </div>
          <span className="px-3 py-1 theme-bg-accent-soft theme-accent font-mono font-bold text-xs rounded-xl border border-[var(--accent-main)]/20 shadow-2xs">
            {durationMinutes} Minutes
          </span>
        </div>

        {/* Department Scope */}
        <div>
          <CustomSelect
            label="Target Department"
            optional
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <ClassSelect
              label="Target Class"
              classes={filteredClasses}
              value={formData.student_class}
              onChange={(val) =>
                setFormData({ ...formData, student_class: val })
              }
              allowAll={true}
              allLabel="All Classes in Department"
              placeholder="All Classes"
              disabled={loadingLookups}
            />
          </div>

          <div>
            <TeacherSelect
              label="Assigned Teacher (Optional)"
              teachers={teachers}
              value={formData.teacher}
              onChange={(val) =>
                setFormData({ ...formData, teacher: val })
              }
              allowAll={true}
              allLabel="No Specific Teacher Assigned"
              placeholder="Select Teacher"
              disabled={loadingLookups}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={isEdit ? 'Save Changes' : 'Add Period Slot'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}
