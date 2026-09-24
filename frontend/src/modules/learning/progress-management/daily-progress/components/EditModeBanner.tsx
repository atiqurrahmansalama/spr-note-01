import React from "react";
import { EditIcon, CloseIcon } from "@/components/ui/Icons";

interface EditModeBannerProps {
  editingReport: any;
  onCancel: () => void;
}

export function EditModeBanner({ editingReport, onCancel }: EditModeBannerProps) {
  if (!editingReport) return null;

  return (
    <div className="w-full theme-bg-sub border theme-border rounded-xl p-2.5 sm:p-3 shadow-md flex items-center justify-between gap-2.5 animate-fade-in select-none">
      <div className="flex items-center gap-2 min-w-0 text-left">
        <div className="p-1 rounded-lg theme-bg-accent-soft shrink-0 flex items-center justify-center">
          <EditIcon className="w-4 h-4 theme-accent" />
        </div>
        <div className="text-xs theme-text-primary truncate font-medium">
          Editing report for <span className="font-bold theme-accent">{editingReport?.student_name}</span>
          {editingReport?.formattedDate && (
            <span className="theme-text-secondary"> · {editingReport.formattedDate}</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="theme-text-secondary hover:theme-text-primary hover:theme-bg-elevated text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 flex items-center gap-1"
      >
        <CloseIcon className="w-3.5 h-3.5" />
        <span>Cancel</span>
      </button>
    </div>
  );
}
