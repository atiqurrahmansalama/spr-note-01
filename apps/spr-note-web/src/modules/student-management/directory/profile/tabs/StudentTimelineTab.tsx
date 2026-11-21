import React from 'react';
import { HistoryIcon, CheckCircleIcon } from '../../../../../components/ui/Icons';
import { StudentFullProfile, StudentTimelineRecord } from '../types';

export interface StudentTimelineTabProps {
  student: StudentFullProfile;
}

export const StudentTimelineTab: React.FC<StudentTimelineTabProps> = ({ student }) => {
  const timeline: StudentTimelineRecord[] =
    student.timeline ||
    student.academic_history ||
    [
      {
        id: 'initial_admission',
        title: 'Initial Admission Enrolment',
        description: `Student officially enrolled in ${student.student_class_name || 'Academy'} for Academic Session ${student.session_year || student.academic_year || 'Current'}.`,
        date: student.admission_date || 'Enrolled',
        action: 'ADMISSION',
      },
    ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Lifecycle &amp; Academic Timeline
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Historical record of admissions, promotions, academic transfers, and credentials
            </p>
          </div>
        </div>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:theme-bg-sub/80">
          {timeline.map((item, index) => {
            const dateStr = item.date || item.created_at || item.timestamp || '—';
            return (
              <div key={`timeline_${item.id || index}`} className="relative group">
                {/* Timeline Dot Indicator */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 w-3.5 h-3.5 rounded-full theme-bg-accent ring-4 ring-[var(--bg-surface)] shrink-0 shadow-xs" />

                {/* Event Card */}
                <div className="rounded-2xl theme-bg-app p-4 sm:p-5 border-0 shadow-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold theme-text-primary">
                      {item.title || item.action?.replace(/_/g, ' ') || 'Academic Milestone'}
                    </h4>
                    <span className="text-[11px] font-mono theme-text-secondary">
                      {dateStr}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs theme-text-secondary leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  {(item.class_name || item.group_name || item.department_name) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold">
                      {item.department_name && (
                        <span className="px-2.5 py-0.5 rounded-lg theme-bg-surface theme-text-secondary">
                          {item.department_name}
                        </span>
                      )}
                      {item.class_name && (
                        <span className="px-2.5 py-0.5 rounded-lg theme-bg-surface theme-accent font-mono">
                          {item.class_name}
                        </span>
                      )}
                      {item.group_name && (
                        <span className="px-2.5 py-0.5 rounded-lg theme-bg-surface theme-text-secondary">
                          {item.group_name}
                        </span>
                      )}
                    </div>
                  )}

                  {item.performed_by_name && (
                    <p className="text-[10px] theme-text-secondary font-mono opacity-80 pt-1">
                      Logged by: {item.performed_by_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StudentTimelineTab;
