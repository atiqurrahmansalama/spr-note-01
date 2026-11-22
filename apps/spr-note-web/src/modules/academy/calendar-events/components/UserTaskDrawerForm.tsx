/**
 * User Task Drawer Form (Right Sidebar Slide-over)
 * ==================================================
 * Allows viewing task details in read-only mode by default,
 * and transitioning to edit mode upon clicking the 'Edit Task' button.
 * Supports task creation, editing, due dates, priorities, subtask checklists,
 * and personal color tags.
 * Reuses enterprise DrawerContainer, DrawerSection, DrawerFooter, and project design tokens.
 */

import React, { useState, useMemo } from 'react';
import {
  DrawerContainer,
  DrawerSection,
  DrawerFooter,
} from '../../../../components/layout';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import ReusableCalendar from '../../../../components/common/ReusableCalendar';
import {
  CheckCircleIcon,
  ClockIcon,
  ShapesIcon,
  ChecklistIcon,
  PlusIcon,
  TrashIcon,
  SaveIcon,
  EditIcon,
} from '../../../../components/ui/Icons';
import {
  EVENT_COLORS,
  resolveCanonicalEventColor,
} from '../constants/eventColors';
import {
  EventColorPickerDropdown,
  InlineTimePicker,
} from './TimeScheduleDrawerForm';
import { useCalendarTranslation } from '../locales';
import type { UserPersonalTask, TaskPriority, TaskStatus, TaskSubItem } from '../types';

export interface UserTaskDrawerFormProps {
  task?: UserPersonalTask | null;
  initialDate?: string;
  initialEditMode?: boolean;
  onSave: (taskData: Partial<UserPersonalTask>) => void;
  onQuickUpdate?: (taskData: Partial<UserPersonalTask>) => void;
  onCancel?: () => void;
  onDelete?: (taskId: string) => void;
}

function formatTime12(timeStr?: string): string {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':');
  let h = parseInt(parts[0], 10);
  const m = String(parts[1] || '00').padStart(2, '0');
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m}${ampm}`;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent Priority' },
];

const PRIORITY_STYLE_MAP: Record<TaskPriority, { label: string; badge: string }> = {
  LOW: { label: 'Low Priority', badge: 'theme-bg-app theme-text-secondary' },
  MEDIUM: { label: 'Medium Priority', badge: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  HIGH: { label: 'High Priority', badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  URGENT: { label: 'Urgent Priority', badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
};

const CATEGORY_OPTIONS = [
  { value: 'General', label: 'General' },
  { value: 'Teaching', label: 'Teaching & Classroom' },
  { value: 'Curriculum', label: 'Curriculum & Lessons' },
  { value: 'Follow-up', label: 'Guardian / Student Follow-up' },
  { value: 'Admin', label: 'Institutional Administration' },
  { value: 'Personal', label: 'Personal Reminder' },
];

export function UserTaskDrawerForm({
  task,
  initialDate,
  initialEditMode,
  onSave,
  onQuickUpdate,
  onCancel,
  onDelete,
}: UserTaskDrawerFormProps) {
  const { t } = useCalendarTranslation();

  // If task exists, start in read-only detail view by default; otherwise start in edit/create mode
  const [isEditing, setIsEditing] = useState<boolean>(initialEditMode ?? !task);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate || initialDate || new Date().toISOString().split('T')[0]
  );
  const [dueTime, setDueTime] = useState(task?.dueTime || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'MEDIUM');
  const [status, setStatus] = useState<TaskStatus>(task?.status || 'PENDING');
  const [category, setCategory] = useState(task?.category || 'General');
  const [color, setColor] = useState(task?.color || 'blueberry');
  const [isPinned, setIsPinned] = useState(Boolean(task?.isPinned));
  const [subtasks, setSubtasks] = useState<TaskSubItem[]>(task?.subtasks || []);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [error, setError] = useState('');

  // Resolved Visual Styling
  const canonicalColorId = resolveCanonicalEventColor(color, 'blueberry');
  const colorStyle = useMemo(() => {
    return EVENT_COLORS.find((c) => c.id === canonicalColorId) || EVENT_COLORS[0];
  }, [canonicalColorId]);

  const priorityStyle = PRIORITY_STYLE_MAP[priority] || PRIORITY_STYLE_MAP.MEDIUM;

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
    if (task && onQuickUpdate) {
      onQuickUpdate({
        id: task.id,
        subtasks: updatedSubtasks,
      });
    }
  };

  const handleToggleStatusInDetail = () => {
    const nextStatus: TaskStatus = status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    setStatus(nextStatus);
    if (task && onQuickUpdate) {
      onQuickUpdate({
        id: task.id,
        status: nextStatus,
      });
    }
  };

  const handleRemoveSubtask = (stId: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== stId));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setError(t('titleRequiredError', 'Please enter a task title.'));
      return;
    }
    setError('');

    onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      dueTime: dueTime || '',
      priority,
      status,
      category,
      color,
      isPinned,
      subtasks,
    });
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // MODE 1: READ-ONLY TASK DETAILS VIEW (Non-editable initial state for existing tasks)
  // ═════════════════════════════════════════════════════════════════════════════
  if (!isEditing && task) {
    const completedSubtasksCount = subtasks.filter((st) => st.completed).length;

    return (
      <DrawerContainer padding="none" spacing="normal">
        <div className="space-y-6 pt-2 pb-6 @container">
          {/* Top Hero Summary Surface */}
          <div className="p-4 sm:p-5 rounded-3xl theme-bg-surface border-0 shadow-xs space-y-3.5">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${colorStyle.style.bg} border-0 shadow-xs`}
              >
                <CheckCircleIcon className={`w-5 h-5 ${colorStyle.style.text}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3
                    className={`text-base font-bold theme-text-primary leading-snug break-words ${
                      status === 'COMPLETED' ? 'line-through opacity-70' : ''
                    }`}
                  >
                    {title}
                  </h3>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: colorStyle.hex }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Status Badge (Click to toggle complete / pending) */}
                  <button
                    type="button"
                    onClick={handleToggleStatusInDetail}
                    title={status === 'COMPLETED' ? t('markAsPending', 'Mark as Pending') : t('markAsCompleted', 'Mark as Completed')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold rounded-lg border-0 cursor-pointer shadow-2xs hover:opacity-85 active:scale-95 transition-all ${
                      status === 'COMPLETED'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`}
                    />
                    <span>
                      {status === 'COMPLETED'
                        ? t('completedTasks', 'Completed')
                        : t('pendingTasks', 'Pending')}
                    </span>
                  </button>

                  {/* Priority Badge */}
                  <span
                    className={`inline-flex px-2.5 py-0.5 text-[11px] font-semibold rounded-lg border-0 ${priorityStyle.badge}`}
                  >
                    {priorityStyle.label}
                  </span>

                  {/* Category Badge */}
                  <span className="inline-flex px-2.5 py-0.5 text-[11px] font-medium rounded-lg theme-bg-app border-0 theme-text-secondary">
                    {category}
                  </span>

                  {/* Pinned Badge */}
                  {isPinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold theme-bg-accent-soft theme-accent border-0">
                      <span>{t('pinTask', 'Pinned')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Description Card */}
            {description && (
              <div className="p-3.5 rounded-2xl theme-bg-app border-0 text-xs theme-text-secondary leading-relaxed whitespace-pre-wrap">
                {description}
              </div>
            )}
          </div>

          {/* Schedule & Timing Details Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1">
              <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                {t('scheduleAndTiming', 'Schedule & Timing')}
              </h4>
            </div>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5 text-xs">
              {/* Due Date */}
              <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
                <span className="theme-text-secondary font-medium">{t('dueDate', 'Due Date')}</span>
                <span className="font-mono font-bold theme-text-primary">
                  {dueDate || t('notSpecified', 'Not Specified')}
                </span>
              </div>

              {/* Due Time */}
              <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
                <span className="theme-text-secondary font-medium">{t('dueTime', 'Due Time')}</span>
                <span className="font-mono font-bold theme-text-primary">
                  {dueTime ? formatTime12(dueTime) : t('notSpecified', 'Not Specified')}
                </span>
              </div>

              {/* Category */}
              <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
                <span className="theme-text-secondary font-medium">{t('category', 'Category')}</span>
                <span className="font-semibold theme-text-primary">{category}</span>
              </div>

              {/* Priority */}
              <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl theme-bg-surface border-0 shadow-xs">
                <span className="theme-text-secondary font-medium">{t('priority', 'Priority')}</span>
                <span className="font-semibold theme-text-primary">{priorityStyle.label}</span>
              </div>
            </div>
          </div>

          {/* Checklist / Subtasks (if any) */}
          {subtasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-1">
                <div className="flex items-center gap-2">
                  <ChecklistIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
                    {t('checklist', 'Checklist & Subtasks')} ({completedSubtasksCount}/{subtasks.length})
                  </h4>
                </div>
              </div>

              <div className="space-y-1.5">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtaskInDetail(st.id)}
                    className="flex items-center gap-2.5 p-3 rounded-2xl theme-bg-surface hover:theme-bg-elevated/40 transition-colors border-0 cursor-pointer shadow-2xs select-none"
                  >
                    <input
                      type="checkbox"
                      checked={st.completed}
                      readOnly
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 border-0 cursor-pointer pointer-events-none"
                    />
                    <span
                      className={`text-xs font-medium truncate ${
                        st.completed
                          ? 'line-through opacity-60 theme-text-secondary'
                          : 'theme-text-primary'
                      }`}
                    >
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inline Delete Confirmation or Action Buttons */}
          {isConfirmingDelete ? (
            <div className="p-4 rounded-3xl bg-rose-500/10 dark:bg-rose-950/30 border-0 space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2">
                <TrashIcon className="w-4 h-4 theme-danger shrink-0" />
                <h4 className="text-xs font-bold theme-text-primary">
                  {t('confirmDeleteTask', 'Delete this task?')}
                </h4>
              </div>
              <p className="text-xs theme-text-secondary leading-relaxed">
                {title}
              </p>
              <div className="flex items-center justify-end gap-2 pt-1 border-0">
                <CustomButton
                  type="button"
                  variant="surface"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(false)}
                >
                  {t('cancel', 'Cancel')}
                </CustomButton>
                <CustomButton
                  type="button"
                  variant="danger-solid"
                  size="sm"
                  icon={TrashIcon}
                  onClick={() => {
                    if (onDelete && task) {
                      onDelete(task.id);
                    }
                  }}
                >
                  {t('delete', 'Delete')}
                </CustomButton>
              </div>
            </div>
          ) : (
            /* Action Buttons Bar */
            <div className="pt-2 border-0 flex items-center justify-between gap-2.5 flex-wrap">
              {onDelete && task && (
                <CustomButton
                  type="button"
                  variant="danger"
                  size="md"
                  icon={TrashIcon}
                  onClick={() => setIsConfirmingDelete(true)}
                >
                  {t('delete', 'Delete')}
                </CustomButton>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <CustomButton
                  type="button"
                  variant="primary"
                  size="md"
                  icon={EditIcon}
                  onClick={() => setIsEditing(true)}
                >
                  {t('editTask', 'Edit Task')}
                </CustomButton>
              </div>
            </div>
          )}
        </div>
      </DrawerContainer>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MODE 2: EDITABLE TASK FORM (Active when editing existing task or creating new task)
  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6 pt-2 pb-6 @container">
        
        {/* ─── 1. Task Information ─── */}
        <DrawerSection
          title={t('taskInformation', 'Task Information')}
          icon={CheckCircleIcon}
          variant="streamlined"
        >
          {/* Title */}
          <div>
            <CustomInput
              label={t('taskTitle', 'Task Title')}
              placeholder={t('taskTitlePlaceholder', 'e.g. Grade 10th Tajweed Papers, Follow-up on Absences...')}
              value={title}
              onChange={(val) => {
                setTitle(val);
                if (error) setError('');
              }}
              error={error}
            />
          </div>

          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label={t('category', 'Category')}
                value={category}
                onChange={(val) => setCategory(val)}
                options={CATEGORY_OPTIONS}
                placeholder={t('category', 'Select Category')}
              />
            </div>

            <div>
              <CustomSelect
                label={t('priority', 'Priority')}
                value={priority}
                onChange={(val) => setPriority(val as TaskPriority)}
                options={PRIORITY_OPTIONS}
                placeholder={t('priority', 'Select Priority')}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <CustomInput
              type="textarea"
              label={t('descriptionNotes', 'Description')}
              optional
              rows={2}
              value={description}
              onChange={(val) => setDescription(val)}
              placeholder={t('taskDescriptionPlaceholder', 'Add instructions, remarks or agenda details...')}
            />
          </div>
        </DrawerSection>

        {/* ─── 2. Due Date & Time ─── */}
        <DrawerSection
          title={t('dateAndTiming', 'Due Date & Timing')}
          icon={ClockIcon}
          variant="streamlined"
        >
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
            <div>
              <ReusableCalendar
                label={t('dueDate', 'Due Date')}
                selectedDate={dueDate}
                onSelectDate={(newDate) => setDueDate(newDate)}
              />
            </div>

            <div>
              <InlineTimePicker
                label={t('dueTime', 'Due Time (Optional)')}
                value={dueTime}
                onChange={(val) => setDueTime(val)}
                placeholder={t('chooseTime', 'Choose Time')}
              />
            </div>
          </div>

          {/* Pinned / Starred Toggle */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl border-0 theme-bg-surface shadow-xs">
            <div>
              <span className="text-xs font-bold theme-text-primary block">
                {t('pinTask', 'Pin Task')}
              </span>
              <span className="text-[10px] theme-text-secondary">
                {t('pinTaskHint', 'Keep pinned at the top of your checklist')}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPinned}
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

        {/* ─── 3. Checklist / Subtasks ─── */}
        <DrawerSection
          title={`${t('checklist', 'Checklist & Subtasks')} (${subtasks.length})`}
          icon={ChecklistIcon}
          variant="streamlined"
        >
          {/* Add Subtask Row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <CustomInput
                placeholder={t('addSubtaskPlaceholder', 'Add subtask step...')}
                value={newSubtaskTitle}
                onChange={(val) => setNewSubtaskTitle(val)}
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
              variant="card"
              size="sm"
              icon={PlusIcon}
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim()}
              title={t('addSubtask', 'Add Step')}
            >
              <span>{t('add', 'Add')}</span>
            </CustomButton>
          </div>

          {/* Subtask Items List */}
          {subtasks.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {subtasks.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl theme-bg-surface hover:theme-bg-elevated/40 transition-colors border-0 group shadow-2xs"
                >
                  <label className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={st.completed}
                      onChange={() => handleToggleSubtask(st.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-0 border-0 cursor-pointer"
                    />
                    <span
                      className={`text-xs font-medium truncate ${
                        st.completed
                          ? 'line-through opacity-60 theme-text-secondary'
                          : 'theme-text-primary'
                      }`}
                    >
                      {st.title}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(st.id)}
                    className="p-1 text-rose-500/70 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border-0"
                    title={t('remove', 'Remove')}
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DrawerSection>

        {/* ─── 4. Visual Appearance ─── */}
        <DrawerSection
          title={t('visualAppearance', 'Visual Appearance')}
          icon={ShapesIcon}
          variant="streamlined"
        >
          <EventColorPickerDropdown
            value={color}
            onChange={(val) => setColor(val)}
          />
        </DrawerSection>

        {/* Reusable Drawer Footer */}
        <DrawerFooter
          saveLabel={task ? t('updateTask', 'Update Task') : t('createTask', 'Create Task')}
          saveIcon={SaveIcon}
          onSubmit={handleSubmit}
          extraButtons={
            task && onDelete ? (
              <CustomButton
                type="button"
                variant="danger"
                size="md"
                icon={TrashIcon}
                onClick={() => {
                  if (window.confirm(t('confirmDeleteTask', 'Delete this task?'))) {
                    onDelete(task.id);
                  }
                }}
              >
                {t('delete', 'Delete')}
              </CustomButton>
            ) : null
          }
        />
      </form>
    </DrawerContainer>
  );
}

export default UserTaskDrawerForm;
