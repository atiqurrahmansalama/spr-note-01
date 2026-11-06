import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { NoticeItem } from '../../types';
import { BellIcon, SparklesIcon } from '../../../../components/ui/Icons';

export interface NoticeBoardWidgetProps {
  items?: NoticeItem[];
  title?: string;
  onViewAll?: () => void;
  className?: string;
}

export default function NoticeBoardWidget({
  items,
  title,
  onViewAll,
  className = '',
}: NoticeBoardWidgetProps) {
  const { t } = useTranslation('dashboard');

  const notices: NoticeItem[] = items || [
    {
      id: 'n-1',
      title: 'Annual Quran Recitation & Hifz Assessment Ceremony Scheduled',
      category: 'EXAM',
      date: 'Next Saturday',
      priority: 'HIGH',
      content: 'All Hifz sections will conduct terminal assessment before the board jury.',
    },
    {
      id: 'n-2',
      title: 'Monthly Guardians & Ustadh Alignment Meeting',
      category: 'ADMIN',
      date: 'Nov 14, 2026',
      priority: 'NORMAL',
      content: 'Review of student attendance, tarbiyah diary, and sabaq track.',
    },
    {
      id: 'n-3',
      title: 'Winter Vacation Academic Break Notification',
      category: 'HOLIDAY',
      date: 'Dec 22 - Jan 02',
      priority: 'NORMAL',
      content: 'Campus residential quarters will observe scheduled winter holiday routines.',
    },
  ];

  const getPriorityBadge = (p: NoticeItem['priority']) => {
    if (p === 'HIGH') {
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
    }
    return 'theme-bg-sub theme-text-secondary';
  };

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs hover:shadow-md h-full flex flex-col justify-start space-y-3.5 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <BellIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-sm font-bold theme-text-primary">
            {title || t('noticeBoard', 'Institutional Notice Board')}
          </h3>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>{t('viewReport', 'All Notices')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {/* Notices List */}
      <div className="space-y-2.5">
        {notices.map((notice) => (
          <div
            key={notice.id}
            className="p-3 rounded-xl theme-bg-sub/60 hover:theme-bg-sub transition-all space-y-1.5"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs font-bold theme-text-primary leading-snug">
                {notice.title}
              </h4>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${getPriorityBadge(notice.priority)}`}>
                {notice.date}
              </span>
            </div>
            <p className="text-[11px] theme-text-secondary line-clamp-2 leading-relaxed">
              {notice.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

