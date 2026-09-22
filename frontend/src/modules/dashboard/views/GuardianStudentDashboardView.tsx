import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../../i18n';
import KpiMetricsWidget from '../components/widgets/KpiMetricsWidget';
import AcademicProgressWidget from '../components/widgets/AcademicProgressWidget';
import TimetableScheduleWidget from '../components/widgets/TimetableScheduleWidget';
import UpcomingEventsWidget from '../components/widgets/UpcomingEventsWidget';
import type { DashboardMetric, ScheduleItem, CalendarEventItem } from '../types';
import { 
  AcademicCapIcon, 
  AttendanceIcon, 
  SparklesIcon, 
  BookOpenIcon, 
  TeacherIcon,
  SavedMessagesIcon,
} from '../../../components/ui/Icons';

export default function GuardianStudentDashboardView() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  const metrics: DashboardMetric[] = [
    {
      id: 'attendance_streak',
      label: t('currentStreak', 'Attendance Streak'),
      value: '26 Days',
      subLabel: '98.5% attendance this term',
      trend: { value: 'Perfect record', isPositive: true },
      icon: AttendanceIcon,
      color: 'emerald',
      onClick: () => navigate('/studies/progress-management'),
    },
    {
      id: 'memorized_pages',
      label: t('memorizedPages', 'Memorized Pages'),
      value: '142 Pages',
      subLabel: 'Para 1 to Para 7 completed',
      trend: { value: '+6 pages this week', isPositive: true },
      icon: SparklesIcon,
      color: 'accent',
      onClick: () => navigate('/studies/progress-management'),
    },
    {
      id: 'latest_grade',
      label: 'Recent Exam Grade',
      value: 'A+ (94%)',
      subLabel: '1st Term Evaluation',
      trend: { value: 'Top 5% in class', isPositive: true },
      icon: AcademicCapIcon,
      color: 'purple',
      onClick: () => navigate('/examinations/tabulation'),
    },
    {
      id: 'conduct',
      label: 'Performance & Conduct',
      value: 'Excellent',
      subLabel: 'Ustadh evaluation',
      trend: { value: 'Active learner', isPositive: true },
      icon: BookOpenIcon,
      color: 'sky',
      onClick: () => navigate('/studies/progress-management'),
    },
  ];

  const progressItems = [
    { id: '1', label: 'Daily Sabaq (Surah Al-A\'raf)', percentage: 95, subLabel: 'Page 158 recited with zero mistakes', color: 'emerald' as const },
    { id: '2', label: 'Sabqi (Recent Revision - Para 6)', percentage: 90, subLabel: 'Solid retention of Ayahs', color: 'accent' as const },
    { id: '3', label: 'Amukhta (Para 1 to 5 Revision)', percentage: 86, subLabel: 'Quarterly review cycle', color: 'purple' as const },
  ];

  const studentSchedule: ScheduleItem[] = [
    {
      id: '1',
      periodName: 'Period 1',
      timeSlot: '08:00 AM - 09:30 AM',
      className: 'Class Hifz-A',
      subject: 'New Sabaq Recitation & Correction',
      teacherName: 'Mawlana Mahmudul Hasan',
      room: 'Main Hall',
      status: 'COMPLETED',
    },
    {
      id: '2',
      periodName: 'Period 2',
      timeSlot: '10:00 AM - 11:30 AM',
      className: 'Class Hifz-A',
      subject: 'Sabqi Revision & Pair Testing',
      teacherName: 'Mawlana Mahmudul Hasan',
      room: 'Main Hall',
      status: 'IN_PROGRESS',
    },
    {
      id: '3',
      periodName: 'Period 3',
      timeSlot: '02:00 PM - 03:30 PM',
      className: 'Tajweed & Makhaarij',
      subject: 'Rules of Madd & Waqf',
      teacherName: 'Qari Abdullah',
      room: 'Room 104',
      status: 'UPCOMING',
    },
  ];

  const upcomingNotices: CalendarEventItem[] = [
    { id: '1', title: 'Mid-Term Quran Recitation Contest', date: '2026-09-24', type: 'EVENT', impact: 'Campus Wide', daysRemaining: 10 },
    { id: '2', title: 'Parent-Teacher Evaluation Meeting', date: '2026-09-28', type: 'MEETING', impact: 'Individual Slots', daysRemaining: 14 },
    { id: '3', title: 'Quarterly Hifz Certification Test', date: '2026-10-05', type: 'EXAM', impact: 'Exam Hall', daysRemaining: 21 },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* 1. Student Identification Badge Card */}
      <div className="p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft text-[var(--accent-main)] border border-[var(--accent-main)]/20 flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
            TR
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold theme-text-primary truncate">Tariqur Rahman</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Active Student
              </span>
            </div>
            <div className="text-xs theme-text-secondary flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><b>ID:</b> STU-2026-042</span>
              <span><b>Class:</b> Hifz Division A</span>
              <span><b>Roll:</b> 07</span>
              <span><b>Ustadh:</b> Mawlana Mahmudul Hasan</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/studies/progress-management')}
          className="px-3.5 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold shadow-xs hover:opacity-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <SavedMessagesIcon className="w-3.5 h-3.5" />
          <span>{t('viewReports', 'Progress Card')}</span>
        </button>
      </div>

      {/* 2. Key Academic Metrics */}
      <KpiMetricsWidget metrics={metrics} />

      {/* 3. Daily Recitation Velocity & Class Timetable */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AcademicProgressWidget items={progressItems} title="Daily Quran Progress Breakdown" />
        <TimetableScheduleWidget items={studentSchedule} />
      </div>

      {/* 4. Upcoming Institutional Notices & Exam Dates */}
      <UpcomingEventsWidget events={upcomingNotices} title="Institutional Notices & Key Dates" />
    </div>
  );
}
