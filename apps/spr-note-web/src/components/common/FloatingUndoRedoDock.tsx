import React from 'react';
import QuickAccessDock from './QuickAccessDock';

export interface FloatingUndoRedoDockProps {
  className?: string;
  defaultBottom?: number;
  storageKey?: string;
}

/**
 * Enterprise Unified Quick Access & History Dock
 * -----------------------------------------------
 * Consolidates the former floating undo dock into the screen-edge
 * Quick Access & Command Dock.
 */
export const FloatingUndoRedoDock: React.FC<FloatingUndoRedoDockProps> = ({
  className = '',
}) => {
  return <QuickAccessDock className={className} />;
};

export default FloatingUndoRedoDock;
