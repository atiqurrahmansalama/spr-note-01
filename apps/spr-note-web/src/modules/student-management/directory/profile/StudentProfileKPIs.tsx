import React from 'react';
import {
  BookOpenIcon,
  CheckCircleIcon,
  CalendarIcon,
  TagIcon,
  ClassIcon,
} from '../../../../components/ui/Icons';
import MetricsGrid from '../../../../components/ui/MetricsGrid';
import { StudentFullProfile } from './types';

export interface StudentProfileKPIsProps {
  student: StudentFullProfile;
  isHifz?: boolean;
}

export const StudentProfileKPIs: React.FC<StudentProfileKPIsProps> = ({
  student,
  isHifz = false,
}) => {
  const completedJuz = student.details?.initial_completed_juz || 0;
  const docsCount = student.documents?.length || 0;
  const session =
    student.academic_detail?.session_year ||
    student.session_year ||
    student.admission_date ||
    'Active';

  return (
    <MetricsGrid
      cols={4}
      items={[
        {
          label: isHifz ? 'Quran Progress' : 'Academic Class',
          value: isHifz ? `${completedJuz} / 30 Juz` : (student.student_class_name || 'Enrolled'),
          icon: isHifz ? BookOpenIcon : ClassIcon,
          subLabel: isHifz ? `${Math.round((completedJuz / 30) * 100)}% completed` : 'Current Level',
          color: 'accent',
        },
        {
          label: 'Enrolment Status',
          value: (student.status || 'ACTIVE').toUpperCase(),
          icon: CheckCircleIcon,
          subLabel: (student.target_status || 'Regular Student').replace(/_/g, ' '),
          color: 'emerald',
        },
        {
          label: 'Document Vault',
          value: `${docsCount} Files`,
          icon: TagIcon,
          subLabel: docsCount > 0 ? 'Verified in Vault' : 'No attachments',
          color: 'default',
        },
        {
          label: 'Academic Session',
          value: session,
          icon: CalendarIcon,
          subLabel: student.admission_date ? `Admitted ${student.admission_date}` : 'Current Session',
          color: 'purple',
        },
      ]}
    />
  );
};

export default StudentProfileKPIs;
