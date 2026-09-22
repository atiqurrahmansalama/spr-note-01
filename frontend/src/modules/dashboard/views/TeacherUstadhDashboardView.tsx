import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import KpiMetricsWidget from '../components/widgets/KpiMetricsWidget';
import TimetableScheduleWidget from '../components/widgets/TimetableScheduleWidget';
import QuickActionsWidget from '../components/widgets/QuickActionsWidget';
import AcademicProgressWidget from '../components/widgets/AcademicProgressWidget';
import type { DashboardMetric, DashboardQuickAction, ScheduleItem } from '../types';
import { 
  BookOpenIcon, 
  GroupsIcon, 
  AttendanceIcon, 
  SparklesIcon, 
  SavedMessagesIcon,
  TimerIcon,
} from '../../../components/ui/Icons';

export default function TeacherUstadhDashboardView() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  const metrics: DashboardMetric[] = [
    {
      id: 'my_students',
      label: 'My Assigned Students',
      value: 28,
      subLabel: 'Hifz Group B (Section 2)',
      trend: { value: '100% active', isPositive: true },
      icon: GroupsIcon,
      color: 'accent',
      onClick: () => navigate('/students'),
    },
    {
      id: 'classes_today',
      label: t('classesToday', 'Periods Today'),
      value: 4,
      subLabel: '2 completed, 1 in progress',
      trend: { value: 'On schedule', isPositive: true },
      icon: TimerIcon,
      color: 'emerald',
      onClick: () => navigate('/studies/daily-classroom'),
    },
    {
      id: 'pending_evaluations',
      label: 'Pending Recitations',
      value: 6,
      subLabel: 'Sabaq & Sabqi to log',
      trend: { value: '22 evaluated', isPositive: true },
      icon: BookOpenIcon,
      color: 'amber',
      onClick: () => navigate('/studies/recitations'),
    },
    {
      id: 'memorized_pages',
      label: t('memorizedPages', 'Pages Memorized Today'),
      value: 34,
      subLabel: 'Across all assigned pupils',
      trend: { value: '+4 vs target', isPositive: true },
      icon: SparklesIcon,
      color: 'purple',
      onClick: () => navigate('/studies/progress-management'),
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'daily_classroom',
      title: t('dailyClassroom', 'Daily Classroom'),
      description: 'Sabaq & lessons assessment',
      icon: BookOpenIcon,
      color: 'accent',
      badge: 'Live',
      path: '/studies/daily-classroom',
      onClick: () => navigate('/studies/daily-classroom'),
    },
    {
      id: 'roll_call',
      title: t('takeAttendance', 'Class Attendance'),
      description: 'Mark student roll-call',
      icon: AttendanceIcon,
      color: 'emerald',
      path: '/attendance/students/monthly-matrix',
      onClick: () => navigate('/attendance/students/monthly-matrix'),
    },
    {
      id: 'report_builder',
      title: 'Hifz Progress Log',
      description: 'Record recitation marks',
      icon: SavedMessagesIcon,
      color: 'purple',
      path: '/studies/daily-classroom?tab=PROGRESS',
      onClick: () => navigate('/studies/daily-classroom?tab=PROGRESS'),
    },
    {
      id: 'my_routine',
      title: t('mySchedule', 'My Class Routine'),
      description: 'Weekly period matrix',
      icon: TimerIcon,
      color: 'sky',
      path: '/academy/periods',
      onClick: () => navigate('/academy/periods'),
    },
  ];

  const scheduleItems: ScheduleItem[] = [
    {
      id: '1',
      periodName: 'Period 1',
      timeSlot: '08:00 AM - 09:15 AM',
      className: 'Hifz Group B',
      sectionName: 'Morning Shift',
      subject: 'New Lesson (Sabaq) Memorization',
      room: 'Room 102',
      status: 'COMPLETED',
    },
    {
      id: '2',
      periodName: 'Period 2',
      timeSlot: '09:30 AM - 10:45 AM',
      className: 'Hifz Group B',
      sectionName: 'Morning Shift',
      subject: 'Recent Revision (Sabqi)',
      room: 'Room 102',
      status: 'IN_PROGRESS',
    },
    {
      id: '3',
      periodName: 'Period 3',
      timeSlot: '11:15 AM - 12:30 PM',
      className: 'Tajweed & Makhaarij',
      sectionName: 'Combined',
      subject: 'Rules of Noon Saakin & Meem',
      room: 'Auditorium Hall',
      status: 'UPCOMING',
    },
    {
      id: '4',
      periodName: 'Period 4',
      timeSlot: '02:00 PM - 03:30 PM',
      className: 'Hifz Group B',
      sectionName: 'Afternoon Shift',
      subject: 'Long-term Memorization (Amukhta)',
      room: 'Room 102',
      status: 'UPCOMING',
    },
  ];

  const progressItems = [
    { id: '1', label: 'Assigned Group Sabaq Completion', percentage: 94, subLabel: '26 of 28 completed target page', color: 'emerald' as const },
    { id: '2', label: 'Sabqi (Recent Revision) Accuracy', percentage: 89, subLabel: 'Strong memorization retention', color: 'accent' as const },
    { id: '3', label: 'Quarterly Tajweed Mastery', percentage: 82, subLabel: 'Pronunciation evaluation on track', color: 'purple' as const },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Teacher Focused KPI Metrics */}
      <KpiMetricsWidget metrics={metrics} />

      {/* 2. Today's Period Schedule & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimetableScheduleWidget 
          items={scheduleItems} 
          onViewAll={() => navigate('/academy/periods')} 
        />
        <QuickActionsWidget actions={quickActions} />
      </div>

      {/* 3. Academic Group Progress Tracker */}
      <AcademicProgressWidget items={progressItems} title="Assigned Group Memorization Health" />
    </div>
  );
}
