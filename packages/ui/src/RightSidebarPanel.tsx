import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, CloseIcon } from './Icons';
import IconButton from './IconButton';
import CustomButton from './CustomButton';
import PanelResizer from './PanelResizer';
import { resolveDrawerWidth, type DrawerSize } from './context/RightSidebarContext';

export interface RightSidebarPanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  category?: React.ReactNode;
  parentTitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  size?: DrawerSize | string;
  width?: number;
  isResizing?: boolean;
  onStartResize?: (e?: React.MouseEvent | React.PointerEvent) => void;
  onResetResize?: () => void;
  onClose?: () => void;
  onBack?: () => void;
  showCloseButton?: boolean;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  formId?: string;
  onSave?: ((e: React.SyntheticEvent) => void) | null;
  onCancel?: (() => void) | null;
  saveLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  isSaveDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * Shared Borderless Right Sidebar Panel.
 * Handles desktop docked rendering, mobile touch swipe-to-dismiss,
 * Esc-to-close, header breadcrumbs/actions, and standardized sticky footer actions.
 */
export function RightSidebarPanel({
  title = 'Details',
  subtitle,
  category,
  parentTitle,
  icon: Icon,
  size = 'md',
  width,
  isResizing = false,
  onStartResize,
  onResetResize,
  onClose,
  onBack,
  showCloseButton = true,
  headerRight,
  footer,
  formId,
  onSave,
  onCancel,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  isSaveDisabled = false,
  children,
  className = '',
  bodyClassName = '',
}: RightSidebarPanelProps) {
  const [swipeOffsetX, setSwipeOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchAxisLockedRef = useRef<'horizontal' | 'vertical' | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest(
        'input, select, textarea, button, [role="listbox"], [data-prevent-swipe="true"]'
      )
    ) {
      return;
    }
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchAxisLockedRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !onClose) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;

    if (!touchAxisLockedRef.current) {
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchAxisLockedRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
      }
    }

    if (touchAxisLockedRef.current === 'horizontal') {
      const isRtl = document.documentElement.dir === 'rtl';
      const offset = isRtl ? Math.min(0, dx) : Math.max(0, dx);
      if (Math.abs(offset) > 8) {
        setIsSwiping(true);
        setSwipeOffsetX(offset);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping && Math.abs(swipeOffsetX) > 95) {
      onClose?.();
    }
    setIsSwiping(false);
    setSwipeOffsetX(0);
    touchStartRef.current = null;
    touchAxisLockedRef.current = null;
  };

  const resolvedWidth = width || resolveDrawerWidth(size);
  const resolvedFooter =
    footer ??
    (onSave || onCancel || formId ? (
      <div className="flex items-center justify-between gap-2.5 w-full">
        <div>
          {onCancel && (
            <CustomButton
              type="button"
              variant="sub"
              size="md"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              {cancelLabel}
            </CustomButton>
          )}
        </div>
        <div className="flex items-center gap-2 ms-auto">
          {(onSave || formId) && (
            <CustomButton
              type={formId ? 'submit' : 'button'}
              form={formId}
              variant="primary"
              size="md"
              onClick={formId ? undefined : (e: React.MouseEvent) => onSave?.(e)}
              loading={isSubmitting}
              disabled={isSaveDisabled || isSubmitting}
            >
              {saveLabel}
            </CustomButton>
          )}
        </div>
      </div>
    ) : null);

  return (
    <aside
      aria-label={typeof title === 'string' ? title : 'Details Drawer'}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${resolvedWidth}px` : '100%',
        transform: swipeOffsetX !== 0 ? `translateX(${swipeOffsetX}px)` : undefined,
        transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      className={`h-full w-full flex flex-col theme-bg-surface theme-text-primary relative overflow-hidden border-0 shadow-2xl ${className}`}
    >
      {onStartResize && (
        <PanelResizer
          position="left"
          isResizing={isResizing}
          onStartResize={onStartResize}
          onResetResize={onResetResize}
          currentWidth={resolvedWidth}
          title="Drag to resize drawer (double-click to reset)"
        />
      )}

      {/* Drawer Header (Borderless Soft Surface) */}
      <div className="shrink-0 px-4 sm:px-5 py-3.5 theme-bg-sub/60 flex items-center justify-between gap-3 border-0">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {(onBack || parentTitle) && (
            <IconButton
              icon={ArrowLeftIcon}
              variant="ghost"
              size="sm"
              onClick={onBack || onClose}
              title={parentTitle || 'Back'}
              aria-label={parentTitle || 'Back'}
            />
          )}

          {Icon && (
            <div className="w-9 h-9 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-bold theme-text-primary truncate">{title}</h2>
              {category && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent shrink-0">
                  {category}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs theme-text-secondary truncate mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {headerRight}
          {showCloseButton && onClose && (
            <IconButton
              icon={CloseIcon}
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close drawer"
              aria-label="Close drawer"
            />
          )}
        </div>
      </div>

      {/* Scrollable Drawer Body */}
      <div className={`flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 ${bodyClassName}`}>
        {children}
      </div>

      {/* Sticky Drawer Footer */}
      {resolvedFooter && (
        <div className="shrink-0 px-4 sm:px-6 py-3.5 theme-bg-sub/50 border-0">
          {resolvedFooter}
        </div>
      )}
    </aside>
  );
}

export default RightSidebarPanel;
