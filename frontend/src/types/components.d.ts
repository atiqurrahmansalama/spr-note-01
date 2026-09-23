import React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Global declaration for any JSX component or module
declare module '*.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

// ---------------- UI Components Type Declarations ---------------- //

declare module '@/components/ui/CustomButton' {
  export interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children?: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'primary' | 'secondary' | 'sub' | 'surface' | 'outline' | 'soft' | 'danger' | 'danger-solid' | 'success' | 'success-solid' | 'warning' | 'ghost' | string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon-md' | 'icon-lg' | string;
    loading?: boolean;
    loadingText?: string;
    icon?: React.ComponentType<{ className?: string }>;
    iconRight?: React.ComponentType<{ className?: string }>;
    disabled?: boolean;
    requireAll?: any;
    disabledReason?: string;
    fullWidth?: boolean;
    className?: string;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    title?: string;
    [key: string]: any;
  }
  const CustomButton: React.ComponentType<CustomButtonProps>;
  export default CustomButton;
}

declare module '@/components/ui/CustomInput' {
  export interface CustomInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
    label?: React.ReactNode;
    subLabel?: React.ReactNode;
    error?: string;
    helperText?: React.ReactNode;
    prefix?: React.ComponentType<{ className?: string }> | React.ReactNode;
    suffix?: React.ComponentType<{ className?: string }> | React.ReactNode;
    clearable?: boolean;
    onClear?: () => void;
    fullWidth?: boolean;
    compact?: boolean;
    className?: string;
    containerClassName?: string;
    value?: any;
    onChange?: any;
    size?: 'sm' | 'md' | 'lg' | string;
    variant?: 'default' | 'filled' | 'elevated' | 'sub' | 'borderless' | 'compact-number' | string;
    [key: string]: any;
  }
  const CustomInput: React.ComponentType<CustomInputProps>;
  export default CustomInput;
}


declare module '@/components/ui/DataTable' {
  export interface Column<T = any> {
    key?: string;
    id?: string;
    header?: React.ReactNode;
    label?: string;
    subHeader?: React.ReactNode;
    align?: 'left' | 'center' | 'right';
    width?: string | number;
    minWidth?: string | number;
    maxWidth?: string | number;
    sortable?: boolean;
    sortKey?: string;
    sortValue?: (item: T) => any;
    rotatable?: boolean;
    sticky?: 'left' | 'right' | boolean;
    headerClassName?: string;
    cellClassName?: string;
    className?: string;
    render?: (item: T, idx?: number) => React.ReactNode;
    cell?: (val: any, row: T, idx?: number) => React.ReactNode;
    [key: string]: any;
  }
  export interface DataTableProps<T = any> {
    tableTitle?: React.ReactNode;
    tableTitleIcon?: React.ComponentType<{ className?: string }>;
    columns?: Column<T>[];
    data?: T[];
    footerRow?: Record<string, any> | null;
    footerRows?: Record<string, any>[];
    keyExtractor?: (item: T, idx?: number) => string;
    showSerial?: boolean;
    showIndex?: boolean;
    serialHeader?: string;
    indexHeader?: string;
    verticalHeaders?: boolean;
    rotateHeaders?: boolean;
    resizable?: boolean;
    emptyTitle?: string;
    emptySubMessage?: string;
    emptyIcon?: React.ComponentType<{ className?: string }>;
    sortable?: boolean;
    defaultSortKey?: string;
    defaultSortDirection?: 'asc' | 'desc';
    cellPaddingClass?: string;
    isLoading?: boolean;
    loading?: boolean;
    emptyMessage?: string;
    loadingMessage?: string;
    onRowClick?: (item: T) => void;
    rowClassName?: ((item: T, idx: number) => string) | string;
    onSelectRow?: (item: T) => void;
    onSelectAll?: (items: T[]) => void;
    selectedRows?: Set<string | number>;
    selectable?: boolean;
    selectedIds?: (string | number)[];
    headerActions?: React.ReactNode;
    [key: string]: any;
  }
  const DataTable: React.ComponentType<DataTableProps>;
  export default DataTable;
}

declare module '@/components/ui/TabSwitcher' {
  export interface TabItem {
    id: string;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
    Icon?: React.ComponentType<{ className?: string }>;
    badge?: string | number;
    [key: string]: any;
  }
  export interface TabSwitcherProps {
    tabs?: TabItem[];
    activeTab?: string;
    onChange?: (tabId: string) => void;
    onTabChange?: (tabId: string) => void;
    rightContent?: React.ReactNode;
    className?: string;
    [key: string]: any;
  }
  const TabSwitcher: React.ComponentType<TabSwitcherProps>;
  export default TabSwitcher;
}

declare module '@/components/ui/PageHeader' {
  export interface PageHeaderProps {
    icon?: React.ComponentType<{ className?: string }>;
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    badge?: React.ReactNode;
    actions?: React.ReactNode;
    breadcrumbs?: any[];
    children?: React.ReactNode;
    className?: string;
    [key: string]: any;
  }
  const PageHeader: React.ComponentType<PageHeaderProps>;
  export default PageHeader;
}

declare module '@/components/ui/ActionMenu' {
  export interface ActionMenuItem {
    label?: string;
    icon?: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
    divider?: boolean;
    disabled?: boolean;
    variant?: 'default' | 'danger' | 'warning' | string;
    [key: string]: any;
  }
  export interface ActionMenuProps {
    items?: ActionMenuItem[];
    actions?: ActionMenuItem[];
    align?: 'left' | 'right';
    buttonClassName?: string;
    menuClassName?: string;
    icon?: React.ComponentType<{ className?: string }>;
    label?: React.ReactNode;
    disabled?: boolean;
    size?: 'xs' | 'sm' | 'md' | string;
    variant?: 'default' | 'sub' | 'surface' | string;
    showChevron?: boolean;
    ariaLabel?: string;
    header?: React.ReactNode;
    [key: string]: any;
  }
  const ActionMenu: React.ComponentType<ActionMenuProps>;
  export default ActionMenu;
}

declare module '@/components/ui/DataCardGrid' {
  export interface DataCardGridProps<T = any> {
    data?: T[];
    items?: T[];
    renderCard?: (item: T, idx?: number) => React.ReactNode;
    keyExtractor?: (item: T, idx?: number) => string | number;
    isLoading?: boolean;
    loading?: boolean;
    loadingMessage?: string;
    emptyTitle?: string;
    emptySubMessage?: string;
    emptyMessage?: string;
    emptyIcon?: React.ComponentType<{ className?: string }>;
    gridClassName?: string;
    wrapperClassName?: string;
    [key: string]: any;
  }
  const DataCardGrid: React.ComponentType<DataCardGridProps>;
  export default DataCardGrid;
}

declare module '@/components/layout/PageContainer' {
  export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode;
    header?: React.ReactNode;
    maxWidth?: 'full' | '7xl' | '6xl' | '5xl' | '4xl' | '3xl' | '2xl' | 'xl' | 'lg' | 'md' | 'sm' | string;
    isEmbedded?: boolean;
    isFullscreen?: boolean;
    animate?: boolean;
    className?: string;
    [key: string]: any;
  }
  const PageContainer: React.ComponentType<PageContainerProps>;
  export default PageContainer;
}


declare module '@/components/layout' {
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
  export const DrawerContainer: React.ComponentType<DrawerContainerProps> & {
    Banner: React.ComponentType<DrawerBannerProps>;
    Section: React.ComponentType<DrawerSectionProps>;
    Footer: React.ComponentType<DrawerFooterProps>;
  };
  export const DrawerBanner: React.ComponentType<DrawerBannerProps>;
  export const DrawerSection: React.ComponentType<DrawerSectionProps>;
  export const DrawerFooter: React.ComponentType<DrawerFooterProps>;
  export const PageContainer: React.ComponentType<any>;
  export const RightSidebarContainer: React.ComponentType<DrawerContainerProps>;
}

declare module '@/context/RightSidebarContext' {
  export interface RightSidebarConfig {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    category?: string;
    content?: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | string;
    width?: number | string;
    onClose?: () => void;
    ownerId?: string | null;
    drawerKey?: string | null;
    [key: string]: any;
  }
  export interface RightSidebarContextValue {
    isRightSidebarOpen: boolean;
    rightSidebarConfig: RightSidebarConfig | null;
    drawerWidth: number;
    setDrawerWidth: (width: number | ((prev: number) => number)) => void;
    openRightSidebar: (config: RightSidebarConfig) => void;
    closeRightSidebar: (skipUrlClean?: boolean) => void;
    openDrawer: (drawerKeyOrConfig: string | RightSidebarConfig, queryParams?: Record<string, any>) => void;
    closeDrawer: () => void;
  }
  export function RightSidebarProvider(props: { children: React.ReactNode }): React.ReactElement;
  export function useRightSidebar(): RightSidebarContextValue;
  export function useScopedRightSidebar(): RightSidebarContextValue;
  export function useDrawerRegistration(
    drawerKey: string,
    rendererFn: (params: URLSearchParams) => RightSidebarConfig | null,
    dependencies?: any[]
  ): void;
}

declare module '@/components/common/DeleteImpactModal' {
  export interface DeleteImpactModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm?: () => Promise<void> | void;
    onDirectDelete?: () => Promise<void> | void;
    title?: string;
    subtitle?: string;
    entityName?: string;
    itemName?: string;
    entityType?: string;
    itemType?: string;
    impactItems?: any[];
    impactData?: any;
    warningMessage?: string;
    requireAck?: boolean;
    requireNameMatch?: boolean;
    requirePassword?: boolean;
    confirmButtonText?: string;
    isDeleting?: boolean;
    onMigrate?: () => void;
    onMigrateOpen?: () => void;
    migrateButtonText?: string;
    [key: string]: any;
  }
  const DeleteImpactModal: React.ComponentType<DeleteImpactModalProps>;
  export default DeleteImpactModal;
}



