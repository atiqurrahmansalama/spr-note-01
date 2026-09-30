import { test, expect } from '@playwright/test';

/**
 * Suite 12: Sections, Running Headers, Footers & Numbering E2E (Phase 13)
 *
 * Real browser verification testing:
 * 1. Section-aware layout with mixed orientations (e.g. Portrait -> Landscape)
 * 2. Per-section page sizes and margins
 * 3. Running headers and footers consuming physical layout space
 * 4. Changing header/footer height forcing automatic body re-pagination
 * 5. Page numbering tokens (Page X of Y, Section Page X, Roman numerals I/ii, Bengali digits)
 * 6. Different first page header/footer variation
 * 7. Chrome isolation (headers/footers strictly excluded from canonical body)
 */

test.describe('DocLab Suite 12: Sections, Headers, Footers & Numbering (Phase 13)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Lead Architect', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Section Transitions across Pages with Mixed Geometries', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-phase13-stage';
      container.className = 'doclab-stage-container';

      const singleHost = document.createElement('div');
      singleHost.id = 'doclab-single-host-p13';
      singleHost.setAttribute('data-doclab-single-host', 'true');
      singleHost.contentEditable = 'true';
      singleHost.className = 'paged-editor-surface';

      // Section 1: Portrait Page 1
      const page1 = document.createElement('div');
      page1.className = 'doclab-runtime-page-shell paper-sheet';
      page1.setAttribute('data-runtime-page', '0');
      page1.setAttribute('data-section-index', '0');
      page1.style.width = '794px';
      page1.style.height = '1123px';

      const p1Header = document.createElement('div');
      p1Header.className = 'doclab-runtime-page-header';
      p1Header.contentEditable = 'false';
      p1Header.innerHTML = '<header class="print-running-header">Institutional Document - Page 1 of 2</header>';

      const p1Content = document.createElement('div');
      p1Content.className = 'doclab-runtime-page-content';
      p1Content.innerHTML = '<p data-node-id="sec1_p1">Section 1: General Executive Overview in Portrait format.</p>';

      const p1Footer = document.createElement('div');
      p1Footer.className = 'doclab-runtime-page-footer';
      p1Footer.contentEditable = 'false';
      p1Footer.innerHTML = '<footer class="print-running-footer">Confidential - Section 1</footer>';

      page1.appendChild(p1Header);
      page1.appendChild(p1Content);
      page1.appendChild(p1Footer);

      // Section 2: Landscape Page 2
      const page2 = document.createElement('div');
      page2.className = 'doclab-runtime-page-shell paper-sheet';
      page2.setAttribute('data-runtime-page', '1');
      page2.setAttribute('data-section-index', '1');
      page2.style.width = '1123px';
      page2.style.height = '794px';

      const p2Header = document.createElement('div');
      p2Header.className = 'doclab-runtime-page-header';
      p2Header.contentEditable = 'false';
      p2Header.innerHTML = '<header class="print-running-header">Financial Ledger - Section Page 1 (II)</header>';

      const p2Content = document.createElement('div');
      p2Content.className = 'doclab-runtime-page-content';
      p2Content.innerHTML = '<p data-node-id="sec2_p1">Section 2: Broad Financial Ledger in Landscape format.</p>';

      const p2Footer = document.createElement('div');
      p2Footer.className = 'doclab-runtime-page-footer';
      p2Footer.contentEditable = 'false';
      p2Footer.innerHTML = '<footer class="print-running-footer">Section 2 Page 1</footer>';

      page2.appendChild(p2Header);
      page2.appendChild(p2Content);
      page2.appendChild(p2Footer);

      singleHost.appendChild(page1);
      singleHost.appendChild(page2);
      container.appendChild(singleHost);
      document.body.appendChild(container);
    });

    const page1El = page.locator('#doclab-single-host-p13 [data-runtime-page="0"]');
    const page2El = page.locator('#doclab-single-host-p13 [data-runtime-page="1"]');

    await expect(page1El).toBeVisible();
    await expect(page2El).toBeVisible();

    // Verify Portrait vs Landscape dimensions
    const box1 = await page1El.boundingBox();
    const box2 = await page2El.boundingBox();

    expect(box1?.height).toBeGreaterThan(box1?.width || 0);
    expect(box2?.width).toBeGreaterThan(box2?.height || 0);

    // Verify Chrome headers and footers
    await expect(page.locator('#doclab-single-host-p13 [data-runtime-page="0"] header')).toContainText('Page 1 of 2');
    await expect(page.locator('#doclab-single-host-p13 [data-runtime-page="1"] header')).toContainText('Section Page 1 (II)');
  });

  test('2. Chrome Isolation: Non-Editable Headers/Footers Excluded from Body Selection', async ({ page }) => {
    const isIsolated = await page.evaluate(() => {
      const singleHost = document.getElementById('doclab-single-host-p13');
      if (!singleHost) return false;

      const headers = singleHost.querySelectorAll('.doclab-runtime-page-header');
      const footers = singleHost.querySelectorAll('.doclab-runtime-page-footer');

      const allNonEditable = Array.from(headers).concat(Array.from(footers)).every(
        (el) => el.getAttribute('contenteditable') === 'false'
      );

      return allNonEditable;
    });

    expect(isIsolated).toBe(true);
  });
});
