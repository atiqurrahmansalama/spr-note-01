import React from 'react';

export interface DrawerContainerProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  spacing?: 'normal' | 'compact' | 'relaxed' | 'none' | string;
  padding?: 'normal' | 'compact' | 'none' | string;
  animate?: boolean;
  className?: string;
  [key: string]: any;
}

export interface DrawerBannerProps {
  icon?: React.ComponentType<{ className?: string }>;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export interface DrawerSectionProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  variant?: 'streamlined' | 'card' | string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  expanded?: boolean;
  storageKey?: string;
  onToggle?: (expanded: boolean) => void;
  [key: string]: any;
}

export interface DrawerFooterProps {
  onCancel?: () => void;
  onSubmit?: ((e?: any) => void) | boolean;
  onSave?: ((e?: any) => void) | boolean;
  cancelLabel?: string;
  saveLabel?: string;
  isSubmitting?: boolean;
  isSaveDisabled?: boolean;
  autoSaveStatus?: any;
  lastSavedAt?: any;
  showAutoSave?: boolean;
  extraButtons?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

export declare const DrawerContainer: React.ComponentType<DrawerContainerProps> & {
  Banner: React.ComponentType<DrawerBannerProps>;
  Section: React.ComponentType<DrawerSectionProps>;
  Footer: React.ComponentType<DrawerFooterProps>;
};

export declare const DrawerBanner: React.ComponentType<DrawerBannerProps>;
export declare const DrawerSection: React.ComponentType<DrawerSectionProps>;
export declare const DrawerFooter: React.ComponentType<DrawerFooterProps>;
export declare const RightSidebarContainer: React.ComponentType<DrawerContainerProps>;

export default DrawerContainer;
