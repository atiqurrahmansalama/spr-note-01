import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpenIcon,
  TrashIcon,
  FilledCheckCircleIcon,
  PlusIcon,
} from '../../../../components/ui/Icons';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import { TeacherSelect, SubjectSelect } from '../../../../components/selectors';
import { useToast } from '../../../../context/ToastContext';
import { curriculumStore, academicYearsStore } from '../../../../utils/localStore';
import { useAcademicData } from '../../../learning/useAcademicData';
import { useTenant } from '../../../../context/TenantContext';
import { DrawerContainer } from '../../../../components/layout';
import { fetchWithAuth } from '../../../../utils/authService';

import RoutineScheduleModePicker from '../../../../components/common/RoutineScheduleModePicker';
import AcademicScopePicker from '../../../../components/common/AcademicScopePicker';
import { weeklyHolidaysStore } from '../../../../utils/stores/calendarStore';

export default function SyllabusDrawerForm({
  item = null,
  activeTenantId,
  departments = [],
  classes = [],
  sections: propSections = [],
  teachers = [],
  periodSlots: propPeriodSlots = [],
  onSaveSuccess,
  onSaved,
  onCancel,
}) {
  const { showToast } = useToast();
  const { activeTenant } = useTenant();
  const effectiveTenantId = activeTenantId || activeTenant?.id || 'default';

  const {
    classes: academicClasses,
    sections: academicSections,
    periodSlots: academicPeriodSlots,
  } = useAcademicData();

  const [internalDepartments, setInternalDepartments] = useState([]);
  const [internalSections, setInternalSections] = useState([]);
  const [internalPeriods, setInternalPeriods] = useState([]);

  // Fetch departments, sections and period slots if not provided via props or store
  useEffect(() => {
    let isMounted = true;
    const fetchLookups = async () => {
      try {
        const [deptRes, secRes, slotRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/academy/sections/'),
          fetchWithAuth('/api/v1/academy/periods/'),
        ]);
        if (deptRes.status === 'fulfilled' && deptRes.value.ok && isMounted) {
          const d = await deptRes.value.json();
          setInternalDepartments(Array.isArray(d) ? d : d.results || []);
        }
        if (secRes.status === 'fulfilled' && secRes.value.ok && isMounted) {
          const d = await secRes.value.json();
          setInternalSections(Array.isArray(d) ? d : d.results || []);
        }
        if (slotRes.status === 'fulfilled' && slotRes.value.ok && isMounted) {
          const d = await slotRes.value.json();
          setInternalPeriods(Array.isArray(d) ? d : d.results || []);
        }
      } catch {}
    };
    fetchLookups();
    return () => {
      isMounted = false;
    };
  }, []);

  const effectiveDepartments = departments && departments.length > 0 ? departments : internalDepartments;
  const effectiveClasses = classes && classes.length > 0 ? classes : (academicClasses || []);
  const effectiveSections = propSections && propSections.length > 0
    ? propSections
    : (academicSections && academicSections.length > 0 ? academicSections : internalSections);
  const effectivePeriodSlots = propPeriodSlots && propPeriodSlots.length > 0
    ? propPeriodSlots
    : (academicPeriodSlots && academicPeriodSlots.length > 0 ? academicPeriodSlots : internalPeriods);
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

  // Active working day codes (e.g. ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU'])
  const defaultWorkingDays = useMemo(() => {
    return weeklyHolidaysStore.getWorkingDayCodes(effectiveTenantId, true);
  }, [effectiveTenantId]);

  const [sectionScope, setSectionScope] = useState(() => {
    if (item?.sectionId) return 'SPECIFIC';
    return 'ALL';
  });

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    departmentId: '',
    departmentName: '',
    classId: '',
    className: '',
    sectionId: '',
    sectionName: '',
    periodSlotId: '',
    periodName: '',
    scheduleType: 'FULL_WEEK', // 'FULL_WEEK' | 'SPLIT_DAYS'
    scheduleDays: defaultWorkingDays,
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
        : defaultWorkingDays;

      const initialScheduleType = item.scheduleType
        ? item.scheduleType
        : (item.scheduleDays && item.scheduleDays.length < defaultWorkingDays.length ? 'SPLIT_DAYS' : 'FULL_WEEK');

      const matchedClass = effectiveClasses.find((c) => String(c.id) === String(item.classId));
      const clsDept = matchedClass?.department !== undefined ? matchedClass.department : matchedClass?.department_id;
      const deptId = item.departmentId || item.department || (clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '');
      const matchedDept = effectiveDepartments.find((d) => String(d.id) === String(deptId));

      setSectionScope(item.sectionId ? 'SPECIFIC' : 'ALL');

      setFormData({
        name: item.name || '',
        subject: item.subject || '',
        departmentId: deptId ? String(deptId) : '',
        departmentName: item.departmentName || matchedDept?.name || matchedClass?.department_name || '',
        classId: item.classId ? String(item.classId) : '',
        className: item.className || (matchedClass ? (matchedClass.name || matchedClass.class_name) : ''),
        sectionId: item.sectionId ? String(item.sectionId) : '',
        sectionName: item.sectionName || '',
        periodSlotId: item.periodSlotId ? String(item.periodSlotId) : '',
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
      const firstClassDept = firstClass?.department !== undefined ? firstClass.department : firstClass?.department_id;
      const firstDeptId = firstClassDept ? (typeof firstClassDept === 'object' ? String(firstClassDept.id || '') : String(firstClassDept)) : '';
      const matchedDept = effectiveDepartments.find((d) => String(d.id) === String(firstDeptId));

      setSectionScope('ALL');
      setFormData({
        name: '',
        subject: '',
        departmentId: firstDeptId || '',
        departmentName: matchedDept ? matchedDept.name : (firstClass?.department_name || ''),
        classId: firstClass ? String(firstClass.id) : '',
        className: firstClass ? (firstClass.name || firstClass.class_name) : '',
        sectionId: '',
        sectionName: '',
        periodSlotId: '',
        periodName: '',
        scheduleType: 'FULL_WEEK',
        scheduleDays: defaultWorkingDays,
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
  }, [item, defaultWorkingDays, effectiveClasses, effectiveDepartments]);

  // Filter sections belonging to currently assigned Class
  const availableSections = useMemo(() => {
    if (!formData.classId) return [];
    return effectiveSections.filter((sec) => {
      const rawSecClass = sec.student_class !== undefined ? sec.student_class : (sec.student_class_id || sec.class_id || sec.class);
      const secClassId = rawSecClass
        ? (typeof rawSecClass === 'object' ? String(rawSecClass.id || '') : String(rawSecClass))
        : '';
      return secClassId === String(formData.classId);
    });
  }, [effectiveSections, formData.classId]);

  const hasSectionsForClass = availableSections.length > 0;

  // ─── Filter Routine Periods based on Class & Section ─────────────────────
  const filteredPeriods = useMemo(() => {
    return effectivePeriodSlots.filter((p) => {
      // 1. If no class is assigned in form, allow all slots
      if (!formData.classId) return true;

      // Extract slot's class ID
      const rawSlotClass = p.student_class !== undefined ? p.student_class : (p.student_class_id || p.class_id || p.class);
      const slotClassId = rawSlotClass
        ? (typeof rawSlotClass === 'object' ? String(rawSlotClass.id || '') : String(rawSlotClass))
        : '';

      // If slot is institution-wide (no class specified), it is available
      if (!slotClassId) return true;

      // If slot belongs to another class, exclude it
      if (slotClassId !== String(formData.classId)) return false;

      // If this class has NO sections at all, direct class matching applies
      if (!hasSectionsForClass) return true;

      // Slot belongs to current class with sections:
      const rawSlotSec = p.section !== undefined ? p.section : p.section_id;
      const slotSecId = rawSlotSec
        ? (typeof rawSlotSec === 'object' ? String(rawSlotSec.id || '') : String(rawSlotSec))
        : '';

      // If slot is class-wide (no specific section), it is valid
      if (!slotSecId) return true;

      // Slot is section-specific:
      if (sectionScope === 'SPECIFIC' && formData.sectionId) {
        return slotSecId === String(formData.sectionId);
      }

      // If syllabus is class-wide, exclude section-locked slots
      return false;
    });
  }, [effectivePeriodSlots, formData.classId, formData.sectionId, sectionScope, hasSectionsForClass]);

  const periodOptions = useMemo(() => {
    return [
      { value: '', label: 'Unassigned / General Slot' },
      ...filteredPeriods.map((p) => {
        const timeStr = p.start_time && p.end_time
          ? ` (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})`
          : '';

        const rawSec = p.section !== undefined ? p.section : p.section_id;
        const secId = rawSec
          ? (typeof rawSec === 'object' ? String(rawSec.id || '') : String(rawSec))
          : '';
        const secName = p.section_name ||
          (typeof rawSec === 'object' ? rawSec?.section_name : null) ||
          (secId ? effectiveSections.find((s) => String(s.id) === secId)?.section_name : null);
        const secBadge = secName ? ` • Section: ${secName}` : '';

        return {
          value: String(p.id),
          label: `${p.period_name || 'Period'}${timeStr}${secBadge}`,
        };
      }),
    ];
  }, [filteredPeriods, effectiveSections]);

  const handlePeriodChange = (newPeriodId) => {
    const matched = effectivePeriodSlots.find((p) => String(p.id) === String(newPeriodId));
    setFormData((prev) => ({
      ...prev,
      periodSlotId: newPeriodId,
      periodName: matched ? matched.period_name : '',
    }));
  };

  const handleDepartmentChange = (val) => {
    const newDeptId = val || '';
    const matchedDept = effectiveDepartments.find((d) => String(d.id) === String(newDeptId));
    let nextClassId = formData.classId;
    let nextClassName = formData.className;

    if (newDeptId && nextClassId) {
      const clsObj = effectiveClasses.find((c) => String(c.id) === String(nextClassId));
      const clsDept = clsObj?.department !== undefined ? clsObj.department : clsObj?.department_id;
      const deptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
      if (deptId && deptId !== String(newDeptId)) {
        nextClassId = '';
        nextClassName = '';
      }
    }

    setFormData((prev) => ({
      ...prev,
      departmentId: newDeptId,
      departmentName: matchedDept ? matchedDept.name : '',
      classId: nextClassId,
      className: nextClassName,
      sectionId: nextClassId ? prev.sectionId : '',
      sectionName: nextClassId ? prev.sectionName : '',
    }));
    if (!nextClassId) {
      setSectionScope('ALL');
    }
  };

  const handleClassChange = (newClassId) => {
    const matched = effectiveClasses.find((c) => String(c.id) === String(newClassId));
    let nextDeptId = formData.departmentId;
    let nextDeptName = formData.departmentName;

    if (matched) {
      const clsDept = matched.department !== undefined ? matched.department : matched.department_id;
      const deptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
      if (deptId && !nextDeptId) {
        nextDeptId = deptId;
        const matchedDept = effectiveDepartments.find((d) => String(d.id) === String(deptId));
        nextDeptName = matchedDept?.name || matched.department_name || '';
      }
    }

    setFormData((prev) => ({
      ...prev,
      classId: newClassId,
      className: matched ? (matched.name || matched.class_name) : prev.className,
      departmentId: nextDeptId,
      departmentName: nextDeptName,
      sectionId: '',
      sectionName: '',
      periodSlotId: '', // Reset period when class changes
      periodName: '',
    }));
    setSectionScope('ALL');
  };

  const handleTeacherChange = (newTeacherId, teacherObj) => {
    const matched = teacherObj || (Array.isArray(effectiveTeachers) ? effectiveTeachers.find(
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
    const isSelected = formData.semesters.includes(semName);
    if (isSelected && formData.semesters.length === 1) {
      showToast('At least one semester must be selected.', 'warning');
      return;
    }

    setFormData((prev) => {
      const exists = prev.semesters.includes(semName);
      let updated;
      if (exists) {
        if (prev.semesters.length <= 1) {
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
    if (e && e.preventDefault) e.preventDefault();
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

  // ─── Volume Management ──────────────────────────────────────────────────
  const handleAddVolume = () => {
    const nextIdx = (formData.volumes || []).length + 1;
    const newVol = {
      id: `vol_${Date.now()}_${nextIdx}`,
      name: `Volume ${nextIdx}`,
      startPage: 1,
      endPage: 100,
      startChapter: '',
      endChapter: '',
      semester: formData.semesters[0] || '1st Semester',
    };
    setFormData((prev) => ({
      ...prev,
      hasVolumes: true,
      volumes: [...(prev.volumes || []), newVol],
    }));
  };

  const handleRemoveVolume = (volId) => {
    setFormData((prev) => {
      const filtered = (prev.volumes || []).filter((v) => v.id !== volId);
      return {
        ...prev,
        volumes: filtered,
        hasVolumes: filtered.length > 1,
      };
    });
  };

  const handleUpdateVolume = (volId, field, val) => {
    setFormData((prev) => ({
      ...prev,
      volumes: (prev.volumes || []).map((v) => (v.id === volId ? { ...v, [field]: val } : v)),
    }));
  };

  // Calculate Aggregates
  const aggregateVolumeStats = useMemo(() => {
    if (!formData.hasVolumes) {
      const s = Number(formData.startPage) || 1;
      const e = Number(formData.endPage) || s;
      const cur = Number(formData.currentPage) || 0;
      const vol = Math.max(1, e - s + 1);
      const covered = Math.max(0, Math.min(vol, cur >= s ? cur - s + 1 : 0));
      return { totalTargetPages: vol, covered };
    }

    let total = 0;
    (formData.volumes || []).forEach((v) => {
      const s = Number(v.startPage) || 1;
      const e = Number(v.endPage) || s;
      total += Math.max(1, e - s + 1);
    });
    const cur = Number(formData.currentPage) || 0;
    const covered = Math.max(0, Math.min(total, cur));
    return { totalTargetPages: total, covered };
  }, [formData.hasVolumes, formData.startPage, formData.endPage, formData.currentPage, formData.volumes]);

  // Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Textbook / Kitab Title is required.', 'warning');
      return;
    }

    if (!formData.semesters || formData.semesters.length === 0) {
      showToast('Please select at least one semester or academic term.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        subject: formData.subject.trim() || 'General Studies',
        departmentId: formData.departmentId || null,
        departmentName: formData.departmentName || null,
        classId: formData.classId || null,
        className: formData.className || 'General Division',
        sectionId: (formData.classId && sectionScope === 'SPECIFIC' && formData.sectionId) ? formData.sectionId : null,
        sectionName: (formData.classId && sectionScope === 'SPECIFIC' && formData.sectionName) ? formData.sectionName : null,
        periodSlotId: formData.periodSlotId || null,
        periodName: formData.periodName || null,
        scheduleType: formData.scheduleType || 'FULL_WEEK',
        scheduleDays: formData.scheduleDays || defaultWorkingDays,
        teacherId: formData.teacherId || null,
        teacherName: formData.teacherName || null,
        semesters: formData.semesters,
        semester: formData.semesters.join(', '),
        hasVolumes: formData.hasVolumes,
        volumes: formData.hasVolumes ? formData.volumes : [],
        startPage: formData.hasVolumes ? Number(formData.volumes?.[0]?.startPage || 1) : Number(formData.startPage || 1),
        endPage: formData.hasVolumes
          ? Number(formData.volumes?.[formData.volumes.length - 1]?.endPage || 150)
          : Number(formData.endPage || 150),
        startChapter: formData.hasVolumes ? (formData.volumes?.[0]?.startChapter || '') : (formData.startChapter || ''),
        endChapter: formData.hasVolumes ? (formData.volumes?.[formData.volumes.length - 1]?.endChapter || '') : (formData.endChapter || ''),
        totalPages: aggregateVolumeStats.totalTargetPages,
        currentPage: Number(formData.currentPage || 0),
        targetDate: formData.targetDate || '',
        notes: formData.notes.trim() || '',
      };

      if (item && item.id) {
        curriculumStore.updateItem(effectiveTenantId, item.id, payload);
        showToast(`Syllabus for "${payload.name}" updated successfully.`, 'success');
      } else {
        curriculumStore.addItem(effectiveTenantId, payload);
        showToast(`Textbook "${payload.name}" added to curriculum.`, 'success');
      }

      onSaveSuccess?.();
      onSaved?.();
      onCancel?.();
    } catch (err) {
      showToast(err.message || 'Failed to save curriculum item.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DrawerContainer padding="none" spacing="compact">
      <form onSubmit={handleSubmit} className="@container space-y-4 @[480px]:space-y-4.5 text-left w-full pt-1">
        {/* 1. Textbook Title */}
        <div>
          <CustomInput
            label="Textbook / Kitab Title"
            placeholder="e.g. Hidayah, Quduri, Math for Class 5, Mishkat al-Masabih"
            value={formData.name}
            onChange={(val) => setFormData((prev) => ({ ...prev, name: val }))}
            required
          />
        </div>

        {/* 2. Subject & Assigned Teacher (Container Responsive) */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
          <div>
            <SubjectSelect
              label="Subject / Domain"
              value={formData.subject}
              onChange={(val) => setFormData((prev) => ({ ...prev, subject: val }))}
              placeholder="e.g. Fiqh, Nahw, Hifz, Math"
            />
          </div>

          <div>
            <TeacherSelect
              label="Assigned Teacher"
              value={formData.teacherId}
              onChange={handleTeacherChange}
              teachers={effectiveTeachers}
              onlyTeachers={true}
              placeholder="Select Instructor"
            />
          </div>
        </div>

        {/* 3. Academic Hierarchy: Department ➔ Class ➔ Section Scope */}
        <AcademicScopePicker
          departmentId={formData.departmentId}
          onDepartmentChange={handleDepartmentChange}
          classId={formData.classId}
          onClassChange={handleClassChange}
          sectionScope={sectionScope}
          onSectionScopeChange={setSectionScope}
          sectionId={formData.sectionId}
          onSectionChange={(val, secObj) => {
            setFormData((prev) => ({
              ...prev,
              sectionId: val || '',
              sectionName: secObj ? (secObj.section_name || secObj.name) : '',
            }));
          }}
          departments={effectiveDepartments}
          classes={effectiveClasses}
          sections={effectiveSections}
          requiredClass={false}
          showPeriod={false}
        />

        {/* 4. Routine Period Slot Allocation & Schedule Mode */}
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
          <div>
            <CustomSelect
              label="Assigned Routine Period"
              options={periodOptions}
              value={formData.periodSlotId}
              onChange={handlePeriodChange}
              placeholder="Select Routine Period Slot"
              searchable={false}
            />
          </div>

          <div>
            <RoutineScheduleModePicker
              scheduleType={formData.scheduleType}
              scheduleDays={formData.scheduleDays}
              onChange={({ scheduleType, scheduleDays }) => {
                setFormData((prev) => ({
                  ...prev,
                  scheduleType,
                  scheduleDays,
                }));
              }}
              workingDays={defaultWorkingDays}
            />
          </div>
        </div>

        {/* 5. Semesters / Academic Terms */}
        <div className="space-y-2 pt-1 border-t theme-border">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold theme-text-primary">
              Target Semester / Terms <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowCustomSemester(!showCustomSemester)}
              className="text-[11px] font-semibold theme-text-accent hover:underline cursor-pointer transition-colors"
            >
              {showCustomSemester ? 'Cancel Custom' : '+ Add Custom Term'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-0.5">
            {availableSemesters.map((semName) => {
              const isSelected = formData.semesters.includes(semName);
              return (
                <button
                  key={semName}
                  type="button"
                  onClick={() => toggleSemester(semName)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'theme-bg-accent text-white border-transparent shadow-2xs'
                      : 'theme-bg-sub/70 border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
                  }`}
                >
                  <span>{semName}</span>
                  {isSelected && <span className="text-[10px] opacity-80">✓</span>}
                </button>
              );
            })}
          </div>

          {showCustomSemester && (
            <div className="flex items-center gap-2 pt-1.5 animate-fade-in">
              <CustomInput
                placeholder="Type custom term e.g. Midterm 2026..."
                value={customSemesterInput}
                onChange={setCustomSemesterInput}
                className="text-xs"
              />
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddCustomSemester}
              >
                Add
              </CustomButton>
            </div>
          )}
        </div>

        {/* 6. Volume & Page Span Configuration */}
        <div className="space-y-3.5 pt-1 border-t theme-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold theme-text-primary uppercase tracking-wider">
              {formData.hasVolumes ? 'Multi-Volume Syllabus Setup' : 'Page & Chapter Span'}
            </span>

            <button
              type="button"
              onClick={() => {
                setFormData((prev) => {
                  const nextHasVolumes = !prev.hasVolumes;
                  return {
                    ...prev,
                    hasVolumes: nextHasVolumes,
                    volumes: nextHasVolumes
                      ? (prev.volumes && prev.volumes.length > 0
                          ? prev.volumes
                          : [{ id: 'vol_1', name: 'Volume 1', startPage: prev.startPage, endPage: prev.endPage, startChapter: prev.startChapter, endChapter: prev.endChapter, semester: prev.semesters[0] }])
                      : prev.volumes,
                  };
                });
              }}
              className="text-xs font-semibold theme-text-accent hover:underline cursor-pointer"
            >
              {formData.hasVolumes ? 'Switch to Single Volume' : 'Split into Multiple Volumes'}
            </button>
          </div>

          {!formData.hasVolumes ? (
            /* Single Volume Form */
            <div className="space-y-3.5 animate-fade-in">
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
                <div>
                  <CustomInput
                    label="Start Page"
                    type="number"
                    min={1}
                    value={formData.startPage}
                    onChange={(val) => setFormData((prev) => ({ ...prev, startPage: val === '' ? '' : Math.max(1, Number(val)) }))}
                    placeholder="1"
                    required
                  />
                </div>
                <div>
                  <CustomInput
                    label="Target End Page"
                    type="number"
                    min={1}
                    value={formData.endPage}
                    onChange={(val) => setFormData((prev) => ({ ...prev, endPage: val === '' ? '' : Math.max(1, Number(val)) }))}
                    placeholder="150"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
                <div>
                  <CustomInput
                    label="Start Chapter"
                    value={formData.startChapter}
                    onChange={(val) => setFormData((prev) => ({ ...prev, startChapter: val }))}
                    placeholder="e.g. Kitab al-Salah"
                  />
                </div>
                <div>
                  <CustomInput
                    label="End Chapter"
                    value={formData.endChapter}
                    onChange={(val) => setFormData((prev) => ({ ...prev, endChapter: val }))}
                    placeholder="e.g. Kitab al-Sawm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 px-1 theme-text-secondary">
                <span>Total Target Pages: <strong className="theme-text-primary font-bold font-mono text-sm">{aggregateVolumeStats.totalTargetPages}</strong></span>
              </div>
            </div>
          ) : (
            /* Multi-Volume Dynamic List */
            <div className="space-y-4">
              {(formData.volumes || []).map((vol, idx) => (
                <div
                  key={vol.id || idx}
                  className="p-4 rounded-2xl border theme-border theme-bg-sub/60 space-y-4 relative group/vol animate-fade-in shadow-2xs"
                >
                  {/* Card Header: Volume Index & Remove Button */}
                  <div className="flex items-center justify-between border-b theme-border pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold theme-accent uppercase tracking-wider">
                        Volume : {idx + 1}
                      </span>
                    </div>

                    {(formData.volumes || []).length > 1 && (
                      <CustomButton
                        type="button"
                        variant="danger"
                        size="xs"
                        icon={TrashIcon}
                        onClick={() => handleRemoveVolume(vol.id)}
                      >
                        Remove
                      </CustomButton>
                    )}
                  </div>

                  {/* Volume Title Input */}
                  <div>
                    <CustomInput
                      label="Volume Title"
                      placeholder={`e.g. Volume ${idx + 1}`}
                      value={vol.name}
                      onChange={(val) => handleUpdateVolume(vol.id, 'name', val)}
                      required
                    />
                  </div>

                  {/* Start & End Pages */}
                  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
                    <div>
                      <CustomInput
                        label="Start Page"
                        type="number"
                        min={1}
                        value={vol.startPage}
                        onChange={(val) => handleUpdateVolume(vol.id, 'startPage', val)}
                        required
                      />
                    </div>
                    <div>
                      <CustomInput
                        label="Target End Page"
                        type="number"
                        min={1}
                        value={vol.endPage}
                        onChange={(val) => handleUpdateVolume(vol.id, 'endPage', val)}
                        required
                      />
                    </div>
                  </div>

                  {/* Start & End Chapters */}
                  <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4">
                    <div>
                      <CustomInput
                        label="Start Chapter"
                        value={vol.startChapter || ''}
                        onChange={(val) => handleUpdateVolume(vol.id, 'startChapter', val)}
                        placeholder="e.g. Kitab al-Salah"
                      />
                    </div>
                    <div>
                      <CustomInput
                        label="End Chapter"
                        value={vol.endChapter || ''}
                        onChange={(val) => handleUpdateVolume(vol.id, 'endChapter', val)}
                        placeholder="e.g. Kitab al-Sawm"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <CustomButton
                  type="button"
                  variant="sub"
                  size="sm"
                  icon={PlusIcon}
                  onClick={handleAddVolume}
                >
                  Add Another Volume
                </CustomButton>
                <span className="text-xs theme-text-secondary font-medium">
                  Total Span: <strong className="theme-text-primary font-bold font-mono text-sm">{formData.volumes?.length || 0} Volumes • {aggregateVolumeStats.totalTargetPages} Pages</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 7. Current Completed Page (Shown ONLY in Edit Mode) */}
        {Boolean(item && item.id) && (
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4 items-center pt-1 border-t theme-border">
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

        {/* 8. Target Completion Date & Notes */}
        <div className="space-y-3.5 pt-1 border-t theme-border">
          <div>
            <ReusableCalendar
              label="Target Completion Date"
              selectedDate={formData.targetDate || ''}
              onSelectDate={(val) => setFormData((prev) => ({ ...prev, targetDate: val }))}
              placeholder="Select Completion Date"
            />
          </div>

          <div>
            <CustomInput
              label="Syllabus Scope Notes"
              type="textarea"
              rows={3}
              value={formData.notes}
              onChange={(val) => setFormData((prev) => ({ ...prev, notes: val }))}
              placeholder="e.g. Volume 1 covers Kitab al-Taharah; Volume 2 covers Muamalat..."
              maxLength={300}
            />
          </div>
        </div>

        {/* Footer Submit Buttons */}
        <div className="pt-4 border-t theme-border flex flex-col-reverse @[480px]:flex-row items-stretch @[480px]:items-center justify-end gap-3 mt-auto">
          <CustomButton
            type="button"
            variant="sub"
            size="md"
            onClick={onCancel}
          >
            Cancel
          </CustomButton>
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            loading={isSubmitting}
            loadingText={item ? 'Saving Changes...' : 'Adding to Curriculum...'}
            icon={FilledCheckCircleIcon}
            requireAll={[formData.name, formData.semesters]}
            disabledReason="Please enter textbook title and semester"
          >
            {item ? 'Save Changes' : 'Add to Curriculum'}
          </CustomButton>
        </div>
      </form>
    </DrawerContainer>
  );
}
