/**
 * ControlledLayoutPipeline.ts
 *
 * Master Controlled Layout & Measurement Pipeline for SPR Note DocLab.
 *
 * Implements the authoritative Word-Grade layout sequence:
 *
 *   canonical state
 *         ↓
 *   editor DOM / measurement mirror ready
 *         ↓
 *   requestAnimationFrame / layout effect scheduling
 *         ↓
 *   actual browser measurement
 *         ↓
 *   pagination
 *         ↓
 *   DOM reconciliation
 *
 * Architectural Invariants:
 * 1. Zero authoritative DOM measurement or DOM mutation inside React render/useMemo.
 * 2. Asynchronous font synchronization via FontLoadingCoordinator to eliminate FOUT and subpixel measurement glitches.
 * 3. Cooperative requestAnimationFrame frame scheduling with automatic animation frame coalescing.
 * 4. Pure non-mutating initial estimation during React render phase; authoritative browser layout in layout effect phase.
 */

import { LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, PaginationEngineResult } from '../types/paginationTypes';
import { CanonicalDocument, BlockNode } from '../../model/types';
import { PaginationEngine } from '../pagination/PaginationEngine';
import { FontLoadingCoordinator } from '../performance/FontLoadingCoordinator';
import { DomMeasurementEngine } from './DomMeasurementEngine';

export interface LayoutPipelineScheduleHandle {
  id: number;
  cancel: () => void;
}

export class ControlledLayoutPipeline {
  private static activeRafId: number | null = null;

  /**
   * Executes a synchronous pure non-mutating layout pass.
   * Safe to call during React render/initialization without touching live DOM or document.body.
   */
  public static computePureInitialLayout(
    input: CanonicalDocument | string | BlockNode[],
    options: LayoutDocumentOptions = {}
  ): PaginationEngineResult {
    return PaginationEngine.paginate(input, {
      ...options,
      pureCalculation: true,
    });
  }

  /**
   * Executes an authoritative browser layout pass when DOM, stylesheets, and web fonts are ready.
   * Runs in layout effect / requestAnimationFrame phase.
   */
  public static async executeAuthoritativeLayout(
    input: CanonicalDocument | string | BlockNode[],
    options: LayoutDocumentOptions = {},
    previousLayout?: LayoutDocument | null
  ): Promise<PaginationEngineResult> {
    // 1. Wait for web fonts & typography styles to settle
    await FontLoadingCoordinator.waitForFontsReady().catch(() => {});

    // 2. Perform incremental or full browser layout measurement & pagination
    if (previousLayout && previousLayout.pages && previousLayout.pages.length > 0) {
      return PaginationEngine.paginateIncremental(previousLayout, input, options);
    }

    return PaginationEngine.paginate(input, options);
  }

  /**
   * Schedules an authoritative layout pass on the next requestAnimationFrame.
   * Coalesces rapid keystrokes/updates so only the latest state is measured and reconciled.
   */
  public static scheduleLayoutPass(
    execute: () => void | Promise<void>
  ): LayoutPipelineScheduleHandle {
    if (typeof window === 'undefined') {
      execute();
      return { id: 0, cancel: () => {} };
    }

    if (this.activeRafId !== null) {
      cancelAnimationFrame(this.activeRafId);
      this.activeRafId = null;
    }

    const rafId = requestAnimationFrame(async () => {
      ControlledLayoutPipeline.activeRafId = null;
      await execute();
    });

    ControlledLayoutPipeline.activeRafId = rafId;

    return {
      id: rafId,
      cancel: () => {
        if (typeof window !== 'undefined' && ControlledLayoutPipeline.activeRafId === rafId) {
          cancelAnimationFrame(rafId);
          ControlledLayoutPipeline.activeRafId = null;
        }
      },
    };
  }

  /**
   * Cleans up any pending scheduled layout frames.
   */
  public static cancelPendingLayout(): void {
    if (typeof window !== 'undefined' && this.activeRafId !== null) {
      cancelAnimationFrame(this.activeRafId);
      this.activeRafId = null;
    }
  }
}
