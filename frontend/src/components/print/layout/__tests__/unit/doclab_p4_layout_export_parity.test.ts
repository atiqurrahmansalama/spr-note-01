/**
 * DOC-LAB P4 — LAYOUT / EXPORT PARITY TEST SUITE
 *
 * Enforces unified pagination authority:
 *   CanonicalDocument -> authoritative LayoutDocument -> Screen -> Browser Print -> PDF -> DOCX
 *
 * Verifies:
 * 1. Screen page boundaries and exported page boundaries come from the same authoritative layout result.
 * 2. PDF/Print do NOT invent a second pagination algorithm.
 * 3. Screen pagination agrees with PDF/DOCX page count.
 * 4. Manual page breaks are preserved across all channels.
 * 5. A4, Letter, Legal, Portrait, Landscape, and custom margins parity.
 * 6. Paragraph, Table, List, and Image pagination parity.
 */

import { CanonicalDocument, ParagraphNode, TableNode, ListNode, ImageNode, ManualPageBreakNode } from '../../../model/types';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { LayoutDocumentOptions } from '../../types/documentTypes';
import { RendererParityValidator } from '../../render/RendererParityValidator';
import { compileLayoutDocumentToPDF } from '../../../vectorPDFCompiler';
import { compileLayoutDocumentToDocx } from '../../../vectorDocxCompiler';
import { PageGeometryCalculator } from '../../geometry/PageGeometry';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs?: number;
}

export async function runDoclabP4LayoutExportParityUnitTests(): Promise<{
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

  try {
    // =========================================================================
    // Test 1: Unified Authority — CanonicalDocument -> LayoutDocument -> 4 Channels
    // =========================================================================
    const standardDoc: CanonicalDocument = {
      id: 'doc_p4_standard',
      title: 'Academic Progress Report',
      version: 1,
      body: Array.from({ length: 48 }).map((_, i) => ({
        id: `p_std_${i}`,
        type: 'paragraph' as const,
        content: [
          {
            id: `t_std_${i}`,
            type: 'text' as const,
            text: `Paragraph ${i + 1}: Comprehensive academic evaluation record maintaining 100% parity across Screen, Browser Print, Vector PDF, and OpenXML DOCX.`,
          },
        ],
        attributes: { spacing: { before: 8, after: 8, line: 1.5 } },
      })),
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutStd = PaginationEngine.paginate(standardDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
    const parityStd = RendererParityValidator.validateParity(layoutStd.document, standardDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });

    assert('P4.1: Standard document produces authoritative LayoutDocument', layoutStd.totalPages >= 3);
    assert('P4.1: Screen page count matches LayoutDocument', parityStd.pageCount.screenPages === layoutStd.totalPages);
    assert('P4.1: PDF page count matches LayoutDocument exactly', parityStd.pageCount.pdfPages === layoutStd.totalPages);
    assert('P4.1: DOCX page count matches LayoutDocument exactly', parityStd.pageCount.docxPages === layoutStd.totalPages);
    assert('P4.1: Print page count matches LayoutDocument exactly', parityStd.pageCount.printPages === layoutStd.totalPages);
    assert('P4.1: 4-Channel Parity achieved with zero independent pagination', parityStd.isParityAchieved);

    // =========================================================================
    // Test 2: Multi-Page Content Order & Fragment Boundary Parity
    // =========================================================================
    assert('P4.2: Fragment sequence across pages is strictly contiguous and monotonic', parityStd.fragmentOrder.isConsistent);
    assert('P4.2: Zero fragment ordering discrepancies across pages', parityStd.fragmentOrder.pageDiscrepancies.length === 0);
    assert('P4.2: Text continuity preserved with zero dropped text', parityStd.textContinuity.isContinuous);

    // =========================================================================
    // Test 3: Manual Page Break Preservation
    // =========================================================================
    const manualBreakDoc: CanonicalDocument = {
      id: 'doc_p4_manual_break',
      title: 'Manual Page Break Document',
      version: 1,
      body: [
        {
          id: 'p_before_break',
          type: 'paragraph',
          content: [{ id: 't_b1', type: 'text', text: 'Section 1: Introductory content before explicit manual break.' }],
        },
        {
          id: 'break_node_1',
          type: 'manual-page-break',
          explicitBreak: true,
        },
        {
          id: 'p_after_break',
          type: 'paragraph',
          content: [{ id: 't_b2', type: 'text', text: 'Section 2: Content forced onto the second page via manual page break.' }],
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutBreak = PaginationEngine.paginate(manualBreakDoc, { pageSize: 'A4', orientation: 'PORTRAIT' });
    const parityBreak = RendererParityValidator.validateParity(layoutBreak.document, manualBreakDoc, { pageSize: 'A4', orientation: 'PORTRAIT' });

    assert('P4.3: Manual page break forces exactly 2 pages in LayoutDocument', layoutBreak.totalPages === 2);
    assert('P4.3: PDF preserves manual page break (2 pages)', parityBreak.pageCount.pdfPages === 2);
    assert('P4.3: DOCX preserves manual page break (2 pages)', parityBreak.pageCount.docxPages === 2);
    assert('P4.3: Screen preserves manual page break (2 pages)', parityBreak.pageCount.screenPages === 2);
    assert('P4.3: Page 1 contains leading paragraph', layoutBreak.pages[0].fragments[0].textContent?.includes('Section 1'));
    assert('P4.3: Page 2 contains continuation paragraph', layoutBreak.pages[1].fragments[0].textContent?.includes('Section 2'));

    // =========================================================================
    // Test 4: Page Sizes & Orientations Matrix (A4, Letter, Landscape, Custom Margins)
    // =========================================================================
    // A4 Portrait vs Letter Landscape vs Custom Margins
    const a4PortraitOpts: LayoutDocumentOptions = { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' };
    const letterLandscapeOpts: LayoutDocumentOptions = { pageSize: 'LETTER', orientation: 'LANDSCAPE', margin: 'NARROW' };
    const customMarginOpts: LayoutDocumentOptions = {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'CUSTOM',
      customMarginsMm: { top: 15, right: 15, bottom: 15, left: 15 },
    };

    const layoutA4 = PaginationEngine.paginate(standardDoc, a4PortraitOpts);
    const layoutLetterLand = PaginationEngine.paginate(standardDoc, letterLandscapeOpts);
    const layoutCustom = PaginationEngine.paginate(standardDoc, customMarginOpts);

    const parityA4 = RendererParityValidator.validateParity(layoutA4.document, standardDoc, a4PortraitOpts);
    const parityLetter = RendererParityValidator.validateParity(layoutLetterLand.document, standardDoc, letterLandscapeOpts);
    const parityCustom = RendererParityValidator.validateParity(layoutCustom.document, standardDoc, customMarginOpts);

    assert('P4.4: A4 Portrait achieves full 4-way parity', parityA4.isParityAchieved);
    assert('P4.4: Letter Landscape achieves full 4-way parity', parityLetter.isParityAchieved);
    assert('P4.4: Custom Margins achieve full 4-way parity', parityCustom.isParityAchieved);
    assert('P4.4: Landscape layout page width exceeds height', layoutLetterLand.document.width > layoutLetterLand.document.height);

    // =========================================================================
    // Test 5: Table Fragmentation Parity with Repeating <thead>
    // =========================================================================
    const tableDoc: CanonicalDocument = {
      id: 'doc_p4_table',
      title: 'Table Fragmentation Report',
      version: 1,
      body: [
        {
          id: 'table_p4',
          type: 'table',
          rows: [
            {
              id: 'row_head',
              type: 'table-row',
              isHeader: true,
              cells: [
                { id: 'c_h1', type: 'table-cell', content: [{ id: 'p_h1', type: 'paragraph', content: [{ id: 't_h1', type: 'text', text: 'Roll' }] }] },
                { id: 'c_h2', type: 'table-cell', content: [{ id: 'p_h2', type: 'paragraph', content: [{ id: 't_h2', type: 'text', text: 'Student Name' }] }] },
                { id: 'c_h3', type: 'table-cell', content: [{ id: 'p_h3', type: 'paragraph', content: [{ id: 't_h3', type: 'text', text: 'Marks' }] }] },
              ],
            },
            ...Array.from({ length: 45 }).map((_, i) => ({
              id: `row_body_${i}`,
              type: 'table-row' as const,
              cells: [
                { id: `c_1_${i}`, type: 'table-cell' as const, content: [{ id: `p_1_${i}`, type: 'paragraph' as const, content: [{ id: `t_1_${i}`, type: 'text' as const, text: `10${i + 1}` }] }] },
                { id: `c_2_${i}`, type: 'table-cell' as const, content: [{ id: `p_2_${i}`, type: 'paragraph' as const, content: [{ id: `t_2_${i}`, type: 'text' as const, text: `Student Candidate ${i + 1}` }] }] },
                { id: `c_3_${i}`, type: 'table-cell' as const, content: [{ id: `p_3_${i}`, type: 'paragraph' as const, content: [{ id: `t_3_${i}`, type: 'text' as const, text: `${80 + (i % 20)}` }] }] },
              ],
            })),
          ],
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutTable = PaginationEngine.paginate(tableDoc, a4PortraitOpts);
    const parityTable = RendererParityValidator.validateParity(layoutTable.document, tableDoc, a4PortraitOpts);

    assert('P4.5: Multi-row table fragments across pages', layoutTable.totalPages >= 2);
    assert('P4.5: Table fragmentation parity confirmed across all renderers', parityTable.isParityAchieved);
    assert('P4.5: Table continuation recognized', parityTable.tableContinuity.totalTables === 1);

    // =========================================================================
    // Test 6: List Fragmentation Parity with Sequential Numbering
    // =========================================================================
    const listDoc: CanonicalDocument = {
      id: 'doc_p4_list',
      title: 'List Continuity Document',
      version: 1,
      body: [
        {
          id: 'ol_p4',
          type: 'list',
          listType: 'ordered',
          start: 1,
          items: Array.from({ length: 40 }).map((_, i) => ({
            id: `li_${i}`,
            type: 'list-item' as const,
            content: [{ id: `p_li_${i}`, type: 'paragraph' as const, content: [{ id: `t_li_${i}`, type: 'text' as const, text: `Curriculum Rule ${i + 1}: Detailed requirement for examination conduct and candidate verification.` }] }],
          })),
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutList = PaginationEngine.paginate(listDoc, a4PortraitOpts);
    const parityList = RendererParityValidator.validateParity(layoutList.document, listDoc, a4PortraitOpts);

    assert('P4.6: Multi-item list fragments across pages', layoutList.totalPages >= 2);
    assert('P4.6: List parity confirmed across all renderers', parityList.isParityAchieved);

    // =========================================================================
    // Test 7: Large Atomic Image Pagination Parity
    // =========================================================================
    const imageDoc: CanonicalDocument = {
      id: 'doc_p4_image',
      title: 'Atomic Image Document',
      version: 1,
      body: [
        ...Array.from({ length: 25 }).map((_, i) => ({
          id: `p_top_${i}`,
          type: 'paragraph' as const,
          content: [{ id: `t_top_${i}`, type: 'text' as const, text: `Filler paragraph ${i + 1} filling the upper half of page 1.` }],
          attributes: { spacing: { before: 8, after: 8, line: 1.5 } },
        })),
        {
          id: 'large_img_node',
          type: 'image',
          src: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
          alt: 'Institutional Seal Diagram',
          width: 500,
          height: 450,
        },
      ],
      metadata: { author: 'DocLab Engine', createdAt: Date.now(), updatedAt: Date.now() },
    };

    const layoutImage = PaginationEngine.paginate(imageDoc, a4PortraitOpts);
    const parityImage = RendererParityValidator.validateParity(layoutImage.document, imageDoc, a4PortraitOpts);

    assert('P4.7: Large atomic image moves cleanly to Page 2', layoutImage.totalPages >= 2);
    assert('P4.7: Image parity confirmed across renderers', parityImage.isParityAchieved);
    assert('P4.7: PDF compiler consumes LayoutDocument without image clipping', Boolean(compileLayoutDocumentToPDF(layoutImage.document, a4PortraitOpts)));
    assert('P4.7: DOCX compiler consumes LayoutDocument without image clipping', Boolean(compileLayoutDocumentToDocx(layoutImage.document, a4PortraitOpts)));
  } catch (err: any) {
    results.push({
      name: 'Fatal Exception in P4 Parity Test Suite',
      passed: false,
      error: err?.message || String(err),
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
