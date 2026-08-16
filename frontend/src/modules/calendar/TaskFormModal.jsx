import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon } from '../../components/ui/Icons';
import { createInstitutionalTask, updateInstitutionalTask } from '../../api/calendar';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';

export default function TaskFormModal({ isOpen, onClose, taskData, onSaved, initialDate }) {
  const { showToast } = useToast();
  const isEditing = Boolean(taskData);

  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: initialDate || new Date().toISOString().split('T')[0],
    due_time: '17:00',
    priority: 'MEDIUM',
    category: 'GENERAL',
    assigned_to: '',
  });

  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUsers = async () => {
      try {
        const res = await fetchWithAuth('/api/v1/users/?limit=100');
        if (res.ok) {
          const data = await res.json();
          setUsers(Array.isArray(data) ? data : data.results || []);
        }
      } catch (err) {
        console.warn('Error fetching users for task assignment:', err);
      }
    };

    fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (taskData) {
      setForm({
        title: taskData.title || '',
        description: taskData.description || '',
        due_date: taskData.due_date || new Date().toISOString().split('T')[0],
        due_time: taskData.due_time ? taskData.due_time.slice(0, 5) : '17:00',
        priority: taskData.priority || 'MEDIUM',
        category: taskData.category || 'GENERAL',
        assigned_to: taskData.assigned_to || '',
      });
    } else if (initialDate) {
      setForm((prev) => ({ ...prev, due_date: initialDate }));
    }
  }, [taskData, initialDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Task title is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        due_date: form.due_date || null,
        due_time: form.due_time ? `${form.due_time}:00` : null,
        priority: form.priority,
        category: form.category,
        assigned_to: form.assigned_to ? Number(form.assigned_to) : null,
      };

      if (isEditing) {
        await updateInstitutionalTask(taskData.id, payload);
        showToast('Institutional task updated!', 'success');
      } else {
        await createInstitutionalTask(payload);
        showToast('Institutional task created!', 'success');
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
      showToast(err.message || 'Failed to save task', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-md rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <PlusIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">
                {isEditing ? 'Edit Institutional Task' : 'Add Institutional Task'}
              </h2>
              <p className="text-xs theme-text-secondary">
                Assign administrative, academic, or campus To-Do tasks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Verify Hifz Final Exam Question Papers"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
            />
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Priority Level
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              >
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              >
                <option value="GENERAL">General</option>
                <option value="ACADEMIC">Academic</option>
                <option value="EXAMINATION">Examination</option>
                <option value="ADMINISTRATIVE">Administrative</option>
                <option value="FACILITIES">Campus Facilities</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold theme-text-secondary mb-1">
                Due Time
              </label>
              <input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Assignee (Staff / Admin)
            </label>
            <select
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
            >
              <option value="">-- Unassigned (Public Institutional Task) --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.username} ({u.email || u.phone_number || 'Staff'})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold theme-text-secondary mb-1">
              Task Scope / Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Instructions or action items..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3.5 py-2 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t theme-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 disabled:opacity-50 text-xs font-semibold shadow transition-all cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
