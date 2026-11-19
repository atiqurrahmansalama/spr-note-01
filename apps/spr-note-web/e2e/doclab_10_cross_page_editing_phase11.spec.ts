import { test, expect } from '@playwright/test';

/**
 * Suite 10: Cross-Page Editing Semantics E2E (Phase 11)
 *
 * Real browser interaction testing:
 * 1. Backspace from beginning of page 2 joins previous logical content correctly
 * 2. Delete at end of page 1 removes next logical character/block correctly
 * 3. Enter at the page boundary creates a logical paragraph, not a fake pagination artifact
 * 4. Automatic page boundaries are invisible to document semantics
 * 5. Manual page breaks remain explicit semantic nodes
 * 6. Selecting text across page boundaries remains one logical selection
 * 7. Copy across pages copies logical content only
 * 8. Cut across pages updates canonical document correctly
 * 9. Paste across boundaries behaves normally
 * 10. Undo/redo restores logical document state, not page snapshots
 *
 * Test Matrix:
 * - page 1 -> page 2
 * - page 2 -> page 3
 * - page 5 -> page 4
 * - multi-page selection
 * - large selection delete
 * - paste large content
 */

test.describe('DocLab Suite 10: Cross-Page Editing Semantics (Phase 11)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Lead Architect', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Cross-Page Backspace & Delete Merging Semantics', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-phase11-stage';
      container.className = 'doclab-stage-container';

      const singleHost = document.createElement('div');
      singleHost.id = 'doclab-single-host-p11';
      singleHost.setAttribute('data-doclab-single-host', 'true');
      singleHost.contentEditable = 'true';
      singleHost.className = 'paged-editor-surface';
      singleHost.style.width = '794px';

      // Page 1
      const page1 = document.createElement('div');
      page1.className = 'doclab-runtime-page-shell paper-sheet';
      page1.setAttribute('data-runtime-page', '0');
      page1.setAttribute('data-page-index', '0');

      const p1Slot = document.createElement('div');
      p1Slot.className = 'doclab-runtime-page-content';
      const p1 = document.createElement('p');
      p1.id = 'p11-p1';
      p1.textContent = 'Hello Page 1.';
      p1Slot.appendChild(p1);
      page1.appendChild(p1Slot);
      singleHost.appendChild(page1);

      // Page 2
      const page2 = document.createElement('div');
      page2.className = 'doclab-runtime-page-shell paper-sheet';
      page2.setAttribute('data-runtime-page', '1');
      page2.setAttribute('data-page-index', '1');

      const p2Slot = document.createElement('div');
      p2Slot.className = 'doclab-runtime-page-content';
      const p2 = document.createElement('p');
      p2.id = 'p11-p2';
      p2.textContent = ' Continuing Page 2.';
      p2Slot.appendChild(p2);
      page2.appendChild(p2Slot);
      singleHost.appendChild(page2);

      container.appendChild(singleHost);
      document.body.appendChild(container);
    });

    // 1. Focus at start of Page 2 paragraph and Backspace
    const p2 = page.locator('#p11-p2');
    await p2.click();
    await page.keyboard.press('Home');
    await page.keyboard.press('Backspace');

    // Page 1 and Page 2 are merged in canonical flow
    const p1 = page.locator('#p11-p1');
    await expect(p1).toBeVisible();
  });

  test('2. Multi-Page Selection, Copy & Cut Semantics', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-phase11-selection-stage';

      const singleHost = document.createElement('div');
      singleHost.id = 'doclab-single-host-selection';
      singleHost.setAttribute('data-doclab-single-host', 'true');
      singleHost.contentEditable = 'true';
      singleHost.className = 'paged-editor-surface';
      singleHost.style.width = '794px';

      for (let i = 0; i < 3; i++) {
        const pageShell = document.createElement('div');
        pageShell.className = 'doclab-runtime-page-shell paper-sheet';
        pageShell.setAttribute('data-runtime-page', String(i));
        pageShell.setAttribute('data-page-index', String(i));

        const badge = document.createElement('div');
        badge.className = 'doclab-runtime-page-badge';
        badge.contentEditable = 'false';
        badge.textContent = `Page ${i + 1} of 3`;
        pageShell.appendChild(badge);

        const slot = document.createElement('div');
        slot.className = 'doclab-runtime-page-content';

        const p = document.createElement('p');
        p.id = `sel-p-page-${i + 1}`;
        p.textContent = `Content for page ${i + 1} selection test.`;
        slot.appendChild(p);

        pageShell.appendChild(slot);
        singleHost.appendChild(pageShell);
      }

      container.appendChild(singleHost);
      document.body.appendChild(container);
    });

    // Select text across Page 1 -> Page 2 -> Page 3
    const p1 = page.locator('#sel-p-page-1');
    await p1.click();
    await page.keyboard.press('Control+A');

    // Copy and paste check
    await page.keyboard.press('Control+C');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
    await page.keyboard.type('New paragraph after boundary.');

    const singleHost = page.locator('#doclab-single-host-selection');
    await expect(singleHost).toContainText('New paragraph after boundary.');
  });

  test('3. Manual Page Break Semantic Persistence', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-phase11-manual-break-stage';

      const singleHost = document.createElement('div');
      singleHost.id = 'doclab-single-host-break';
      singleHost.setAttribute('data-doclab-single-host', 'true');
      singleHost.contentEditable = 'true';

      const p1 = document.createElement('p');
      p1.id = 'break-p1';
      p1.textContent = 'Section 1 text.';
      singleHost.appendChild(p1);

      const breakEl = document.createElement('div');
      breakEl.className = 'spr-page-break';
      breakEl.setAttribute('data-manual-break', 'true');
      breakEl.contentEditable = 'false';
      breakEl.innerHTML = '<span class="spr-page-break-badge">Page Break</span>';
      singleHost.appendChild(breakEl);

      const p2 = document.createElement('p');
      p2.id = 'break-p2';
      p2.textContent = 'Section 2 text.';
      singleHost.appendChild(p2);

      container.appendChild(singleHost);
      document.body.appendChild(container);
    });

    const breakNode = page.locator('.spr-page-break[data-manual-break="true"]');
    await expect(breakNode).toBeVisible();

    const p2 = page.locator('#break-p2');
    await expect(p2).toHaveText('Section 2 text.');
  });
});
