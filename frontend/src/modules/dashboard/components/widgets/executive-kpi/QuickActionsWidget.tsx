import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../../../i18n';
import type { DashboardQuickAction } from '../../../types';
import { useFeatureControl } from '../../../../../context/FeatureControlContext';
import {
  SparklesIcon,
  BookOpenIcon,
  AttendanceIcon,
  TimerIcon,
  CalendarIcon,
  ClassIcon,
  StudentIcon,
  TeacherIcon,
  BuildingOfficeIcon,
  PlusIcon,
} from '../../../../../components/ui/Icons';

export interface AppShortcutItem {
  id: string;
  title: string;
  description: string;
  path: string;
  category: string;
  color: 'accent' | 'emerald' | 'purple' | 'amber' | 'rose' | 'sky';
  icon: React.ComponentType<{ className?: string }>;
  requiredFeatureKey?: string;
}

export const AVAILABLE_APP_SHORTCUTS: AppShortcutItem[] = [
  {
    id: 'daily_progress',
    title: 'Daily Progress Entry',
    description: 'Log daily sabaq, sabqi, dawr, mistakes & stucks',
    path: '/studies/daily-progress',
    category: 'Daily Classroom',
    color: 'purple',
    icon: BookOpenIcon,
    requiredFeatureKey: 'progress_management',
  },
  {
    id: 'progress_reports',
    title: 'Progress Reports',
    description: 'Comprehensive student recitation logs & reports',
    path: '/studies/progress-reports',
    category: 'Daily Classroom',
    color: 'accent',
    icon: SparklesIcon,
    requiredFeatureKey: 'progress_management',
  },
  {
    id: 'progress_analytics',
    title: 'Progress Analytics',
    description: 'Recitation trends, speed & retention charts',
    path: '/studies/progress-analytics',
    category: 'Daily Classroom',
    color: 'sky',
    icon: SparklesIcon,
    requiredFeatureKey: 'progress_management',
  },
  {
    id: 'daily_attendance',
    title: 'Class Attendance Matrix',
    description: 'Record student attendance & dispatch alerts',
    path: '/attendance/students/monthly-matrix',
    category: 'Attendance',
    color: 'emerald',
    icon: AttendanceIcon,
    requiredFeatureKey: 'monthly_attendance_matrix',
  },
  {
    id: 'surprise_headcount',
    title: 'Surprise Headcount',
    description: 'Ad-hoc presence audit across campus & hostels',
    path: '/attendance/students/adhoc',
    category: 'Attendance',
    color: 'amber',
    icon: AttendanceIcon,
    requiredFeatureKey: 'monthly_attendance_matrix',
  },
  {
    id: 'campus_structure',
    title: 'Campus Structure',
    description: 'Multi-campus institutions, branches & depts',
    path: '/academy/campus-profile',
    category: 'Academy Structure',
    color: 'accent',
    icon: BuildingOfficeIcon,
    requiredFeatureKey: 'campus_profile',
  },
  {
    id: 'classes_sections',
    title: 'Classes & Sections',
    description: 'Academic grades, sections & mentorship groups',
    path: '/academy/classes-groups',
    category: 'Academy Structure',
    color: 'purple',
    icon: ClassIcon,
    requiredFeatureKey: 'student_classes',
  },
  {
    id: 'routine_curriculum',
    title: 'Routine & Curriculum',
    description: 'Period timetables & syllabus progression',
    path: '/academy/periods',
    category: 'Academy Structure',
    color: 'sky',
    icon: TimerIcon,
    requiredFeatureKey: 'class_period_slots',
  },
  {
    id: 'calendar_events',
    title: 'Calendar & Events',
    description: 'Master shifts, academic holidays & calendar',
    path: '/academy/calendar-events',
    category: 'Calendar & Events',
    color: 'emerald',
    icon: CalendarIcon,
    requiredFeatureKey: 'academy_calendar_events',
  },
  {
    id: 'student_roster',
    title: 'Student Directory',
    description: 'Enrolled students, guardian contacts & cards',
    path: '/students',
    category: 'Students & Staff',
    color: 'accent',
    icon: StudentIcon,
    requiredFeatureKey: 'student_roster',
  },
  {
    id: 'admission',
    title: 'Student Admission',
    description: 'New applicant intake & enrollment pipeline',
    path: '/admission',
    category: 'Students & Staff',
    color: 'amber',
    icon: PlusIcon,
    requiredFeatureKey: 'student_admission',
  },
  {
    id: 'staff_roster',
    title: 'Teacher & Staff Roster',
    description: 'Faculty profiles, shift assignments & duties',
    path: '/staff/roster',
    category: 'Students & Staff',
    color: 'rose',
    icon: TeacherIcon,
    requiredFeatureKey: 'staff_roster',
  },
  {
    id: 'student_billing',
    title: 'Student Billing & Fees',
    description: 'Tuition fees, dues & collection vouchers',
    path: '/finance/student-billing',
    category: 'Finance & Accounts',
    color: 'emerald',
    icon: BuildingOfficeIcon,
    requiredFeatureKey: 'finance_student_billing',
  },
  {
    id: 'staff_payroll',
    title: 'Staff Payroll',
    description: 'Salary disbursements, allowances & deductions',
    path: '/finance/staff-payroll',
    category: 'Finance & Accounts',
    color: 'sky',
    icon: BuildingOfficeIcon,
    requiredFeatureKey: 'finance_staff_payroll',
  },
  {
    id: 'general_ledger',
    title: 'General Ledger',
    description: 'Institutional accounts, vouchers & cash flow',
    path: '/finance/general-ledger',
    category: 'Finance & Accounts',
    color: 'accent',
    icon: BuildingOfficeIcon,
    requiredFeatureKey: 'finance_general_ledger',
  },
];

export interface QuickActionsWidgetProps {
  actions?: DashboardQuickAction[];
  selectedActionIds?: string[];
  title?: string;
  className?: string;
}

const ACTION_COLOR_STYLES: Record<string, { bg: string; text: string; ring: string }> = {
  accent: {
    bg: 'theme-bg-accent-soft text-[var(--accent-main)]',
    text: 'text-[var(--accent-main)]',
    ring: '',
  },
  emerald: {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: '',
  },
  purple: {
    bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
    ring: '',
  },
  amber: {
    bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    ring: '',
  },
  rose: {
    bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    ring: '',
  },
  sky: {
    bg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    ring: '',
  },
};

export default function QuickActionsWidget({
  actions,
  selectedActionIds,
  title,
  className = '',
}: QuickActionsWidgetProps) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { isFeatureEnabled } = useFeatureControl();

  // Dynamically resolve actions with Feature & Module Control gating
  const resolvedActions = useMemo(() => {
    // Filter master shortcut pool by active system permissions
    const permittedShortcuts = AVAILABLE_APP_SHORTCUTS.filter(
      (item) => !item.requiredFeatureKey || isFeatureEnabled(item.requiredFeatureKey)
    );

    if (selectedActionIds && selectedActionIds.length > 0) {
      return selectedActionIds
        .map((id) => permittedShortcuts.find((item) => item.id === id))
        .filter((item): item is AppShortcutItem => Boolean(item))
        .map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          icon: item.icon,
          color: item.color,
          path: item.path,
          onClick: () => navigate(item.path),
        }));
    }

    if (actions && actions.length > 0) {
      return actions.map((act) => ({
        ...act,
        onClick: act.onClick || (act.path ? () => navigate(act.path!) : undefined),
      }));
    }

    // Default fallback actions from permitted list
    return permittedShortcuts.slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      icon: item.icon,
      color: item.color,
      path: item.path,
      onClick: () => navigate(item.path),
    }));
  }, [selectedActionIds, actions, navigate, isFeatureEnabled]);

  if (!resolvedActions || resolvedActions.length === 0) return null;

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs hover:shadow-md h-full flex flex-col justify-start space-y-3.5 select-none min-w-0 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-1 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <SparklesIcon className="w-4 h-4 theme-accent shrink-0" />
          <h3 className="text-sm font-bold theme-text-primary truncate">
            {title || t('quickActions', 'Quick Actions')}
          </h3>
        </div>
      </div>

      {/* Grid: Naturally top-aligned, leftover space stays at bottom */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {resolvedActions.map((act) => {
          const Icon = act.icon;
          const style = ACTION_COLOR_STYLES[act.color || 'accent'] || ACTION_COLOR_STYLES.accent;

          return (
            <button
              key={act.id}
              type="button"
              onClick={act.onClick}
              className="p-3 rounded-xl theme-bg-sub/60 hover:theme-bg-sub transition-all cursor-pointer flex flex-col justify-start items-start text-left rtl:text-right gap-2.5 group min-w-0"
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg} shadow-xs group-hover:scale-105 transition-transform`}>
                  <Icon className="w-4 h-4" />
                </div>

                {act.badge && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md theme-bg-surface theme-text-secondary font-bold">
                    {act.badge}
                  </span>
                )}
              </div>

              <div className="space-y-0.5 min-w-0 w-full">
                <div className="text-xs font-bold theme-text-primary truncate group-hover:theme-accent transition-colors">
                  {act.title}
                </div>
                {act.description && (
                  <div className="text-[10px] theme-text-secondary truncate">
                    {act.description}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
