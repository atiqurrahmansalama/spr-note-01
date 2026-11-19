/**
 * Table Fragmentation Engine Test Suite (Phase 48)
 *
 * Comprehensive tests for Requirement 20: TABLE FRAGMENTATION
 *
 * Verifies:
 * 1. Measure actual table rows (variable row heights, zero fixed 36px assumptions)
 * 2. Repeat THEAD on continuation pages with data-table-continuation="true"
 * 3. Preserve colspan, rowspan, cell formatting, colgroup, and column widths
 * 4. Keep a row together when appropriate (keep-together, print-avoid-break, page-break-inside: avoid)
 * 5. Allow oversized rows / cell content to fragment across page boundaries
 * 6. Never duplicate table data or repeated THEAD in canonical storage
 * 7. Repeated header is 100% runtime continuation behavior
 */

import { TableMeasurement } from '../../measurement/TableMeasurement';
import { TableFragmenter } from '../../fragmentation/TableFragmenter';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { HtmlImporter } from '../../../model/serialization/htmlImporter';
import { HtmlExporter } from '../../../model/serialization/htmlExporter';
import { EditorSerializer } from '../../editor/EditorSerializer';
import { DocumentFactory } from '../../../model/documentFactory';
import { TableNode } from '../../../model/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

export function runTableFragmentationEngineUnitTests(): { passed: number; failed: number } {
  console.log('--- UNIT TEST: TABLE FRAGMENTATION ENGINE (PHASE 48) ---');
  let passed = 0;
  let failed = 0;

  // =========================================================================
  // TEST 1: Variable row height measurement without fixed 36px assumptions
  // =========================================================================
  try {
    const tableHtml = `
      <table style="width: 100%;">
        <thead>
          <tr style="height: 44px;">
            <th>ID</th>
            <th>Description</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 32px;">
            <td>1</td>
            <td>Short item</td>
            <td>$10.00</td>
          </tr>
          <tr style="height: 96px;">
            <td>2</td>
            <td>Long multi-line detailed item description spanning multiple lines of text in a single row</td>
            <td>$50.00</td>
          </tr>
          <tr style="height: 28px;">
            <td>3</td>
            <td>Another short item</td>
            <td>$15.00</td>
          </tr>
        </tbody>
      </table>
    `;

    let tableEl: HTMLTableElement;
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = tableHtml.trim();
      tableEl = div.querySelector('table') as HTMLTableElement;
    } else {
      tableEl = { rawHtml: tableHtml } as any;
    }

    const geometry = TableMeasurement.measureTable(tableEl, { containerWidth: 600, fontSizePx: 14 });

    assert(geometry.headerRows.length === 1, 'Header rows count is 1');
    assert(geometry.headerRows[0].height === 44, 'Header height is exactly measured as 44px');
    assert(geometry.dataRows.length === 3, 'Data rows count is 3');
    assert(geometry.dataRows[0].height === 32, 'Data row 1 height is 32px (not fixed 36px)');
    assert(geometry.dataRows[1].height === 96, 'Data row 2 height is 96px (variable tall row)');
    assert(geometry.dataRows[2].height === 28, 'Data row 3 height is 28px');
    assert(geometry.totalHeight === 44 + 32 + 96 + 28, 'Total height equals sum of variable row heights');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Variable row height measurement failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 2: Break opportunities based on dynamic row boundaries
  // =========================================================================
  try {
    const tableHtml = `
      <table>
        <thead><tr style="height: 40px;"><th>Col</th></tr></thead>
        <tbody>
          <tr style="height: 30px;"><td>Row 1</td></tr>
          <tr style="height: 50px;"><td>Row 2</td></tr>
          <tr style="height: 40px;"><td>Row 3</td></tr>
        </tbody>
      </table>
    `;

    let tableEl: HTMLTableElement;
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = tableHtml.trim();
      tableEl = div.querySelector('table') as HTMLTableElement;
    } else {
      tableEl = { rawHtml: tableHtml } as any;
    }

    const geometry = TableMeasurement.measureTable(tableEl, { containerWidth: 600 });
    const breaks = TableMeasurement.generateTableBreakOpportunities(geometry);

    assert(breaks.length === 3, '3 break opportunities generated for 3 data rows');
    assert(breaks[0].offsetY === 70, 'Break 1 at offsetY 70 (40 + 30)');
    assert(breaks[1].offsetY === 120, 'Break 2 at offsetY 120 (40 + 30 + 50)');
    assert(breaks[2].offsetY === 160, 'Break 3 at offsetY 160 (40 + 30 + 50 + 40)');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Table break opportunities failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 3: Repeat THEAD with data-table-continuation="true" on subsequent fragments
  // =========================================================================
  try {
    const tableHtml = `
      <table class="report-table" style="width: 100%; border: 1px solid #ccc;">
        <thead>
          <tr style="height: 40px; background-color: #2563eb; color: #ffffff;">
            <th style="width: 20%;">Student ID</th>
            <th style="width: 50%;">Name</th>
            <th style="width: 30%;">GPA</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 35px;"><td>S01</td><td>Alice</td><td>3.9</td></tr>
          <tr style="height: 35px;"><td>S02</td><td>Bob</td><td>3.8</td></tr>
          <tr style="height: 35px;"><td>S03</td><td>Charlie</td><td>3.7</td></tr>
          <tr style="height: 35px;"><td>S04</td><td>David</td><td>3.6</td></tr>
        </tbody>
      </table>
    `;

    const split = TableFragmenter.splitTable(tableHtml, 115, { containerWidth: 600 });

    assert(split.isSplit === true, 'Table split occurred across pages');
    assert(split.rowsOnFirstPage === 2, '2 data rows placed on first page');
    assert(split.remainingRowsCount === 2, '2 data rows placed on continuation page');

    assert(split.firstFragmentHtml.includes('Student ID'), 'First fragment contains header');
    assert(split.firstFragmentHtml.includes('Alice'), 'First fragment contains Row 1 (Alice)');
    assert(split.firstFragmentHtml.includes('Bob'), 'First fragment contains Row 2 (Bob)');
    assert(!split.firstFragmentHtml.includes('Charlie'), 'First fragment does not contain Row 3 (Charlie)');

    assert(split.remainingFragmentHtml !== null, 'Remaining fragment exists');
    assert(split.remainingFragmentHtml!.includes('data-table-continuation="true"'), 'Continuation fragment marked with data-table-continuation="true"');
    assert(split.remainingFragmentHtml!.includes('<thead>'), 'Continuation fragment contains repeated <thead>');
    assert(split.remainingFragmentHtml!.includes('Student ID'), 'Continuation fragment preserves header text');
    assert(split.remainingFragmentHtml!.includes('background-color: #2563eb'), 'Continuation fragment preserves header styling');
    assert(split.remainingFragmentHtml!.includes('Charlie'), 'Continuation fragment contains Row 3 (Charlie)');
    assert(split.remainingFragmentHtml!.includes('David'), 'Continuation fragment contains Row 4 (David)');
    assert(!split.remainingFragmentHtml!.includes('Alice'), 'Continuation fragment does not repeat Row 1');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Repeated THEAD continuation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 4: Colgroup, Column Widths, Colspan, and Cell Formatting Preservation
  // =========================================================================
  try {
    const tableHtml = `
      <table class="styled-grid" style="width: 100%;">
        <colgroup>
          <col style="width: 25%;">
          <col style="width: 50%;">
          <col style="width: 25%;">
        </colgroup>
        <thead>
          <tr style="height: 40px; background-color: #1e293b; color: #ffffff;">
            <th colspan="2">Merged Header 1-2</th>
            <th>Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr style="height: 40px;">
            <td style="color: red; font-weight: bold;">Cell A1</td>
            <td style="color: blue;">Cell B1</td>
            <td>Cell C1</td>
          </tr>
          <tr style="height: 40px;">
            <td colspan="3" style="background-color: #fef08a;">Full Span Row 2</td>
          </tr>
        </tbody>
      </table>
    `;

    const split = TableFragmenter.splitTable(tableHtml, 85); // header (40) + row 1 (40) = 80px

    assert(split.isSplit === true, 'Table split into fragments');
    assert(split.firstFragmentHtml.includes('<colgroup>'), 'First fragment preserves colgroup');
    assert(split.firstFragmentHtml.includes('width: 25%'), 'First fragment preserves col width 25%');
    assert(split.firstFragmentHtml.includes('width: 50%'), 'First fragment preserves col width 50%');
    assert(split.firstFragmentHtml.includes('colspan="2"'), 'First fragment preserves colspan="2"');
    assert(split.firstFragmentHtml.includes('color: red'), 'First fragment preserves cell styling color: red');
    assert(split.firstFragmentHtml.includes('font-weight: bold'), 'First fragment preserves font-weight: bold');

    assert(split.remainingFragmentHtml!.includes('<colgroup>'), 'Continuation fragment preserves colgroup');
    assert(split.remainingFragmentHtml!.includes('width: 25%'), 'Continuation fragment preserves col width 25%');
    assert(split.remainingFragmentHtml!.includes('width: 50%'), 'Continuation fragment preserves col width 50%');
    assert(split.remainingFragmentHtml!.includes('colspan="3"'), 'Continuation fragment preserves colspan="3"');
    assert(split.remainingFragmentHtml!.includes('background-color: #fef08a'), 'Continuation fragment preserves background-color');
    assert(split.remainingFragmentHtml!.includes('Full Span Row 2'), 'Continuation fragment contains Row 2');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Formatting and colgroup preservation failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 5: Row Keep-Together Constraints
  // =========================================================================
  try {
    const tableHtml = `
      <table>
        <thead><tr style="height: 40px;"><th>Head</th></tr></thead>
        <tbody>
          <tr style="height: 30px;"><td>Row 1</td></tr>
          <tr class="keep-together" style="height: 40px;"><td>Row 2 (Keep)</td></tr>
          <tr style="height: 30px;"><td>Row 3</td></tr>
        </tbody>
      </table>
    `;

    const split = TableFragmenter.splitTable(tableHtml, 90); // 40 + 30 = 70 fits, Row 2 (40) cannot fit (70+40=110 > 90)

    assert(split.isSplit === true, 'Table split');
    assert(split.rowsOnFirstPage === 1, 'Row 1 placed on first page');
    assert(split.firstFragmentHtml.includes('Row 1'), 'First page has Row 1');
    assert(!split.firstFragmentHtml.includes('Row 2'), 'First page does not have Row 2');
    assert(split.remainingFragmentHtml!.includes('Row 2 (Keep)'), 'Row 2 moved intact to continuation page');
    assert(split.remainingFragmentHtml!.includes('Row 3'), 'Row 3 on continuation page');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Row keep-together failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 6: Oversized Row Cell Content Splitting
  // =========================================================================
  try {
    const longCellText =
      'This is an exceptionally long paragraph inside a single table row that extends across many lines. ' +
      'It describes detailed enterprise audit logs, transaction histories, compliance standards, and multi-tenant isolation policies. ' +
      'When this row is the first row on the page and cannot fit in its entirety, the cell text fragments across pages.';

    const tableHtml = `
      <table>
        <thead><tr style="height: 40px;"><th>Header</th></tr></thead>
        <tbody>
          <tr><td>${longCellText}</td></tr>
        </tbody>
      </table>
    `;

    const split = TableFragmenter.splitTable(tableHtml, 100);

    assert(split.isSplit === true, 'Oversized table row split');
    assert(split.firstFragmentHtml.includes('This is an exceptionally long'), 'First fragment contains beginning text');
    assert(split.remainingFragmentHtml!.includes('data-table-continuation="true"'), 'Continuation fragment has continuation marker');
    assert(split.remainingFragmentHtml!.includes('<thead>'), 'Continuation fragment repeats thead');
    assert(split.remainingFragmentHtml!.includes('multi-tenant isolation policies'), 'Continuation fragment contains trailing text');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Oversized row cell content splitting failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 7: Canonical Storage Invariants (Zero Duplication & Single THEAD)
  // =========================================================================
  try {
    const originalTable = `
      <table id="student_scores" class="grade-table">
        <thead>
          <tr style="height: 40px;"><th>Student</th><th>Score</th></tr>
        </thead>
        <tbody>
          <tr style="height: 40px;"><td>Student 1</td><td>95</td></tr>
          <tr style="height: 40px;"><td>Student 2</td><td>88</td></tr>
          <tr style="height: 40px;"><td>Student 3</td><td>76</td></tr>
          <tr style="height: 40px;"><td>Student 4</td><td>92</td></tr>
          <tr style="height: 40px;"><td>Student 5</td><td>85</td></tr>
          <tr style="height: 40px;"><td>Student 6</td><td>90</td></tr>
        </tbody>
      </table>
    `;

    const paginated = PaginationEngine.paginate(originalTable, {
      paperSize: 'custom',
      customWidthMm: 210,
      customHeightMm: 80,
    });

    assert(paginated.pages.length >= 2, 'Paginated across 2+ pages');

    const renderedHtml = paginated.pages.map((p) => p.fragments.map((f) => f.htmlContent).join('\n')).join('\n');
    const canonicalDoc = EditorSerializer.extractCanonicalDocumentFromEditor(renderedHtml);

    const tableNodes = canonicalDoc.body.filter((b) => b.type === 'table') as TableNode[];
    assert(tableNodes.length === 1, 'Canonical AST contains exactly ONE TableNode');

    const table = tableNodes[0];
    const headerRows = table.rows.filter((r) => r.isHeader);
    const dataRows = table.rows.filter((r) => !r.isHeader);

    assert(headerRows.length === 1, 'Canonical table has exactly 1 header row (repeated THEAD removed)');
    assert(dataRows.length === 6, 'Canonical table has exactly 6 data rows (zero duplicated rows)');

    const cleanHtml = HtmlExporter.exportToHtml(canonicalDoc);
    const theadCount = (cleanHtml.match(/<thead/gi) || []).length;
    assert(theadCount === 1, 'Clean exported HTML has exactly 1 <thead>');
    assert(!cleanHtml.includes('data-table-continuation'), 'Clean exported HTML has no runtime continuation marker');
    passed++;
  } catch (err: any) {
    console.error('  ✗ Canonical storage invariants failed:', err.message);
    failed++;
  }

  // =========================================================================
  // TEST 8: AST TableNode Splitting and Merging
  // =========================================================================
  try {
    const tableAST: TableNode = DocumentFactory.createTable({
      id: 'table_ast_1',
      rows: [
        DocumentFactory.createTableRow({
          isHeader: true,
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Item')] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Price')] })] }),
          ],
        }),
        DocumentFactory.createTableRow({
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Apple')] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('$1')] })] }),
          ],
        }),
        DocumentFactory.createTableRow({
          cells: [
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Banana')] })] }),
            DocumentFactory.createTableCell({ content: [DocumentFactory.createParagraph({ content: [DocumentFactory.createText('$2')] })] }),
          ],
        }),
      ],
    });

    const splitAST = TableFragmenter.splitTableNode(tableAST, 70);
    assert(splitAST.isSplit === true, 'AST TableNode split');
    assert(splitAST.firstFragmentNode?.rows.length === 2, 'First fragment AST has 1 header + 1 data row');
    assert(splitAST.remainingFragmentNode?.rows.length === 2, 'Continuation fragment AST has 1 repeated header + 1 data row');

    const combinedBlocks = [splitAST.firstFragmentNode!, splitAST.remainingFragmentNode!];
    const merged = HtmlImporter.mergeConsecutiveFragments(combinedBlocks) as TableNode[];

    assert(merged.length === 1, 'Merged back into 1 TableNode');
    assert(merged[0].rows.length === 3, 'Merged TableNode has 3 rows (1 header + 2 data rows)');
    assert(merged[0].rows.filter((r) => r.isHeader).length === 1, 'Only 1 header row preserved');
    passed++;
  } catch (err: any) {
    console.error('  ✗ AST TableNode splitting and merging failed:', err.message);
    failed++;
  }

  console.log(`Phase 48 Results: ${passed} Passed, ${failed} Failed`);
  return { passed, failed };
}
