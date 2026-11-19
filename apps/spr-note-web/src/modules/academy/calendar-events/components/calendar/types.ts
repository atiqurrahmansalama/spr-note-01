import type React from 'react';
import type { CalendarEvent, CalendarCategory, CalendarDisplayMode, DeleteEventOptions } from '../../types';
import type { EventColorStyle } from '../../constants/eventColors';

export interface MonthGridCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  weekday: number;
}

export interface WeekEventItem {
  event: CalendarEvent;
  startCol: number; // 1 to 7
  endCol: number;   // 1 to 7
  span: number;     // 1 to 7
  isStart: boolean;
  isEnd: boolean;
  row: number;
}

export interface TimelineStripDay {
  dateObj: Date;
  dateStr: string;
  dayNum: number;
  monthIdx: number;
  yearNum: number;
  weekday: number;
  isCurrentMonth: boolean;
  isPrevMonth?: boolean;
  isNextMonth?: boolean;
}

export interface MasterTimeCalendarProps {
  events?: CalendarEvent[];
  onSaveEvent?: (eventData: any) => void;
  onDeleteEvent?: (eventOrId: any, options?: DeleteEventOptions) => void;
  readOnly?: boolean;
  selectedCategory?: CalendarCategory | string;
  viewMode?: 'month' | 'list';
  displayMode?: CalendarDisplayMode;
  initialDisplayMode?: CalendarDisplayMode;
  hideCategorySelector?: boolean;
  hideSearch?: boolean;
  hideViewModeToggle?: boolean;
  actionMenuItems?: Array<{
    label: string;
    icon?: React.ComponentType<any>;
    onClick: () => void;
  }>;
  onDateSelect?: (dateStr: string) => void;
  onDisplayModeChange?: (mode: CalendarDisplayMode | string) => void;
  className?: string;
  isHijriEnabled?: boolean;
  embeddedSurface?: boolean;
  showPersonalTasks?: boolean;
  onTogglePersonalTasks?: () => void;
}
