/**
 * Header & Footer Architecture Types for DocLab Layout
 * Defines runtime template variables, reserved zones, header/footer,
 * watermark, and signature block configurations.
 */

export interface RuntimeLayoutVariables {
  /** 1-based page number (e.g. 3) */
  pageNumber: number;

  /** 0-based page index (e.g. 2) */
  pageIndex: number;

  /** Total pages in layout result (e.g. 12) */
  totalPages: number;

  /** Whether this is the first page of the document */
  isFirstPage?: boolean;

  /** Whether this is the first page of the active section */
  isSectionFirstPage?: boolean;

  /** Page number numeral format */
  pageNumberFormat?: 'decimal' | 'roman-upper' | 'roman-lower' | 'bengali' | 'arabic';

  /** Formatted page number based on active format */
  pageNumberFormatted?: string;

  /** Formatted total pages based on active format */
  totalPagesFormatted?: string;

  /** Roman uppercase formatted page number (e.g. III) */
  pageNumberRomanUpper?: string;

  /** Roman lowercase formatted page number (e.g. iii) */
  pageNumberRomanLower?: string;

  /** Roman uppercase formatted total pages (e.g. XII) */
  totalPagesRomanUpper?: string;

  /** Roman lowercase formatted total pages (e.g. xii) */
  totalPagesRomanLower?: string;

  /** Bengali formatted page number (e.g. ৩) */
  pageNumberBengali?: string;

  /** Bengali formatted total pages (e.g. ১২) */
  totalPagesBengali?: string;

  /** Arabic/Urdu formatted page number (e.g. ٣) */
  pageNumberArabic?: string;

  /** Arabic/Urdu formatted total pages (e.g. ١٢) */
  totalPagesArabic?: string;

  /** Section identifier */
  sectionId?: string;

  /** 0-based section index */
  sectionIndex?: number;

  /** 1-based section number */
  sectionNumber?: number;

  /** Section title */
  sectionTitle?: string;

  /** 1-based page number within active section */
  sectionPageNumber?: number;

  /** Total pages within active section */
  sectionTotalPages?: number;

  /** Formatted section page number based on active section format */
  sectionPageNumberFormatted?: string;

  /** Formatted section total pages based on active section format */
  sectionTotalPagesFormatted?: string;

  /** Section Bengali formatted page number */
  sectionPageNumberBengali?: string;

  /** Section Bengali formatted total pages */
  sectionTotalPagesBengali?: string;

  /** Section Arabic formatted page number */
  sectionPageNumberArabic?: string;

  /** Section Arabic formatted total pages */
  sectionTotalPagesArabic?: string;

  /** Section Roman uppercase formatted page number */
  sectionPageNumberRomanUpper?: string;

  /** Section Roman lowercase formatted page number */
  sectionPageNumberRomanLower?: string;

  /** Section Roman uppercase formatted total pages */
  sectionTotalPagesRomanUpper?: string;

  /** Section Roman lowercase formatted total pages */
  sectionTotalPagesRomanLower?: string;

  /** Document title */
  documentTitle: string;

  /** Document subtitle */
  documentSubtitle?: string;

  /** Institutional branding name */
  institutionName: string;

  /** Institutional campus address */
  institutionAddress?: string;

  /** Print timestamp formatted date (e.g. 28 Sep 2026) */
  currentDate: string;

  /** Print timestamp formatted time (e.g. 01:52 AM) */
  currentTime: string;

  /** Custom metadata key-value pairs */
  meta?: Record<string, any>;
}

export interface HeaderFooterConfig {
  /** Custom raw HTML template for header */
  headerHtml?: string;

  /** Custom raw HTML template for footer */
  footerHtml?: string;

  /** Custom raw HTML template for first page header (when differentFirstPage is true) */
  firstPageHeaderHtml?: string;

  /** Custom raw HTML template for first page footer (when differentFirstPage is true) */
  firstPageFooterHtml?: string;

  /** Whether to use a different header/footer on the first page of document/section */
  differentFirstPage?: boolean;

  /** Fixed or measured height reserved for header (e.g. 60px) */
  headerHeightPx?: number;

  /** Fixed or measured height reserved for footer (e.g. 40px) */
  footerHeightPx?: number;

  /** Header distance from top of paper sheet (in mm) */
  headerDistanceMm?: number;

  /** Footer distance from bottom of paper sheet (in mm) */
  footerDistanceMm?: number;

  /** Whether branding header renders on page 1 (default: true) */
  showFirstPageHeader?: boolean;

  /** Whether header renders on subsequent pages (default: false or continuation) */
  showSubsequentPageHeaders?: boolean;

  /** Whether footer renders on page 1 (default: true) */
  showFirstPageFooter?: boolean;

  /** Whether footer renders on subsequent pages (default: true) */
  showSubsequentPageFooters?: boolean;

  /** Whether continuation title bar appears on pages 2+ */
  showContinuationSubheader?: boolean;

  /** Custom running header text (supports tokens) */
  runningHeaderText?: string;

  /** Custom running footer text (supports tokens) */
  runningFooterText?: string;

  /** Custom running header text for first page */
  firstPageRunningHeaderText?: string;

  /** Custom running footer text for first page */
  firstPageRunningFooterText?: string;

  /** Page number format */
  pageNumberFormat?: 'decimal' | 'roman-upper' | 'roman-lower' | 'bengali' | 'arabic';

  /** Numeral system for standard footer rendering */
  numeralSystem?: 'latin' | 'bengali' | 'arabic' | 'roman-upper' | 'roman-lower';

  /** Whether signature lines appear exclusively on final page */
  signaturesOnLastPageOnly?: boolean;
}

export interface WatermarkConfig {
  /** Watermark text (e.g. "CONFIDENTIAL", "DRAFT", "SAMPLE", "নমুনা") */
  text?: string;

  /** Watermark opacity (0.0 to 1.0, default: 0.08) */
  opacity?: number;

  /** Watermark text color (default: "#0f172a" / slate-900) */
  color?: string;

  /** Rotation angle in degrees (default: -45) */
  rotationAngle?: number;

  /** Font size in pixels (default: 56) */
  fontSizePx?: number;

  /** Optional watermark image URL */
  imageUrl?: string;

  /** Watermark visibility */
  enabled?: boolean;
}

export interface SignatureColumnConfig {
  id: string;
  label: string;
  role?: string;
  name?: string;
  dateRequired?: boolean;
  signatureImage?: string;
}

export interface SignatureBlockConfig {
  /** Array of signature slots (e.g. Prepared By, Checked By, Approved By) */
  columns: SignatureColumnConfig[];

  /** Reserved height in pixels (default: 80px) */
  heightPx?: number;

  /** Whether to render exclusively on the last page of document/section */
  lastPageOnly?: boolean;

  /** Border style for signature line */
  lineStyle?: 'SOLID' | 'DASHED' | 'DOTTED';

  /** Custom title for signature block */
  title?: string;
}
