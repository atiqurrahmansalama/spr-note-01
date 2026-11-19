/**
 * Regression Test Fixtures for DocLab Layout Architecture
 * Comprehensive test cases covering all 23 layout edge cases.
 */

import { LayoutDocumentOptions } from '../../types/documentTypes';

export interface LayoutFixture {
  id: string;
  name: string;
  description: string;
  htmlContent: string;
  options: LayoutDocumentOptions;
  expectations: {
    minPages?: number;
    maxPages?: number;
    exactPages?: number;
    shouldContainTexts?: string[];
    shouldPreserveManualBreaks?: boolean;
    shouldRepeatTableHeader?: boolean;
    shouldAvoidOrphanHeading?: boolean;
    shouldKeepTogether?: boolean;
  };
}

export const LAYOUT_REGRESSION_FIXTURES: Record<string, LayoutFixture> = {
  // Phase 21 Acceptance Test: Multi-Page Bengali Document (A4 Portrait, Normal Margin, 12pt font)
  'phase-21-bengali-acceptance': {
    id: 'phase-21-bengali-acceptance',
    name: 'Phase 21 Acceptance Test (Bengali Multi-Page)',
    description: 'A4 portrait with Normal margin and 12pt font containing Bengali text that overflows into exactly 2 physical pages',
    htmlContent: Array.from({ length: 12 })
      .map(
        (_, i) =>
          `<p>অনুচ্ছেদ #${i + 1}: এটি একটি প্রাতিষ্ঠানিক ডকুমেন্টেশন পরীক্ষা যা বাংলা লিপির সঠিক লাইন ব্রেকিং, গ্লিফ পরিমাপ এবং ডকল্যাব লেআউট ইঞ্জিনের মাল্টি-শীট পেজিনেশন যাচাই করে। এই অংশটি নিশ্চিত করে যে কন্টেন্ট উপচে পড়লে স্বয়ংক্রিয়ভাবে পরবর্তী পেপারে স্থানান্তরিত হয়।</p>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 2,
      minPages: 2,
      maxPages: 2,
      shouldContainTexts: ['অনুচ্ছেদ #1', 'অনুচ্ছেদ #12'],
    },
  },

  // 1. Short Document (Fits cleanly on 1 page)
  'short-document': {
    id: 'short-document',
    name: 'Short Document',
    description: 'Single small paragraph with simple title that fits on 1 page without splitting',
    htmlContent: `
      <h1>Official Notice</h1>
      <p>This is a brief announcement regarding the upcoming semester examinations.</p>
      <p>All classes will conclude by end of next week.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
      minPages: 1,
      maxPages: 1,
      shouldContainTexts: ['Official Notice', 'All classes will conclude'],
    },
  },

  // 2. Multi-Page Paragraph (Continuous text spanning 2-3 pages)
  'multi-page-paragraph': {
    id: 'multi-page-paragraph',
    name: 'Multi-Page Paragraph',
    description: 'Multiple dense paragraphs that naturally overflow across multiple pages at sentence boundaries',
    htmlContent: Array.from({ length: 18 })
      .map(
        (_, i) =>
          `<p>Paragraph block #${i + 1}: Academic institutions require meticulous documentation and persistent records for examination administration, syllabus completion, and departmental assessments. This text tests multi-page continuous flow without loss of character strings or sentence structures.</p>`
      )
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 2,
      shouldContainTexts: ['Paragraph block #1', 'Paragraph block #18'],
    },
  },

  // 3. Very Long Paragraph (Single huge paragraph exceeding single page height)
  'very-long-paragraph': {
    id: 'very-long-paragraph',
    name: 'Very Long Paragraph',
    description: 'A single monolithic paragraph containing thousands of words that must be split at line/word boundaries',
    htmlContent: `<p>${Array.from({ length: 80 })
      .map(
        (_, i) =>
          `Sentence segment ${i + 1} verifies that the paragraph fragmenter splits words cleanly without truncating characters.`
      )
      .join(' ')}</p>`,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 2,
      shouldContainTexts: ['Sentence segment 1', 'Sentence segment 80'],
    },
  },

  // 4. Long Table (Multi-row table spanning several pages)
  'long-table': {
    id: 'long-table',
    name: 'Long Table',
    description: 'Data table with 60 rows spanning across multiple page sheets',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr><th>SL</th><th>Student Name</th><th>Roll</th><th>Subject</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${Array.from({ length: 60 })
            .map(
              (_, i) =>
                `<tr><td>${i + 1}</td><td>Student Name ${i + 1}</td><td>100${i + 1}</td><td>Computer Science</td><td>Pass</td></tr>`
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
    expectations: {
      minPages: 2,
      shouldContainTexts: ['Student Name 1', 'Student Name 60'],
      shouldRepeatTableHeader: true,
    },
  },

  // 5. Variable Row Height Table
  'variable-row-height': {
    id: 'variable-row-height',
    name: 'Variable Row Height Table',
    description: 'Table with varying content sizes: single line rows and large multi-paragraph cell descriptions',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr><th>ID</th><th>Title</th><th>Detailed Syllabus Description</th></tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Short Row</td><td>Brief outline.</td></tr>
          <tr><td>2</td><td>Complex Module</td><td>This module covers advanced distributed algorithms, consensus protocols, Byzantine fault tolerance, vector clocks, multi-master replication, and high-throughput transaction commit pipelines. Each student must submit a working implementation.</td></tr>
          <tr><td>3</td><td>Standard Row</td><td>Midterm laboratory assessment.</td></tr>
          <tr><td>4</td><td>Deep Architecture</td><td>Comprehensive exploration of hardware architecture, memory caching hierarchies, L1/L2/L3 cache coherence, MESI protocols, out-of-order instruction pipelines, branch prediction branch targets, and SIMD/AVX vectorized compute kernels.</td></tr>
        </tbody>
      </table>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 1,
      shouldContainTexts: ['Short Row', 'Complex Module', 'Deep Architecture'],
    },
  },

  // 6. Table Header Repeat
  'table-header-repeat': {
    id: 'table-header-repeat',
    name: 'Table Header Repeat',
    description: 'Verifies that table thead headers are cleanly repeated at the top of every subsequent sliced page',
    htmlContent: `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #0f172a; color: white;">
            <th>Index Number</th><th>Course Title</th><th>Credits</th><th>Grade Point</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from({ length: 50 })
            .map(
              (_, i) =>
                `<tr><td>${i + 1}</td><td>Course Module ${i + 1}</td><td>3.0</td><td>4.00</td></tr>`
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
    expectations: {
      minPages: 2,
      shouldRepeatTableHeader: true,
    },
  },

  // 7. Mixed Content (Headings, Paragraphs, Lists, Tables, Blockquotes)
  'mixed-content': {
    id: 'mixed-content',
    name: 'Mixed Content',
    description: 'Rich structured document containing multiple element types mixed in realistic academic order',
    htmlContent: `
      <h1>Semester Academic Report</h1>
      <p>Introduction overview paragraph describing the cohort statistics.</p>
      <h2>Departmental Breakdown</h2>
      <ul>
        <li>Department of Computer Science & Engineering</li>
        <li>Department of Electrical Engineering</li>
        <li>Department of Mathematics & Statistics</li>
      </ul>
      <table style="width: 100%;">
        <thead><tr><th>Metric</th><th>Target</th><th>Actual</th></tr></thead>
        <tbody>
          <tr><td>Pass Rate</td><td>85%</td><td>92.4%</td></tr>
          <tr><td>Attendance</td><td>80%</td><td>88.1%</td></tr>
        </tbody>
      </table>
      <blockquote>This report represents verified figures approved by the Board of Examinations.</blockquote>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
      shouldContainTexts: ['Semester Academic Report', 'Departmental Breakdown', 'Pass Rate', 'verified figures'],
    },
  },

  // 8. Image Overflow (Images with avoid break)
  'image-overflow': {
    id: 'image-overflow',
    name: 'Image Overflow',
    description: 'Document with large images that should not be vertically clipped or chopped in half',
    htmlContent: `
      <h2>Campus Map Diagram</h2>
      <p>Introductory instructions before the map.</p>
      <img src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'><rect width='600' height='400' fill='%23cbd5e1'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='24'>Campus Diagram</text></svg>" alt="Map" style="max-width: 100%; height: auto;" />
      <p>Post-map legend notes.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 1,
      shouldKeepTogether: true,
    },
  },

  // 9. Keep Together (Atomic cards/boxes)
  'keep-together': {
    id: 'keep-together',
    name: 'Keep Together',
    description: 'Containers with break-inside: avoid that must remain on the same page intact',
    htmlContent: `
      ${Array.from({ length: 6 })
        .map(
          (_, i) =>
            `<div class="keep-together" style="page-break-inside: avoid; break-inside: avoid; border: 1px solid #cbd5e1; padding: 12px; margin-bottom: 12px;">
              <h3>Student Profile #${i + 1}</h3>
              <p>Registration: 2026-CS-${i + 100}</p>
              <p>Specialization: Artificial Intelligence and Systems Engineering</p>
            </div>`
        )
        .join('\n')}
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 1,
      shouldKeepTogether: true,
    },
  },

  // 10. Keep With Next (Heading orphan protection)
  'keep-with-next': {
    id: 'keep-with-next',
    name: 'Keep With Next',
    description: 'Headings at the very bottom of a page must push to the next page to stay with their following content',
    htmlContent: `
      <div style="height: 600px;"><p>Spacer block to push content down</p></div>
      <h2>Chapter 4: Final Evaluation Criteria</h2>
      <p>This paragraph must remain directly beneath Chapter 4 heading.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 1,
      shouldAvoidOrphanHeading: true,
    },
  },

  // 11. Manual Page Break
  'manual-page-break': {
    id: 'manual-page-break',
    name: 'Manual Page Break',
    description: 'Explicit user page breaks via data-manual-break must create crisp page separations',
    htmlContent: `
      <h1>Page One Content</h1>
      <p>This is on page 1.</p>
      <div class="spr-page-break" data-manual-break="true" style="page-break-after: always; break-after: page;"></div>
      <h1>Page Two Content</h1>
      <p>This is strictly on page 2.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 2,
      shouldPreserveManualBreaks: true,
      shouldContainTexts: ['Page One Content', 'Page Two Content'],
    },
  },

  // 12. Header & Footer (Running chrome variables)
  'header-footer': {
    id: 'header-footer',
    name: 'Header & Footer',
    description: 'Running header and footer chrome interpolation with runtime date and title',
    htmlContent: `
      <h1>Comprehensive Syllabus</h1>
      <p>Detailed module breakdown for academic year 2026.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      showHeader: true,
      showFooter: true,
    },
    expectations: {
      exactPages: 1,
      shouldContainTexts: ['Comprehensive Syllabus'],
    },
  },

  // 13. Page Numbering
  'page-numbering': {
    id: 'page-numbering',
    name: 'Page Numbering',
    description: 'Dynamic resolution of {{page.number}} and {{page.total}} without persisting to source document',
    htmlContent: `
      <p>Section A Content</p>
      <div class="spr-page-break" data-manual-break="true"></div>
      <p>Section B Content</p>
      <div class="spr-page-break" data-manual-break="true"></div>
      <p>Section C Content</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 3,
      shouldContainTexts: ['Section A Content', 'Section B Content', 'Section C Content'],
    },
  },

  // 14. A4 Portrait
  'a4-portrait': {
    id: 'a4-portrait',
    name: 'A4 Portrait Geometry',
    description: 'Standard 210mm x 297mm A4 portrait physical dimensions',
    htmlContent: `<h1>A4 Portrait Document</h1><p>Testing standard geometry dimensions.</p>`,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
    },
  },

  // 15. A4 Landscape
  'a4-landscape': {
    id: 'a4-landscape',
    name: 'A4 Landscape Geometry',
    description: 'Wide 297mm x 210mm A4 landscape geometry for wide table ledgers',
    htmlContent: `<h1>A4 Landscape Document</h1><p>Testing wide tabular geometry dimensions.</p>`,
    options: {
      pageSize: 'A4',
      orientation: 'LANDSCAPE',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
    },
  },

  // 16. US Letter
  'letter': {
    id: 'letter',
    name: 'US Letter Geometry',
    description: '8.5in x 11in US Letter paper standard',
    htmlContent: `<h1>US Letter Document</h1><p>Standard North American letter sheet.</p>`,
    options: {
      pageSize: 'LETTER',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
    },
  },

  // 17. US Legal
  'legal': {
    id: 'legal',
    name: 'US Legal Geometry',
    description: '8.5in x 14in US Legal paper standard for extensive ledgers',
    htmlContent: `<h1>US Legal Document</h1><p>Long sheet for administrative manifests.</p>`,
    options: {
      pageSize: 'LEGAL',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
    },
  },

  // 18. Large Margins (Wide 31.8mm)
  'large-margins': {
    id: 'large-margins',
    name: 'Large Margins',
    description: 'Wide margins reduce printable content area width and height, causing earlier page breaks',
    htmlContent: Array.from({ length: 10 })
      .map((_, i) => `<p>Paragraph row ${i + 1} inside wide margin container.</p>`)
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'WIDE',
    },
    expectations: {
      minPages: 1,
    },
  },

  // 19. Small Margins (Narrow 12.7mm)
  'small-margins': {
    id: 'small-margins',
    name: 'Small Margins',
    description: 'Narrow margins maximize printable content area and fit more rows per sheet',
    htmlContent: Array.from({ length: 15 })
      .map((_, i) => `<p>Paragraph row ${i + 1} inside narrow margin container.</p>`)
      .join('\n'),
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NARROW',
    },
    expectations: {
      minPages: 1,
    },
  },

  // 20. Large Font (Spacious Typography)
  'large-font': {
    id: 'large-font',
    name: 'Large Font Typography',
    description: 'Large font size increases line height and causes earlier page fragmentation',
    htmlContent: `<div style="font-size: 18pt; line-height: 2;">
      ${Array.from({ length: 8 })
        .map((_, i) => `<p>Large typography paragraph ${i + 1}.</p>`)
        .join('\n')}
    </div>`,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      density: 'SPACIOUS',
    },
    expectations: {
      minPages: 1,
    },
  },

  // 21. Small Font (Ultra-compact typography)
  'small-font': {
    id: 'small-font',
    name: 'Small Font Typography',
    description: 'Ultra-compact font size packs high density content on fewer pages',
    htmlContent: `<div style="font-size: 8pt; line-height: 1.2;">
      ${Array.from({ length: 25 })
        .map((_, i) => `<p>Compact item ${i + 1}: Dense record line for examination transcripts.</p>`)
        .join('\n')}
    </div>`,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
      density: 'ULTRA_COMPACT',
    },
    expectations: {
      minPages: 1,
    },
  },

  // 22. Extreme Content (Very heavy mixed load)
  'extreme-content': {
    id: 'extreme-content',
    name: 'Extreme Content Document',
    description: 'Stress-test with thousands of characters, deep nested tables, multiple breaks, and rich formatting',
    htmlContent: `
      <h1>Master Academic Transcript</h1>
      <p>Institutional record verification.</p>
      <div class="spr-page-break" data-manual-break="true"></div>
      <h2>Student Records Ledger</h2>
      <table style="width: 100%;">
        <thead><tr><th>SL</th><th>Course</th><th>Credits</th><th>Grade</th></tr></thead>
        <tbody>
          ${Array.from({ length: 80 })
            .map((_, i) => `<tr><td>${i + 1}</td><td>Course Unit ${i + 1}</td><td>3.0</td><td>A</td></tr>`)
            .join('\n')}
        </tbody>
      </table>
      <div class="spr-page-break" data-manual-break="true"></div>
      <h2>Controller of Examinations Summary</h2>
      <p>Final declaration and institutional signatures.</p>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      minPages: 3,
      shouldContainTexts: ['Master Academic Transcript', 'Course Unit 1', 'Course Unit 80', 'Controller of Examinations Summary'],
      shouldPreserveManualBreaks: true,
      shouldRepeatTableHeader: true,
    },
  },

  // 23. Empty Document
  'empty-document': {
    id: 'empty-document',
    name: 'Empty Document',
    description: 'Empty or whitespace-only input must produce exactly 1 clean blank page with zero errors',
    htmlContent: '',
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 1,
      minPages: 1,
      maxPages: 1,
    },
  },

  // 24. Block Overflow Discrete Pages
  'block-overflow-discrete-pages': {
    id: 'block-overflow-discrete-pages',
    name: 'Block Overflow Discrete Pages',
    description: 'When Block 1, 2, 3 consume page capacity and Block 4 exceeds available space, Block 4 is placed on Page 2 as a discrete paper sheet',
    htmlContent: `
      <div style="height: 250px; background: #f8fafc; padding: 12px; margin-bottom: 16px;"><h3>Block 1 (250px)</h3><p>First major section.</p></div>
      <div style="height: 300px; background: #f1f5f9; padding: 12px; margin-bottom: 16px;"><h3>Block 2 (300px)</h3><p>Second major section.</p></div>
      <div style="height: 320px; background: #e2e8f0; padding: 12px; margin-bottom: 16px;"><h3>Block 3 (320px)</h3><p>Third major section.</p></div>
      <div style="height: 250px; background: #cbd5e1; padding: 12px; margin-bottom: 16px;"><h3>Block 4 (250px)</h3><p>Fourth section pushed to Page 2.</p></div>
    `,
    options: {
      pageSize: 'A4',
      orientation: 'PORTRAIT',
      margin: 'NORMAL',
    },
    expectations: {
      exactPages: 2,
      shouldContainTexts: ['Block 1', 'Block 2', 'Block 3', 'Block 4'],
    },
  },
};
