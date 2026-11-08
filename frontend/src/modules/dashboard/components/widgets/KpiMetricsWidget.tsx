import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../../../i18n';
import type { DashboardMetric } from '../../types';

export interface KpiMetricsWidgetProps {
  metrics?: DashboardMetric[];
  visibleMetricIds?: string[];
  metricOrder?: string[];
  cols?: number;
  isEditMode?: boolean;
  onReorderMetrics?: (newOrder: string[]) => void;
  className?: string;
}

const COLOR_THEMES: Record<string, { iconColor: string }> = {
  accent: { iconColor: 'text-[var(--accent-main)]' },
  emerald: { iconColor: 'text-emerald-600 dark:text-emerald-400' },
  purple: { iconColor: 'text-purple-600 dark:text-purple-400' },
  amber: { iconColor: 'text-amber-600 dark:text-amber-400' },
  rose: { iconColor: 'text-rose-600 dark:text-rose-400' },
  sky: { iconColor: 'text-sky-600 dark:text-sky-400' },
  indigo: { iconColor: 'text-indigo-600 dark:text-indigo-400' },
};

export default function KpiMetricsWidget({
  metrics = [],
  visibleMetricIds,
  metricOrder,
  cols,
  isEditMode = false,
  onReorderMetrics,
  className = '',
}: KpiMetricsWidgetProps) {
  const { formatNumber } = useTranslation();

  // Internal order state to enable fluid in-place dragging
  const [internalOrder, setInternalOrder] = useState<string[]>(metricOrder || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (metricOrder) {
      setInternalOrder(metricOrder);
    }
  }, [metricOrder]);

  const displayedMetrics = useMemo(() => {
    let list = [...(metrics || [])];
    if (visibleMetricIds && visibleMetricIds.length > 0) {
      list = list.filter((m) => visibleMetricIds.includes(m.id));
    }

    const activeOrder = internalOrder.length > 0 ? internalOrder : (metricOrder || []);
    if (activeOrder.length > 0) {
      list.sort((a, b) => {
        const idxA = activeOrder.indexOf(a.id);
        const idxB = activeOrder.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });
    }

    return list;
  }, [metrics, visibleMetricIds, internalOrder, metricOrder]);

  if (!displayedMetrics || displayedMetrics.length === 0) return null;

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...displayedMetrics];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const newOrderIds = reordered.map((m) => m.id);
    setInternalOrder(newOrderIds);
    if (onReorderMetrics) {
      onReorderMetrics(newOrderIds);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const effectiveCols = cols || (displayedMetrics.length <= 3 ? 3 : 4);

  let gridCols = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 @sm:grid-cols-2 @2xl:grid-cols-4';
  if (effectiveCols === 2) gridCols = 'grid-cols-1 sm:grid-cols-2 @sm:grid-cols-2';
  else if (effectiveCols === 3) gridCols = 'grid-cols-1 sm:grid-cols-3 @sm:grid-cols-3';
  else if (effectiveCols === 4) gridCols = 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 @sm:grid-cols-2 @2xl:grid-cols-4';
  else if (displayedMetrics.length === 3) gridCols = 'grid-cols-1 sm:grid-cols-3 @sm:grid-cols-3';
  else if (displayedMetrics.length === 2) gridCols = 'grid-cols-1 sm:grid-cols-2 @sm:grid-cols-2';

  return (
    <div className={`grid ${gridCols} gap-3 sm:gap-4 w-full select-none ${className}`}>
      {displayedMetrics.map((item, index) => {
        const Icon = item.icon;
        const theme = COLOR_THEMES[item.color || 'accent'] || COLOR_THEMES.accent;
        const displayVal = typeof item.value === 'number' ? formatNumber(item.value) : item.value;
        const isDragging = draggedIndex === index;
        const isDragOver = dragOverIndex === index;

        return (
          <div
            key={item.id}
            draggable={isEditMode}
            onDragStart={isEditMode ? (e) => handleDragStart(e, index) : undefined}
            onDragOver={isEditMode ? (e) => handleDragOver(e, index) : undefined}
            onDrop={isEditMode ? (e) => handleDrop(e, index) : undefined}
            onDragEnd={isEditMode ? handleDragEnd : undefined}
            onClick={item.onClick}
            className={`p-4 rounded-2xl theme-bg-surface shadow-xs hover:shadow-md flex flex-col justify-between transition-all min-w-0 relative select-none ${
              isEditMode
                ? 'cursor-grab active:cursor-grabbing ring-1 ring-[var(--accent-main)]/20 hover:ring-[var(--accent-main)]/40'
                : item.onClick
                ? 'cursor-pointer'
                : 'cursor-default'
            } ${
              isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
            } ${
              isDragOver && isEditMode ? 'ring-2 ring-[var(--accent-main)] scale-[1.01]' : ''
            }`}
          >
            {/* Top Row: Bare Icon & Trend Badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="shrink-0 flex items-center justify-center">
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${theme.iconColor}`} />
              </div>

              {item.trend && (
                <span className="text-[11px] font-mono font-bold flex items-center gap-0.5 theme-text-secondary shrink-0">
                  <span>{item.trend.isPositive !== false ? '↑' : '↓'}</span>
                  <span>{item.trend.value}</span>
                </span>
              )}
            </div>

            {/* Bottom Row: Normal theme colors (No saturated bright text, normal theme-text-primary) */}
            <div className="mt-3 space-y-0.5">
              <div className="text-xl sm:text-2xl font-black tracking-tight leading-none theme-text-primary">
                {displayVal}
              </div>
              <div className="text-xs font-semibold theme-text-secondary truncate mt-1">
                {item.label}
              </div>
              {item.subLabel && (
                <div className="text-[10px] theme-text-secondary truncate">
                  {item.subLabel}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
