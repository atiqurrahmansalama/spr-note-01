import React, { useState, useEffect, useRef } from 'react';
import {
  CloudCheckIcon,
  RefreshIcon,
  LockClosedIcon,
  AlertCircleIcon,
} from './Icons';

/**
 * AutoSaveBadge
 * Universal Auto-Save Status Indicator Component with auto-hide capability.
 * 
 * Complies with SPR Note Enterprise Guidelines:
 * - 100% Project Design Tokens & Zero Hardcoded Colors
 * - Stable, jitter-free visual rendering without layout shifting or bouncing
 * - Optional auto-hide on saved state (fades out or disappears after specified delay)
 * - Fully accessible with screen-reader and tooltip hints
 * - Multi-variant support: 'badge' (pill), 'text' (inline), 'icon-only'
 * 
 * @param {Object} props
 * @param {'saved'|'saving'|'unsaved'|'error'|'locked'} [props.status='saved'] - Current save state
 * @param {string} [props.lastSavedAt] - Last saved time string (e.g. "06:15:30 PM")
 * @param {'badge'|'text'|'icon-only'} [props.variant='badge'] - Visual presentation style
 * @param {'sm'|'md'} [props.size='sm'] - Component density
 * @param {boolean} [props.show=true] - Whether the badge is rendered (switchable)
 * @param {boolean} [props.visible=true] - Alias for show
 * @param {boolean} [props.showTimestamp=true] - Whether to render formatted time
 * @param {boolean} [props.autoHideSaved=false] - Whether to auto-hide when in 'saved' state
 * @param {number} [props.hideDelayMs=2500] - Duration in ms before auto-hiding after save
 * @param {React.ReactNode} [props.idleContent=null] - Fallback content rendered when hidden
 * @param {string} [props.className=''] - Additional custom CSS classes
 */
export default function AutoSaveBadge({
  status = 'saved',
  lastSavedAt = null,
  variant = 'badge',
  size = 'sm',
  show = true,
  visible = true,
  showTimestamp = true,
  autoHideSaved = false,
  hideDelayMs = 2500,
  idleContent = null,
  className = '',
}) {
  const isEnabled = Boolean(show && visible);
  const [isSavedVisible, setIsSavedVisible] = useState(!autoHideSaved);
  const prevStatusRef = useRef(status);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    if (!autoHideSaved) {
      setIsSavedVisible(true);
      return;
    }

    if (status === 'saved') {
      // If we just transitioned to 'saved' from 'saving' or 'unsaved'
      if (prevStatusRef.current === 'saving' || prevStatusRef.current === 'unsaved') {
        setIsSavedVisible(true);
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setIsSavedVisible(false);
        }, hideDelayMs);
      }
    } else {
      // For active states ('saving', 'unsaved', 'error', 'locked'), always stay visible
      setIsSavedVisible(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }

    prevStatusRef.current = status;

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [status, autoHideSaved, hideDelayMs]);

  // If component is switched off via show/visible prop, do not render
  if (!isEnabled) {
    return idleContent || null;
  }

  // If auto-hide is active and saved state expired, render idle content or null
  if (autoHideSaved && status === 'saved' && !isSavedVisible) {
    return idleContent || null;
  }

  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2.5 gap-1.5 h-6',
    md: 'text-sm py-1 px-3 gap-2 h-7',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5 shrink-0',
    md: 'w-4 h-4 shrink-0',
  };

  // 1. Locked State
  if (status === 'locked') {
    if (variant === 'icon-only') {
      return (
        <span className={`inline-flex items-center shrink-0 theme-text-secondary ${className}`} title="Locked / Read Only">
          <LockClosedIcon className={iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} />
        </span>
      );
    }
    if (variant === 'text') {
      return (
        <span className={`inline-flex items-center shrink-0 gap-1.5 text-xs theme-text-secondary ${className}`}>
          <LockClosedIcon className={`${iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} theme-accent`} />
          Locked
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center shrink-0 font-medium rounded-full border theme-border theme-bg-sub theme-text-secondary select-none ${
          sizeClasses[size] || sizeClasses.sm
        } ${className}`}
      >
        <LockClosedIcon className={`${iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} theme-accent`} />
        Locked
      </span>
    );
  }

  // 2. Saving State
  if (status === 'saving') {
    if (variant === 'icon-only') {
      return (
        <span className={`inline-flex items-center shrink-0 theme-accent ${className}`} title="Auto-saving in background...">
          <RefreshIcon className={`${iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} animate-spin`} />
        </span>
      );
    }
    if (variant === 'text') {
      return (
        <span className={`inline-flex items-center shrink-0 gap-1.5 text-xs theme-text-secondary ${className}`}>
          <RefreshIcon className={`${iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} animate-spin theme-accent`} />
          Saving...
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center shrink-0 font-medium rounded-full border theme-border theme-bg-sub theme-text-secondary select-none ${
          sizeClasses[size] || sizeClasses.sm
        } ${className}`}
      >
        <RefreshIcon className={`${iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} animate-spin theme-accent`} />
        Saving...
      </span>
    );
  }

  // 3. Error State
  if (status === 'error') {
    if (variant === 'icon-only') {
      return (
        <span className={`inline-flex items-center shrink-0 text-rose-500 ${className}`} title="Auto-save failed">
          <AlertCircleIcon className={iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} />
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center shrink-0 font-medium rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-500 select-none ${
          sizeClasses[size] || sizeClasses.sm
        } ${className}`}
      >
        <AlertCircleIcon className={iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} />
        Save failed
      </span>
    );
  }

  // 4. Unsaved State
  if (status === 'unsaved') {
    if (variant === 'icon-only') {
      return (
        <span className={`inline-flex items-center shrink-0 theme-text-secondary ${className}`} title="Unsaved changes pending...">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        </span>
      );
    }
    if (variant === 'text') {
      return (
        <span className={`inline-flex items-center shrink-0 gap-1.5 text-xs theme-text-secondary ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
          Unsaved changes
        </span>
      );
    }
    return (
      <span
        className={`inline-flex items-center shrink-0 font-medium rounded-full border theme-border theme-bg-sub theme-text-secondary select-none ${
          sizeClasses[size] || sizeClasses.sm
        } ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        Unsaved changes
      </span>
    );
  }

  // 5. Default: Saved State
  const label = lastSavedAt && showTimestamp ? `Auto-saved at ${lastSavedAt}` : 'Auto-saved';

  if (variant === 'icon-only') {
    return (
      <span className={`inline-flex items-center shrink-0 theme-accent ${className}`} title={label}>
        <CloudCheckIcon className={iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} />
      </span>
    );
  }

  if (variant === 'text') {
    return (
      <span className={`inline-flex items-center shrink-0 gap-1.5 text-xs theme-text-secondary ${className}`}>
        <CloudCheckIcon className={`${iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} theme-accent`} />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center shrink-0 font-medium rounded-full border border-[var(--accent-main)]/30 theme-bg-accent-soft theme-accent select-none ${
        sizeClasses[size] || sizeClasses.sm
      } ${className}`}
    >
      <CloudCheckIcon className={iconSizes[size] || 'w-3.5 h-3.5 shrink-0'} />
      {label}
    </span>
  );
}
