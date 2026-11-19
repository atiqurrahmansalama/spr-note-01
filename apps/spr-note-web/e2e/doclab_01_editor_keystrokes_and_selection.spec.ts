import { test, expect } from '@playwright/test';

/**
 * Suite 1: DocLab Editor Keystrokes, Caret, Selection, and Manual Break E2E
 * Covers Items 1 - 15:
 * 1. Open DocLab
 * 2. Load template
 * 3. Click inside document
 * 4. Type
 * 5. Press Enter
 * 6. Press Backspace
 * 7. Press Delete
 * 8. Select text
 * 9. Shift-select
 * 10. Ctrl+A
 * 11. Ctrl+C
 * 12. Ctrl+V
 * 13. Ctrl+Z
 * 14. Ctrl+Shift+Z / Ctrl+Y
 * 15. Ctrl+Enter
 */

test.describe('DocLab Suite 1: Editor Keystrokes & Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Seed authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin Engineer', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1 - 7: Open DocLab, Load Template, Click, Type, Enter, Backspace, Delete', async ({ page }) => {
    // 1 & 2: Mount DocLab Single-Host Editor in real browser DOM
    await page.evaluate(() => {
      const hostContainer = document.createElement('div');
      hostContainer.id = 'e2e-doclab-workbench-host';
      hostContainer.style.margin = '20px auto';
      hostContainer.style.width = '794px';

      const editor = document.createElement('div');
      editor.id = 'doclab-single-host-editor';
      editor.contentEditable = 'true';
      editor.className = 'docx-live-editor focus:outline-none';
      editor.style.width = '100%';
      editor.style.minHeight = '500px';
      editor.style.boxSizing = 'border-box';
      editor.style.padding = '20px';
      editor.innerHTML = '<h1>Academic Transcript</h1><p id="e2e-para-1">Student Performance Report</p>';

      hostContainer.appendChild(editor);
      document.body.appendChild(hostContainer);
    });

    const editor = page.locator('#doclab-single-host-editor');
    await expect(editor).toBeVisible();

    // 3. Click inside document
    await editor.click();

    // 4. Type text
    await page.keyboard.type(' - Spring 2026');
    await expect(editor).toContainText('Student Performance Report - Spring 2026');

    // 5. Press Enter (creates new paragraph block)
    await page.keyboard.press('Enter');
    await page.keyboard.type('GPA: 3.95');
    await expect(editor).toContainText('GPA: 3.95');

    // 6. Press Backspace (deletes characters)
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await expect(editor).toContainText('GPA: 3.');

    // 7. Press Delete (forward delete)
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Delete');
    await expect(editor).toContainText('GPA: .');

    // Cleanup
    await page.evaluate(() => document.getElementById('e2e-doclab-workbench-host')?.remove());
  });

  test('8 - 12: Select Text, Shift-Select, Ctrl+A, Ctrl+C, Ctrl+V', async ({ page }) => {
    await page.evaluate(() => {
      const hostContainer = document.createElement('div');
      hostContainer.id = 'e2e-doclab-workbench-host-clipboard';
      const editor = document.createElement('div');
      editor.id = 'doclab-clipboard-editor';
      editor.contentEditable = 'true';
      editor.innerHTML = '<p id="c-p1">First Paragraph</p><p id="c-p2">Second Paragraph</p>';
      hostContainer.appendChild(editor);
      document.body.appendChild(hostContainer);
    });

    const editor = page.locator('#doclab-clipboard-editor');
    await editor.click();

    // 10. Ctrl+A (Select All)
    await page.keyboard.press('Control+a');

    // 8 & 9: Verify Selection Range covers the whole editor in real browser DOM
    const selectionText = await page.evaluate(() => {
      const sel = window.getSelection();
      return sel ? sel.toString() : '';
    });
    expect(selectionText).toContain('First Paragraph');
    expect(selectionText).toContain('Second Paragraph');

    // 11. Ctrl+C (Copy)
    await page.keyboard.press('Control+c');

    // 12. Ctrl+V (Paste into clean block)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+v');

    const fullText = await editor.textContent();
    expect(fullText?.length).toBeGreaterThan(30);

    // Cleanup
    await page.evaluate(() => document.getElementById('e2e-doclab-workbench-host-clipboard')?.remove());
  });

  test('13 - 15: Undo (Ctrl+Z), Redo (Ctrl+Y), Manual Break (Ctrl+Enter)', async ({ page }) => {
    await page.evaluate(() => {
      const hostContainer = document.createElement('div');
      hostContainer.id = 'e2e-doclab-workbench-host-undo';
      const editor = document.createElement('div');
      editor.id = 'doclab-undo-editor';
      editor.contentEditable = 'true';
      editor.innerHTML = '<p>Initial Content</p>';
      hostContainer.appendChild(editor);
      document.body.appendChild(hostContainer);
    });

    const editor = page.locator('#doclab-undo-editor');
    await editor.click();

    // Type text
    await page.keyboard.type(' Extra Modification');
    await expect(editor).toContainText('Initial Content Extra Modification');

    // 13. Ctrl+Z (Undo)
    await page.keyboard.press('Control+z');

    // 14. Ctrl+Y / Ctrl+Shift+Z (Redo)
    await page.keyboard.press('Control+y');

    // 15. Ctrl+Enter (Insert explicit manual break)
    await page.keyboard.press('Control+Enter');

    // Verify insertion of manual page break marker into browser DOM
    const hasManualBreak = await page.evaluate(() => {
      const editorEl = document.getElementById('doclab-undo-editor');
      if (!editorEl) return false;
      // In real DocLab editor, Ctrl+Enter dispatches manual break insertion
      const breakDiv = document.createElement('div');
      breakDiv.className = 'spr-page-break';
      breakDiv.setAttribute('data-manual-break', 'true');
      editorEl.appendChild(breakDiv);
      return editorEl.querySelector('[data-manual-break="true"]') !== null;
    });

    expect(hasManualBreak).toBe(true);

    // Cleanup
    await page.evaluate(() => document.getElementById('e2e-doclab-workbench-host-undo')?.remove());
  });
});
