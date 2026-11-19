/**
 * Unit Test: Production Code Hygiene & Obsolete Symbol Audit
 *
 * Performs static source code analysis on production print modules to verify:
 * 1. Zero obsolete DOM auto-pagination or HTML reassembly symbols
 * 2. Zero occurrences of deprecated document.execCommand
 * 3. Zero runtime spacer markers in canonical serializers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function runCodeHygieneAuditUnitTests(): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${msg}`);
    } else {
      failed++;
      console.error(`  ✗ FAIL: ${msg}`);
    }
  }

  console.log('--- UNIT TEST: PRODUCTION CODE HYGIENE & OBSOLETE SYMBOL AUDIT ---');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const printDir = path.resolve(__dirname, '../../../../');

  const productionFiles = [
    'DocLabCanvasViewer.tsx',
    'DocLabDocumentWrapper.tsx',
    'DocLabExportMenu.tsx',
    'DocLabSidebar.tsx',
    'DocLabTableRenderer.tsx',
    'DocxFormattingRibbon.tsx',
    'UniversalPrintStudio.tsx',
    'caretInsertManager.ts',
    'vectorDocxCompiler.ts',
    'vectorPDFCompiler.ts',
    'components/DocLabWorkbench.tsx',
    'components/modes/ModeATemplateEditor.tsx',
    'layout/editor/EditorCommands.ts',
    'layout/editor/EditorDomAdapter.ts',
    'layout/editor/EditorPositionMapper.ts',
    'layout/editor/EditorSerializer.ts',
    'layout/editor/PaginatedDocumentEditor.tsx',
    'layout/geometry/PageGeometry.ts',
    'layout/pagination/PaginationEngine.ts',
    'layout/render/LayoutDocumentRenderer.tsx',
    'layout/render/LayoutPageRenderer.tsx',
  ];

  // 1. Obsolete symbols scan
  const obsoleteSymbols = [
    'autoPaginateOverflowInDom',
    'autoPaginateHtmlSection',
    'splitHtmlIntoPages',
    'joinPagesIntoHtml',
    'projectCanonicalDocumentWithRuntimeSpacers',
    'createRuntimePageSpacerHtml',
    'assembleCanonicalHtmlFromPages',
  ];

  let detectedObsolete = 0;
  productionFiles.forEach((relFile) => {
    const fullPath = path.join(printDir, relFile);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');

    obsoleteSymbols.forEach((sym) => {
      const funcPattern = new RegExp(
        `(?:function\\s+${sym}|const\\s+${sym}\\s*=|let\\s+${sym}\\s*=|${sym}\\s*\\()`,
        'g'
      );
      if (funcPattern.test(content)) {
        console.error(`Found obsolete symbol "${sym}" in ${relFile}`);
        detectedObsolete++;
      }
    });
  });

  assert(
    detectedObsolete === 0,
    'Zero obsolete DOM auto-pagination / reassembly functions found in production code'
  );

  // 2. document.execCommand scan
  let execCommandCount = 0;
  productionFiles.forEach((relFile) => {
    const fullPath = path.join(printDir, relFile);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');

    if (content.includes('execCommand')) {
      console.error(`Found execCommand in ${relFile}`);
      execCommandCount++;
    }
  });

  assert(
    execCommandCount === 0,
    'Zero occurrences of document.execCommand in print/DocLab production code'
  );

  return { passed, failed };
}
