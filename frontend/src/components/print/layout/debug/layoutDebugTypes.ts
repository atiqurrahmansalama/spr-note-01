/**
 * DocLab Internal Layout Debug Mode Types
 * Encapsulates real-time measurement, available height, overflow, and pagination decisions.
 */

export type LayoutDebugDecisionType =
  | 'PLACE'
  | 'FRAGMENT'
  | 'MOVE_TO_NEXT_PAGE'
  | 'REPEAT_HEADER'
  | 'KEEP_WITH_NEXT_PUSH'
  | 'KEEP_TOGETHER_PUSH'
  | 'MANUAL_BREAK';

export type LayoutBreakType =
  | 'NONE'
  | 'AUTOMATIC'
  | 'MANUAL'
  | 'KEEP_WITH_NEXT'
  | 'KEEP_TOGETHER';

export interface LayoutDebugDecision {
  id: string;
  timestamp: number;
  pageIndex: number;
  pageNumber: number;
  blockId: string;
  nodeType: string;
  measuredHeightPx: number;
  availableHeightPx: number;
  overflowHeightPx: number;
  fragmentRange?: string; // e.g. "lines 1–7", "rows 1–16", "Row 17"
  breakType: LayoutBreakType;
  decision: LayoutDebugDecisionType;
  tableName?: string;
  rowIndex?: number;
  tag?: string;
  notes?: string;
}

export interface PageDebugFragmentInfo {
  id: string;
  sourceNodeId: string;
  type: string;
  name: string; // e.g. "paragraph-12", "paragraph-14", "table-3"
  heightPx: number;
  pageIndex: number;
  pageNumber: number;
  fragmentIndex?: number; // e.g. 1, 2 (if fragmented)
  totalFragments?: number;
  fragmentLabel?: string; // e.g. "fragment 1", "fragment 2", "lines 1–7", "rows 1–16"
}

export interface PageDebugMetrics {
  pageIndex: number;
  pageNumber: number;
  physicalWidthPx: number;
  physicalHeightPx: number;
  paperHeightPx?: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  contentAreaWidthPx: number;
  contentAreaHeightPx: number;
  headerHeightPx?: number;
  footerHeightPx?: number;
  usedHeightPx: number;
  remainingHeightPx: number;
  fragmentsCount: number;
  fragments?: PageDebugFragmentInfo[];
  decisions: LayoutDebugDecision[];
}

export interface LayoutDebugTrace {
  documentId: string;
  calculatedAt: number;
  totalDurationMs: number;
  totalPages: number;
  pages: Record<number, PageDebugMetrics>;
  allDecisions: LayoutDebugDecision[];
}
