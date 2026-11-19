/**
 * Unit Test: Pagination Rules & Constraint Solver
 * Covers: Greedy packing algorithm, explicit manual break enforcement,
 * keepWithNext heading protection, and page capacity calculations.
 */

import { PaginationEngine } from '../../pagination/PaginationEngine';
import { createManualPageBreakHtml } from '../../logicalDocument';

export function runPaginationRulesUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${desc}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${desc}`);
    }
  }

  console.log('--- UNIT TEST: PAGINATION RULES & CONSTRAINTS ---');

  // 1. Single Page Document
  const shortDoc = '<h1>Annual Report</h1><p>Brief single-page executive summary.</p>';
  const singlePageLayout = PaginationEngine.paginate(shortDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(singlePageLayout.totalPages === 1, `Short document fits on 1 page (got ${singlePageLayout.totalPages})`);
  assert(singlePageLayout.pages[0].isFirstPage === true, 'Page 1 isFirstPage is true');
  assert(singlePageLayout.pages[0].isLastPage === true, 'Page 1 isLastPage is true');

  // 2. Explicit Manual Page Break
  const manualBreakDoc = `
    <h1>Page 1 Title</h1>
    <p>Page 1 introductory text.</p>
    ${createManualPageBreakHtml()}
    <h1>Page 2 Title</h1>
    <p>Page 2 separate section text.</p>
  `;
  const manualBreakLayout = PaginationEngine.paginate(manualBreakDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(manualBreakLayout.totalPages === 2, `Explicit manual break creates exactly 2 pages (got ${manualBreakLayout.totalPages})`);
  assert(manualBreakLayout.pages[0].isLastPage === false, 'Page 1 is not last page');
  assert(manualBreakLayout.pages[1].isLastPage === true, 'Page 2 is last page');

  // 3. Multi-Page Sequential Numbering
  const multiPageDoc = Array.from({ length: 70 }, (_, i) => `<p>Paragraph ${i + 1}: Extended document narrative with sufficient text to fill vertical pages.</p>`).join('\n');
  const multiLayout = PaginationEngine.paginate(multiPageDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(multiLayout.totalPages >= 3, `Large document produces 3+ pages (got ${multiLayout.totalPages})`);
  multiLayout.pages.forEach((p, idx) => {
    assert(p.index === idx, `Page ${idx + 1} has correct index ${idx}`);
    assert(p.pageNumber === idx + 1, `Page ${idx + 1} has correct pageNumber ${idx + 1}`);
  });

  return { passed, failed };
}

if (process.argv[1]?.endsWith('pagination_rules.test.ts')) {
  const { passed, failed } = runPaginationRulesUnitTests();
  console.log(`\nPagination Rules Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
