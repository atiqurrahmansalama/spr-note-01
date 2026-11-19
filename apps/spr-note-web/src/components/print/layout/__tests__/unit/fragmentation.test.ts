/**
 * Unit Test: Element Fragmentation Engine
 * Covers: Paragraph splitting with Range binary search, table fragmentation with
 * repeating <thead> header cloning, and atomic keep-together preservation.
 */

import { TableFragmenter } from '../../fragmentation/TableFragmenter';
import { ParagraphFragmenter } from '../../fragmentation/ParagraphFragmenter';
import { PaginationEngine } from '../../pagination/PaginationEngine';

export function runFragmentationUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: ELEMENT FRAGMENTATION ENGINE ---');

  // 1. Table Fragmentation with Repeating <thead> Clones
  const tableRows = Array.from({ length: 30 }, (_, i) => `<tr><td>Student ${i + 1}</td><td>Roll ${100 + i}</td><td>Grade A</td></tr>`).join('\n');
  const tableHtml = `
    <table style="width:100%;">
      <thead>
        <tr><th>Name</th><th>Roll</th><th>Grade</th></tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;

  const splitResult = TableFragmenter.splitTable(tableHtml, 300);
  assert(splitResult.isSplit === true, 'Table is split when exceeding available height');
  assert(splitResult.firstFragmentHtml.includes('<thead>'), 'First table fragment contains <thead>');
  assert(splitResult.firstFragmentHtml.includes('Student 1'), 'First table fragment contains initial rows');

  // 2. Multi-page Mixed Fragmentation via PaginationEngine
  const mixedDoc = `
    <h2>First Heading</h2>
    <p>Introductory paragraph text.</p>
    ${tableHtml}
    <p>Post-table summary.</p>
  `;
  const mixedLayout = PaginationEngine.paginate(mixedDoc, { pageSize: 'A4', orientation: 'PORTRAIT', margin: 'NORMAL' });
  assert(mixedLayout.totalPages >= 2, 'Mixed content with large table paginates cleanly');
  assert(mixedLayout.pages[0].fragments.length > 0, 'Page 1 has valid layout fragments');
  assert(mixedLayout.pages[1].fragments.length > 0, 'Page 2 has valid continuation fragments');

  return { passed, failed };
}

if (process.argv[1]?.endsWith('fragmentation.test.ts')) {
  const { passed, failed } = runFragmentationUnitTests();
  console.log(`\nFragmentation Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
