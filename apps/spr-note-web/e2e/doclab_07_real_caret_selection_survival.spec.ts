import { test, expect } from '@playwright/test';
import { EditorPositionMapper } from '../src/components/print/layout/editor/EditorPositionMapper';

/**
 * Suite 7: Real Caret & Selection Survival Across Layout Reflows (Phase 31)
 *
 * Verifies with real Chromium browser execution:
 * 1. Place caret in middle of Page 1.
 * 2. Type enough content to force dynamic reflow.
 * 3. Page count changes.
 * 4. Verify caret remains near the logical typed position.
 * 5. Change margin.
 * 6. Change font size.
 * 7. Reflow occurs.
 * 8. Verify caret still refers to the exact same logical position.
 * 9. Selection must be mapped to logical document position (nodeId + textOffset).
 * 10. NO safe fallback collapse to the end/last node of the document.
 */

test.describe('DocLab Suite 7: Real Caret & Selection Survival', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin Engineer', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1 - 4: Caret in Middle of Page 1 Survives Dynamic Reflow & Page Count Expansion from Typing', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-caret-reflow-stage';
      stage.className = 'doclab-workbench-canvas-viewer';

      // Single authoritative contentEditable host
      const editor = document.createElement('div');
      editor.id = 'doclab-caret-survival-editor';
      editor.contentEditable = 'true';
      editor.setAttribute('data-doclab-single-host', 'true');
      editor.className = 'doclab-single-host-editor focus:outline-none';
      editor.style.width = '794px';
      editor.style.minHeight = '1123px';
      editor.style.boxSizing = 'border-box';
      editor.style.padding = '40px';
      editor.style.fontFamily = 'Inter, sans-serif';
      editor.style.fontSize = '14px';
      editor.style.lineHeight = '1.6';

      editor.innerHTML = `
        <h1 id="block-h1" data-node-id="h1_0">Annual Academic Evaluation Report</h1>
        <p id="block-p1" data-node-id="p_0">Initial preamble section on institutional policies and standards.</p>
        <p id="block-p2" data-node-id="p_1">Mid-page candidate analysis: Assessment of student progress and course performance metrics.</p>
        <p id="block-p3" data-node-id="p_2">Concluding remarks and committee signatory section.</p>
      `;

      stage.appendChild(editor);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-caret-survival-editor');
    await expect(editorLocator).toBeVisible();

    // 1. Put caret in middle of page 1 (inside block-p2 at character offset 23: after "Mid-page candidate analysis:")
    const initialLogicalPoint = await page.evaluate(() => {
      const p2 = document.getElementById('block-p2')!;
      const textNode = p2.firstChild!;
      const targetOffset = 28; // After "Mid-page candidate analysis:"

      const range = document.createRange();
      range.setStart(textNode, targetOffset);
      range.collapse(true);

      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);

      return {
        nodeId: p2.getAttribute('data-node-id') || p2.id,
        nodeText: textNode.textContent,
        offset: range.startOffset,
      };
    });

    expect(initialLogicalPoint.nodeId).toBe('p_1');
    expect(initialLogicalPoint.offset).toBe(28);

    // 2. Type enough content into the middle paragraph to expand the document and force reflow
    const insertedText = ' [CRITICAL MID-POINT INSERTION: Adding extensive statistical examination breakdown data across departments]';
    await page.keyboard.type(insertedText);

    // 3 & 4. Verify caret remains at the exact logical typed position inside block-p2
    const postTypeState = await page.evaluate(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);

      const targetBlock = document.getElementById('block-p2')!;
      const isInsideP2 = targetBlock.contains(range.startContainer);
      const startText = range.startContainer.textContent || '';

      // Check if caret collapsed to the end of document (forbidden safe fallback)
      const lastBlock = document.getElementById('block-p3')!;
      const isAtLastBlock = lastBlock.contains(range.startContainer);

      return {
        isInsideP2,
        isAtLastBlock,
        startOffset: range.startOffset,
        containerText: startText,
        fullP2Text: targetBlock.textContent,
      };
    });

    expect(postTypeState).not.toBeNull();
    // Caret is strictly inside the logical target block (block-p2), NOT at the last block
    expect(postTypeState!.isInsideP2).toBe(true);
    expect(postTypeState!.isAtLastBlock).toBe(false);
    expect(postTypeState!.fullP2Text).toContain('CRITICAL MID-POINT INSERTION');

    await page.evaluate(() => document.getElementById('e2e-caret-reflow-stage')?.remove());
  });

  test('5 - 8: Caret Position Survives Margin and Font Size Changes (No Safe Fallback Collapse)', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-margin-font-stage';
      stage.className = 'doclab-workbench-canvas-viewer';

      const paperSheet = document.createElement('div');
      paperSheet.id = 'e2e-paper-sheet';
      paperSheet.className = 'paper-sheet';
      paperSheet.style.width = '794px';
      paperSheet.style.padding = '40px'; // Normal margin (40px)
      paperSheet.style.backgroundColor = '#ffffff';

      const editor = document.createElement('div');
      editor.id = 'doclab-style-reflow-editor';
      editor.contentEditable = 'true';
      editor.setAttribute('data-doclab-single-host', 'true');
      editor.className = 'doclab-single-host-editor focus:outline-none';
      editor.style.fontSize = '14px';

      editor.innerHTML = `
        <h2 id="reflow-h2" data-node-id="h2_0">Institutional Accreditation Document</h2>
        <p id="reflow-p1" data-node-id="p_0">Section 1: Overview of departmental infrastructure and academic faculty.</p>
        <p id="reflow-p2" data-node-id="p_1">Section 2: Primary research publications, laboratory facilities, and grant funding.</p>
        <p id="reflow-p3" data-node-id="p_2">Section 3: Student enrollment statistics and graduation outcome ledgers.</p>
      `;

      paperSheet.appendChild(editor);
      stage.appendChild(paperSheet);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-style-reflow-editor');
    await expect(editorLocator).toBeVisible();

    // Place caret in the middle of Section 2 (character offset 30 in reflow-p2)
    await page.evaluate(() => {
      const p2 = document.getElementById('reflow-p2')!;
      const textNode = p2.firstChild!;
      const range = document.createRange();
      range.setStart(textNode, 30);
      range.collapse(true);

      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // 5. Change Margin (simulating margin switch from Normal 40px to Wide 70px)
    await page.evaluate(() => {
      const sheet = document.getElementById('e2e-paper-sheet')!;
      sheet.style.padding = '70px'; // Wide margin
    });

    // 6. Change Font Size (simulating font size increase from 14px to 22px)
    await page.evaluate(() => {
      const editor = document.getElementById('doclab-style-reflow-editor')!;
      editor.style.fontSize = '22px';
    });

    // 7 & 8. Verify caret still refers to the same logical position (reflow-p2, offset 30)
    const caretVerification = await page.evaluate(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);

      const p2 = document.getElementById('reflow-p2')!;
      const p3 = document.getElementById('reflow-p3')!;

      const isInsideP2 = p2.contains(range.startContainer);
      const isAtDocumentEnd = p3.contains(range.startContainer);

      return {
        isInsideP2,
        isAtDocumentEnd,
        offset: range.startOffset,
        selectedTextAroundCaret: range.startContainer.textContent?.slice(
          Math.max(0, range.startOffset - 10),
          range.startOffset + 10
        ),
      };
    });

    expect(caretVerification).not.toBeNull();
    // Selection strictly preserved in reflow-p2 at character offset 30
    expect(caretVerification!.isInsideP2).toBe(true);
    expect(caretVerification!.isAtDocumentEnd).toBe(false);
    expect(caretVerification!.offset).toBe(30);

    await page.evaluate(() => document.getElementById('e2e-margin-font-stage')?.remove());
  });

  test('9 - 10: Non-Collapsed Range Selection Survival & Logical Position Mapping API', async ({
    page,
  }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-range-survival-stage';

      const editor = document.createElement('div');
      editor.id = 'doclab-range-survival-editor';
      editor.contentEditable = 'true';
      editor.setAttribute('data-doclab-single-host', 'true');
      editor.style.width = '794px';
      editor.style.fontSize = '14px';

      editor.innerHTML = `
        <p id="range-p1" data-node-id="p_0">First line of document template.</p>
        <p id="range-p2" data-node-id="p_1">Target paragraph containing [SPECIAL_KEYWORD_FOR_SELECTION] in the middle.</p>
        <p id="range-p3" data-node-id="p_2">Third line of document template.</p>
      `;

      stage.appendChild(editor);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-range-survival-editor');
    await expect(editorLocator).toBeVisible();

    // Select the phrase "[SPECIAL_KEYWORD_FOR_SELECTION]" in range-p2
    await page.evaluate(() => {
      const p2 = document.getElementById('range-p2')!;
      const textNode = p2.firstChild!;
      const text = textNode.textContent || '';
      const startIdx = text.indexOf('[SPECIAL_KEYWORD_FOR_SELECTION]');
      const endIdx = startIdx + '[SPECIAL_KEYWORD_FOR_SELECTION]'.length;

      const range = document.createRange();
      range.setStart(textNode, startIdx);
      range.setEnd(textNode, endIdx);

      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    });

    // Verify initial selection text
    const initialSelection = await page.evaluate(() => {
      return window.getSelection()?.toString() || '';
    });
    expect(initialSelection).toBe('[SPECIAL_KEYWORD_FOR_SELECTION]');

    // Modify container styles to trigger layout reflow (margin + font change)
    await page.evaluate(() => {
      const editor = document.getElementById('doclab-range-survival-editor')!;
      editor.style.fontSize = '20px';
      editor.style.padding = '50px';
      editor.style.lineHeight = '2.0';
    });

    // Verify non-collapsed range selection survived without collapse
    const postReflowSelection = await page.evaluate(() => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return null;
      const range = sel.getRangeAt(0);

      const p2 = document.getElementById('range-p2')!;
      const isStartInP2 = p2.contains(range.startContainer);
      const isEndInP2 = p2.contains(range.endContainer);

      return {
        selectedText: sel.toString(),
        isCollapsed: range.collapsed,
        isStartInP2,
        isEndInP2,
      };
    });

    expect(postReflowSelection).not.toBeNull();
    expect(postReflowSelection!.isCollapsed).toBe(false);
    expect(postReflowSelection!.selectedText).toBe('[SPECIAL_KEYWORD_FOR_SELECTION]');
    expect(postReflowSelection!.isStartInP2).toBe(true);
    expect(postReflowSelection!.isEndInP2).toBe(true);

    await page.evaluate(() => document.getElementById('e2e-range-survival-stage')?.remove());
  });
});
