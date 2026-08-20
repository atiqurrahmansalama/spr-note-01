import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  ClassIcon,
  TimerIcon,
} from '../../components/ui/Icons';
import BranchManagementView from './BranchManagementView';
import ClassSectionManagerView from './ClassSectionManagerView';
import ClassPeriodScheduleView from './ClassPeriodScheduleView';

export default function BranchSectionHubView({ defaultTab = 'branches' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(activeTabParam);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams((prev) => {
      prev.set('tab', tabKey);
      return prev;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Tab Bar (Mobile Scrollable) */}
      <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 theme-bg-surface border theme-border rounded-2xl w-max max-w-full shadow-xs">
          <button
            onClick={() => handleTabChange('branches')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'branches'
                ? 'theme-bg-accent theme-accent-text shadow-sm'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/60'
            }`}
          >
            <BuildingOfficeIcon className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Campuses & Branches</span>
          </button>

          <button
            onClick={() => handleTabChange('sections')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'sections'
                ? 'theme-bg-accent theme-accent-text shadow-sm'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/60'
            }`}
          >
            <ClassIcon className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Class Sections & Halqas</span>
          </button>

          <button
            onClick={() => handleTabChange('periods')}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
              activeTab === 'periods'
                ? 'theme-bg-accent theme-accent-text shadow-sm'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/60'
            }`}
          >
            <TimerIcon className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">Period Schedules</span>
          </button>
        </div>
      </div>

      {/* Render Active View */}
      <div>
        {activeTab === 'branches' && <BranchManagementView isEmbedded={true} />}
        {activeTab === 'sections' && <ClassSectionManagerView isEmbedded={true} />}
        {activeTab === 'periods' && <ClassPeriodScheduleView isEmbedded={true} />}
      </div>
    </div>
  );
}
