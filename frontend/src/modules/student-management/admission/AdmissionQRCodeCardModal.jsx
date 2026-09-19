import React from 'react';
import QRCodeCardModal from '../../../components/common/QRCodeCardModal';
import { AcademicCapIcon } from '../../../components/ui/Icons';

export default function AdmissionQRCodeCardModal({ isOpen, onClose, tokenData }) {
  if (!isOpen || !tokenData) return null;

  const publicUrl = `${window.location.origin}/apply?token=${tokenData.token}`;
  const shareText = `Online Admission is now open for ${tokenData.institution_name || 'our institution'}!\nSession: ${tokenData.session_year}\nApply online here: ${publicUrl}`;

  const details = [];
  if (tokenData.target_class_name) {
    details.push({ label: 'Target Class', value: tokenData.target_class_name });
  }
  if (tokenData.max_applications) {
    details.push({ label: 'Seat Quota', value: tokenData.max_applications });
  }

  return (
    <QRCodeCardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Admission QR & Link"
      subtitle={tokenData.title}
      institutionName={tokenData.institution_name || 'Academic Institution'}
      badgeLabel={`Session: ${tokenData.session_year}`}
      badgeColorClass="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      publicUrl={publicUrl}
      shareText={shareText}
      entityIcon={AcademicCapIcon}
      toastSuccessMessage="Admission link copied to clipboard!"
      posterTitle={`Admission QR Poster - ${tokenData.title}`}
      posterAccentColor="#2563eb"
      details={details}
    />
  );
}
