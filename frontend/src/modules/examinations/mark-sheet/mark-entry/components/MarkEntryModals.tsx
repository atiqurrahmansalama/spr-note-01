import React, { useState } from 'react';
import { ConfirmModal } from '@/components/ui/Modal';
import CustomInput from '@/components/ui/CustomInput';
import {
  UploadIcon,
  CheckIcon,
  LockOpenIcon,
  ShieldCheckIcon,
} from '@/components/ui/Icons';

// ── 1. CSV Import Modal ── //
export interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (csvText: string) => boolean;
  components?: Array<{ id?: string; name: string; maxMarks?: number | string }>;
}

export function CsvImportModal({
  isOpen,
  onClose,
  onImport,
  components = [],
}: CsvImportModalProps) {
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText((event.target?.result as string) || '');
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    const success = onImport(csvText);
    if (success) {
      setCsvText('');
      setFileName('');
      onClose();
    }
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Import Marksheet from CSV"
      subtitle="Upload or paste student marksheet data to populate rows"
      icon={UploadIcon}
      confirmText="Import Marks"
      confirmIcon={CheckIcon}
      confirmDisabled={!csvText.trim()}
      size="lg"
      callout={{
        title: 'CSV Format Guidelines',
        message: (
          <div className="space-y-1">
            <p>
              Format:{' '}
              <code className="font-mono text-[10px] theme-bg-sub px-1.5 py-0.5 rounded border theme-border">
                Roll, UniqueID, Name, Absent(YES/NO), {components.map((c) => c.name).join(', ')}, Remarks
              </code>
            </p>
            <p className="opacity-90">
              Student records are matched automatically by Student Roll Number or Unique ID.
            </p>
          </div>
        ),
      }}
    >
      <div>
        <label className="block text-xs font-bold theme-text-primary mb-1.5">
          Choose CSV File
        </label>
        <div className="relative border-2 border-dashed theme-border rounded-2xl p-6 text-center hover:theme-bg-sub/30 transition-colors">
          <input
            type="file"
            accept=".csv,text/csv"
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
    </ConfirmModal>
  );
}

// ── 2. Supervisor Unlock Modal ── //
export interface SupervisorUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmUnlock: (reason?: string) => void;
  subjectName?: string;
}

export function SupervisorUnlockModal({
  isOpen,
  onClose,
  onConfirmUnlock,
  subjectName,
}: SupervisorUnlockModalProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirmUnlock(reason);
    onClose();
  };

  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Supervisor Submission Override"
      subtitle="Exam Controller administrative authorization"
      icon={LockOpenIcon}
      confirmText="Authorize Unlock"
      confirmIcon={ShieldCheckIcon}
      callout={{
        title: 'Override Controller Submission Lock',
        message: `Unlocking ${subjectName || 'this subject'} will allow teachers to edit component marks and re-evaluate student grades.`,
      }}
    >
      <CustomInput
        label="Supervisor Reason / Audit Note (Optional)"
        placeholder="e.g. Re-checking authorized by Controller, clerical error correction..."
        value={reason}
        onChange={(val: any) => setReason(typeof val === 'string' ? val : val?.target?.value || '')}
      />
    </ConfirmModal>
  );
}

// ── 3. Submit to Exam Controller Confirmation Modal ── //
export interface SubmitConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  subjectName?: string;
  totalStudents?: number;
  evaluatedStudents?: number;
  absentStudents?: number;
}

export function SubmitConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  subjectName,
  totalStudents = 0,
  evaluatedStudents = 0,
  absentStudents = 0,
}: SubmitConfirmationModalProps) {
  return (
    <ConfirmModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Submit to Examination Controller"
      subtitle="Finalize subject marksheet and lock from further teacher edits"
      icon={ShieldCheckIcon}
      confirmText="Confirm & Submit"
      confirmLoading={isSubmitting}
      callout={{
        title: 'Official Marks Submission & Lock',
        message: `You are about to submit the final marksheet for "${subjectName || 'this subject'}". Once submitted, the marksheet will be locked from further edits by subject teachers.`,
      }}
      summaryItems={[
        { label: 'Enrolled', value: totalStudents },
        { label: 'Evaluated', value: evaluatedStudents, color: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Absent', value: absentStudents, color: 'text-amber-600 dark:text-amber-400' },
      ]}
      note="* Subsequent edits will require administrative supervisor authorization or controller unlock."
    />
  );
}
