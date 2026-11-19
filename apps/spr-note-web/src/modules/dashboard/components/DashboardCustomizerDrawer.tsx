import React from 'react';
import DashboardCustomizerPanel, { DashboardCustomizerPanelProps } from './DashboardCustomizerPanel';

export type DashboardCustomizerDrawerProps = DashboardCustomizerPanelProps & {
  isOpen?: boolean;
};

/**
 * Backwards compatibility wrapper for DashboardCustomizerPanel.
 * Dashboard customizer is now officially rendered inside SPR Note's standard Right Sidebar.
 */
export default function DashboardCustomizerDrawer(props: DashboardCustomizerDrawerProps) {
  if (props.isOpen === false) return null;
  return <DashboardCustomizerPanel {...props} />;
}
