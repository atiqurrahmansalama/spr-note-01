import React, { useMemo } from 'react';
import ActionMenu from '../ui/ActionMenu';
import { useToast } from '../../context/ToastContext';
import {
  DownloadIcon,
  PrinterIcon,
  FileIcon,
  FileTextIcon,
  ImageIcon,
  SvgIcon,
} from '../ui/Icons';
import {
  printDocument,
  exportToPDF,
  exportToExcel,
  exportToPlainText,
  exportToWord,
  exportToImage,
  exportToSVG,
} from './docLabExportUtils';
import { PrintColumn, PrintMetaItem, PrintOptions, PrintSummaryMetric } from './types';

export interface DocLabExportMenuProps {
  title?: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  summaryMetrics?: PrintSummaryMetric[];
  options?: Partial<PrintOptions>;
  columns?: PrintColumn[];
  visibleColumnKeys?: string[];
  extraBlankRows?: number | string;
  data?: Array<Record<string, any>>;
  showPrint?: boolean;
  showPDF?: boolean;
  showExcel?: boolean;
  showTxt?: boolean;
  showWord?: boolean;
  showImages?: boolean;
  showPng?: boolean;
  showJpg?: boolean;
  showSvg?: boolean;
  enabledFormats?: string[] | null;
  onPrint?: (() => void) | null;
  onExportPDF?: (() => void) | null;
  onExportExcel?: (() => void) | null;
  onExportCsv?: (() => void) | null;
  onExportTxt?: (() => void) | null;
  onExportWord?: (() => void) | null;
  onExportPng?: (() => void) | null;
  onExportJpg?: (() => void) | null;
  onExportSvg?: (() => void) | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  showChevron?: boolean;
  className?: string;
}

/**
 * DocLabExportMenu
 * Master Universal Export Dropdown for DocLab Studio.
 * Fully switchable format support (Print, PDF, Excel, Text, Word, PNG, JPG).
 */
export const DocLabExportMenu: React.FC<DocLabExportMenuProps> = ({
  title = 'Official Document',
  subtitle = '',
  metaItems = [],
  summaryMetrics = [],
  options = {},
  columns = [],
  visibleColumnKeys = [],
  extraBlankRows = 0,
  data = [],
  showPrint = true,
  showPDF = true,
  showExcel = true,
  showTxt = true,
  showWord = true,
  showImages = true,
  showPng = true,
  showJpg = true,
  showSvg = true,
  enabledFormats = null,
  onPrint,
  onExportPDF,
  onExportExcel,
  onExportCsv,
  onExportTxt,
  onExportWord,
  onExportPng,
  onExportJpg,
  onExportSvg,
  size = 'sm',
  variant = 'primary',
  showChevron = true,
  className = '',
}) => {
  const { showToast } = useToast();

  const isFormatEnabled = (formatKey: string) => {
    if (Array.isArray(enabledFormats)) {
      return enabledFormats.includes(formatKey);
    }
    switch (formatKey) {
      case 'print':
        return options.showPrint !== false && showPrint !== false;
      case 'pdf':
        return options.showPDF !== false && showPDF !== false;
      case 'excel':
      case 'csv':
        return options.showExcel !== false && showExcel !== false;
      case 'txt':
        return options.showTxt !== false && showTxt !== false;
      case 'word':
      case 'doc':
        return options.showWord !== false && showWord !== false;
      case 'png':
        return options.showImages !== false && showImages !== false && options.showPng !== false && showPng !== false;
      case 'jpg':
      case 'jpeg':
        return options.showImages !== false && showImages !== false && options.showJpg !== false && showJpg !== false;
      case 'svg':
        return showSvg !== false;
      default:
        return true;
    }
  };

  const isPrintActive = isFormatEnabled('print');
  const isPdfActive = isFormatEnabled('pdf');
  const isExcelActive = isFormatEnabled('excel');
  const isTxtActive = isFormatEnabled('txt');
  const isWordActive = isFormatEnabled('word');
  const isPngActive = isFormatEnabled('png');
  const isJpgActive = isFormatEnabled('jpg');
  const isSvgActive = isFormatEnabled('svg');

  const exportMenuItems = useMemo(() => {
    const items: any[] = [];

    // Group 1: Print & PDF
    if (isPrintActive) {
      items.push({
        id: 'print',
        label: 'Print Document',
        icon: PrinterIcon,
        badge: 'Ctrl+P',
        onClick: () => (onPrint ? onPrint() : printDocument(options as any)),
        title: 'System printer & dialog',
      });
    }

    if (isPdfActive) {
      items.push({
        id: 'pdf',
        label: 'PDF Document',
        icon: FileTextIcon,
        badge: '.pdf',
        onClick: () =>
          exportToPDF({
            title,
            subtitle,
            metaItems,
            summaryMetrics,
            options,
            columns,
            visibleColumnKeys,
            extraBlankRows,
            data,
            orientation: options.orientation,
            pageSize: options.pageSize,
            margin: options.margin,
            showToast,
            onCustomExport: onExportPDF,
          }),
        title: '1-Click Vector .pdf',
      });
    }

    // Group 2: Tabular & Text Data
    const hasGroup2 = isExcelActive || isTxtActive || isWordActive;
    if (items.length > 0 && hasGroup2) {
      items.push({ divider: true });
    }

    if (isExcelActive) {
      items.push({
        id: 'excel',
        label: 'Excel Spreadsheet',
        icon: FileIcon,
        badge: '.csv',
        onClick: () =>
          exportToExcel({
            columns,
            visibleColumnKeys,
            data,
            summaryMetrics,
            metaItems,
            subtitle,
            title,
            showToast,
            onCustomExport: onExportExcel,
            onExportCsv,
          }),
        title: 'Data columns & rows',
      });
    }

    if (isTxtActive) {
      items.push({
        id: 'txt',
        label: 'Plain Text File',
        icon: FileTextIcon,
        badge: '.txt',
        onClick: () =>
          exportToPlainText({
            columns,
            visibleColumnKeys,
            data,
            summaryMetrics,
            metaItems,
            subtitle,
            title,
            showToast,
            onCustomExport: onExportTxt,
          }),
        title: 'Plain text table (.txt)',
      });
    }

    if (isWordActive) {
      items.push({
        id: 'word',
        label: 'Word Document',
        icon: FileTextIcon,
        badge: '.docx',
        onClick: () =>
          exportToWord({
            title,
            subtitle,
            metaItems,
            columns,
            visibleColumnKeys,
            data,
            extraBlankRows,
            summaryMetrics,
            options,
            showToast,
            onCustomExport: onExportWord,
          }),
        title: 'Native Microsoft Word & Google Docs (.docx)',
      });
    }

    // Group 3: Image Exports
    const hasGroup3 = isPngActive || isJpgActive;
    if (items.length > 0 && hasGroup3) {
      items.push({ divider: true });
    }

    if (isPngActive) {
      items.push({
        id: 'png',
        label: 'PNG Image',
        icon: ImageIcon,
        badge: '.png',
        onClick: () =>
          exportToImage({
            title,
            format: 'png',
            showToast,
            onCustomExport: onExportPng,
          }),
        title: 'Lossless crisp image',
      });
    }

    if (isJpgActive) {
      items.push({
        id: 'jpg',
        label: 'JPG Image',
        icon: ImageIcon,
        badge: '.jpg',
        onClick: () =>
          exportToImage({
            title,
            format: 'jpg',
            showToast,
            onCustomExport: onExportJpg,
          }),
        title: 'Standard compressed image',
      });
    }

    if (isSvgActive) {
      items.push({
        id: 'svg',
        label: 'SVG Vector File',
        icon: SvgIcon,
        badge: '.svg',
        onClick: () =>
          exportToSVG({
            title,
            showToast,
            onCustomExport: onExportSvg,
          }),
        title: 'Pure standalone SVG vector document',
      });
    }

    return items;
  }, [
    isPrintActive,
    isPdfActive,
    isExcelActive,
    isTxtActive,
    isWordActive,
    isPngActive,
    isJpgActive,
    isSvgActive,
    title,
    subtitle,
    metaItems,
    summaryMetrics,
    options,
    showToast,
    onPrint,
    onExportPDF,
    columns,
    visibleColumnKeys,
    data,
    extraBlankRows,
    onExportExcel,
    onExportCsv,
    onExportTxt,
    onExportWord,
    onExportPng,
    onExportJpg,
    onExportSvg,
  ]);

  return (
    <ActionMenu
      label="Export"
      icon={DownloadIcon}
      items={exportMenuItems}
      size={size}
      variant={variant}
      align="right"
      showChevron={showChevron}
      header="Export & Print"
      menuClassName="w-60 shadow-2xl"
      buttonClassName={`font-bold ${className}`}
      ariaLabel="Export & Print Options"
    />
  );
};

export default DocLabExportMenu;
