import React from 'react';
import { CustomDocxTemplate, DocxTemplateType } from './docxTemplateEngine';
import { KeyTaxonomyItem, DocumentScopeId } from './keyLibrary/types';

export type PrintPageSize = 'A4' | 'LEGAL' | 'LETTER' | 'ID_CARD' | 'CUSTOM';
export type PrintOrientation = 'PORTRAIT' | 'LANDSCAPE';
export type PrintMargin = 'NONE' | 'TIGHT' | 'NORMAL' | 'WIDE' | 'CUSTOM';
export type PrintDensity = 'COMPACT' | 'NORMAL' | 'SPACIOUS';
export type PrintColorMode = 'FULL_COLOR' | 'GRAYSCALE' | 'MONOCHROME' | 'HIGH_CONTRAST';

export interface SignatureLineConfig {
  id: string;
  label: string;
  sub?: string;
  placeholder?: string;
  align?: 'left' | 'center' | 'right';
  enabled?: boolean;
}

export interface PrintOptions {
  pageSize?: PrintPageSize;
  orientation?: PrintOrientation;
  margin?: PrintMargin;
  density?: PrintDensity;
  colorMode?: PrintColorMode;
  showHeader?: boolean;
  showLogo?: boolean;
  showTitle?: boolean;
  showTitleLine?: boolean;
  titleLineStyle?: string;
  showMeta?: boolean;
  showMetaBox?: boolean;
  metaFontSize?: string;
  metaCols?: number;
  metaGridTemplate?: string;
  showSummary?: boolean;
  showFooter?: boolean;
  showWatermark?: boolean;
  watermarkText?: string;
  showSignatures?: boolean;
  signatureStyle?: string;
  signatureLines?: SignatureLineConfig[];
  customTitle?: string;
  customSubtitle?: string;
  customInstitutionName?: string;
  customInstitutionAddress?: string;
  customAddress?: string;
  enablePageBreak?: boolean;
  [key: string]: any;
}

export interface PrintMetaItem {
  label: string;
  value: React.ReactNode;
  colSpan?: number;
  [key: string]: any;
}

export interface PrintSummaryMetric {
  id?: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  highlight?: boolean;
  [key: string]: any;
}

export interface PrintColumn {
  id?: string;
  key?: string;
  accessor?: string;
  dataIndex?: string;
  header?: string;
  label?: string;
  title?: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  colSpan?: number;
  [key: string]: any;
}

export interface PrintBatchDocument {
  id?: string | number;
  title?: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  columns?: PrintColumn[];
  data?: Array<Record<string, any>>;
  footerRow?: any;
  footerRows?: any[];
  summaryMetrics?: PrintSummaryMetric[];
  content?: React.ReactNode;
  [key: string]: any;
}

export interface UniversalPrintStudioProps {
  isOpen?: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  // Tabular Data Mode
  columns?: PrintColumn[];
  data?: Array<Record<string, any>>;
  summaryMetrics?: PrintSummaryMetric[];
  footerRow?: any;
  footerRows?: any[];
  // Multi-Document / Batch Mode
  documents?: PrintBatchDocument[];
  batchDocuments?: PrintBatchDocument[];
  isColumnMandatory?: (col: PrintColumn, index: number) => boolean;
  isColumnRequired?: (col: PrintColumn, index: number) => boolean;
  requiredColumnKeys?: string[];
  // Row Customization Controls
  visibleRowKeys?: string[] | null;
  onVisibleRowsChange?: (rowKeys: string[]) => void;
  isRowMandatory?: (row: any, index: number) => boolean;
  isRowRequired?: (row: any, index: number) => boolean;
  requiredRowKeys?: string[];
  getRowKey?: (row: any, index: number) => string;
  rowKey?: string | null;
  getRowLabel?: (row: any) => string;
  getRowSubLabel?: (row: any) => string;
  showRows?: boolean;
  // Rich Custom Content Mode
  children?: React.ReactNode;
  customSheets?: boolean;
  // Initial default options override
  defaultOptions?: Partial<PrintOptions>;
  // Pre-configured templates list
  templates?: any[];
  activeTemplateId?: string | null;
  onTemplateChange?: (templateId: any) => void;
  // Template Placeholder keys for Word (.docx) dynamic merge
  placeholderKeys?: KeyTaxonomyItem[] | any[];
  // Section Visibility Switches & Controls
  showSectionsAndBars?: boolean;
  showSectionsBar?: boolean;
  showDisplayBars?: boolean;
  showDataDisplay?: boolean;
  showColumns?: boolean;
  showHeaderSection?: boolean;
  showWatermarkSection?: boolean;
  showSignaturesSection?: boolean;
  // Format Visibility Switches & Filters
  showPrint?: boolean;
  showPDF?: boolean;
  showExcel?: boolean;
  showTxt?: boolean;
  showWord?: boolean;
  showImages?: boolean;
  showPng?: boolean;
  showJpg?: boolean;
  enabledFormats?: string[] | null;
  // Custom action triggers
  onPrint?: () => void;
  onExportPDF?: () => void;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onExportTxt?: () => void;
  onExportWord?: () => void;
  onExportPng?: () => void;
  onExportJpg?: () => void;
  // Document Scope & Taxonomy Integration
  scopeId?: DocumentScopeId | string;
  scopeName?: string;
  scopeDescription?: string;
  requiredKeys?: string[];
  // URL Deep-Linking & History Sync
  urlSync?: boolean;
  urlParam?: string;
  urlParamValue?: string | null;
}

export interface PrintPaginationPage {
  pageIndex: number;
  rows: Array<Record<string, any>>;
  extraBlanks: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  startIndex: number;
}

export interface PrintPaginationResult {
  pages: PrintPaginationPage[];
  totalPages: number;
}

export interface PrintHistorySnapshot {
  options: PrintOptions;
  visibleColumnKeys: string[];
  visibleRowKeys: string[];
  extraBlankRows: number;
  liveData: Array<Record<string, any>>;
  liveColumns: PrintColumn[];
  liveMetaItems: PrintMetaItem[];
  liveSummaryMetrics: PrintSummaryMetric[];
}
