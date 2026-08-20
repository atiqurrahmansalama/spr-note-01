import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/authService';
import { useToast } from '../../context/ToastContext';
import {
  ClassIcon,
  BuildingOfficeIcon,
  TeacherIcon,
  StudentIcon,
} from '../../components/ui/Icons';
import Modal from '../../components/ui/Modal';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomCheckbox from '../../components/ui/CustomCheckbox';
import { createSection, updateSection } from '../../api/academy';

const SECTION_TYPES = [
  { label: 'General Academic Section', value: 'GENERAL_SECTION' },
  { label: 'Hifz Halqa / Quran Circle', value: 'HIFZ_HALQA' },
  { label: 'Residential Dorm / Boarding', value: 'RESIDENTIAL_DORM' },
];

export default function SectionFormModal({
  isOpen,
  onClose,
  editingSection,
  defaultClassId = null,
  defaultBranchId = null,
  onSuccess,
}) {
  const { showToast } = useToast();

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

  const [classes, setClasses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLookups();
      if (editingSection) {
        setFormData({
          student_class: editingSection.student_class || '',
          branch: editingSection.branch || '',
          section_name: editingSection.section_name || '',
          section_type: editingSection.section_type || 'GENERAL_SECTION',
          room_number: editingSection.room_number || '',
          max_capacity: editingSection.max_capacity || 40,
          class_teacher: editingSection.class_teacher || '',
          is_active: editingSection.is_active ?? true,
        });
      } else {
        setFormData({
          student_class: defaultClassId || '',
          branch: defaultBranchId || '',
          section_name: '',
          section_type: 'GENERAL_SECTION',
          room_number: '',
          max_capacity: 40,
          class_teacher: '',
          is_active: true,
        });
      }
    }
  }, [isOpen, editingSection, defaultClassId, defaultBranchId]);

  const loadLookups = async () => {
    setLoadingLookups(true);
    try {
      const [classRes, branchRes, staffRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/classes/'),
        fetchWithAuth('/api/v1/academy/branches/'),
        fetchWithAuth('/api/v1/staff/'),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (branchRes.status === 'fulfilled' && branchRes.value.ok) {
        const d = await branchRes.value.json();
        setBranches(Array.isArray(d) ? d : d.results || []);
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
    if (!formData.student_class) {
      showToast('Class assignment is required.', 'warning');
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
      if (editingSection) {
        await updateSection(editingSection.id, payload);
        showToast('Section updated successfully.', 'success');
      } else {
        await createSection(payload);
        showToast('Section created successfully.', 'success');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to save section.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const classOptions = [
    { label: 'Select Academic Class', value: '' },
    ...classes.map((c) => ({
      label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
      value: c.id,
    })),
  ];

  const branchOptions = [
    { label: 'Main / Unassigned Campus', value: '' },
    ...branches.map((b) => ({
      label: `${b.branch_name} ${b.branch_code ? `(${b.branch_code})` : ''}`,
      value: b.id,
    })),
  ];

  const teacherOptions = [
    { label: 'None (Unassigned Ustadh / Teacher)', value: '' },
    ...teachers.map((t) => ({
      label: `${t.user_name || t.employee_id || 'Teacher'} - ${t.designation || 'Faculty'}`,
      value: t.id,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSection ? 'Edit Class Section / Halqa' : 'Add Class Section / Halqa'}
      subtitle="Configure section capacity, room assignment, and class teacher."
      icon={ClassIcon}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Academic Class <span className="text-rose-500">*</span>
            </label>
            <CustomSelect
              options={classOptions}
              value={formData.student_class}
              onChange={(val) =>
                setFormData({ ...formData, student_class: val })
              }
              placeholder="Assign to Class"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Campus / Branch
            </label>
            <CustomSelect
              options={branchOptions}
              value={formData.branch}
              onChange={(val) =>
                setFormData({ ...formData, branch: val })
              }
              placeholder="Select Branch"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Section Type
            </label>
            <CustomSelect
              options={SECTION_TYPES}
              value={formData.section_type}
              onChange={(val) =>
                setFormData({ ...formData, section_type: val })
              }
              placeholder="Section Format"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Section Name / Code <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Section A, Halqa-1, Boys Wing"
              value={formData.section_name}
              onChange={(e) =>
                setFormData({ ...formData, section_name: e.target.value })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Room / Location Number
            </label>
            <input
              type="text"
              placeholder="e.g. Room 204, 3rd Floor"
              value={formData.room_number}
              onChange={(e) =>
                setFormData({ ...formData, room_number: e.target.value })
              }
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Max Student Capacity
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
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-all outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Class Teacher / Section In-Charge
            </label>
            <CustomSelect
              options={teacherOptions}
              value={formData.class_teacher}
              onChange={(val) =>
                setFormData({ ...formData, class_teacher: val })
              }
              placeholder="Assign Ustadh / Faculty"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
          <CustomCheckbox
            id="section-is-active"
            checked={formData.is_active}
            onChange={(checked) =>
              setFormData({ ...formData, is_active: checked })
            }
            label="Active Section"
            description="Allows students to be enrolled into this section."
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {editingSection ? 'Save Section' : 'Create Section'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
