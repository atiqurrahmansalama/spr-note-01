import React from 'react';
import QRCodeCardModal from '@/components/common/QRCodeCardModal';
import { TeacherIcon } from '@/components/ui/Icons';

interface StaffQRCodeCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenData: any;
}

export const StaffQRCodeCardModal: React.FC<StaffQRCodeCardModalProps> = ({
  isOpen,
  onClose,
  tokenData,
}) => {
  if (!isOpen || !tokenData) return null;

  const publicUrl = `${window.location.origin}/staff-onboard?token=${tokenData.token}`;
  const roleText = tokenData.designation ? `as ${tokenData.designation}` : 'as Faculty / Staff';
  const shareText = `Assalamu Alaikum,\nYou are invited to join the staff and faculty of ${tokenData.institution_name || 'our institution'} ${roleText}.\n\nPlease complete your official onboarding here:\n${publicUrl}`;

  const assignedPosts = Array.isArray(tokenData.allowed_designations) && tokenData.allowed_designations.length > 0
    ? tokenData.allowed_designations.join(', ')
    : tokenData.designation || '';

  const details: Array<{ label: string; value: string | number }> = [];
  details.push({
    label: 'Onboarding Flow',
    value: tokenData.onboarding_mode === 'QUICK' ? 'Quick Onboarding' : 'Full Onboarding Wizard',
  });
  if (assignedPosts) {
    details.push({ label: 'Permitted Posts', value: assignedPosts });
  }
  if (tokenData.department_name) {
    details.push({ label: 'Department', value: tokenData.department_name });
  }
  if (tokenData.staff_type) {
    details.push({ label: 'Staff Category', value: tokenData.staff_type });
  }
  if (tokenData.max_applications) {
    details.push({ label: 'Max Positions', value: tokenData.max_applications });
  }

  return (
    <QRCodeCardModal
      isOpen={isOpen}
      onClose={onClose}
      title="Staff Onboarding QR & Link"
      subtitle={tokenData.title}
      institutionName={tokenData.institution_name || 'Institution Faculty'}
      badgeLabel={tokenData.designation || 'Staff Invitation'}
      badgeColorClass="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
      publicUrl={publicUrl}
      shareText={shareText}
      entityIcon={TeacherIcon}
      toastSuccessMessage="Staff onboarding invitation link copied to clipboard!"
      posterTitle={`Staff Onboarding QR Poster - ${tokenData.title}`}
      posterAccentColor="#4f46e5"
      details={details}
    />
  );
};

