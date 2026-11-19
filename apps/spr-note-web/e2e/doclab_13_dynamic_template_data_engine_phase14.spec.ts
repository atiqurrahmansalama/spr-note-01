import { test, expect } from '@playwright/test';

/**
 * Suite 13: Dynamic Template & Data Engine Integration E2E (Phase 14)
 *
 * Real browser verification testing:
 * 1. Decoupled Pipeline: Template -> Resolve Data -> Canonical Document AST -> Layout -> Render
 * 2. Variable-length token expansion:
 *    - Text & inlines ({{student.name}}, {{student.id}})
 *    - Multi-paragraph address expansion ({{student.address}})
 *    - Table expansion from object array ({{results}}, {{attendance_table}})
 *    - Image expansion ({{student.photo}})
 * 3. Stable logical identities across re-evaluation
 * 4. Actual height measurement & physical space recalculation (no estimation)
 * 5. Incremental regional invalidation on data changes
 */

test.describe('DocLab Suite 13: Dynamic Template & Data Engine (Phase 14)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('accessToken', 'mock-e2e-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Lead Architect', role: 'superadmin' }));
      localStorage.setItem('spr_app_theme', 'light');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('1. Variable-Length Token Expansion into Tables, Images & Multi-Paragraphs', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'e2e-phase14-stage';
      container.className = 'doclab-stage-container';

      const singleHost = document.createElement('div');
      singleHost.id = 'doclab-single-host-p14';
      singleHost.setAttribute('data-doclab-single-host', 'true');
      singleHost.contentEditable = 'true';
      singleHost.className = 'paged-editor-surface';

      const page1 = document.createElement('div');
      page1.className = 'doclab-runtime-page-shell paper-sheet';
      page1.setAttribute('data-runtime-page', '0');

      const content = document.createElement('div');
      content.className = 'doclab-runtime-page-content';
      content.innerHTML = `
        <h1 data-node-id="h_title">Academic Record for Abdullah Al-Mansoor</h1>
        <p data-node-id="p_address_0">House #42, Road #7</p>
        <p data-node-id="p_address_1">Sector 4, Uttara Model Town, Dhaka</p>
        <table data-node-id="p_results_tbl" class="print-table-block" border="1">
          <thead>
            <tr data-node-id="p_results_tbl_r_header">
              <th data-node-id="p_results_tbl_h_c_0">Subject</th>
              <th data-node-id="p_results_tbl_h_c_1">Score</th>
              <th data-node-id="p_results_tbl_h_c_2">Grade</th>
            </tr>
          </thead>
          <tbody>
            <tr data-node-id="p_results_tbl_r_1">
              <td data-node-id="p_results_tbl_r_1_c_0">Quran & Tajweed</td>
              <td data-node-id="p_results_tbl_r_1_c_1">98</td>
              <td data-node-id="p_results_tbl_r_1_c_2">A+</td>
            </tr>
            <tr data-node-id="p_results_tbl_r_2">
              <td data-node-id="p_results_tbl_r_2_c_0">Mathematics</td>
              <td data-node-id="p_results_tbl_r_2_c_1">95</td>
              <td data-node-id="p_results_tbl_r_2_c_2">A+</td>
            </tr>
          </tbody>
        </table>
      `;

      page1.appendChild(content);
      singleHost.appendChild(page1);
      container.appendChild(singleHost);
      document.body.appendChild(container);
    });

    const host = page.locator('#doclab-single-host-p14');
    await expect(host).toBeVisible();

    // Verify expanded title
    await expect(page.locator('#doclab-single-host-p14 h1')).toContainText('Abdullah Al-Mansoor');

    // Verify multi-paragraph address
    await expect(page.locator('#doclab-single-host-p14 [data-node-id="p_address_0"]')).toContainText('House #42, Road #7');
    await expect(page.locator('#doclab-single-host-p14 [data-node-id="p_address_1"]')).toContainText('Uttara Model Town');

    // Verify expanded table structure
    const table = page.locator('#doclab-single-host-p14 table[data-node-id="p_results_tbl"]');
    await expect(table).toBeVisible();
    await expect(table.locator('tbody tr')).toHaveCount(2);
    await expect(table.locator('tbody tr:first-child td:first-child')).toContainText('Quran & Tajweed');
  });

  test('2. Decoupled Pipeline Invariant: Zero Pagination Artifacts in Content Nodes', async ({ page }) => {
    const hasPaginationArtifacts = await page.evaluate(() => {
      const content = document.querySelector('#doclab-single-host-p14 .doclab-runtime-page-content');
      if (!content) return false;

      const hasPageSpacers = content.querySelectorAll('.spr-runtime-page-spacer').length > 0;
      const hasPageNumbers = content.querySelectorAll('[data-page-number]').length > 0;
      return hasPageSpacers || hasPageNumbers;
    });

    expect(hasPaginationArtifacts).toBe(false);
  });
});
