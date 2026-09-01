import { useMemo } from 'react';
import { getOrdinalPeriodLabel } from '../../../../../utils/localStore';
import { findMatchingPeriodSlot, resolveBookTeacher } from '../../dailyClassroomUtils';

/**
 * useStudentAssessmentOptions
 * Builds all dropdown options (students, routine periods, curriculum books)
 * for StudentAssessmentDrawer.
 */
export default function useStudentAssessmentOptions({
  students = [],
  periodSlots = [],
  availableBooks = [],
  curriculumBooks = [],
  teachers = [],
  staff = [],
  periodSlotId = '',
  curriculumBookId = '',
  curriculumBookName = '',
}) {
  // 1. Student Options
  const studentOptions = useMemo(() => {
    return students.map((s) => ({
      value: String(s.id),
      label: `${s.name_en || s.name || 'Student'} (${s.uniq_id || s.roll_number || 'N/A'}) - ${s.student_class_name || 'Class'}`,
    }));
  }, [students]);

  // 2. Period Options
  const periodOptions = useMemo(() => {
    const list = [{ value: '', label: 'No Specific Period (Flexible Time)' }];
    periodSlots.forEach((p, idx) => {
      const order = p.period_order ?? p.order ?? (idx + 1);
      const pOrdinal = getOrdinalPeriodLabel(order);
      const timeStr = p.start_time && p.end_time ? ` (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})` : '';
      list.push({
        value: String(p.id),
        label: `${pOrdinal}${timeStr}`,
      });
    });
    return list;
  }, [periodSlots]);

  // 3. Book Options (with Period-Match Prioritization)
  const bookOptions = useMemo(() => {
    const list = [{ value: '', label: 'None (General / Direct Entry)' }];

    if (periodSlotId && periodSlotId !== 'ALL') {
      const matchedSlot = findMatchingPeriodSlot(periodSlotId, periodSlots);
      const targetOrder = matchedSlot?.period_order ?? matchedSlot?.order ?? (Number(periodSlotId) || null);

      const periodMatched = [];
      const others = [];

      availableBooks.forEach((b) => {
        const isMatch =
          (b.periodSlotId && (String(b.periodSlotId) === String(periodSlotId) || (matchedSlot && String(b.periodSlotId) === String(matchedSlot.id)))) ||
          (targetOrder !== null && (b.period_order !== undefined ? Number(b.period_order) : (b.order !== undefined ? Number(b.order) : null)) === targetOrder);

        if (isMatch) {
          periodMatched.push(b);
        } else {
          others.push(b);
        }
      });

      periodMatched.forEach((b) => {
        list.push({
          value: String(b.id),
          label: `${b.name}${b.subject ? ` (${b.subject})` : ''} • [Period Match]`,
        });
      });

      others.forEach((b) => {
        list.push({
          value: String(b.id),
          label: `${b.name}${b.subject ? ` (${b.subject})` : ''}`,
        });
      });
    } else {
      availableBooks.forEach((b) => {
        list.push({
          value: String(b.id),
          label: `${b.name}${b.subject ? ` (${b.subject})` : ''}`,
        });
      });
    }

    if (curriculumBookId && !list.some((o) => String(o.value) === String(curriculumBookId))) {
      list.push({
        value: String(curriculumBookId),
        label: curriculumBookName || 'Assigned Curriculum Book',
      });
    }

    return list;
  }, [availableBooks, periodSlotId, periodSlots, curriculumBookId, curriculumBookName]);

  return {
    studentOptions,
    periodOptions,
    bookOptions,
  };
}
