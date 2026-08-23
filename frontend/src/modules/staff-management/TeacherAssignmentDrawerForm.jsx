import React, { useState, useEffect } from 'react';
import {
  ClassIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/ui/Icons';
import { getTeacherAssignments, assignTeacherClass, deleteTeacherAssignment } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { fetchWithAuth } from '../../utils/authService';
import CustomSelect from '../../components/ui/CustomSelect';

export default function TeacherAssignmentDrawerForm({ teacher, onUpdated, onCancel }) {
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
    if (!teacher) return;

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
            setForm((prev) => ({ ...prev, session: String(activeSess.id) }));
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
  }, [teacher, showToast]);

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

      // Reset class & group
      setForm((prev) => ({
        ...prev,
        student_class: '',
        student_group: '',
      }));
    } catch (err) {
      console.error('Failed to assign teacher:', err);
      showToast(err.message || 'Failed to assign teacher to class', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await deleteTeacherAssignment(assignmentId);
      showToast('Assignment removed.', 'success');
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to remove assignment', 'error');
    }
  };

  const classOptions = [
    { value: '', label: 'Select Class...' },
    ...classes.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const groupOptions = [
    { value: '', label: 'All Groups / Unspecified' },
    ...groups.map((g) => ({ value: String(g.id), label: g.name })),
  ];

  const sessionOptions = [
    { value: '', label: 'Select Academic Session...' },
    ...sessions.map((s) => ({ value: String(s.id), label: `${s.name}${s.is_active ? ' (Active)' : ''}` })),
  ];

  const roleOptions = [
    { value: 'LEAD_TEACHER', label: 'Lead Class Teacher' },
    { value: 'CO_TEACHER', label: 'Assistant / Co-Teacher' },
    { value: 'SUBJECT_SPECIALIST', label: 'Subject Specialist' },
    { value: 'SUBSTITUTE', label: 'Substitute Teacher' },
  ];

  return (
    <div className="p-4 sm:p-5 space-y-5 h-full overflow-y-auto theme-text-primary text-left">
      {/* Teacher Header Banner */}
      <div className="p-3.5 rounded-2xl theme-bg-sub border theme-border flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl theme-bg-accent-soft text-xs font-bold theme-accent flex items-center justify-center border theme-border shrink-0">
          <ClassIcon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold theme-text-primary">
            {teacher?.user_name || teacher?.employee_id || 'Teacher'}
          </h4>
          <p className="text-xs theme-text-secondary">
            {teacher?.designation} • {teacher?.department_name || 'General Dept'}
          </p>
        </div>
      </div>

      {/* Add New Assignment Form */}
      <form onSubmit={handleAssignSubmit} className="space-y-4 p-4 rounded-2xl theme-bg-sub border theme-border">
        <div className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4 theme-accent" />
          <h4 className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            New Academic Class Assignment
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <CustomSelect
              label="Academic Session *"
              options={sessionOptions}
              value={form.session}
              onChange={(val) => setForm({ ...form, session: val })}
              placeholder="Select Session"
            />
          </div>

          <div>
            <CustomSelect
              label="Student Class *"
              options={classOptions}
              value={form.student_class}
              onChange={(val) => setForm({ ...form, student_class: val })}
              placeholder="Select Class"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <CustomSelect
              label="Student Group"
              options={groupOptions}
              value={form.student_group}
              onChange={(val) => setForm({ ...form, student_group: val })}
              placeholder="Select Group"
            />
          </div>

          <div>
            <CustomSelect
              label="Role in Class"
              options={roleOptions}
              value={form.role_in_class}
              onChange={(val) => setForm({ ...form, role_in_class: val })}
              placeholder="Select Role"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{isSubmitting ? 'Assigning...' : 'Assign Class'}</span>
          </button>
        </div>
      </form>

      {/* Existing Assignments List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
          Active Class Assignments ({assignments.length})
        </h4>

        {isLoading ? (
          <div className="p-4 text-center text-xs theme-text-secondary">
            Loading assigned classes...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6 rounded-2xl theme-bg-sub border theme-border text-center text-xs theme-text-secondary">
            No class assignments currently configured for this teacher.
          </div>
        ) : (
          <div className="space-y-2">
            {assignments.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border theme-border theme-bg-surface flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs theme-text-primary">
                      {item.student_class_name || 'Class'}
                    </span>
                    {item.student_group_name && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent font-medium">
                        {item.student_group_name}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] theme-text-secondary mt-0.5">
                    {item.role_in_class_display || item.role_in_class} • {item.session_name || 'Current Session'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteAssignment(item.id)}
                  className="p-1.5 rounded-lg border theme-border hover:bg-rose-500/10 hover:text-rose-500 text-zinc-400 transition-colors cursor-pointer"
                  title="Remove Assignment"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {onCancel && (
        <div className="pt-4 border-t theme-border flex justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-sub text-xs font-semibold theme-text-secondary hover:theme-text-primary transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
