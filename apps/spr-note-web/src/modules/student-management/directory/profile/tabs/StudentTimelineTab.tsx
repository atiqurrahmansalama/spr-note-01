/**
 * Student Lifecycle & Academic Timeline Tab (Pure UI Presentation)
 * =================================================================
 * Displays an official chronological stream of student lifecycle milestones,
 * admissions, promotions, academic transfers, and credentials.
 *
 * Architecture:
 * - Pure UI Component: Does not fetch or mutate data directly; consumes timeline
 *   records pushed dynamically from academic, admission, transfer, and hostel modules.
 * - Minimalist 3-Line Vertical Hierarchy (RULE 14 & Specification):
 *   1. Line 1: Date & Time (e.g., Oct 05, 2026, 10:25 PM)
 *   2. Line 2: Header ("কী হয়েছে" - milestone / action title)
 *   3. Line 3: 1-2 lines Description (concise event narrative)
 * - Dynamic Module Icons: Defaults to CalendarIcon; dynamically renders icon passed
 *   from triggering module (TransferIcon, AdmissionIcon, AcademicCapIcon, BuildingOfficeIcon, etc.).
 * - Visible Vertical Spine: Crisp, high-contrast 2px connecting line.
 * - Zero "pending" items (all records are completed milestones).
 * - Zero hardcoded colors, zero emojis (RULE 1 & user_rules).
 */

import React from 'react';
import {
  CalendarIcon,
  TransferIcon,
  AdmissionIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  ClockIcon,
  DutyIcon,
  TeacherIcon,
  HistoryIcon,
} from '../../../../../components/ui/Icons';
import { formatDisplayDateTime } from '../../../../../utils/dateUtils';
import { StudentFullProfile, StudentTimelineRecord } from '../types';

export interface StudentTimelineTabProps {
  student?: StudentFullProfile | any;
  timeline?: StudentTimelineRecord[] | any[];
  className?: string;
}

/**
 * Resolves the appropriate dynamic milestone icon.
 * Prefers explicit icon component passed from the source module,
 * maps known module actions, and defaults cleanly to CalendarIcon.
 */
function getTimelineIcon(item: any): React.ComponentType<{ className?: string }> {
  if (item.icon) {
    return item.icon;
  }
  const actionKey = String(item.action || item.module || item.type || item.category || '').toUpperCase();
  if (actionKey.includes('TRANSFER') || actionKey.includes('MIGRATE') || actionKey.includes('SECTION')) {
    return TransferIcon;
  }
  if (actionKey.includes('ADMISSION') || actionKey.includes('ENROLL') || actionKey.includes('JOIN') || actionKey.includes('APPOINTMENT')) {
    return AdmissionIcon;
  }
  if (actionKey.includes('DUTY')) {
    return DutyIcon;
  }
  if (actionKey.includes('TEACHER') || actionKey.includes('STAFF')) {
    return TeacherIcon;
  }
  if (actionKey.includes('CLASS') || actionKey.includes('PROMOTION') || actionKey.includes('EXAM') || actionKey.includes('ASSIGNMENT')) {
    return AcademicCapIcon;
  }
  if (actionKey.includes('HOSTEL') || actionKey.includes('DORM') || actionKey.includes('RESIDENTIAL')) {
    return BuildingOfficeIcon;
  }
  if (actionKey.includes('STATUS') || actionKey.includes('TIME') || actionKey.includes('LEAVE')) {
    return ClockIcon;
  }
  return CalendarIcon;
}

export const StudentTimelineTab: React.FC<StudentTimelineTabProps> = ({
  student,
  timeline: propTimeline,
  className = '',
}) => {
  // Pure UI data consumption: prioritizes propTimeline, then student.timeline / academic_history, then default fallback
  const rawTimeline =
    propTimeline ||
    student?.timeline ||
    student?.academic_history;

  const timeline: StudentTimelineRecord[] =
    rawTimeline && rawTimeline.length > 0
      ? rawTimeline
      : [
          {
            id: 'initial_admission',
            title: 'Initial Admission Enrolment',
            description: `Student officially enrolled in ${student?.student_class_name || 'Academy'} for Academic Session ${student?.session_year || student?.academic_year || 'Current'}.`,
            date: student?.admission_date || student?.created_at || 'Enrolled',
            action: 'ADMISSION',
          },
        ];

  if (!timeline || timeline.length === 0) {
    return (
      <div className={`p-10 text-center rounded-3xl theme-bg-surface border-0 shadow-xs space-y-2 ${className}`}>
        <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto">
          <HistoryIcon className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-bold theme-text-primary">No Milestones Recorded</h4>
        <p className="text-xs theme-text-secondary">
          No chronological lifecycle events or academic transitions have been logged for this profile yet.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 animate-fade-in ${className}`}>
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs">
        {/* Minimal Linear Timeline Stream (Matching User Reference Image & Pure 3-Line Structure) */}
        <div className="pl-1 sm:pl-2">
          {timeline.map((item, index) => {
            const rawDate = item.date || item.created_at || item.timestamp;
            const dateStr = formatDisplayDateTime(rawDate);
            const isLast = index === timeline.length - 1;
            const ItemIcon = getTimelineIcon(item);

            return (
              <div key={`timeline_${item.id || index}`} className="relative flex items-start gap-4 sm:gap-5 group">
                {/* Left Spine: Circular Dynamic Icon Node + Strongly Visible Connecting Line */}
                <div className="flex flex-col items-center shrink-0 self-stretch">
                  {/* Circular Node with Default Calendar or Dynamic Module Icon */}
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full theme-bg-accent theme-accent-text flex items-center justify-center shadow-xs shrink-0 z-10 transition-transform duration-150 group-hover:scale-105">
                    <ItemIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                  </div>

                  {/* Strongly Visible Connecting Spine Line */}
                  {!isLast && (
                    <div className="w-[2px] flex-1 bg-[var(--accent-main)]/80 dark:bg-[var(--accent-main)]/90 my-1 min-h-[36px]" />
                  )}
                </div>

                {/* Right Content Column: Strict Minimal 3-Line Layout */}
                <div className={`flex-1 min-w-0 ${!isLast ? 'pb-7 sm:pb-8' : 'pb-2'}`}>
                  {/* Line 1: Date & Time */}
                  <span className="text-xs font-normal theme-text-secondary block leading-none pt-0.5 sm:pt-1">
                    {dateStr}
                  </span>

                  {/* Line 2: Header ("কী হয়েছে" - Milestone Action Title) */}
                  <h4 className="text-sm sm:text-base font-semibold theme-text-primary mt-1 tracking-tight leading-snug">
                    {item.title || item.action?.replace(/_/g, ' ') || 'Milestone Recorded'}
                  </h4>

                  {/* Line 3: 1-2 lines Description */}
                  {item.description && (
                    <p className="text-xs sm:text-sm theme-text-secondary mt-1 leading-relaxed line-clamp-2">
                      {item.description}
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
