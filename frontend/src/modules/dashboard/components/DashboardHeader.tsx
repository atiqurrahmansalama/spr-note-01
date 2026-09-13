import React from 'react';
import { useTranslation } from '../../../i18n';
import type { DashboardRole } from '../types';
import { 
  SparklesIcon, 
  CalendarIcon, 
  ChevronIcon, 
  AcademicCapIcon, 
  TeacherIcon, 
  GroupsIcon, 
  BuildingOfficeIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';

export interface DashboardHeaderProps {
  userName: string;
  userRole: DashboardRole;
  effectiveRole: DashboardRole;
  onRoleChange?: (role: DashboardRole) => void;
  isSuperAdmin: boolean;
  academicYearName?: string;
  onQuickAction?: () => void;
}

const ROLE_OPTIONS: Array<{
  id: DashboardRole;
  labelKey: string;
  defaultLabel: string;
  tagKey: string;
  defaultTag: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'SUPER_ADMIN', labelKey: 'superAdminTag', defaultLabel: 'Super Admin', tagKey: 'superAdminTag', defaultTag: 'Platform Console', Icon: ShieldCheckIcon },
  { id: 'ADMIN', labelKey: 'principalTag', defaultLabel: 'Principal / Admin', tagKey: 'principalTag', defaultTag: 'Institutional Head', Icon: BuildingOfficeIcon },
  { id: 'TEACHER', labelKey: 'teacherTag', defaultLabel: 'Teacher / Ustadh', tagKey: 'teacherTag', defaultTag: 'Classroom & Lessons', Icon: TeacherIcon },
  { id: 'STAFF', labelKey: 'staffTag', defaultLabel: 'Staff & Operations', tagKey: 'staffTag', defaultTag: 'Operations & Hostels', Icon: GroupsIcon },
  { id: 'GUARDIAN', labelKey: 'guardianTag', defaultLabel: 'Guardian / Student', tagKey: 'guardianTag', defaultTag: 'Parent / Student Portal', Icon: AcademicCapIcon },
];

export default function DashboardHeader({
  userName,
  userRole,
  effectiveRole,
  onRoleChange,
  isSuperAdmin,
  academicYearName = '2026-2027',
  onQuickAction,
}: DashboardHeaderProps) {
  const { t, formatDate } = useTranslation('dashboard');
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Determine time-based greeting
  const hour = new Date().getHours();
  let greetingKey = 'greetingMorning';
  let defaultGreeting = 'Good morning, {name}';
  if (hour >= 12 && hour < 17) {
    greetingKey = 'greetingAfternoon';
    defaultGreeting = 'Good afternoon, {name}';
  } else if (hour >= 17) {
    greetingKey = 'greetingEvening';
    defaultGreeting = 'Good evening, {name}';
  }

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeRoleConfig = ROLE_OPTIONS.find((r) => r.id === effectiveRole) || ROLE_OPTIONS[1];
  const ActiveRoleIcon = activeRoleConfig.Icon;

  return (
    <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-1 select-none">
      {/* Welcome Title and Subtitle */}
      <div className="space-y-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary truncate">
            {t(greetingKey, defaultGreeting, { name: userName || 'Administrator' })}
          </h1>
          
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium theme-bg-accent-soft text-[var(--accent-main)] border border-[var(--accent-main)]/25 flex items-center gap-1.5 shadow-xs shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] animate-pulse" />
            <span>{t('activeSession', 'Active Session')}: {academicYearName}</span>
          </span>
        </div>

        <p className="text-xs sm:text-sm theme-text-secondary leading-relaxed max-w-2xl">
          {t('welcomeSubtitle', 'Here is what is happening across your institutional workspace today.')}
        </p>
      </div>

      {/* Right Controls: Date Badge & Super Admin Role Switcher */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Today's Date Badge */}
        <div className="px-3 py-1.5 rounded-xl theme-bg-surface border theme-border shadow-xs flex items-center gap-2 theme-text-secondary text-xs font-medium">
          <CalendarIcon className="w-3.5 h-3.5 opacity-70" />
          <span>{formatDate(new Date().toISOString(), { dateStyle: 'medium' })}</span>
        </div>

        {/* Super Admin Exclusive Role View Switcher */}
        {isSuperAdmin && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-1.5 rounded-xl theme-bg-surface hover:theme-bg-sub border theme-border shadow-xs flex items-center gap-2.5 theme-text-primary text-xs font-semibold cursor-pointer transition-all ring-1 ring-transparent hover:ring-[var(--accent-main)]/30"
              title="Switch Role Dashboard View"
            >
              <div className="w-4 h-4 rounded-md theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center shrink-0">
                <ActiveRoleIcon className="w-3 h-3" />
              </div>

              <div className="flex items-center gap-1.5 min-w-0">
                <span className="theme-text-muted text-[11px] font-normal hidden sm:inline">
                  {t('viewingAs', 'Dashboard View:')}
                </span>
                <span className="text-[var(--accent-main)] font-bold truncate">
                  {t(activeRoleConfig.labelKey, activeRoleConfig.defaultLabel)}
                </span>
              </div>

              <ChevronIcon isOpen={dropdownOpen} className="w-3.5 h-3.5 theme-text-secondary shrink-0 opacity-70 ml-0.5" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-64 theme-bg-surface border theme-border rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-fade-in">
                <div className="px-3 py-1.5 text-[11px] font-bold theme-text-muted uppercase tracking-wider border-b theme-border">
                  {t('switchView', 'Switch Role View (Super Admin)')}
                </div>

                {ROLE_OPTIONS.map((opt) => {
                  const isCurrent = opt.id === effectiveRole;
                  const OptIcon = opt.Icon;

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        onRoleChange?.(opt.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all select-none text-left rtl:text-right ${
                        isCurrent
                          ? 'theme-bg-accent-soft text-[var(--accent-main)] font-bold'
                          : 'theme-text-primary hover:theme-bg-sub'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent ? 'theme-bg-accent theme-accent-text' : 'theme-bg-sub theme-text-secondary'
                        }`}>
                          <OptIcon className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <span className="block truncate font-semibold">{t(opt.labelKey, opt.defaultLabel)}</span>
                          <span className="text-[10px] theme-text-muted block truncate">{t(opt.tagKey, opt.defaultTag)}</span>
                        </div>
                      </div>

                      {isCurrent && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-main)] shrink-0 ml-2 rtl:ml-0 rtl:mr-2" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
