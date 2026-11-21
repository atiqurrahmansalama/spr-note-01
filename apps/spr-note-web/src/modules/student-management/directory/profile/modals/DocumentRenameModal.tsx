import React from 'react';
import Modal from '../../../../../components/ui/Modal';
import CustomInput from '../../../../../components/ui/CustomInput';
import { EditIcon } from '../../../../../components/ui/Icons';
import { StudentVaultDocument } from '../types';

export interface DocumentRenameModalProps {
  isOpen: boolean;
  doc: StudentVaultDocument | null;
  newTitle: string;
  onNewTitleChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export const DocumentRenameModal: React.FC<DocumentRenameModalProps> = ({
  isOpen,
  doc,
  newTitle,
  onNewTitleChange,
  onClose,
  onSubmit,
  loading = false,
}) => {
  if (!doc) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onSubmit();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Vault Document"
      subtitle={`Update document title for file "${doc.title}"`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <CustomInput
          label="Document Title"
          value={newTitle}
          onChange={onNewTitleChange}
          placeholder="Enter new document title..."
          icon={EditIcon}
          autoFocus={true}
          required={true}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl theme-bg-app hover:theme-bg-elevated/40 theme-text-secondary hover:theme-text-primary text-xs font-semibold cursor-pointer border-0 shadow-xs transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !newTitle.trim()}
            className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold cursor-pointer border-0 shadow-xs hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Saving...' : 'Save Title'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default DocumentRenameModal;
