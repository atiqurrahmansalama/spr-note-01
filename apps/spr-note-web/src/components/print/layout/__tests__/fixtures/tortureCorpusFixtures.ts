/**
 * tortureCorpusFixtures.ts
 *
 * Permanent DocLab Layout Torture-Test Corpus (Phase 18).
 * Comprehensive regression-prevention fixtures covering 30 extreme layout edge cases.
 *
 * Architectural Invariants:
 * 1. Monotonic page ordering & zero layout overlap.
 * 2. Zero content loss & zero duplicated fragments.
 * 3. Zero persisting runtime pagination spacers or synthetic wrappers.
 * 4. Strict Word-grade table header repetition on subsequent continuation pages.
 * 5. Deterministic keep-with-next heading protection & widow/orphan boundary control.
 * 6. Multilingual bidirectional parity (LTR/RTL, Bengali, Arabic, English).
 * 7. Linear performance scaling under extreme 100-page and 500-page document loads.
 */

import { LayoutDocumentOptions } from '../../types/documentTypes';
import { PaginationEngineResult } from '../../types/paginationTypes';

export interface TortureFixtureInvariants {
  minPages: number;
  maxPages: number;
  exactPages?: number;
  mustContainSubstrings?: string[];
  mustAvoidSubstrings?: string[];
  expectRepeatingTableHeaders?: boolean;
  expectKeepWithNext?: boolean;
  expectNoOrphanHeadings?: boolean;
  expectNoRuntimeSpacers?: boolean;
  expectMonotonicPages?: boolean;
  expectRTL?: boolean;
  maxCalculationTimeMs?: number;
  customValidator?: (result: PaginationEngineResult) => { valid: boolean; error?: string };
}

export interface TortureFixture {
  id: string;
  name: string;
  category:
    | 'typography'
    | 'tables'
    | 'lists'
    | 'media'
    | 'structure'
    | 'pagination_rules'
    | 'multilingual'
    | 'geometry'
    | 'mutation'
    | 'extreme_scale';
  description: string;
  htmlContent: string;
  options: LayoutDocumentOptions;
  invariants: TortureFixtureInvariants;
}

export const TORTURE_CORPUS_FIXTURES: Record<string, TortureFixture> = {
  // --------------------------------------------------------------------------
  // 1. One Long Paragraph (Continuous monolithic paragraph splitting)
  // --------------------------------------------------------------------------
  'torture-01-one-long-paragraph': {
    id: 'torture-01-one-long-paragraph',
    name: '1. One Long Paragraph',
    category: 'typography',
    description: 'A single monolithic paragraph containing over 1,500 words (9,000+ chars) that must fragment cleanly across physical pages at word boundaries with zero character loss.',
    htmlContent: `<p>${Array.from({ length: 70 })
      .map(
        (_, i) =>
          `Sentence [${i + 1}] of monolithic block: The enterprise document layout architecture ensures continuous spatial pagination without breaking character clusters, dropping inline punctuation, or producing phantom blank lines.`
      )
      .join(' ')}</p>`,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 3,
      maxPages: 8,
      mustContainSubstrings: ['Sentence [1] of monolithic block', 'Sentence [70] of monolithic block'],
      expectMonotonicPages: true,
      expectNoRuntimeSpacers: true,
    },
  },

  // --------------------------------------------------------------------------
  // 2. 20-Page Paragraph-Heavy Document
  // --------------------------------------------------------------------------
  'torture-02-twenty-page-document': {
    id: 'torture-02-twenty-page-document',
    name: '2. 20-Page Paragraph-Heavy Document',
    category: 'structure',
    description: 'A massive paragraph-heavy institutional whitepaper with dense paragraphs spanning 12-25 physical pages.',
    htmlContent: Array.from({ length: 140 })
      .map(
        (_, i) =>
          `<p style="margin-bottom: 12px; line-height: 1.6;"><strong>Clause §${i + 1}:</strong> Institutional Governance and Educational Compliance Framework mandates rigorous documentation protocols. Paragraph body ${i + 1} verifies continuous paragraph flow across physical page splits with strict spatial determinism and zero cumulative layout shifts.</p>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 12,
      maxPages: 25,
      mustContainSubstrings: ['Clause §1:', 'Clause §60:', 'Clause §140:'],
      expectMonotonicPages: true,
      expectNoRuntimeSpacers: true,
    },
  },

  // --------------------------------------------------------------------------
  // 3. Mixed Heading Hierarchy (H1 through H6 with Keep-With-Next)
  // --------------------------------------------------------------------------
  'torture-03-mixed-heading-hierarchy': {
    id: 'torture-03-mixed-heading-hierarchy',
    name: '3. Mixed Heading Hierarchy',
    category: 'typography',
    description: 'Deeply nested heading tree (H1, H2, H3, H4, H5, H6) interleaved with body paragraphs to test keep-with-next constraint enforcement across page breaks.',
    htmlContent: Array.from({ length: 14 })
      .map(
        (_, i) => `
        <h1 style="margin-top: 18px; margin-bottom: 8px;">Chapter ${i + 1}: Global Strategy</h1>
        <p style="margin-bottom: 10px;">Executive overview and architectural roadmap for chapter ${i + 1}.</p>
        <h2 style="margin-top: 14px; margin-bottom: 6px;">Section ${i + 1}.1: Infrastructure Specification</h2>
        <p style="margin-bottom: 10px;">Detailed infrastructure parameters and subsystem constraints.</p>
        <h3 style="margin-top: 12px; margin-bottom: 6px;">Sub-clause ${i + 1}.1.1: Core Microservices</h3>
        <p style="margin-bottom: 10px;">Microservice isolation, database sharding, and caching strategies.</p>
        <h4 style="margin-top: 10px; margin-bottom: 4px;">Metric ${i + 1}.1.1.A: Latency Benchmarks</h4>
        <p style="margin-bottom: 10px;">Sub-16ms interactive frame timing targets and SLA guarantees.</p>
        <h5 style="margin-top: 8px; margin-bottom: 4px;">Diagnostic ${i + 1}.1.1.A.i: Telemetry Stream</h5>
        <p style="margin-bottom: 10px;">Active tracing telemetry with zero frame budget regressions.</p>
        <h6 style="margin-top: 6px; margin-bottom: 2px;">Footnote ${i + 1}.1.1.A.i.a: Compliance Reference</h6>
        <p style="margin-bottom: 12px;">ISO/IEC 27001 audit standards and governance logs.</p>
      `
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 6,
      maxPages: 14,
      mustContainSubstrings: ['Chapter 1: Global Strategy', 'Chapter 14: Global Strategy', 'Footnote 14.1.1.A.i.a:'],
      expectKeepWithNext: true,
      expectNoOrphanHeadings: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 4. Massive Table (150 rows spanning multiple pages with repeating thead)
  // --------------------------------------------------------------------------
  'torture-04-massive-table': {
    id: 'torture-04-massive-table',
    name: '4. Massive Table',
    category: 'tables',
    description: 'A 150-row tabular dataset spanning across pages with repeating sticky thead on every page.',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;" border="1">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 10%;">ID</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 40%;">Asset Name</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 25%;">Category</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 25%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 150 })
            .map(
              (_, i) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">AST-${String(i + 1).padStart(4, '0')}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">Enterprise Hardware Unit #${i + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">Computing Infrastructure</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">ACTIVE_VERIFIED</td>
            </tr>`
            )
            .join('\n')}
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 10,
      maxPages: 22,
      mustContainSubstrings: ['AST-0001', 'AST-0150', 'Asset Name', 'ACTIVE_VERIFIED'],
      expectRepeatingTableHeaders: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 5. Variable-Height Table
  // --------------------------------------------------------------------------
  'torture-05-variable-height-table': {
    id: 'torture-05-variable-height-table',
    name: '5. Variable-Height Table',
    category: 'tables',
    description: 'Table with wildly alternating row heights (single-line codes vs multi-paragraph legal disclosures).',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;" border="1">
        <thead>
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <th style="padding: 8px; border: 1px solid #94a3b8; width: 20%;">Item Code</th>
            <th style="padding: 8px; border: 1px solid #94a3b8; width: 80%;">Detailed Specifications & Legal Disclosures</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 30 })
            .map((_, i) => {
              const isHuge = i % 3 === 0;
              return `
            <tr>
              <td style="padding: 8px; border: 1px solid #94a3b8; vertical-align: top;">ITEM-VAR-${i + 1}</td>
              <td style="padding: 8px; border: 1px solid #94a3b8;">
                ${
                  isHuge
                    ? `<p style="margin-bottom: 6px;"><strong>Major Clause ${i + 1}:</strong> Comprehensive multi-paragraph specification containing detailed regulatory adherence, ISO certifications, and encryption standards.</p>
                       <p style="margin-bottom: 6px;">Sub-paragraph A: High-availability distributed consensus protocols with cryptographic signatures.</p>
                       <p>Sub-paragraph B: Fault-tolerant multi-region failover testing with 99.999% uptime guarantee.</p>`
                    : `<p>Compact specification record for standard hardware component ${i + 1}.</p>`
                }
              </td>
            </tr>`;
            })
            .join('\n')}
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 3,
      maxPages: 8,
      mustContainSubstrings: ['ITEM-VAR-1', 'ITEM-VAR-30', 'Detailed Specifications'],
      expectRepeatingTableHeaders: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 6. Rowspan / Colspan Table
  // --------------------------------------------------------------------------
  'torture-06-rowspan-colspan-table': {
    id: 'torture-06-rowspan-colspan-table',
    name: '6. Rowspan / Colspan Table',
    category: 'tables',
    description: 'Complex financial matrix containing merged multi-row (rowspan) and multi-column (colspan) header and data cells.',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;" border="1">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th rowspan="2" style="padding: 6px; border: 1px solid #cbd5e1;">Department</th>
            <th colspan="2" style="padding: 6px; border: 1px solid #cbd5e1;">Q1 Financials</th>
            <th colspan="2" style="padding: 6px; border: 1px solid #cbd5e1;">Q2 Financials</th>
            <th rowspan="2" style="padding: 6px; border: 1px solid #cbd5e1;">Annual Total</th>
          </tr>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 4px; border: 1px solid #cbd5e1;">Budget</th>
            <th style="padding: 4px; border: 1px solid #cbd5e1;">Actual</th>
            <th style="padding: 4px; border: 1px solid #cbd5e1;">Budget</th>
            <th style="padding: 4px; border: 1px solid #cbd5e1;">Actual</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 40 })
            .map(
              (_, i) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">Division ${i + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">$${(i + 1) * 10000}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">$${(i + 1) * 9850}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">$${(i + 1) * 12000}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">$${(i + 1) * 11920}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">$${(i + 1) * 21770}</td>
            </tr>`
            )
            .join('\n')}
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 6,
      mustContainSubstrings: ['Division 1', 'Division 40', 'Q1 Financials', 'Annual Total'],
      expectRepeatingTableHeaders: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 7. Nested Table
  // --------------------------------------------------------------------------
  'torture-07-nested-table': {
    id: 'torture-07-nested-table',
    name: '7. Nested Table',
    category: 'tables',
    description: 'Tables nested inside parent table cells testing spatial width propagation and recursive block measurement.',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;" border="1">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 8px; border: 1px solid #94a3b8; width: 30%;">Master Account</th>
            <th style="padding: 8px; border: 1px solid #94a3b8; width: 70%;">Sub-ledger Breakdown</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 20 })
            .map(
              (_, i) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #94a3b8; vertical-align: top;">
                <strong>ACC-${1000 + i}</strong><br>
                Regional Operations Branch ${i + 1}
              </td>
              <td style="padding: 8px; border: 1px solid #94a3b8;">
                <table style="width: 100%; border-collapse: collapse; margin-top: 4px;" border="1">
                  <thead>
                    <tr style="background-color: #f8fafc; font-size: 11px;">
                      <th style="padding: 4px; border: 1px solid #cbd5e1;">Ledger Item</th>
                      <th style="padding: 4px; border: 1px solid #cbd5e1;">Allocated</th>
                      <th style="padding: 4px; border: 1px solid #cbd5e1;">Disbursed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style="padding: 4px; border: 1px solid #cbd5e1;">Personnel Salaries</td>
                      <td style="padding: 4px; border: 1px solid #cbd5e1;">$50,000</td>
                      <td style="padding: 4px; border: 1px solid #cbd5e1;">$50,000</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px; border: 1px solid #cbd5e1;">Equipment Lease</td>
                      <td style="padding: 4px; border: 1px solid #cbd5e1;">$15,000</td>
                      <td style="padding: 4px; border: 1px solid #cbd5e1;">$14,200</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>`
            )
            .join('\n')}
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 6,
      mustContainSubstrings: ['ACC-1000', 'Personnel Salaries', 'Sub-ledger Breakdown'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 8. Nested Lists (4-level deep hierarchical lists)
  // --------------------------------------------------------------------------
  'torture-08-nested-lists': {
    id: 'torture-08-nested-lists',
    name: '8. Nested Lists',
    category: 'lists',
    description: 'Deeply nested 4-level unordered and ordered lists verifying continuous bullet hierarchy and margin alignment.',
    htmlContent: `
      <h2>Institutional Policy Taxonomy</h2>
      ${Array.from({ length: 10 })
        .map(
          (_, i) => `
        <ul>
          <li>Level 1 [Item ${i + 1}]: Academic Governance Standard
            <ol>
              <li>Level 2 [Clause ${i + 1}.A]: Faculty Evaluation Rubrics
                <ul>
                  <li>Level 3 [Policy ${i + 1}.A.i]: Peer Review & Research Output
                    <ol>
                      <li>Level 4 [Metric ${i + 1}.A.i.a]: Verified citation index exceeding benchmark criteria.</li>
                      <li>Level 4 [Metric ${i + 1}.A.i.b]: Departmental curriculum contribution record.</li>
                    </ol>
                  </li>
                  <li>Level 3 [Policy ${i + 1}.A.ii]: Student Teaching Performance Feedback</li>
                </ul>
              </li>
              <li>Level 2 [Clause ${i + 1}.B]: Institutional Accreditation Protocols</li>
            </ol>
          </li>
        </ul>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 6,
      mustContainSubstrings: ['Level 1 [Item 1]:', 'Level 4 [Metric 10.A.i.b]:', 'Institutional Policy Taxonomy'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 9. Long Ordered List (80 items with sequential numbering)
  // --------------------------------------------------------------------------
  'torture-09-long-ordered-list': {
    id: 'torture-09-long-ordered-list',
    name: '9. Long Ordered List',
    category: 'lists',
    description: 'An 80-item numbered list spanning across physical pages verifying continuous list item counting.',
    htmlContent: `
      <h2>Executive Operational Directive Checklist (1 to 80)</h2>
      <ol style="line-height: 1.6;">
        ${Array.from({ length: 80 })
          .map(
            (_, i) =>
              `<li style="margin-bottom: 6px;">Directive Execution Task #${i + 1}: Complete mandatory institutional safety review, verify active tenant database sharding, and confirm multi-factor authentication compliance across regional workstations.</li>`
          )
          .join('\n')}
      </ol>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 4,
      maxPages: 14,
      mustContainSubstrings: ['Directive Execution Task #1:', 'Directive Execution Task #80:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 10. Images (Multiple raster images with keep-together atomic protection)
  // --------------------------------------------------------------------------
  'torture-10-images': {
    id: 'torture-10-images',
    name: '10. Images (Atomic Multi-Image Gallery)',
    category: 'media',
    description: 'Gallery of inline and banner images with explicit dimensions testing keep-together atomic placement.',
    htmlContent: Array.from({ length: 8 })
      .map(
        (_, i) => `
        <div style="margin-bottom: 16px;">
          <h3>Campus Facility Diagram #${i + 1}</h3>
          <p style="margin-bottom: 8px;">Detailed architectural elevation and spatial arrangement for Facility ${i + 1}.</p>
          <img
            src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160'><rect width='600' height='160' fill='%23e2e8f0'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23475569' font-size='16' font-family='sans-serif'>Facility Layout Diagram %23${i + 1}</text></svg>"
            alt="Facility ${i + 1}"
            style="width: 100%; height: 160px; object-fit: cover; border-radius: 4px; display: block;"
          />
        </div>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['Campus Facility Diagram #1', 'Campus Facility Diagram #8'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 11. SVG (Inline vector certificates and seals)
  // --------------------------------------------------------------------------
  'torture-11-svg': {
    id: 'torture-11-svg',
    name: '11. SVG Vector Elements',
    category: 'media',
    description: 'Inline scalable vector graphics (charts, decorative banners, emblems) verifying SVG viewBox preservation.',
    htmlContent: `
      <h2>Official Institutional Certification</h2>
      <p>This document certifies the highest standard of academic excellence and governance compliance.</p>
      ${Array.from({ length: 4 })
        .map(
          (_, i) => `
        <div style="margin-top: 16px; margin-bottom: 16px; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px;">
          <svg width="100%" height="120" viewBox="0 0 500 120" style="display: block;">
            <rect width="500" height="120" rx="8" fill="#f8fafc" stroke="#0284c7" stroke-width="2"/>
            <circle cx="60" cy="60" r="35" fill="#0284c7" opacity="0.15"/>
            <text x="60" y="66" font-size="20" font-weight="bold" fill="#0369a1" text-anchor="middle">★ ${i + 1}</text>
            <text x="120" y="50" font-size="16" font-weight="bold" fill="#0f172a">Institutional Quality Seal #${i + 1}</text>
            <text x="120" y="75" font-size="12" fill="#64748b">Verified by Accreditation Committee • Reference #${1000 + i}</text>
          </svg>
        </div>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 1,
      maxPages: 3,
      mustContainSubstrings: ['Institutional Quality Seal #1', 'Institutional Quality Seal #4'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 12. Image Captions (Figure and Figcaption atomic grouping)
  // --------------------------------------------------------------------------
  'torture-12-image-captions': {
    id: 'torture-12-image-captions',
    name: '12. Image Captions (Figure / Figcaption Pairing)',
    category: 'media',
    description: 'Figure blocks paired with multi-line captions testing keep-together rules to prevent caption orphan splits.',
    htmlContent: Array.from({ length: 6 })
      .map(
        (_, i) => `
        <figure style="margin: 0 0 20px 0; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
          <img
            src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='140'><rect width='500' height='140' fill='%23cbd5e1'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23334155' font-size='14'>Figure Graphic %23${i + 1}</text></svg>"
            alt="Figure ${i + 1}"
            style="width: 100%; height: 140px; display: block;"
          />
          <figcaption style="margin-top: 8px; font-size: 12px; color: #475569; font-style: italic; text-align: center;">
            <strong>Figure ${i + 1}:</strong> Comprehensive structural diagram illustrating the spatial distribution and subsystem interactions for campus zone ${i + 1}.
          </figcaption>
        </figure>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 1,
      maxPages: 4,
      mustContainSubstrings: ['Figure 1:', 'Figure 6:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 13. Signature Block (Multi-column legal signature blocks)
  // --------------------------------------------------------------------------
  'torture-13-signature-block': {
    id: 'torture-13-signature-block',
    name: '13. Signature Block (Atomic Legal Sign-off)',
    category: 'structure',
    description: 'Multi-party legal signature and official seal block that must never be split across page boundaries.',
    htmlContent: `
      <h2>Institutional Resolution & Executive Ratification</h2>
      <p style="margin-bottom: 20px;">By signing below, the authorized executive officers certify and ratify the governance decisions detailed in this instrument.</p>
      <div style="margin-top: 30px; border-top: 2px solid #0f172a; padding-top: 20px;">
        <table style="width: 100%; border: none;">
          <tr>
            <td style="width: 30%; vertical-align: top; padding-right: 15px;">
              <div style="border-bottom: 1px solid #0f172a; height: 50px;"></div>
              <p style="margin-top: 6px; font-weight: bold; font-size: 12px;">Dr. Aminul Islam</p>
              <p style="font-size: 11px; color: #64748b;">Chancellor & Executive Trustee</p>
              <p style="font-size: 10px; color: #94a3b8;">Date: ____________________</p>
            </td>
            <td style="width: 30%; vertical-align: top; padding-right: 15px;">
              <div style="border-bottom: 1px solid #0f172a; height: 50px;"></div>
              <p style="margin-top: 6px; font-weight: bold; font-size: 12px;">Prof. Tariq Mahmud</p>
              <p style="font-size: 11px; color: #64748b;">Dean of Academic Affairs</p>
              <p style="font-size: 10px; color: #94a3b8;">Date: ____________________</p>
            </td>
            <td style="width: 40%; vertical-align: top;">
              <div style="border-bottom: 1px solid #0f172a; height: 50px;"></div>
              <p style="margin-top: 6px; font-weight: bold; font-size: 12px;">Registrar & Controller of Examinations</p>
              <p style="font-size: 11px; color: #64748b;">Central Board of Governors</p>
              <p style="font-size: 10px; color: #94a3b8;">Official Stamp Seal: [ SEAL ]</p>
            </td>
          </tr>
        </table>
      </div>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 1,
      maxPages: 1,
      mustContainSubstrings: ['Dr. Aminul Islam', 'Chancellor & Executive Trustee', 'Prof. Tariq Mahmud', 'Official Stamp Seal'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 14. Header / Footer (Dynamic running header and footer tokens)
  // --------------------------------------------------------------------------
  'torture-14-header-footer': {
    id: 'torture-14-header-footer',
    name: '14. Running Headers & Footers',
    category: 'structure',
    description: 'Document with dynamic running headers and footers containing title, date, and page numbering variables.',
    htmlContent: Array.from({ length: 25 })
      .map(
        (_, i) =>
          `<p style="margin-bottom: 12px;">Section ${i + 1}: Comprehensive institutional compliance report detailing quarterly assessment metrics and accreditation benchmarks for educational term ${i + 1}.</p>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      title: 'Suffah Hifz Academy — Annual Review',
      headerConfig: {
        headerHtml: '<div style="display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; font-size: 11px;"><span>Suffah Hifz Academy — Annual Review</span><span>Page {{pageNumber}}</span></div>',
        headerHeightPx: 32,
      },
      footerConfig: {
        footerHtml: '<div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px; font-size: 11px;"><span>Confidential & Proprietary Institutional Record</span><span>Page {{pageNumber}}</span></div>',
        footerHeightPx: 32,
      },
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['Section 1:', 'Section 25:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 15. Multiple Sections (Sections with independent headers and page restarts)
  // --------------------------------------------------------------------------
  'torture-15-multiple-sections': {
    id: 'torture-15-multiple-sections',
    name: '15. Multiple Sections',
    category: 'structure',
    description: 'Document partitioned into 3 distinct sections via explicit section breaks with independent section titles.',
    htmlContent: `
      <h1>Section 1: Executive Summary</h1>
      <p>This introductory section outlines the high-level operational directives and organizational achievements.</p>
      <p>All departmental budgets are balanced and aligned with the strategic master plan.</p>

      <div class="spr-section-break" data-section-break="next-page" data-section-id="sec_2"></div>

      <h1>Section 2: Departmental Audit & Technical Benchmarks</h1>
      <p>Technical benchmarks evaluate latency, throughput, and cross-platform mobile compilation performance.</p>
      <p>Continuous testing ensures zero regression across all rendering targets.</p>

      <div class="spr-section-break" data-section-break="next-page" data-section-id="sec_3"></div>

      <h1>Section 3: Legal & Regulatory Adherence</h1>
      <p>Final governance certifications and compliance sign-offs from regulatory authorities.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 3,
      maxPages: 3,
      exactPages: 3,
      mustContainSubstrings: ['Section 1: Executive Summary', 'Section 2: Departmental Audit', 'Section 3: Legal & Regulatory'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 16. Manual Page Breaks (Explicit page boundary enforcement)
  // --------------------------------------------------------------------------
  'torture-16-manual-page-breaks': {
    id: 'torture-16-manual-page-breaks',
    name: '16. Manual Page Breaks',
    category: 'pagination_rules',
    description: 'Document with 4 explicit manual page breaks (<div class="spr-page-break" data-manual-break="true">) creating exactly 5 pages regardless of vertical space.',
    htmlContent: `
      <h2>Page 1 Content</h2>
      <p>Introductory text on physical page one.</p>
      <div class="spr-page-break" data-manual-break="true"></div>

      <h2>Page 2 Content</h2>
      <p>Specific departmental notice on physical page two.</p>
      <div class="spr-page-break" data-manual-break="true"></div>

      <h2>Page 3 Content</h2>
      <p>Financial ledger summary on physical page three.</p>
      <div class="spr-page-break" data-manual-break="true"></div>

      <h2>Page 4 Content</h2>
      <p>Faculty assignment schedule on physical page four.</p>
      <div class="spr-page-break" data-manual-break="true"></div>

      <h2>Page 5 Content</h2>
      <p>Concluding remarks and signature zone on physical page five.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      exactPages: 5,
      minPages: 5,
      maxPages: 5,
      mustContainSubstrings: ['Page 1 Content', 'Page 2 Content', 'Page 3 Content', 'Page 4 Content', 'Page 5 Content'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 17. Widow / Orphan Cases
  // --------------------------------------------------------------------------
  'torture-17-widow-orphan-cases': {
    id: 'torture-17-widow-orphan-cases',
    name: '17. Widow & Orphan Prevention',
    category: 'pagination_rules',
    description: 'Paragraphs calibrated near the page boundary to assert that single trailing/leading lines are prevented.',
    htmlContent: `
      ${Array.from({ length: 8 })
        .map(
          (_, i) => `
        <p style="margin-bottom: 14px; line-height: 1.6;">
          <strong>Block ${i + 1}:</strong> Paragraph leading line ensures proper indentation.
          Middle sentence providing extensive elaboration on educational administration and institutional governance.
          Additional supporting data points and performance metrics verifying continuous line distribution.
          Concluding sentence designed to test widow and orphan threshold boundary rules.
        </p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 1,
      maxPages: 3,
      mustContainSubstrings: ['Block 1:', 'Block 8:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 18. Keep-With-Next Cases
  // --------------------------------------------------------------------------
  'torture-18-keep-with-next-cases': {
    id: 'torture-18-keep-with-next-cases',
    name: '18. Keep-With-Next Enforcement',
    category: 'pagination_rules',
    description: 'Headings placed near bottom of page that must automatically push forward rather than leaving an orphan heading.',
    htmlContent: `
      ${Array.from({ length: 6 })
        .map(
          (_, i) => `
        <p style="margin-bottom: 12px; height: 140px;">Filler paragraph block #${i + 1} occupying calculated vertical height to position the subsequent section heading directly against the bottom margin threshold.</p>
        <h2 style="margin-top: 20px; margin-bottom: 8px;">Section ${i + 1}: Critical Audit Findings</h2>
        <p style="margin-bottom: 12px;">Immediate required subsequent paragraph that must remain glued to Section ${i + 1} heading without orphan separation.</p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['Section 1: Critical Audit', 'Section 6: Critical Audit'],
      expectKeepWithNext: true,
      expectNoOrphanHeadings: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 19. Arabic Document (Pure RTL)
  // --------------------------------------------------------------------------
  'torture-19-arabic-document': {
    id: 'torture-19-arabic-document',
    name: '19. Arabic Document (Pure RTL)',
    category: 'multilingual',
    description: 'Pure Arabic document with Right-to-Left layout, Eastern Arabic numerals (١، ٢، ٣), and Nastaliq typography.',
    htmlContent: `
      <h1 dir="rtl" style="text-align: right;">التقرير الأكاديمي السنوي لعام ٢٠٢٦</h1>
      <p dir="rtl" style="text-align: right;">تلتزم المؤسسة التعليمية بتقديم أعلى معايير الجودة والتميز في برامج تحفيظ القرآن الكريم والعلوم الإسلامية.</p>
      ${Array.from({ length: 14 })
        .map(
          (_, i) => `
        <h2 dir="rtl" style="text-align: right;">الفصل رقم ${i + 1}: الإنجازات الأكاديمية والتربوية</h2>
        <p dir="rtl" style="text-align: right;">شهد هذا العام الدراسي تقدماً ملحوظاً في مستويات الحفظ والإتقان، حيث تم تخريج الدفعة السادسة والعشرين من حفظة كتاب الله تعالى، مع تطبيق أدق معايير المتابعة المستمرة والتقييم الدوري.</p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['التقرير الأكاديمي السنوي', 'الفصل رقم 1:', 'الفصل رقم 14:'],
      expectRTL: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 20. Bengali Document
  // --------------------------------------------------------------------------
  'torture-20-bengali-document': {
    id: 'torture-20-bengali-document',
    name: '20. Bengali Document',
    category: 'multilingual',
    description: 'Bengali document with complex conjunct glyphs, Bengali numerals (১, ২, ৩), and custom line heights.',
    htmlContent: `
      <h1>বার্ষিক প্রাতিষ্ঠানিক প্রতিবেদন ২০২৬</h1>
      <p>সুফফাহ হিফজ একাডেমি শিক্ষার্থীদের সামগ্রিক মেধা বিকাশ, চরিত্র গঠন এবং আন্তর্জাতিক মানের পাঠ্যক্রম বাস্তবায়নে দৃঢ় প্রতিজ্ঞাবদ্ধ।</p>
      ${Array.from({ length: 16 })
        .map(
          (_, i) => `
        <h2>অধ্যায় #${i + 1}: শিক্ষা কার্যক্রম ও মূল্যায়ন পদ্ধতি</h2>
        <p>শিক্ষার্থীদের ধারাবাহিক অগ্রগতি মূল্যায়নে আধুনিক ডাটাবেজ সিস্টেম ও রিয়েল-টাইম ট্র্যাকিং নিশ্চিত করা হয়েছে। পরীক্ষার সার্বিক ফলাফল এবং শিক্ষকদের গুণগত মানোন্নয়ন কর্মশালা সফলভাবে সম্পন্ন হয়েছে।</p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['বার্ষিক প্রাতিষ্ঠানিক প্রতিবেদন', 'অধ্যায় #1:', 'অধ্যায় #16:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 21. Multilingual Mixed Document (English + Bengali + Arabic)
  // --------------------------------------------------------------------------
  'torture-21-multilingual-mixed': {
    id: 'torture-21-multilingual-mixed',
    name: '21. Multilingual Mixed Document (EN + BN + AR)',
    category: 'multilingual',
    description: 'Document containing interleaved English, Bengali, and Arabic sections testing bidirectional line formatting.',
    htmlContent: `
      <h1>Tri-lingual Institutional Charter (ত্রৈভাষিক প্রাতিষ্ঠানিক সনদ)</h1>
      <p>This charter governs academic standards across all participating faculties.</p>

      <div style="margin-top: 14px; padding: 10px; background-color: #f8fafc; border-left: 4px solid #0284c7;">
        <h3>Section 1 (English): Quality Standards</h3>
        <p>All instructional modules adhere strictly to ISO 21001 educational organization management standards.</p>
      </div>

      <div style="margin-top: 14px; padding: 10px; background-color: #f8fafc; border-left: 4px solid #16a34a;">
        <h3>ধারা ২ (বাংলা): পাঠ্যক্রম ও অনুশাসন</h3>
        <p>শিক্ষার্থীদের ধর্মীয় ও আধুনিক শিক্ষার সমন্বিত পাঠ্যক্রমের মাধ্যমে যোগ্য নাগরিক হিসেবে গড়ে তোলা আমাদের মূল লক্ষ্য।</p>
      </div>

      <div dir="rtl" style="margin-top: 14px; padding: 10px; background-color: #f8fafc; border-right: 4px solid #d97706; text-align: right;">
        <h3>البند ٣ (العربية): الميثاق الأكاديمي والاعتماد المؤسسي</h3>
        <p>يلتزم كافة أعضاء هيئة التدريس بالضوابط واللوائح المعتمدة لضمان جودة التعليم القرآني والتربوي.</p>
      </div>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 1,
      maxPages: 2,
      mustContainSubstrings: [
        'Tri-lingual Institutional Charter',
        'ISO 21001',
        'ধারা ২ (বাংলা)',
        'البند ٣ (العربية)',
      ],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 22. RTL Table
  // --------------------------------------------------------------------------
  'torture-22-rtl-table': {
    id: 'torture-22-rtl-table',
    name: '22. RTL Table',
    category: 'multilingual',
    description: 'Right-to-Left financial ledger table with Arabic column headers and mirrored alignment.',
    htmlContent: `
      <h2 dir="rtl" style="text-align: right;">جدول الميزانية والمصروفات التشغيلية لعام ٢٠٢٦</h2>
      <table dir="rtl" style="width: 100%; border-collapse: collapse; text-align: right;" border="1">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 15%;">الرمز</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 45%;">بيان المصروفات</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 20%;">المبلغ المعتمد</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 20%;">الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 30 })
            .map(
              (_, i) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">بند-${i + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">تكاليف تطوير المناهج والوسائل التعليمية #${i + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${(i + 1) * 2500} ريال</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">تم الصرف</td>
            </tr>`
            )
            .join('\n')}
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 4,
      mustContainSubstrings: ['جدول الميزانية', 'بند-1', 'بند-30', 'تم الصرف'],
      expectRepeatingTableHeaders: true,
      expectRTL: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 23. Very Small Margins (5mm edge tolerance)
  // --------------------------------------------------------------------------
  'torture-23-very-small-margins': {
    id: 'torture-23-very-small-margins',
    name: '23. Very Small Margins (5mm Ultra-Narrow)',
    category: 'geometry',
    description: 'Document with 5mm margins maximizing printable area and testing edge collision resistance.',
    htmlContent: `
      <h2>Ultra-Narrow Margin Edge Tolerance Test (5mm)</h2>
      <p style="margin-bottom: 10px;">This document verifies that text wraps cleanly within a 5mm edge perimeter without clipping or horizontal overflow.</p>
      ${Array.from({ length: 12 })
        .map(
          (_, i) =>
            `<p style="margin-bottom: 8px;">Edge block #${i + 1}: Maximized print canvas area testing margin boundaries. Available horizontal width is maximized while preserving subpixel font rendering and layout integrity.</p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'CUSTOM',
      customMarginsMm: { top: 5, right: 5, bottom: 5, left: 5 },
    },
    invariants: {
      minPages: 1,
      maxPages: 2,
      mustContainSubstrings: ['Ultra-Narrow Margin', 'Edge block #1:', 'Edge block #12:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 24. Very Large Margins (40mm wide margins)
  // --------------------------------------------------------------------------
  'torture-24-very-large-margins': {
    id: 'torture-24-very-large-margins',
    name: '24. Very Large Margins (40mm Ultra-Wide)',
    category: 'geometry',
    description: 'Document with 40mm margins creating a narrow flow column to verify vertical stacking without truncation.',
    htmlContent: `
      <h2>Ultra-Wide Margin Column Test (40mm)</h2>
      <p style="margin-bottom: 12px;">This test verifies flow pagination through an ultra-narrow central column with 40mm margins on all sides.</p>
      ${Array.from({ length: 20 })
        .map(
          (_, i) =>
            `<p style="margin-bottom: 10px;">Column item #${i + 1}: Multi-line paragraph wrapping tightly within constricted width boundaries without overflowing horizontally or generating invalid line breaks.</p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'CUSTOM',
      customMarginsMm: { top: 40, right: 40, bottom: 40, left: 40 },
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['Ultra-Wide Margin', 'Column item #1:', 'Column item #20:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 25. Portrait to Landscape Section
  // --------------------------------------------------------------------------
  'torture-25-portrait-to-landscape-section': {
    id: 'torture-25-portrait-to-landscape-section',
    name: '25. Portrait to Landscape Section',
    category: 'geometry',
    description: 'Document containing Portrait Section 1 followed by a wide Landscape Section 2 with dynamic dimensions.',
    htmlContent: `
      <h1>Section 1: Portrait Executive Overview</h1>
      <p>This introductory section is rendered in standard A4 Portrait format (210mm × 297mm).</p>

      <div class="spr-section-break" data-section-break="next-page" data-orientation="LANDSCAPE" data-section-id="sec_landscape"></div>

      <h1>Section 2: Landscape Comprehensive Matrix</h1>
      <p>This section is rendered in A4 Landscape format (297mm × 210mm) to accommodate wide financial tables.</p>
      <table style="width: 100%; border-collapse: collapse;" border="1">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Col 1</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Col 2</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Col 3</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Col 4</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Col 5</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1;">Col 6</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">Data 1</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">Data 2</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">Data 3</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">Data 4</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">Data 5</td>
            <td style="padding: 6px; border: 1px solid #cbd5e1;">Data 6</td>
          </tr>
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 3,
      mustContainSubstrings: ['Section 1: Portrait Executive', 'Section 2: Landscape Comprehensive'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 26. Font Change After Document Creation (Dynamic Typography Mutation)
  // --------------------------------------------------------------------------
  'torture-26-font-change-after-creation': {
    id: 'torture-26-font-change-after-creation',
    name: '26. Font Change After Document Creation',
    category: 'mutation',
    description: 'Document initialized with standard 12px font and subsequently resized to 18px triggering full reflow.',
    htmlContent: `
      <h2>Dynamic Font Scaling & Spatial Adaptation Test</h2>
      ${Array.from({ length: 15 })
        .map(
          (_, i) =>
            `<p style="margin-bottom: 10px;">Typography scaling paragraph #${i + 1}: When font size changes dynamically from 12px to 18px, available vertical budget per page decreases proportionally, forcing automatic re-pagination into additional pages.</p>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      fontSizePx: 18,
      lineHeight: 1.6,
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['Dynamic Font Scaling', 'Typography scaling paragraph #1:', 'Typography scaling paragraph #15:'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 27. Image Loading After Initial Layout (Asynchronous Asset Resolution)
  // --------------------------------------------------------------------------
  'torture-27-image-loading-after-initial-layout': {
    id: 'torture-27-image-loading-after-initial-layout',
    name: '27. Image Loading After Initial Layout',
    category: 'mutation',
    description: 'Document containing images that resolve dimensions asynchronously, verifying dynamic relayout without clipping.',
    htmlContent: `
      <h2>Asynchronous Media Resolution Protocol</h2>
      <p style="margin-bottom: 12px;">The document layout pipeline schedules incremental reflow passes when remote or dynamically loaded images finish loading.</p>
      ${Array.from({ length: 4 })
        .map(
          (_, i) => `
        <div style="margin-bottom: 16px;">
          <h3>Asynchronous Media Block #${i + 1}</h3>
          <img
            src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='200'><rect width='600' height='200' fill='%23e0f2fe'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%230369a1' font-size='16'>Asynchronous Asset %23${i + 1}</text></svg>"
            alt="Asset ${i + 1}"
            style="width: 100%; min-height: 200px; display: block;"
          />
        </div>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 2,
      maxPages: 5,
      mustContainSubstrings: ['Asynchronous Media Resolution', 'Asynchronous Media Block #1', 'Asynchronous Media Block #4'],
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 28. Dynamic Template Expansion (Mustache expansion from 1 to 4 pages)
  // --------------------------------------------------------------------------
  'torture-28-dynamic-template-expansion': {
    id: 'torture-28-dynamic-template-expansion',
    name: '28. Dynamic Template Expansion',
    category: 'mutation',
    description: 'Document template with Mustache tokens that expands into a multi-page detailed roster when merged with runtime data.',
    htmlContent: `
      <h2>Academic Merit Roster: {{academic_year}}</h2>
      <p>Official record of accredited students and course evaluations for term {{term_name}}.</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px;" border="1">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 15%;">Student ID</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 35%;">Student Name</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 25%;">Faculty</th>
            <th style="padding: 6px; border: 1px solid #cbd5e1; width: 25%;">GPA Score</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 60 })
            .map(
              (_, i) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">STU-${String(i + 1).padStart(4, '0')}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">Candidate Scholar #${i + 1}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">Department of Quranic Sciences</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${(3.5 + (i % 5) * 0.1).toFixed(2)} / 4.00</td>
            </tr>`
            )
            .join('\n')}
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 4,
      maxPages: 8,
      mustContainSubstrings: ['Academic Merit Roster', 'STU-0001', 'STU-0060', 'Quranic Sciences'],
      expectRepeatingTableHeaders: true,
      expectMonotonicPages: true,
    },
  },

  // --------------------------------------------------------------------------
  // 29. 100-Page Document (Extreme High-Volume Scale Benchmark)
  // --------------------------------------------------------------------------
  'torture-29-hundred-page-document': {
    id: 'torture-29-hundred-page-document',
    name: '29. 100-Page Document (Scale Benchmark)',
    category: 'extreme_scale',
    description: 'High-volume institutional catalog testing linear memory scaling and pagination calculation throughput under high page volume.',
    htmlContent: Array.from({ length: 600 })
      .map(
        (_, i) => `
        <div style="margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9;">
          <h3 style="margin-top: 6px; margin-bottom: 4px;">Institutional Archive Record #${i + 1}</h3>
          <p style="margin-bottom: 4px; line-height: 1.5;">Catalog entry #${i + 1} verifies continuous 100-page pagination memory stability, zero quadratic complexity slowdowns, and deterministic page ordering under enterprise volume stress.</p>
          <p style="font-size: 11px; color: #64748b;">Telemetry Checksum: 0x${((i + 1) * 7919).toString(16).toUpperCase()} • Security Clearance: LEVEL_${(i % 5) + 1}</p>
        </div>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 30,
      maxPages: 120,
      mustContainSubstrings: ['Institutional Archive Record #1', 'Institutional Archive Record #600'],
      maxCalculationTimeMs: 2500,
      expectMonotonicPages: true,
      expectNoRuntimeSpacers: true,
    },
  },

  // --------------------------------------------------------------------------
  // 30. 500-Page Document (Extreme Scale Stress Test)
  // --------------------------------------------------------------------------
  'torture-30-five-hundred-page-document': {
    id: 'torture-30-five-hundred-page-document',
    name: '30. 500-Page Document (Extreme Scale Stress)',
    category: 'extreme_scale',
    description: 'Extreme-scale enterprise archive testing chunked calculation, garbage collection stability, and sub-second chunk pagination.',
    htmlContent: Array.from({ length: 3000 })
      .map(
        (_, i) => `
        <p style="margin-bottom: 10px; line-height: 1.5;">
          <strong>Ledger Entry #${i + 1}:</strong> Historical audit log record ${i + 1} verifying enterprise DocLab scalability across physical sheets with zero memory leaks, continuous monotonic page indices, and robust layout convergence.
        </p>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    invariants: {
      minPages: 200,
      maxPages: 550,
      mustContainSubstrings: ['Ledger Entry #1:', 'Ledger Entry #1500:', 'Ledger Entry #3000:'],
      maxCalculationTimeMs: 6000,
      expectMonotonicPages: true,
      expectNoRuntimeSpacers: true,
    },
  },
};
