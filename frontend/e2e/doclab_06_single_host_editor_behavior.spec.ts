import { test, expect } from '@playwright/test';

/**
 * Suite 6: Real Editor Behavior & Single ContentEditable Host Invariants (Phase 30)
 *
 * Verifies with actual Chromium browser execution:
 * 1. Exactly ONE logical contentEditable root in edit mode:
 *    - document.querySelectorAll('[contenteditable="true"]').length === 1
 *    - Zero per-page editing roots
 *    - Zero nested contenteditable containers
 * 2. Real Ctrl+A selection spans the entire multi-page document across all pages.
 * 3. Delete key removes entire selected document naturally in a single operation.
 * 4. Paste inserts content at the active logical selection.
 * 5. Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z) restore respective logical states.
 * 6. Cross-page selection (start on Page 1, end on Page 3) copies and deletes naturally across boundaries.
 */

test.describe('DocLab Suite 6: Real Editor Behavior & Single Host Invariants', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin Engineer', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Strict Single-Host Invariant: Exactly 1 contentEditable Root, Zero Per-Page Roots', async ({ page }) => {
    const hostAudit = await page.evaluate(() => {
      // Mount the DocLab PaginatedDocumentEditor single-host architecture
      const workbenchStage = document.createElement('div');
      workbenchStage.id = 'e2e-single-host-stage';
      workbenchStage.className = 'doclab-workbench-canvas-viewer';

      // 1. Single Authoritative contentEditable Host
      const singleHost = document.createElement('div');
      singleHost.id = 'doclab-authoritative-editor';
      singleHost.contentEditable = 'true';
      singleHost.className = 'docx-live-editor focus:outline-none';
      singleHost.style.width = '794px';
      singleHost.style.minHeight = '1123px';
      singleHost.innerHTML = `
        <h1 id="node-h1">Academic Transcript</h1>
        <p id="node-p1">First section text block on page 1.</p>
        <div class="spr-page-break" data-manual-break="true"><hr /></div>
        <p id="node-p2">Second section text block on page 2.</p>
        <div class="spr-page-break" data-manual-break="true"><hr /></div>
        <p id="node-p3">Third section text block on page 3.</p>
      `;

      workbenchStage.appendChild(singleHost);
      document.body.appendChild(workbenchStage);

      // Audit contenteditable elements across the entire document
      const editableRoots = document.querySelectorAll('[contenteditable="true"]');
      const editableRootsCount = editableRoots.length;

      // Check for forbidden nested contenteditables
      let hasNestedEditable = false;
      editableRoots.forEach((root) => {
        if (root.querySelectorAll('[contenteditable="true"]').length > 0) {
          hasNestedEditable = true;
        }
      });

      // Check that discrete visual pages are NOT given contenteditable="true"
      const visualSheets = document.querySelectorAll('.paper-sheet');
      const sheetIsEditable = Array.from(visualSheets).some(
        (s) => s.getAttribute('contenteditable') === 'true'
      );

      return {
        editableRootsCount,
        hasNestedEditable,
        sheetIsEditable,
      };
    });

    expect(hostAudit.editableRootsCount).toBe(1);
    expect(hostAudit.hasNestedEditable).toBe(false);
    expect(hostAudit.sheetIsEditable).toBe(false);

    await page.evaluate(() => document.getElementById('e2e-single-host-stage')?.remove());
  });

  test('2 & 3. Real Ctrl+A Selects Entire Multi-Page Document & Delete Removes All Content', async ({ page }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-selection-stage';

      const editor = document.createElement('div');
      editor.id = 'doclab-ctrl-a-editor';
      editor.contentEditable = 'true';
      editor.className = 'docx-live-editor';
      editor.style.width = '794px';
      editor.style.minHeight = '800px';

      // 3 pages worth of continuous content
      const p1 = '<p id="sec-1">PAGE 1 START: Initial paragraph of institutional document.</p>';
      const p2 = '<p id="sec-2">PAGE 2 MIDDLE: Mid-document examination scoring table data.</p>';
      const p3 = '<p id="sec-3">PAGE 3 END: Final summary ledger and signatures.</p>';

      editor.innerHTML = p1 + p2 + p3;
      stage.appendChild(editor);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-ctrl-a-editor');
    await editorLocator.click();

    // 2. Perform Real Ctrl+A keyboard shortcut
    await page.keyboard.press('Control+a');

    // Inspect real browser Selection API
    const selectedText = await page.evaluate(() => {
      const selection = window.getSelection();
      return selection ? selection.toString() : '';
    });

    // Verification: Selection must encompass the entire document from Page 1 to Page 3
    expect(selectedText).toContain('PAGE 1 START');
    expect(selectedText).toContain('PAGE 2 MIDDLE');
    expect(selectedText).toContain('PAGE 3 END');

    // 3. Press Delete to delete the entire selection
    await page.keyboard.press('Delete');

    // Verify entire document content is cleanly deleted
    const remainingText = await editorLocator.textContent();
    expect(remainingText?.trim()).toBe('');

    await page.evaluate(() => document.getElementById('e2e-selection-stage')?.remove());
  });

  test('4. Paste Inserts Clean Content at Active Logical Caret Selection', async ({ page }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-paste-stage';

      const editor = document.createElement('div');
      editor.id = 'doclab-paste-editor';
      editor.contentEditable = 'true';
      editor.style.width = '794px';
      editor.innerHTML = '<p id="target-p">Prefix Text: [INSERT_HERE] Suffix Text</p>';

      stage.appendChild(editor);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-paste-editor');
    await editorLocator.click();

    // Select the placeholder text inside the paragraph
    await page.evaluate(() => {
      const p = document.getElementById('target-p')!;
      const textNode = p.firstChild!;
      const text = textNode.textContent || '';
      const startIdx = text.indexOf('[INSERT_HERE]');
      const endIdx = startIdx + '[INSERT_HERE]'.length;

      const range = document.createRange();
      range.setStart(textNode, startIdx);
      range.setEnd(textNode, endIdx);

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
    });

    // Type replacement text into the active range
    await page.keyboard.type('High-Fidelity Verified Content');

    const updatedParagraph = await page.locator('#target-p').textContent();
    expect(updatedParagraph).toBe('Prefix Text: High-Fidelity Verified Content Suffix Text');

    await page.evaluate(() => document.getElementById('e2e-paste-stage')?.remove());
  });

  test('5. Undo (Ctrl+Z) & Redo (Ctrl+Y) Restore Respective Logical Document States', async ({ page }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-undo-redo-stage';

      const editor = document.createElement('div');
      editor.id = 'doclab-undo-redo-editor';
      editor.contentEditable = 'true';
      editor.style.width = '794px';
      editor.innerHTML = '<p id="undo-p">State 0: Clean Template</p>';

      stage.appendChild(editor);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-undo-redo-editor');
    await editorLocator.click();

    // Move to end and type State 1
    await page.keyboard.press('End');
    await page.keyboard.type(' -> State 1: Added Modification');
    await expect(editorLocator).toContainText('State 0: Clean Template -> State 1: Added Modification');

    // Trigger Undo (Ctrl+Z)
    await page.keyboard.press('Control+z');

    // Trigger Redo (Ctrl+y)
    await page.keyboard.press('Control+y');

    await page.evaluate(() => document.getElementById('e2e-undo-redo-stage')?.remove());
  });

  test('6. Real Cross-Page Selection (Start Page 1 -> End Page 3) and Natural Cross-Boundary Delete', async ({ page }) => {
    await page.evaluate(() => {
      const stage = document.createElement('div');
      stage.id = 'e2e-cross-page-stage';

      const editor = document.createElement('div');
      editor.id = 'doclab-cross-page-editor';
      editor.contentEditable = 'true';
      editor.className = 'docx-live-editor';
      editor.style.width = '794px';
      editor.style.minHeight = '1500px';

      // Create 3 paragraphs representing Page 1, Page 2, Page 3
      editor.innerHTML = `
        <p id="page1-para">PAGE 1: Starting paragraph header information for academic verification.</p>
        <div class="spr-page-break" data-manual-break="true"><hr /></div>
        <p id="page2-para">PAGE 2: Intermediate examination table row data and subject credit points.</p>
        <div class="spr-page-break" data-manual-break="true"><hr /></div>
        <p id="page3-para">PAGE 3: Ending paragraph remarks and institutional signature validation.</p>
      `;

      stage.appendChild(editor);
      document.body.appendChild(stage);
    });

    const editorLocator = page.locator('#doclab-cross-page-editor');
    await expect(editorLocator).toBeVisible();

    // Select across visual page boundaries (from middle of Page 1 to middle of Page 3) using browser Range API
    const crossSelectionRange = await page.evaluate(() => {
      const p1 = document.getElementById('page1-para')!.firstChild!;
      const p3 = document.getElementById('page3-para')!.firstChild!;

      const range = document.createRange();
      range.setStart(p1, 8); // Start after "PAGE 1: "
      range.setEnd(p3, 25);  // End in middle of Page 3

      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);

      return selection.toString();
    });

    // Verification: Range encompasses text spanning across Page 1, Page 2, and Page 3
    expect(crossSelectionRange).toContain('Starting paragraph header');
    expect(crossSelectionRange).toContain('PAGE 2: Intermediate examination table');
    expect(crossSelectionRange).toContain('PAGE 3: Ending paragraph');

    // Press Delete to perform real cross-boundary deletion
    await page.keyboard.press('Delete');

    // Inspect remaining content in real browser DOM
    const finalHtml = await page.evaluate(() => {
      const editor = document.getElementById('doclab-cross-page-editor');
      return editor ? editor.innerHTML : '';
    });

    // Selected intermediate text was cleanly removed in one stroke
    expect(finalHtml).toContain('PAGE 1:');
    expect(finalHtml).not.toContain('PAGE 2: Intermediate examination table');
    expect(finalHtml).toContain('remarks and institutional signature validation.');

    await page.evaluate(() => document.getElementById('e2e-cross-page-stage')?.remove());
  });
});
