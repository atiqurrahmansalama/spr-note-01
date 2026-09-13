import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import KpiMetricsWidget from '../components/widgets/KpiMetricsWidget';
import AttendancePulseWidget from '../components/widgets/AttendancePulseWidget';
import QuickActionsWidget from '../components/widgets/QuickActionsWidget';
import AcademicProgressWidget from '../components/widgets/AcademicProgressWidget';
import UpcomingEventsWidget from '../components/widgets/UpcomingEventsWidget';
import RecentActivityFeedWidget from '../components/widgets/RecentActivityFeedWidget';
import { useDashboardData } from '../hooks/useDashboardData';
import type { DashboardMetric, DashboardQuickAction } from '../types';
import { 
  GroupsIcon, 
  TeacherIcon, 
  AttendanceIcon, 
  AdmissionIcon, 
  BellIcon, 
  CalendarIcon, 
} from '../../../components/ui/Icons';

export default function AdminPrincipalDashboardView() {
  const { t, formatNumber } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { 
    totalStudents, 
    totalStaff, 
    studentAttendanceRate, 
    staffAttendanceRate,
    pendingAdmissionsCount,
    pulseData,
    upcomingEvents,
    recentActivities,
  } = useDashboardData();

  const metrics: DashboardMetric[] = [
    {
      id: 'students',
      label: t('totalStudents', 'Enrolled Students'),
      value: totalStudents,
      subLabel: `${formatNumber(totalStudents)} active learners`,
      trend: { value: '+14 this month', isPositive: true },
      icon: GroupsIcon,
      color: 'accent',
      onClick: () => navigate('/students'),
    },
    {
      id: 'today_att',
      label: t('todayAttendance', "Student Attendance"),
      value: `${formatNumber(studentAttendanceRate)}%`,
      subLabel: `${formatNumber(pulseData.present)} of ${formatNumber(totalStudents)} present`,
      trend: { value: '+2.1% vs target', isPositive: true },
      icon: AttendanceIcon,
      color: 'emerald',
      onClick: () => navigate('/attendance/students/monthly-matrix'),
    },
    {
      id: 'staff_att',
      label: t('staffAttendance', "Staff Attendance"),
      value: `${formatNumber(staffAttendanceRate)}%`,
      subLabel: `${formatNumber(totalStaff)} faculty members`,
      trend: { value: 'Full roster', isPositive: true },
      icon: TeacherIcon,
      color: 'purple',
      onClick: () => navigate('/staff/attendance'),
    },
    {
      id: 'admissions',
      label: t('pendingAdmissions', 'Pending Admissions'),
      value: pendingAdmissionsCount,
      subLabel: 'Review applications',
      trend: { value: 'Active cycle', isPositive: true },
      icon: AdmissionIcon,
      color: 'amber',
      onClick: () => navigate('/admission'),
    },
  ];

  const quickActions: DashboardQuickAction[] = [
    {
      id: 'new_admission',
      title: t('newAdmission', 'New Admission'),
      description: 'Enroll student record',
      icon: AdmissionIcon,
      color: 'accent',
      path: '/admission',
      onClick: () => navigate('/admission'),
    },
    {
      id: 'take_att',
      title: t('logAttendance', 'Class Attendance'),
      description: 'Daily roll-call matrix',
      icon: AttendanceIcon,
      color: 'emerald',
      path: '/attendance/students/monthly-matrix',
      onClick: () => navigate('/attendance/students/monthly-matrix'),
    },
    {
      id: 'broadcast',
      title: t('createNotice', 'Broadcast Notice'),
      description: 'SMS, WhatsApp, Telegram',
      icon: BellIcon,
      color: 'sky',
      badge: 'Multi-Channel',
      path: '/app-management/notifications',
      onClick: () => navigate('/app-management/notifications'),
    },
    {
      id: 'exam_routine',
      title: t('examRoutine', 'Exam Schedules'),
      description: 'Timetables & invigilation',
      icon: CalendarIcon,
      color: 'purple',
      path: '/examinations/schedules',
      onClick: () => navigate('/examinations/schedules'),
    },
  ];

  const progressItems = [
    { id: '1', label: 'Daily Sabaq Completion Rate', percentage: 92, subLabel: `${formatNumber(Math.round(totalStudents * 0.92))} of ${formatNumber(totalStudents)} target lessons memorized`, color: 'emerald' as const },
    { id: '2', label: 'Sabqi Revision Target', percentage: 88, subLabel: 'Quarterly revision cycles in progress', color: 'accent' as const },
    { id: '3', label: 'Mid-Term Exam Readiness', percentage: 76, subLabel: 'Syllabus modules covered', color: 'purple' as const },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Main KPI Metrics Row */}
      <KpiMetricsWidget metrics={metrics} />

      {/* 2. Live Attendance Pulse & Academic Velocity Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendancePulseWidget 
          data={pulseData} 
          onTakeAttendance={() => navigate('/attendance/students/monthly-matrix')} 
        />
        <AcademicProgressWidget items={progressItems} />
      </div>

      {/* 3. Quick Action Jump-Pads */}
      <QuickActionsWidget actions={quickActions} />

      {/* 4. Upcoming Events & Live Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UpcomingEventsWidget 
          events={upcomingEvents} 
          onViewCalendar={() => navigate('/academy/calendar-events')} 
        />
        <RecentActivityFeedWidget 
          activities={recentActivities} 
          onViewAll={() => navigate('/activity-analytics')} 
        />
      </div>
    </div>
  );
}
