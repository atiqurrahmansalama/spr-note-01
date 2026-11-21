import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from '../../../../../components/ui/Modal';
import { CopyIcon, DownloadIcon, CheckCircleIcon } from '../../../../../components/ui/Icons';
import { useToast } from '../../../../../context/ToastContext';
import { StudentFullProfile } from '../types';

export interface StudentQrModalProps {
  isOpen: boolean;
  student: StudentFullProfile;
  onClose: () => void;
}

export const StudentQrModal: React.FC<StudentQrModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const { showToast } = useToast();
  const qrVerificationUrl = `${window.location.origin}/verify-report/${student.uniq_id || student.id}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(qrVerificationUrl);
    showToast('Verification URL copied to clipboard!', 'success');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Verification QR Code"
      subtitle="Digital authentication credential for academic reports and official records"
      size="md"
    >
      <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center">
        {/* QR Code Container */}
        <div className="p-4 rounded-3xl theme-bg-surface border-0 shadow-sm bg-white inline-block">
          <QRCodeSVG
            value={qrVerificationUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Student Summary */}
        <div className="space-y-1">
          <h4 className="text-base font-bold theme-text-primary">
            {student.name_en || student.name}
          </h4>
          <p className="text-xs font-mono theme-text-secondary">
            ID: {student.uniq_id || `STU-${student.id}`} • Roll #{student.roll_number || '—'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 w-full">
          <button
            type="button"
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl theme-bg-app hover:theme-bg-elevated/40 theme-text-primary text-xs font-semibold border-0 shadow-xs cursor-pointer transition-all"
          >
            <CopyIcon className="w-3.5 h-3.5" />
            <span>Copy URL</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold border-0 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            <span>Print ID / QR</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentQrModal;
