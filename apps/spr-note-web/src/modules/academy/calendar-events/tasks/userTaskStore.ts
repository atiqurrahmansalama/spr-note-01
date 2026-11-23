/**
 * User Personal Tasks Store (Offline-First, Multi-Tenant & User-Scoped)
 * ======================================================================
 * Manages personal to-do tasks, checklists, and priorities for the logged-in user.
 * Adheres to Rule 11 (Strict Tenant & User Scoping) and Rule 12 (Offline-First Concurrency).
 */

import type { UserPersonalTask, TaskPriority, TaskStatus } from '../types';

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('[userTaskStore] Listener error:', err);
    }
  });
}

function getStorageKey(tenantId?: string, userId?: string): string {
  const t = tenantId || 'default';
  const u = userId || 'me';
  return `spr_user_tasks_${t}_${u}`;
}

function getInitialDemoTasks(tenantId: string, userId: string): UserPersonalTask[] {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const inThreeDays = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];

  return [
    {
      id: `TASK-${Date.now()}-1`,
      tenantId,
      userId,
      title: 'Review Mid-Term Recitation Progress',
      description: 'Check mistakes and stuck counters for Hifz students and compile progress notes.',
      dueDate: today,
      dueTime: '11:00',
      priority: 'HIGH',
      status: 'PENDING',
      category: 'Teaching',
      color: 'blueberry',
      subtasks: [
        { id: 'st-1', title: 'Compile Surah Al-Baqarah recitation logs', completed: true },
        { id: 'st-2', title: 'Highlight recurring mistake trends', completed: false },
        { id: 'st-3', title: 'Submit report to Department Head', completed: false },
      ],
      isPinned: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `TASK-${Date.now()}-2`,
      tenantId,
      userId,
      title: 'Guardian Follow-up on Attendance Notice',
      description: 'Call parent regarding consecutive unexcused absence during morning shift.',
      dueDate: today,
      dueTime: '15:30',
      priority: 'URGENT',
      status: 'PENDING',
      category: 'Follow-up',
      color: 'radicchio',
      subtasks: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `TASK-${Date.now()}-3`,
      tenantId,
      userId,
      title: 'Prepare Next Week Lesson Plan Draft',
      description: 'Draft lesson structure for Tajweed and Quranic phonetics chapters.',
      dueDate: tomorrow,
      dueTime: '10:00',
      priority: 'MEDIUM',
      status: 'PENDING',
      category: 'Curriculum',
      color: 'eucalyptus',
      subtasks: [
        { id: 'st-4', title: 'Select target verses and exercises', completed: false },
        { id: 'st-5', title: 'Print copies for student desks', completed: false },
      ],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: `TASK-${Date.now()}-4`,
      tenantId,
      userId,
      title: 'Campus Facility Safety Inspection Checklist',
      description: 'Quarterly review of residential quarters and library air conditioning.',
      dueDate: inThreeDays,
      dueTime: '14:00',
      priority: 'LOW',
      status: 'COMPLETED',
      category: 'Admin',
      color: 'sage',
      completedAt: new Date().toISOString(),
      subtasks: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export const userTaskStore = {
  getTasks(tenantId?: string, userId?: string): UserPersonalTask[] {
    if (typeof window === 'undefined') return [];
    const key = getStorageKey(tenantId, userId);
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        const initial = getInitialDemoTasks(tenantId || 'default', userId || 'me');
        localStorage.setItem(key, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
    } catch {
      return [];
    }
  },

  getTasksForDate(tenantId?: string, userId?: string, dateStr?: string): UserPersonalTask[] {
    if (!dateStr) return [];
    const all = this.getTasks(tenantId, userId);
    return all.filter((t) => t.dueDate === dateStr);
  },

  saveTask(tenantId?: string, userId?: string, taskData?: Partial<UserPersonalTask>): UserPersonalTask {
    const key = getStorageKey(tenantId, userId);
    const existing = this.getTasks(tenantId, userId);
    const nowIso = new Date().toISOString();

    const isEdit = Boolean(taskData?.id && existing.some((t) => t.id === taskData.id));

    let finalTask: UserPersonalTask;

    if (isEdit) {
      finalTask = {
        ...existing.find((t) => t.id === taskData!.id)!,
        ...taskData,
        updatedAt: nowIso,
      };
      const updatedList = existing.map((t) => (t.id === finalTask.id ? finalTask : t));
      try {
        localStorage.setItem(key, JSON.stringify(updatedList));
      } catch (e) {
        console.error('[userTaskStore] Failed to save updated task:', e);
      }
    } else {
      finalTask = {
        id: taskData?.id || `TASK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tenantId: tenantId || 'default',
        userId: userId || 'me',
        title: (taskData?.title || 'New Task').trim(),
        description: taskData?.description || '',
        dueDate: taskData?.dueDate || new Date().toISOString().split('T')[0],
        dueTime: taskData?.dueTime || '',
        priority: taskData?.priority || 'MEDIUM',
        status: taskData?.status || 'PENDING',
        category: taskData?.category || 'General',
        color: taskData?.color || 'blueberry',
        subtasks: Array.isArray(taskData?.subtasks) ? taskData.subtasks : [],
        isPinned: Boolean(taskData?.isPinned),
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      const updatedList = [finalTask, ...existing];
      try {
        localStorage.setItem(key, JSON.stringify(updatedList));
      } catch (e) {
        console.error('[userTaskStore] Failed to save new task:', e);
      }
    }

    notify();
    return finalTask;
  },

  toggleTaskStatus(tenantId?: string, userId?: string, taskId?: string): UserPersonalTask | null {
    if (!taskId) return null;
    const key = getStorageKey(tenantId, userId);
    const existing = this.getTasks(tenantId, userId);
    const target = existing.find((t) => t.id === taskId);
    if (!target) return null;

    const newStatus: TaskStatus = target.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const updated: UserPersonalTask = {
      ...target,
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = existing.map((t) => (t.id === taskId ? updated : t));
    try {
      localStorage.setItem(key, JSON.stringify(updatedList));
    } catch {}

    notify();
    return updated;
  },

  setTaskStatus(
    tenantId?: string,
    userId?: string,
    taskId?: string,
    newStatus?: TaskStatus
  ): UserPersonalTask | null {
    if (!taskId || !newStatus) return null;
    const key = getStorageKey(tenantId, userId);
    const existing = this.getTasks(tenantId, userId);
    const target = existing.find((t) => t.id === taskId);
    if (!target) return null;

    const updated: UserPersonalTask = {
      ...target,
      status: newStatus,
      completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = existing.map((t) => (t.id === taskId ? updated : t));
    try {
      localStorage.setItem(key, JSON.stringify(updatedList));
    } catch {}

    notify();
    return updated;
  },

  deleteTask(tenantId?: string, userId?: string, taskId?: string): boolean {
    if (!taskId) return false;
    const key = getStorageKey(tenantId, userId);
    const existing = this.getTasks(tenantId, userId);
    const updatedList = existing.filter((t) => t.id !== taskId);
    try {
      localStorage.setItem(key, JSON.stringify(updatedList));
    } catch {}

    notify();
    return true;
  },

  toggleSubtask(
    tenantId?: string,
    userId?: string,
    taskId?: string,
    subtaskId?: string
  ): UserPersonalTask | null {
    if (!taskId || !subtaskId) return null;
    const key = getStorageKey(tenantId, userId);
    const existing = this.getTasks(tenantId, userId);
    const target = existing.find((t) => t.id === taskId);
    if (!target) return null;

    const subtasks = (target.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );

    const updated: UserPersonalTask = {
      ...target,
      subtasks,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = existing.map((t) => (t.id === taskId ? updated : t));
    try {
      localStorage.setItem(key, JSON.stringify(updatedList));
    } catch {}

    notify();
    return updated;
  },

  getMetrics(tenantId?: string, userId?: string) {
    const tasks = this.getTasks(tenantId, userId);
    const today = new Date().toISOString().split('T')[0];

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === 'COMPLETED').length;
    const pending = tasks.filter((t) => t.status !== 'COMPLETED').length;
    const dueToday = tasks.filter((t) => t.dueDate === today && t.status !== 'COMPLETED').length;
    const overdue = tasks.filter((t) => t.dueDate < today && t.status !== 'COMPLETED').length;
    const highPriority = tasks.filter(
      (t) => (t.priority === 'HIGH' || t.priority === 'URGENT') && t.status !== 'COMPLETED'
    ).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      dueToday,
      overdue,
      highPriority,
      completionRate,
    };
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
