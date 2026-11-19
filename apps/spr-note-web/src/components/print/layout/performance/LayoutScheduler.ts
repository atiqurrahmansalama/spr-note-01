/**
 * LayoutScheduler
 * Cooperative non-blocking task scheduler for large document pagination.
 *
 * Slices long-running pagination runs (>100 pages) into 12ms frame budgets,
 * yielding control back to the browser event loop so UI typing and animations
 * remain perfectly smooth at 60 FPS.
 */

export interface ScheduledTask<T> {
  id: string;
  cancel: () => void;
  promise: Promise<T>;
}

export interface SchedulerOptions {
  /** Maximum time slice in ms per frame before yielding to event loop (default: 12ms) */
  timeBudgetMs?: number;
  /** Progress callback reporting progress */
  onProgress?: (progress: { processed: number; total: number; percent: number }) => void;
}

export class LayoutScheduler {
  private static activeTasks = new Map<string, boolean>();
  private static taskSeq: number = 0;

  /**
   * Schedules a chunked, time-budgeted asynchronous computation
   */
  public static scheduleChunked<TItem, TResult>(
    items: TItem[],
    processItem: (item: TItem, index: number) => void,
    onComplete: () => TResult,
    options: SchedulerOptions = {}
  ): ScheduledTask<TResult> {
    const taskId = `task_${++this.taskSeq}`;
    this.activeTasks.set(taskId, true);

    const timeBudget = options.timeBudgetMs ?? 12;
    const total = items.length;
    let currentIndex = 0;

    let resolvePromise: (value: TResult) => void;
    let rejectPromise: (reason?: any) => void;

    const promise = new Promise<TResult>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const step = () => {
      if (!this.activeTasks.get(taskId)) {
        rejectPromise(new Error('Layout task cancelled'));
        return;
      }

      const frameStart = typeof performance !== 'undefined' ? performance.now() : Date.now();

      while (currentIndex < total) {
        processItem(items[currentIndex], currentIndex);
        currentIndex++;

        const elapsed = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - frameStart;
        if (elapsed >= timeBudget && currentIndex < total) {
          // Yield to event loop
          if (options.onProgress) {
            options.onProgress({
              processed: currentIndex,
              total,
              percent: Math.round((currentIndex / total) * 100),
            });
          }

          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            type WindowWithIdle = Window & { requestIdleCallback: (cb: () => void, opt?: { timeout: number }) => number };
            (window as unknown as WindowWithIdle).requestIdleCallback(() => step(), { timeout: 20 });
          } else {
            setTimeout(step, 0);
          }
          return;
        }
      }

      // All items processed
      this.activeTasks.delete(taskId);
      if (options.onProgress) {
        options.onProgress({ processed: total, total, percent: 100 });
      }

      try {
        const result = onComplete();
        resolvePromise(result);
      } catch (err) {
        rejectPromise(err);
      }
    };

    // Kick off first step immediately
    setTimeout(step, 0);

    return {
      id: taskId,
      cancel: () => {
        this.activeTasks.delete(taskId);
      },
      promise,
    };
  }
}
