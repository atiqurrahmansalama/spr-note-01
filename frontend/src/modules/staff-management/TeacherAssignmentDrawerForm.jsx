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
import { ClassSelect, GroupSelect } from '../../components/selectors';
import { DrawerContainer, DrawerBanner, DrawerSection, DrawerFooter } from '../../components/layout';

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
    <DrawerContainer padding="normal" spacing="normal">
      {/* Teacher Header Banner */}
      <DrawerBanner
        icon={ClassIcon}
        title={teacher?.user_name || teacher?.employee_id || 'Teacher'}
        subtitle={`${teacher?.designation || 'Staff'} • ${teacher?.department_name || 'General Dept'}`}
      />

      {/* Add New Assignment Form */}
      <form onSubmit={handleAssignSubmit}>
        <DrawerSection title="New Academic Class Assignment" icon={PlusIcon}>
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
              <ClassSelect
                label="Student Class"
                required={true}
                classes={classes}
                value={form.student_class}
                onChange={(val) => setForm({ ...form, student_class: val, student_group: '' })}
                allowAll={false}
                placeholder="Select Class"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <GroupSelect
                label="Student Group"
                classId={form.student_class}
                groups={groups}
                value={form.student_group}
                onChange={(val) => setForm({ ...form, student_group: val })}
                allowAll={true}
                allLabel="All Groups (General)"
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

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <PlusIcon className="w-4 h-4" />
              <span>{isSubmitting ? 'Assigning...' : 'Assign to Class'}</span>
            </button>
          </div>
        </DrawerSection>
      </form>

      {/* Current Active Assignments List */}
      <DrawerSection
        title="Active Class Assignments"
        icon={ClassIcon}
        badge={String(assignments.length)}
      >
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
      </DrawerSection>

      {onCancel && (
        <DrawerFooter onCancel={onCancel} cancelLabel="Close" />
      )}
    </DrawerContainer>
  );
}
