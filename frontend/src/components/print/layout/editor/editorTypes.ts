/**
 * Editor Architecture Types & Contracts
 *
 * Implements the authoritative transactional editing model:
 * - Exactly ONE logical editing host/state for the entire document
 * - Clean separation between Canonical Content and Runtime Visual Page Projection
 * - Explicit Transaction & Command Model
 */

import { CanonicalDocument, BlockNode, InlineNode, Mark, HeadingLevel, ListType, TextAlignment } from '../../model/types';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, PaginationEngineResult } from '../types/paginationTypes';

/**
 * Logical Document Point representation (nodeId + textOffset)
 */
export interface LogicalPosition {
  /** Canonical Node ID or semantic block identifier */
  nodeId: string;
  /** Character offset inside the logical node */
  textOffset: number;
}

/**
 * Authoritative Structured Editor Selection
 */
export interface LogicalSelection {
  /** Anchor point of selection */
  anchor: LogicalPosition;
  /** Head / focus point of selection */
  head: LogicalPosition;
  /** Whether selection is a collapsed caret */
  isCollapsed: boolean;
  /** Canvas scroll position preservation */
  scrollTop?: number;
  scrollLeft?: number;
}

/**
 * Editor Selection representation
 */
export interface EditorSelection {
  /** Continuous character offset in the document */
  anchorOffset: number;
  focusOffset: number;
  /** Whether the selection is a collapsed caret */
  isCollapsed: boolean;
  /** Active block index or node ID if available */
  blockId?: string;
  /** Active block type at cursor */
  blockType?: string;
  /** Logical position representation */
  logical?: LogicalSelection;
}

/**
 * Active Formatting Marks at current selection/caret
 */
export interface EditorActiveMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  fontFamily?: string;
  alignment?: TextAlignment;
  blockType?: string;
  headingLevel?: HeadingLevel;
  listType?: ListType;
}

/**
 * Single-Host Editor State
 */
export interface EditorState {
  /** Evaluated Canonical Document AST */
  doc: CanonicalDocument;
  /** Clean, continuous canonical HTML string */
  canonicalHtml: string;
  /** Document-relative selection */
  selection: EditorSelection | null;
  /** Active formatting marks at caret */
  activeMarks: EditorActiveMarks;
  /** Whether editor has undo history */
  canUndo: boolean;
  /** Whether editor has redo history */
  canRedo: boolean;
  /** Current layout pagination result (runtime projection only) */
  layout: PaginationEngineResult | null;
  /** Layout calculation duration in ms */
  layoutDurationMs: number;
}

/**
 * Transaction Mutation Origin
 */
export type TransactionOrigin =
  | 'typing'
  | 'command'
  | 'paste'
  | 'cut'
  | 'undo'
  | 'redo'
  | 'init'
  | 'external';

/**
 * Editor Transaction encapsulating an atomic state transformation
 */
export interface EditorTransaction {
  /** Updated canonical document AST */
  doc: CanonicalDocument;
  /** Clean canonical HTML without runtime artifacts */
  canonicalHtml: string;
  /** New selection after transaction */
  selection?: EditorSelection | null;
  /** Origin of the transaction */
  origin: TransactionOrigin;
  /** Timestamp when transaction was created */
  timestamp: number;
  /** Description of the command / mutation for history */
  description?: string;
}

/**
 * Standard Editor Command Function Signature
 */
export type EditorCommandHandler<TArgs = any> = (
  state: EditorState,
  args?: TArgs
) => EditorTransaction | null;
