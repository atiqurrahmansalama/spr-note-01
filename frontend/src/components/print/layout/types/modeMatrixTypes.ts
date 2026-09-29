/**
 * DocLab Mode Matrix Architecture & Types
 * 
 * Formalizes the authoritative 6-mode architectural matrix for Universal Print Studio & DocLab:
 * 
 * MODE A — Template Editing (Continuous single-host editable canvas, live reflow projection)
 * MODE B — Read-Only Preview (Pre-paginated layout document, high-performance virtualization)
 * MODE C — Generated Single Document (Data-merged CanonicalDocument AST, downstream pagination)
 * MODE D — Batch Generated Documents (BatchDocumentPackage with independent AST pagination)
 * MODE E — Native Tabular Report (Explicit row-based ledger reporting pipeline)
 * MODE F — External Custom JSX Sheet (Dedicated custom sheet rendering isolated from freeform engine)
 */

import { CanonicalDocument, BatchDocumentPackage } from '../../model/types';
import { LayoutDocument, PaginationEngineResult } from '../types/paginationTypes';
import { LayoutDocumentOptions } from '../types/documentTypes';
import { PrintPaginationResult, PrintColumn, PrintMetaItem, PrintSummaryMetric } from '../../types';

export type DocLabModeId =
  | 'MODE_A_TEMPLATE_EDITING'
  | 'MODE_B_READONLY_PREVIEW'
  | 'MODE_C_GENERATED_SINGLE'
  | 'MODE_D_BATCH_GENERATED'
  | 'MODE_E_TABULAR_REPORT'
  | 'MODE_F_CUSTOM_JSX_SHEET';

export interface DocLabModeDefinition {
  id: DocLabModeId;
  name: string;
  isEditable: boolean;
  isInteractive: boolean;
  paginationSubsystem: 'PaginationEngine' | 'NativeTabularPagination' | 'usePrintPagination' | 'None';

  renderingSubsystem:
    | 'PaginatedDocumentEditor'
    | 'LayoutDocumentRenderer'
    | 'LayoutPageRenderer'
    | 'DocLabTableRenderer'
    | 'CustomJsxContainer';
  persistenceFormat: 'CanonicalDocument' | 'BatchDocumentPackage' | 'TabularConfig' | 'CustomJSX';
  virtualizationPolicy: 'Disabled' | 'ViewportPolicy' | 'NotApplicable';
  description: string;
}

export const DOCLAB_MODE_MATRIX: Record<DocLabModeId, DocLabModeDefinition> = {
  MODE_A_TEMPLATE_EDITING: {
    id: 'MODE_A_TEMPLATE_EDITING',
    name: 'Mode A: Template Editing',
    isEditable: true,
    isInteractive: true,
    paginationSubsystem: 'PaginationEngine',
    renderingSubsystem: 'PaginatedDocumentEditor',
    persistenceFormat: 'CanonicalDocument',
    virtualizationPolicy: 'Disabled',
    description:
      'Continuous single-host editable document. User edits in real-time with live layout reflow and exact visual sheet projections.',
  },

  MODE_B_READONLY_PREVIEW: {
    id: 'MODE_B_READONLY_PREVIEW',
    name: 'Mode B: Read-Only Preview',
    isEditable: false,
    isInteractive: false,
    paginationSubsystem: 'PaginationEngine',
    renderingSubsystem: 'LayoutDocumentRenderer',
    persistenceFormat: 'CanonicalDocument',
    virtualizationPolicy: 'ViewportPolicy',
    description:
      'High-performance read-only preview of pre-paginated LayoutDocuments with scalable viewport virtualization for 100+ pages at 60 FPS.',
  },

  MODE_C_GENERATED_SINGLE: {
    id: 'MODE_C_GENERATED_SINGLE',
    name: 'Mode C: Generated Single Document',
    isEditable: false,
    isInteractive: false,
    paginationSubsystem: 'PaginationEngine',
    renderingSubsystem: 'LayoutDocumentRenderer',
    persistenceFormat: 'CanonicalDocument',
    virtualizationPolicy: 'ViewportPolicy',
    description:
      'ERP data merged into a single CanonicalDocument AST, then paginated downstream by PaginationEngine for preview, printing, or vector export.',
  },

  MODE_D_BATCH_GENERATED: {
    id: 'MODE_D_BATCH_GENERATED',
    name: 'Mode D: Batch Generated Documents',
    isEditable: false,
    isInteractive: false,
    paginationSubsystem: 'PaginationEngine',
    renderingSubsystem: 'LayoutDocumentRenderer',
    persistenceFormat: 'BatchDocumentPackage',
    virtualizationPolicy: 'ViewportPolicy',
    description:
      'Multi-record batch generation using typed BatchDocumentPackage. Each record AST is paginated independently downstream without page HTML string arrays.',
  },

  MODE_E_TABULAR_REPORT: {
    id: 'MODE_E_TABULAR_REPORT',
    name: 'Mode E: Native Tabular Report',
    isEditable: false,
    isInteractive: true,
    paginationSubsystem: 'usePrintPagination',
    renderingSubsystem: 'DocLabTableRenderer',
    persistenceFormat: 'TabularConfig',
    virtualizationPolicy: 'Disabled',
    description:
      'Discrete row-based enterprise ledger reporting. Uses dedicated mathematical row pagination without freeform HTML fragmentation bleeding.',
  },

  MODE_F_CUSTOM_JSX_SHEET: {
    id: 'MODE_F_CUSTOM_JSX_SHEET',
    name: 'Mode F: External Custom JSX Sheet',
    isEditable: false,
    isInteractive: true,
    paginationSubsystem: 'None',
    renderingSubsystem: 'CustomJsxContainer',
    persistenceFormat: 'CustomJSX',
    virtualizationPolicy: 'Disabled',
    description:
      'Dedicated custom React JSX sheets (e.g. customized institutional ID cards, certificates) isolated from the freeform document engine.',
  },
};
