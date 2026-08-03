import { CloseIcon } from "../ui/Icons";

export default function SidebarScreenBlockView({ title, onClose, children }) {
  return (
    <div className="w-full h-full theme-bg-app flex flex-col overflow-hidden animate-fade-in relative z-20">
      {/* Screen-Blocking View Top Header Bar */}
      <div className="theme-bg-surface border-b theme-border px-6 py-3.5 flex justify-between items-center shrink-0 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-mono uppercase tracking-wider theme-text-secondary">
            Navigation /
          </span>
          <span className="text-sm font-bold theme-text-primary">{title}</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl theme-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer flex items-center justify-center"
          title="Close View"
        >
          <CloseIcon className="w-4 h-4 text-inherit" />
        </button>
      </div>

      {/* Main Centered / Top-Middle Aligned Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
        {children}
      </div>
    </div>
  );
}
