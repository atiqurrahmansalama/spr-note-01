/**
 * Reactive React Hook for User Personal Tasks
 * ============================================
 * Provides synchronized state, optimistic updates, and tenant/user scoping.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTenant } from '../../../../context/TenantContext';
import { useAuth } from '../../../../context/AuthContext';
import { userTaskStore } from './userTaskStore';
import type { UserPersonalTask } from '../types';

export function useUserTasks() {
  const { activeTenantId } = useTenant();
  const { user } = useAuth() as any;
  const userId = user?.id || user?.username || user?.email || 'me';

  const [tasks, setTasks] = useState<UserPersonalTask[]>(() =>
    userTaskStore.getTasks(activeTenantId, userId)
  );

  useEffect(() => {
    // Sync on initial load and when tenant/user changes
    setTasks(userTaskStore.getTasks(activeTenantId, userId));

    const unsubscribe = userTaskStore.subscribe(() => {
      setTasks(userTaskStore.getTasks(activeTenantId, userId));
    });

    return unsubscribe;
  }, [activeTenantId, userId]);

  const saveTask = useCallback(
    (taskData: Partial<UserPersonalTask>) => {
      return userTaskStore.saveTask(activeTenantId, userId, taskData);
    },
    [activeTenantId, userId]
  );

  const toggleTaskStatus = useCallback(
    (taskId: string) => {
      return userTaskStore.toggleTaskStatus(activeTenantId, userId, taskId);
    },
    [activeTenantId, userId]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      return userTaskStore.deleteTask(activeTenantId, userId, taskId);
    },
    [activeTenantId, userId]
  );

  const toggleSubtask = useCallback(
    (taskId: string, subtaskId: string) => {
      return userTaskStore.toggleSubtask(activeTenantId, userId, taskId, subtaskId);
    },
    [activeTenantId, userId]
  );

  const metrics = useMemo(() => {
    return userTaskStore.getMetrics(activeTenantId, userId);
  }, [tasks, activeTenantId, userId]);

  const getTasksForDate = useCallback(
    (dateStr: string) => {
      return tasks.filter((t) => t.dueDate === dateStr);
    },
    [tasks]
  );

  return {
    tasks,
    metrics,
    saveTask,
    toggleTaskStatus,
    deleteTask,
    toggleSubtask,
    getTasksForDate,
    activeTenantId,
    userId,
  };
}
