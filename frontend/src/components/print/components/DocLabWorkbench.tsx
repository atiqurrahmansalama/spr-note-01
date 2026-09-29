/**
 * DocLabWorkbench
 * Master Orchestrator for the Universal Print Studio canvas workbench.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Pure Orchestrator: Decides current mode, document/template binding, editor state,
 *    and export routing without mixing internal pagination algorithms or DOM slicing.
 * 2. Strict Mode Matrix Dispatch:
 *    - Mode A: Single-Host Template Editor (ModeATemplateEditor)
 *    - Mode D: Batch Generated Multi-Record View (ModeDBatchGeneratedView)
 *    - Mode E: Native Tabular Ledger Report (ModeETabularReportView)
 *    - Mode F: External Custom JSX Sheet & Fallback (ModeFCustomSheetView)
 * 3. Zero In-DOM pagination or HTML reassembly logic inside this component.
 */

import React, { useState, useMemo } from 'react';
import DocLabCanvasViewer from '../DocLabCanvasViewer';
import DocxFormattingRibbon from '../DocxFormattingRibbon';
import { DocLabSaveModal } from './sidebar';
import { SparklesIcon } from '@/components/ui/Icons';
import { PageGeometryCalculator, LayoutDebugOverlay } from '../layout';
import {
  ModeATemplateEditor,
  ModeDBatchGeneratedView,
  ModeETabularReportView,
  ModeFCustomSheetView,
} from './modes';
import {
  PrintOptions,
  PrintColumn,
  PrintMetaItem,
  PrintSummaryMetric,
  PrintPaginationResult,
  PrintBatchDocument,
} from '../types';

export interface DocLabWorkbenchProps {
  options: PrintOptions;
  updateOptionsWithHistory: (nextValOrUpdater: any) => void;
  title: string;
  subtitle?: string;
  liveMetaItems: PrintMetaItem[];
  handleMetaItemsChange: (newMetaItems: PrintMetaItem[]) => void;
  liveColumns: PrintColumn[];
  visibleColumnKeys: string[];
  isColumnMandatory?: ((column: any, idx?: number) => boolean) | null;
  isColumnRequired?: ((column: any, idx?: number) => boolean) | null;
  requiredColumnKeys?: (string | number)[] | null;
  visibleRowKeys: string[];
  isRowMandatory?: ((row: any, idx: number) => boolean) | null;
  isRowRequired?: ((row: any, idx: number) => boolean) | null;
  requiredRowKeys?: (string | number)[] | null;
  getRowIdentifier: (row: any, idx: number) => string;
  liveSummaryMetrics: PrintSummaryMetric[];
  footerRow?: any;
  footerRows?: any[];
  documents?: PrintBatchDocument[];
  batchDocuments?: PrintBatchDocument[];
  paginationResult: PrintPaginationResult;
  customDocxTemplate: any;
  setCustomDocxTemplate: React.Dispatch<React.SetStateAction<any>>;
  updateCustomDocxTemplateWithHistory?: (updater: any) => void;
  docxStyles: string;
  mergedDocuments?: string[];
  docxLayoutPages?: { docIndex: number; pageNumber: number; htmlContent: string; totalDocPages: number }[];
  mergedDocxPages: string[];
  docxRenderMode: 'template' | 'sample' | 'all';
  setDocxRenderMode: (mode: 'template' | 'sample' | 'all') => void;
  liveData: Array<Record<string, any>>;
  customSheets?: boolean;
  children?: React.ReactNode;
  zoomLevel: number;
  setZoomLevel: (z: number | ((prev: number) => number)) => void;
  pointerMode: 'hand' | 'select';
  setPointerMode: (mode: 'hand' | 'select') => void;
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  handleCellChange: (rowIndex: number, colKey: string, newValue: any) => void;
  handleRowDelete: (rowIndex: number) => void;
  handleRowInsert: (rowIndex: number, position?: 'above' | 'below') => void;
  handleRowMove: (fromIndex: number, toIndex: number) => void;
  handleColumnHeaderChange: (colKey: string, newHeader: string) => void;
  onSaveCurrentTemplate?: (name: string, docType: 'template' | 'generated') => void;
  autoSaveStatus?: string;
  autoSaveLastSavedAt?: string | null;
  isAutoSaving?: boolean;
}

export const DocLabWorkbench: React.FC<DocLabWorkbenchProps> = ({
  options,
  updateOptionsWithHistory,
  title,
  subtitle,
  liveMetaItems,
  handleMetaItemsChange,
  liveColumns,
  visibleColumnKeys,
  isColumnMandatory,
  isColumnRequired,
  requiredColumnKeys,
  visibleRowKeys,
  isRowMandatory,
  isRowRequired,
  requiredRowKeys,
  getRowIdentifier,
  liveSummaryMetrics,
  footerRow,
  footerRows = [],
  documents,
  batchDocuments,
  paginationResult,
  customDocxTemplate,
  setCustomDocxTemplate,
  updateCustomDocxTemplateWithHistory,
  docxStyles,
  docxLayoutPages,
  mergedDocxPages,
  docxRenderMode,
  setDocxRenderMode,
  liveData,
  customSheets,
  children,
  zoomLevel,
  setZoomLevel,
  pointerMode,
  setPointerMode,
  canUndo,
  canRedo,
  handleUndo,
  handleRedo,
  onSaveCurrentTemplate,
  autoSaveStatus,
  autoSaveLastSavedAt,
  isAutoSaving = false,
}) => {
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isDebugOverlayOpen, setIsDebugOverlayOpen] = useState(false);

  const effectiveDocs = useMemo(() => {
    return (documents && documents.length > 0)
      ? documents
      : (batchDocuments && batchDocuments.length > 0)
      ? batchDocuments
      : null;
  }, [documents, batchDocuments]);

  // Derive dynamic spatial page geometry from centralized PageGeometryCalculator
  const pageGeometry = useMemo(() => {
    return PageGeometryCalculator.calculate({
      pageSize: options.pageSize || customDocxTemplate?.pageSize || 'A4',
      orientation: options.orientation || customDocxTemplate?.orientation || 'PORTRAIT',
      margin: options.margin || customDocxTemplate?.margin || 'NORMAL',
      customMarginsMm: options.customMarginsMm,
      pageProperties: customDocxTemplate?.pageProperties || customDocxTemplate?.templateMeta?.pageProperties,
    });
  }, [
    options.pageSize,
    options.orientation,
    options.margin,
    options.customMarginsMm,
    customDocxTemplate,
  ]);

  const totalRecordsCount = liveData?.length || documents?.length || batchDocuments?.length || 0;

  return (
    <main className="flex-1 flex flex-col overflow-hidden relative universal-print-workbench print:static print:block print:w-full print:h-auto print:p-0 print:m-0 print:bg-white print:overflow-visible">
      {/* 1. Top Template Workbench Sub-Header (Visible when Custom Template is active) */}
      {customDocxTemplate && (
        <div className="px-4 py-2 bg-gradient-to-r from-[var(--accent-main)]/10 via-[var(--accent-main)]/5 to-transparent flex items-center justify-between gap-3 flex-wrap print:hidden select-none z-20">
          {/* Left: Template Name & Auto-save Badge */}
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <span className="w-2 h-2 rounded-full theme-bg-accent shadow-2xs shrink-0" />
            <span
              className="text-xs font-bold theme-text-primary truncate max-w-[200px] sm:max-w-[320px]"
              title={customDocxTemplate.name || 'Custom Template'}
            >
              {customDocxTemplate.name || 'Custom Template'}
            </span>
            {docxRenderMode === 'template' && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${isAutoSaving ? 'bg-amber-500 animate-spin' : 'bg-emerald-500 animate-pulse'}`} />
                <span>{isAutoSaving ? 'Saving...' : autoSaveStatus || 'Auto-saved'}</span>
              </span>
            )}
          </div>

          {/* Far Right: Mode Switcher Segment */}
          <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap">
            {/* Developer Layout Debug Inspector Button */}
            <button
              type="button"
              onClick={() => setIsDebugOverlayOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                isDebugOverlayOpen
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40 shadow-2xs font-bold'
                  : 'theme-bg-elevated theme-text-secondary hover:theme-text-primary border-slate-700/40'
              }`}
              title="Toggle Layout Debug Mode Inspector (Developer Tool)"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="font-mono text-[10.5px]">Debug Layout</span>
            </button>

            {/* Mode Switcher Segment (Template Design vs Generate N Document(s)) */}
            <div className="flex items-center p-0.5 rounded-lg theme-bg-elevated border theme-border shadow-2xs shrink-0">
              <button
                type="button"
                onClick={() => setDocxRenderMode('template')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  docxRenderMode === 'template'
                    ? 'theme-bg-accent-soft theme-accent shadow-2xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/50'
                }`}
                title="Edit and customize template design"
              >
                <span>Template Design</span>
              </button>

              <button
                type="button"
                onClick={() => setDocxRenderMode('all')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  docxRenderMode === 'all'
                    ? 'theme-bg-accent text-white shadow-xs font-bold'
                    : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub/50'
                }`}
                title="Generate all populated batch documents with live records"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>
                  {totalRecordsCount > 0
                    ? `Generate ${totalRecordsCount} ${totalRecordsCount === 1 ? 'Document' : 'Documents'}`
                    : 'Generate Documents'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Dedicated Rich Text Formatting Ribbon Strip (Above Canvas in Template Edit Mode) */}
      {customDocxTemplate && docxRenderMode === 'template' && (
        <div className="px-4 py-1.5 flex items-center justify-start sm:justify-center overflow-x-auto print:hidden select-none z-15 scrollbar-none">
          <DocxFormattingRibbon onInsertToken={undefined} />
        </div>
      )}

      {/* 3. Master Interactive Canvas Viewport */}
      <DocLabCanvasViewer
        pageSize={options.pageSize}
        orientation={options.orientation}
        margin={options.margin}
        density={options.density}
        colorMode={options.colorMode}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
        pointerMode={pointerMode}
        onPointerModeChange={setPointerMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      >
        {/* MODE A: Interactive Word (.docx) Template Editor */}
        {customDocxTemplate && docxRenderMode === 'template' ? (
          <ModeATemplateEditor
            customDocxTemplate={customDocxTemplate}
            setCustomDocxTemplate={setCustomDocxTemplate}
            updateCustomDocxTemplateWithHistory={updateCustomDocxTemplateWithHistory}
            options={options}
            docxStyles={docxStyles}
            isDebugOverlayOpen={isDebugOverlayOpen}
          />
        ) : customDocxTemplate ? (
          /* MODE D: Batch Generated Multi-Record Document View */
          <ModeDBatchGeneratedView
            docxLayoutPages={docxLayoutPages}
            mergedDocxPages={mergedDocxPages}
            pageGeometry={pageGeometry}
            options={options}
            customDocxTemplate={customDocxTemplate}
            docxStyles={docxStyles}
          />
        ) : effectiveDocs || (liveColumns && liveColumns.length > 0) ? (
          /* MODE E: Native Tabular Report View */
          <ModeETabularReportView
            title={title}
            subtitle={subtitle}
            liveMetaItems={liveMetaItems}
            handleMetaItemsChange={handleMetaItemsChange}
            options={options}
            updateOptionsWithHistory={updateOptionsWithHistory}
            liveColumns={liveColumns}
            visibleColumnKeys={visibleColumnKeys}
            isColumnMandatory={isColumnMandatory}
            isColumnRequired={isColumnRequired}
            requiredColumnKeys={requiredColumnKeys}
            visibleRowKeys={visibleRowKeys}
            isRowMandatory={isRowMandatory}
            isRowRequired={isRowRequired}
            requiredRowKeys={requiredRowKeys}
            getRowIdentifier={getRowIdentifier}
            liveSummaryMetrics={liveSummaryMetrics}
            footerRow={footerRow}
            footerRows={footerRows}
            paginationResult={paginationResult}
            effectiveDocs={effectiveDocs}
          />
        ) : (
          /* MODE F: External Custom JSX Sheet View & Fallback */
          <ModeFCustomSheetView
            customSheets={customSheets}
            children={children}
            title={title}
            subtitle={subtitle}
            liveMetaItems={liveMetaItems}
            handleMetaItemsChange={handleMetaItemsChange}
            options={options}
            updateOptionsWithHistory={updateOptionsWithHistory}
            pageGeometry={pageGeometry}
          />
        )}
      </DocLabCanvasViewer>

      {/* Save Canvas As Template Modal */}
      {isSaveModalOpen && onSaveCurrentTemplate && (
        <DocLabSaveModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={onSaveCurrentTemplate}
          totalRecordsCount={totalRecordsCount}
        />
      )}

      {/* Developer Internal Layout Debug Overlay */}
      <LayoutDebugOverlay
        isOpen={isDebugOverlayOpen}
        onClose={() => setIsDebugOverlayOpen(false)}
      />
    </main>
  );
};

export default DocLabWorkbench;
