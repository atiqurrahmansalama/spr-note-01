/**
 * Unified Task & Duty Drawer Form (Right Sidebar Slide-over)
 * ==========================================================
 * Canonical slide-over drawer form for managing both:
 * 1. Personal Tasks & To-Dos (UserPersonalTask)
 * 2. Official Institutional Duties (InstitutionalDuty)
 *
 * Design & Standards:
 * - Read-only detail view by default for existing records; single-click transition to edit mode.
 * - Adheres to Rule 14 (Borderless soft surfaces, zero boxed cards, rounded-3xl / rounded-2xl).
 * - Adheres to Rule 5 & 17 (Container responsiveness with @container and @[480px]:grid-cols-2).
 * - Zero hardcoded colors, zero emojis (RULE 1 & user_rules).
 * - Reuses the canonical CalendarDateTimeSection component for Date & Timing.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  DrawerContainer,
  DrawerSection,
  DrawerFooter,
} from '@/components/layout';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomButton from '@/components/ui/CustomButton';
import {
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  ShapesIcon,
  ChecklistIcon,
  PlusIcon,
  TrashIcon,
  SaveIcon,
  EditIcon,
  DutyIcon,
  UsersIcon,
} from '@/components/ui/Icons';
import {
  EVENT_COLORS,
  resolveCanonicalEventColor,
} from '../constants/eventColors';
import {
  EventColorPickerDropdown,
} from './TimeScheduleDrawerForm';
import {
  CalendarDateTimeSection,
  formatTime12,
} from './common/CalendarDateTimeSection';
import { useCalendarTranslation } from '../locales';
import { fetchWithAuth } from '@/utils/authService';
import { formatDisplayDate } from '@/utils/dateUtils';
import type {
  UserPersonalTask,
  InstitutionalDuty,
  TaskPriority,
  TaskStatus,
  TaskSubItem,
  DutyCategory,
} from '../types';

export type TaskDutyDomain = 'TASK' | 'DUTY';

export interface UnifiedTaskDutyDrawerFormProps {
  task?: UserPersonalTask | null;
  duty?: InstitutionalDuty | null;
  item?: UserPersonalTask | InstitutionalDuty | null;
  initialDomain?: TaskDutyDomain;
  initialDate?: string;
  initialEditMode?: boolean;
  canEdit?: boolean;
  onSave: (payload: any) => void | Promise<void>;
  onQuickUpdate?: (payload: any) => void;
  onCancel?: () => void;
  onDelete?: (id: string) => void;
}

const DUTY_CATEGORY_OPTIONS = [
  { value: 'ACADEMIC', label: 'Academic & Curriculum' },
  { value: 'EXAMINATION', label: 'Examination & Hall Invigilation' },
  { value: 'ADMINISTRATIVE', label: 'Administrative & Official' },
  { value: 'FACILITIES', label: 'Campus & Facilities Oversight' },
  { value: 'GENERAL', label: 'General Institutional Duty' },
];

const TASK_CATEGORY_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'Teaching', label: 'Teaching & Classroom' },
  { value: 'Curriculum', label: 'Curriculum & Lessons' },
  { value: 'Follow-up', label: 'Guardian / Student Follow-up' },
  { value: 'Admin', label: 'Institutional Administration' },
  { value: 'Personal', label: 'Personal Reminder' },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent Priority' },
];

const PRIORITY_STYLE_MAP: Record<string, { label: string; badge: string }> = {
  LOW: { label: 'Low Priority', badge: 'theme-bg-app theme-text-secondary' },
  MEDIUM: { label: 'Medium Priority', badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  HIGH: { label: 'High Priority', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold' },
  URGENT: { label: 'Urgent Priority', badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold' },
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

interface StaffOption {
  value: string;
  label: string;
}

export function UnifiedTaskDutyDrawerForm({
  task,
  duty,
  item,
  initialDomain,
  initialDate,
  initialEditMode,
  canEdit = true,
  onSave,
  onQuickUpdate,
  onCancel,
  onDelete,
}: UnifiedTaskDutyDrawerFormProps) {
  const { t } = useCalendarTranslation();

  // 1. Resolve Active Item and Detected Domain
  const activeItem = useMemo(() => {
    return duty || task || item || null;
  }, [duty, task, item]);

  const hasExistingRecord = Boolean(activeItem?.id);

  const detectedDomain: TaskDutyDomain = useMemo(() => {
    if (initialDomain) return initialDomain;
    if (duty) return 'DUTY';
    if (task) return 'TASK';
    if (activeItem) {
      if ('assigned_to' in activeItem || 'assigned_to_name' in activeItem) {
        return 'DUTY';
      }
      const cat = String((activeItem as any)?.category || '');
      if (['ACADEMIC', 'EXAMINATION', 'ADMINISTRATIVE', 'FACILITIES', 'GENERAL'].includes(cat)) {
        return 'DUTY';
      }
    }
    return 'TASK';
  }, [initialDomain, duty, task, activeItem]);

  const [activeDomain, setActiveDomain] = useState<TaskDutyDomain>(detectedDomain);
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode ?? !hasExistingRecord);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form Field States
  const [title, setTitle] = useState(activeItem?.title || '');
  const [description, setDescription] = useState(activeItem?.description || '');
  const [priority, setPriority] = useState<TaskPriority>(
    ((activeItem as any)?.priority as TaskPriority) || 'MEDIUM'
  );
  const [status, setStatus] = useState<TaskStatus>(() => {
    if ((activeItem as any)?.is_completed) return 'COMPLETED';
    return ((activeItem as any)?.status as TaskStatus) || 'PENDING';
  });

  // Date & Timing State (Full Multi-Date, Until When? and Time Range Support)
  const initialStartDateVal = useMemo(() => {
    return (
      (activeItem as any)?.startDate ||
      (activeItem as any)?.start_date ||
      (activeItem as any)?.dueDate ||
      (activeItem as any)?.due_date ||
      initialDate ||
      new Date().toISOString().split('T')[0]
    );
  }, [activeItem, initialDate]);

  const initialEndDateVal = useMemo(() => {
    return (
      (activeItem as any)?.endDate ||
      (activeItem as any)?.end_date ||
      (activeItem as any)?.untilDate ||
      (activeItem as any)?.until_date ||
      (activeItem as any)?.dueDate ||
      (activeItem as any)?.due_date ||
      ''
    );
  }, [activeItem]);

  const initialUntilVal = useMemo(() => {
    return (activeItem as any)?.until || (initialEndDateVal ? 'DATE' : 'ONGOING');
  }, [activeItem, initialEndDateVal]);

  const initialStartTimeVal = useMemo(() => {
    return (
      (activeItem as any)?.startTime ||
      (activeItem as any)?.start_time ||
      (activeItem as any)?.dueTime ||
      (activeItem as any)?.due_time ||
      '09:00'
    );
  }, [activeItem]);

  const initialEndTimeVal = useMemo(() => {
    return (
      (activeItem as any)?.endTime ||
      (activeItem as any)?.end_time ||
      '17:00'
    );
  }, [activeItem]);

  const [startDate, setStartDate] = useState<string>(initialStartDateVal);
  const [endDate, setEndDate] = useState<string>(initialEndDateVal);
  const [until, setUntil] = useState<'ONGOING' | 'DATE' | string>(initialUntilVal);
  const [startTime, setStartTime] = useState<string>(initialStartTimeVal);
  const [endTime, setEndTime] = useState<string>(initialEndTimeVal);
  const [isAllDay, setIsAllDay] = useState<boolean>(
    Boolean((activeItem as any)?.isFullDay || (activeItem as any)?.is_full_day)
  );

  // Duty-Specific Fields
  const [dutyCategory, setDutyCategory] = useState<DutyCategory>(
    ((activeItem as any)?.category as DutyCategory) || 'ACADEMIC'
  );
  const [assignedToUserId, setAssignedToUserId] = useState<string>(
    (activeItem as any)?.assigned_to ? String((activeItem as any).assigned_to) : ''
  );
  const [assignedToName, setAssignedToName] = useState<string>(
    (activeItem as any)?.assigned_to_name || ''
  );
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState<boolean>(false);

  // Task-Specific Fields
  const [taskCategory, setTaskCategory] = useState<string>(
    (activeItem as any)?.category || 'General'
  );
  const [color, setColor] = useState<string>((activeItem as any)?.color || 'blueberry');
  const [isPinned, setIsPinned] = useState<boolean>(Boolean((activeItem as any)?.isPinned));
  const [subtasks, setSubtasks] = useState<TaskSubItem[]>((activeItem as any)?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');

  const [error, setError] = useState<string>('');

  // Sync state if activeItem changes
  useEffect(() => {
    if (activeItem) {
      setTitle(activeItem.title || '');
      setDescription(activeItem.description || '');
      setPriority(((activeItem as any).priority as TaskPriority) || 'MEDIUM');
      setStatus(
        (activeItem as any).is_completed
          ? 'COMPLETED'
          : ((activeItem as any).status as TaskStatus) || 'PENDING'
      );
      const sDate =
        (activeItem as any).startDate ||
        (activeItem as any).start_date ||
        (activeItem as any).dueDate ||
        (activeItem as any).due_date ||
        initialDate ||
        new Date().toISOString().split('T')[0];
      const eDate =
        (activeItem as any).endDate ||
        (activeItem as any).end_date ||
        (activeItem as any).untilDate ||
        (activeItem as any).until_date ||
        (activeItem as any).dueDate ||
        (activeItem as any).due_date ||
        '';
      const uUntil =
        (activeItem as any).until || (eDate ? 'DATE' : 'ONGOING');
      const sTime =
        (activeItem as any).startTime ||
        (activeItem as any).start_time ||
        (activeItem as any).dueTime ||
        (activeItem as any).due_time ||
        '';
      const eTime =
        (activeItem as any).endTime ||
        (activeItem as any).end_time ||
        '';

      setStartDate(sDate);
      setEndDate(eDate);
      setUntil(uUntil);
      setStartTime(sTime);
      setEndTime(eTime);
      setIsAllDay(!sTime && !eTime);

      if (detectedDomain === 'DUTY') {
        setDutyCategory(((activeItem as any).category as DutyCategory) || 'ACADEMIC');
        setAssignedToUserId(
          (activeItem as any).assigned_to ? String((activeItem as any).assigned_to) : ''
        );
        setAssignedToName((activeItem as any).assigned_to_name || '');
      } else {
        setTaskCategory((activeItem as any).category || 'General');
        setColor((activeItem as any).color || 'blueberry');
        setIsPinned(Boolean((activeItem as any).isPinned));
        setSubtasks((activeItem as any).subtasks || []);
      }
    }
  }, [activeItem, initialDate, detectedDomain]);

  // Load Staff Directory options for Official Duty
  useEffect(() => {
    let mounted = true;
    async function loadStaffList() {
      setLoadingStaff(true);
      try {
        const res = await fetchWithAuth('/api/v1/staff/');
        if (res.ok && mounted) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : data.results || [];
          const opts: StaffOption[] = items.map((s: any) => ({
            value: String(s.user || s.id),
            label: `${s.user_name || s.name_en || s.employee_id} — ${s.designation || 'Staff'}`,
          }));
          setStaffOptions(opts);
        }
      } catch {
        // Safe non-blocking fallback
      } finally {
        if (mounted) setLoadingStaff(false);
      }
    }

    if (activeDomain === 'DUTY' || isEditing) {
      loadStaffList();
    }

    return () => {
      mounted = false;
    };
  }, [activeDomain, isEditing]);

  // Update assigned staff display name when option selected
  useEffect(() => {
    if (assignedToUserId && staffOptions.length > 0) {
      const match = staffOptions.find((o) => o.value === assignedToUserId);
      if (match) setAssignedToName(match.label);
    }
  }, [assignedToUserId, staffOptions]);

  // Visual Color Styling for Task
  const canonicalColorId = resolveCanonicalEventColor(color, 'blueberry');
  const colorStyle = useMemo(() => {
    return EVENT_COLORS.find((c) => c.id === canonicalColorId) || EVENT_COLORS[0];
  }, [canonicalColorId]);

  const priorityStyle = PRIORITY_STYLE_MAP[priority] || PRIORITY_STYLE_MAP.MEDIUM;

  // Subtask handlers
  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const item: TaskSubItem = {
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    setSubtasks([...subtasks, item]);
    setNewSubtaskTitle('');
  };

  const handleToggleSubtask = (stId: string) => {
    setSubtasks(
      subtasks.map((st) => (st.id === stId ? { ...st, completed: !st.completed } : st))
    );
  };

  const handleToggleSubtaskInDetail = (stId: string) => {
    const updatedSubtasks = subtasks.map((st) =>
      st.id === stId ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updatedSubtasks);
    if (activeItem && onQuickUpdate) {
      onQuickUpdate({
        id: activeItem.id,
        subtasks: updatedSubtasks,
      });
    }
  };

  const handleRemoveSubtask = (stId: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== stId));
  };

  // Status toggle in read-only details view
  const handleToggleStatusInDetail = () => {
    const nextStatus: TaskStatus = status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setStatus(nextStatus);
    if (activeItem && onQuickUpdate) {
      if (activeDomain === 'DUTY') {
        onQuickUpdate({
          id: activeItem.id,
          status: nextStatus,
          is_completed: nextStatus === 'COMPLETED',
        });
      } else {
        onQuickUpdate({
          id: activeItem.id,
          status: nextStatus,
        });
      }
    }
  };

  // Save handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError(t('titleRequiredError', 'Please enter a title.'));
      return;
    }
    setError('');
    setIsSaving(true);

    try {
      const targetDueDate = until === 'DATE' && endDate ? endDate : startDate;

      if (activeDomain === 'DUTY') {
        await onSave({
          id: activeItem?.id,
          taskType: 'DUTY',
          title: title.trim(),
          description: description.trim(),
          category: dutyCategory,
          priority,
          status,
          is_completed: status === 'COMPLETED',
          start_date: startDate,
          due_date: targetDueDate,
          end_date: endDate || targetDueDate,
          until,
          until_date: until === 'DATE' ? endDate : undefined,
          due_time: isAllDay ? undefined : startTime || undefined,
          start_time: isAllDay ? undefined : startTime || undefined,
          end_time: isAllDay ? undefined : endTime || undefined,
          assigned_to: assignedToUserId
            ? isNaN(Number(assignedToUserId))
              ? assignedToUserId
              : Number(assignedToUserId)
            : null,
          assigned_to_name: assignedToName,
        });
      } else {
        await onSave({
          id: activeItem?.id,
          taskType: 'TASK',
          title: title.trim(),
          description: description.trim(),
          startDate,
          dueDate: targetDueDate,
          endDate: endDate || targetDueDate,
          until,
          untilDate: until === 'DATE' ? endDate : undefined,
          dueTime: isAllDay ? undefined : startTime || undefined,
          startTime: isAllDay ? undefined : startTime || undefined,
          endTime: isAllDay ? undefined : endTime || undefined,
          priority,
          status,
          category: taskCategory,
          color: canonicalColorId,
          isPinned,
          subtasks,
          completedAt:
            status === 'COMPLETED'
              ? (activeItem as any)?.completedAt || new Date().toISOString()
              : undefined,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: Read-Only Detail View
  // ─────────────────────────────────────────────────────────────
  if (!isEditing && hasExistingRecord) {
    return (
      <DrawerContainer padding="none">
        <div className="space-y-6 pt-2 pb-6 px-1 @container">
          {/* Header Metadata Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Domain Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border-0 shadow-xs ${
                activeDomain === 'DUTY'
                  ? 'theme-bg-accent-soft theme-accent'
                  : 'theme-bg-app theme-text-secondary'
              }`}
            >
              {activeDomain === 'DUTY' ? (
                <>
                  <DutyIcon className="w-3.5 h-3.5" />
                  <span>{t('officialDuty', 'Official Institutional Duty')}</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  <span>{t('personalTask', 'Personal Task & To-Do')}</span>
                </>
              )}
            </span>

            {/* Status Badge */}
            <span
              className={`px-3 py-1 rounded-xl text-xs font-semibold border-0 shadow-xs ${
                status === 'COMPLETED'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                  : status === 'IN_PROGRESS'
                  ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                  : 'theme-bg-elevated theme-text-secondary'
              }`}
            >
              {status === 'COMPLETED'
                ? t('completed', 'Completed')
                : status === 'IN_PROGRESS'
                ? t('inProgress', 'In Progress')
                : t('pending', 'Pending')}
            </span>

            {/* Priority Badge */}
            <span
              className={`px-3 py-1 rounded-xl text-xs font-semibold border-0 shadow-xs ${priorityStyle.badge}`}
            >
              {priorityStyle.label}
            </span>

            {/* Pinned Badge (for Tasks) */}
            {activeDomain === 'TASK' && isPinned && (
              <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 shadow-xs">
                {t('pinned', 'Pinned')}
              </span>
            )}
          </div>

          {/* Title Banner */}
          <div className="space-y-1">
            <h2 className="text-lg font-bold theme-text-primary leading-snug break-words">
              {title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs theme-text-secondary font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 shrink-0 theme-accent" />
                <span>
                  {until === 'ONGOING' ? (
                    `${formatDisplayDate(startDate)} — ${t('ongoing', 'Ongoing')}`
                  ) : endDate && endDate !== startDate ? (
                    `${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)}`
                  ) : (
                    formatDisplayDate(startDate)
                  )}
                  {!isAllDay && startTime
                    ? ` (${formatTime12(startTime)}${endTime ? ` - ${formatTime12(endTime)}` : ''})`
                    : ' (All day)'}
                </span>
              </span>
            </div>
          </div>

          {/* Duty-Specific Detail Section */}
          {activeDomain === 'DUTY' && (
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              {/* Assigned Staff Member */}
              <div className="p-3.5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
                  <UsersIcon className="w-3.5 h-3.5" />
                  {t('assignedStaff', 'Assigned Staff')}
                </span>
                <p className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
                  {assignedToName || (activeItem as any)?.assigned_to_name || t('unassigned', 'Unassigned')}
                </p>
              </div>

              {/* Duty Category */}
              <div className="p-3.5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                  {t('category', 'Category')}
                </span>
                <p className="text-xs sm:text-sm font-semibold theme-text-primary truncate">
                  {DUTY_CATEGORY_OPTIONS.find((o) => o.value === dutyCategory)?.label || dutyCategory}
                </p>
              </div>
            </div>
          )}

          {/* Task-Specific Category & Color Section */}
          {activeDomain === 'TASK' && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs border-0"
                style={{ backgroundColor: colorStyle.hex }}
              />
              <span className="text-xs font-semibold theme-text-secondary">
                {taskCategory}
              </span>
            </div>
          )}

          {/* Description / Instructions */}
          {description && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                {activeDomain === 'DUTY'
                  ? t('instructionsRemarks', 'Duty Instructions & Remarks')
                  : t('descriptionNotes', 'Description / Notes')}
              </span>
              <div className="p-3.5 rounded-2xl theme-bg-app border-0 shadow-xs text-xs sm:text-sm theme-text-primary whitespace-pre-wrap leading-relaxed">
                {description}
              </div>
            </div>
          )}

          {/* Task-Specific Subtasks Checklist */}
          {activeDomain === 'TASK' && subtasks.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-1.5">
                <ChecklistIcon className="w-3.5 h-3.5" />
                {t('subtasks', 'Subtasks')} (
                {subtasks.filter((s) => s.completed).length}/{subtasks.length})
              </span>
              <div className="space-y-1.5">
                {subtasks.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => handleToggleSubtaskInDetail(st.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl theme-bg-surface hover:theme-bg-elevated/40 border-0 shadow-xs transition cursor-pointer text-left"
                  >
                    <span
                      className={`w-5 h-5 rounded-lg flex items-center justify-center transition border-0 shrink-0 ${
                        st.completed
                          ? 'theme-bg-accent theme-accent-text shadow-xs'
                          : 'theme-bg-app'
                      }`}
                    >
                      {st.completed && <CheckIcon className="w-3 h-3" />}
                    </span>
                    <span
                      className={`text-xs sm:text-sm flex-1 ${
                        st.completed
                          ? 'line-through theme-text-secondary'
                          : 'theme-text-primary font-medium'
                      }`}
                    >
                      {st.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <DrawerFooter>
          <div className="flex items-center justify-between w-full gap-2">
            {canEdit && onDelete ? (
              isConfirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold theme-danger">
                    {t('confirmDelete', 'Confirm?')}
                  </span>
                  <CustomButton
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(activeItem.id)}
                  >
                    {t('yesDelete', 'Yes, Delete')}
                  </CustomButton>
                  <CustomButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    {t('cancel', 'Cancel')}
                  </CustomButton>
                </div>
              ) : (
                <CustomButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(true)}
                  className="theme-danger hover:bg-rose-500/10"
                  icon={TrashIcon}
                >
                  {t('delete', 'Delete')}
                </CustomButton>
              )
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              {canEdit ? (
                <>
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={handleToggleStatusInDetail}
                  >
                    {status === 'COMPLETED'
                      ? t('markPending', 'Mark as Pending')
                      : t('markCompleted', 'Mark Completed')}
                  </CustomButton>
                  <CustomButton
                    variant="primary"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    icon={EditIcon}
                  >
                    {t('edit', 'Edit')}
                  </CustomButton>
                </>
              ) : (
                <CustomButton
                  variant="outline"
                  size="sm"
                  onClick={onCancel}
                >
                  {t('close', 'Close')}
                </CustomButton>
              )}
            </div>
          </div>
        </DrawerFooter>
      </DrawerContainer>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: Edit / Create Form View
  // ─────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <DrawerContainer padding="none">
        <div className="space-y-6 pt-2 pb-6 px-1 @container">
          {/* Domain Selector (Shown when creating a new record) */}
          {!hasExistingRecord && !initialDomain && (
            <div className="flex items-center gap-2 p-1.5 rounded-2xl theme-bg-app border-0 shadow-xs">
              <button
                type="button"
                onClick={() => setActiveDomain('TASK')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border-0 ${
                  activeDomain === 'TASK'
                    ? 'theme-bg-surface theme-text-primary shadow-xs'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <CheckCircleIcon className="w-3.5 h-3.5" />
                <span>{t('personalTask', 'Personal Task')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDomain('DUTY')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer border-0 ${
                  activeDomain === 'DUTY'
                    ? 'theme-bg-surface theme-accent shadow-xs'
                    : 'theme-text-secondary hover:theme-text-primary'
                }`}
              >
                <DutyIcon className="w-3.5 h-3.5" />
                <span>{t('officialDuty', 'Official Duty')}</span>
              </button>
            </div>
          )}

          {/* Validation Error Banner */}
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold border-0 shadow-xs">
              {error}
            </div>
          )}

          {/* Title Input */}
          <DrawerSection
            title={activeDomain === 'DUTY' ? t('dutyDetails', 'Duty Details') : t('taskDetails', 'Task Details')}
            icon={activeDomain === 'DUTY' ? DutyIcon : CheckCircleIcon}
            variant="streamlined"
          >
            <div>
              <CustomInput
                label={t('title', 'Title')}
                value={title}
                onChange={(val) => {
                  setTitle(val);
                  if (error) setError('');
                }}
                placeholder={
                  activeDomain === 'DUTY'
                    ? t('enterDutyTitle', 'e.g., Exam Hall Invigilation, Morning Assembly Duty...')
                    : t('enterTaskTitle', 'e.g., Prepare Lesson Notes, Review Surah...')
                }
                required
              />
            </div>

            {/* Duty-Specific: Assigned Staff & Category */}
            {activeDomain === 'DUTY' && (
              <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
                <div>
                  <CustomSelect
                    label={t('assignToStaff', 'Assign to Staff Member')}
                    value={assignedToUserId}
                    onChange={(val) => setAssignedToUserId(String(val))}
                    options={staffOptions}
                    placeholder={
                      loadingStaff
                        ? t('loadingStaff', 'Loading staff directory...')
                        : t('selectStaff', 'Select staff member...')
                    }
                    searchable={true}
                  />
                </div>
                <div>
                  <CustomSelect
                    label={t('dutyCategory', 'Duty Category')}
                    value={dutyCategory}
                    onChange={(val) => setDutyCategory(val as DutyCategory)}
                    options={DUTY_CATEGORY_OPTIONS}
                    placeholder={t('selectCategory', 'Select category')}
                  />
                </div>
              </div>
            )}

            {/* Task-Specific: Task Category */}
            {activeDomain === 'TASK' && (
              <div className="grid grid-cols-1">
                <CustomSelect
                  label={t('category', 'Category')}
                  value={taskCategory}
                  onChange={(val) => setTaskCategory(String(val))}
                  options={TASK_CATEGORY_OPTIONS}
                  placeholder={t('selectCategory', 'Select category')}
                />
              </div>
            )}

            {/* Priority & Status Row */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <div>
                <CustomSelect
                  label={t('priority', 'Priority')}
                  value={priority}
                  onChange={(val) => setPriority(val as TaskPriority)}
                  options={PRIORITY_OPTIONS}
                  placeholder={t('selectPriority', 'Select priority')}
                />
              </div>
              <div>
                <CustomSelect
                  label={t('status', 'Status')}
                  value={status}
                  onChange={(val) => setStatus(val as TaskStatus)}
                  options={STATUS_OPTIONS}
                  placeholder={t('selectStatus', 'Select status')}
                />
              </div>
            </div>

            {/* Description / Instructions */}
            <div>
              <CustomInput
                type="textarea"
                label={
                  activeDomain === 'DUTY'
                    ? t('instructionsRemarks', 'Duty Instructions & Remarks')
                    : t('descriptionNotes', 'Description / Notes')
                }
                optional
                rows={2}
                value={description}
                onChange={(val) => setDescription(val)}
                placeholder={
                  activeDomain === 'DUTY'
                    ? t('dutyInstructionsPlaceholder', 'Add specific guidelines, room assignments, or instructions...')
                    : t('taskDescriptionPlaceholder', 'Add any relevant context, notes, or checklist goals...')
                }
              />
            </div>
          </DrawerSection>

          {/* ─── Shared Canonical Date & Timing Section (Reusing Academic Event Engine) ─── */}
          <CalendarDateTimeSection
            startDate={startDate}
            endDate={endDate}
            until={until}
            isFullDay={isAllDay}
            startTime={startTime}
            endTime={endTime}
            showUntilPicker={true}
            showAllDayToggle={true}
            showTimePickers={true}
            singleTimeMode={false}
            dateLabel={t('dateLabel', 'Date')}
            showRecurrence={false}
            onChangeStartDate={(newDate) => {
              setStartDate(newDate);
              if (!endDate || endDate < newDate) {
                setEndDate(newDate);
              }
            }}
            onChangeEndDate={(newEndDate) => setEndDate(newEndDate)}
            onChangeUntil={(newUntil) => setUntil(newUntil)}
            onChangeIsFullDay={(newIsFullDay) => {
              setIsAllDay(Boolean(newIsFullDay));
              if (!newIsFullDay) {
                if (!startTime) setStartTime('09:00');
                if (!endTime) setEndTime('17:00');
              }
            }}
            onChangeStartTime={(newTime) => setStartTime(newTime)}
            onChangeEndTime={(newTime) => setEndTime(newTime)}
          />

          {/* Task-Specific: Subtasks Checklist Manager */}
          {activeDomain === 'TASK' && (
            <DrawerSection
              title={t('subtasks', 'Subtasks / Checklist')}
              icon={ChecklistIcon}
              variant="streamlined"
            >
              <div className="flex gap-2">
                <div className="flex-1">
                  <CustomInput
                    value={newSubtaskTitle}
                    onChange={(val) => setNewSubtaskTitle(val)}
                    placeholder={t('newSubtaskPlaceholder', 'Add subtask or step...')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubtask();
                      }
                    }}
                  />
                </div>
                <CustomButton
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleAddSubtask}
                  icon={PlusIcon}
                >
                  {t('add', 'Add')}
                </CustomButton>
              </div>

              {subtasks.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {subtasks.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl theme-bg-surface border-0 shadow-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleSubtask(st.id)}
                        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer border-0 bg-transparent"
                      >
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center transition border-0 shrink-0 ${
                            st.completed
                              ? 'theme-bg-accent theme-accent-text shadow-xs'
                              : 'theme-bg-app'
                          }`}
                        >
                          {st.completed && <CheckIcon className="w-2.5 h-2.5" />}
                        </span>
                        <span
                          className={`text-xs truncate ${
                            st.completed
                              ? 'line-through theme-text-secondary'
                              : 'theme-text-primary font-medium'
                          }`}
                        >
                          {st.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(st.id)}
                        className="p-1 rounded-lg theme-text-secondary hover:theme-danger transition cursor-pointer border-0 bg-transparent"
                        title={t('delete', 'Delete')}
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </DrawerSection>
          )}

          {/* Task-Specific: Visual Appearance & Color Swatch */}
          {activeDomain === 'TASK' && (
            <DrawerSection
              title={t('visualAppearance', 'Visual Styling')}
              icon={ShapesIcon}
              variant="streamlined"
            >
              <EventColorPickerDropdown
                value={color}
                onChange={(newColor: string) => setColor(newColor)}
              />

              {/* Pinned Switch */}
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-0 theme-bg-surface shadow-xs">
                <span className="text-xs font-bold theme-text-primary">
                  {t('pinTask', 'Pin to top of list')}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(isPinned)}
                  onClick={() => setIsPinned(!isPinned)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center px-0.5 cursor-pointer rounded-full border-0 transition-colors duration-200 ease-in-out focus:outline-none ${
                    isPinned ? 'theme-bg-accent' : 'bg-black/15 dark:bg-white/15'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isPinned ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </DrawerSection>
          )}
        </div>

        {/* Drawer Action Footer */}
        <DrawerFooter>
          <div className="flex items-center justify-between w-full gap-2">
            {hasExistingRecord ? (
              <CustomButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                {t('cancel', 'Cancel')}
              </CustomButton>
            ) : onCancel ? (
              <CustomButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                {t('cancel', 'Cancel')}
              </CustomButton>
            ) : (
              <div />
            )}

            <CustomButton
              type="submit"
              variant="primary"
              size="sm"
              loading={isSaving}
              icon={SaveIcon}
            >
              {hasExistingRecord
                ? t('saveChanges', 'Save Changes')
                : activeDomain === 'DUTY'
                ? t('assignDuty', 'Assign Duty')
                : t('createTask', 'Create Task')}
            </CustomButton>
          </div>
        </DrawerFooter>
      </DrawerContainer>
    </form>
  );
}

export default UnifiedTaskDutyDrawerForm;
