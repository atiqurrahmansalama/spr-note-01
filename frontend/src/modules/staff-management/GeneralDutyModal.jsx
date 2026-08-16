import React, { useState, useEffect } from 'react';
import {
  DutyIcon,
  CloseIcon,
  PlusIcon,
  TrashIcon,
} from '../../components/ui/Icons';
import { getStaffDuties, assignGeneralDuty, deleteGeneralDuty } from '../../api/staff';
import { useToast } from '../../context/ToastContext';

export default function GeneralDutyModal({ isOpen, onClose, staff, onUpdated }) {
  const { showToast } = useToast();

  const [duties, setDuties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New duty form
  const [form, setForm] = useState({
    duty_title: '',
    duty_description: '',
    priority: 'MEDIUM',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
  });

  useEffect(() => {
    if (!isOpen || !staff) return;

    const loadDuties = async () => {
      setIsLoading(true);
      try {
        const res = await getStaffDuties({ staff: staff.id });
        setDuties(Array.isArray(res) ? res : res.results || []);
      } catch (err) {
        console.error('Error loading duties:', err);
        showToast('Failed to load operational duties', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadDuties();
  }, [isOpen, staff, showToast]);

  if (!isOpen || !staff) return null;

  const handleDutySubmit = async (e) => {
    e.preventDefault();
    if (!form.duty_title.trim()) {
      showToast('Duty title is required.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        staff: staff.id,
        duty_title: form.duty_title.trim(),
        duty_description: form.duty_description.trim(),
        priority: form.priority,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
      };

      await assignGeneralDuty(payload);
      showToast('Operational duty assigned successfully!', 'success');

      // Refresh list
      const updated = await getStaffDuties({ staff: staff.id });
      setDuties(Array.isArray(updated) ? updated : updated.results || []);
      if (onUpdated) onUpdated();

      // Reset form
      setForm({
        duty_title: '',
        duty_description: '',
        priority: 'MEDIUM',
        effective_from: new Date().toISOString().split('T')[0],
        effective_to: '',
      });
    } catch (err) {
      console.error('Error assigning duty:', err);
      showToast(err.message || 'Failed to assign duty', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDuty = async (dutyId) => {
    try {
      await deleteGeneralDuty(dutyId);
      showToast('Operational duty deactivated.', 'info');
      setDuties((prev) => prev.filter((d) => d.id !== dutyId));
      if (onUpdated) onUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to deactivate duty', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-xl rounded-3xl theme-bg-surface border theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] theme-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
              <DutyIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight theme-text-primary">Operational Duties Management</h2>
              <p className="text-xs theme-text-secondary">
                {staff.user_name || staff.employee_id} • {staff.designation}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Add New Duty Form */}
          <form onSubmit={handleDutySubmit} className="p-4 rounded-2xl theme-bg-sub border theme-border space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-primary flex items-center gap-1.5">
              <PlusIcon className="w-4 h-4 text-amber-400" />
              <span>Assign Operational Task</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Task Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Campus Security Inspection"
                  value={form.duty_title}
                  onChange={(e) => setForm({ ...form, duty_title: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                Detailed Scope / Instructions
              </label>
              <textarea
                rows={2}
                placeholder="Scope of work and responsibilities..."
                value={form.duty_description}
                onChange={(e) => setForm({ ...form, duty_description: e.target.value })}
                className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Effective From
                </label>
                <input
                  type="date"
                  value={form.effective_from}
                  onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold theme-text-secondary mb-1">
                  Effective To (Optional)
                </label>
                <input
                  type="date"
                  value={form.effective_to}
                  onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
                  className="w-full px-3 py-1.5 theme-bg-surface border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
              >
                {isSubmitting ? 'Assigning...' : '+ Assign Duty'}
              </button>
            </div>
          </form>

          {/* Existing Duties List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
              Active Assigned Duties ({duties.length})
            </h3>

            {isLoading ? (
              <div className="p-4 text-center text-xs theme-text-secondary">Loading...</div>
            ) : duties.length === 0 ? (
              <div className="p-6 text-center rounded-xl theme-bg-sub border theme-border text-xs theme-text-secondary">
                No operational tasks assigned to this staff member.
              </div>
            ) : (
              <div className="divide-y theme-border rounded-2xl theme-bg-sub border theme-border overflow-hidden">
                {duties.map((item) => (
                  <div key={item.id} className="p-3.5 flex items-start justify-between gap-3 hover:theme-bg-elevated/40 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold theme-text-primary">{item.duty_title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold theme-bg-surface border theme-border theme-text-secondary">
                          {item.priority}
                        </span>
                      </div>
                      {item.duty_description && (
                        <p className="text-xs theme-text-secondary mt-1">{item.duty_description}</p>
                      )}
                      <div className="text-[11px] theme-text-secondary mt-1">
                        Effective: {item.effective_from} {item.effective_to ? `to ${item.effective_to}` : '(Continuous)'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteDuty(item.id)}
                      className="p-1.5 rounded-lg hover:theme-bg-elevated theme-text-secondary hover:text-rose-400 transition-colors cursor-pointer"
                      title="Deactivate Duty"
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
