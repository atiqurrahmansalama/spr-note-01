import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { ResidentialOccupancyData } from '../../types';
import { BuildingOfficeIcon } from '../../../../components/ui/Icons';

export interface ResidentialOccupancyWidgetProps {
  data?: ResidentialOccupancyData;
  title?: string;
  onViewHostel?: () => void;
  className?: string;
}

export default function ResidentialOccupancyWidget({
  data,
  title,
  onViewHostel,
  className = '',
}: ResidentialOccupancyWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  const residential: ResidentialOccupancyData = data || {
    totalBeds: 180,
    occupiedBeds: 164,
    occupancyRate: 91,
    presentTonight: 158,
    onLeave: 6,
  };

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs hover:shadow-md h-full flex flex-col justify-start space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary leading-tight">
              {title || t('residentialOccupancy', 'Residential & Hostel Occupancy')}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              Capacity: <span className="font-mono font-bold theme-text-primary">{formatNumber(residential.occupiedBeds)}/{formatNumber(residential.totalBeds)} Beds</span>
            </p>
          </div>
        </div>

        {onViewHostel && (
          <button
            type="button"
            onClick={onViewHostel}
            className="px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated text-xs font-semibold theme-text-primary transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{t('viewReport', 'Dorms')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold theme-text-secondary">Occupancy Level</span>
          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
            {formatNumber(residential.occupancyRate)}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-zinc-800/15">
          <div
            style={{ width: `${residential.occupancyRate}%` }}
            className="h-full bg-amber-500 rounded-full transition-all duration-500 shadow-xs"
          />
        </div>
      </div>

      {/* Quick Status Pill */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl theme-bg-sub/70 flex items-center justify-between">
          <span className="theme-text-secondary">Present Tonight:</span>
          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(residential.presentTonight)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl theme-bg-sub/70 flex items-center justify-between">
          <span className="theme-text-secondary">On Leave:</span>
          <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
            {formatNumber(residential.onLeave)}
          </span>
        </div>
      </div>
    </div>
  );
}

