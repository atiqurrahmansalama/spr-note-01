/**
 * BreakResolver
 * Evaluates explicit and computed breakBefore / breakAfter conditions for document nodes.
 */

import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';
import { PaginationRules, BreakValue } from './PaginationRules';
import { isExplicitManualBreak } from '../logicalDocument';

export interface BreakEvaluationResult {
  shouldBreakBefore: boolean;
  shouldBreakAfter: boolean;
  isManualBreak: boolean;
  reason?: string;
}

export class BreakResolver {
  /**
   * Evaluates break conditions for a node relative to current page placement
   */
  public static evaluateBreaks(
    node: HTMLElement | SourceNode | BlockNode | any,
    currentPageUsedHeight: number
  ): BreakEvaluationResult {
    const rules = PaginationRules.extractRules(node);
    const isManual = isExplicitManualBreak(node as any);

    // 1. Break Before: 'always' or 'page'
    let shouldBreakBefore = false;
    if (rules.breakBefore === 'always' || rules.breakBefore === 'page') {
      // Only break if we are not already at the top of an empty page
      if (currentPageUsedHeight > 0) {
        shouldBreakBefore = true;
      }
    }

    // 2. Break After: 'always' or 'page' or manual break element
    let shouldBreakAfter = false;
    if (isManual || rules.breakAfter === 'always' || rules.breakAfter === 'page') {
      shouldBreakAfter = true;
    }

    return {
      shouldBreakBefore,
      shouldBreakAfter,
      isManualBreak: isManual,
      reason: isManual
        ? 'Manual page break'
        : shouldBreakBefore
        ? 'break-before: always'
        : shouldBreakAfter
        ? 'break-after: always'
        : undefined,
    };
  }
}
