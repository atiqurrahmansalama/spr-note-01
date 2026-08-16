import React, { useState, useEffect } from 'react';
import { CloseIcon, PlusIcon, TrashIcon, DutyIcon, SleekCheckIcon, BuildingOfficeIcon } from '../../components/ui/Icons';
import { assignGeneralDuty, getStaffDuties, deleteGeneralDuty } from '../../api/staff';

export default function GeneralDutyModal({ isOpen, onClose, staff, onUpdated }) {
  const [existingDuties, setExistingDuties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    duty_title: '',
    duty_description: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    priority: 'MEDIUM',
  });

  useEffect(() => {
    if (!isOpen || !staff) return;

    setErrorMsg('');
    setSuccessMsg('');
    setFormData({
      duty_title: '',
      duty_description: '',
      effective_from: new Date().toISOString().split('T')[0],
      effective_to: '',
      priority: 'MEDIUM',
    });

    const loadDuties = async () => {
      setLoading(true);
      try {
        const res = await getStaffDuties({ staff: staff.id, is_active: true });
        setExistingDuties(Array.isArray(res) ? res : res.results || []);
      } catch (err) {
        console.warn('Error loading duties:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDuties();
  }, [isOpen, staff]);

  if (!isOpen || !staff) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.duty_title.trim()) {
      setErrorMsg('Please specify a duty title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        staff: staff.id,
        duty_title: formData.duty_title.trim(),
        duty_description: formData.duty_description.trim(),
        effective_from: formData.effective_from || new Date().toISOString().split('T')[0],
        effective_to: formData.effective_to || null,
        priority: formData.priority,
        is_active: true,
      };

      const newDuty = await assignGeneralDuty(payload);
      setExistingDuties((prev) => [newDuty, ...prev]);
      setSuccessMsg('Operational task assigned successfully!');
      setFormData({
        duty_title: '',
        duty_description: '',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
        priority: 'MEDIUM',
      });
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to assign duty');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDuty = async (dutyId) => {
    try {
      await deleteGeneralDuty(dutyId);
      setExistingDuties((prev) => prev.filter((d) => d.id !== dutyId));
      setSuccessMsg('Duty marked complete / removed.');
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to remove duty');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DutyIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-zinc-100">
                Operational Task Assignments
              </h3>
              <p className="text-xs text-zinc-400">
                Assign tasks to <span className="text-zinc-200 font-semibold">{staff.user_name || staff.employee_id}</span> ({staff.designation})
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

        {/* Feedback Alerts */}
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
          {/* New Duty Form */}
          <form onSubmit={handleAssign} className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
            <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <PlusIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Assign Operational Task</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Duty Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="duty_title"
                  placeholder="e.g. Hostel Night Roll Call & Gate Lockup"
                  value={formData.duty_title}
                  onChange={handleChange}
                  required
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Task Scope / Instructions
                </label>
                <textarea
                  rows={2}
                  name="duty_description"
                  placeholder="Detailed instructions or standard operating procedures..."
                  value={formData.duty_description}
                  onChange={handleChange}
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Effective From
                  </label>
                  <input
                    type="date"
                    name="effective_from"
                    value={formData.effective_from}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Effective Until (Optional)
                  </label>
                  <input
                    type="date"
                    name="effective_to"
                    value={formData.effective_to}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                    Priority Level
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="LOW">Low Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="URGENT">Urgent / Critical</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Assigning...' : 'Assign Duty'}</span>
              </button>
            </div>
          </form>

          {/* Active Duties List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Assigned Operational Duties ({existingDuties.length})
            </h4>

            {existingDuties.length === 0 ? (
              <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center text-xs text-zinc-500">
                No operational tasks currently assigned to this staff member.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/80 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {existingDuties.map((d) => (
                  <div key={d.id} className="flex items-start justify-between p-3 hover:bg-zinc-900/50 transition-colors gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">{d.duty_title}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          d.priority === 'URGENT'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : d.priority === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {d.priority}
                        </span>
                      </div>
                      {d.duty_description && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{d.duty_description}</p>
                      )}
                      <div className="text-[10px] text-zinc-500">
                        From: {d.effective_from} {d.effective_to ? `→ Until: ${d.effective_to}` : '(Ongoing)'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteDuty(d.id)}
                      className="p-1.5 text-zinc-400 hover:text-rose-400 rounded-lg hover:bg-zinc-800 transition-colors shrink-0"
                      title="Delete / Complete Duty"
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
