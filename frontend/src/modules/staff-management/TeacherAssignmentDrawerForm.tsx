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
import { useFormAutoSave } from '../../hooks';
import type { StaffMember } from '../../types/staff';

interface TeacherAssignmentDrawerFormProps {
  teacher?: StaffMember | null;
  onUpdated?: () => void;
  onCancel?: () => void;
}

interface AssignmentItem {
  id: string | number;
  student_class?: string | number;
  student_class_name?: string;
  student_group?: string | number | null;
  student_group_name?: string | null;
  session?: string | number;
  session_name?: string;
  role_in_class?: string;
  role_in_class_display?: string;
}

export const TeacherAssignmentDrawerForm: React.FC<TeacherAssignmentDrawerFormProps> = ({
  teacher,
  onUpdated,
  onCancel,
}) => {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // New assignment form
  const [form, setForm] = useState<{
    student_class: string;
    student_group: string;
    session: string;
    role_in_class: string;
  }>({
    student_class: '',
    student_group: '',
    session: '',
    role_in_class: 'LEAD_TEACHER',
  });

  // Auto-Save / Draft Persistence
  const storageKey = teacher?.id ? `teacher_assign_${teacher.id}` : null;
  const { clearDraft } = useFormAutoSave({
    formData: form,
    setFormData: setForm,
    storageKey,
    enabled: Boolean(storageKey),
  });

  useEffect(() => {
    if (!teacher) return;

    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [assignRes, classRes, groupRes, sessRes] = await Promise.allSettled([
          getTeacherAssignments({ teacher: teacher.id }),
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/groups/'),
          fetchWithAuth('/api/v1/sessions/'),
        ]);

        if (!isMounted) return;

        if (assignRes.status === 'fulfilled') {
          const aData = assignRes.value;
          setAssignments(Array.isArray(aData) ? aData : aData.results || []);
        }

        if (classRes.status === 'fulfilled' && classRes.value.ok) {
          const classData = await classRes.value.json();
          setClasses(Array.isArray(classData) ? classData : classData.results || []);
        }
        if (groupRes.status === 'fulfilled' && groupRes.value.ok) {
          const groupData = await groupRes.value.json();
          setGroups(Array.isArray(groupData) ? groupData : groupData.results || []);
        }
        if (sessRes.status === 'fulfilled' && sessRes.value.ok) {
          const sessData = await sessRes.value.json();
          const sessList = Array.isArray(sessData) ? sessData : sessData.results || [];
          setSessions(sessList);
          const activeSess = sessList.find((s: any) => s.is_active);
          if (activeSess) {
            setForm((prev) => ({ ...prev, session: String(activeSess.id) }));
          }
        }
      } catch (err) {
        console.error('Error loading assignments:', err);
        showToast('Failed to load assignments', 'error');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [teacher, showToast]);

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher?.id) return;
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
      clearDraft();
      setForm((prev) => ({
        ...prev,
        student_class: '',
        student_group: '',
      }));
    } catch (err: any) {
      console.error('Failed to assign teacher:', err);
      showToast(err.message || 'Failed to assign teacher to class', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string | number) => {
    try {
      await deleteTeacherAssignment(assignmentId);
      showToast('Assignment removed.', 'success');
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove assignment', 'error');
    }
  };

  const sessionOptions = [
    { value: '', label: 'Select Academic Session...' },
    ...sessions.map((s) => ({
      value: String(s.id),
      label: `${s.name}${s.is_active ? ' (Active)' : ''}`,
    })),
  ];

  const roleOptions = [
    { value: 'LEAD_TEACHER', label: 'Lead Class Teacher' },
    { value: 'CO_TEACHER', label: 'Assistant / Co-Teacher' },
    { value: 'SUBJECT_SPECIALIST', label: 'Subject Specialist' },
    { value: 'SUBSTITUTE', label: 'Substitute Teacher' },
  ];

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="@container p-4 space-y-6">
        {/* Teacher Header Banner */}
        <DrawerBanner
          icon={ClassIcon}
          title={teacher?.user_name || teacher?.employee_id || 'Teacher'}
          subtitle={`${teacher?.designation || 'Faculty'} • ${teacher?.department_name || 'General Dept'}`}
        />

        {/* Add New Assignment Form */}
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <DrawerSection title="New Academic Class Assignment" icon={PlusIcon}>
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div>
                <CustomSelect
                  label="Academic Session *"
                  options={sessionOptions}
                  value={form.session}
                  onChange={(val) => setForm({ ...form, session: val })}
                  placeholder="Select Session"
                  required
                />
              </div>

              <div>
                <ClassSelect
                  label="Student Class"
                  required={true}
                  classes={classes}
                  value={form.student_class}
                  onChange={(val: any) =>
                    setForm({ ...form, student_class: val, student_group: '' })
                  }
                  allowAll={false}
                  placeholder="Select Class"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div>
                <GroupSelect
                  label="Student Group"
                  classId={form.student_class}
                  groups={groups}
                  value={form.student_group}
                  onChange={(val: any) => setForm({ ...form, student_group: val })}
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
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
                      {item.role_in_class_display || item.role_in_class} •{' '}
                      {item.session_name || 'Current Session'}
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
      </div>
    </DrawerContainer>
  );
};

export default TeacherAssignmentDrawerForm;
