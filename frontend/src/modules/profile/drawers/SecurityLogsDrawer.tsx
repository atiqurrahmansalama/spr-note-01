import React from 'react';
import { ActiveSessionsDrawer } from './ActiveSessionsDrawer';

export interface SecurityLogsDrawerProps {
  onClose: () => void;
}

export const SecurityLogsDrawer: React.FC<SecurityLogsDrawerProps> = ({ onClose }) => {
  return <ActiveSessionsDrawer initialTab="logs" onClose={onClose} />;
};

export default SecurityLogsDrawer;
