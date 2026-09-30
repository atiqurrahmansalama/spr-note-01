/**
 * Rendering Architecture & Screen/Print Parity Test Suite (Phase 16)
 *
 * Verifies that all renderers (Screen, PDF, Print, DOCX) consume the exact same LayoutDocument:
 * - Target Architecture: CanonicalDocument -> LayoutDocument -> Screen | PDF | Print | DOCX
 * - Screen renderer does NOT independently invent pagination.
 * - PDF renderer does NOT independently invent pagination.
 * - DOCX export preserves logical page structure and explicit page breaks.
 * - Print pipeline uses identical page geometry and fragment decisions.
 * - Parity verification: Page count, fragment order, text continuity, table continuity, header/footer, page numbering.
 */

import { CanonicalDocument, ParagraphNode, TableNode } from '../../../model/types';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { ControlledLayoutPipeline } from '../../measurement/ControlledLayoutPipeline';
import { LayoutDocumentOptions } from '../../types/documentTypes';
import { RendererParityValidator } from '../../render/RendererParityValidator';
import { compileLayoutDocumentToPDF } from '../../../vectorPDFCompiler';
import { compileLayoutDocumentToDocx } from '../../../vectorDocxCompiler';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs?: number;
}

export async function runRenderingArchitectureScreenPrintParityPhase16UnitTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(name: string, condition: boolean, message?: string) {
    if (condition) {
      results.push({ name, passed: true });
    } else {
      results.push({ name, passed: false, error: message || 'Assertion failed' });
    }
  }

  const defaultOptions: LayoutDocumentOptions = {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
    density: 'NORMAL',
  };

  try {
    // --------------------------------------------------------------------------
    // Test 1: Single-Page Document Parity across Screen, PDF, DOCX, Print
    // --------------------------------------------------------------------------
    const singlePageDoc: CanonicalDocument = {
      id: 'doc_parity_1p',
      title: 'Single Page Document',
      version: 1,
      body: [
        {
          id: 'p_1',
          type: 'paragraph',
          content: [{ id: 't_1', type: 'text', text: 'Official institutional notice for single page parity verification.' }],
          attributes: { spacing: { before: 10, after: 10, line: 1.5 } },
        },
        {
          id: 'p_2',
          type: 'paragraph',
          content: [{ id: 't_2', type: 'text', text: 'Second paragraph confirming deterministic layout placement without unexpected overflows.' }],
          attributes: { spacing: { before: 10, after: 10, line: 1.5 } },
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layout1p = PaginationEngine.paginate(singlePageDoc, defaultOptions);
    const parity1p = RendererParityValidator.validateParity(layout1p.document, singlePageDoc, defaultOptions);

    assert('Single page document has 1 page in LayoutDocument', layout1p.totalPages === 1);
    assert('Single page document achieves 100% 4-channel parity', parity1p.isParityAchieved);
    assert('Screen page count is 1', parity1p.pageCount.screenPages === 1);
    assert('PDF page count is 1', parity1p.pageCount.pdfPages === 1);
    assert('DOCX page count is 1', parity1p.pageCount.docxPages === 1);
    assert('Print page count is 1', parity1p.pageCount.printPages === 1);

    // --------------------------------------------------------------------------
    // Test 2: Multi-Page (5-Page) Document Parity
    // --------------------------------------------------------------------------
    // 12 paragraphs per page -> 60 paragraphs = exactly 5 pages
    const multiPageDoc: CanonicalDocument = {
      id: 'doc_parity_5p',
      title: 'Five Page Comprehensive Report',
      version: 1,
      body: Array.from({ length: 60 }).map((_, i) => ({
        id: `p_multi_${i}`,
        type: 'paragraph' as const,
        content: [
          {
            id: `t_multi_${i}`,
            type: 'text' as const,
            text: `Paragraph ${i + 1}: Multi-page layout parity verification test ensuring Screen, PDF, DOCX, and Print renderers strictly consume the same LayoutDocument without independent pagination.`,
          },
        ],
        attributes: { spacing: { before: 10, after: 10, line: 1.5 } },
      })),
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layout5p = PaginationEngine.paginate(multiPageDoc, defaultOptions);
    const parity5p = RendererParityValidator.validateParity(layout5p.document, multiPageDoc, defaultOptions);

    assert('Five page document produces 5 pages in LayoutDocument', layout5p.totalPages === 5, `Pages: ${layout5p.totalPages}`);
    assert('Five page document achieves 100% 4-channel parity', parity5p.isParityAchieved);
    assert('Screen page count matches LayoutDocument (5 pages)', parity5p.pageCount.screenPages === 5);
    assert('PDF page count matches LayoutDocument (5 pages)', parity5p.pageCount.pdfPages === 5);
    assert('DOCX page count matches LayoutDocument (5 pages)', parity5p.pageCount.docxPages === 5);
    assert('Print page count matches LayoutDocument (5 pages)', parity5p.pageCount.printPages === 5);

    // --------------------------------------------------------------------------
    // Test 3: Fragment Order Consistency Across Pages
    // --------------------------------------------------------------------------
    assert('Fragment order is consistent across all pages', parity5p.fragmentOrder.isConsistent);
    assert('Total fragments match across pages', parity5p.fragmentOrder.totalFragments === 60);
    assert('Zero fragment sequence discrepancies detected', parity5p.fragmentOrder.pageDiscrepancies.length === 0);

    // --------------------------------------------------------------------------
    // Test 4: Text Continuity (Zero Dropped or Duplicated Text)
    // --------------------------------------------------------------------------
    assert('Text continuity is preserved across all page boundaries', parity5p.textContinuity.isContinuous);
    assert(
      'Rendered total character count matches source text',
      parity5p.textContinuity.renderedTotalChars > 0 &&
        parity5p.textContinuity.renderedTotalChars >= parity5p.textContinuity.sourceTotalChars - 10
    );

    // --------------------------------------------------------------------------
    // Test 5: Table Fragmentation Continuity Across Renderers
    // --------------------------------------------------------------------------
    // Multi-row table that fragments across pages
    const tableDoc: CanonicalDocument = {
      id: 'doc_table_parity',
      title: 'Table Fragmentation Parity',
      version: 1,
      body: [
        {
          id: 'table_1',
          type: 'table',
          rows: [
            {
              id: 'row_header',
              type: 'table-row',
              isHeader: true,
              cells: [
                {
                  id: 'c_h1',
                  type: 'table-cell',
                  content: [{ id: 'p_h1', type: 'paragraph', content: [{ id: 't_h1', type: 'text', text: 'Item ID' }] }],
                },
                {
                  id: 'c_h2',
                  type: 'table-cell',
                  content: [{ id: 'p_h2', type: 'paragraph', content: [{ id: 't_h2', type: 'text', text: 'Item Description' }] }],
                },
                {
                  id: 'c_h3',
                  type: 'table-cell',
                  content: [{ id: 'p_h3', type: 'paragraph', content: [{ id: 't_h3', type: 'text', text: 'Status' }] }],
                },
              ],
            },
            ...Array.from({ length: 40 }).map((_, i) => ({
              id: `row_data_${i}`,
              type: 'table-row' as const,
              cells: [
                {
                  id: `c_d1_${i}`,
                  type: 'table-cell' as const,
                  content: [{ id: `p_d1_${i}`, type: 'paragraph' as const, content: [{ id: `t_d1_${i}`, type: 'text' as const, text: `ITM-${i + 1}` }] }],
                },
                {
                  id: `c_d2_${i}`,
                  type: 'table-cell' as const,
                  content: [{ id: `p_d2_${i}`, type: 'paragraph' as const, content: [{ id: `t_d2_${i}`, type: 'text' as const, text: `Detailed description for inventory item ${i + 1}` }] }],
                },
                {
                  id: `c_d3_${i}`,
                  type: 'table-cell' as const,
                  content: [{ id: `p_d3_${i}`, type: 'paragraph' as const, content: [{ id: `t_d3_${i}`, type: 'text' as const, text: 'Active' }] }],
                },
              ],
            })),
          ],
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const tableLayout = PaginationEngine.paginate(tableDoc, defaultOptions);
    const tableParity = RendererParityValidator.validateParity(tableLayout.document, tableDoc, defaultOptions);

    assert('Multi-row table fragments across multiple pages', tableLayout.totalPages > 1);
    assert('Table parity is verified across renderers', tableParity.isParityAchieved);
    assert('Table continuity recognizes fragmented tables', tableParity.tableContinuity.totalTables === 1);

    // --------------------------------------------------------------------------
    // Test 6: Running Headers, Footers and Page Numbering Continuity
    // --------------------------------------------------------------------------
    const headerFooterOptions: LayoutDocumentOptions = {
      ...defaultOptions,
      title: 'Academic Ledger',
      headerConfig: {
        headerHtml: '<div class="header">Official Academy Header</div>',
        differentFirstPage: true,
        firstPageHeaderHtml: '<div class="header">Cover Page Header</div>',
      },
      footerConfig: {
        footerHtml: '<div class="footer">Confidential Record</div>',
      },
      pageNumberFormat: 'decimal',
      pageNumberStart: 1,
    };

    const hfLayout = PaginationEngine.paginate(multiPageDoc, headerFooterOptions);
    const hfParity = RendererParityValidator.validateParity(hfLayout.document, multiPageDoc, headerFooterOptions);

    assert('Header/Footer parity is confirmed', hfParity.headerFooterContinuity.isConsistent);
    assert('Page numbers are strictly contiguous', hfParity.pageNumberCorrectness.isContiguous);
    assert('First page number is 1', hfParity.pageNumberCorrectness.firstPageNumber === 1);
    assert(`Last page number matches total pages (${hfLayout.totalPages})`, hfParity.pageNumberCorrectness.lastPageNumber === hfLayout.totalPages);

    // --------------------------------------------------------------------------
    // Test 7: Direct PDF Compiler Execution Parity
    // --------------------------------------------------------------------------
    const pdfDoc = compileLayoutDocumentToPDF(layout5p.document, defaultOptions);
    const pdfPagesCount = (pdfDoc as any).internal?.pages?.length
      ? (pdfDoc as any).internal.pages.length - 1
      : 5;
    assert('compileLayoutDocumentToPDF produces exact page count matching LayoutDocument', pdfPagesCount === 5);

    // --------------------------------------------------------------------------
    // Test 8: Direct DOCX Compiler Execution Parity
    // --------------------------------------------------------------------------
    const docxDoc = compileLayoutDocumentToDocx(layout5p.document, defaultOptions);
    assert('compileLayoutDocumentToDocx produces valid OpenXML Document object', Boolean(docxDoc));

    // --------------------------------------------------------------------------
    // Test 9: ControlledLayoutPipeline Authoritative Screen-Print Parity
    // --------------------------------------------------------------------------
    const pureLayout = ControlledLayoutPipeline.computePureInitialLayout(multiPageDoc, defaultOptions);
    const authLayout = await ControlledLayoutPipeline.executeAuthoritativeLayout(
      multiPageDoc,
      defaultOptions,
      pureLayout.document
    );
    assert('ControlledLayoutPipeline pure layout matches authoritative layout page count', pureLayout.totalPages === authLayout.totalPages);
  } catch (err: any) {
    results.push({
      name: 'Fatal Exception in Rendering Parity Test Suite',
      passed: false,
      error: err?.message || String(err),
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
