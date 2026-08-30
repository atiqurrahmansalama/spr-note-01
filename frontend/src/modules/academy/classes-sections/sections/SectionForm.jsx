import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { useTenant } from '../../../../context/TenantContext';
import { createSection, updateSection } from '../../../../api/academy';
import { fetchWithAuth } from '../../../../utils/authService';
import {
  ClassIcon,
  TeacherIcon,
  SectionIcon,
  GroupIcon,
} from '../../../../components/ui/Icons';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomInput from '../../../../components/ui/CustomInput';
import { TeacherSelect, ClassSelect } from '../../../../components/selectors';
import CustomCheckbox from '../../../../components/ui/CustomCheckbox';
import { DrawerContainer, DrawerFooter } from '../../../../components/layout';

/**
 * SectionForm Component
 * Enterprise right sidebar drawer form for creating and editing Academic Class Sections.
 * Adheres to zero hardcoded styling, container query responsiveness, and streamlined section layouts.
 */
export default function SectionForm({
  section = null,
  classes = [],
  teachers = [],
  defaultClassId = null,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const isEdit = Boolean(section?.id);

  const initialValues = useMemo(() => {
    if (section) {
      const knownGrpCount = Number(section.group_count) || 0;
      return {
        student_class: section.student_class ? String(section.student_class) : '',
        section_name: section.section_name || section.name || '',
        room_number: section.room_number || '',
        max_capacity: section.max_capacity ?? 40,
        class_teacher: section.class_teacher ? String(section.class_teacher) : '',
        has_groups: knownGrpCount > 0 ? true : (section.has_groups ?? true),
      };
    }
    return {
      student_class: defaultClassId ? String(defaultClassId) : (classes[0]?.id ? String(classes[0].id) : ''),
      section_name: '',
      room_number: '',
      max_capacity: 40,
      class_teacher: '',
      has_groups: true,
    };
  }, [section, defaultClassId, classes]);

  const [formData, setFormData] = useState(initialValues);
  const [classList, setClassList] = useState(classes);
  const [teacherList, setTeacherList] = useState(teachers);
  const [activeGroupCount, setActiveGroupCount] = useState(section?.group_count || 0);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData(initialValues);
    if (section?.id) {
      // Live check for active groups count under this section
      fetchWithAuth(`/api/v1/groups/?section=${section.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const list = Array.isArray(data) ? data : data.results || [];
            const gCount = list.length;
            setActiveGroupCount(gCount);
            if (gCount > 0) {
              setFormData((prev) => ({ ...prev, has_groups: true }));
            }
          }
        })
        .catch((err) => console.warn('Could not check live section groups count:', err));
    } else {
      setActiveGroupCount(0);
    }
  }, [initialValues, section?.id]);

  // Load lookups if not passed via props
  useEffect(() => {
    async function loadData() {
      if (classes.length > 0 && teachers.length > 0) return;
      setLoadingLookups(true);
      try {
        const [cRes, tRes] = await Promise.allSettled([
          classes.length === 0 ? fetchWithAuth('/api/v1/classes/?page_size=500&all=true') : Promise.resolve(null),
          teachers.length === 0 ? fetchWithAuth('/api/v1/users/') : Promise.resolve(null),
        ]);

        if (cRes.status === 'fulfilled' && cRes.value && cRes.value.ok) {
          const d = await cRes.value.json();
          const list = Array.isArray(d) ? d : d.results || [];
          setClassList(list.filter((c) => !c.is_deleted));
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
  }, [classes.length, teachers.length]);

  const handleGroupToggle = (checked) => {
    if (!checked && activeGroupCount > 0) {
      showToast(
        `Cannot disable groups because this section currently has ${activeGroupCount} active group(s). Delete or reassign groups first.`,
        'warning'
      );
      return;
    }
    setFormData((prev) => ({ ...prev, has_groups: checked }));
  };

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
      section_name: formData.section_name.trim(),
      section_type: 'GENERAL_SECTION',
      room_number: formData.room_number.trim(),
      max_capacity: parseInt(formData.max_capacity, 10) || 40,
      class_teacher: formData.class_teacher || null,
      has_groups: Boolean(activeGroupCount > 0 ? true : formData.has_groups),
      is_active: section?.is_active ?? true,
    };

    try {
      if (isEdit) {
        await updateSection(section.id, payload);
        showToast('Section updated successfully.', 'success');
      } else {
        await createSection(payload);
        showToast('New section created successfully.', 'success');
      }
      window.dispatchEvent(new CustomEvent('spr_section_updated'));
      onSaved?.();
    } catch (err) {
      const msg = err.response?.data?.has_groups?.[0] || err.message || 'Failed to save section.';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const eligibleClassList = useMemo(() => {
    return classList.filter((c) => c.has_sections !== false);
  }, [classList]);

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="@container space-y-6 pt-2 text-left">
        {eligibleClassList.length === 0 && (
          <div className="p-3 rounded-xl theme-bg-sub border theme-border text-xs theme-text-secondary">
            <p className="font-bold theme-text-primary">No Classes with Section Support</p>
            <p className="mt-0.5">
              Sections must belong to a class that has "Enable Section Divisions" turned on.
            </p>
          </div>
        )}

        {/* ─── 1. Section Information ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <SectionIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Section Information
            </h4>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <ClassSelect
                label="Target Class"
                value={formData.student_class}
                onChange={(val) => setFormData({ ...formData, student_class: val })}
                classes={eligibleClassList}
                allowAll={false}
                placeholder="Select Class (Required)..."
                icon={ClassIcon}
                required={true}
              />
            </div>

            <div>
              <CustomInput
                label="Section Name"
                required
                placeholder="e.g. Section A"
                value={formData.section_name}
                onChange={(val) => setFormData({ ...formData, section_name: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <CustomInput
                label="Room Number"
                optional
                placeholder="e.g. Room 204"
                value={formData.room_number}
                onChange={(val) => setFormData({ ...formData, room_number: val })}
              />
            </div>

            <div>
              <CustomInput
                type="number"
                label="Max Students"
                optional
                min={1}
                max={2000}
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
        </div>

        {/* ─── 2. Capacity & In-Charge ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <TeacherIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Capacity &amp; In-Charge
            </h4>
          </div>

          <div>
            <TeacherSelect
              label="Section In-Charge"
              value={formData.class_teacher}
              onChange={(val) => setFormData({ ...formData, class_teacher: val })}
              teachers={teacherList}
              allLabel="Unassigned"
              placeholder="Select Section In-Charge..."
              searchable={false}
              disabled={loadingLookups}
            />
          </div>
        </div>

        {/* ─── 3. Group Divisions Configuration ─── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <GroupIcon className="w-4 h-4 theme-accent" />
            <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Group Divisions
            </h4>
          </div>

          <div className="pt-1">
            <CustomCheckbox
              id="section_has_groups_toggle"
              checked={formData.has_groups}
              disabled={activeGroupCount > 0}
              onChange={handleGroupToggle}
              label={
                <span className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm theme-text-primary">Enable Group Divisions</span>
                  {activeGroupCount > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20">
                      {activeGroupCount} Group{activeGroupCount > 1 ? 's' : ''} Active
                    </span>
                  )}
                </span>
              }
              description={
                activeGroupCount > 0 ? (
                  <span>
                    This section has <strong className="theme-accent font-semibold">{activeGroupCount} active group(s)</strong>. To disable group divisions, delete or migrate all existing groups under this section first.
                  </span>
                ) : (
                  'Enable if students in this section will be divided into study groups, batches, or circles (e.g. Group A, Group B).'
                )
              }
            />
          </div>
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
