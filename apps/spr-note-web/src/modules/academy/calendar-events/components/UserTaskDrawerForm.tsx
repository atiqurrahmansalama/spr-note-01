/**
 * User Personal Task Drawer Form Adapter
 * ========================================
 * Thin backward-compatible adapter wrapping UnifiedTaskDutyDrawerForm
 * in 'TASK' domain mode.
 */

import React from 'react';
import UnifiedTaskDutyDrawerForm from './UnifiedTaskDutyDrawerForm';
import type { UserPersonalTask } from '../types';

export interface UserTaskDrawerFormProps {
  task?: UserPersonalTask | null;
  initialDate?: string;
  initialEditMode?: boolean;
  onSave: (taskData: Partial<UserPersonalTask>) => void;
  onQuickUpdate?: (taskData: Partial<UserPersonalTask>) => void;
  onCancel?: () => void;
  onDelete?: (taskId: string) => void;
}

export function UserTaskDrawerForm({
  task,
  initialDate,
  initialEditMode,
  onSave,
  onQuickUpdate,
  onCancel,
  onDelete,
}: UserTaskDrawerFormProps) {
  return (
    <UnifiedTaskDutyDrawerForm
      task={task}
      initialDomain="TASK"
      initialDate={initialDate}
      initialEditMode={initialEditMode}
      onSave={onSave}
      onQuickUpdate={onQuickUpdate}
      onCancel={onCancel}
      onDelete={onDelete}
    />
  );
}

export default UserTaskDrawerForm;
