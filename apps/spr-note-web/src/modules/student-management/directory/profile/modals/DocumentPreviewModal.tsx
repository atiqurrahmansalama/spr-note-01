import React from 'react';
import Modal from '../../../../../components/ui/Modal';
import { DownloadIcon, FileIcon } from '../../../../../components/ui/Icons';
import { StudentVaultDocument } from '../types';
import {
  getDocUrl,
  isImageFile,
  isPdfFile,
  getDocExtension,
} from '../utils';

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  doc: StudentVaultDocument | null;
  onClose: () => void;
  onDownload: (fileUrl: string, title?: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  doc,
  onClose,
  onDownload,
}) => {
  if (!doc) return null;

  const fileUrl = getDocUrl(doc.file);
  const ext = getDocExtension(doc.file, doc.title).toUpperCase();
  const isImg = isImageFile(doc.file, doc.title);
  const isPdf = isPdfFile(doc.file, doc.title);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={doc.title || 'Document Preview'}
      subtitle={`${ext} Document • Archived in Student Vault`}
      size="3xl"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Preview Viewer Area */}
        <div className="w-full min-h-[380px] max-h-[550px] rounded-2xl theme-bg-app flex items-center justify-center overflow-auto border-0 p-2">
          {isImg ? (
            <img
              src={fileUrl}
              alt={doc.title}
              className="max-w-full max-h-[500px] object-contain rounded-xl shadow-xs"
            />
          ) : isPdf ? (
            <iframe
              src={`${fileUrl}#toolbar=0`}
              title={doc.title}
              className="w-full h-[500px] rounded-xl border-0"
            />
          ) : (
            <div className="text-center p-8 space-y-3">
              <div className="w-16 h-16 rounded-2xl theme-bg-surface flex items-center justify-center mx-auto shadow-xs theme-accent">
                <FileIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold theme-text-primary">{doc.title}</h4>
                <p className="text-xs theme-text-secondary">
                  Direct preview is not available for {ext} files in browser.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl theme-bg-app hover:theme-bg-elevated/40 theme-text-secondary hover:theme-text-primary text-xs font-semibold cursor-pointer border-0 shadow-xs transition-all"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => onDownload(doc.file, doc.title)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold cursor-pointer border-0 shadow-xs hover:opacity-90 transition-opacity"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Download File</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentPreviewModal;
