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
      <div className="p-5 sm:p-6 space-y-4 text-left">
        <div>
          <CustomSelect
            label="Select Action"
            value={actionType}
            onChange={(val: string) => onActionTypeChange(val as BulkActionType)}
            options={[
              { value: "change_status", label: "Change Status" },
              { value: "bulk_delete", label: "Bulk Delete Students" },
            ]}
            placeholder="Select Action..."
          />
        </div>

        {actionType === "change_status" && (
          <div>
            <CustomSelect
              label="Target Status"
              value={statusInput}
              onChange={onStatusInputChange}
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
                { value: "Alumni", label: "Alumni" },
                { value: "Tc", label: "Transfer Certificate (TC)" },
              ]}
              placeholder="Select Status..."
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
