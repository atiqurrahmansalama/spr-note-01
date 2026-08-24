import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useTenant } from '../../context/TenantContext';
import { createSection, updateSection, getBranches } from '../../api/academy';
import { fetchWithAuth } from '../../utils/authService';
import {
  ClassIcon,
  BuildingOfficeIcon,
  TeacherIcon,
  SparklesIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import { TeacherSelect, ClassSelect } from '../../components/selectors';
import CustomCheckbox from '../../components/ui/CustomCheckbox';
import { DrawerContainer, DrawerFooter } from '../../components/layout';

const SECTION_TYPES = [
  { label: 'General Academic Section', value: 'GENERAL_SECTION' },
  { label: 'Hifz Halqa / Circle', value: 'HIFZ_HALQA' },
  { label: 'Residential Dormitory', value: 'RESIDENTIAL_DORM' },
];

/**
 * SectionForm Component
 * Enterprise right sidebar drawer form for creating and editing Academic Class Sections.
 */
export default function SectionForm({
  section = null,
  classes = [],
  branches = [],
  teachers = [],
  defaultClassId = null,
  defaultBranchId = null,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const isEdit = Boolean(section?.id);

  const initialValues = useMemo(() => {
    if (section) {
      return {
        student_class: section.student_class || '',
        branch: section.branch || '',
        section_name: section.section_name || '',
        section_type: section.section_type || 'GENERAL_SECTION',
        room_number: section.room_number || '',
        max_capacity: section.max_capacity ?? 40,
        class_teacher: section.class_teacher || '',
        is_active: section.is_active ?? true,
      };
    }
    return {
      student_class: defaultClassId || (classes[0]?.id ? String(classes[0].id) : ''),
      branch: defaultBranchId || '',
      section_name: '',
      section_type: 'GENERAL_SECTION',
      room_number: '',
      max_capacity: 40,
      class_teacher: '',
      is_active: true,
    };
  }, [section, defaultClassId, defaultBranchId, classes]);

  const [formData, setFormData] = useState(initialValues);
  const [classList, setClassList] = useState(classes);
  const [branchList, setBranchList] = useState(branches);
  const [teacherList, setTeacherList] = useState(teachers);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
  }, [initialValues]);

  // Load lookups if not passed via props
  useEffect(() => {
    async function loadData() {
      if (classes.length > 0 && branches.length > 0 && teachers.length > 0) return;
      setLoadingLookups(true);
      try {
        const [cRes, bRes, tRes] = await Promise.allSettled([
          classes.length === 0 ? fetchWithAuth('/api/v1/classes/') : Promise.resolve(null),
          branches.length === 0 ? getBranches() : Promise.resolve(null),
          teachers.length === 0 ? fetchWithAuth('/api/v1/users/') : Promise.resolve(null),
        ]);

        if (cRes.status === 'fulfilled' && cRes.value && cRes.value.ok) {
          const d = await cRes.value.json();
          setClassList(Array.isArray(d) ? d : d.results || []);
        }
        if (bRes.status === 'fulfilled' && bRes.value) {
          const d = bRes.value;
          setBranchList(Array.isArray(d) ? d : d.results || []);
        }
        if (tRes.status === 'fulfilled' && tRes.value && tRes.value.ok) {
          const d = await tRes.value.json();
          const list = Array.isArray(d) ? d : d.results || [];
          setTeacherList(list.filter((u) => u.is_active && !u.is_deactivated));
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingLookups(false);
      }
    }
    loadData();
  }, [classes.length, branches.length, teachers.length]);

  // Dirty check
  const isDirty = useMemo(() => {
    return Object.keys(initialValues).some((key) => formData[key] !== initialValues[key]);
  }, [formData, initialValues]);

  const isValid = Boolean(formData.student_class && formData.section_name.trim());
  const canSave = isDirty && isValid && !submitting;

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
    } catch (err) {
      showToast(err.message || 'Failed to save section.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const branchOptions = [
    { label: 'All Branches / Main Campus (Institution-Wide)', value: '' },
    ...branchList.map((b) => ({
      label: `${b.branch_name} (${b.branch_type === 'MAIN_CAMPUS' ? 'Main Campus' : b.branch_type || 'Branch'})`,
      value: String(b.id),
    })),
  ];

  return (
    <DrawerContainer padding="normal" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 text-left">
        {classList.length === 0 && (
          <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border text-xs theme-text-secondary">
            <p className="font-bold theme-text-primary">No Academic Class Found</p>
            <p className="mt-0.5">
              Sections must belong to a Class. Please create a Class under Classes &amp; Groups first.
            </p>
          </div>
        )}

        {/* Target Academic Class */}
        <div>
          <ClassSelect
            label="Target Academic Class"
            value={formData.student_class}
            onChange={(val) => setFormData({ ...formData, student_class: val })}
            classes={classList}
            allowAll={false}
            placeholder="Select Academic Class (Required)..."
            icon={ClassIcon}
            required={true}
          />
        </div>

        {/* Campus / Branch Selector */}
        <div>
          <CustomSelect
            label="Campus / Branch"
            optional
            options={branchOptions}
            value={formData.branch ? String(formData.branch) : ''}
            onChange={(val) => setFormData({ ...formData, branch: val })}
            placeholder="Select Campus / Branch"
            icon={BuildingOfficeIcon}
          />
        </div>

        {/* Section Name & Section Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <CustomInput
              label="Section Name / Title"
              required
              placeholder="e.g. Section A, Halqa-1, Boys Wing"
              value={formData.section_name}
              onChange={(val) => setFormData({ ...formData, section_name: val })}
            />
          </div>

          <div>
            <CustomSelect
              label="Section Format"
              options={SECTION_TYPES}
              value={formData.section_type}
              onChange={(val) => setFormData({ ...formData, section_type: val })}
              placeholder="Select Section Format"
            />
          </div>
        </div>

        {/* Room Number & Maximum Capacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <CustomInput
              label="Room Number / Hall"
              optional
              placeholder="e.g. Room 204, 3rd Floor"
              value={formData.room_number}
              onChange={(val) => setFormData({ ...formData, room_number: val })}
            />
          </div>

          <div>
            <CustomInput
              type="number"
              label="Max Student Capacity"
              min={1}
              max={500}
              value={formData.max_capacity}
              onChange={(val) =>
                setFormData({
                  ...formData,
                  max_capacity: parseInt(val, 10) || 1,
                })
              }
            />
          </div>
        </div>

        {/* Section In-Charge Teacher */}
        <div>
          <TeacherSelect
            label="Section Teacher / In-Charge Ustadh"
            value={formData.class_teacher}
            onChange={(val) => setFormData({ ...formData, class_teacher: val })}
            teachers={teacherList}
            allowAll={true}
            allLabel="Unassigned / No Teacher Assigned"
            placeholder="Select Section In-Charge..."
            searchable={true}
            disabled={loadingLookups}
          />
        </div>

        {/* Operational Status */}
        <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border">
          <CustomCheckbox
            id="section_is_active_check"
            checked={formData.is_active}
            onChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked }))}
            label="Section Active & Operational"
            description="Allows students to be enrolled, scheduled and assigned to this section."
          />
        </div>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          isSubmitting={submitting}
          isSaveDisabled={!canSave}
          saveLabel={isEdit ? 'Save Changes' : 'Create Section'}
          onSubmit={true}
        />
      </form>
    </DrawerContainer>
  );
}
