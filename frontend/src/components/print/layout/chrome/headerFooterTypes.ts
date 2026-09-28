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

  /** Fixed or measured height reserved for header (e.g. 60px) */
  headerHeightPx?: number;

  /** Fixed or measured height reserved for footer (e.g. 40px) */
  footerHeightPx?: number;

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
