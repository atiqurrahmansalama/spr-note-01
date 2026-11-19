/**
 * PaginationRuleEngine
 * Master formal pagination rules and constraint decision engine for DocLab.
 *
 * Implements an explicit deterministic rule precedence hierarchy:
 * 1. MANUAL_PAGE_BREAK (Precedence 1)
 * 2. SECTION_TRANSITION (Precedence 2)
 * 3. HARD_KEEP_CONSTRAINTS (Precedence 3) — Signature blocks, atomic blocks, break-inside: avoid
 * 4. RELATIONAL_CONSTRAINTS (Precedence 4) — Heading keep-with-next, figure + caption binding
 * 5. EXPLICIT_BREAK_RULES (Precedence 5) — break-before: always/page, break-after: always/page
 * 6. FRAGMENTATION_RULES (Precedence 6) — Paragraph widow/orphan slicing, table rows, list continuation
 * 7. NORMAL_FLOW_PLACEMENT (Precedence 7) — Natural flow placement
 *
 * Deterministic Conflict Resolution:
 * - Oversized Atomic Block (> Page Height): Emergency slice / fragment at page boundary with diagnostic recorded.
 * - keep-with-next vs break-before: always: Explicit break on next node overrules keep-with-next on current node.
 * - break-after: avoid vs break-before: always: break-before overrules break-after: avoid.
 * - Unsatisfiable Widow/Orphan: Pushes whole block to next page if usedHeight > 0; slices with conflict trace on empty page.
 *
 * Layout Diagnostics:
 * Records nodeId, nodeType, rule, precedence, availableHeight, measuredHeight, decision, reason,
 * hasConflict, conflictDetails, and resolutionStrategy for every layout step.
 */

import { SourceNode } from '../types/documentTypes';
import { BlockNode } from '../../model/types';
import { PaginationRules, PaginationNodeRules } from './PaginationRules';
import { MIN_PARAGRAPH_SPLIT_SPACE_PX, MIN_TABLE_SPLIT_SPACE_PX, MIN_HEADING_FOLLOW_SPACE_PX } from '../fragmentation/fragmentationRules';

export enum PaginationRulePrecedence {
  MANUAL_PAGE_BREAK = 1,
  SECTION_TRANSITION = 2,
  HARD_KEEP_CONSTRAINTS = 3,
  RELATIONAL_CONSTRAINTS = 4,
  EXPLICIT_BREAK_RULES = 5,
  FRAGMENTATION_RULES = 6,
  NORMAL_FLOW_PLACEMENT = 7,
}

export type PaginationRuleType =
  | 'MANUAL_BREAK'
  | 'SECTION_BREAK'
  | 'KEEP_TOGETHER'
  | 'KEEP_WITH_NEXT'
  | 'WIDOW_ORPHAN'
  | 'BREAK_BEFORE'
  | 'BREAK_AFTER'
  | 'TABLE_HEADER_REPEAT'
  | 'FIGURE_CAPTION'
  | 'SIGNATURE_BLOCK'
  | 'NORMAL_FLOW';

export type PaginationAction =
  | 'PLACE'
  | 'MOVE_TO_NEXT_PAGE'
  | 'FRAGMENT'
  | 'MANUAL_BREAK'
  | 'SECTION_BREAK'
  | 'FORCE_PLACE';

export interface RuleEvaluationContext {
  currentNode: HTMLElement | SourceNode | BlockNode | any;
  nextNode?: HTMLElement | SourceNode | BlockNode | any | null;
  previousNode?: HTMLElement | SourceNode | BlockNode | any | null;
  pageIndex: number;
  availableHeight: number;
  usedHeight: number;
  maxPageHeight: number;
  measuredHeight: number;
  isAtomic?: boolean;
  nodeId?: string;
  nodeType?: string;
  minOrphanLines?: number;
  minWidowLines?: number;
}

export interface PaginationRuleDecision {
  nodeId: string;
  nodeType: string;
  rule: PaginationRuleType;
  precedence: PaginationRulePrecedence;
  availableHeight: number;
  measuredHeight: number;
  decision: PaginationAction;
  reason: string;
  hasConflict: boolean;
  conflictDetails?: string;
  resolutionStrategy?: string;
  pageIndex?: number;
  metadata?: Record<string, any>;
}

export interface PaginationRuleDiagnosticsReport {
  totalDecisions: number;
  conflictCount: number;
  decisions: PaginationRuleDecision[];
  conflicts: PaginationRuleDecision[];
  ruleFrequency: Record<PaginationRuleType, number>;
  decisionFrequency: Record<PaginationAction, number>;
}

export class PaginationRuleEngine {
  private decisions: PaginationRuleDecision[] = [];
  private conflicts: PaginationRuleDecision[] = [];

  /**
   * Primary method: Evaluates placement of a node against all pagination rules and precedence tiers.
   */
  public evaluatePlacement(context: RuleEvaluationContext): PaginationRuleDecision {
    const {
      currentNode,
      nextNode,
      pageIndex,
      availableHeight,
      usedHeight,
      maxPageHeight,
      measuredHeight,
    } = context;

    const rules = PaginationRules.extractRules(currentNode);
    const nextRules = nextNode ? PaginationRules.extractRules(nextNode) : null;

    const nodeId =
      context.nodeId ||
      ('id' in currentNode && typeof currentNode.id === 'string' ? currentNode.id : 'node_' + Math.random().toString(36).substr(2, 6));

    let nodeType = context.nodeType || 'paragraph';
    if (typeof currentNode === 'object' && currentNode !== null) {
      if ('type' in currentNode && typeof currentNode.type === 'string') {
        nodeType = currentNode.type;
      } else if ('tagName' in currentNode && typeof currentNode.tagName === 'string') {
        nodeType = currentNode.tagName.toLowerCase();
      }
    }

    // -------------------------------------------------------------
    // PRECEDENCE TIER 1: MANUAL PAGE BREAKS (Highest Priority)
    // -------------------------------------------------------------
    if (rules.isManualBreak || nodeType === 'manual-page-break') {
      const decision: PaginationRuleDecision = {
        nodeId,
        nodeType,
        rule: 'MANUAL_BREAK',
        precedence: PaginationRulePrecedence.MANUAL_PAGE_BREAK,
        availableHeight,
        measuredHeight: 0,
        decision: 'MANUAL_BREAK',
        reason: 'Explicit manual page break command',
        hasConflict: false,
        pageIndex,
      };
      this.recordDiagnostic(decision);
      return decision;
    }

    // -------------------------------------------------------------
    // PRECEDENCE TIER 2: SECTION TRANSITIONS
    // -------------------------------------------------------------
    if (rules.isSectionBreak || nodeType === 'section') {
      const decision: PaginationRuleDecision = {
        nodeId,
        nodeType,
        rule: 'SECTION_BREAK',
        precedence: PaginationRulePrecedence.SECTION_TRANSITION,
        availableHeight,
        measuredHeight: 0,
        decision: 'SECTION_BREAK',
        reason: 'Section boundary transition',
        hasConflict: false,
        pageIndex,
      };
      this.recordDiagnostic(decision);
      return decision;
    }

    // -------------------------------------------------------------
    // RELATIONAL CONSTRAINTS: FIGURE + CAPTION BINDING
    // (Evaluated before standalone atomic to ensure figure and caption remain bound)
    // -------------------------------------------------------------
    const isFigureOrImg = ['figure', 'img', 'image'].includes(nodeType);
    const isNextCaption =
      nextNode &&
      (Boolean(nextRules?.isFigureCaption) ||
        (typeof nextNode === 'object' && 'tagName' in nextNode && nextNode.tagName.toLowerCase() === 'figcaption') ||
        (typeof nextNode === 'object' && 'classList' in nextNode && nextNode.classList.contains('doclab-image-caption')) ||
        (typeof nextNode === 'object' && 'type' in nextNode && (nextNode as any).type === 'caption') ||
        (typeof nextNode === 'object' && (nextNode as any).constraints?.isFigureCaption));

    if (isFigureOrImg && isNextCaption) {
      const minCaptionHeight = 36;
      const totalBindingHeight = measuredHeight + minCaptionHeight;

      if (totalBindingHeight > availableHeight && usedHeight > 0) {
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: 'FIGURE_CAPTION',
          precedence: PaginationRulePrecedence.RELATIONAL_CONSTRAINTS,
          availableHeight,
          measuredHeight,
          decision: 'MOVE_TO_NEXT_PAGE',
          reason: 'Figure + caption binding: insufficient space for both on current page, pushing to next page',
          hasConflict: false,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }
    }

    // -------------------------------------------------------------
    // PRECEDENCE TIER 3: HARD KEEP CONSTRAINTS (Signature Block, Figures, Keep-Together, Atomic)
    // -------------------------------------------------------------
    const isAtomic =
      Boolean(context.isAtomic) ||
      Boolean(rules.isAtomic) ||
      rules.breakInside === 'avoid' ||
      Boolean(rules.isSignatureBlock) ||
      ['image', 'svg', 'divider', 'signature-block'].includes(nodeType);

    if (isAtomic) {
      const ruleType: PaginationRuleType = rules.isSignatureBlock
        ? 'SIGNATURE_BLOCK'
        : 'KEEP_TOGETHER';

      // Case 3a: Fits within remaining space on current page
      if (measuredHeight <= availableHeight) {
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: ruleType,
          precedence: PaginationRulePrecedence.HARD_KEEP_CONSTRAINTS,
          availableHeight,
          measuredHeight,
          decision: 'PLACE',
          reason: `${ruleType} fits within available page height`,
          hasConflict: false,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }

      // Case 3b: Exceeds remaining space, but fits on a fresh new page
      if (measuredHeight <= maxPageHeight && usedHeight > 0) {
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: ruleType,
          precedence: PaginationRulePrecedence.HARD_KEEP_CONSTRAINTS,
          availableHeight,
          measuredHeight,
          decision: 'MOVE_TO_NEXT_PAGE',
          reason: `${ruleType} exceeds remaining space, moving intact to fresh page`,
          hasConflict: false,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }

      // Case 3c: CONFLICT! Atomic element exceeds entire page height (> maxPageHeight) on an empty page (usedHeight === 0)
      if (measuredHeight > availableHeight && usedHeight === 0) {
        const isImage = ['image', 'img', 'svg'].includes(nodeType);
        const resolution = isImage ? 'FORCE_PAGE_BOUNDARY_SLICE' : 'EMERGENCY_SLICE_OVERSIZED_ATOMIC';
        const decisionAction: PaginationAction = isImage ? 'FORCE_PLACE' : 'FRAGMENT';

        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: ruleType,
          precedence: PaginationRulePrecedence.HARD_KEEP_CONSTRAINTS,
          availableHeight,
          measuredHeight,
          decision: decisionAction,
          reason: `Oversized atomic element (${measuredHeight}px) exceeds full page content height (${availableHeight}px)`,
          hasConflict: true,
          conflictDetails: `Conflict: break-inside: avoid is physically unsatisfiable because block height (${measuredHeight}px) exceeds page capacity (${availableHeight}px).`,
          resolutionStrategy: resolution,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }
    }

    // -------------------------------------------------------------
    // PRECEDENCE TIER 4: RELATIONAL CONSTRAINTS (Heading Keep-With-Next)
    // -------------------------------------------------------------
    if (rules.keepWithNext || nodeType === 'heading' || /^h[1-6]$/.test(nodeType)) {
      // Conflict Check 4a: Does nextNode have explicit breakBefore: always or manual break?
      if (nextRules && (nextRules.breakBefore === 'always' || nextRules.breakBefore === 'page' || nextRules.isManualBreak)) {
        // Explicit break on next node overrules keep-with-next on current node!
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: 'KEEP_WITH_NEXT',
          precedence: PaginationRulePrecedence.RELATIONAL_CONSTRAINTS,
          availableHeight,
          measuredHeight,
          decision: measuredHeight <= availableHeight ? 'PLACE' : usedHeight > 0 ? 'MOVE_TO_NEXT_PAGE' : 'FORCE_PLACE',
          reason: 'break-before on next node overrules keep-with-next on current node',
          hasConflict: true,
          conflictDetails: 'Conflict: keep-with-next on current heading conflicts with break-before: always on subsequent node.',
          resolutionStrategy: 'BREAK_BEFORE_OVERRULES_KEEP_WITH_NEXT',
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }

      const nextType = nextNode && typeof nextNode === 'object'
        ? ('type' in nextNode ? nextNode.type : 'tagName' in nextNode ? nextNode.tagName.toLowerCase() : 'paragraph')
        : 'paragraph';

      const minFollowSpace =
        nextType === 'table' ? MIN_TABLE_SPLIT_SPACE_PX : MIN_PARAGRAPH_SPLIT_SPACE_PX;

      const remainingAfterCurrent = availableHeight - measuredHeight;

      // If heading fits, but remaining space after heading is too small for following block
      if (measuredHeight <= availableHeight && remainingAfterCurrent < minFollowSpace) {
        if (usedHeight > 0) {
          const decision: PaginationRuleDecision = {
            nodeId,
            nodeType,
            rule: 'KEEP_WITH_NEXT',
            precedence: PaginationRulePrecedence.RELATIONAL_CONSTRAINTS,
            availableHeight,
            measuredHeight,
            decision: 'MOVE_TO_NEXT_PAGE',
            reason: 'Heading keep-with-next orphan protection: pushed to next page to prevent orphan heading at bottom',
            hasConflict: false,
            pageIndex,
          };
          this.recordDiagnostic(decision);
          return decision;
        } else {
          // At top of empty page, cannot push further -> place with conflict note
          const decision: PaginationRuleDecision = {
            nodeId,
            nodeType,
            rule: 'KEEP_WITH_NEXT',
            precedence: PaginationRulePrecedence.RELATIONAL_CONSTRAINTS,
            availableHeight,
            measuredHeight,
            decision: 'PLACE',
            reason: 'Heading fits at top of page, following content will paginate to subsequent page',
            hasConflict: true,
            conflictDetails: 'Heading at top of empty page has insufficient follow space, but cannot be pushed further.',
            resolutionStrategy: 'FORCE_PLACE_AT_TOP_OF_PAGE',
            pageIndex,
          };
          this.recordDiagnostic(decision);
          return decision;
        }
      }
    }

    // -------------------------------------------------------------
    // PRECEDENCE TIER 5: EXPLICIT BREAK RULES (break-before, break-after)
    // -------------------------------------------------------------
    if (rules.breakBefore === 'always' || rules.breakBefore === 'page') {
      if (usedHeight > 0) {
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: 'BREAK_BEFORE',
          precedence: PaginationRulePrecedence.EXPLICIT_BREAK_RULES,
          availableHeight,
          measuredHeight,
          decision: 'MOVE_TO_NEXT_PAGE',
          reason: 'break-before: always rule triggered',
          hasConflict: false,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }
    }

    // -------------------------------------------------------------
    // PRECEDENCE TIER 6 & 7: FRAGMENTATION & NORMAL FLOW PLACEMENT
    // -------------------------------------------------------------
    if (measuredHeight <= availableHeight) {
      const decision: PaginationRuleDecision = {
        nodeId,
        nodeType,
        rule: rules.breakAfter === 'always' || rules.breakAfter === 'page' ? 'BREAK_AFTER' : 'NORMAL_FLOW',
        precedence: PaginationRulePrecedence.NORMAL_FLOW_PLACEMENT,
        availableHeight,
        measuredHeight,
        decision: 'PLACE',
        reason: 'Fits within available page height',
        hasConflict: false,
        pageIndex,
      };
      this.recordDiagnostic(decision);
      return decision;
    }

    // Overflow handling (measuredHeight > availableHeight)
    if (usedHeight > 0) {
      // Check if candidate can fragment
      const canFragment = ['paragraph', 'p', 'table', 'list', 'ul', 'ol', 'section'].includes(nodeType);

      if (!canFragment) {
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: 'NORMAL_FLOW',
          precedence: PaginationRulePrecedence.FRAGMENTATION_RULES,
          availableHeight,
          measuredHeight,
          decision: 'MOVE_TO_NEXT_PAGE',
          reason: 'Non-splittable block exceeds remaining space, moving to next page',
          hasConflict: false,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }

      // Splittable block with insufficient split space (e.g. less than 2 lines / table header)
      const minSplitBudget = nodeType === 'table' ? MIN_TABLE_SPLIT_SPACE_PX : MIN_PARAGRAPH_SPLIT_SPACE_PX;
      if (availableHeight < minSplitBudget) {
        const decision: PaginationRuleDecision = {
          nodeId,
          nodeType,
          rule: 'WIDOW_ORPHAN',
          precedence: PaginationRulePrecedence.FRAGMENTATION_RULES,
          availableHeight,
          measuredHeight,
          decision: 'MOVE_TO_NEXT_PAGE',
          reason: `Insufficient space (${availableHeight}px) for minimum split lines, pushing block to next page`,
          hasConflict: false,
          pageIndex,
        };
        this.recordDiagnostic(decision);
        return decision;
      }

      // Permitted to slice at line or row boundary
      const decision: PaginationRuleDecision = {
        nodeId,
        nodeType,
        rule: 'NORMAL_FLOW',
        precedence: PaginationRulePrecedence.FRAGMENTATION_RULES,
        availableHeight,
        measuredHeight,
        decision: 'FRAGMENT',
        reason: 'Block sliced at page boundary across valid line/row breaks',
        hasConflict: false,
        pageIndex,
      };
      this.recordDiagnostic(decision);
      return decision;
    } else {
      // Overflow at top of empty page (usedHeight === 0)
      const decision: PaginationRuleDecision = {
        nodeId,
        nodeType,
        rule: 'NORMAL_FLOW',
        precedence: PaginationRulePrecedence.FRAGMENTATION_RULES,
        availableHeight,
        measuredHeight,
        decision: 'FRAGMENT',
        reason: 'Large block at top of page sliced across page boundary',
        hasConflict: false,
        pageIndex,
      };
      this.recordDiagnostic(decision);
      return decision;
    }
  }

  /**
   * Static helper for direct evaluations
   */
  public static evaluatePlacementStatic(context: RuleEvaluationContext): PaginationRuleDecision {
    const engine = new PaginationRuleEngine();
    return engine.evaluatePlacement(context);
  }

  /**
   * Records a diagnostic decision and tracks conflicts
   */
  public recordDiagnostic(decision: PaginationRuleDecision): void {
    this.decisions.push(decision);
    if (decision.hasConflict) {
      this.conflicts.push(decision);
    }
  }

  /**
   * Returns all recorded decisions
   */
  public getDecisions(): PaginationRuleDecision[] {
    return [...this.decisions];
  }

  /**
   * Returns all recorded conflicts
   */
  public getConflicts(): PaginationRuleDecision[] {
    return [...this.conflicts];
  }

  /**
   * Clears engine decision state
   */
  public clear(): void {
    this.decisions = [];
    this.conflicts = [];
  }

  /**
   * Generates a comprehensive diagnostics report
   */
  public getDiagnosticsSummary(): PaginationRuleDiagnosticsReport {
    const ruleFrequency: Record<PaginationRuleType, number> = {
      MANUAL_BREAK: 0,
      SECTION_BREAK: 0,
      KEEP_TOGETHER: 0,
      KEEP_WITH_NEXT: 0,
      WIDOW_ORPHAN: 0,
      BREAK_BEFORE: 0,
      BREAK_AFTER: 0,
      TABLE_HEADER_REPEAT: 0,
      FIGURE_CAPTION: 0,
      SIGNATURE_BLOCK: 0,
      NORMAL_FLOW: 0,
    };

    const decisionFrequency: Record<PaginationAction, number> = {
      PLACE: 0,
      MOVE_TO_NEXT_PAGE: 0,
      FRAGMENT: 0,
      MANUAL_BREAK: 0,
      SECTION_BREAK: 0,
      FORCE_PLACE: 0,
    };

    this.decisions.forEach((d) => {
      ruleFrequency[d.rule] = (ruleFrequency[d.rule] || 0) + 1;
      decisionFrequency[d.decision] = (decisionFrequency[d.decision] || 0) + 1;
    });

    return {
      totalDecisions: this.decisions.length,
      conflictCount: this.conflicts.length,
      decisions: this.getDecisions(),
      conflicts: this.getConflicts(),
      ruleFrequency,
      decisionFrequency,
    };
  }
}
