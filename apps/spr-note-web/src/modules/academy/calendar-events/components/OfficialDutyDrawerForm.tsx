/**
 * Official Institutional Duty Drawer Form Adapter
 * =================================================
 * Thin backward-compatible adapter wrapping UnifiedTaskDutyDrawerForm
 * in 'DUTY' domain mode.
 */

import React from 'react';
import UnifiedTaskDutyDrawerForm from './UnifiedTaskDutyDrawerForm';
import type { InstitutionalDuty } from '../types';

export interface OfficialDutyDrawerFormProps {
  duty?: InstitutionalDuty | null;
  initialDate?: string;
  initialEditMode?: boolean;
  canEdit?: boolean;
  onSave: (dutyData: Partial<InstitutionalDuty>) => void;
  onQuickUpdate?: (dutyData: Partial<InstitutionalDuty>) => void;
  onCancel?: () => void;
  onDelete?: (dutyId: string) => void;
}

export function OfficialDutyDrawerForm({
  duty,
  initialDate,
  initialEditMode,
  canEdit = true,
  onSave,
  onQuickUpdate,
  onCancel,
  onDelete,
}: OfficialDutyDrawerFormProps) {
  return (
    <UnifiedTaskDutyDrawerForm
      duty={duty}
      initialDomain="DUTY"
      initialDate={initialDate}
      initialEditMode={initialEditMode}
      canEdit={canEdit}
      onSave={onSave}
      onQuickUpdate={onQuickUpdate}
      onCancel={onCancel}
      onDelete={onDelete}
    />
  );
}

export default OfficialDutyDrawerForm;
