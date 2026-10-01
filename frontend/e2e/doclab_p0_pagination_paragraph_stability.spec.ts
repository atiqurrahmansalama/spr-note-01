import { test, expect } from '@playwright/test';

/**
 * Real Browser Acceptance Tests for DOC-LAB: PAGINATION + PARAGRAPH STABILITY (3 P0 Fixes)
 *
 * Scenarios:
 * 1. Long paragraph -> 2+ pages
 * 2. Long paragraph -> 3+ pages
 * 3. Rich inline formatting preserved across paragraph split
 * 4. Repeated re-pagination -> content unchanged
 * 5. Continuation source identity mismatch -> prevents merge
 * 6. Page-top oversized block -> page count and physical DOM flow consistent
 * 7. Paragraph continuation click + typing works
 * 8. Content deletion reduces page count
 */

test.describe('DocLab P0 Pagination & Paragraph Stability Real Browser Acceptance', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend API routes for standalone execution
    await page.route('**/api/v1/user/profile/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Admin Engineer',
          role: 'superadmin',
          institution_id: 1,
          institution_name: 'Jamia Islamia Markaz',
        }),
      });
    });

    await page.route('http://127.0.0.1:8000/api/v1/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.route('http://localhost:8000/api/v1/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-valid-token-12345');
      localStorage.setItem('refreshToken', 'mock-valid-refresh-token-12345');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 1,
          name: 'Admin Engineer',
          role: 'superadmin',
          institution_id: 1,
          institution_name: 'Jamia Islamia Markaz',
        })
      );
      localStorage.setItem('active_tenant_id', '1');
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/print-studio?scope=general_document');
    await page.waitForLoadState('networkidle');
  });

  // Helper to get total page sheets in visual overlay
  async function getVisualSheetCount(page: any): Promise<number> {
    return await page.locator('.paper-sheet.docx-paper-sheet').count();
  }

  // 1. Long paragraph -> 2+ pages
  test('P0.1: Long paragraph continues from Page 1 to Page 2 across boundary', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        let longText = 'START_OF_LONG_PARAGRAPH: This is an authoritative continuous document paragraph in SPR Note DocLab Enterprise. ';
        for (let i = 1; i <= 60; i++) {
          longText += `Sentence index ${i} discusses advanced multi-page continuous paragraph layout flow, exact line height measurement with browser Range getClientRects, and zero artificial wrappers. `;
        }
        longText += 'END_OF_LONG_PARAGRAPH: Complete transcript evaluation summary.';
        host.innerHTML = `<p id="p_long_01" style="font-size: 14px; line-height: 1.8; margin-bottom: 0;">${longText}</p>`;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(600);

    const sheets = await getVisualSheetCount(page);
    expect(sheets).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    // Verify continuation fragment exists
    const continuation = page.locator('[data-doclab-single-host="true"] [data-is-continuation="true"]');
    await expect(continuation.first()).toBeVisible();

    // Verify source ID preserved across fragments
    const sourceIds = await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      const frags = Array.from(host.querySelectorAll('p[data-source-node-id], p[data-source-id]'));
      return frags.map(f => f.getAttribute('data-source-node-id') || f.getAttribute('data-source-id'));
    });
    expect(sourceIds.length).toBeGreaterThanOrEqual(2);
    expect(sourceIds[0]).toBe(sourceIds[1]);
  });

  // 2. Long paragraph -> 3+ pages
  test('P0.2: Extremely long paragraph fragments across 3+ pages', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        let veryLongText = 'START_OF_3_PAGE_PARAGRAPH: Comprehensive enterprise transcript dissertation with extensive academic commentary and exhaustive notes. ';
        for (let i = 1; i <= 140; i++) {
          veryLongText += `Sentence item ${i} validates robust multi-page text line fragmentation across sequential physical A4 pages with zero text loss and deterministic layout accounting. `;
        }
        veryLongText += 'END_OF_3_PAGE_PARAGRAPH: Exhaustive dissertation conclusion.';
        host.innerHTML = `<p id="p_long_3pages" style="font-size: 14px; line-height: 1.8; margin-bottom: 0;">${veryLongText}</p>`;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(700);

    const sheets = await getVisualSheetCount(page);
    expect(sheets).toBeGreaterThanOrEqual(3);
    await expect(page.locator('text=Page 3 of')).toBeVisible();

    const continuations = await page.locator('[data-doclab-single-host="true"] [data-is-continuation="true"]').count();
    expect(continuations).toBeGreaterThanOrEqual(2);
  });

  // 3. Rich inline formatting preserved across paragraph split
  test('P0.3: Rich inline formatting (bold, italic, spans) preserved across split', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        let p1 = 'First segment of standard body text with substantial width. ';
        for (let i = 1; i <= 30; i++) {
          p1 += `Leading sentence ${i} establishing initial paragraph height on page 1. `;
        }

        let p2 = 'Second segment with strong bold text formatting and emphasis. ';
        for (let i = 1; i <= 30; i++) {
          p2 += `Continuation sentence ${i} with bold styling crossing into page 2. `;
        }

        host.innerHTML = `<p id="p_rich_split" style="font-size: 14px; line-height: 1.8;">${p1}<b>Bold formatted section: ${p2}</b> End of rich text.</p>`;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(600);

    const sheets = await getVisualSheetCount(page);
    expect(sheets).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    // Verify bold element exists on Page 2 continuation fragment
    const boldInContinuation = await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      const cont = host.querySelector('[data-is-continuation="true"]');
      return cont ? cont.querySelector('b') !== null : false;
    });
    expect(boldInContinuation).toBe(true);
  });

  // 4. Repeated re-pagination -> content unchanged
  test('P0.4: Repeated re-pagination preserves text content without duplication', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    let originalText = 'Deterministic invariant checking paragraph text with continuous character sequence. ';
    for (let i = 1; i <= 40; i++) {
      originalText += `Sentence index ${i} verifying zero accumulation of duplicate fragments. `;
    }

    await page.evaluate((text: string) => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        host.innerHTML = `<p id="p_repeat_test" style="font-size: 14px; line-height: 1.8;">${text}</p>`;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, originalText);

    await page.waitForTimeout(500);

    // Trigger multiple re-pagination passes
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await page.waitForTimeout(100);
    }

    // Verify text content in host matches original
    const hostText = await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      return host.textContent?.replace(/\s+/g, ' ').trim() || '';
    });

    const cleanOriginal = originalText.replace(/\s+/g, ' ').trim();
    expect(hostText).toBe(cleanOriginal);
  });

  // 5. Continuation source identity mismatch -> prevents merge
  test('P0.5: Continuation source identity mismatch does not merge different elements', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        host.innerHTML = `
          <p data-source-node-id="node_alpha" id="p_alpha">Alpha Paragraph: First document item.</p>
          <p data-source-node-id="node_beta" data-is-continuation="true" id="p_beta">Beta Paragraph: Distinct continuation item.</p>
        `;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(400);

    // Verify both paragraphs remain separate in DOM
    const paragraphCount = await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      return host.querySelectorAll('p').length;
    });

    expect(paragraphCount).toBe(2);

    const alphaText = await page.evaluate(() => {
      const alpha = document.querySelector('#p_alpha');
      return alpha?.textContent || '';
    });
    expect(alphaText).toBe('Alpha Paragraph: First document item.');
  });

  // 6. Page-top oversized block -> page count and physical DOM flow consistent
  test('P0.6: Page-top oversized atomic block maintains consistent page count and DOM flow', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        // Atomic block of 1500px height (spans 2 pages on A4) followed by a paragraph
        host.innerHTML = `
          <div data-atomic="true" class="print-image-container" style="height: 1500px; background: #e2e8f0; display: flex; align-items: center; justify-content: center;">
            <p>Oversized 1500px Atomic Block</p>
          </div>
          <p id="p_after_oversized" style="margin-top: 10px; font-size: 14px;">Paragraph following oversized block on Page 3</p>
        `;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(600);

    const sheets = await getVisualSheetCount(page);
    expect(sheets).toBe(3);
    await expect(page.locator('text=Page 3 of')).toBeVisible();

    // Verify runtime spacer exists
    const spacerHeight = await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      const spacer = host.querySelector('[data-spr-runtime-pagination="true"]') as HTMLElement | null;
      return spacer ? parseFloat(spacer.style.height || '0') : 0;
    });
    expect(spacerHeight).toBeGreaterThan(0);
  });

  // 7. Paragraph continuation click + typing works
  test('P0.7: Click and type directly inside paragraph continuation fragment', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        let longText = 'START_OF_EDITABLE_PARAGRAPH: Standard institutional certificate text paragraph crossing page boundary. ';
        for (let i = 1; i <= 60; i++) {
          longText += `Sentence index ${i} providing continuous text across page boundary for live editing test. `;
        }
        longText += 'END_OF_EDITABLE_PARAGRAPH.';
        host.innerHTML = `<p id="p_editable_cont" style="font-size: 14px; line-height: 1.8;">${longText}</p>`;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(600);

    const continuation = page.locator('[data-doclab-single-host="true"] [data-is-continuation="true"]');
    await expect(continuation.first()).toBeVisible();

    // Click inside continuation fragment and type additional characters
    await continuation.first().click();
    await page.keyboard.type(' [LIVE_CONTINUATION_EDIT] ');

    await page.waitForTimeout(300);

    const hostText = await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      return host.textContent || '';
    });

    expect(hostText).toContain('[LIVE_CONTINUATION_EDIT]');
  });

  // 8. Content deletion reduces page count
  test('P0.8: Deleting text content reduces total page count', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Populate 3 pages of content
    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        let html = '';
        for (let i = 1; i <= 40; i++) {
          html += `<p id="doc_p_${i}" style="margin-bottom: 12px; line-height: 1.6;">Block Paragraph ${i}: Standard evaluation note.</p>`;
        }
        host.innerHTML = html;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(600);

    const initialSheets = await getVisualSheetCount(page);
    expect(initialSheets).toBeGreaterThanOrEqual(2);

    // Delete majority of paragraphs (leave only 1 small paragraph)
    await page.evaluate(() => {
      const host = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (host) {
        host.innerHTML = `<p id="doc_p_short">Short single line text.</p>`;
        host.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(500);

    const finalSheets = await getVisualSheetCount(page);
    expect(finalSheets).toBe(1);
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();
  });
});
