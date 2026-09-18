import React from "react";
import { AlertCircleIcon } from "../../../../components/ui/Icons";

export interface DiscardAlertModalProps {
  showDiscardAlert: boolean;
  setShowDiscardAlert: (show: boolean) => void;
  handleConfirmDiscard: () => void;
}

export function DiscardAlertModal({
  showDiscardAlert,
  setShowDiscardAlert,
  handleConfirmDiscard,
}: DiscardAlertModalProps) {
  if (!showDiscardAlert) return null;

  return (
    <div
      onClick={() => setShowDiscardAlert(false)}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="theme-bg-surface border theme-border rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-scale-up theme-text-primary text-center"
      >
        <div className="w-12 h-12 rounded-full theme-bg-accent-soft theme-accent mx-auto flex items-center justify-center">
          <AlertCircleIcon className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold theme-text-primary">Unsaved Changes</h3>
          <p className="text-xs theme-text-secondary">
            You have unsaved changes in text mode. Discard changes and close?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setShowDiscardAlert(false)}
            className="py-2.5 rounded-xl border theme-border theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated text-xs font-semibold transition-colors cursor-pointer"
          >
            Keep Editing
          </button>
          <button
            type="button"
            onClick={handleConfirmDiscard}
            className="py-2.5 rounded-xl theme-danger-bg hover:opacity-90 text-white text-xs font-semibold transition-colors shadow cursor-pointer"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}
