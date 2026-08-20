import React from 'react';
import Modal from '../../components/ui/Modal';
import { TimerIcon } from '../../components/ui/Icons';
import PeriodForm from './PeriodForm';

export default function PeriodFormModal({
  isOpen,
  onClose,
  editingSlot,
  defaultDepartmentId = null,
  defaultClassId = null,
  defaultBranchId = null,
  nextOrder = 1,
  onSuccess,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSlot ? `Edit Period: ${editingSlot.period_name || ''}` : 'Add Period Slot'}
      subtitle="Configure timetable periods, recess, prayer breaks, and class routines."
      icon={TimerIcon}
      maxWidth="max-w-xl"
    >
      <PeriodForm
        editingSlot={editingSlot}
        defaultDepartmentId={defaultDepartmentId}
        defaultClassId={defaultClassId}
        defaultBranchId={defaultBranchId}
        nextOrder={nextOrder}
        onSaved={() => {
          onSuccess?.();
          onClose?.();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}
