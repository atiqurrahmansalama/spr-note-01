import React, { useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import CustomButton from '../../../../components/ui/CustomButton';
import CustomInput from '../../../../components/ui/CustomInput';
import {
  LockOpenIcon,
  ShieldCheckIcon,
  AlertCircleIcon,
} from '../../../../components/ui/Icons';

/**
 * SupervisorUnlockModal
 * Supervisor override authorization modal utilizing the project's standard Modal component.
 * 100% Theme Tokens, zero hardcoded colors.
 */
export default function SupervisorUnlockModal({
  isOpen,
  onClose,
  onConfirmUnlock,
  subjectName,
}) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirmUnlock(reason);
    onClose();
  };

  const footerActions = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <CustomButton variant="sub" size="sm" onClick={onClose}>
        Cancel
      </CustomButton>
      <CustomButton
        variant="primary"
        size="sm"
        icon={ShieldCheckIcon}
        onClick={handleConfirm}
      >
        Authorize Unlock
      </CustomButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supervisor Submission Override"
      subtitle="Exam Controller administrative authorization"
      icon={LockOpenIcon}
      size="md"
      footer={footerActions}
    >
      <div className="p-4 sm:p-6 space-y-4 text-xs">
        <div className="flex items-start gap-3 p-3.5 rounded-2xl border theme-border theme-bg-sub/40 theme-text-secondary">
          <AlertCircleIcon className="w-5 h-5 theme-accent shrink-0 mt-0.5" />
          <div>
            <p className="font-bold theme-text-primary">
              Override Controller Submission Lock
            </p>
            <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">
              Unlocking <strong>{subjectName || 'this subject'}</strong> will allow teachers to edit component marks and re-evaluate student grades.
            </p>
          </div>
        </div>

        <div>
          <CustomInput
            label="Supervisor Reason / Audit Note (Optional)"
            placeholder="e.g. Re-checking authorized by Controller, clerical error correction..."
            value={reason}
            onChange={setReason}
          />
        </div>
      </div>
    </Modal>
  );
}
