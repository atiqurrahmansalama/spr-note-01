import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DashboardLayoutItem, DashboardRole, WidgetColSpan } from '../types';
import { WIDGET_REGISTRY, isWidgetFeaturePermitted } from '../widgetRegistry';
import { useFeatureControl } from '../../../context/FeatureControlContext';
import { normalizeRoleCode } from '../../../utils/roleUtils';
import DeferredWidgetMount from './DeferredWidgetMount';
import { 
  GripVerticalIcon, 
  EyeIcon, 
  EyeOffIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  Squares2X2Icon,
  ArrowsUpDownIcon,
  ShieldCheckIcon
} from '../../../components/ui/Icons';

export interface DashboardGridEngineProps {
  items: DashboardLayoutItem[];
  role: DashboardRole;
  isEditMode: boolean;
  onUpdateItems: (newItems: DashboardLayoutItem[]) => void;
  onOpenWidgetCatalog?: () => void;
  widgetPropsMap?: Record<string, any>;
  isFeatureEnabled?: (featureKey?: string) => boolean;
  isSuperAdmin?: boolean;
}

interface WidgetErrorBoundaryProps {
  widgetTitle: string;
  children: React.ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Enterprise Widget Error Boundary (Rule 13)
 * Guarantees that any unexpected property read or parsing error in an isolated widget
 * never crashes the entire dashboard view.
 */
class WidgetErrorBoundary extends React.Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn(`Dashboard [${this.props.widgetTitle}] render issue:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 rounded-2xl theme-bg-surface shadow-xs h-full flex flex-col items-center justify-center text-center space-y-2 select-none">
          <div className="text-xs font-bold theme-text-primary">
            {this.props.widgetTitle}
          </div>
          <p className="text-[11px] theme-text-secondary max-w-xs leading-relaxed">
            Widget is temporarily unavailable. Check data configuration or reload view.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardGridEngine({
  items,
  role,
  isEditMode,
  onUpdateItems,
  onOpenWidgetCatalog,
  widgetPropsMap = {},
  isFeatureEnabled: isFeatureEnabledOverride,
  isSuperAdmin = false,
}: DashboardGridEngineProps) {
  const navigate = useNavigate();
  const gridRef = useRef<HTMLDivElement>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);

  // Active border-drag resizing state
  type ResizeMode = 'HORIZONTAL' | 'VERTICAL' | 'BOTH';

  interface ResizingState {
    widgetId: string;
    mode: ResizeMode;
    startX: number;
    startY: number;
    startSpan: WidgetColSpan;
    previewSpan: WidgetColSpan;
    minSpan: WidgetColSpan;
    maxSpan: WidgetColSpan;
    startHeight: number;
    previewHeight: number | null;
  }

  // Active drag resizing state (supports horizontal width, vertical height, or diagonal corner)
  const [resizing, setResizing] = useState<ResizingState | null>(null);

  // Interactive drag resize initiator (Width, Height, or Diagonal)
  const handleResizeStart = (
    e: React.MouseEvent,
    widgetId: string,
    mode: ResizeMode,
    currentSpan: WidgetColSpan,
    currentHeight: number | undefined,
    minSpan: WidgetColSpan = 1,
    maxSpan: WidgetColSpan = 4
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startSpan = currentSpan;

    // Detect actual rendered height if custom height is not already set
    let initialHeight = currentHeight;
    if (!initialHeight) {
      const el = document.getElementById(`dashboard-widget-${widgetId}`);
      initialHeight = el ? Math.round(el.getBoundingClientRect().height) : 380;
    }

    setResizing({
      widgetId,
      mode,
      startX,
      startY,
      startSpan,
      previewSpan: startSpan,
      minSpan,
      maxSpan,
      startHeight: initialHeight,
      previewHeight: initialHeight,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let nextSpan = startSpan;
      let nextHeight: number | null = initialHeight ?? null;

      if (mode === 'HORIZONTAL' || mode === 'BOTH') {
        if (gridRef.current) {
          const gridWidth = gridRef.current.clientWidth || 1200;
          const oneColWidth = gridWidth / 4;
          const diffX = moveEvent.clientX - startX;
          const deltaCols = Math.round(diffX / oneColWidth);
          nextSpan = Math.max(minSpan, Math.min(maxSpan, startSpan + deltaCols)) as WidgetColSpan;
        }
      }

      if (mode === 'VERTICAL' || mode === 'BOTH') {
        const diffY = moveEvent.clientY - startY;
        const rawHeight = (initialHeight || 380) + diffY;
        // Clamp height between 220px and 850px, snapped to 10px increments
        nextHeight = Math.max(220, Math.min(850, Math.round(rawHeight / 10) * 10));
      }

      setResizing((prev) => (prev ? { ...prev, previewSpan: nextSpan, previewHeight: nextHeight } : null));
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      let finalSpan = startSpan;
      let finalHeight: number | undefined = currentHeight;

      if (mode === 'HORIZONTAL' || mode === 'BOTH') {
        if (gridRef.current) {
          const gridWidth = gridRef.current.clientWidth || 1200;
          const oneColWidth = gridWidth / 4;
          const diffX = upEvent.clientX - startX;
          const deltaCols = Math.round(diffX / oneColWidth);
          finalSpan = Math.max(minSpan, Math.min(maxSpan, startSpan + deltaCols)) as WidgetColSpan;
        }
      }

      if (mode === 'VERTICAL' || mode === 'BOTH') {
        const diffY = upEvent.clientY - startY;
        const rawHeight = (initialHeight || 380) + diffY;
        finalHeight = Math.max(220, Math.min(850, Math.round(rawHeight / 10) * 10));
      }

      onUpdateItems(
        items.map((item) => {
          if (item.widgetId !== widgetId) return item;
          return {
            ...item,
            colSpan: mode === 'HORIZONTAL' || mode === 'BOTH' ? finalSpan : item.colSpan,
            height: mode === 'VERTICAL' || mode === 'BOTH' ? finalHeight : item.height,
          };
        })
      );

      setResizing(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Drag and drop handlers by unique widgetId (immune to filtered display arrays)
  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidgetId(widgetId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
  };

  const handleDragOver = (e: React.DragEvent, widgetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverWidgetId !== widgetId) {
      setDragOverWidgetId(widgetId);
    }
  };

  const handleDragEnd = () => {
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleDrop = (e: React.DragEvent, targetWidgetId: string) => {
    e.preventDefault();
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      handleDragEnd();
      return;
    }

    const fromIndex = items.findIndex((item) => item.widgetId === draggedWidgetId);
    const toIndex = items.findIndex((item) => item.widgetId === targetWidgetId);

    if (fromIndex === -1 || toIndex === -1) {
      handleDragEnd();
      return;
    }

    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);

    // Re-assign sequential order ranks
    const reordered = newItems.map((item, idx) => ({
      ...item,
      order: idx + 1,
    }));

    onUpdateItems(reordered);
    handleDragEnd();
  };

  // Move up/down step helper based on widgetId and displayed sequence
  const handleMoveStep = (widgetId: string, direction: 'UP' | 'DOWN') => {
    const currentDisplayIdx = displayItems.findIndex((i) => i.widgetId === widgetId);
    if (currentDisplayIdx === -1) return;

    const targetDisplayIdx = direction === 'UP' ? currentDisplayIdx - 1 : currentDisplayIdx + 1;
    if (targetDisplayIdx < 0 || targetDisplayIdx >= displayItems.length) return;

    const targetWidgetId = displayItems[targetDisplayIdx].widgetId;
    const fromIndex = items.findIndex((i) => i.widgetId === widgetId);
    const toIndex = items.findIndex((i) => i.widgetId === targetWidgetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newItems = [...items];
    const temp = newItems[fromIndex];
    newItems[fromIndex] = newItems[toIndex];
    newItems[toIndex] = temp;

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

  // Cycle col-span: 1 -> 2 -> 3 -> 4 -> 1
  const handleCycleColSpan = (widgetId: string, minSpan: WidgetColSpan = 1, maxSpan: WidgetColSpan = 4) => {
    const updated = items.map((item) => {
      if (item.widgetId !== widgetId) return item;
      let nextSpan = (item.colSpan % 4) + 1;
      if (nextSpan < minSpan) nextSpan = minSpan;
      if (nextSpan > maxSpan) nextSpan = minSpan;
      return { ...item, colSpan: nextSpan as WidgetColSpan };
    });
    onUpdateItems(updated);
  };

  // Height Presets: Auto (natural content height), Compact (280px), Medium (400px), Tall (560px)
  const HEIGHT_PRESETS: Array<{ label: string; value?: number }> = [
    { label: 'Auto', value: undefined },
    { label: 'Compact', value: 280 },
    { label: 'Medium', value: 400 },
    { label: 'Tall', value: 560 },
  ];

  // Cycle height preset: Auto -> Compact -> Medium -> Tall -> Auto
  const handleCycleHeight = (widgetId: string) => {
    const updated = items.map((item) => {
      if (item.widgetId !== widgetId) return item;
      const currentH = item.height;
      let nextIdx = 0;
      if (currentH === undefined) {
        nextIdx = 1; // Compact (280px)
      } else if (currentH <= 320) {
        nextIdx = 2; // Medium (400px)
      } else if (currentH <= 460) {
        nextIdx = 3; // Tall (560px)
      } else {
        nextIdx = 0; // Auto
      }
      return { ...item, height: HEIGHT_PRESETS[nextIdx].value };
    });
    onUpdateItems(updated);
  };

  // Update widget inner settings (e.g. metricOrder for kpi_metrics)
  const handleReorderWidgetMetrics = (widgetId: string, newOrder: string[]) => {
    const updated = items.map((item) => {
      if (item.widgetId !== widgetId) return item;
      return {
        ...item,
        settings: {
          ...(item.settings || {}),
          metricOrder: newOrder,
        },
      };
    });
    onUpdateItems(updated);
  };

  const { isFeatureEnabled: contextIsFeatureEnabled } = useFeatureControl();
  const effectiveIsFeatureEnabled = isFeatureEnabledOverride || contextIsFeatureEnabled;

  // Filter display items strictly via Feature & Module Control (`dashboard_widget_*` and parent module flags)
  const displayItems = items.filter((item) => {
    const def = WIDGET_REGISTRY[item.widgetId];
    if (!def) return false;
    if (!isWidgetFeaturePermitted(def, effectiveIsFeatureEnabled)) {
      return false;
    }
    if (!isEditMode && item.isVisible === false) {
      return false;
    }
    return true;
  });

  const getColSpanClass = (span: WidgetColSpan = 1) => {
    switch (span) {
      case 4:
        return 'col-span-1 @[640px]:col-span-2 @[1024px]:col-span-4';
      case 3:
        return 'col-span-1 @[640px]:col-span-2 @[1024px]:col-span-3';
      case 2:
        return 'col-span-1 @[640px]:col-span-2 @[1024px]:col-span-2';
      case 1:
      default:
        return 'col-span-1';
    }
  };

  return (
    <div className={`space-y-6 w-full min-w-0 ${isEditMode ? 'pb-28 sm:pb-32' : ''}`}>
      {displayItems.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl theme-bg-surface shadow-xs border-0 text-center flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto my-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl theme-bg-accent-soft text-[var(--accent-main)] flex items-center justify-center">
            <ShieldCheckIcon className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold theme-text-primary">
              No Widgets Permitted for this Workspace
            </h3>
            <p className="text-xs theme-text-secondary max-w-md leading-relaxed">
              No dashboard widgets are currently enabled for &quot;{(normalizeRoleCode(role) || 'USER').replace(/_/g, ' ')}&quot; under App Management &rarr; Feature &amp; Module Control, or all widgets are hidden in Workspace Customizer.
            </p>
          </div>
          {(onOpenWidgetCatalog || isSuperAdmin) && (
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {onOpenWidgetCatalog && (
                <button
                  type="button"
                  onClick={onOpenWidgetCatalog}
                  className="px-4 py-2 rounded-xl theme-bg-accent theme-accent-text text-xs font-bold shadow-md hover:opacity-90 transition-all cursor-pointer flex items-center gap-2 border-0 ring-0"
                >
                  <Squares2X2Icon className="w-4 h-4" />
                  <span>Open Workspace Customizer</span>
                </button>
              )}
              {isSuperAdmin && (
                <button
                  type="button"
                  onClick={() => navigate('/section-control')}
                  className="px-4 py-2 rounded-xl theme-bg-app hover:theme-bg-sub theme-text-primary text-xs font-bold shadow-xs transition-all cursor-pointer flex items-center gap-2 border-0 ring-0"
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>Configure in Feature Control</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Dynamic 4-Column Responsive Grid with container queries & dense auto-flow packing */
        <div
          ref={gridRef}
          className="@container grid grid-cols-1 @[640px]:grid-cols-2 @[1024px]:grid-cols-4 gap-4 @[640px]:gap-5 w-full min-w-0 items-stretch [grid-auto-flow:dense]"
        >
        {displayItems.map((layoutItem, index) => {
          const widgetDef = WIDGET_REGISTRY[layoutItem.widgetId];
          if (!widgetDef) return null;

          const WidgetComponent = widgetDef.component;
          // Merge user-customized widget settings with runtime props
          const widgetProps = {
            ...(widgetPropsMap[layoutItem.widgetId] || {}),
            ...(layoutItem.settings || {}),
            isEditMode,
            onReorderMetrics: (order: string[]) => handleReorderWidgetMetrics(layoutItem.widgetId, order),
          };
          const isHidden = layoutItem.isVisible === false;
          const isDraggingThis = draggedWidgetId === layoutItem.widgetId;
          const isDragOverThis = dragOverWidgetId === layoutItem.widgetId;
          const isResizingThis = resizing?.widgetId === layoutItem.widgetId;
          const currentSpan = isResizingThis
            ? resizing.previewSpan
            : layoutItem.colSpan || widgetDef.defaultColSpan;
          const effectiveHeight = isResizingThis && resizing.mode !== 'HORIZONTAL'
            ? resizing.previewHeight || undefined
            : layoutItem.height;

          return (
            <div
              key={`${layoutItem.widgetId}-${layoutItem.settings?.displayMode || 'def'}`}
              id={`dashboard-widget-${layoutItem.widgetId}`}
              data-widget-id={layoutItem.widgetId}
              draggable={isEditMode && !isResizingThis}
              onDragStart={(e) => handleDragStart(e, layoutItem.widgetId)}
              onDragOver={(e) => handleDragOver(e, layoutItem.widgetId)}
              onDragEnd={handleDragEnd}
              onDrop={(e) => handleDrop(e, layoutItem.widgetId)}
              style={effectiveHeight ? { height: `${effectiveHeight}px` } : undefined}
              className={`${getColSpanClass(currentSpan)} min-w-0 h-full flex flex-col transition-all duration-150 relative group/card ${
                isDraggingThis ? 'opacity-40 scale-[0.98]' : 'opacity-100'
              } ${isDragOverThis ? 'bg-[var(--accent-main)]/10 rounded-3xl' : ''} ${
                isResizingThis ? 'shadow-xl z-30' : ''
              }`}
            >
              {/* Right Border Interactive Drag Handle (Drag to resize 1 to 4 cols) */}
              {isEditMode && (
                <div
                  onMouseDown={(e) =>
                    handleResizeStart(
                      e,
                      layoutItem.widgetId,
                      'HORIZONTAL',
                      currentSpan,
                      layoutItem.height,
                      widgetDef.minColSpan || 1,
                      widgetDef.maxColSpan || 4
                    )
                  }
                  className="absolute -right-2 top-0 w-4 h-full cursor-col-resize z-30 flex items-center justify-center group/resize select-none"
                  title="Click and drag border horizontally to resize columns (1 to 4)"
                >
                  <div className="w-1.5 h-10 rounded-full theme-bg-surface shadow-md group-hover/resize:theme-bg-accent group-hover/resize:h-14 transition-all" />
                </div>
              )}

              {/* Bottom Border Interactive Drag Handle (Drag to resize height up/down) */}
              {isEditMode && (
                <div
                  onMouseDown={(e) =>
                    handleResizeStart(
                      e,
                      layoutItem.widgetId,
                      'VERTICAL',
                      currentSpan,
                      layoutItem.height,
                      widgetDef.minColSpan || 1,
                      widgetDef.maxColSpan || 4
                    )
                  }
                  className="absolute left-0 -bottom-2 w-full h-4 cursor-row-resize z-30 flex items-center justify-center group/resize-bottom select-none"
                  title="Click and drag bottom border vertically to resize height"
                >
                  <div className="h-1.5 w-16 rounded-full theme-bg-surface shadow-md group-hover/resize-bottom:theme-bg-accent group-hover/resize-bottom:w-24 transition-all" />
                </div>
              )}

              {/* Bottom-Right Corner Diagonal Drag Handle (Drag to resize width and height simultaneously) */}
              {isEditMode && (
                <div
                  onMouseDown={(e) =>
                    handleResizeStart(
                      e,
                      layoutItem.widgetId,
                      'BOTH',
                      currentSpan,
                      layoutItem.height,
                      widgetDef.minColSpan || 1,
                      widgetDef.maxColSpan || 4
                    )
                  }
                  className="absolute -right-2.5 -bottom-2.5 w-6 h-6 cursor-se-resize z-40 flex items-center justify-center group/resize-corner select-none"
                  title="Click and drag corner diagonally to resize width and height simultaneously"
                >
                  <div className="w-3 h-3 rounded-full theme-bg-surface shadow-md border-2 border-[var(--accent-main)]/70 group-hover/resize-corner:scale-125 group-hover/resize-corner:theme-bg-accent transition-all" />
                </div>
              )}

              {/* Edit Mode Customization Overlay & Action Bar */}
              {isEditMode && (
                <div className="mb-2 p-2 rounded-xl theme-bg-surface shadow-xs flex items-center justify-between gap-2 z-10 select-none animate-fade-in border-0">
                  {/* Left: Drag Handle & Widget Title */}
                  <div className="flex items-center gap-2 min-w-0 cursor-grab active:cursor-grabbing">
                    <GripVerticalIcon className="w-4 h-4 theme-text-secondary shrink-0" />
                    <span className="text-xs font-bold theme-text-primary truncate">
                      {widgetDef.title}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded theme-bg-sub theme-text-secondary shrink-0">
                      {currentSpan}/4 Cols • {effectiveHeight ? `${effectiveHeight}px` : 'Auto H'}
                    </span>
                  </div>

                  {/* Right: Controls (Resize, Move, Visibility) */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Width Switcher */}
                    <button
                      type="button"
                      onClick={() =>
                        handleCycleColSpan(
                          layoutItem.widgetId,
                          widgetDef.minColSpan || 1,
                          widgetDef.maxColSpan || 4
                        )
                      }
                      className="px-2 py-1 rounded-lg text-[10px] font-bold theme-bg-sub hover:theme-bg-elevated theme-text-primary transition-all cursor-pointer flex items-center gap-1 border-0"
                      title="Toggle Width (1-Col, 2-Col, 3-Col, Full Width)"
                    >
                      <Squares2X2Icon className="w-3 h-3 theme-accent" />
                      <span>{currentSpan === 4 ? 'Full' : `${currentSpan}-Col`}</span>
                    </button>

                    {/* Height Switcher */}
                    <button
                      type="button"
                      onClick={() => handleCycleHeight(layoutItem.widgetId)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold theme-bg-sub hover:theme-bg-elevated theme-text-primary transition-all cursor-pointer flex items-center gap-1 border-0"
                      title="Toggle Height Preset (Auto, Compact 280px, Medium 400px, Tall 560px)"
                    >
                      <ArrowsUpDownIcon className="w-3 h-3 theme-accent" />
                      <span>{effectiveHeight ? (effectiveHeight <= 320 ? 'Compact' : effectiveHeight <= 460 ? 'Medium' : 'Tall') : 'Auto H'}</span>
                    </button>

                    {/* Step Up / Down */}
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveStep(layoutItem.widgetId, 'UP')}
                      className="p-1 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary disabled:opacity-40 cursor-pointer border-0"
                      title="Move Up"
                    >
                      <ArrowUpIcon className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      disabled={index === displayItems.length - 1}
                      onClick={() => handleMoveStep(layoutItem.widgetId, 'DOWN')}
                      className="p-1 rounded-lg theme-bg-sub hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary disabled:opacity-40 cursor-pointer border-0"
                      title="Move Down"
                    >
                      <ArrowDownIcon className="w-3 h-3" />
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(layoutItem.widgetId)}
                      className={`p-1 rounded-lg transition-all cursor-pointer border-0 ${
                        isHidden
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'theme-bg-sub theme-text-secondary hover:theme-text-primary'
                      }`}
                      title={isHidden ? 'Show Widget' : 'Hide Widget'}
                    >
                      {isHidden ? <EyeOffIcon className="w-3.5 h-3.5" /> : <EyeIcon className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Widget Body (Dimmed if hidden in edit mode, full height stretch, scrollable when height is constrained) */}
              <div
                className={`h-full flex-1 flex flex-col justify-start min-h-0 ${
                  effectiveHeight ? 'overflow-y-auto' : ''
                } ${isHidden && isEditMode ? 'opacity-40 filter grayscale-[50%]' : ''}`}
              >
                <WidgetErrorBoundary widgetTitle={widgetDef.title}>
                  <DeferredWidgetMount
                    isImmediate={index < 3 || isEditMode}
                    title={widgetDef.title}
                  >
                    <WidgetComponent {...widgetProps} />
                  </DeferredWidgetMount>
                </WidgetErrorBoundary>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
