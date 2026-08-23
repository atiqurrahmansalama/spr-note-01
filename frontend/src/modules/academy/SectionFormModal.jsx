import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { createSection, updateSection } from '../../api/academy';
import { CloseIcon, ClassIcon } from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomCheckbox from '../../components/ui/CustomCheckbox';

const SECTION_TYPES = [
  { label: 'General Academic Section', value: 'GENERAL_SECTION' },
  { label: 'Hifz Halqa / Circle', value: 'HIFZ_HALQA' },
  { label: 'Residential Dormitory', value: 'RESIDENTIAL_DORM' },
];

export default function SectionFormModal({
  isOpen,
  onClose,
  section = null,
  classes = [],
  branches = [],
  teachers = [],
  onSaved,
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(section?.id);

  const [formData, setFormData] = useState({
    student_class: '',
    branch: '',
    section_name: '',
    section_type: 'GENERAL_SECTION',
    room_number: '',
    max_capacity: 40,
    class_teacher: '',
    is_active: true,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (section) {
      setFormData({
        student_class: section.student_class || '',
        branch: section.branch || '',
        section_name: section.section_name || '',
        section_type: section.section_type || 'GENERAL_SECTION',
        room_number: section.room_number || '',
        max_capacity: section.max_capacity ?? 40,
        class_teacher: section.class_teacher || '',
        is_active: section.is_active ?? true,
      });
    } else {
      setFormData({
        student_class: classes[0]?.id || '',
        branch: branches[0]?.id || '',
        section_name: '',
        section_type: 'GENERAL_SECTION',
        room_number: '',
        max_capacity: 40,
        class_teacher: '',
        is_active: true,
      });
    }
  }, [section, classes, branches]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.student_class) {
      showToast('Please select a target Academic Class.', 'warning');
      return;
    }
    if (!formData.section_name.trim()) {
      showToast('Section name is required.', 'warning');
      return;
    }

    setSubmitting(true);
    const payload = {
      student_class: formData.student_class,
      branch: formData.branch || null,
      section_name: formData.section_name.trim(),
      section_type: formData.section_type,
      room_number: formData.room_number.trim(),
      max_capacity: parseInt(formData.max_capacity, 10) || 40,
      class_teacher: formData.class_teacher || null,
      is_active: formData.is_active,
    };

    try {
      if (isEdit) {
        await updateSection(section.id, payload);
        showToast('Section updated successfully.', 'success');
      } else {
        await createSection(payload);
        showToast('New section created successfully.', 'success');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save section.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const classOptions = classes.map((c) => ({
    label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
    value: String(c.id),
  }));

  const branchOptions = [
    { label: 'All Branches / Main Campus', value: '' },
    ...branches.map((b) => ({
      label: b.branch_name,
      value: String(b.id),
    })),
  ];

  const teacherOptions = [
    { label: '-- Unassigned Teacher --', value: '' },
    ...teachers.map((t) => ({
      label: `${t.name || t.first_name || 'Teacher'} (${t.phone_number || 'No Phone'})`,
      value: String(t.id),
    })),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-left">
      <div className="w-full max-w-lg theme-bg-surface border theme-border rounded-3xl p-6 shadow-2xl space-y-6 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft border theme-border flex items-center justify-center theme-accent">
              <ClassIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold theme-text-primary">
                {isEdit ? 'Edit Class Section' : 'Create Class Section / Halqa'}
              </h3>
              <p className="text-xs theme-text-secondary">
                Configure classroom sections, halqa divisions, and teacher assignments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Target Academic Class <span className="text-rose-400">*</span>
              </label>
              <CustomSelect
                options={classOptions}
                value={formData.student_class ? String(formData.student_class) : ''}
                onChange={(val) => setFormData({ ...formData, student_class: val })}
                placeholder="Select Academic Class"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Campus / Branch
              </label>
              <CustomSelect
                options={branchOptions}
                value={formData.branch ? String(formData.branch) : ''}
                onChange={(val) => setFormData({ ...formData, branch: val })}
                placeholder="Select Campus"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Section Format
              </label>
              <CustomSelect
                options={SECTION_TYPES}
                value={formData.section_type}
                onChange={(val) => setFormData({ ...formData, section_type: val })}
                placeholder="Section Format"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Section Name / Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Section A, Halqa-1, Boys Wing"
                value={formData.section_name}
                onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-medium theme-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Room Number
              </label>
              <input
                type="text"
                placeholder="e.g. Room 204"
                value={formData.room_number}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-mono theme-text-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Max Capacity
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={formData.max_capacity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_capacity: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full px-4 py-2.5 rounded-xl border theme-border theme-bg-sub focus:outline-none focus:border-[var(--accent-main)]/50 text-xs font-mono theme-text-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold theme-text-secondary uppercase tracking-wider mb-1.5">
                Class Teacher / Section In-Charge
              </label>
              <CustomSelect
                options={teacherOptions}
                value={formData.class_teacher ? String(formData.class_teacher) : ''}
                onChange={(val) => setFormData({ ...formData, class_teacher: val })}
                placeholder="Assign Ustadh / Faculty"
              />
            </div>
          </div>

          <div className="p-3 rounded-2xl theme-bg-sub border theme-border">
            <CustomCheckbox
              id="section-is-active"
              checked={formData.is_active}
              onChange={(checked) => setFormData({ ...formData, is_active: checked })}
              label="Active Section"
              description="Allows students to be enrolled into this section."
            />
          </div>

          <div className="pt-4 border-t theme-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary hover:theme-text-primary transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold theme-bg-accent theme-accent-text hover:opacity-90 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Section'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
