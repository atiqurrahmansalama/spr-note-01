/**
 * EditorHistory
 *
 * Transaction-based Undo / Redo history manager for the Single-Host Document Editor.
 * Supports timestamp-based keystroke coalescing (400ms window) and discrete checkpoints for formatting/insert commands.
 */

import { EditorTransaction } from './editorTypes';
import { EditorSerializer } from './EditorSerializer';

export interface HistoryCheckpoint {
  canonicalHtml: string;
  timestamp: number;
  origin: string;
  description?: string;
}

export class EditorHistory {
  private undoStack: HistoryCheckpoint[] = [];
  private redoStack: HistoryCheckpoint[] = [];
  private maxHistorySize: number;
  private lastTypingTimestamp: number = 0;
  private readonly COALESCE_WINDOW_MS = 400;

  constructor(initialHtml: string = '<p><br></p>', maxHistorySize: number = 60) {
    this.maxHistorySize = maxHistorySize;
    const clean = EditorSerializer.sanitize(initialHtml);
    this.undoStack = [{ canonicalHtml: clean, timestamp: Date.now(), origin: 'init' }];
  }

  /**
   * Pushes a new transaction to the undo stack
   */
  public push(transaction: EditorTransaction): void {
    const cleanHtml = EditorSerializer.sanitize(transaction.canonicalHtml);
    const now = transaction.timestamp || Date.now();
    const currentTop = this.undoStack[this.undoStack.length - 1];

    // If identical to current state, ignore
    if (currentTop && currentTop.canonicalHtml === cleanHtml) {
      return;
    }

    // Coalesce rapid typing events within 400ms window
    if (
      transaction.origin === 'typing' &&
      currentTop &&
      currentTop.origin === 'typing' &&
      now - this.lastTypingTimestamp < this.COALESCE_WINDOW_MS
    ) {
      // Update top of stack in-place
      currentTop.canonicalHtml = cleanHtml;
      currentTop.timestamp = now;
      this.lastTypingTimestamp = now;
      this.redoStack = [];
      return;
    }

    // Push new checkpoint
    this.undoStack.push({
      canonicalHtml: cleanHtml,
      timestamp: now,
      origin: transaction.origin,
      description: transaction.description,
    });

    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.lastTypingTimestamp = transaction.origin === 'typing' ? now : 0;
  }

  /**
   * Performs an Undo operation
   */
  public undo(): string | null {
    if (this.undoStack.length <= 1) return null;

    const current = this.undoStack.pop()!;
    this.redoStack.push(current);

    const previous = this.undoStack[this.undoStack.length - 1];
    return previous ? previous.canonicalHtml : null;
  }

  /**
   * Performs a Redo operation
   */
  public redo(): string | null {
    if (this.redoStack.length === 0) return null;

    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    return next.canonicalHtml;
  }

  /**
   * Checks if undo is available
   */
  public get canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  /**
   * Checks if redo is available
   */
  public get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Current canonical HTML
   */
  public get current(): string {
    const top = this.undoStack[this.undoStack.length - 1];
    return top ? top.canonicalHtml : '<p><br></p>';
  }

  /**
   * Resets history stack with new initial HTML
   */
  public reset(initialHtml: string): void {
    const clean = EditorSerializer.sanitize(initialHtml);
    this.undoStack = [{ canonicalHtml: clean, timestamp: Date.now(), origin: 'init' }];
    this.redoStack = [];
    this.lastTypingTimestamp = 0;
  }
}
