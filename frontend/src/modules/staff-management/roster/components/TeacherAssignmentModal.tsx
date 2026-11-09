import React, { useState, useEffect, useCallback } from 'react';
import {
  ClassIcon,
  PlusIcon,
  TrashIcon,
  CloseIcon,
} from '@/components/ui/Icons';
import { getTeacherAssignments, assignTeacherClass, deleteTeacherAssignment } from '@/api/staff';
import { useToast } from '@/context/ToastContext';
import { ClassSelect, GroupSelect } from '@/components/selectors';
import CustomSelect from '@/components/ui/CustomSelect';
import { useStaffTranslation } from '../../locales';
import type { StaffMember } from '../../types';

interface TeacherAssignmentModalProps {
  isOpen: boolean;
  teacher: StaffMember | null;
  onClose: () => void;
  onUpdated?: () => void;
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

const ROLE_OPTIONS = [
  { value: 'LEAD_TEACHER', label: 'Lead Teacher / Class Ustadh' },
  { value: 'ASSISTANT_TEACHER', label: 'Assistant Teacher / Naib' },
  { value: 'SUBJECT_TEACHER', label: 'Specialist Subject Teacher' },
  { value: 'SUBSTITUTE', label: 'Designated Substitute' },
];

export const TeacherAssignmentModal: React.FC<TeacherAssignmentModalProps> = ({
  isOpen,
  teacher,
  onClose,
  onUpdated,
}) => {
  const { showToast } = useToast();
  const { t } = useStaffTranslation();

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [form, setForm] = useState({
    student_class: '',
    student_group: '',
    role_in_class: 'LEAD_TEACHER',
  });

  const loadAssignments = useCallback(async () => {
    if (!teacher?.id) return;
    setIsLoading(true);
    try {
      const data = await getTeacherAssignments({ teacher: teacher.id });
      setAssignments(Array.isArray(data) ? data : data.results || []);
    } catch (err: any) {
      console.warn('Failed to load assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [teacher]);

  useEffect(() => {
    if (isOpen && teacher) {
      loadAssignments();
    }
  }, [isOpen, teacher, loadAssignments]);

  if (!isOpen || !teacher) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.student_class) {
      showToast('Please select a target class', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignTeacherClass({
        teacher: teacher.id,
        assigned_class: form.student_class,
        assigned_group: form.student_group || null,
        role_in_class: form.role_in_class,
      });

      showToast('Class successfully assigned to teacher!', 'success');
      setForm({ student_class: '', student_group: '', role_in_class: 'LEAD_TEACHER' });
      await loadAssignments();
      onUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to assign class', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (assignmentId: string | number) => {
    try {
      await deleteTeacherAssignment(assignmentId);
      showToast('Assignment removed', 'success');
      await loadAssignments();
      onUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete assignment', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg theme-bg-surface rounded-3xl p-6 shadow-2xl space-y-5 border-0 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <ClassIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary">
                {t('manageClassesTitle', 'Class & Subject Assignments')}
              </h3>
              <p className="text-xs theme-text-secondary">
                {teacher.user_name || teacher.name_en || teacher.employee_id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 text-xs theme-text-secondary hover:theme-text-primary transition cursor-pointer border-0"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Assignments List */}
        <div className="space-y-2">
          <label className="text-xs font-bold theme-text-secondary block">Active Assignments</label>
          {isLoading ? (
            <div className="p-4 text-center text-xs theme-text-secondary">Loading assignments...</div>
          ) : assignments.length === 0 ? (
            <div className="p-4 rounded-2xl theme-bg-app text-center text-xs theme-text-secondary border-0">
              No classes currently assigned to this teacher.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {assignments.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl theme-bg-app flex items-center justify-between gap-3 border-0"
                >
                  <div>
                    <span className="text-xs font-bold theme-text-primary block">
                      {item.student_class_name || `Class #${item.student_class}`}
                    </span>
                    <span className="text-[10px] theme-text-secondary">
                      {item.role_in_class_display || item.role_in_class || 'Teacher'}
                      {item.student_group_name ? ` • ${item.student_group_name}` : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-500/10 text-rose-500 transition cursor-pointer border-0"
                    title="Remove assignment"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Assignment Form */}
        <form onSubmit={handleAssign} className="p-4 rounded-2xl theme-bg-app space-y-3 border-0">
          <span className="text-xs font-bold theme-text-primary block">Assign New Class</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <ClassSelect
              value={form.student_class}
              onChange={(val: any) => setForm((prev) => ({ ...prev, student_class: val }))}
              placeholder="Select Class"
            />
            <GroupSelect
              classId={form.student_class}
              value={form.student_group}
              onChange={(val: any) => setForm((prev) => ({ ...prev, student_group: val }))}
              placeholder="Section / Group (Optional)"
            />
          </div>
          <CustomSelect
            options={ROLE_OPTIONS}
            value={form.role_in_class}
            onChange={(val) => setForm((prev) => ({ ...prev, role_in_class: val }))}
            placeholder="Teaching Role"
          />
          <button
            type="submit"
            disabled={isSubmitting || !form.student_class}
            className="w-full py-2.5 rounded-xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 border-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{isSubmitting ? 'Assigning...' : t('saveAssignments', 'Assign Class')}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

