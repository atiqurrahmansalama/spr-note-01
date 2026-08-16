import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon, TrashIcon, ClassIcon, GroupIcon, SessionsIcon, TeacherIcon, SleekCheckIcon } from '../../components/ui/Icons';
import { assignTeacherClass, getTeacherAssignments, deleteTeacherAssignment } from '../../api/staff';
import { fetchWithAuth } from '../../utils/authService';

export default function TeacherAssignmentModal({ isOpen, onClose, teacher, onUpdated }) {
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [existingAssignments, setExistingAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    assigned_class: '',
    assigned_group: '',
    session: '',
    role_in_class: 'LEAD_TEACHER',
  });

  useEffect(() => {
    if (!isOpen || !teacher) return;

    setErrorMsg('');
    setSuccessMsg('');
    setFormData({
      assigned_class: '',
      assigned_group: '',
      session: '',
      role_in_class: 'LEAD_TEACHER',
    });

    const loadLookups = async () => {
      setLoading(true);
      try {
        const [clsRes, grpRes, sesRes, assignRes] = await Promise.all([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/groups/'),
          fetchWithAuth('/api/v1/sessions/'),
          getTeacherAssignments({ teacher: teacher.id, is_active: true }),
        ]);

        if (clsRes.ok) {
          const clList = await clsRes.json();
          setClasses(Array.isArray(clList) ? clList : clList.results || []);
        }

        if (grpRes.ok) {
          const grpList = await grpRes.json();
          setGroups(Array.isArray(grpList) ? grpList : grpList.results || []);
        }

        if (sesRes.ok) {
          const sesList = await sesRes.json();
          const activeSessions = Array.isArray(sesList) ? sesList : sesList.results || [];
          setSessions(activeSessions);
          if (activeSessions.length > 0) {
            setFormData((prev) => ({ ...prev, session: activeSessions[0].id }));
          }
        }

        setExistingAssignments(Array.isArray(assignRes) ? assignRes : assignRes.results || []);
      } catch (err) {
        console.warn('Error loading assignment modal lookups:', err);
      } finally {
        setLoading(false);
      }
    };

    loadLookups();
  }, [isOpen, teacher]);

  if (!isOpen || !teacher) return null;

  // Filter groups corresponding to chosen class
  const filteredGroups = formData.assigned_class
    ? groups.filter((g) => String(g.student_class) === String(formData.assigned_class) || String(g.student_class_id) === String(formData.assigned_class))
    : groups;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'assigned_class' ? { assigned_group: '' } : {}),
    }));
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.assigned_class || !formData.session) {
      setErrorMsg('Please select both a class and an academic session.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        teacher: teacher.id,
        assigned_class: formData.assigned_class,
        assigned_group: formData.assigned_group || null,
        session: formData.session,
        role_in_class: formData.role_in_class,
        is_active: true,
      };

      const newAssignment = await assignTeacherClass(payload);
      setExistingAssignments((prev) => [newAssignment, ...prev]);
      setSuccessMsg('Teacher assigned to class successfully!');
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await deleteTeacherAssignment(assignmentId);
      setExistingAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      setSuccessMsg('Assignment removed.');
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove assignment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ClassIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                Academic Class Assignments
              </h3>
              <p className="text-xs text-zinc-400">
                Assign <span className="text-zinc-200 font-semibold">{teacher.user_name || teacher.employee_id}</span> ({teacher.designation}) to classes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 transition-colors rounded-xl hover:bg-zinc-800 hover:text-zinc-200"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <SleekCheckIcon className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* New Assignment Box */}
          <form onSubmit={handleAssign} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <PlusIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>Add New Academic Class Binding</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Class */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Class <span className="text-rose-400">*</span>
                </label>
                <select
                  name="assigned_class"
                  value={formData.assigned_class}
                  onChange={handleChange}
                  required
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Class --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || 'CLS'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group / Halqa */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Group / Halqa (Optional)
                </label>
                <select
                  name="assigned_group"
                  value={formData.assigned_group}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Whole Class / All Groups --</option>
                  {filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Session */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Academic Session <span className="text-rose-400">*</span>
                </label>
                <select
                  name="session"
                  value={formData.session}
                  onChange={handleChange}
                  required
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Select Session --</option>
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teaching Role */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Teaching Role
                </label>
                <select
                  name="role_in_class"
                  value={formData.role_in_class}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                >
                  <option value="LEAD_TEACHER">Lead Class Teacher</option>
                  <option value="ASSISTANT">Assistant Teacher</option>
                  <option value="QURAN_MURABBI">Quran Hifz Murabbi</option>
                  <option value="SUBSTITUTE">Substitute Teacher</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Assigning...' : 'Add Assignment'}</span>
              </button>
            </div>
          </form>

          {/* Active Assignments List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Currently Assigned Classes ({existingAssignments.length})
            </h4>

            {existingAssignments.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center text-xs text-zinc-500">
                No classes assigned to this teacher yet.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {existingAssignments.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                        <ClassIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">
                          {a.class_name || 'Class'}
                          {a.group_name && <span className="text-zinc-400 font-normal"> • {a.group_name}</span>}
                        </div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                            {a.role_in_class?.replace('_', ' ')}
                          </span>
                          <span>Session: {a.session_name}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(a.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors"
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
        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 bg-zinc-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
