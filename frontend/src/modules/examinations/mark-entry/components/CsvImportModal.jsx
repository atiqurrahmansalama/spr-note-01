import React, { useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import CustomButton from '../../../../components/ui/CustomButton';
import {
  UploadIcon,
  FileTextIcon,
  CheckIcon,
} from '../../../../components/ui/Icons';

/**
 * CsvImportModal
 * Modal enabling CSV marksheet import via file upload or direct text pasting.
 * Utilizes the project's standard Modal component.
 */
export default function CsvImportModal({ isOpen, onClose, onImport, components = [] }) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result || '');
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    const success = onImport(csvText);
    if (success) {
      onClose();
    }
  };

  const footerActions = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <CustomButton variant="sub" size="sm" onClick={onClose}>
        Cancel
      </CustomButton>
      <CustomButton
        variant="primary"
        size="sm"
        disabled={!csvText.trim()}
        icon={CheckIcon}
        onClick={handleConfirm}
      >
        Import Marks
      </CustomButton>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import Marksheet from CSV"
      subtitle="Upload or paste student marksheet data to populate rows"
      icon={UploadIcon}
      size="lg"
      footer={footerActions}
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Instruction Note */}
        <div className="p-3.5 rounded-2xl border border-[var(--accent-main)]/20 theme-bg-accent-soft text-xs theme-text-secondary space-y-1">
          <div className="flex items-center gap-1.5 font-bold theme-text-primary">
            <FileTextIcon className="w-4 h-4 theme-accent" />
            CSV Format Guidelines:
          </div>
          <p>
            Format: <code className="font-mono text-[10px] theme-bg-sub px-1.5 py-0.5 rounded border theme-border">Roll, UniqueID, Name, Absent(YES/NO), {components.map((c) => c.name).join(', ')}, Remarks</code>
          </p>
          <p className="text-[11px] opacity-90">
            Student records are matched automatically by Student Roll Number or Unique ID.
          </p>
        </div>

        {/* File Upload Input */}
        <div>
          <label className="block text-xs font-bold theme-text-primary mb-1.5">
            Choose CSV File
          </label>
          <div className="relative border-2 border-dashed theme-border rounded-2xl p-6 text-center hover:theme-bg-sub/30 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="space-y-1.5">
              <UploadIcon className="w-8 h-8 mx-auto theme-accent opacity-75" />
              <p className="text-xs font-semibold theme-text-primary">
                {fileName ? fileName : 'Click or drop a CSV file here'}
              </p>
              <p className="text-[10px] theme-text-secondary">
                Supports standard exported marksheets and custom grade sheets
              </p>
            </div>
          </div>
        </div>

        {/* Direct CSV Text Area */}
        <div>
          <label className="block text-xs font-bold theme-text-primary mb-1.5">
            Or Paste CSV Text Directly:
          </label>
          <textarea
            rows={5}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Roll,Unique ID,Student Name,Absent?,Written Exam,Remarks&#10;101,STU-001,John Doe,NO,65,Good effort"
            className="w-full text-xs font-mono p-3 rounded-xl border theme-border theme-bg-surface theme-text-primary outline-none focus:border-[var(--accent-main)] resize-none"
          />
        </div>
      </div>
    </Modal>
  );
}
