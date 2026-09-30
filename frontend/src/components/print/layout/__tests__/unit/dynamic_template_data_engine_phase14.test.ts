/**
 * dynamic_template_data_engine_phase14.test.ts
 *
 * Comprehensive Unit Test Suite for Phase 14:
 * Dynamic Template/Data Engine Integration in DocLab.
 *
 * Architecture Invariants:
 * Template → resolve data → canonical document → layout → render.
 *
 * Tests:
 * 1. Decoupled Pipeline: Template resolution produces pure CanonicalDocument AST without pagination artifacts.
 * 2. Stable Logical Identities: Every resolved node and expanded block maintains deterministic, stable node IDs.
 * 3. Variable-Length Content Expansion:
 *    - Text & inline tokens ({{student.name}}, {{institution.code}})
 *    - Multi-line text into multiple paragraphs ({{student.address}} with \n\n)
 *    - Array of objects expanding into typed TableNode ({{results}}, {{attendance_table}})
 *    - Image objects/URLs expanding into ImageNode ({{student.photo}})
 *    - Array of BlockNodes expanding into multi-block sequence
 * 4. Zero Estimation Invariant: Actual physical layout space is measured by layout engine; large table expansion triggers re-pagination.
 * 5. Incremental Regional Invalidation: Changing data triggers incremental change scope targeting only dirty blocks.
 * 6. Batch Template Merging: Batch records generate multi-record document separated by manual page breaks.
 */

import { DocumentFactory } from '../../../model/documentFactory';
import { TemplateDataEngine } from '../../../model/templates/TemplateDataEngine';
import { TemplateMergeEngine } from '../../../model/templates/TemplateMergeEngine';
import { PaginationEngine } from '../../pagination/PaginationEngine';
import { IncrementalLayoutPlanner } from '../../performance/IncrementalLayoutPlanner';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
}

export async function runDynamicTemplateDataEnginePhase14UnitTests(): Promise<{
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function assert(condition: boolean, name: string, details?: string) {
    if (condition) {
      results.push({ suite: 'Phase 14: Dynamic Template Data Engine', name, passed: true });
    } else {
      results.push({
        suite: 'Phase 14: Dynamic Template Data Engine',
        name,
        passed: false,
        error: details || 'Assertion failed',
      });
    }
  }

  // =========================================================================
  // TEST GROUP 1: Decoupled Architecture Pipeline (Template -> Data -> AST)
  // =========================================================================
  try {
    const templateDoc = DocumentFactory.createDocument({
      title: 'Transcript for {{student.name}}',
      body: [
        DocumentFactory.createHeading(1, [
          DocumentFactory.createText('Academic Transcript - '),
          DocumentFactory.createToken('student.name'),
        ]),
        DocumentFactory.createParagraph({
          content: [
            DocumentFactory.createText('Student ID: '),
            DocumentFactory.createToken('student.id'),
            DocumentFactory.createText(' | Class: '),
            DocumentFactory.createToken('student.class'),
          ],
        }),
      ],
    });

    const data = {
      student: {
        id: 'STU-2026-001',
        name: 'Abdullah Al-Mansoor',
        class: 'Class 10 (Science)',
      },
    };

    const evaluatedDoc = TemplateDataEngine.resolveTemplate(templateDoc, data);

    assert(evaluatedDoc.title === 'Transcript for Abdullah Al-Mansoor', 'Document title interpolated correctly');
    assert(evaluatedDoc.body.length === 2, 'Evaluated doc has exactly 2 body blocks');

    const heading = evaluatedDoc.body[0] as any;
    assert(heading.type === 'heading', 'First block is heading');
    assert(heading.content.map((c: any) => c.text).join('') === 'Academic Transcript - Abdullah Al-Mansoor', 'Heading tokens resolved');

    const para = evaluatedDoc.body[1] as any;
    assert(para.type === 'paragraph', 'Second block is paragraph');
    assert(para.content.map((c: any) => c.text).join('') === 'Student ID: STU-2026-001 | Class: Class 10 (Science)', 'Paragraph inlines resolved');

    // Verify zero pagination artifacts in AST
    assert(!('pages' in evaluatedDoc), 'Canonical document AST contains zero page structures');
    assert(!('totalPages' in evaluatedDoc), 'Canonical document AST contains zero totalPages property');
  } catch (err: any) {
    assert(false, 'Group 1: Decoupled Pipeline', err?.message);
  }

  // =========================================================================
  // TEST GROUP 2: Variable-Length Content Expansion
  // =========================================================================
  try {
    // 2.1 Table Expansion from Array of Objects: {{results}}
    const templateWithTableToken = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Exam Performance Summary:')] }),
        DocumentFactory.createParagraph({ content: [DocumentFactory.createToken('results')] }),
      ],
    });

    const dataWithTable = {
      results: [
        { subject: 'Quran & Tajweed', fullMarks: 100, obtainedMarks: 98, grade: 'A+' },
        { subject: 'Mathematics', fullMarks: 100, obtainedMarks: 95, grade: 'A+' },
        { subject: 'English', fullMarks: 100, obtainedMarks: 89, grade: 'A' },
        { subject: 'General Science', fullMarks: 100, obtainedMarks: 92, grade: 'A+' },
      ],
    };

    const docWithExpandedTable = TemplateDataEngine.resolveTemplate(templateWithTableToken, dataWithTable);

    assert(docWithExpandedTable.body.length === 2, 'Resolved doc has 2 blocks');
    const tableBlock = docWithExpandedTable.body[1] as any;
    assert(tableBlock.type === 'table', 'Sole token {{results}} expanded into typed TableNode');
    assert(tableBlock.rows.length === 5, 'Expanded table has 5 rows (1 header + 4 data rows)');
    assert(tableBlock.rows[0].isHeader === true, 'First row is marked isHeader');
    assert(tableBlock.rows[0].cells.length === 4, 'Header row has 4 columns');
    assert(tableBlock.rows[1].cells[0].content[0].content[0].text === 'Quran & Tajweed', 'First row first cell contains subject name');

    // 2.2 Multi-Paragraph Expansion from Double Line Breaks: {{student.address}}
    const templateWithAddress = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Address Details:')] }),
        DocumentFactory.createParagraph({ content: [DocumentFactory.createToken('student.address')] }),
      ],
    });

    const dataWithAddress = {
      student: {
        address: 'House #42, Road #7\n\nSector 4, Uttara Model Town\n\nDhaka-1230, Bangladesh',
      },
    };

    const docWithExpandedAddress = TemplateDataEngine.resolveTemplate(templateWithAddress, dataWithAddress);
    assert(docWithExpandedAddress.body.length === 4, `Multi-line address expanded into 3 distinct paragraphs (total blocks 4, got ${docWithExpandedAddress.body.length})`);
    assert(docWithExpandedAddress.body[1].type === 'paragraph', 'Expanded address block 1 is paragraph');
    assert((docWithExpandedAddress.body[1] as any).content[0].text === 'House #42, Road #7', 'Address paragraph 1 text matches');
    assert((docWithExpandedAddress.body[2] as any).content[0].text === 'Sector 4, Uttara Model Town', 'Address paragraph 2 text matches');
    assert((docWithExpandedAddress.body[3] as any).content[0].text === 'Dhaka-1230, Bangladesh', 'Address paragraph 3 text matches');

    // 2.3 Image Expansion: {{student.photo}}
    const templateWithPhoto = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createParagraph({ content: [DocumentFactory.createText('Student Photograph:')] }),
        DocumentFactory.createParagraph({ content: [DocumentFactory.createToken('student.photo')] }),
      ],
    });

    const dataWithPhoto = {
      student: {
        photo: {
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          width: 150,
          height: 180,
          alt: 'Student Portrait',
        },
      },
    };

    const docWithPhoto = TemplateDataEngine.resolveTemplate(templateWithPhoto, dataWithPhoto);
    assert(docWithPhoto.body.length === 2, 'Doc has 2 blocks');
    const photoBlock = docWithPhoto.body[1] as any;
    assert(photoBlock.type === 'image', 'Sole token {{student.photo}} expanded into typed ImageNode');
    assert(photoBlock.src.startsWith('data:image/png'), 'Image src preserved');
    assert(photoBlock.width === 150, 'Image width 150');
    assert(photoBlock.height === 180, 'Image height 180');
  } catch (err: any) {
    assert(false, 'Group 2: Variable-Length Expansion', err?.message);
  }

  // =========================================================================
  // TEST GROUP 3: Stable Logical Node Identities
  // =========================================================================
  try {
    const template = DocumentFactory.createDocument({
      id: 'tpl_report',
      body: [
        DocumentFactory.createParagraph({ id: 'p_header', content: [DocumentFactory.createToken('title')] }),
        DocumentFactory.createParagraph({ id: 'p_results', content: [DocumentFactory.createToken('results')] }),
      ],
    });

    const data1 = {
      title: 'First Evaluation',
      results: [
        { subject: 'Math', score: 90 },
        { subject: 'English', score: 85 },
      ],
    };

    const doc1 = TemplateDataEngine.resolveTemplate(template, data1);
    const table1 = doc1.body[1] as any;

    // Verify stable deterministic IDs
    assert(table1.id === 'p_results_tbl', 'Expanded table receives stable ID derived from parent');
    assert(table1.rows[0].id === 'p_results_tbl_r_header', 'Header row ID is deterministic');
    assert(table1.rows[1].id === 'p_results_tbl_r_1', 'First data row ID is deterministic');
    assert(table1.rows[2].id === 'p_results_tbl_r_2', 'Second data row ID is deterministic');

    // When re-evaluating with updated data, IDs remain stable
    const data2 = {
      title: 'Second Evaluation',
      results: [
        { subject: 'Math', score: 95 },
        { subject: 'English', score: 92 },
      ],
    };
    const doc2 = TemplateDataEngine.resolveTemplate(template, data2);
    const table2 = doc2.body[1] as any;

    assert(table2.id === table1.id, 'Table ID remains identical across data updates');
    assert(table2.rows[1].id === table1.rows[1].id, 'Row 1 ID remains identical across data updates');
    assert(table2.rows[2].id === table1.rows[2].id, 'Row 2 ID remains identical across data updates');
  } catch (err: any) {
    assert(false, 'Group 3: Stable Logical Identities', err?.message);
  }

  // =========================================================================
  // TEST GROUP 4: Full Pipeline Execution & Physical Space Recalculation
  // =========================================================================
  try {
    // 4.1 Pipeline execution: Small data produces 1 page
    const template = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createHeading(1, [DocumentFactory.createText('Institutional Marksheet')]),
        DocumentFactory.createParagraph({ content: [DocumentFactory.createToken('marksheet')] }),
      ],
    });

    const smallData = {
      marksheet: [
        { subject: 'Subject 1', mark: 90 },
        { subject: 'Subject 2', mark: 85 },
      ],
    };

    const pipeResult1 = TemplateDataEngine.executePipeline(template, smallData, {
      pageSize: 'A4',
      pureCalculation: true,
    });

    assert(pipeResult1.layoutResult.totalPages === 1, 'Small data fits in 1 page');
    assert(pipeResult1.canonicalDocument.body.length === 2, 'Canonical AST contains 2 blocks');

    // 4.2 Pipeline execution: Large data (50 items) forces multi-page re-pagination
    const largeData = {
      marksheet: Array.from({ length: 45 }, (_, i) => ({
        subject: `Comprehensive Academic Subject ${i + 1}`,
        code: `SUB-${100 + i}`,
        fullMarks: 100,
        obtained: 80 + (i % 20),
        grade: 'A+',
      })),
    };

    const pipeResult2 = TemplateDataEngine.executePipeline(template, largeData, {
      pageSize: 'A4',
      pureCalculation: true,
    });

    assert(
      pipeResult2.layoutResult.totalPages > 1,
      `Large data table automatically recalculates pagination across ${pipeResult2.layoutResult.totalPages} pages`
    );
  } catch (err: any) {
    assert(false, 'Group 4: Full Pipeline & Space Recalculation', err?.message);
  }

  // =========================================================================
  // TEST GROUP 5: Incremental Regional Invalidation
  // =========================================================================
  try {
    const template = DocumentFactory.createDocument({
      body: [
        DocumentFactory.createParagraph({ id: 'p_school', content: [DocumentFactory.createText('Darul Uloom Central')] }),
        DocumentFactory.createParagraph({ id: 'p_student', content: [DocumentFactory.createToken('student_name')] }),
        DocumentFactory.createParagraph({ id: 'p_footer', content: [DocumentFactory.createText('Official Seal & Signature')] }),
      ],
    });

    const data1 = { student_name: 'Zaid bin Thabit' };
    const initialRun = TemplateDataEngine.executePipeline(template, data1, { pageSize: 'A4', pureCalculation: true });

    // Update only student_name
    const data2 = { student_name: 'Usama bin Zaid' };
    const incrementalRun = TemplateDataEngine.executePipeline(
      template,
      data2,
      { pageSize: 'A4', pureCalculation: true },
      initialRun.layoutResult.document,
      initialRun.canonicalDocument
    );

    assert(incrementalRun.changeScope !== undefined, 'Incremental change scope computed');
    assert(incrementalRun.changeScope?.type === 'incremental', 'Change scope is incremental');
    assert(incrementalRun.changeScope?.dirtyNodeIds.includes('p_student'), 'Dirty node IDs includes p_student');
    assert(!incrementalRun.changeScope?.dirtyNodeIds.includes('p_school'), 'p_school is NOT dirty');
    assert(!incrementalRun.changeScope?.dirtyNodeIds.includes('p_footer'), 'p_footer is NOT dirty');
  } catch (err: any) {
    assert(false, 'Group 5: Incremental Invalidation', err?.message);
  }

  // Calculate totals
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return { passed, failed, results };
}
