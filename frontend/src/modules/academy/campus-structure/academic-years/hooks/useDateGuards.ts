/**
 * SPR Note — useDateGuards Hook & Date Math Utilities
 * ====================================================
 * High-precision enterprise date conflict detection, boundary constraints,
 * term distribution, and predictive conflict resolution.
 */

import { useMemo, useCallback } from 'react';
import {
  AcademicYear,
  AcademicTerm,
  TermSystemType,
  DateConflict,
  TermConflict,
  AvailableDateSlot,
  CollisionType,
} from '../types';

export function getNextDay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function getPrevDay(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  try {
    const s = new Date(startDateStr).getTime();
    const e = new Date(endDateStr).getTime();
    const diff = Math.ceil((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return isNaN(diff) || diff < 0 ? 0 : diff;
  } catch {
    return 0;
  }
}

export function checkRangeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  if (!start1 || !end1 || !start2 || !end2) return false;
  return start1 <= end2 && end1 >= start2;
}

export function detectCollision(
  start1: string,
  end1: string,
  targetYear: AcademicYear
): DateConflict | null {
  if (!start1 || !end1 || !targetYear?.startDate || !targetYear?.endDate) return null;

  const start2 = targetYear.startDate;
  const end2 = targetYear.endDate;

  if (!checkRangeOverlap(start1, end1, start2, end2)) return null;

  const overlapStart = start1 > start2 ? start1 : start2;
  const overlapEnd = end1 < end2 ? end1 : end2;
  const overlapDays = calculateDaysBetween(overlapStart, overlapEnd);

  let collisionType: CollisionType = 'START_COLLISION';
  if (start1 === start2 && end1 === end2) {
    collisionType = 'EXACT_MATCH';
  } else if (start1 <= start2 && end1 >= end2) {
    collisionType = 'ENCLOSED';
  } else if (start1 >= start2 && end1 <= end2) {
    collisionType = 'SUB_RANGE';
  } else if (start1 === end2 || end1 === start2) {
    collisionType = 'SAME_DAY_TOUCH';
  } else if (end1 >= start2 && end1 <= end2) {
    collisionType = 'END_COLLISION';
  }

  const message = `Dates overlap with "${targetYear.name}" (${start2} to ${end2}) by ${overlapDays} day(s).`;

  return {
    conflictingYear: targetYear,
    collisionType,
    overlapDays,
    overlapStart,
    overlapEnd,
    message,
  };
}

export function useDateGuards(
  otherAcademicYears: AcademicYear[] = []
) {
  // Calendar disabled ranges based on existing academic sessions
  const disabledRanges = useMemo(() => {
    return otherAcademicYears
      .filter((y) => Boolean(y.startDate && y.endDate))
      .map((y) => ({
        startDate: y.startDate,
        endDate: y.endDate,
        label: y.name,
      }));
  }, [otherAcademicYears]);

  // Compute live collisions for a given start and end date
  const getConflicts = useCallback(
    (startDate: string, endDate: string): DateConflict[] => {
      if (!startDate || !endDate || startDate > endDate) return [];
      const conflicts: DateConflict[] = [];

      for (const year of otherAcademicYears) {
        const col = detectCollision(startDate, endDate, year);
        if (col) {
          conflicts.push(col);
        }
      }
      return conflicts;
    },
    [otherAcademicYears]
  );

  // Compute intra-session term collisions and bounds validation
  const getTermConflicts = useCallback(
    (terms: AcademicTerm[], yearStartDate: string, yearEndDate: string): TermConflict[] => {
      const conflicts: TermConflict[] = [];

      terms.forEach((t, i) => {
        if (!t.startDate || !t.endDate) return;

        if (t.startDate > t.endDate) {
          conflicts.push({
            termIndex: i,
            termName: t.name || `Term #${i + 1}`,
            conflictType: 'INVERTED_DATES',
            message: `End date cannot precede start date for "${t.name || `Term #${i + 1}`}".`,
          });
        }

        if (yearStartDate && yearEndDate) {
          if (t.startDate < yearStartDate || t.endDate > yearEndDate) {
            conflicts.push({
              termIndex: i,
              termName: t.name || `Term #${i + 1}`,
              conflictType: 'OUT_OF_BOUNDS',
              message: `Dates must stay within the academic session range (${yearStartDate} to ${yearEndDate}).`,
            });
          }
        }
      });

      // Inter-term overlaps
      for (let i = 0; i < terms.length; i++) {
        for (let j = i + 1; j < terms.length; j++) {
          const t1 = terms[i];
          const t2 = terms[j];
          if (t1.startDate && t1.endDate && t2.startDate && t2.endDate) {
            if (checkRangeOverlap(t1.startDate, t1.endDate, t2.startDate, t2.endDate)) {
              conflicts.push({
                termIndex: j,
                termName: t2.name || `Term #${j + 1}`,
                conflictType: 'TERM_OVERLAP',
                conflictingWithTermIndex: i,
                conflictingWithTermName: t1.name || `Term #${i + 1}`,
                message: `"${t2.name || `Term #${j + 1}`}" overlaps with "${t1.name || `Term #${i + 1}`}". Semesters must be sequential.`,
              });
            }
          }
        }
      }

      return conflicts;
    },
    []
  );

  // Smart Next Available Slot Finder
  const getNextAvailableSlot = useCallback((): AvailableDateSlot => {
    if (!otherAcademicYears || otherAcademicYears.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        suggestedName: `${currentYear}-${currentYear + 1}`,
      };
    }

    // Sort by endDate descending
    const sorted = [...otherAcademicYears].sort((a, b) =>
      (b.endDate || '').localeCompare(a.endDate || '')
    );
    const latestYear = sorted[0];

    const nextStartDate = getNextDay(latestYear.endDate) || `${new Date().getFullYear()}-01-01`;
    const startYear = parseInt(nextStartDate.slice(0, 4), 10);
    const nextEndDate = addDays(nextStartDate, 364);
    const endYear = parseInt(nextEndDate.slice(0, 4), 10);

    const suggestedName = startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;

    return {
      startDate: nextStartDate,
      endDate: nextEndDate,
      suggestedName,
    };
  }, [otherAcademicYears]);

  // Compute dynamic max/min bounds for date inputs to prevent engulfing
  const getSmartBounds = useCallback(
    (currentStartDate: string, currentEndDate: string) => {
      let maxAllowedEndDate: string | undefined = undefined;
      let minAllowedStartDate: string | undefined = undefined;

      if (currentStartDate) {
        // Find the earliest other academic year that starts after currentStartDate
        const futureYears = otherAcademicYears
          .filter((y) => Boolean(y.startDate && y.startDate > currentStartDate))
          .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

        if (futureYears.length > 0 && futureYears[0].startDate) {
          maxAllowedEndDate = getPrevDay(futureYears[0].startDate);
        }
      }

      if (currentEndDate) {
        // Find the latest other academic year that ends before currentEndDate
        const pastYears = otherAcademicYears
          .filter((y) => Boolean(y.endDate && y.endDate < currentEndDate))
          .sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));

        if (pastYears.length > 0 && pastYears[0].endDate) {
          minAllowedStartDate = getNextDay(pastYears[0].endDate);
        }
      }

      return {
        minStartDate: minAllowedStartDate,
        maxStartDate: currentEndDate || undefined,
        minEndDate: currentStartDate || undefined,
        maxEndDate: maxAllowedEndDate,
      };
    },
    [otherAcademicYears]
  );

  // Auto-distribute terms evenly across the session with 0 gaps and 0 overlaps
  const autoDistributeTerms = useCallback(
    (
      sessionStartDate: string,
      sessionEndDate: string,
      termSystem: TermSystemType,
      currentTerms: AcademicTerm[] = []
    ): AcademicTerm[] => {
      const sDate = sessionStartDate || `${new Date().getFullYear()}-01-01`;
      const eDate = sessionEndDate || `${new Date().getFullYear()}-12-31`;

      let termCount = 2;
      let defaultNames = ['1st Semester', '2nd Semester'];

      if (termSystem === 'TRIMESTER') {
        termCount = 3;
        defaultNames = ['1st Term', '2nd Term / Mid-Term', '3rd Term / Final'];
      } else if (termSystem === 'QUARTER') {
        termCount = 4;
        defaultNames = ['1st Quarter (Q1)', '2nd Quarter (Q2)', '3rd Quarter (Q3)', '4th Quarter (Q4)'];
      } else if (termSystem === 'ANNUAL') {
        termCount = 1;
        defaultNames = ['Full Academic Year'];
      } else if (termSystem === 'CUSTOM') {
        termCount = currentTerms.length > 0 ? currentTerms.length : 2;
        defaultNames = currentTerms.length > 0
          ? currentTerms.map((t, idx) => t.name || `Term ${idx + 1}`)
          : ['Term 1', 'Term 2'];
      }

      const totalDays = calculateDaysBetween(sDate, eDate);
      if (totalDays <= 0 || termCount <= 1) {
        return [
          {
            id: currentTerms[0]?.id || `term_${Date.now()}_1`,
            name: currentTerms[0]?.name || defaultNames[0] || 'Academic Session',
            startDate: sDate,
            endDate: eDate,
          },
        ];
      }

      const daysPerTerm = Math.floor(totalDays / termCount);
      const distributed: AcademicTerm[] = [];
      let cursorDate = sDate;

      for (let i = 0; i < termCount; i++) {
        const isLast = i === termCount - 1;
        const termStart = cursorDate;
        const termEnd = isLast ? eDate : addDays(cursorDate, daysPerTerm - 1);

        distributed.push({
          id: currentTerms[i]?.id || `term_${Date.now()}_${i + 1}`,
          name: currentTerms[i]?.name || defaultNames[i] || `Term ${i + 1}`,
          startDate: termStart,
          endDate: termEnd,
        });

        cursorDate = getNextDay(termEnd);
      }

      return distributed;
    },
    []
  );

  return {
    disabledRanges,
    getConflicts,
    getTermConflicts,
    getNextAvailableSlot,
    getSmartBounds,
    autoDistributeTerms,
  };
}
