import React, { useState, useCallback } from 'react';
import type { DashboardLayoutItem, DashboardRole } from '../types';
import { WIDGET_REGISTRY } from '../widgetRegistry';
import { 
  GripVerticalIcon, 
  EyeIcon, 
  EyeOffIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  Squares2X2Icon,
  PlusIcon
} from '../../../components/ui/Icons';

export interface DashboardGridEngineProps {
  items: DashboardLayoutItem[];
  role: DashboardRole;
  isEditMode: boolean;
  onUpdateItems: (newItems: DashboardLayoutItem[]) => void;
  onOpenWidgetCatalog?: () => void;
  widgetPropsMap?: Record<string, any>;
}

export default function DashboardGridEngine({
  items,
  role,
  isEditMode,
  onUpdateItems,
  onOpenWidgetCatalog,
  widgetPropsMap = {},
}: DashboardGridEngineProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, movedItem);

    // Re-assign sequential order ranks
    const reordered = newItems.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    onUpdateItems(reordered);
    handleDragEnd();
  };

  // Move up/down single-step helper (touch-friendly)
  const handleMoveStep = (index: number, direction: 'UP' | 'DOWN') => {
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    const reordered = newItems.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    onUpdateItems(reordered);
  };

  // Toggle widget visibility
  const handleToggleVisibility = (widgetId: string) => {
    const updated = items.map((item) =>
      item.widgetId === widgetId ? { ...item, isVisible: !item.isVisible } : item
    );
    onUpdateItems(updated);
  };

  // Cycle col-span: 1 -> 2 -> 3 -> 1
  const handleCycleColSpan = (widgetId: string) => {
    const updated = items.map((item) => {
      if (item.widgetId !== widgetId) return item;
      const nextSpan = item.colSpan === 1 ? 2 : item.colSpan === 2 ? 3 : 1;
      return { ...item, colSpan: nextSpan as 1 | 2 | 3 };
    });
    onUpdateItems(updated);
  };

  // In normal mode, only show visible widgets
  const displayItems = isEditMode
    ? items
    : items.filter((i) => i.isVisible !== false);

  const getColSpanClass = (span: 1 | 2 | 3) => {
    if (span === 3) return 'col-span-1 md:col-span-2 lg:col-span-3';
    if (span === 2) return 'col-span-1 md:col-span-2 lg:col-span-2';
    return 'col-span-1';
  };

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* Dynamic 3-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 w-full min-w-0 items-start">
        {displayItems.map((layoutItem, index) => {
          const widgetDef = WIDGET_REGISTRY[layoutItem.widgetId];
          if (!widgetDef) return null;

          const WidgetComponent = widgetDef.component;
          const widgetProps = widgetPropsMap[layoutItem.widgetId] || {};
          const isHidden = layoutItem.isVisible === false;
          const isDraggingThis = draggedIndex === index;
          const isDragOverThis = dragOverIndex === index;

          return (
            <div
              key={layoutItem.widgetId}
              draggable={isEditMode}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, index)}
              className={`${getColSpanClass(layoutItem.colSpan)} min-w-0 transition-all duration-200 relative ${
                isDraggingThis ? 'opacity-40 scale-[0.98]' : 'opacity-100'
              } ${isDragOverThis ? 'ring-2 ring-[var(--accent-main)] ring-offset-2 rounded-2xl' : ''}`}
            >
              {/* Edit Mode Customization Overlay & Action Bar */}
              {isEditMode && (
                <div className="mb-2 p-2 rounded-xl theme-bg-surface border theme-border shadow-xs flex items-center justify-between gap-2 z-10 select-none animate-fade-in">
                  {/* Left: Drag Handle & Widget Title */}
                  <div className="flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing">
                    <GripVerticalIcon className="w-4 h-4 theme-text-secondary shrink-0" />
                    <span className="text-xs font-bold theme-text-primary truncate">
                      {widgetDef.title}
                    </span>
                  </div>

                  {/* Right: Controls (Resize, Move, Visibility) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Width Switcher */}
                    <button
                      type="button"
                      onClick={() => handleCycleColSpan(layoutItem.widgetId)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-primary transition-all cursor-pointer flex items-center gap-1"
                      title="Toggle Width (1 col, 2 cols, Full width)"
                    >
                      <Squares2X2Icon className="w-3 h-3 theme-accent" />
                      <span>{layoutItem.colSpan === 3 ? 'Full' : layoutItem.colSpan === 2 ? '2-Col' : '1-Col'}</span>
                    </button>

                    {/* Step Up / Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveStep(index, 'UP')}
                      className="p-1 rounded-lg theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary disabled:opacity-40 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUpIcon className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      disabled={index === items.length - 1}
                      onClick={() => handleMoveStep(index, 'DOWN')}
                      className="p-1 rounded-lg theme-bg-sub border theme-border hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary disabled:opacity-40 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDownIcon className="w-3 h-3" />
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(layoutItem.widgetId)}
                      className={`p-1 rounded-lg border transition-all cursor-pointer ${
                        isHidden
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : 'theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary'
                      }`}
                      title={isHidden ? 'Show Widget' : 'Hide Widget'}
                    >
                      {isHidden ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Widget Body (Dimmed if hidden in edit mode) */}
              <div className={`${isHidden && isEditMode ? 'opacity-40 filter grayscale-[50%]' : ''}`}>
                <WidgetComponent {...widgetProps} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Mode Bottom Helper & Add Widget Launchpad */}
      {isEditMode && onOpenWidgetCatalog && (
        <div className="p-4 rounded-2xl theme-bg-surface border-2 border-dashed theme-border flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in text-center sm:text-left">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold theme-text-primary">
              Customize Your Workspace Layout
            </h4>
            <p className="text-xs theme-text-secondary">
              Drag widgets using handles, change column widths, or add more cards from the catalog.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenWidgetCatalog}
            className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add More Widgets</span>
          </button>
        </div>
      )}
    </div>
  );
}
