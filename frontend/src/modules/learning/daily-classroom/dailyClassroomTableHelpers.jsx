import React from 'react';

/**
 * Format range units cleanly without repeating prefix words like "Page", "Pages", "Ayah", "Para"
 * E.g. "Page 12" and "Page 14" => "Page 12 → 14"
 * E.g. "Ayah 1" and "Ayah 20" => "Ayah 1 → 20"
 */
export function formatRangeText(start, end) {
  if (!start && !end) return null;
  const s = String(start || '').trim();
  const e = String(end || '').trim();
  if (s && !e) return s;
  if (!s && e) return e;

  // Check if both start with the same prefix word (e.g. "Page", "Pages", "Pg", "Ayah", "Para", "Juz", "Surah")
  const prefixMatchS = s.match(/^([A-Za-z]+|\S+)\s+(.+)$/);
  const prefixMatchE = e.match(/^([A-Za-z]+|\S+)\s+(.+)$/);

  if (prefixMatchS && prefixMatchE && prefixMatchS[1].toLowerCase() === prefixMatchE[1].toLowerCase()) {
    const prefix = prefixMatchS[1];
    return `${prefix} ${prefixMatchS[2]} → ${prefixMatchE[2]}`;
  }

  // If start is e.g. "Page 12" and end is just "14"
  if (prefixMatchS && !prefixMatchE) {
    return `${prefixMatchS[1]} ${prefixMatchS[2]} → ${e}`;
  }

  return `${s} → ${e}`;
}

/**
 * Reusable cell renderer for "Curriculum Book" column
 * Used in Daily Lesson Delivery
 */
export function renderCurriculumBookCell(row) {
  const bookName = row.curriculum_book_name;
  const subjectName = row.subject_name;

  return (
    <div className="space-y-0.5 min-w-[170px] max-w-[230px] text-left">
      <span
        className="text-xs font-bold theme-text-primary block truncate max-w-[220px]"
        title={bookName || subjectName || 'General Curriculum'}
      >
        {bookName || subjectName || 'General Curriculum'}
      </span>
      {subjectName && bookName && subjectName !== bookName && (
        <span
          className="text-[11px] font-medium theme-text-secondary block truncate max-w-[220px]"
          title={subjectName}
        >
          {subjectName}
        </span>
      )}
    </div>
  );
}

/**
 * Reusable cell renderer for "Lesson & Assigned Range" column
 * Used in Daily Lesson Delivery
 */
export function renderLessonRangeCell(row) {
  const title = row.lesson_title || row.lesson_covered || 'Daily Sabaq';
  const rangeText = formatRangeText(row.start_unit, row.end_unit);

  return (
    <div className="space-y-0.5 min-w-[180px] max-w-[240px] text-left">
      <span
        className="text-xs font-bold theme-text-primary block truncate max-w-[230px]"
        title={title}
      >
        {title}
      </span>
      {rangeText && (
        <span className="text-[11px] font-bold theme-text-accent block">
          {rangeText}
        </span>
      )}
    </div>
  );
}

/**
 * Unified 3-line cell renderer for Daily Student Assessment:
 * Line 1: Curriculum Book Name (Bold)
 * Line 2: Lesson Title / Recitation Topic (Bold/Medium)
 * Line 3: Page / Unit Range (Start → End, Single Prefix)
 */
export function renderAssessmentCurriculumLessonCell(row) {
  const bookName = row.curriculum_book_name || row.subject_name;
  const title = row.lesson_title || row.lesson_covered;
  const rangeText = formatRangeText(row.start_unit, row.end_unit);

  const hasAssignment = Boolean(
    row.has_assigned_lesson ||
    bookName ||
    title ||
    rangeText
  );

  if (!hasAssignment) {
    return (
      <div className="space-y-0.5 min-w-[190px] max-w-[250px] text-left">
        <span
          className="text-xs font-bold theme-text-primary block truncate max-w-[240px]"
          title={row.student_class_name || 'Class Curriculum'}
        >
          {row.student_class_name || 'Class Curriculum'}
        </span>
        <span className="text-[11px] font-medium theme-text-secondary/70 italic block truncate max-w-[240px]">
          No assignment assigned
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 min-w-[190px] max-w-[250px] text-left">
      {/* Line 1: Book Name */}
      <span
        className="text-xs font-bold theme-text-primary block truncate max-w-[240px]"
        title={bookName || row.student_class_name || 'Curriculum Subject'}
      >
        {bookName || row.student_class_name || 'Curriculum Subject'}
      </span>

      {/* Line 2: Lesson Title */}
      {title && (
        <span
          className="text-[11px] font-semibold theme-text-secondary block truncate max-w-[240px]"
          title={title}
        >
          {title}
        </span>
      )}

      {/* Line 3: Page Range or Assignment Note */}
      {rangeText ? (
        <span className="text-[11px] font-bold theme-text-accent block">
          {rangeText}
        </span>
      ) : (
        <span className="text-[11px] font-medium theme-text-secondary/70 italic block truncate max-w-[240px]">
          No assignment assigned
        </span>
      )}
    </div>
  );
}

/**
 * Unified cell renderer for "Mistakes & Stucks" column in Daily Student Assessment
 */
export function renderMistakesStucksCell(row) {
  if (!row.is_evaluated) {
    return <span className="text-xs theme-text-secondary opacity-40 text-center block">—</span>;
  }
  return (
    <div className="space-y-0.5 text-center min-w-[100px]">
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <span className="theme-text-secondary font-medium">Mistakes:</span>
        <span className="font-bold theme-text-primary">{row.total_mistakes || 0}</span>
      </div>
      <div className="flex items-center justify-between gap-1 text-[11px]">
        <span className="theme-text-secondary font-medium">Stucks:</span>
        <span className="font-bold theme-text-primary">{row.total_stucks || 0}</span>
      </div>
    </div>
  );
}

/**
 * Unified cell renderer for "Scores" (Recitation & Homework) column in Daily Student Assessment
 */
export function renderAssessmentScoresCell(row) {
  if (!row.is_evaluated) {
    return <span className="text-xs theme-text-secondary opacity-40 text-center block">—</span>;
  }
  const recScore =
    row.recitation_score !== undefined && row.recitation_score !== '—'
      ? row.recitation_score
      : row.score !== undefined && row.score !== '—'
      ? row.score
      : '—';
  const hwScore =
    row.homework_score !== undefined && row.homework_score !== '—'
      ? row.homework_score
      : row.score !== undefined && row.score !== '—'
      ? row.score
      : '—';

  return (
    <div className="space-y-1 text-center min-w-[130px]">
      <div className="flex items-center justify-between gap-1.5 text-[11px]">
        <span className="theme-text-secondary font-medium">Lesson:</span>
        <span className="font-bold theme-accent px-1.5 py-0.5 rounded border theme-border theme-bg-secondary/40">
          {recScore !== '—' ? `${recScore} / 10` : '—'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1.5 text-[11px]">
        <span className="theme-text-secondary font-medium">Homework:</span>
        <span className="font-bold theme-text-primary px-1.5 py-0.5 rounded border theme-border theme-bg-secondary/40">
          {hwScore !== '—' ? `${hwScore} / 10` : '—'}
        </span>
      </div>
    </div>
  );
}
