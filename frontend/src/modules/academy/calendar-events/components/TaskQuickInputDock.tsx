/**
 * TaskQuickInputDock Component
 * =============================
 * Frictionless, sticky bottom-center quick task capture dock powered by FloatingActionDock.
 * Adheres strictly to Rule 14 (borderless, soft-surface, ring-0, Apple/Linear minimalist design).
 * Centered strictly within the page container bounds (mx-auto sticky positioning).
 * Features rounded-full capsule form factor, instant Enter-to-submit keyboard flow,
 * and project standard ActionMenu for Low, Medium, High, and Urgent priority selection.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FloatingActionDock } from '../../../../components/ui/FloatingActionDock';
import ActionMenu, { ActionMenuItem, ActionMenuHeader } from '../../../../components/ui/ActionMenu';
import {
  PlusIcon,
  AdjustmentsHorizontalIcon,
} from '../../../../components/ui/Icons';
import { useCalendarTranslation } from '../locales';
import { useUserTasks } from '../tasks/useUserTasks';
import type { TaskPriority, UserPersonalTask } from '../types';

export interface TaskQuickInputDockProps {
  onOpenDrawer: (task?: Partial<UserPersonalTask> | null, date?: string) => void;
  visible?: boolean;
}

// Semantic priority dots for ActionMenu items
const LowPriorityDot: React.FC<{ className?: string }> = () => (
  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0 inline-block" />
);

const MediumPriorityDot: React.FC<{ className?: string }> = () => (
  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0 inline-block" />
);

const HighPriorityDot: React.FC<{ className?: string }> = () => (
  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0 inline-block" />
);

const UrgentPriorityDot: React.FC<{ className?: string }> = () => (
  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 inline-block" />
);

export const TaskQuickInputDock: React.FC<TaskQuickInputDockProps> = ({
  onOpenDrawer,
  visible = true,
}) => {
  const { t } = useCalendarTranslation();
  const { saveTask } = useUserTasks();

  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const inputRef = useRef<HTMLInputElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Quick submit handler (keyboard Enter)
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    saveTask({
      title: trimmed,
      dueDate: todayStr,
      priority,
      status: 'PENDING',
      category: 'General',
      color: priority === 'URGENT' ? 'radicchio' : priority === 'HIGH' ? 'blueberry' : 'eucalyptus',
    });

    setTitle('');
    // Retain focus for friction-free rapid task entry
    inputRef.current?.focus();
  };

  // Open full drawer with current input pre-populated
  const handleOpenDrawerWithDraft = () => {
    onOpenDrawer(
      {
        title: title.trim(),
        priority,
        dueDate: todayStr,
        status: 'PENDING',
        category: 'General',
      },
      todayStr
    );
    setTitle('');
  };

  // Global hotkey: Pressing 'n' or 'N' (when not focused in an input/textarea) focuses the dock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'n' || e.key === 'N') &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        const isEditable = document.activeElement?.getAttribute('contenteditable') === 'true';
        if (activeTag !== 'input' && activeTag !== 'textarea' && !isEditable) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Project ActionMenu items for Priority Selection & Drawer Opener
  const priorityMenuItems: ActionMenuItem[] = useMemo(
    () => [
      {
        label: t('lowPriority', 'Low Priority'),
        active: priority === 'LOW',
        icon: LowPriorityDot,
        onClick: () => setPriority('LOW'),
      },
      {
        label: t('mediumPriority', 'Medium Priority'),
        active: priority === 'MEDIUM',
        icon: MediumPriorityDot,
        onClick: () => setPriority('MEDIUM'),
      },
      {
        label: t('highPriority', 'High Priority'),
        active: priority === 'HIGH',
        icon: HighPriorityDot,
        onClick: () => setPriority('HIGH'),
      },
      {
        label: t('urgentPriority', 'Urgent Priority'),
        active: priority === 'URGENT',
        icon: UrgentPriorityDot,
        onClick: () => setPriority('URGENT'),
      },
      {
        divider: true,
      },
      {
        label: t('moreTaskDetails', 'More task details...'),
        icon: AdjustmentsHorizontalIcon,
        onClick: handleOpenDrawerWithDraft,
      },
    ],
    [priority, t]
  );

  if (!visible) return null;

  return (
    <FloatingActionDock
      visible={true}
      positioning="sticky"
      roundedClass="rounded-full"
      maxWidthClass="max-w-xl"
      innerClassName="px-3 py-1.5 sm:px-4 sm:py-2"
      className="task-quick-input-dock"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full flex items-center gap-2 sm:gap-2.5"
      >
        {/* Visual Accent Icon */}
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--accent-main)]/10 text-[var(--accent-main)] flex items-center justify-center shrink-0">
          <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>

        {/* Instant Input Field */}
        <input
          ref={inputRef}
          type="text"
          placeholder={t(
            'quickAddPlaceholder',
            'Add a task for today... (Press Enter to save)'
          )}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              inputRef.current?.blur();
            }
          }}
          className="flex-1 min-w-0 bg-transparent border-0 ring-0 outline-none text-xs sm:text-sm font-medium theme-text-primary placeholder:theme-text-secondary"
        />

        {/* Project ActionMenu Trigger (Customizer Icon Button) */}
        <ActionMenu
          icon={AdjustmentsHorizontalIcon}
          align="right"
          size="sm"
          variant="ghost"
          buttonClassName="hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer border-0 ring-0 shrink-0"
          items={priorityMenuItems}
          header={<ActionMenuHeader title={t('priority', 'Priority')} />}
          ariaLabel={t('taskOptions', 'Task Priority & Options')}
        />
      </form>
    </FloatingActionDock>
  );
};

export default TaskQuickInputDock;
