import React from "react";
import Modal from "../../../../components/ui/Modal";
import CustomSelect from "../../../../components/ui/CustomSelect";
import { SectionControlIcon } from "../../../../components/ui/Icons";
import { BulkActionType } from "../types";

interface StudentBulkModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  actionType: BulkActionType;
  onActionTypeChange: (type: BulkActionType) => void;
  statusInput: string;
  onStatusInputChange: (status: string) => void;
  onSubmit: () => void;
}

export default function StudentBulkModal({
  isOpen,
  onClose,
  selectedCount,
  actionType,
  onActionTypeChange,
  statusInput,
  onStatusInputChange,
  onSubmit,
}: StudentBulkModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Operations (${selectedCount} Selected)`}
      subtitle="Apply batch updates to selected student profiles"
      icon={SectionControlIcon}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border theme-border hover:theme-bg-elevated text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="px-5 py-2 rounded-xl font-bold text-xs theme-bg-accent theme-accent-text hover:opacity-90 shadow-md cursor-pointer"
          >
            Execute Bulk Action
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-left">
        <div>
          <CustomSelect
            label="Target Status"
            value={statusInput}
            onChange={onStatusInputChange}
            options={[
              { value: "Active", label: "Active (Enrolled)" },
              { value: "Alumni", label: "Alumni (Graduated)" },
              { value: "Transferred", label: "Transferred (TC Issued)" },
              { value: "Suspended", label: "Suspended (Temporary)" },
              { value: "Expelled", label: "Expelled (Dismissed)" },
              { value: "Dropped Out", label: "Dropped Out" },
              { value: "On Leave", label: "On Long Leave" },
            ]}
            placeholder="Select Target Status..."
          />
        </div>
      </div>
    </Modal>
  );
}
