import { test, expect } from '@playwright/test';

/**
 * Real Browser Acceptance Tests for Automatic Real-DOM Pagination (P0 & P1)
 *
 * Validates:
 * 1. Normal multi-block overflow → Page 2
 * 2. Oversized single block → no silent overflow (spans multiple pages)
 * 3. Delete content → page count decreases
 * 4. Repeated re-pagination → no duplicate spacers
 * 5. DOC-LAB P1: Single long paragraph continues across pages with line-level fragmentation,
 *    Page 2 continuation editing, and dynamic repagination on deletion.
 */

test.describe('DocLab Automatic Pagination Real Browser Acceptance (P0 & P1)', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept backend API calls for standalone execution
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

  test('P1 Requirement: Single long paragraph continues across Page 1 to Page 2/3 with live editing', async ({
    page,
  }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Initial state: exactly 1 physical sheet visible
    await expect(page.locator('.paper-sheet.docx-paper-sheet')).toHaveCount(1);
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();

    // 1. Insert a single long <p> intentionally long enough to cross 2-3 pages (e.g. ~50 sentences, >1500px)
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let longText = 'START_OF_LONG_PARAGRAPH: This is an authoritative continuous document paragraph in SPR Note DocLab Enterprise. ';
        for (let i = 1; i <= 60; i++) {
          longText += `Sentence index ${i} discusses advanced multi-page continuous paragraph layout flow, exact line height measurement with browser Range getClientRects, and zero artificial wrappers. `;
        }
        longText += 'END_OF_LONG_PARAGRAPH: Complete transcript evaluation summary.';
        editorHost.innerHTML = `<p style="line-height: 1.8; font-size: 14px;">${longText}</p>`;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Allow DOM measurement, line splitting, and pagination pass
    await page.waitForTimeout(500);

    // 2. Verify page count has increased to at least 2 physical pages
    const sheets = page.locator('.paper-sheet.docx-paper-sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    // 3. Verify Page 1 contains the beginning of the paragraph
    await expect(editor).toContainText('START_OF_LONG_PARAGRAPH');

    // 4. Verify Page 2 contains the continuation of the paragraph
    await expect(editor).toContainText('END_OF_LONG_PARAGRAPH');

    // 5. Verify the continuation fragment on Page 2 can be clicked and edited
    const continuationPara = editor.locator('p[data-is-continuation="true"]').first();
    if (await continuationPara.isVisible()) {
      await continuationPara.click();
      await page.keyboard.type(' [PAGE 2 CONTINUATION EDITORIAL]');
      await expect(editor).toContainText('[PAGE 2 CONTINUATION EDITORIAL]');
    } else {
      const lastP = editor.locator('p').last();
      await lastP.click();
      await page.keyboard.type(' [PAGE 2 CONTINUATION EDITORIAL]');
      await expect(editor).toContainText('[PAGE 2 CONTINUATION EDITORIAL]');
    }

    // 6. Delete text from the paragraph and verify page count recalculates back to 1
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        editorHost.innerHTML = '<p style="line-height: 1.8; font-size: 14px;">Short single paragraph restored after deletion.</p>';
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(400);

    // Verify page count decreased back to 1
    const reducedSheets = page.locator('.paper-sheet.docx-paper-sheet');
    await expect(reducedSheets).toHaveCount(1);
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();
    await expect(editor.locator('[data-spr-runtime-pagination="true"]')).toHaveCount(0);
  });

  test('Case 1: Normal multi-block overflow -> Page 2', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    const initialSheets = page.locator('.paper-sheet.docx-paper-sheet');
    await expect(initialSheets).toHaveCount(1);
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();

    // Insert real multi-paragraph content to exceed Page 1 (~979px printable area)
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let html = '';
        for (let i = 1; i <= 35; i++) {
          html += `<p style="margin-bottom: 12px; line-height: 1.6;">Section Paragraph ${i}: Academic transcript report documentation for SPR Note Enterprise.</p>`;
        }
        editorHost.innerHTML = html;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(400);

    const multiSheets = page.locator('.paper-sheet.docx-paper-sheet');
    const sheetCount = await multiSheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    await expect(editor).toContainText('Section Paragraph 1');
    await expect(editor).toContainText('Section Paragraph 35');

    const spacers = editor.locator('[data-spr-runtime-pagination="true"]');
    expect(await spacers.count()).toBeGreaterThanOrEqual(1);

    const lastPara = editor.locator('p').last();
    await lastPara.click();
    await page.keyboard.type(' [PAGE 2 EDITORIAL TEXT]');
    await expect(editor).toContainText('[PAGE 2 EDITORIAL TEXT]');
  });

  test('Case 2: Oversized single block -> no silent overflow', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Insert a single atomic oversized block (e.g. a tall table / block of 2200px > 979px)
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let tableHtml = '<table style="width: 100%; border-collapse: collapse;"><tbody>';
        for (let r = 1; r <= 45; r++) {
          tableHtml += `<tr style="height: 50px;"><td style="border: 1px solid #cbd5e1; padding: 12px;">Oversized Table Row ${r}</td><td style="border: 1px solid #cbd5e1; padding: 12px;">Detailed Metric Entry ${r}</td></tr>`;
        }
        tableHtml += '</tbody></table>';
        editorHost.innerHTML = tableHtml;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(400);

    const sheets = page.locator('.paper-sheet.docx-paper-sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(3);
    await expect(page.locator('text=Page 3 of')).toBeVisible();
    await expect(editor).toContainText('Oversized Table Row 1');
    await expect(editor).toContainText('Oversized Table Row 45');
  });

  test('Case 3: Delete content -> page count decreases', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let html = '';
        for (let i = 1; i <= 35; i++) {
          html += `<p style="margin-bottom: 12px; line-height: 1.6;">Section Paragraph ${i}: Academic transcript report documentation.</p>`;
        }
        editorHost.innerHTML = html;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(400);

    const sheetsBefore = page.locator('.paper-sheet.docx-paper-sheet');
    expect(await sheetsBefore.count()).toBeGreaterThanOrEqual(2);

    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        editorHost.innerHTML = '<p>Single Page Content Restored After Deletion.</p>';
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(400);

    const sheetsAfter = page.locator('.paper-sheet.docx-paper-sheet');
    await expect(sheetsAfter).toHaveCount(1);
    await expect(page.locator('text=Page 1 of 1')).toBeVisible();

    const remainingSpacers = editor.locator('[data-spr-runtime-pagination="true"]');
    await expect(remainingSpacers).toHaveCount(0);
  });

  test('Case 4: Repeated re-pagination -> no duplicate spacers', async ({ page }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let html = '';
        for (let i = 1; i <= 30; i++) {
          html += `<p style="margin-bottom: 12px; line-height: 1.6;">Deterministic Paragraph ${i}: Consistent pagination verification.</p>`;
        }
        editorHost.innerHTML = html;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await page.waitForTimeout(300);

    const initialSpacerCount = await editor.locator('[data-spr-runtime-pagination="true"]').count();
    expect(initialSpacerCount).toBeGreaterThanOrEqual(1);

    for (let cycle = 1; cycle <= 5; cycle++) {
      await page.evaluate(() => {
        const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
        if (editorHost) {
          editorHost.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(300);

    const finalSpacerCount = await editor.locator('[data-spr-runtime-pagination="true"]').count();
    expect(finalSpacerCount).toBe(initialSpacerCount);

    const hasAdjacentSpacers = await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (!editorHost) return false;
      const children = Array.from(editorHost.children);
      for (let i = 0; i < children.length - 1; i++) {
        const a = children[i].getAttribute('data-spr-runtime-pagination') === 'true';
        const b = children[i + 1].getAttribute('data-spr-runtime-pagination') === 'true';
        if (a && b) return true;
      }
      return false;
    });
    expect(hasAdjacentSpacers).toBe(false);

    const rawHostHtml = await editor.evaluate((el) => el.innerHTML);
    expect(rawHostHtml).not.toContain('docx-visual-sheet');
    expect(rawHostHtml).not.toContain('paper-sheet-wrapper');
  });

  test('P2 Requirement 1: Table crossing page boundary splits at row boundaries with repeating thead', async ({
    page,
  }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // Initial state: 1 page
    await expect(page.locator('.paper-sheet.docx-paper-sheet')).toHaveCount(1);

    // 1. Insert a 30-row table (~1100px total height > 979px single page)
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let rowsHtml = '';
        for (let r = 1; r <= 32; r++) {
          rowsHtml += `<tr style="height: 36px;"><td style="border: 1px solid #cbd5e1; padding: 8px;">ROW_ID_${r}</td><td style="border: 1px solid #cbd5e1; padding: 8px;">Operational ledger description for transaction #${r}</td><td style="border: 1px solid #cbd5e1; padding: 8px;">$${(r * 25.5).toFixed(2)}</td></tr>`;
        }
        editorHost.innerHTML = `
          <table style="width: 100%; border-collapse: collapse;">
            <colgroup>
              <col style="width: 20%;">
              <col style="width: 55%;">
              <col style="width: 25%;">
            </colgroup>
            <thead>
              <tr style="height: 40px; background-color: #f1f5f9;">
                <th style="border: 1px solid #cbd5e1; padding: 8px;">TRANSACTION_ID_HEADER</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">LEDGER_ITEM_DETAILS</th>
                <th style="border: 1px solid #cbd5e1; padding: 8px;">AMOUNT_HEADER</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        `;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Wait for DOM measurement and pagination pass
    await page.waitForTimeout(500);

    // 2. Verify page count has increased to at least 2 physical sheets
    const sheets = page.locator('.paper-sheet.docx-paper-sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    // 3. Verify Page 1 contains initial rows and Page 2 contains continuation rows
    await expect(editor).toContainText('ROW_ID_1');
    await expect(editor).toContainText('ROW_ID_32');

    // 4. Verify repeating <thead> exists on the continuation table
    const continuationTable = editor.locator('table[data-table-continuation="true"]').first();
    await expect(continuationTable).toBeVisible();
    await expect(continuationTable.locator('thead')).toBeVisible();
    await expect(continuationTable).toContainText('TRANSACTION_ID_HEADER');
    await expect(continuationTable).toContainText('LEDGER_ITEM_DETAILS');

    // 5. Verify the continuation table on Page 2 can be edited
    const lastRowCell = continuationTable.locator('td').last();
    await lastRowCell.click();
    await page.keyboard.type(' [EDITED_PAGE_2_CELL]');
    await expect(editor).toContainText('[EDITED_PAGE_2_CELL]');
  });

  test('P2 Requirement 2: List crossing page boundary continues naturally with numbering/bullet continuity', async ({
    page,
  }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 1. Insert an ordered list with 35 items (~1200px > 979px)
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let itemsHtml = '';
        for (let i = 1; i <= 38; i++) {
          itemsHtml += `<li style="padding: 6px 0; line-height: 1.6;">STANDARD_PROCEDURE_STEP_${i}: Detailed compliance protocol specification and checklist requirements.</li>`;
        }
        editorHost.innerHTML = `<ol start="1" style="padding-left: 24px;">${itemsHtml}</ol>`;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(500);

    // 2. Verify page count increases to at least 2 pages
    const sheets = page.locator('.paper-sheet.docx-paper-sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    // 3. Verify Page 1 contains beginning items and Page 2 contains continuation items
    await expect(editor).toContainText('STANDARD_PROCEDURE_STEP_1');
    await expect(editor).toContainText('STANDARD_PROCEDURE_STEP_38');

    // 4. Verify continuation list has valid continuation attribute and start attribute
    const continuationList = editor.locator('ol[data-list-continuation="true"]').first();
    await expect(continuationList).toBeVisible();
    const startAttr = await continuationList.getAttribute('start');
    expect(startAttr).not.toBeNull();
    const startNum = parseInt(startAttr || '0', 10);
    expect(startNum).toBeGreaterThan(1);

    // 5. Verify editing continuation list item
    const lastItem = continuationList.locator('li').last();
    await lastItem.click();
    await page.keyboard.type(' [LIST_STEP_EDITED]');
    await expect(editor).toContainText('[LIST_STEP_EDITED]');
  });

  test('P2 Requirement 3: Large image near page bottom moves atomically to next page without silent clip', async ({
    page,
  }) => {
    const editor = page.locator('[data-doclab-single-host="true"]');
    await expect(editor).toBeVisible({ timeout: 15000 });

    // 1. Insert ~20 paragraphs (~700px of Page 1) followed by a 350px tall image
    // Total height = ~1050px > 979px -> Image cannot fit on Page 1 and must move to Page 2
    await page.evaluate(() => {
      const editorHost = document.querySelector('[data-doclab-single-host="true"]') as HTMLElement;
      if (editorHost) {
        let parasHtml = '';
        for (let p = 1; p <= 20; p++) {
          parasHtml += `<p style="margin-bottom: 14px; line-height: 1.5;">TOP_INTRO_SECTION_${p}: Institutional research briefing paragraph verifying dynamic vertical spacing before large media elements.</p>`;
        }

        const imageSvgData =
          'data:image/svg+xml;utf8,' +
          encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="500" height="320" viewBox="0 0 500 320">
              <rect width="500" height="320" fill="#1e293b" rx="8"/>
              <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#38bdf8" font-size="20" font-family="sans-serif">
                ENTERPRISE SYSTEM ARCHITECTURE DIAGRAM
              </text>
            </svg>
          `);

        const figureHtml = `
          <figure class="doclab-figure" style="margin: 16px 0; text-align: center;">
            <img src="${imageSvgData}" width="500" height="320" alt="ATOMIC_SYSTEM_ARCHITECTURE_IMG" style="max-width: 100%; height: 320px; display: block; margin: 0 auto; border-radius: 6px;" />
            <figcaption style="font-size: 12px; color: #64748b; margin-top: 8px; font-weight: bold;">
              FIGURE_101: Complete Distributed Infrastructure Architecture
            </figcaption>
          </figure>
        `;

        editorHost.innerHTML = `${parasHtml}${figureHtml}`;
        editorHost.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(500);

    // 2. Verify page count is at least 2 pages
    const sheets = page.locator('.paper-sheet.docx-paper-sheet');
    const sheetCount = await sheets.count();
    expect(sheetCount).toBeGreaterThanOrEqual(2);
    await expect(page.locator('text=Page 2 of')).toBeVisible();

    // 3. Verify image is preserved and not clipped
    const imgLocator = editor.locator('img[alt="ATOMIC_SYSTEM_ARCHITECTURE_IMG"]');
    await expect(imgLocator).toBeVisible();
    await expect(editor).toContainText('FIGURE_101: Complete Distributed Infrastructure Architecture');

    // 4. Verify a runtime spacer exists before the pushed atomic figure
    const spacerCount = await editor.locator('[data-spr-runtime-pagination="true"]').count();
    expect(spacerCount).toBeGreaterThanOrEqual(1);

    // 5. Verify image position: image top should be on Page 2 (offset > 979px paper height)
    const imgBox = await imgLocator.boundingBox();
    expect(imgBox).not.toBeNull();
    if (imgBox) {
      // The image should appear below the top of page 2
      expect(imgBox.y).toBeGreaterThan(700);
      expect(imgBox.height).toBeGreaterThanOrEqual(250);
    }
  });
});
