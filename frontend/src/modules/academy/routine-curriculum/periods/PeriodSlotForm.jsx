import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../../../utils/authService';
import { useToast } from '../../../../context/ToastContext';
import { useTenant } from '../../../../context/TenantContext';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomTimePicker, { formatDisplayTime } from '../../../../components/ui/CustomTimePicker';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import AcademicScopePicker from '../../../../components/common/AcademicScopePicker';
import { createPeriodSlot, updatePeriodSlot } from '../../../../api/academy';
import { DrawerContainer, DrawerFooter } from '../../../../components/layout';
import {
  periodCategoriesStore,
  periodSequencesStore,
  academicYearsStore,
  getOrdinalPeriodLabel,
} from '../../../../utils/localStore';

export { getOrdinalPeriodLabel };

/**
 * Converts "HH:MM" (24h) string to total minutes from midnight.
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = String(timeStr).split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] intersect.
 */
function doPeriodsOverlap(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);

  if (eA <= sA || eB <= sB) return false;
  return sA < eB && eA > sB;
}

export default function PeriodSlotForm({
  editingSlot = null,
  defaultClassId = null,
  existingSlots: propExistingSlots = null,
  nextOrder = 1,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const isEdit = Boolean(editingSlot?.id);
  const sessionMinDate = useMemo(() => {
    const bounds = academicYearsStore.getDateBounds(activeTenantId);
    return bounds.minDate || '';
  }, [activeTenantId]);

  const [periodCategories, setPeriodCategories] = useState(() =>
    periodCategoriesStore.getCategories(activeTenantId)
  );

  const [periodSequences, setPeriodSequences] = useState(() =>
    periodSequencesStore.getSequences(activeTenantId)
  );

  const [internalSlots, setInternalSlots] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sectionScope, setSectionScope] = useState(() => {
    if (editingSlot?.section) return 'SPECIFIC';
    return 'ALL';
  });

  const [formData, setFormData] = useState({
    period_name: editingSlot?.period_name || '',
    slot_type: editingSlot?.slot_type || 'TEACHING_PERIOD',
    period_order: String(editingSlot?.period_order ?? nextOrder ?? 1),
    start_time: editingSlot?.start_time ? editingSlot.start_time.slice(0, 5) : '08:00',
    end_time: editingSlot?.end_time ? editingSlot.end_time.slice(0, 5) : '08:45',
    department: editingSlot?.department ? String(editingSlot.department) : '',
    student_class: editingSlot?.student_class
      ? String(editingSlot.student_class)
      : (defaultClassId ? String(defaultClassId) : ''),
    section: editingSlot?.section ? String(editingSlot.section) : '',
    effective_from: editingSlot?.effective_from || sessionMinDate,
  });

  const [durationMinutes, setDurationMinutes] = useState(45);

  useEffect(() => {
    const handleCategoriesUpdated = () => {
      setPeriodCategories(periodCategoriesStore.getCategories(activeTenantId));
    };
    const handleSequencesUpdated = () => {
      setPeriodSequences(periodSequencesStore.getSequences(activeTenantId));
    };

    window.addEventListener('spr_period_categories_updated', handleCategoriesUpdated);
    window.addEventListener('spr_period_sequences_updated', handleSequencesUpdated);

    return () => {
      window.removeEventListener('spr_period_categories_updated', handleCategoriesUpdated);
      window.removeEventListener('spr_period_sequences_updated', handleSequencesUpdated);
    };
  }, [activeTenantId]);

  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [deptRes, classRes, sectionRes, slotsRes] = await Promise.allSettled([
        fetchWithAuth('/api/v1/departments/'),
        fetchWithAuth('/api/v1/classes/'),
        fetchWithAuth('/api/v1/academy/sections/'),
        propExistingSlots ? Promise.resolve(null) : fetchWithAuth('/api/v1/academy/periods/'),
      ]);

      if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
        const d = await deptRes.value.json();
        setDepartments(Array.isArray(d) ? d : d.results || []);
      }
      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (sectionRes.status === 'fulfilled' && sectionRes.value.ok) {
        const s = await sectionRes.value.json();
        setSections(Array.isArray(s) ? s : s.results || []);
      }
      if (slotsRes.status === 'fulfilled' && slotsRes.value && slotsRes.value.ok) {
        const sl = await slotsRes.value.json();
        setInternalSlots(Array.isArray(sl) ? sl : sl.results || []);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoadingLookups(false);
    }
  }, [propExistingSlots]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // Synchronize slot_type, order and name when editingSlot changes
  useEffect(() => {
    if (editingSlot) {
      setFormData({
        period_name: editingSlot.period_name || '',
        slot_type: editingSlot.slot_type || 'TEACHING_PERIOD',
        period_order: String(editingSlot.period_order ?? 1),
        start_time: editingSlot.start_time ? editingSlot.start_time.slice(0, 5) : '08:00',
        end_time: editingSlot.end_time ? editingSlot.end_time.slice(0, 5) : '08:45',
        department: editingSlot.department ? String(editingSlot.department) : '',
        student_class: editingSlot.student_class ? String(editingSlot.student_class) : '',
        section: editingSlot.section ? String(editingSlot.section) : '',
        effective_from: editingSlot.effective_from || sessionMinDate,
      });
      setSectionScope(editingSlot.section ? 'SPECIFIC' : 'ALL');
    } else {
      const initialOrdinal = getOrdinalPeriodLabel(nextOrder ?? 1);
      setFormData((prev) => ({
        ...prev,
        period_name: `${initialOrdinal}: `,
        period_order: String(nextOrder ?? 1),
        student_class: defaultClassId ? String(defaultClassId) : prev.student_class,
        effective_from: prev.effective_from || sessionMinDate,
      }));
    }
  }, [editingSlot, defaultClassId, nextOrder, sessionMinDate]);

  // Recalculate duration in minutes
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const s = timeToMinutes(formData.start_time);
      const e = timeToMinutes(formData.end_time);
      if (e > s) {
        setDurationMinutes(e - s);
      } else {
        setDurationMinutes(0);
      }
    }
  }, [formData.start_time, formData.end_time]);

  // Dynamic slot types
  const slotTypeOptions = useMemo(() => {
    return periodCategories.map((c) => ({
      value: c.code,
      label: c.name,
      badge: c.badge || c.name,
    }));
  }, [periodCategories]);

  // Dynamic period sequences
  const periodOrderOptions = useMemo(() => {
    return periodSequences.map((seq) => ({
      value: String(seq.order),
      label: seq.label,
    }));
  }, [periodSequences]);

  const hasSectionsForClass = useMemo(() => {
    if (!formData.student_class) return false;
    return sections.some((s) => {
      const rawCls = s.student_class !== undefined ? s.student_class : s.class_id;
      const cId = typeof rawCls === 'object' ? String(rawCls.id || '') : String(rawCls);
      return cId === String(formData.student_class);
    });
  }, [sections, formData.student_class]);

  const isInvalidTimeRange = durationMinutes <= 0 && Boolean(formData.start_time && formData.end_time);

  // Overlap Detection
  const overlappingSlots = useMemo(() => {
    const allSlots = propExistingSlots || internalSlots;
    if (!formData.start_time || !formData.end_time || isInvalidTimeRange) return [];

    const currentSlotId = editingSlot?.id;
    const formClassId = String(formData.student_class || '');
    const formDeptId = String(formData.department || '');
    const formSecId = sectionScope === 'SPECIFIC' ? String(formData.section || '') : '';

    return allSlots.filter((slot) => {
      if (currentSlotId && String(slot.id) === String(currentSlotId)) return false;
      if (!slot.start_time || !slot.end_time) return false;
      if (slot.is_active === false) return false;

      // 1. Time overlap test
      const overlaps = doPeriodsOverlap(formData.start_time, formData.end_time, slot.start_time, slot.end_time);
      if (!overlaps) return false;

      // Extract slot's dept, class and section IDs
      const rawSlotDept = slot.department !== undefined ? slot.department : slot.department_id;
      const slotDeptId = rawSlotDept
        ? (typeof rawSlotDept === 'object' ? String(rawSlotDept.id || '') : String(rawSlotDept))
        : '';

      const rawSlotClass = slot.student_class !== undefined ? slot.student_class : slot.student_class_id;
      const slotClassId = rawSlotClass
        ? (typeof rawSlotClass === 'object' ? String(rawSlotClass.id || '') : String(rawSlotClass))
        : '';

      const rawSlotSec = slot.section !== undefined ? slot.section : slot.section_id;
      const slotSecId = rawSlotSec
        ? (typeof rawSlotSec === 'object' ? String(rawSlotSec.id || '') : String(rawSlotSec))
        : '';

      // If either is institution-wide, it occupies all scopes
      if (!slotDeptId && !slotClassId && !formDeptId && !formClassId) {
        return true;
      }
      if (!slotDeptId && !slotClassId) return true;
      if (!formDeptId && !formClassId) return true;

      // If departments are specified and different, no conflict
      if (slotDeptId && formDeptId && slotDeptId !== formDeptId) {
        return false;
      }

      // If classes are specified and different, no conflict
      if (slotClassId && formClassId && slotClassId !== formClassId) {
        return false;
      }

      // Same class:
      if (slotClassId && formClassId && slotClassId === formClassId) {
        if (!formSecId || !slotSecId) {
          return true;
        }
        return slotSecId === formSecId;
      }

      return true;
    });
  }, [
    formData.start_time,
    formData.end_time,
    formData.department,
    formData.student_class,
    formData.section,
    sectionScope,
    isInvalidTimeRange,
    propExistingSlots,
    internalSlots,
    editingSlot,
  ]);

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
    if (isInvalidTimeRange) {
      showToast('End time must be later than start time.', 'warning');
      return;
    }
    if (formData.student_class && sectionScope === 'SPECIFIC' && hasSectionsForClass && !formData.section) {
      showToast('Please select a specific section or choose "All Sections".', 'warning');
      return;
    }
    if (overlappingSlots.length > 0) {
      const firstConflict = overlappingSlots[0];
      const conflictClass = firstConflict.student_class_name || firstConflict.department_name || 'General Routine';
      const conflictSec = firstConflict.section_name ? ` (Section: ${firstConflict.section_name})` : '';
      showToast(
        `Time conflict: Overlaps with "${firstConflict.period_name}" in ${conflictClass}${conflictSec} (${firstConflict.start_time?.slice(0, 5)} - ${firstConflict.end_time?.slice(0, 5)}).`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    const selectedClassObj = classes.find((c) => String(c.id) === String(formData.student_class));
    const finalDepartment = formData.department || (selectedClassObj?.department ? String(selectedClassObj.department) : null);
    const finalSection = (formData.student_class && sectionScope === 'SPECIFIC' && formData.section)
      ? formData.section
      : null;

    const payload = {
      period_name: formData.period_name.trim(),
      slot_type: formData.slot_type,
      period_order: parseInt(formData.period_order, 10) || 1,
      start_time: formData.start_time,
      end_time: formData.end_time,
      effective_from: formData.effective_from || sessionMinDate,
      department: finalDepartment || null,
      student_class: formData.student_class || null,
      section: finalSection,
      branch: null,
      teacher: null,
      is_active: true,
    };

    try {
      if (isEdit) {
        await updatePeriodSlot(editingSlot.id, payload);
      } else {
        await createPeriodSlot(payload);
      }
      showToast(isEdit ? 'Period slot updated successfully.' : 'Period slot created successfully.', 'success');
      onSaved?.();
    } catch (err) {
      showToast(err.message || 'Failed to save period slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isSectionValid = !formData.student_class || !hasSectionsForClass || sectionScope !== 'SPECIFIC' || Boolean(formData.section);

  const isFormValid = Boolean(
    formData.period_name.trim() &&
    formData.start_time &&
    formData.end_time &&
    !isInvalidTimeRange &&
    isSectionValid &&
    overlappingSlots.length === 0
  );
  const canSave = isFormValid && !submitting;

  return (
    <DrawerContainer padding="none" spacing="compact">
      <form onSubmit={handleSubmit} className="@container space-y-4 @[480px]:space-y-4.5 text-left w-full pt-1">
        {/* Slot Name */}
        <div>
          <CustomInput
            label="Period Name"
            required
            placeholder="e.g. 1st Period: Hifz Revision, Tiffin Break, Zuhr Salah"
            value={formData.period_name}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, period_name: val }))
            }
          />
        </div>

        {/* Slot Category & Order (Container Responsive: 1 col if drawer < 480px, 2 cols if >= 480px) */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
          <div>
            <CustomSelect
              label="Period Category"
              options={slotTypeOptions}
              value={formData.slot_type}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, slot_type: val }))
              }
              placeholder="Select Slot Type"
            />
          </div>

          <div>
            <CustomSelect
              label="Period Sequence"
              options={periodOrderOptions}
              value={String(formData.period_order || '1')}
              onChange={(val) => {
                const num = parseInt(val, 10) || 1;
                const prevOrdinal = getOrdinalPeriodLabel(formData.period_order);
                const newOrdinal = getOrdinalPeriodLabel(num);
                let newName = formData.period_name;
                if (!newName || newName.trim() === '' || newName.startsWith(prevOrdinal)) {
                  newName = newName.startsWith(prevOrdinal)
                    ? newName.replace(prevOrdinal, newOrdinal)
                    : `${newOrdinal}: `;
                }
                setFormData((prev) => ({
                  ...prev,
                  period_order: String(num),
                  period_name: newName,
                }));
              }}
              placeholder="Select Period Number"
              required
            />
          </div>
        </div>

        {/* Start Time & End Time (Container Responsive: 1 col if drawer < 480px, 2 cols if >= 480px) */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
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
              rightElement={
                durationMinutes > 0 ? (
                  <span className="px-2 py-0.5 theme-bg-accent-soft theme-accent font-mono font-bold text-[10px] rounded-lg border border-[var(--accent-main)]/20 shadow-2xs">
                    {durationMinutes} Min
                  </span>
                ) : null
              }
              value={formData.end_time}
              onChange={(val) =>
                setFormData((prev) => ({ ...prev, end_time: val }))
              }
            />
          </div>
        </div>

        {/* Inline Small Conflict & Timing Warning Notices */}
        {overlappingSlots.length > 0 && (
          <div className="space-y-1.5 pt-0.5 animate-fade-in">
            {overlappingSlots.map((cSlot) => {
              const rawClass = cSlot.student_class !== undefined ? cSlot.student_class : cSlot.student_class_id;
              const classId = rawClass ? (typeof rawClass === 'object' ? String(rawClass.id || '') : String(rawClass)) : '';
              const targetClassName =
                cSlot.student_class_name ||
                (typeof rawClass === 'object' && rawClass?.name ? rawClass.name : null) ||
                classes.find((c) => String(c.id) === classId)?.name ||
                cSlot.department_name ||
                'General Routine (All Classes)';

              const rawSec = cSlot.section !== undefined ? cSlot.section : cSlot.section_id;
              const secId = rawSec ? (typeof rawSec === 'object' ? String(rawSec.id || '') : String(rawSec)) : '';
              const targetSecName =
                cSlot.section_name ||
                (typeof rawSec === 'object' && rawSec?.section_name ? rawSec.section_name : null) ||
                sections.find((s) => String(s.id) === secId)?.section_name;

              const scopeLabel = targetSecName
                ? `${targetClassName} (Section: ${targetSecName})`
                : (classId ? `${targetClassName} (All Sections)` : targetClassName);

              const slotStart = formatDisplayTime(cSlot.start_time ? cSlot.start_time.slice(0, 5) : '');
              const slotEnd = formatDisplayTime(cSlot.end_time ? cSlot.end_time.slice(0, 5) : '');

              return (
                <div
                  key={cSlot.id || `${cSlot.period_name}-${cSlot.start_time}`}
                  className="flex items-start gap-2 text-[11px] @[480px]:text-xs font-normal theme-text-secondary theme-bg-sub border theme-border px-3.5 py-2 rounded-xl leading-relaxed shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>
                    This time slot overlaps with <strong className="font-semibold text-rose-400">"{cSlot.period_name}"</strong> in <strong className="font-semibold text-rose-400">{scopeLabel}</strong> (<span className="font-semibold text-rose-400">{slotStart} – {slotEnd}</span>).
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isInvalidTimeRange && (
          <div className="flex items-center gap-2 text-[11px] @[480px]:text-xs font-normal theme-text-secondary theme-bg-sub border theme-border px-3.5 py-2 rounded-xl animate-fade-in shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>End time must be <strong className="font-semibold text-amber-500">later than start time</strong>.</span>
          </div>
        )}

        {/* Academic Scope: Department ➔ Class ➔ Section Scope */}
        <AcademicScopePicker
          departmentId={formData.department}
          onDepartmentChange={(val) => {
            const newDept = val || '';
            let nextClass = formData.student_class;
            if (newDept && nextClass) {
              const clsObj = classes.find((c) => String(c.id) === String(nextClass));
              const clsDept = clsObj?.department !== undefined ? clsObj.department : clsObj?.department_id;
              const deptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
              if (deptId !== String(newDept)) {
                nextClass = '';
              }
            }
            setFormData((prev) => ({
              ...prev,
              department: newDept,
              student_class: nextClass,
              section: nextClass ? prev.section : '',
            }));
            if (!nextClass) {
              setSectionScope('ALL');
            }
          }}
          classId={formData.student_class}
          onClassChange={(val) => {
            const newClassId = val === 'ALL' || !val ? '' : val;
            let nextDept = formData.department;
            if (newClassId) {
              const clsObj = classes.find((c) => String(c.id) === String(newClassId));
              const clsDept = clsObj?.department !== undefined ? clsObj.department : clsObj?.department_id;
              const deptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
              if (deptId && !nextDept) {
                nextDept = deptId;
              }
            }
            setFormData((prev) => ({
              ...prev,
              department: nextDept,
              student_class: newClassId,
              section: '',
            }));
            setSectionScope('ALL');
          }}
          sectionScope={sectionScope}
          onSectionScopeChange={setSectionScope}
          sectionId={formData.section}
          onSectionChange={(val) => {
            setFormData((prev) => ({ ...prev, section: val || '' }));
          }}
          departments={departments}
          classes={classes}
          sections={sections}
          requiredClass={false}
          showPeriod={false}
        />

        {/* Effective From Date (Temporal Validity Start via ReusableCalendar) */}
        <div>
          <ReusableCalendar
            label="Effective From Date"
            selectedDate={formData.effective_from || ''}
            onSelectDate={(val) =>
              setFormData((prev) => ({ ...prev, effective_from: val }))
            }
            placeholder="Select Effective Date"
          />
          <p className="text-[11px] theme-text-secondary mt-1.5 font-sans">
            Date from which this period schedule is active in the academic routine
          </p>
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
