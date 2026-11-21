import React, { useRef, useState } from 'react';
import {
  TagIcon,
  UploadIcon,
  DownloadIcon,
  FileIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
} from '../../../../../components/ui/Icons';
import ActionMenu from '../../../../../components/ui/ActionMenu';
import { StudentFullProfile, StudentVaultDocument } from '../types';
import {
  getDocUrl,
  getDocExtension,
  isImageFile,
  isPdfFile,
} from '../utils';

export interface StudentDocumentsTabProps {
  student: StudentFullProfile;
  uploading?: boolean;
  onUploadFile?: (file: File) => void;
  onPreviewDoc?: (doc: StudentVaultDocument) => void;
  onDownloadDoc?: (fileUrl: string, title?: string) => void;
  onRenameDoc?: (doc: StudentVaultDocument) => void;
  onDeleteDoc?: (docId: string | number, title?: string) => void;
}

export const StudentDocumentsTab: React.FC<StudentDocumentsTabProps> = ({
  student,
  uploading = false,
  onUploadFile,
  onPreviewDoc,
  onDownloadDoc,
  onRenameDoc,
  onDeleteDoc,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const documents = student.documents || [];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onUploadFile?.(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile?.(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Drag & Drop Upload Zone (Borderless Soft-Surface Apple Styling) */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all border-0 shadow-xs select-none flex flex-col items-center justify-center gap-3 ${
          isDragActive
            ? 'theme-bg-accent-soft theme-accent scale-[1.01]'
            : 'theme-bg-surface hover:theme-bg-elevated/40'
        }`}
      >
        <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
          {uploading ? (
            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadIcon className="w-6 h-6" />
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm font-bold theme-text-primary">
            {uploading ? 'Uploading Document to Vault...' : 'Click or Drag & Drop Document Here'}
          </p>
          <p className="text-xs theme-text-secondary">
            Supports PDF, JPG, PNG, DOCX, and scanned certificates up to 25MB
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </div>

      {/* 2. Documents Grid */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-3 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                Vault Documents &amp; Certificates ({documents.length})
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Archived certificates, identity documents, and admissions paperwork
              </p>
            </div>
          </div>
        </div>

        {documents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const ext = getDocExtension(doc.file, doc.title).toUpperCase();
              const isImg = isImageFile(doc.file, doc.title);
              const isPdf = isPdfFile(doc.file, doc.title);
              const fileUrl = getDocUrl(doc.file);

              const docActions = [
                {
                  label: 'Preview Document',
                  icon: SearchIcon,
                  onClick: () => onPreviewDoc?.(doc),
                },
                {
                  label: 'Download File',
                  icon: DownloadIcon,
                  onClick: () => onDownloadDoc?.(doc.file, doc.title),
                },
                {
                  label: 'Rename Document',
                  icon: EditIcon,
                  onClick: () => onRenameDoc?.(doc),
                },
                { divider: true },
                {
                  label: 'Delete Document',
                  icon: TrashIcon,
                  danger: true,
                  onClick: () => onDeleteDoc?.(doc.id, doc.title),
                },
              ];

              return (
                <div
                  key={`doc_${doc.id}`}
                  className="rounded-2xl theme-bg-app hover:theme-bg-elevated/40 p-4 transition-all border-0 shadow-xs flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      onClick={() => onPreviewDoc?.(doc)}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0 border-0 shadow-xs">
                        {isImg ? (
                          <img
                            src={fileUrl}
                            alt={doc.title}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : isPdf ? (
                          <span className="text-[10px] font-mono font-extrabold text-rose-500">
                            PDF
                          </span>
                        ) : (
                          <FileIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold theme-text-primary truncate" title={doc.title}>
                          {doc.title || 'Untitled Document'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] theme-text-secondary font-mono">
                          <span className="uppercase">{ext}</span>
                          {doc.uploaded_at && (
                            <>
                              <span>•</span>
                              <span>{doc.uploaded_at.split('T')[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <ActionMenu items={docActions} align="right" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 space-y-2">
            <FileIcon className="w-8 h-8 theme-text-secondary mx-auto opacity-40" />
            <p className="text-xs font-medium theme-text-secondary">
              No documents uploaded yet in this student vault.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDocumentsTab;
