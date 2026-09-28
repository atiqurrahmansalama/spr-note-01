/**
 * EditorTransactionCoordinator
 *
 * Coordinates real-time editor mutations, classifies transaction priorities,
 * coalesces rapid keystrokes, and executes controlled layout reflows without DOM thrashing.
 *
 * TRANSACTION PRIORITIES:
 * 1. 'geometry' / 'style' (Font size, margin, orientation, page size): Immediate (0ms)
 * 2. 'structural' (Enter, Backspace cross-node, Paste, Cut, Page Break): High Priority (40ms)
 * 3. 'micro' (Typing within current block, inline character deletion): Coalesced (200ms)
 */

export type TransactionType = 'micro' | 'structural' | 'geometry' | 'style';

export interface EditorTransaction {
  id: string;
  type: TransactionType;
  timestamp: number;
  sourcePageIndex?: number;
  dirtyNodeId?: string;
  payload?: any;
}

export interface ReflowExecutionContext {
  transactionType: TransactionType;
  earliestPageIndex: number;
  dirtyNodeIds: string[];
}

export type ReflowCallback = (ctx: ReflowExecutionContext) => void | Promise<void>;

export class EditorTransactionCoordinator {
  private timer: any = null;
  private pendingTransactions: EditorTransaction[] = [];
  private isReflowing: boolean = false;
  private reflowCallback: ReflowCallback;

  // Debounce thresholds
  private readonly microDebounceMs: number = 200;
  private readonly structuralDebounceMs: number = 40;

  constructor(reflowCallback: ReflowCallback) {
    this.reflowCallback = reflowCallback;
  }

  /**
   * Enqueues an editor transaction and schedules a coalesced reflow pass
   */
  public enqueue(transaction: Omit<EditorTransaction, 'id' | 'timestamp'>): void {
    const fullTx: EditorTransaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };

    this.pendingTransactions.push(fullTx);

    // Clear existing timer to coalesce
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Determine optimal debounce delay based on highest priority pending transaction
    let delayMs = this.microDebounceMs;
    const hasGeometry = this.pendingTransactions.some(
      (t) => t.type === 'geometry' || t.type === 'style'
    );
    const hasStructural = this.pendingTransactions.some(
      (t) => t.type === 'structural'
    );

    if (hasGeometry) {
      delayMs = 0;
    } else if (hasStructural) {
      delayMs = this.structuralDebounceMs;
    }

    if (delayMs === 0) {
      this.flush();
    } else {
      this.timer = setTimeout(() => {
        this.flush();
      }, delayMs);
    }
  }

  /**
   * Flushes all pending transactions and invokes the reflow callback
   */
  public flush(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.pendingTransactions.length === 0) return;

    const txs = [...this.pendingTransactions];
    this.pendingTransactions = [];

    // Derive highest priority transaction type
    let highestType: TransactionType = 'micro';
    if (txs.some((t) => t.type === 'geometry')) highestType = 'geometry';
    else if (txs.some((t) => t.type === 'style')) highestType = 'style';
    else if (txs.some((t) => t.type === 'structural')) highestType = 'structural';

    // Derive earliest affected page index
    let earliestPageIndex = 0;
    const pages = txs
      .map((t) => t.sourcePageIndex)
      .filter((p): p is number => p !== undefined && p !== null);

    if (pages.length > 0 && highestType === 'micro') {
      earliestPageIndex = Math.min(...pages);
    }

    // Collect dirty node IDs
    const dirtyNodeIds = txs
      .map((t) => t.dirtyNodeId)
      .filter((id): id is string => Boolean(id));

    this.isReflowing = true;
    try {
      this.reflowCallback({
        transactionType: highestType,
        earliestPageIndex,
        dirtyNodeIds: Array.from(new Set(dirtyNodeIds)),
      });
    } finally {
      this.isReflowing = false;
    }
  }

  /**
   * Disposes active timers and cancels pending transactions
   */
  public dispose(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pendingTransactions = [];
  }
}
