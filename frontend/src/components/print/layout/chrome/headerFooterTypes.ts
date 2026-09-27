/**
 * Header & Footer Architecture Types for DocLab Layout
 * Defines runtime template variables, reserved zones, and header/footer configurations.
 */

export interface RuntimeLayoutVariables {
  /** 1-based page number (e.g. 3) */
  pageNumber: number;

  /** 0-based page index (e.g. 2) */
  pageIndex: number;

  /** Total pages in layout result (e.g. 12) */
  totalPages: number;

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

  /** Fixed or measured height reserved for header */
  headerHeightPx?: number;

  /** Fixed or measured height reserved for footer */
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

  /** Whether signature lines appear exclusively on final page */
  signaturesOnLastPageOnly?: boolean;
}
