import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

// Helper to format nested error objects into clean strings
const formatErrorMessage = (err) => {
  if (!err) return "Action updated successfully";
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

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const formattedMsg = formatErrorMessage(message);
    setToasts((prev) => {
      const next = [...prev, { id, message: formattedMsg, type }];
      return next.slice(-3); // Keep only the 3 most recent toasts
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const handleCopyToast = useCallback(async (e, toast) => {
    // If the user clicked the close button, let it be handled separately
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

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* 🌟 Responsive Centered Mobile & Bottom-Right Desktop Toast Container 🌟 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 flex flex-col items-center sm:items-end gap-2.5 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-full pointer-events-none">
        {toasts.map((toast) => {
          const isCopied = copiedId === toast.id;
          return (
            <div
              key={toast.id}
              onClick={(e) => handleCopyToast(e, toast)}
              title="Click to copy message"
              className="pointer-events-auto flex items-center justify-between px-4 py-3 rounded-full sm:rounded-xl theme-bg-surface border theme-border theme-text-primary shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-200 w-full sm:w-auto animate-fade-in cursor-pointer select-none active:scale-[0.98] hover:border-sky-500/50 hover:shadow-sky-500/10"
            >
              {/* Left Color Accent Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-1 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'error' ? 'bg-rose-500' :
                toast.type === 'warning' ? 'bg-amber-500' :
                'bg-[var(--accent-main)]'
              }`} />

              <div className="flex items-center gap-3 pl-2 pr-1">
                <p className="text-xs font-semibold theme-text-primary leading-relaxed">
                  {isCopied ? 'Copied to clipboard!' : toast.message}
                </p>
              </div>

              <button
                data-toast-close="true"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="theme-text-secondary hover:theme-text-primary text-xs p-1 transition ml-3 shrink-0 cursor-pointer"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
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