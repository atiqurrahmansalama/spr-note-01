import React from 'react';

/**
 * ExamStatTile
 * Enterprise reusable metric/specification tile for Examination workspace.
 * 100% Theme Tokens, responsive micro-card with icon box, uppercase label, primary value, and optional subtext.
 */
export default function ExamStatTile({
  icon: Icon,
  label,
  value,
  subtext,
  title,
  className = '',
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`p-2.5 rounded-xl border theme-border theme-bg-sub/20 flex items-center gap-2.5 transition-colors hover:theme-bg-sub/35 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      title={title}
    >
      {Icon && (
        <div className="w-8 h-8 rounded-lg theme-bg-surface border theme-border flex items-center justify-center shrink-0 shadow-2xs">
          <Icon className="w-4 h-4 theme-accent opacity-90" />
        </div>
      )}
      <div className="min-w-0 space-y-0.5 flex-1">
        <div className="text-[10px] uppercase font-bold tracking-wider theme-text-secondary opacity-80 truncate">
          {label}
        </div>
        <div className="text-xs font-bold theme-text-primary truncate">
          {value}
        </div>
        {subtext && (
          <div className="text-[11px] theme-text-secondary truncate opacity-80">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}
