/**
 * Unit Test: Native Tabular Pagination (Mode E)
 * Covers: Fixed row-count slicing, density scaling (compact, spacious),
 * mandatory row handling, and blank row padding.
 */

import { NativeTabularPagination } from '../../../hooks/usePrintPagination';

export function runNativeTabularUnitTests(): { passed: number; failed: number } {
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

  console.log('--- UNIT TEST: NATIVE TABULAR PAGINATION (MODE E) ---');

  const records = Array.from({ length: 60 }, (_, i) => ({
    id: `row_${i + 1}`,
    studentName: `Student ${i + 1}`,
    roll: 1000 + i,
    marks: 85,
  }));

  // 1. A4 Normal Density Pagination
  const { paginationResult: a4Normal } = NativeTabularPagination.paginate({
    liveData: records,
    pageSize: 'A4',
    density: 'NORMAL',
  });
  assert(a4Normal.totalPages >= 2, `60 records in A4 Normal produce 2+ pages (got ${a4Normal.totalPages})`);
  assert(a4Normal.pages[0].rows.length === 25, `A4 Normal rows on page 1 is 25 (got ${a4Normal.pages[0].rows.length})`);

  // 2. Density Adjustments (Compact vs Spacious)
  const { paginationResult: a4Compact } = NativeTabularPagination.paginate({
    liveData: records,
    pageSize: 'A4',
    density: 'COMPACT',
  });
  assert(a4Compact.pages[0].rows.length > a4Normal.pages[0].rows.length, 'Compact density increases rows on page 1');

  const { paginationResult: a4Spacious } = NativeTabularPagination.paginate({
    liveData: records,
    pageSize: 'A4',
    density: 'SPACIOUS',
  });
  assert(a4Spacious.pages[0].rows.length < a4Normal.pages[0].rows.length, 'Spacious density decreases rows on page 1');

  // 3. Extra Blank Rows Padding
  const { paginationResult: withBlankRows } = NativeTabularPagination.paginate({
    liveData: records.slice(0, 10),
    pageSize: 'A4',
    extraBlankRows: 5,
  });
  const page1 = withBlankRows.pages[0];
  assert(page1.extraBlanks === 5, `Sets extraBlanks to 5 (got ${page1.extraBlanks})`);

  return { passed, failed };
}

if (process.argv[1]?.endsWith('native_tabular.test.ts')) {
  const { passed, failed } = runNativeTabularUnitTests();
  console.log(`\nNative Tabular Unit Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}
