/**
 * useControlledLayoutPipeline.ts
 *
 * React Hook orchestrating the Controlled Layout Pipeline for DocLab Paginated Editors.
 *
 * Enforces the architectural invariant:
 *
 *   mount
 *     ↓
 *   wait fonts (FontLoadingCoordinator)
 *     ↓
 *   initial layout
 *     ↓
 *   fonts ready / dynamic fonts loaded
 *     ↓
 *   repaginate
 *     ↓
 *   stable layout
 *
 * Ensures:
 * 1. Zero authoritative DOM measurement in React render/useMemo.
 * 2. Instant non-mutating initial layout on mount.
 * 3. Asynchronous browser measurement on RAF after web fonts and stylesheets settle.
 * 4. Subscribes to FontLoadingCoordinator to repaginate whenever fonts finish loading or later web fonts load.
 * 5. Automatic RAF cancellation and debounce for rapid keystrokes.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { LayoutDocument, PaginationEngineResult } from '../types/paginationTypes';
import { CanonicalDocument, BlockNode } from '../../model/types';
import { ControlledLayoutPipeline, LayoutPipelineScheduleHandle } from './ControlledLayoutPipeline';
import { FontLoadingCoordinator } from '../performance/FontLoadingCoordinator';

export interface UseControlledLayoutPipelineParams {
  /** Canonical document input (raw HTML, AST, or block array) */
  input: CanonicalDocument | string | BlockNode[];
  /** Layout and geometry options */
  options?: LayoutDocumentOptions;
  /** Injected stylesheet CSS */
  styles?: string;
  /** Optional layout completion callback */
  onLayoutReady?: (result: PaginationEngineResult) => void;
  /** Debug layout inspector flag */
  debugLayout?: boolean;
}

export interface UseControlledLayoutPipelineReturn {
  /** Current active layout result containing pages and metrics */
  layoutResult: PaginationEngineResult;
  /** The computed LayoutDocument */
  layoutDocument: LayoutDocument;
  /** Total calculated pages */
  totalPages: number;
  /** Whether browser measurement is actively running or scheduled */
  isMeasuring: boolean;
  /** Whether the initial authoritative browser measurement has completed */
  isLayoutReady: boolean;
  /** Imperative trigger to force a layout re-computation pass */
  scheduleRelayout: () => void;
}

export function useControlledLayoutPipeline({
  input,
  options = {},
  styles = '',
  onLayoutReady,
  debugLayout = false,
}: UseControlledLayoutPipelineParams): UseControlledLayoutPipelineReturn {
  const prevLayoutRef = useRef<LayoutDocument | null>(null);
  const scheduleHandleRef = useRef<LayoutPipelineScheduleHandle | null>(null);
  const onLayoutReadyRef = useRef(onLayoutReady);
  onLayoutReadyRef.current = onLayoutReady;

  // Merged layout options
  const layoutOptions: LayoutDocumentOptions = {
    pageSize: options.pageSize || 'A4',
    orientation: options.orientation || 'PORTRAIT',
    margin: options.margin || 'NORMAL',
    customMarginsMm: options.customMarginsMm,
    pageProperties: options.pageProperties,
    density: options.density || 'NORMAL',
    fontSizePx: options.fontSizePx,
    fontFamily: options.fontFamily,
    lineHeight: options.lineHeight,
    styles,
    debugLayout,
  };

  // 1. Pure initial layout state (Zero DOM mutation during render)
  const [layoutResult, setLayoutResult] = useState<PaginationEngineResult>(() => {
    return ControlledLayoutPipeline.computePureInitialLayout(input, layoutOptions);
  });

  const [isMeasuring, setIsMeasuring] = useState<boolean>(false);
  const [isLayoutReady, setIsLayoutReady] = useState<boolean>(false);

  // 2. Controlled layout execution function
  const runLayoutPass = useCallback(async () => {
    setIsMeasuring(true);
    try {
      const result = await ControlledLayoutPipeline.executeAuthoritativeLayout(
        input,
        layoutOptions,
        prevLayoutRef.current
      );

      prevLayoutRef.current = result.document;
      setLayoutResult(result);
      setIsLayoutReady(true);
      onLayoutReadyRef.current?.(result);
    } finally {
      setIsMeasuring(false);
    }
  }, [
    input,
    layoutOptions.pageSize,
    layoutOptions.orientation,
    layoutOptions.margin,
    JSON.stringify(layoutOptions.customMarginsMm),
    JSON.stringify(layoutOptions.pageProperties),
    layoutOptions.density,
    layoutOptions.fontSizePx,
    layoutOptions.fontFamily,
    layoutOptions.lineHeight,
    styles,
    debugLayout,
  ]);

  // 3. Imperative trigger
  const scheduleRelayout = useCallback(() => {
    if (scheduleHandleRef.current) {
      scheduleHandleRef.current.cancel();
    }
    scheduleHandleRef.current = ControlledLayoutPipeline.scheduleLayoutPass(runLayoutPass);
  }, [runLayoutPass]);

  // 4. Controlled Layout Pipeline Effect: Schedules measurement when DOM/fonts/styles are ready
  useEffect(() => {
    scheduleRelayout();

    return () => {
      if (scheduleHandleRef.current) {
        scheduleHandleRef.current.cancel();
      }
    };
  }, [scheduleRelayout]);

  // 5. Font readiness & dynamic font loading subscription: guarantees repagination when fonts become ready
  useEffect(() => {
    const unsubscribe = FontLoadingCoordinator.onFontsLoaded(() => {
      scheduleRelayout();
    });

    return () => {
      unsubscribe();
    };
  }, [scheduleRelayout]);

  return {
    layoutResult,
    layoutDocument: layoutResult.document,
    totalPages: Math.max(1, layoutResult.totalPages || layoutResult.pages.length),
    isMeasuring,
    isLayoutReady,
    scheduleRelayout,
  };
}
