import React from 'react';
import ActionMenu from '../../../../../../components/ui/ActionMenu';
import CustomInput from '../../../../../../components/ui/CustomInput';
import CustomButton from '../../../../../../components/ui/CustomButton';
import IconButton from '../../../../../../components/ui/IconButton';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GridIcon,
  TimelineIcon,
  CheckCircleIcon,
} from '../../../../../../components/ui/Icons';
import type { CalendarDisplayMode } from '../../../types';
import { MONTH_NAMES } from '../utils/calendarUtils';

interface CalendarControlBarProps {
  viewMode: 'month' | 'list';
  displayMode: CalendarDisplayMode;
  viewYear: number;
  viewMonth: number;
  hijriMonthHeader?: string;
  isHijriEnabled?: boolean;
  shouldShowTodayButton: boolean;
  showPersonalTasks: boolean;
  searchQuery: string;
  filteredEventsCount: number;
  embeddedSurface?: boolean;
  hideViewModeToggle?: boolean;
  hideSearch?: boolean;
  actionMenuItems?: Array<{
    label: string;
    icon?: React.ComponentType<any>;
    onClick: () => void;
  }>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onJumpToday: () => void;
  onSetDisplayMode: (mode: CalendarDisplayMode) => void;
  onTogglePersonalTasks: () => void;
  onSearchChange: (val: string) => void;
}

export const CalendarControlBar: React.FC<CalendarControlBarProps> = ({
  viewMode,
  displayMode,
  viewYear,
  viewMonth,
  hijriMonthHeader,
  isHijriEnabled,
  shouldShowTodayButton,
  showPersonalTasks,
  searchQuery,
  filteredEventsCount,
  embeddedSurface = false,
  hideViewModeToggle = false,
  hideSearch = false,
  actionMenuItems = [],
  onPrevMonth,
  onNextMonth,
  onJumpToday,
  onSetDisplayMode,
  onTogglePersonalTasks,
  onSearchChange,
}) => {
  const navControlVariant = embeddedSurface ? 'card' : 'app';

  return (
    <div
      className={`${
        embeddedSurface
          ? 'p-2 sm:p-2.5 rounded-2xl border-0 theme-bg-app mb-3'
          : 'p-3 sm:p-4 rounded-3xl border-0 theme-bg-surface shadow-xs mb-4'
      } flex flex-col @[720px]:flex-row items-stretch @[720px]:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0`}
    >
      {/* Left Side: Month Navigator with [< Month Year >] & Hijri Date */}
      {viewMode === 'month' ? (
        <div className="flex items-center justify-start gap-2 flex-wrap min-w-0">
          <div className="flex flex-col items-start min-w-0">
            {/* Row 1: Arrows strictly bracket ONLY Month Year */}
            <div className="flex items-center gap-1.5 flex-nowrap">
              <IconButton
                icon={ChevronLeftIcon}
                variant="ghost"
                size="xs"
                onClick={onPrevMonth}
                title="Previous Month"
                ariaLabel="Previous Month"
              />

              <h3 className="text-sm sm:text-base font-bold theme-text-primary tracking-tight leading-tight whitespace-nowrap">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h3>

              <IconButton
                icon={ChevronRightIcon}
                variant="ghost"
                size="xs"
                onClick={onNextMonth}
                title="Next Month"
                ariaLabel="Next Month"
              />
            </div>

            {/* Row 2: Hijri subtitle neatly beneath without expanding arrows */}
            {isHijriEnabled && hijriMonthHeader && (
              <span className="text-[10px] sm:text-xs font-mono theme-accent font-semibold leading-none pt-1 pl-0.5 truncate max-w-[200px] sm:max-w-[260px]">
                {hijriMonthHeader}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 shrink-0">
          <h3 className="text-sm sm:text-base font-bold theme-text-primary tracking-tight">
            Upcoming Agenda & Schedules
          </h3>
          <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent border-0 shadow-2xs">
            {filteredEventsCount} items
          </span>
        </div>
      )}

      {/* Right Side Tools: Single Toggle View Switcher, Custom Search & ActionMenu */}
      {(!hideViewModeToggle || !hideSearch || (actionMenuItems && actionMenuItems.length > 0)) && (
        <div className="flex items-center gap-2 justify-start @[720px]:justify-end flex-1 @[720px]:flex-none min-w-0">
          {/* View Mode Toggle (Grid/Timeline) & Today Button Group */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Today Button: Placed before the Grid/Timeline view button */}
            {shouldShowTodayButton && (
              <CustomButton
                type="button"
                variant={navControlVariant}
                size="sm"
                icon={CalendarIcon}
                onClick={onJumpToday}
                title="Jump to Today"
                className="shrink-0 select-none transition-all duration-150"
              >
                <span>Today</span>
              </CustomButton>
            )}

            {viewMode === 'month' && !hideViewModeToggle && (
              <CustomButton
                type="button"
                variant={navControlVariant}
                size="sm"
                icon={displayMode === 'grid' ? TimelineIcon : GridIcon}
                onClick={() => onSetDisplayMode(displayMode === 'grid' ? 'timeline' : 'grid')}
                title={displayMode === 'grid' ? 'Switch to Timeline View' : 'Switch to Grid View'}
                className="shrink-0 select-none"
              >
                <span className="hidden @[440px]:inline">{displayMode === 'grid' ? 'Timeline' : 'Grid'}</span>
              </CustomButton>
            )}

            {/* Personal Tasks Overlay Toggle */}
            {viewMode === 'month' && (
              <CustomButton
                type="button"
                variant={showPersonalTasks ? 'primary' : navControlVariant}
                size="sm"
                icon={CheckCircleIcon}
                onClick={onTogglePersonalTasks}
                title={showPersonalTasks ? 'Personal Tasks Active. Click to hide.' : 'Personal Tasks Hidden. Click to show.'}
                className="shrink-0 select-none"
              >
                <span className="hidden @[560px]:inline">Tasks</span>
              </CustomButton>
            )}
          </div>

          {/* Reusable Search Box with CustomInput */}
          {!hideSearch && (
            <div className="flex-1 @[480px]:w-48 @[860px]:w-60 min-w-0">
              <CustomInput
                type="search"
                size="sm"
                variant={navControlVariant}
                value={searchQuery}
                onChange={onSearchChange}
                placeholder="Search..."
                clearable={true}
              />
            </div>
          )}

          {/* Three-dots Action Menu */}
          {actionMenuItems && actionMenuItems.length > 0 && (
            <ActionMenu
              items={actionMenuItems}
              variant={navControlVariant}
              buttonClassName="rounded-xl"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(CalendarControlBar);
