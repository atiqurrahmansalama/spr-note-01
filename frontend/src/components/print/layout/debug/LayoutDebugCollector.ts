/**
 * LayoutDebugCollector
 * Singleton collector capturing runtime measurement and layout pagination decisions.
 */

import {
  LayoutDebugDecision,
  LayoutDebugTrace,
  PageDebugMetrics,
  LayoutDebugDecisionType,
  LayoutBreakType,
} from './layoutDebugTypes';

export class LayoutDebugCollector {
  private static isGlobalDebugEnabled = false;
  private currentTrace: LayoutDebugTrace | null = null;

  public static setEnabled(enabled: boolean): void {
    this.isGlobalDebugEnabled = enabled;
  }

  public static isEnabled(): boolean {
    return this.isGlobalDebugEnabled;
  }

  public startSession(documentId: string = 'doc_debug'): void {
    this.currentTrace = {
      documentId,
      calculatedAt: Date.now(),
      totalDurationMs: 0,
      totalPages: 1,
      pages: {},
      allDecisions: [],
    };
  }

  public registerPageMetrics(metrics: Omit<PageDebugMetrics, 'decisions'>): void {
    if (!this.currentTrace) return;
    if (!this.currentTrace.pages[metrics.pageIndex]) {
      this.currentTrace.pages[metrics.pageIndex] = {
        ...metrics,
        decisions: [],
      };
    } else {
      this.currentTrace.pages[metrics.pageIndex] = {
        ...this.currentTrace.pages[metrics.pageIndex],
        ...metrics,
      };
    }
  }

  public recordDecision(params: {
    pageIndex: number;
    blockId: string;
    nodeType: string;
    measuredHeightPx: number;
    availableHeightPx: number;
    overflowHeightPx?: number;
    fragmentRange?: string;
    breakType?: LayoutBreakType;
    decision: LayoutDebugDecisionType;
    tableName?: string;
    rowIndex?: number;
    tag?: string;
    notes?: string;
  }): void {
    if (!this.currentTrace) return;

    const overflow = params.overflowHeightPx !== undefined
      ? params.overflowHeightPx
      : Math.max(0, Math.round((params.measuredHeightPx - params.availableHeightPx) * 100) / 100);

    const decision: LayoutDebugDecision = {
      id: `decision_${this.currentTrace.allDecisions.length + 1}`,
      timestamp: Date.now(),
      pageIndex: params.pageIndex,
      pageNumber: params.pageIndex + 1,
      blockId: params.blockId,
      nodeType: params.nodeType,
      measuredHeightPx: Math.round(params.measuredHeightPx * 100) / 100,
      availableHeightPx: Math.round(params.availableHeightPx * 100) / 100,
      overflowHeightPx: overflow,
      fragmentRange: params.fragmentRange,
      breakType: params.breakType || (overflow > 0 ? 'AUTOMATIC' : 'NONE'),
      decision: params.decision,
      tableName: params.tableName,
      rowIndex: params.rowIndex,
      tag: params.tag,
      notes: params.notes,
    };

    this.currentTrace.allDecisions.push(decision);

    if (this.currentTrace.pages[params.pageIndex]) {
      this.currentTrace.pages[params.pageIndex].decisions.push(decision);
    }
  }

  public finalize(totalPages: number, durationMs: number): LayoutDebugTrace | null {
    if (!this.currentTrace) return null;
    this.currentTrace.totalPages = totalPages;
    this.currentTrace.totalDurationMs = Math.round(durationMs * 100) / 100;
    const final = this.currentTrace;
    this.currentTrace = null;
    return final;
  }
}
