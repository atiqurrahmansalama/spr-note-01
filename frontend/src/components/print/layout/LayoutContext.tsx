/**
 * LayoutContext
 * React Context Provider and Hook for the DocLab Layout Architecture.
 * Bridges continuous document state with the active computed layout model.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import {
  LayoutDocument,
  LayoutPage,
  LayoutDocumentOptions,
  PaginationStatus,
} from './types';
import { DocumentLayoutEngine } from './DocumentLayoutEngine';

export interface LayoutContextValue {
  /** The active computed multi-page layout document */
  layoutDocument: LayoutDocument;

  /** Total pages computed */
  totalPages: number;

  /** Active focused page index in canvas */
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;

  /** Current pagination calculation status */
  paginationStatus: PaginationStatus;

  /** Active layout options (margins, pageSize, orientation, density) */
  options: LayoutDocumentOptions;
  updateOptions: (newOptions: Partial<LayoutDocumentOptions>) => void;

  /** Explicitly trigger a layout re-computation pass */
  requestRelayout: () => void;

  /** Direct setter for computed layout document */
  setLayoutDocument: React.Dispatch<React.SetStateAction<LayoutDocument>>;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export interface LayoutContextProviderProps {
  documentId?: string;
  initialOptions?: LayoutDocumentOptions;
  title?: string;
  children: React.ReactNode;
}

export const LayoutContextProvider: React.FC<LayoutContextProviderProps> = ({
  documentId = 'doclab_master',
  initialOptions = {},
  title = 'Official Document',
  children,
}) => {
  const [options, setOptions] = useState<LayoutDocumentOptions>(() => ({
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
    density: 'NORMAL',
    colorMode: 'FULL_COLOR',
    enableFlowPagination: true,
    ...initialOptions,
  }));

  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [paginationStatus, setPaginationStatus] = useState<PaginationStatus>('idle');
  const [relayoutKey, setRelayoutKey] = useState<number>(0);

  const [layoutDocument, setLayoutDocument] = useState<LayoutDocument>(() =>
    DocumentLayoutEngine.createEmptyLayoutDocument(documentId, options, title)
  );

  const updateOptions = useCallback((newOptions: Partial<LayoutDocumentOptions>) => {
    setOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  const requestRelayout = useCallback(() => {
    setRelayoutKey((prev) => prev + 1);
  }, []);

  // Update layout document dimensions when page size or orientation changes
  useEffect(() => {
    setLayoutDocument((prev) => {
      const bounds = DocumentLayoutEngine.calculatePageBounds(options);
      const updatedPages = prev.pages.map((p, idx) =>
        DocumentLayoutEngine.createLayoutPage(idx, prev.totalPages, options, bounds)
      );

      return {
        ...prev,
        width: bounds.paperDimensions.width,
        height: bounds.paperDimensions.height,
        options,
        pages: updatedPages.length > 0 ? updatedPages : [DocumentLayoutEngine.createLayoutPage(0, 1, options, bounds)],
        calculatedAt: Date.now(),
      };
    });
  }, [options, relayoutKey]);

  const value = useMemo<LayoutContextValue>(() => {
    return {
      layoutDocument,
      totalPages: Math.max(1, layoutDocument.totalPages || layoutDocument.pages.length),
      activePageIndex,
      setActivePageIndex,
      paginationStatus,
      options,
      updateOptions,
      requestRelayout,
      setLayoutDocument,
    };
  }, [
    layoutDocument,
    activePageIndex,
    paginationStatus,
    options,
    updateOptions,
    requestRelayout,
  ]);

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export function useLayoutContext(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayoutContext must be used within a LayoutContextProvider');
  }
  return context;
}

export default LayoutContext;
