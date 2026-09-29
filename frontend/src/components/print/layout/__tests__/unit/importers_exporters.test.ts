/**
 * Unit Test: Importers & Exporters Pipeline
 * Covers: Vector PDF compiler, OpenXML DOCX compiler, and LayoutDocument translation.
 */

import { PaginationEngine } from '../../pagination/PaginationEngine';
import { compileLayoutDocumentToPDF } from '../../../vectorPDFCompiler';
import { compileLayoutDocumentToDocx } from '../../../vectorDocxCompiler';

export async function runImportersExportersUnitTests(): Promise<{ passed: number; failed: number }> {
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

  console.log('--- UNIT TEST: IMPORTERS & EXPORTERS PIPELINE ---');

  const sampleDoc = `
    <h1>Academic Marksheet</h1>
    <p>Official student examination marksheet.</p>
    <table>
      <thead><tr><th>Course</th><th>Credit</th><th>Grade</th></tr></thead>
      <tbody>
        <tr><td>Data Structures</td><td>3.0</td><td>A+</td></tr>
        <tr><td>Algorithms</td><td>3.0</td><td>A</td></tr>
      </tbody>
    </table>
  `;

  const layoutResult = PaginationEngine.paginate(sampleDoc, {
    pageSize: 'A4',
    orientation: 'PORTRAIT',
    margin: 'NORMAL',
  });
  const layout = layoutResult.document;

  // 1. Vector PDF Compilation
  try {
    const pdfDoc = await compileLayoutDocumentToPDF(layout);
    assert(pdfDoc !== null && typeof pdfDoc === 'object', 'PDF compiler produces valid jsPDF object');
    assert(pdfDoc.getNumberOfPages() === layout.totalPages, `PDF page count (${pdfDoc.getNumberOfPages()}) strictly matches LayoutDocument totalPages (${layout.totalPages})`);
  } catch (err: any) {
    assert(false, `PDF compiler threw error: ${err.message}`);
  }

  // 2. OpenXML DOCX Compilation
  try {
    const docxBlob = await compileLayoutDocumentToDocx(layout);
    assert(docxBlob instanceof Blob || typeof docxBlob === 'object', 'DOCX compiler produces valid binary blob/document');
  } catch (err: any) {
    assert(false, `DOCX compiler threw error: ${err.message}`);
  }

  return { passed, failed };
}

if (process.argv[1]?.endsWith('importers_exporters.test.ts')) {
  runImportersExportersUnitTests().then(({ passed, failed }) => {
    console.log(`\nImporters & Exporters Unit Tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
  });
}
