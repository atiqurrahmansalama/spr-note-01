import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

// নেস্টেড এরর অবজেক্টকে প্রপার স্ট্রিং এ রূপান্তর করার হেল্পার
const formatErrorMessage = (err) => {
  if (typeof err === 'string') return err;
  if (Array.isArray(err)) return err.map(formatErrorMessage).join(', ');
  if (typeof err === 'object' && err !== null) {
    return Object.entries(err)
      .map(([key, val]) => `${key}: ${formatErrorMessage(val)}`)
      .join(' | ');
  }
  return String(err);
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    const formattedMsg = formatErrorMessage(message);
    setToasts((prev) => [...prev, { id, message: formattedMsg, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* 🌟 Responsive Centered Mobile & Bottom-Right Desktop Toast Container 🌟 */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 flex flex-col items-center sm:items-end gap-2.5 max-w-sm sm:max-w-md w-[calc(100%-2rem)] sm:w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between px-4 py-3 rounded-full sm:rounded-xl theme-bg-surface border theme-border theme-text-primary shadow-2xl relative overflow-hidden backdrop-blur-md transition-all duration-300 w-full sm:w-auto animate-fade-in"
          >
            {/* Left Color Accent Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 sm:w-1 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'warning' ? 'bg-amber-500' :
              'bg-[var(--accent-main)]'
            }`} />

            <div className="flex items-center gap-3 pl-2 pr-1">
              <p className="text-xs font-semibold theme-text-primary leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="theme-text-secondary hover:theme-text-primary text-xs p-1 transition ml-3 shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
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