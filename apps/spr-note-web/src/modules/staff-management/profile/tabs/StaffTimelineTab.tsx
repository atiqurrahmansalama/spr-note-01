import React from 'react';
import { LifecycleTimelineTab } from '@/components/common/timeline';
import type { StaffMember } from '@/types/staff';
import type { LifecycleTimelineRecord } from '@/components/common/timeline';

export interface StaffTimelineTabProps {
  staff: StaffMember;
  timeline?: any[];
  className?: string;
}

export const StaffTimelineTab: React.FC<StaffTimelineTabProps> = ({
  staff,
  className = '',
}) => {
  const initialJoiningDate = staff.joining_date || (staff as any).created_at || new Date().toISOString().split('T')[0];
  const initialRecord: LifecycleTimelineRecord = {
    id: `appointment_${staff.id}`,
    date: typeof initialJoiningDate === 'string' ? initialJoiningDate.split('T')[0] : '2026-01-01',
    badge: 'Official Appointment',
    title: `Appointed as ${staff.designation || 'Staff Member'}`,
    subtitle: staff.department_name || 'Academic Institution',
    description: `Officially appointed to ${staff.department_name || 'Academic Institution'} on ${initialJoiningDate}.`,
    iconKey: 'appointment',
    created_at: new Date().toISOString(),
  };

  return (
    <LifecycleTimelineTab
      entityType="staff"
      entityId={staff.id}
      entityName={staff.user_name || staff.employee_id}
      entitySubtitle={staff.designation}
      initialRecord={initialRecord}
      className={className}
    />
  );
};

export default StaffTimelineTab;
