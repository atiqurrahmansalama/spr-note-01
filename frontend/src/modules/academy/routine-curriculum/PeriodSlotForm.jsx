import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchWithAuth } from '../../../utils/authService';
import { useToast } from '../../../context/ToastContext';
import { useTenant } from '../../../context/TenantContext';
import CustomSelect from '../../../components/ui/CustomSelect';
import CustomInput from '../../../components/ui/CustomInput';
import { ClassSelect } from '../../../components/selectors';
import CustomTimePicker, { formatDisplayTime } from '../../../components/ui/CustomTimePicker';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { createPeriodSlot, updatePeriodSlot, getPeriodSlots } from '../../../api/academy';
import { DrawerContainer, DrawerFooter } from '../../../components/layout';
import {
  periodCategoriesStore,
  periodSequencesStore,
  academicYearsStore,
  getOrdinalPeriodLabel,
} from '../../../utils/localStore';

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

  const periodOrderOptions = useMemo(() => {
    if (!periodSequences || periodSequences.length === 0) {
      return periodSequencesStore.getOptions(activeTenantId);
    }
    return periodSequences
      .filter((s) => s.is_active !== false)
      .map((s) => ({
        value: String(s.order),
        label: s.name || s.badge || s.label || getOrdinalPeriodLabel(s.order),
        description: s.description || '',
        order: s.order,
      }));
  }, [periodSequences, activeTenantId]);

  const slotTypeOptions = useMemo(() => {
    return (periodCategories || []).map((c) => ({
      label: c.name || c.badge,
      value: c.code || c.id,
      description: c.description,
    }));
  }, [periodCategories]);

  const [formData, setFormData] = useState({
    period_name: '',
    slot_type: 'TEACHING_PERIOD',
    period_order: String(nextOrder || 1),
    start_time: '08:00',
    end_time: '08:45',
    student_class: defaultClassId || '',
    effective_from: sessionMinDate,
  });

  const [durationMinutes, setDurationMinutes] = useState(45);
  const [classes, setClasses] = useState([]);
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

  const loadLookups = useCallback(async () => {
    setLoadingLookups(true);
    try {
      const [classRes, slotsData] = await Promise.allSettled([
        fetchWithAuth('/api/v1/classes/'),
        getPeriodSlots(),
      ]);

      if (classRes.status === 'fulfilled' && classRes.value.ok) {
        const d = await classRes.value.json();
        setClasses(Array.isArray(d) ? d : d.results || []);
      }
      if (slotsData.status === 'fulfilled') {
        const sList = Array.isArray(slotsData.value) ? slotsData.value : slotsData.value?.results || [];
        setInternalSlots(sList);
      }
    } catch {
      // Lookups fail gracefully
    } finally {
      setLoadingLookups(false);
    }
  }, []);

  useEffect(() => {
    loadLookups();
    if (editingSlot) {
      setFormData({
        period_name: editingSlot.period_name || '',
        slot_type: editingSlot.slot_type || 'TEACHING_PERIOD',
        period_order: editingSlot.period_order ?? nextOrder,
        start_time: editingSlot.start_time ? editingSlot.start_time.slice(0, 5) : '08:00',
        end_time: editingSlot.end_time ? editingSlot.end_time.slice(0, 5) : '08:45',
        student_class: editingSlot.student_class || '',
        effective_from: editingSlot.effective_from || sessionMinDate,
      });
    } else {
      setFormData({
        period_name: '',
        slot_type: 'TEACHING_PERIOD',
        period_order: nextOrder,
        start_time: '08:00',
        end_time: '08:45',
        student_class: defaultClassId || '',
        effective_from: sessionMinDate,
      });
    }
  }, [loadLookups, editingSlot, defaultClassId, nextOrder, sessionMinDate]);

  // ─── Time Range Validation & Overlap Guard ─────────────────────────
  const isInvalidTimeRange = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return false;
    const s = timeToMinutes(formData.start_time);
    const e = timeToMinutes(formData.end_time);
    return e <= s;
  }, [formData.start_time, formData.end_time]);

  const overlappingSlots = useMemo(() => {
    if (!formData.start_time || !formData.end_time) return [];
    const sMinutes = timeToMinutes(formData.start_time);
    const eMinutes = timeToMinutes(formData.end_time);
    if (eMinutes <= sMinutes) return [];

    const allSlots = (internalSlots && internalSlots.length > 0)
      ? internalSlots
      : (Array.isArray(propExistingSlots) && propExistingSlots.length > 0 ? propExistingSlots : []);
    const currentSlotId = editingSlot?.id;

    return allSlots.filter((slot) => {
      if (currentSlotId && String(slot.id) === String(currentSlotId)) return false;
      if (!slot.start_time || !slot.end_time) return false;
      if (slot.is_active === false) return false;

      // Extract class ID robustly
      const rawSlotClass = slot.student_class !== undefined ? slot.student_class : slot.student_class_id;
      const slotClass = rawSlotClass
        ? (typeof rawSlotClass === 'object' ? String(rawSlotClass.id || '') : String(rawSlotClass))
        : '';
      const formClass = formData.student_class ? String(formData.student_class) : '';

      // Check class overlap: general routine matches any class, or specific class matches
      const classMatch = !slotClass || !formClass || slotClass === formClass;
      if (!classMatch) return false;

      return doPeriodsOverlap(formData.start_time, formData.end_time, slot.start_time, slot.end_time);
    });
  }, [formData.start_time, formData.end_time, formData.student_class, propExistingSlots, internalSlots, editingSlot]);

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
    if (overlappingSlots.length > 0) {
      const firstConflict = overlappingSlots[0];
      showToast(
        `Time conflict: Overlaps with "${firstConflict.period_name}" (${firstConflict.start_time?.slice(0, 5)} - ${firstConflict.end_time?.slice(0, 5)}).`,
        'error'
      );
      return;
    }

    setSubmitting(true);
    const selectedClassObj = classes.find((c) => String(c.id) === String(formData.student_class));
    const finalDepartment = selectedClassObj?.department ? String(selectedClassObj.department) : null;

    const payload = {
      period_name: formData.period_name.trim(),
      slot_type: formData.slot_type,
      period_order: parseInt(formData.period_order, 10) || 1,
      start_time: formData.start_time,
      end_time: formData.end_time,
      effective_from: formData.effective_from || sessionMinDate,
      department: finalDepartment,
      student_class: formData.student_class || null,
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
      onSaved?.();
    } catch (err) {
      showToast(err.message || 'Failed to save period slot.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Determine if form has been modified
  const isDirty = Boolean(
    !editingSlot
      ? formData.period_name.trim() || formData.start_time !== '08:00' || formData.end_time !== '08:45'
      : formData.period_name !== (editingSlot.period_name || '') ||
        formData.slot_type !== (editingSlot.slot_type || 'TEACHING_PERIOD') ||
        formData.period_order !== (editingSlot.period_order ?? nextOrder) ||
        formData.start_time !== (editingSlot.start_time ? editingSlot.start_time.slice(0, 5) : '08:00') ||
        formData.end_time !== (editingSlot.end_time ? editingSlot.end_time.slice(0, 5) : '08:45') ||
        formData.student_class !== (editingSlot.student_class || '') ||
        formData.effective_from !== (editingSlot.effective_from || sessionMinDate)
  );

  const isFormValid = Boolean(
    formData.period_name.trim() &&
    formData.start_time &&
    formData.end_time &&
    !isInvalidTimeRange &&
    overlappingSlots.length === 0
  );
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
              options={slotTypeOptions}
              value={formData.slot_type}
              onChange={(val) =>
                setFormData({ ...formData, slot_type: val })
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
                setFormData({
                  ...formData,
                  period_order: String(num),
                  period_name: newName,
                });
              }}
              placeholder="Select Period Number"
              required
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
                'General Routine (All Classes)';
              const slotStart = formatDisplayTime(cSlot.start_time ? cSlot.start_time.slice(0, 5) : '');
              const slotEnd = formatDisplayTime(cSlot.end_time ? cSlot.end_time.slice(0, 5) : '');

              return (
                <div
                  key={cSlot.id || `${cSlot.period_name}-${cSlot.start_time}`}
                  className="flex items-start gap-2 text-[11px] font-normal theme-text-secondary theme-bg-sub border theme-border px-3.5 py-2 rounded-xl leading-relaxed shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>
                    This time slot overlaps with <strong className="font-semibold text-rose-400">"{cSlot.period_name}"</strong> in <strong className="font-semibold text-rose-400">{targetClassName}</strong> (<span className="font-semibold text-rose-400">{slotStart} – {slotEnd}</span>).
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {isInvalidTimeRange && (
          <div className="flex items-center gap-2 text-[11px] font-normal theme-text-secondary theme-bg-sub border theme-border px-3.5 py-2 rounded-xl animate-fade-in shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>End time must be <strong className="font-semibold text-amber-500">later than start time</strong>.</span>
          </div>
        )}

        {/* Target Class Scope */}
        <div>
          <ClassSelect
            label="Target Class"
            optional
            classes={classes && classes.length > 0 ? classes : undefined}
            value={formData.student_class}
            onChange={(val) =>
              setFormData({ ...formData, student_class: val === 'ALL' || !val ? '' : val })
            }
            allowAll={true}
            allLabel="All Classes"
            allValue=""
            placeholder="All Classes"
          />
        </div>

        {/* Effective From Date (Temporal Validity Start via ReusableCalendar) */}
        <div>
          <ReusableCalendar
            label="Effective From Date"
            selectedDate={formData.effective_from || ''}
            onSelectDate={(val) =>
              setFormData({ ...formData, effective_from: val })
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
