import React, { useState, useEffect } from 'react';
import {
  ClassIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/ui/Icons';
import { getTeacherAssignments, assignTeacherClass, deleteTeacherAssignment } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';

export default function TeacherAssignmentModal({ isOpen, onClose, teacher, onUpdated }) {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New assignment form
  const [form, setForm] = useState({
    student_class: '',
    student_group: '',
    session: '',
    role_in_class: 'LEAD_TEACHER',
  });

  useEffect(() => {
    if (!isOpen || !teacher) return;

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [assignRes, classRes, groupRes, sessRes] = await Promise.all([
          getTeacherAssignments({ teacher: teacher.id }),
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/groups/'),
          fetchWithAuth('/api/v1/sessions/'),
        ]);

        setAssignments(Array.isArray(assignRes) ? assignRes : assignRes.results || []);

        if (classRes.ok) {
          const classData = await classRes.json();
          setClasses(Array.isArray(classData) ? classData : classData.results || []);
        }
        if (groupRes.ok) {
          const groupData = await groupRes.json();
          setGroups(Array.isArray(groupData) ? groupData : groupData.results || []);
        }
        if (sessRes.ok) {
          const sessData = await sessRes.json();
          const sessList = Array.isArray(sessData) ? sessData : sessData.results || [];
          setSessions(sessList);
          const activeSess = sessList.find((s) => s.is_active);
          if (activeSess) {
            setForm((prev) => ({ ...prev, session: activeSess.id }));
          }
        }
      } catch (err) {
        console.error('Error loading assignments:', err);
        showToast('Failed to load assignments', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isOpen, teacher, showToast]);

  if (!isOpen || !teacher) return null;

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!form.student_class || !form.session) {
      showToast('Please select a Class and Academic Session.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        teacher: teacher.id,
        student_class: Number(form.student_class),
        student_group: form.student_group ? Number(form.student_group) : null,
        session: Number(form.session),
        role_in_class: form.role_in_class,
      };

      await assignTeacherClass(payload);
      showToast('Teacher assigned to class successfully!', 'success');

      // Refresh list
      const updated = await getTeacherAssignments({ teacher: teacher.id });
      setAssignments(Array.isArray(updated) ? updated : updated.results || []);
      if (onUpdated) onUpdated();

      // Reset form selection
      setForm((prev) => ({ ...prev, student_class: '', student_group: '' }));
    } catch (err) {
      console.error('Error assigning teacher:', err);
      showToast(err.message || 'Failed to assign class', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await deleteTeacherAssignment(assignmentId);
      showToast('Class assignment removed.', 'info');
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to remove assignment', 'error');
    }
  };

  const filteredGroups = form.student_class
    ? groups.filter((g) => String(g.student_class) === String(form.student_class))
    : groups;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
              <ClassIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">
                Teacher Academic Assignments
              </h2>
              <p className="text-xs theme-text-secondary">
                {teacher.user_name || teacher.employee_id} • {teacher.designation}
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Add New Assignment Form */}
          <form onSubmit={handleAssignSubmit} className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-1.5">
              <PlusIcon className="w-4 h-4 text-sky-400" />
              <span>Assign New Class / Group</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Class Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Target Class <span className="text-rose-400">*</span>
                </label>
                <select
                  value={form.student_class}
                  onChange={(e) => setForm({ ...form, student_class: e.target.value, student_group: '' })}
                  required
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || 'Class'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group / Halqa Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Specific Group (Optional)
                </label>
                <select
                  value={form.student_group}
                  onChange={(e) => setForm({ ...form, student_group: e.target.value })}
                  disabled={!form.student_class}
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 disabled:opacity-40 cursor-pointer"
                >
                  <option value="">All Groups in Class</option>
                  {filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Session Dropdown */}
              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Academic Session <span className="text-rose-400">*</span>
                </label>
                <select
                  value={form.session}
                  onChange={(e) => setForm({ ...form, session: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="">-- Choose Session --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.is_active ? '(Active)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role in Class */}
              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Role in Class
                </label>
                <select
                  value={form.role_in_class}
                  onChange={(e) => setForm({ ...form, role_in_class: e.target.value })}
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="LEAD_TEACHER">Lead Class Teacher</option>
                  <option value="ASSISTANT_TEACHER">Assistant Teacher</option>
                  <option value="SUBJECT_TEACHER">Subject Instructor</option>
                  <option value="QURAN_MURABBI">Quran Murabbi / Muallim</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
              >
                {isSubmitting ? 'Assigning...' : '+ Bind Assignment'}
              </button>
            </div>
          </form>

          {/* 2. Existing Assignments List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Current Active Assignments ({assignments.length})
            </h3>

            {isLoading ? (
              <div className="p-4 text-center text-xs theme-text-secondary">Loading...</div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-center rounded-xl theme-bg-sub border theme-border text-xs theme-text-secondary">
                No classes currently assigned to this teacher.
              </div>
            ) : (
              <div className="divide-y theme-border rounded-2xl theme-bg-sub border theme-border overflow-hidden">
                {assignments.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:theme-bg-elevated/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold theme-text-primary">{item.class_name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 font-semibold">
                          {item.role_in_class?.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] theme-text-secondary mt-0.5">
                        Group: <span className="theme-text-primary font-medium">{item.group_name || 'All Groups'}</span> • Session: {item.session_name}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteAssignment(item.id)}
                      className="p-1.5 rounded-lg hover:theme-bg-elevated theme-text-secondary hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Assignment"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t theme-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary text-xs font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
