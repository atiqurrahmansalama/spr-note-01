import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon, CloseIcon, InfoIcon, AlertCircleIcon } from '../components/ui/Icons';

const ToastContext = createContext(null);

// Helper to format nested error objects into clean strings
const formatErrorMessage = (err) => {
  if (!err) return "Action completed successfully";
  if (typeof err === 'string') return err.trim() || "An issue occurred";
  if (Array.isArray(err)) {
    const list = err.map(formatErrorMessage).filter(Boolean);
    return list.join(', ') || "An issue occurred";
  }
  if (typeof err === 'object') {
    if (err.detail) return formatErrorMessage(err.detail);
    if (err.message) return formatErrorMessage(err.message);
    const formatted = Object.entries(err)
      .map(([key, val]) => {
        const valStr = formatErrorMessage(val);
        return valStr ? `${key}: ${valStr}` : '';
      })
      .filter(Boolean)
      .join(' | ');
    return formatted || "An unexpected error occurred";
  }
  return String(err) || "An issue occurred";
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const formattedMsg = formatErrorMessage(message);
    setToasts((prev) => {
      const next = [...prev, { id, message: formattedMsg, type }];
      return next.slice(-4); // Keep recent toasts
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleCopyToast = useCallback(async (e, toast) => {
    if (e.target.closest('[data-toast-close="true"]')) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(toast.message);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = toast.message;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedId(toast.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === toast.id ? null : prev));
      }, 1500);
    } catch (err) {
      console.warn('[Toast] Failed to copy toast message to clipboard:', err);
    }
  }, []);

  // Toast Container element always rendered on top via Portal
  const toastContainer = (
    <aside
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-[99999999] flex flex-col items-center sm:items-end gap-2.5 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-full pointer-events-none select-none"
    >
      {toasts.map((toast) => {
        const isCopied = copiedId === toast.id;

        return (
          <div
            key={toast.id}
            role="alert"
            onClick={(e) => handleCopyToast(e, toast)}
            title="Click to copy message"
            className="pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl theme-bg-surface border theme-border theme-text-primary shadow-2xl relative overflow-hidden backdrop-blur-xl transition-all duration-200 w-full sm:w-auto animate-fade-in cursor-pointer select-none active:scale-[0.98] ring-1 ring-white/10 dark:ring-white/5"
          >
            {/* Left Status Bar / Accent */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 sm:w-1.5 ${
                toast.type === 'success'
                  ? 'bg-emerald-500'
                  : toast.type === 'error'
                  ? 'bg-rose-500'
                  : toast.type === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-[var(--accent-main)]'
              }`}
            />

            {/* Icon & Message Body */}
            <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
              <span className="shrink-0 flex items-center justify-center">
                {toast.type === 'success' ? (
                  <CheckIcon className="w-4 h-4 text-emerald-500" />
                ) : toast.type === 'error' ? (
                  <AlertCircleIcon className="w-4 h-4 text-rose-500" />
                ) : toast.type === 'warning' ? (
                  <AlertCircleIcon className="w-4 h-4 text-amber-500" />
                ) : (
                  <InfoIcon className="w-4 h-4 text-[var(--accent-main)]" />
                )}
              </span>

              <p className="text-xs font-semibold theme-text-primary leading-relaxed truncate-2-lines break-words">
                {isCopied ? 'Copied to clipboard!' : toast.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              data-toast-close="true"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="p-1 rounded-lg hover:theme-bg-sub theme-text-secondary hover:theme-text-primary transition shrink-0 cursor-pointer ml-1"
              title="Dismiss notification"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </aside>
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && typeof document !== 'undefined' && createPortal(toastContainer, document.body)}
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};