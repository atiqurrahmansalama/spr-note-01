import { AlertTriangleIcon } from "../../../components/ui/Icons";

export function DiscardAlertModal({ showDiscardAlert, setShowDiscardAlert, handleConfirmDiscard }) {
  if (!showDiscardAlert) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="theme-bg-surface border theme-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 text-center">
        <div className="w-10 h-10 rounded-full theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto border theme-border">
          <AlertTriangleIcon className="w-5 h-5" />
        </div>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold theme-text-primary">
            Discard Editing Changes?
          </h3>
          <p className="text-xs theme-text-secondary leading-relaxed">
            You are currently editing the report text. If you close now, your un-saved text edits will be discarded.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowDiscardAlert(false)}
            className="flex-1 px-3 py-2 rounded-xl theme-bg-elevated hover:opacity-80 theme-text-secondary text-xs font-semibold border theme-border transition-colors"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={handleConfirmDiscard}
            className="flex-1 px-3 py-2 rounded-xl theme-bg-accent hover:opacity-90 theme-accent-text text-xs font-semibold shadow transition-colors"
          >
            Discard & Close
          </button>
        </div>
      </div>
    </div>
  );
}
