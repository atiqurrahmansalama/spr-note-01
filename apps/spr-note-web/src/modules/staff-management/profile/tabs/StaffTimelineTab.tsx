import React from 'react';
import { StudentTimelineTab } from '@/modules/student-management/directory/profile/tabs/StudentTimelineTab';
import type { StaffMember } from '@/types/staff';

export interface StaffTimelineTabProps {
  staff: StaffMember;
  timeline?: any[];
}

export const StaffTimelineTab: React.FC<StaffTimelineTabProps> = ({
  staff,
  timeline: propTimeline,
}) => {
  const timeline =
    propTimeline ||
    (staff as any).timeline || [
      {
        id: `joining_${staff.id}`,
        title: `Joined as ${staff.designation || 'Staff Member'}`,
        description: `Officially appointed to ${staff.department_name || 'Institution'} on ${staff.joining_date || 'Appointment Date'}.`,
        date: staff.joining_date || staff.created_at,
        action: 'APPOINTMENT',
      },
    ];

  return <StudentTimelineTab timeline={timeline} />;
};

export default StaffTimelineTab;
