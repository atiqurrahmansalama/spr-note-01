/**
 * User Task Drawer Form (Right Sidebar Slide-over)
 * ==================================================
 * Allows creating and editing user-specific tasks, due dates, priorities,
 * subtask checklists, and personal color tags.
 * Reuses enterprise DrawerContainer, DrawerSection, DrawerFooter, and project design tokens.
 */

import React, { useState } from 'react';
import {
  DrawerContainer,
  DrawerSection,
  DrawerFooter,
} from '../../../../components/layout';
import CustomInput from '../../../../components/ui/CustomInput';
import CustomSelect from '../../../../components/ui/CustomSelect';
import CustomButton from '../../../../components/ui/CustomButton';
import {
  CheckCircleIcon,
  ClockIcon,
  ShapesIcon,
  ChecklistIcon,
  PlusIcon,
  TrashIcon,
  SaveIcon,
} from '../../../../components/ui/Icons';
import { EventColorPickerDropdown, InlineTimePicker } from './TimeScheduleDrawerForm';
import { useCalendarTranslation } from '../locales';
import type { UserPersonalTask, TaskPriority, TaskStatus, TaskSubItem } from '../types';

export interface UserTaskDrawerFormProps {
  task?: UserPersonalTask | null;
  initialDate?: string;
  onSave: (taskData: Partial<UserPersonalTask>) => void;
  onCancel?: () => void;
  onDelete?: (taskId: string) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low Priority' },
  { value: 'MEDIUM', label: 'Medium Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'URGENT', label: 'Urgent Priority' },
];

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
  onSave,
  onCancel,
  onDelete,
}: UserTaskDrawerFormProps) {
  const { t } = useCalendarTranslation();

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
              <CustomInput
                type="date"
                label={t('dueDate', 'Due Date')}
                value={dueDate}
                onChange={(val) => setDueDate(val)}
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
          onCancel={onCancel}
          cancelLabel={t('cancel', 'Cancel')}
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
