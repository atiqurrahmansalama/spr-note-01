import React from 'react';
import { LifecycleTimelineTab } from '@/components/common/timeline';
import type { StudentFullProfile } from '../types';
import type { LifecycleTimelineRecord } from '@/components/common/timeline';

export interface StudentTimelineTabProps {
  student?: StudentFullProfile | any;
  timeline?: any[];
  className?: string;
}

export const StudentTimelineTab: React.FC<StudentTimelineTabProps> = ({
  student,
  className = '',
}) => {
  const initialDate = student?.admission_date || student?.created_at || new Date().toISOString().split('T')[0];
  const initialRecord: LifecycleTimelineRecord = {
    id: `admission_${student?.id || 'new'}`,
    date: typeof initialDate === 'string' ? initialDate.split('T')[0] : '2026-01-01',
    badge: 'Admission Enrolment',
    title: `Enrolled in ${student?.student_class_name || 'Academic Class'}`,
    subtitle: `Academic Session ${student?.session_year || student?.academic_year || 'Current'}`,
    description: `Student officially enrolled in ${student?.student_class_name || 'Academy'}${
      student?.section_name ? ` (Section: ${student.section_name})` : ''
    }.`,
    iconKey: 'admission',
    created_at: new Date().toISOString(),
  };

  return (
    <LifecycleTimelineTab
      entityType="student"
      entityId={student?.id || 'unknown'}
      entityName={student?.name_en || student?.name || 'Student'}
      entitySubtitle={student?.student_class_name}
      initialRecord={initialRecord}
      className={className}
    />
  );
};

export default StudentTimelineTab;
