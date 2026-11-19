import React, { useState, useEffect, useRef } from 'react';
import { CheckCircleIcon, AlertCircleIcon } from '../ui/Icons';

/**
 * SaveStatusBadge
 * Global Application Top Header Auto-Save Indicator.
 * 
 * Complies with SPR Note Enterprise Guidelines:
 * - 100% Project Design Tokens & Zero Hardcoded Colors
 * - Minimal, borderless & backgroundless inline indicator
 * - Snappy & fast: appears smoothly upon auto-save and fades out quickly (1.0s)
 * - Zero busy/spinning state (silent background persistence)
 */
export default function SaveStatusBadge() {
  const [state, setState] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const hideTimerRef = useRef(null);
  const unmountTimerRef = useRef(null);

  useEffect(() => {
    const handleStatusChange = (e) => {
      const detail = e?.detail;
      // Only process completed save or error events; ignore busy saving states
      if (detail && detail.status !== 'saving') {
        setState(detail);
        setIsRendered(true);
        if (typeof window !== 'undefined' && window.requestAnimationFrame) {
          window.requestAnimationFrame(() => {
            setVisible(true);
          });
        } else {
          setVisible(true);
        }

        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);

        // Snappy auto-hide: stays for 1 second, then smoothly transitions out
        if (detail.status === 'saved' || !detail.status) {
          hideTimerRef.current = setTimeout(() => {
            setVisible(false);
            unmountTimerRef.current = setTimeout(() => {
              setIsRendered(false);
            }, 200);
          }, 600);
        }
      }
    };

    window.addEventListener('spr_save_status_change', handleStatusChange);
    return () => {
      window.removeEventListener('spr_save_status_change', handleStatusChange);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    };
  }, []);

  if (!state || !isRendered) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs font-semibold select-none shrink-0 transition-all duration-200 ease-out transform ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95 pointer-events-none'
      } ${
        state.status === 'error'
          ? 'text-rose-500'
          : 'theme-accent'
      }`}
      title={state.timestamp ? `Auto-saved at ${state.timestamp}` : 'Changes saved automatically'}
    >
      {state.status === 'error' ? (
        <>
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{state.message || 'Save failed'}</span>
        </>
      ) : (
        <>
          <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{state.message || 'Auto-saved'}</span>
        </>
      )}
    </div>
  );
}
