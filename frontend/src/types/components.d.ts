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

declare module '@/components/ui/CustomSelect' {
  export interface Option {
    value?: string | number;
    label?: string;
    [key: string]: any;
  }
  export interface CustomSelectProps {
    label?: React.ReactNode;
    value?: any;
    onChange?: (value: any) => void;
    options?: Option[] | any[];
    placeholder?: string;
    error?: string;
    required?: boolean;
    searchable?: boolean;
    disabled?: boolean;
    direction?: 'top' | 'bottom' | 'up' | 'down' | 'auto';
    icon?: React.ComponentType<{ className?: string }>;
    size?: 'sm' | 'md' | 'lg' | string;
    compactMode?: boolean;
    showDescription?: boolean;
    showBadge?: boolean;
    multiple?: boolean;
    isMulti?: boolean;
    className?: string;
    [key: string]: any;
  }
  const CustomSelect: React.ComponentType<CustomSelectProps>;
  export default CustomSelect;
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

declare module '@/components/ui/MetricsGrid' {
  export interface MetricItem {
    id?: string;
    label?: string;
    value?: string | number;
    subLabel?: string;
    icon?: React.ComponentType<{ className?: string }>;
    color?: 'accent' | 'default' | 'danger' | 'warning' | 'success' | string;
    badge?: string;
    onClick?: () => void;
    className?: string;
    [key: string]: any;
  }
  export interface MetricsGridProps {
    items?: MetricItem[];
    cols?: number;
    className?: string;
    [key: string]: any;
  }
  export function MetricCard(props: any): React.ReactElement;
  const MetricsGrid: React.ComponentType<MetricsGridProps>;
  export default MetricsGrid;
}

declare module '@/components/print/UniversalPrintModal' {
  export interface UniversalPrintModalProps {
    isOpen?: boolean;
    onClose?: () => void;
    title?: string;
    subtitle?: string;
    metaItems?: { label: string; value: string }[];
    columns?: any[];
    data?: any[];
    footerRow?: Record<string, any> | null;
    summaryMetrics?: { label: string; value: string | number }[];
    defaultOptions?: any;
    urlSync?: boolean;
    urlParam?: string;
    urlParamValue?: string;
    children?: React.ReactNode;
    templates?: any[];
    activeTemplateId?: string | number | null;
    onTemplateChange?: (id: any) => void;
    showSectionsAndBars?: boolean;
    showSectionsBar?: boolean;
    showDisplayBars?: boolean;
    showDataDisplay?: boolean;
    showColumns?: boolean;
    showHeaderSection?: boolean;
    showWatermarkSection?: boolean;
    showSignaturesSection?: boolean;
    showPrint?: boolean;
    showPDF?: boolean;
    showExcel?: boolean;
    showTxt?: boolean;
    showWord?: boolean;
    showImages?: boolean;
    showPng?: boolean;
    showJpg?: boolean;
    onPrint?: () => void;
    onExportPDF?: () => void;
    onExportExcel?: () => void;
    onExportCsv?: () => void;
    onExportTxt?: () => void;
    onExportWord?: () => void;
    onExportPng?: () => void;
    onExportJpg?: () => void;
    [key: string]: any;
  }
  const UniversalPrintModal: React.ComponentType<UniversalPrintModalProps>;
  export default UniversalPrintModal;
}

declare module '@/components/common/QrCodeBadge' {
  export interface QrCodeBadgeProps {
    verificationUrl?: string;
    reportId?: string;
    size?: number;
    showLabel?: boolean;
    [key: string]: any;
  }
  const QrCodeBadge: React.ComponentType<QrCodeBadgeProps>;
  export default QrCodeBadge;
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
