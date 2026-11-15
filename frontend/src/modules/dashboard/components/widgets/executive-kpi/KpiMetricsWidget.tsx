import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from '../../../../../i18n';
import { useFeatureControl } from '../../../../../context/FeatureControlContext';
import { getRequiredFeatureKeyForMetric } from '../../../widgetRegistry';
import { MetricCard } from '@/components/ui/MetricsGrid';
import type { DashboardMetric } from '../../../types';

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
  const { isFeatureEnabled } = useFeatureControl();

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

    // 1. Strictly filter by Feature & Module Control (Single Source of Truth)
    list = list.filter((m) => {
      const featureKey = m.requiredFeatureKey || getRequiredFeatureKeyForMetric(m.id);
      if (featureKey && !isFeatureEnabled(featureKey)) {
        return false;
      }
      return true;
    });

    // 2. Filter by user customized visibleMetricIds
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
  }, [metrics, isFeatureEnabled, visibleMetricIds, internalOrder, metricOrder]);

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

  const effectiveCols = cols || (displayedMetrics.length <= 3 ? displayedMetrics.length : 4);

  let gridCols = 'grid-cols-2 @[580px]:grid-cols-4';
  if (effectiveCols === 2 || displayedMetrics.length === 2) {
    gridCols = 'grid-cols-2';
  } else if (effectiveCols === 3 || displayedMetrics.length === 3) {
    gridCols = 'grid-cols-2 @[580px]:grid-cols-3';
  } else {
    // 4 metrics: 2 per line on small, 4 per line on mid & large
    gridCols = 'grid-cols-2 @[580px]:grid-cols-4';
  }

  return (
    <div className={`@container grid ${gridCols} gap-2 @[480px]:gap-2.5 @[1100px]:gap-3.5 w-full select-none ${className}`}>
      {displayedMetrics.map((item, index) => {
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
            className={`transition-all duration-150 min-w-0 relative select-none ${
              isEditMode
                ? 'cursor-grab active:cursor-grabbing ring-1 ring-[var(--accent-main)]/20 hover:ring-[var(--accent-main)]/40 rounded-2xl'
                : ''
            } ${
              isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
            } ${
              isDragOver && isEditMode ? 'ring-2 ring-[var(--accent-main)] scale-[1.01] rounded-2xl' : ''
            }`}
          >
            <MetricCard
              variant="kpi"
              label={item.label}
              value={displayVal}
              subLabel={item.subLabel}
              icon={item.icon}
              onClick={item.onClick}
              badge={
                item.trend ? (
                  <span
                    className={`font-mono font-bold text-[10px] @[1100px]:text-[11px] flex items-center gap-1 truncate ${
                      item.trend.isPositive !== false
                        ? 'theme-accent'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <span>{item.trend.isPositive !== false ? '↑' : '↓'}</span>
                    <span>{item.trend.value}</span>
                    {item.trend.label && (
                      <span className="theme-text-secondary font-normal ml-0.5 truncate">
                        {item.trend.label}
                      </span>
                    )}
                  </span>
                ) : undefined
              }
              className="h-full"
            />
          </div>
        );
      })}
    </div>
  );
}
