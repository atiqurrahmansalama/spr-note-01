import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpenIcon,
  FilledCheckCircleIcon,
  ClassIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  TimerIcon,
} from '../../../components/ui/Icons';
import CustomInput from '../../../components/ui/CustomInput';
import CustomSelect from '../../../components/ui/CustomSelect';
import ReusableCalendar from '../../../components/common/ReusableCalendar';
import { ClassSelect, TeacherSelect, SubjectSelect } from '../../../components/selectors';
import { useToast } from '../../../context/ToastContext';
import { curriculumStore, academicYearsStore } from '../../../utils/localStore';
import { useAcademicData } from '../../learning/useAcademicData';
import { useTenant } from '../../../context/TenantContext';

export const DEFAULT_ACADEMIC_DAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'];

export const ACADEMIC_WEEKDAYS = [
  { code: 'SAT', label: 'Saturday', short: 'Sat' },
  { code: 'SUN', label: 'Sunday', short: 'Sun' },
  { code: 'MON', label: 'Monday', short: 'Mon' },
  { code: 'TUE', label: 'Tuesday', short: 'Tue' },
  { code: 'WED', label: 'Wednesday', short: 'Wed' },
  { code: 'THU', label: 'Thursday', short: 'Thu' },
  { code: 'FRI', label: 'Friday', short: 'Fri' },
];

export default function SyllabusDrawerForm({
  item = null,
  activeTenantId,
  classes = [],
  teachers = [],
  periodSlots: propPeriodSlots = [],
  onSaveSuccess,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const effectiveTenantId = activeTenantId || activeTenant?.id || 'default';

  const { classes: academicClasses, periodSlots: academicPeriodSlots } = useAcademicData();
  const effectiveClasses = classes && classes.length > 0 ? classes : (academicClasses || []);
  const effectivePeriodSlots = propPeriodSlots && propPeriodSlots.length > 0 ? propPeriodSlots : (academicPeriodSlots || []);
  const effectiveTeachers = teachers && teachers.length > 0 ? teachers : [];

  // Available Semesters / Academic Terms from Institution Settings
  const availableSemesters = useMemo(() => {
    try {
      const terms = academicYearsStore.getConfiguredTerms(effectiveTenantId);
      if (Array.isArray(terms) && terms.length > 0) {
        return terms.map((t) => t.name || t.label || String(t));
      }
    } catch {
      // Fallback standard terms
    }
    return ['1st Semester', '2nd Semester', 'Final Term', 'Annual Syllabus'];
  }, [effectiveTenantId]);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    classId: '',
    className: '',
    periodSlotId: '',
    periodName: '',
    scheduleType: 'FULL_WEEK', // 'FULL_WEEK' | 'SPLIT_DAYS'
    scheduleDays: DEFAULT_ACADEMIC_DAYS,
    semesters: ['1st Semester'],
    semester: '1st Semester',
    hasVolumes: false,
    volumes: [
      { id: 'vol_1', name: 'Volume 1', startPage: 1, endPage: 150, startChapter: '', endChapter: '', semester: '1st Semester' },
    ],
    startPage: 1,
    endPage: 150,
    startChapter: '',
    endChapter: '',
    currentPage: 0,
    targetDate: '',
    notes: '',
  });

  const [customSemesterInput, setCustomSemesterInput] = useState('');
  const [showCustomSemester, setShowCustomSemester] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      const initialSemesters = Array.isArray(item.semesters) && item.semesters.length > 0
        ? item.semesters
        : (item.semester ? item.semester.split(',').map((s) => s.trim()).filter(Boolean) : ['1st Semester']);

      const initialVolumes = Array.isArray(item.volumes) && item.volumes.length > 0
        ? item.volumes.map((v) => ({
            ...v,
            startChapter: v.startChapter || '',
            endChapter: v.endChapter || '',
          }))
        : [
            {
              id: 'vol_1',
              name: item.hasVolumes ? 'Volume 1' : 'Single Volume',
              startPage: Number(item.startPage) || 1,
              endPage: Number(item.endPage) || 150,
              startChapter: item.startChapter || '',
              endChapter: item.endChapter || '',
              semester: initialSemesters[0] || '1st Semester',
            },
          ];

      const initialScheduleDays = Array.isArray(item.scheduleDays) && item.scheduleDays.length > 0
        ? item.scheduleDays
        : DEFAULT_ACADEMIC_DAYS;

      const initialScheduleType = item.scheduleType
        ? item.scheduleType
        : (item.scheduleDays && item.scheduleDays.length < 6 ? 'SPLIT_DAYS' : 'FULL_WEEK');

      setFormData({
        name: item.name || '',
        subject: item.subject || '',
        classId: item.classId || '',
        className: item.className || '',
        periodSlotId: item.periodSlotId || '',
        periodName: item.periodName || '',
        scheduleType: initialScheduleType,
        scheduleDays: initialScheduleDays,
        teacherId: item.teacherId || '',
        teacherName: item.teacherName || '',
        semesters: initialSemesters,
        semester: initialSemesters.join(', ') || item.semester || '',
        hasVolumes: Boolean(item.hasVolumes || (item.volumes && item.volumes.length > 1)),
        volumes: initialVolumes,
        startPage: Number(item.startPage) || 1,
        endPage: Number(item.endPage) || 150,
        startChapter: item.startChapter || '',
        endChapter: item.endChapter || '',
        currentPage: Number(item.currentPage) || 0,
        targetDate: item.targetDate || '',
        notes: item.notes || '',
      });
    } else {
      const firstClass = effectiveClasses && effectiveClasses.length > 0 ? effectiveClasses[0] : null;
      setFormData({
        name: '',
        subject: '',
        classId: firstClass ? String(firstClass.id) : '',
        className: firstClass ? (firstClass.name || firstClass.class_name) : '',
        periodSlotId: '',
        periodName: '',
        scheduleType: 'FULL_WEEK',
        scheduleDays: DEFAULT_ACADEMIC_DAYS,
        teacherId: '',
        teacherName: '',
        semesters: ['1st Semester'],
        semester: '1st Semester',
        hasVolumes: false,
        volumes: [
          { id: 'vol_1', name: 'Volume 1', startPage: 1, endPage: 150, startChapter: '', endChapter: '', semester: '1st Semester' },
        ],
        startPage: 1,
        endPage: 150,
        startChapter: '',
        endChapter: '',
        currentPage: 0,
        targetDate: '',
        notes: '',
      });
    }
  }, [item, effectiveClasses]);

  // Routine Periods matching active class
  const filteredPeriods = useMemo(() => {
    return effectivePeriodSlots.filter((p) => {
      if (!formData.classId) return true;
      if (!p.student_class && !p.class_id && !p.class) return true;
      const pClsId = typeof p.student_class === 'object' ? p.student_class?.id : p.student_class || p.class_id || p.class;
      return String(pClsId) === String(formData.classId);
    });
  }, [effectivePeriodSlots, formData.classId]);

  const periodOptions = useMemo(() => {
    return [
      { value: '', label: 'Unassigned / General Slot' },
      ...filteredPeriods.map((p) => {
        const timeStr = p.start_time && p.end_time ? ` (${p.start_time} - ${p.end_time})` : '';
        return {
          value: String(p.id),
          label: `${p.period_name || 'Period'}${timeStr}`,
        };
      }),
    ];
  }, [filteredPeriods]);

  const handlePeriodChange = (newPeriodId) => {
    const matched = effectivePeriodSlots.find((p) => String(p.id) === String(newPeriodId));
    setFormData((prev) => ({
      ...prev,
      periodSlotId: newPeriodId,
      periodName: matched ? matched.period_name : '',
    }));
  };

  const handleClassChange = (newClassId) => {
    const matched = effectiveClasses.find((c) => String(c.id) === String(newClassId));
    setFormData((prev) => ({
      ...prev,
      classId: newClassId,
      className: matched ? (matched.name || matched.class_name) : prev.className,
      periodSlotId: '', // Reset period when class changes
      periodName: '',
    }));
  };

  const handleTeacherChange = (newTeacherId, teacherObj) => {
    const matched = teacherObj || (Array.isArray(teachers) ? teachers.find(
      (t) => String(t.id) === String(newTeacherId) || String(t.user) === String(newTeacherId) || String(t.teacher_id) === String(newTeacherId)
    ) : null);
    const tName = matched
      ? matched.name ||
        matched.name_en ||
        (matched.first_name ? `${matched.first_name} ${matched.last_name || ''}`.trim() : '') ||
        matched.full_name ||
        matched.label ||
        ''
      : '';
    setFormData((prev) => ({
      ...prev,
      teacherId: newTeacherId,
      teacherName: tName || prev.teacherName,
    }));
  };

  // ─── Multi-Semester Toggle Handler ────────────────────────────────────────
  const toggleSemester = (semName) => {
    setFormData((prev) => {
      const exists = prev.semesters.includes(semName);
      let updated;
      if (exists) {
        if (prev.semesters.length === 1) {
          showToast('At least one semester must be selected.', 'warning');
          return prev;
        }
        updated = prev.semesters.filter((s) => s !== semName);
      } else {
        updated = [...prev.semesters, semName];
      }
      return {
        ...prev,
        semesters: updated,
        semester: updated.join(', '),
      };
    });
  };

  const handleAddCustomSemester = (e) => {
    e.preventDefault();
    if (!customSemesterInput.trim()) return;
    const clean = customSemesterInput.trim();
    if (!formData.semesters.includes(clean)) {
      setFormData((prev) => {
        const updated = [...prev.semesters, clean];
        return {
          ...prev,
          semesters: updated,
          semester: updated.join(', '),
        };
      });
    }
    setCustomSemesterInput('');
    setShowCustomSemester(false);
  };

  // ─── Volume Management Handlers ───────────────────────────────────────────
  const handleToggleVolumeMode = (isMulti) => {
    setFormData((prev) => {
      if (isMulti) {
        const vols = prev.volumes && prev.volumes.length > 0 ? prev.volumes : [
          { id: 'vol_1', name: 'Volume 1', startPage: Number(prev.startPage) || 1, endPage: Number(prev.endPage) || 150, semester: prev.semesters[0] || '' },
          { id: 'vol_2', name: 'Volume 2', startPage: 1, endPage: 180, semester: prev.semesters[1] || prev.semesters[0] || '' },
        ];
        return {
          ...prev,
          hasVolumes: true,
          volumes: vols,
        };
      } else {
        const firstVol = prev.volumes && prev.volumes.length > 0 ? prev.volumes[0] : null;
        return {
          ...prev,
          hasVolumes: false,
          startPage: firstVol ? firstVol.startPage : (prev.startPage || 1),
          endPage: firstVol ? firstVol.endPage : (prev.endPage || 150),
          startChapter: firstVol ? firstVol.startChapter : (prev.startChapter || ''),
          endChapter: firstVol ? firstVol.endChapter : (prev.endChapter || ''),
        };
      }
    });
  };

  const handleAddVolume = () => {
    setFormData((prev) => {
      const nextNum = (prev.volumes?.length || 0) + 1;
      const newVol = {
        id: `vol_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: `Volume ${nextNum}`,
        startPage: 1,
        endPage: 200,
        startChapter: '',
        endChapter: '',
        semester: prev.semesters[nextNum - 1] || prev.semesters[0] || '',
      };
      return {
        ...prev,
        volumes: [...(prev.volumes || []), newVol],
      };
    });
  };

  const handleUpdateVolume = (volId, field, value) => {
    setFormData((prev) => {
      const updatedVolumes = (prev.volumes || []).map((v) => {
        if (v.id === volId) {
          const updated = { ...v, [field]: value };
          if (field === 'startPage' || field === 'endPage') {
            updated[field] = value === '' ? '' : Math.max(1, Number(value));
          }
          return updated;
        }
        return v;
      });
      return {
        ...prev,
        volumes: updatedVolumes,
      };
    });
  };

  const handleRemoveVolume = (volId) => {
    setFormData((prev) => {
      if ((prev.volumes || []).length <= 1) {
        showToast('At least one volume is required in multi-volume mode.', 'warning');
        return prev;
      }
      return {
        ...prev,
        volumes: prev.volumes.filter((v) => v.id !== volId),
      };
    });
  };

  // ─── Aggregate Calculations ───────────────────────────────────────────────
  const aggregateVolumeStats = useMemo(() => {
    if (!formData.hasVolumes) {
      const start = Number(formData.startPage) || 1;
      const end = Number(formData.endPage) || start;
      const cur = Number(formData.currentPage) || 0;
      const total = Math.max(1, end - start + 1);
      const covered = Math.max(0, Math.min(total, cur >= start ? cur - start + 1 : 0));
      return {
        totalVolumeCount: 1,
        totalTargetPages: total,
        startPage: start,
        endPage: end,
        covered,
      };
    }

    let totalPagesSum = 0;
    const vols = formData.volumes || [];
    vols.forEach((v) => {
      const s = Number(v.startPage) || 1;
      const e = Number(v.endPage) || s;
      totalPagesSum += Math.max(1, e - s + 1);
    });

    const cur = Number(formData.currentPage) || 0;
    const firstStart = vols.length > 0 ? Number(vols[0].startPage) || 1 : 1;
    const lastEnd = vols.length > 0 ? Number(vols[vols.length - 1].endPage) || totalPagesSum : totalPagesSum;

    return {
      totalVolumeCount: vols.length,
      totalTargetPages: totalPagesSum,
      startPage: firstStart,
      endPage: lastEnd,
      covered: Math.max(0, Math.min(totalPagesSum, cur)),
    };
  }, [formData.hasVolumes, formData.startPage, formData.endPage, formData.currentPage, formData.volumes]);

  const existingBooksInSlot = useMemo(() => {
    if (!formData.periodSlotId || !formData.classId) return [];
    try {
      const allBooks = curriculumStore.getItems(effectiveTenantId) || [];
      return allBooks.filter(
        (b) =>
          String(b.id) !== String(item?.id) &&
          String(b.classId) === String(formData.classId) &&
          String(b.periodSlotId) === String(formData.periodSlotId)
      );
    } catch {
      return [];
    }
  }, [effectiveTenantId, formData.periodSlotId, formData.classId, item]);

  // ─── Form Submission ──────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('Please enter the Textbook title.', 'warning');
      return;
    }

    if (formData.semesters.length === 0) {
      showToast('Please select at least one semester.', 'warning');
      return;
    }

    if (formData.periodSlotId && formData.scheduleType === 'SPLIT_DAYS' && (!formData.scheduleDays || formData.scheduleDays.length === 0)) {
      showToast('Please select at least one routine day for this book.', 'warning');
      return;
    }

    // Validate multi-volumes if enabled
    if (formData.hasVolumes) {
      for (const v of formData.volumes || []) {
        const s = Number(v.startPage) || 1;
        const e = Number(v.endPage) || s;
        if (e < s) {
          showToast(`In "${v.name}": Target End Page (${e}) cannot be less than Start Page (${s}).`, 'warning');
          return;
        }
      }
    } else {
      const s = Number(formData.startPage) || 1;
      const e = Number(formData.endPage) || s;
      if (e < s) {
        showToast(`Target End Page (${e}) cannot be less than Start Page (${s}).`, 'warning');
        return;
      }
    }

    const payload = {
      ...formData,
      scheduleType: formData.periodSlotId ? (formData.scheduleType || 'FULL_WEEK') : 'FULL_WEEK',
      scheduleDays: formData.periodSlotId && formData.scheduleType === 'SPLIT_DAYS'
        ? formData.scheduleDays
        : DEFAULT_ACADEMIC_DAYS,
      startChapter: formData.startChapter || '',
      endChapter: formData.endChapter || '',
      startPage: aggregateVolumeStats.startPage,
      endPage: aggregateVolumeStats.endPage,
      totalPages: aggregateVolumeStats.totalTargetPages,
      semester: formData.semesters.join(', '),
      volumes: formData.hasVolumes
        ? (formData.volumes || []).map((v) => ({
            ...v,
            startChapter: v.startChapter || '',
            endChapter: v.endChapter || '',
            startPage: Number(v.startPage) || 1,
            endPage: Number(v.endPage) || 1,
            totalPages: Math.max(1, (Number(v.endPage) || 1) - (Number(v.startPage) || 1) + 1),
          }))
        : [],
    };

    setIsSubmitting(true);
    try {
      if (item && item.id) {
        curriculumStore.updateItem(effectiveTenantId, item.id, payload);
        showToast(`Syllabus "${payload.name}" updated successfully.`, 'success');
      } else {
        curriculumStore.addItem(effectiveTenantId, payload);
        showToast(`Syllabus "${payload.name}" added to curriculum.`, 'success');
      }

      if (onSaveSuccess) onSaveSuccess();
      if (onSaved) onSaved();
    } catch (err) {
      showToast(err.message || 'Failed to save syllabus item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="@container flex flex-col h-full space-y-6 p-2 text-left font-sans">
      {/* 1. Textbook Title */}
      <div>
        <CustomInput
          label="Textbook Title"
          required
          value={formData.name}
          onChange={(val) => setFormData({ ...formData, name: val })}
          placeholder="e.g. Mukhtasar al-Quduri"
        />
      </div>

      {/* 2. Subject & Class Selection (Responsive: 1 col if drawer < 460px, 2 cols if drawer >= 460px) */}
      <div className="grid grid-cols-1 @[460px]:grid-cols-2 gap-4">
        <div>
          <SubjectSelect
            label="Subject"
            value={formData.subject}
            onChange={(val) => setFormData({ ...formData, subject: val || '' })}
            placeholder="Select Subject.."
          />
        </div>

        <div>
          <ClassSelect
            label="Assign Class"
            value={formData.classId}
            onChange={handleClassChange}
            required
            classes={effectiveClasses}
            allLabel="Select Class"
          />
        </div>
      </div>

      {/* 3. Routine Period, Weekly Schedule & Assigned Teacher */}
      <div className="space-y-3.5 pt-1 border-t theme-border">
        <div className="grid grid-cols-1 @[460px]:grid-cols-2 gap-4">
          <div>
            <CustomSelect
              label="Routine Period Slot"
              options={periodOptions}
              value={formData.periodSlotId}
              onChange={handlePeriodChange}
              size="md"
            />
          </div>

          <div>
            <TeacherSelect
              label="Assigned Teacher"
              value={formData.teacherId}
              onChange={handleTeacherChange}
              teachers={effectiveTeachers && effectiveTeachers.length > 0 ? effectiveTeachers : undefined}
              allLabel="Assign Later"
              required
              onlyTeachers={true}
            />
          </div>
        </div>

        {/* Schedule Mode: Full Week vs Split Days in Routine Period */}
        <div className="p-3.5 rounded-2xl theme-bg-sub/60 border theme-border space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
              <TimerIcon className="w-3.5 h-3.5 theme-accent" />
              <span>Routine Schedule Mode</span>
            </label>

            {/* Schedule Type Toggle */}
            <div className="flex items-center p-1 rounded-xl theme-bg-surface border theme-border shadow-2xs">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    scheduleType: 'FULL_WEEK',
                    scheduleDays: DEFAULT_ACADEMIC_DAYS,
                  }))
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  formData.scheduleType !== 'SPLIT_DAYS'
                    ? 'theme-bg-accent text-white shadow-xs'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                Full Week (All Days)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    scheduleType: 'SPLIT_DAYS',
                    scheduleDays:
                      prev.scheduleDays?.length > 0 && prev.scheduleDays.length < 6
                        ? prev.scheduleDays
                        : ['SAT', 'SUN', 'MON'],
                  }))
                }
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  formData.scheduleType === 'SPLIT_DAYS'
                    ? 'theme-bg-accent text-white shadow-xs'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <span>Split Days</span>
                <span className="text-[10px] opacity-80">(Share Slot)</span>
              </button>
            </div>
          </div>

          {/* Split Days Config */}
          {formData.scheduleType === 'SPLIT_DAYS' ? (
            <div className="space-y-2 pt-2 border-t theme-border">
              {/* Day Toggle Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {ACADEMIC_WEEKDAYS.map((wDay) => {
                  const isDayActive = formData.scheduleDays.includes(wDay.code);
                  return (
                    <button
                      key={wDay.code}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const exists = prev.scheduleDays.includes(wDay.code);
                          if (exists && prev.scheduleDays.length === 1) {
                            showToast('At least one routine day must be active.', 'warning');
                            return prev;
                          }
                          const updated = exists
                            ? prev.scheduleDays.filter((d) => d !== wDay.code)
                            : [...prev.scheduleDays, wDay.code];
                          return { ...prev, scheduleDays: updated };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        isDayActive
                          ? 'theme-bg-accent text-white border-transparent shadow-xs'
                          : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      {wDay.short}
                    </button>
                  );
                })}
                <span className="text-[11px] font-mono theme-accent font-bold ml-1">
                  ({formData.scheduleDays.length} Days Active)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] theme-text-secondary font-medium flex items-center justify-between">
              <span className="font-mono font-bold text-xs theme-accent">6 Days / Week</span>
            </div>
          )}

          {/* Other Book Sharing Notice */}
          {existingBooksInSlot.length > 0 && (
            <div className="p-2.5 rounded-xl theme-bg-accent-soft/40 border border-[var(--accent-main)]/20 text-xs theme-text-primary flex items-start gap-2">
              <span className="font-bold theme-accent shrink-0">Shared Period Notice:</span>
              <div>
                {existingBooksInSlot.map((b) => (
                  <div key={b.id}>
                    <strong>{b.name}</strong> is scheduled on{' '}
                    <span className="font-semibold">
                      {b.scheduleType === 'SPLIT_DAYS'
                        ? b.scheduleDays?.map((d) => d.slice(0, 3)).join(', ') || 'Split Days'
                        : 'Full Week'}
                    </span>{' '}
                    (Teacher: <em>{b.teacherName || 'Unassigned'}</em>)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Target Semesters (Spacious, Elegant Chips) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
            <span>Target Semesters</span>
          </label>
          <span className="text-xs font-semibold theme-text-secondary">
            {formData.semesters.length} selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {availableSemesters.map((sem) => {
            const isSelected = formData.semesters.includes(sem);
            return (
              <button
                key={sem}
                type="button"
                onClick={() => toggleSemester(sem)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isSelected
                    ? 'theme-bg-accent text-white border-transparent shadow-xs'
                    : 'theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated'
                }`}
              >
                {sem}
              </button>
            );
          })}

          {!showCustomSemester ? (
            <button
              type="button"
              onClick={() => setShowCustomSemester(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold theme-bg-sub border border-dashed theme-border theme-text-secondary hover:theme-text-primary hover:border-[var(--accent-main)] transition cursor-pointer flex items-center gap-1"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Term</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={customSemesterInput}
                onChange={(e) => setCustomSemesterInput(e.target.value)}
                placeholder="Term name..."
                className="px-3 py-1.5 text-xs rounded-xl border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:border-[var(--accent-main)]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCustomSemester}
                className="px-3 py-1.5 rounded-xl text-xs font-bold theme-bg-accent text-white cursor-pointer"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowCustomSemester(false)}
                className="p-1.5 rounded-lg theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Volume & Page Specification (Responsive & Breathable) */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
            <BookOpenIcon className="w-4 h-4 theme-accent" />
            <span>Volume & Pages</span>
          </label>

          {/* Spacious Switcher */}
          <div className="flex items-center p-1 rounded-xl theme-bg-sub border theme-border">
            <button
              type="button"
              onClick={() => handleToggleVolumeMode(false)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                !formData.hasVolumes
                  ? 'theme-bg-surface theme-text-primary shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              Single Vol
            </button>
            <button
              type="button"
              onClick={() => handleToggleVolumeMode(true)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                formData.hasVolumes
                  ? 'theme-bg-accent text-white shadow-xs'
                  : 'theme-text-secondary hover:theme-text-primary'
              }`}
            >
              <span>Multi Vol</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${formData.hasVolumes ? 'bg-black/25 text-white' : 'theme-bg-surface'}`}>
                {formData.volumes?.length || 2}
              </span>
            </button>
          </div>
        </div>

        {/* Case A: Single Volume Mode */}
        {!formData.hasVolumes && (
          <div className="space-y-4">
            {/* Start: Chapter + Page */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3.5">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Start Chapter / Topic"
                  optional
                  value={formData.startChapter}
                  onChange={(val) => setFormData((prev) => ({ ...prev, startChapter: val }))}
                  placeholder="e.g. Kitab al-Taharah / Chapter 1"
                />
              </div>
              <div className="@[480px]:col-span-1">
                <CustomInput
                  label="Start Page"
                  type="number"
                  min={1}
                  required
                  value={formData.startPage}
                  onChange={(val) => {
                    const s = val === '' ? '' : Math.max(1, Number(val));
                    setFormData((prev) => ({
                      ...prev,
                      startPage: s,
                      endPage: prev.endPage !== '' && Number(prev.endPage) < Number(s) ? s : prev.endPage,
                    }));
                  }}
                  placeholder="1"
                />
              </div>
            </div>

            {/* End: Chapter + Page */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3.5">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="End Chapter / Topic"
                  optional
                  value={formData.endChapter}
                  onChange={(val) => setFormData((prev) => ({ ...prev, endChapter: val }))}
                  placeholder="e.g. Kitab al-Nikah / Chapter 5"
                />
              </div>
              <div className="@[480px]:col-span-1">
                <CustomInput
                  label="End Page"
                  type="number"
                  min={Number(formData.startPage) || 1}
                  required
                  value={formData.endPage}
                  onChange={(val) => {
                    const e = val === '' ? '' : Number(val);
                    setFormData((prev) => ({
                      ...prev,
                      endPage: e,
                    }));
                  }}
                  placeholder="150"
                />
              </div>
            </div>
          </div>
        )}

        {/* Case B: Multi-Volume Mode */}
        {formData.hasVolumes && (
          <div className="space-y-4">
            {(formData.volumes || []).map((vol, idx) => (
              <div
                key={vol.id || idx}
                className="p-4 rounded-2xl border theme-border theme-bg-sub/40 space-y-4 transition-all"
              >
                {/* Top Row: Volume Title & Semester & Delete */}
                <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 items-end">
                  <div>
                    <CustomInput
                      label={`Volume ${idx + 1} Title`}
                      value={vol.name}
                      onChange={(val) => handleUpdateVolume(vol.id, 'name', val)}
                      placeholder={`e.g. Volume ${idx + 1}`}
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <CustomSelect
                        label="Assigned Semester"
                        options={formData.semesters.map((s) => ({ value: s, label: s }))}
                        value={vol.semester || formData.semesters[0] || ''}
                        onChange={(val) => handleUpdateVolume(vol.id, 'semester', val)}
                        size="md"
                      />
                    </div>
                    {(formData.volumes || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVolume(vol.id)}
                        className="p-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                        title="Remove Volume"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Start: Chapter + Page */}
                <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3.5">
                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label="Start Chapter"
                      optional
                      value={vol.startChapter || ''}
                      onChange={(val) => handleUpdateVolume(vol.id, 'startChapter', val)}
                      placeholder="e.g. Kitab al-Taharah"
                    />
                  </div>
                  <div className="@[480px]:col-span-1">
                    <CustomInput
                      label="Start Page"
                      type="number"
                      min={1}
                      required
                      value={vol.startPage}
                      onChange={(val) => {
                        const s = val === '' ? '' : Math.max(1, Number(val));
                        handleUpdateVolume(vol.id, 'startPage', s);
                        if (vol.endPage !== '' && Number(vol.endPage) < Number(s)) {
                          handleUpdateVolume(vol.id, 'endPage', s);
                        }
                      }}
                      placeholder="1"
                    />
                  </div>
                </div>

                {/* End: Chapter + Page */}
                <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3.5">
                  <div className="@[480px]:col-span-2">
                    <CustomInput
                      label="End Chapter"
                      optional
                      value={vol.endChapter || ''}
                      onChange={(val) => handleUpdateVolume(vol.id, 'endChapter', val)}
                      placeholder="e.g. Kitab al-Hajj"
                    />
                  </div>
                  <div className="@[480px]:col-span-1">
                    <CustomInput
                      label="End Page"
                      type="number"
                      min={Number(vol.startPage) || 1}
                      required
                      value={vol.endPage}
                      onChange={(val) => {
                        const e = val === '' ? '' : Number(val);
                        handleUpdateVolume(vol.id, 'endPage', e);
                      }}
                      placeholder="150"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddVolume}
                className="px-4 py-2.5 rounded-xl text-xs font-bold theme-bg-sub border theme-border theme-text-primary hover:theme-bg-elevated transition cursor-pointer flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4 theme-accent" />
                <span>Add Another Volume</span>
              </button>
              <span className="text-xs theme-text-secondary font-medium">
                Total Span: <strong className="theme-text-primary font-bold font-mono text-sm">{formData.volumes?.length || 0} Volumes • {aggregateVolumeStats.totalTargetPages} Pages</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 6. Current Completed Page (Shown ONLY in Edit Mode) */}
      {Boolean(item && item.id) && (
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4 items-center pt-1">
          <div>
            <CustomInput
              label="Current Completed Page"
              type="number"
              min={0}
              max={aggregateVolumeStats.totalTargetPages || 9999}
              value={formData.currentPage}
              onChange={(val) => {
                if (val === '') {
                  setFormData((prev) => ({ ...prev, currentPage: '' }));
                  return;
                }
                const num = Number(val);
                const maxAllowed = aggregateVolumeStats.totalTargetPages || 9999;
                if (num > maxAllowed) {
                  setFormData((prev) => ({ ...prev, currentPage: maxAllowed }));
                  showToast(`Current page cannot exceed total target pages (${maxAllowed}).`, 'warning');
                } else if (num < 0) {
                  setFormData((prev) => ({ ...prev, currentPage: 0 }));
                } else {
                  setFormData((prev) => ({ ...prev, currentPage: num }));
                }
              }}
              placeholder="0"
              className="font-bold"
            />
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-sub/60 border theme-border flex items-center justify-between text-xs mt-auto">
            <span className="theme-text-secondary font-medium">Status:</span>
            <span className="font-bold theme-text-primary">
              {aggregateVolumeStats.covered} / {aggregateVolumeStats.totalTargetPages} pgs (
              {aggregateVolumeStats.totalTargetPages > 0
                ? Math.round((aggregateVolumeStats.covered / aggregateVolumeStats.totalTargetPages) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>
      )}

      {/* 7. Target Completion Date & Notes */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary mb-2">
            Target Completion Date
          </label>
          <ReusableCalendar
            selectedDate={formData.targetDate || ''}
            onSelectDate={(val) => setFormData({ ...formData, targetDate: val })}
            placeholder="Select Completion Date (Optional)"
          />
        </div>

        <div>
          <CustomInput
            label="Syllabus Scope Notes"
            type="textarea"
            rows={3}
            value={formData.notes}
            onChange={(val) => setFormData({ ...formData, notes: val })}
            placeholder="e.g. Volume 1 covers Kitab al-Taharah; Volume 2 covers Muamalat..."
            maxLength={300}
          />
        </div>
      </div>

      {/* Footer Submit Buttons (Responsive: Stack on small drawer, inline on @[480px]+) */}
      <div className="pt-4 border-t theme-border flex flex-col-reverse @[480px]:flex-row items-stretch @[480px]:items-center justify-end gap-3 mt-auto">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl theme-bg-sub border theme-border hover:theme-bg-elevated text-xs font-bold theme-text-secondary transition cursor-pointer text-center"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 text-center"
        >
          <FilledCheckCircleIcon className="w-4 h-4" />
          <span>{item ? 'Save Changes' : 'Add to Curriculum'}</span>
        </button>
      </div>
    </form>
  );
}
