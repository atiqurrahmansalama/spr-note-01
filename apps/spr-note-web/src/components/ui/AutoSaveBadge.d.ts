import React from 'react';

export type AutoSaveStatus = 'saved' | 'saving' | 'unsaved' | 'error' | 'locked' | string;

export interface AutoSaveBadgeProps {
  status?: AutoSaveStatus;
  lastSavedAt?: string | null;
  variant?: 'badge' | 'text' | 'icon-only';
  size?: 'sm' | 'md';
  show?: boolean;
  visible?: boolean;
  showTimestamp?: boolean;
  autoHideSaved?: boolean;
  hideDelayMs?: number;
  idleContent?: React.ReactNode;
  className?: string;
}

export default function AutoSaveBadge(props: AutoSaveBadgeProps): React.JSX.Element;
