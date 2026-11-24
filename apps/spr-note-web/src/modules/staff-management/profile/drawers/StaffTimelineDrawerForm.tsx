import React from 'react';
import {
  LifecycleTimelineDrawerForm,
  LifecycleTimelineDrawerFormProps,
  LIFECYCLE_TIMELINE_ICONS,
} from '@/components/common/timeline';
import type { StaffTimelineRecord } from '../staffTimelineStore';

export interface StaffTimelineDrawerFormProps {
  initialData?: StaffTimelineRecord | null;
  onSave: (data: Omit<StaffTimelineRecord, 'id' | 'created_at'>) => void;
  onClose: () => void;
  isSubmitting?: boolean;
}

export const TIMELINE_ICONS = LIFECYCLE_TIMELINE_ICONS;

export const StaffTimelineDrawerForm: React.FC<StaffTimelineDrawerFormProps> = ({
  initialData,
  onSave,
  onClose,
  isSubmitting = false,
}) => {
  return (
    <LifecycleTimelineDrawerForm
      entityType="staff"
      initialData={initialData as any}
      onSave={onSave}
      onClose={onClose}
      isSubmitting={isSubmitting}
    />
  );
};

export default StaffTimelineDrawerForm;
