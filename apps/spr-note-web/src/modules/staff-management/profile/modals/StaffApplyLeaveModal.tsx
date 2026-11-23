import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomInput from '@/components/ui/CustomInput';
import { useToast } from '@/context/ToastContext';
import { applyLeave } from '@/api/staff';
import type { LeaveType } from '@/types/staff';

export interface StaffApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string | number;
  onLeaveApplied?: () => void;
}

export const StaffApplyLeaveModal: React.FC<StaffApplyLeaveModalProps> = ({
  isOpen,
  onClose,
  staffId,
  onLeaveApplied,
}) => {
  const { showToast } = useToast();
  const [leaveType, setLeaveType] = useState<LeaveType>('CASUAL');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast('Please provide a reason for the leave.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await applyLeave({
        staff: staffId,
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });
      showToast('Leave application submitted successfully!', 'success');
      onLeaveApplied?.();
      onClose();
      setReason('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply for Official Leave"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <CustomSelect
            label="Leave Type"
            value={leaveType}
            onChange={(val) => setLeaveType(val as LeaveType)}
            options={[
              { value: 'CASUAL', label: 'Casual Leave' },
              { value: 'MEDICAL', label: 'Medical Leave' },
              { value: 'EMERGENCY', label: 'Emergency Leave' },
              { value: 'MATERNITY', label: 'Maternity Leave' },
              { value: 'HAJJ', label: 'Hajj / Umrah Leave' },
              { value: 'UNPAID', label: 'Unpaid Leave' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CustomInput
            label="Start Date"
            type="date"
            value={startDate}
            onChange={setStartDate}
            required
          />
          <CustomInput
            label="End Date"
            type="date"
            value={endDate}
            onChange={setEndDate}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold theme-text-secondary mb-1">
            Reason for Leave
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
            placeholder="Please detail the reason for your leave request..."
            className="w-full rounded-2xl theme-bg-app border-0 p-3 text-xs theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t theme-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-2xl theme-bg-app hover:theme-bg-elevated/40 text-xs font-semibold theme-text-secondary cursor-pointer border-0"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-2xl theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold transition-all cursor-pointer shadow-xs border-0 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StaffApplyLeaveModal;
