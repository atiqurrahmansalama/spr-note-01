import React, { useRef, useState } from 'react';
import {
  TagIcon,
  UploadIcon,
  DownloadIcon,
  FileIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
} from '@/components/ui/Icons';
import ActionMenu from '@/components/ui/ActionMenu';
import { formatDisplayDate } from '@/utils/dateUtils';
import EmptyState from '@/components/ui/EmptyState';
import type { StaffMember } from '@/types/staff';

export interface StaffVaultDocument {
  id: string | number;
  title: string;
  doc_type: string;
  doc_type_display?: string;
  file: string;
  created_by_name?: string;
  uploaded_at: string;
}

export interface StaffDocumentsTabProps {
  staff: StaffMember;
  documents?: StaffVaultDocument[];
  uploading?: boolean;
  onUploadFile?: (file: File) => void;
  onPreviewDoc?: (doc: StaffVaultDocument) => void;
  onDownloadDoc?: (fileUrl: string, title?: string) => void;
  onRenameDoc?: (doc: StaffVaultDocument) => void;
  onDeleteDoc?: (docId: string | number, title?: string) => void;
}

function getDocUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    return fileUrl;
  }
  return fileUrl;
}

function getDocExtension(fileUrl: string): string {
  if (!fileUrl) return '';
  const parts = fileUrl.split('?')[0].split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'FILE';
}

function isImageFile(fileUrl: string): boolean {
  const ext = getDocExtension(fileUrl).toLowerCase();
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
}

export const StaffDocumentsTab: React.FC<StaffDocumentsTabProps> = ({
  staff,
  documents: propDocs,
  uploading = false,
  onUploadFile,
  onPreviewDoc,
  onDownloadDoc,
  onRenameDoc,
  onDeleteDoc,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const documents: StaffVaultDocument[] = propDocs || (staff as any).documents || [];

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
            Supports PDF, JPG, PNG, DOCX, appointment papers, and certificates up to 25MB
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
        />
      </div>

      {/* 2. Documents Grid */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-4 pb-3 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
              <TagIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                Institutional Document Vault
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {documents.length} verified documents and credentials
              </p>
            </div>
          </div>
        </div>

        {documents.length === 0 ? (
          <EmptyState
            icon={FileIcon}
            title="Vault is Empty"
            description="No documents or credentials uploaded yet for this staff member."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc, idx) => {
              const ext = getDocExtension(doc.file);
              const isImg = isImageFile(doc.file);
              const fullDocUrl = getDocUrl(doc.file);

              const docActionItems = [
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
                  key={doc.id || idx}
                  className="group relative rounded-2xl theme-bg-app border-0 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Thumbnail / Icon */}
                    <div
                      onClick={() => onPreviewDoc?.(doc)}
                      className="w-12 h-12 rounded-xl overflow-hidden theme-bg-surface flex items-center justify-center font-bold text-xs theme-text-secondary cursor-pointer shrink-0"
                    >
                      {isImg ? (
                        <img
                          src={fullDocUrl}
                          alt={doc.title}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <span className="font-mono text-[11px] font-bold theme-accent">
                          {ext}
                        </span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4
                        onClick={() => onPreviewDoc?.(doc)}
                        className="font-bold text-xs theme-text-primary truncate block hover:underline cursor-pointer"
                        title={doc.title}
                      >
                        {doc.title || 'Untitled Document'}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] theme-text-secondary">
                        <span className="uppercase font-semibold tracking-wider theme-accent">
                          {doc.doc_type_display || doc.doc_type || ext}
                        </span>
                        <span>•</span>
                        <span>{formatDisplayDate(doc.uploaded_at)}</span>
                      </div>
                    </div>

                    {/* ActionMenu */}
                    <ActionMenu items={docActionItems} align="right" />
                  </div>

                  {doc.created_by_name && (
                    <div className="text-[10px] theme-text-secondary opacity-70 font-mono pt-1 border-t theme-border">
                      Uploaded by: {doc.created_by_name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDocumentsTab;
