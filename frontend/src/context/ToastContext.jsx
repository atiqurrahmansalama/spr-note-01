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
      
      {/* 🌟 Borderless Minimal Bottom-Right Toast 🌟 */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#1e2023] text-slate-200 shadow-2xl relative overflow-hidden transition-all duration-300"
          >
            {/* Left Color Accent Bar (No border around the box) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              toast.type === 'success' ? 'bg-emerald-500' :
              toast.type === 'error' ? 'bg-rose-500' :
              toast.type === 'warning' ? 'bg-amber-500' :
              'bg-indigo-500'
            }`} />

            <div className="flex items-center gap-3 pl-1">
              <p className="text-xs font-medium text-slate-300 leading-relaxed">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-500 hover:text-slate-300 text-xs p-1 transition ml-4 shrink-0"
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