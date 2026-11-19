/**
 * SPR Note — Academic Years & Terms Store
 * =======================================
 * Academic calendars, terms/semesters, active year status, and date boundary resolvers.
 */

import { readJSON, writeJSON } from '../coreStore';
import { sessions } from './sessionStore';
import type { AcademicYear, AcademicTerm } from './types';

export const DEFAULT_ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'ay_2026_2027',
    name: '2026-2027',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    termSystem: 'SEMESTER',
    isCurrent: true,
    branch_id: 'branch_main',
    branch_name: 'Main Campus',
    terms: [
      {
        id: 'sem_2026_1',
        name: '1st Semester',
        startDate: '2026-01-01',
        endDate: '2026-06-30',
        isCurrent: false,
      },
      {
        id: 'sem_2026_2',
        name: '2nd Semester',
        startDate: '2026-07-01',
        endDate: '2026-12-31',
        isCurrent: true,
      },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export function shiftDateByYears(dateStr: string, years: number = 1): string {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-');
  if (parts.length < 3) return dateStr;
  const y = parseInt(parts[0], 10) + years;
  return `${y}-${parts[1]}-${parts[2]}`;
}

export function suggestNextYearName(prevName: string): string {
  if (!prevName) return `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
  const numbers = prevName.match(/\d{4}/g);
  if (numbers && numbers.length >= 2) {
    const y1 = parseInt(numbers[0], 10) + 1;
    const y2 = parseInt(numbers[1], 10) + 1;
    return prevName.replace(numbers[0], String(y1)).replace(numbers[1], String(y2));
  } else if (numbers && numbers.length === 1) {
    const y = parseInt(numbers[0], 10) + 1;
    return prevName.replace(numbers[0], String(y));
  }
  const currentY = new Date().getFullYear();
  return `${currentY}-${currentY + 1}`;
}

export function getAcademicYearStatus(startDate?: string, endDate?: string): 'ACTIVE' | 'UPCOMING' | 'COMPLETED' {
  const today = new Date().toISOString().split('T')[0];
  if (!startDate || !endDate) return 'UPCOMING';
  if (today >= startDate && today <= endDate) return 'ACTIVE';
  if (today < startDate) return 'UPCOMING';
  return 'COMPLETED';
}

export const academicYearsStore = {
  getAcademicYears: (tenantId?: string | null): AcademicYear[] => {
    const key = `spr_academic_years_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_ACADEMIC_YEARS);
      return DEFAULT_ACADEMIC_YEARS;
    }
    return raw;
  },

  getActiveYear: (tenantId?: string | null): AcademicYear | null => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const active = list.find((y) => getAcademicYearStatus(y.startDate, y.endDate) === 'ACTIVE');
    return active || list[0] || null;
  },

  getDateBounds: (
    tenantId?: string | null
  ): { minDate: string; maxDate: string; activeYear: AcademicYear | null } => {
    const activeYear = academicYearsStore.getActiveYear(tenantId);
    if (activeYear && activeYear.startDate && activeYear.endDate) {
      return {
        minDate: activeYear.startDate,
        maxDate: activeYear.endDate,
        activeYear,
      };
    }
    const all = academicYearsStore.getAcademicYears(tenantId);
    if (all.length > 0) {
      const validStarts = all.map((y) => y.startDate).filter(Boolean).sort();
      const validEnds = all.map((y) => y.endDate).filter(Boolean).sort();
      return {
        minDate: validStarts[0] || '',
        maxDate: validEnds[validEnds.length - 1] || '',
        activeYear: all[0],
      };
    }
    return { minDate: '', maxDate: '', activeYear: null };
  },

  saveAcademicYears: (tenantId: string | null | undefined, years: AcademicYear[]): AcademicYear[] => {
    const key = `spr_academic_years_${tenantId || 'default'}`;
    const safeYears = Array.isArray(years) ? years : [];
    writeJSON(key, safeYears);

    // Synchronize session names with legacy sessions store
    try {
      const existingSessions = sessions.getAll() || [];
      const updatedSessions = [...existingSessions];
      safeYears.forEach((y) => {
        if (
          y.name &&
          !updatedSessions.some(
            (s) => (s.name || '').toLowerCase() === y.name.toLowerCase()
          )
        ) {
          updatedSessions.push({ id: `sess_${y.id}`, name: y.name, _local: true });
        }
      });
      sessions.saveAll(updatedSessions);
    } catch {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_academic_years_updated', { detail: safeYears }));
    }
    return safeYears;
  },

  addAcademicYear: (
    tenantId: string | null | undefined,
    yearData: Partial<AcademicYear>
  ): AcademicYear => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const newId = yearData.id || `ay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const newYear: AcademicYear = {
      id: newId,
      name: yearData.name || 'New Academic Year',
      startDate: yearData.startDate || new Date().toISOString().split('T')[0],
      endDate:
        yearData.endDate ||
        new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      termSystem: yearData.termSystem || 'SEMESTER',
      isCurrent: yearData.isCurrent ?? false,
      terms: Array.isArray(yearData.terms)
        ? yearData.terms.map((t, idx) => ({
            id: t.id || `term_${Date.now()}_${idx}`,
            name: t.name || `Term ${idx + 1}`,
            startDate: t.startDate || '',
            endDate: t.endDate || '',
            isCurrent: t.isCurrent,
          }))
        : [],
      createdAt: new Date().toISOString(),
    };

    const updatedList = [newYear, ...list];
    academicYearsStore.saveAcademicYears(tenantId, updatedList);
    return newYear;
  },

  updateAcademicYear: (
    tenantId: string | null | undefined,
    id: string,
    updatedData: Partial<AcademicYear>
  ): AcademicYear | undefined => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const updatedList = list.map((y) => {
      if (y.id === id) {
        return {
          ...y,
          ...updatedData,
          terms: Array.isArray(updatedData.terms) ? updatedData.terms : y.terms,
          updatedAt: new Date().toISOString(),
        };
      }
      return y;
    });

    academicYearsStore.saveAcademicYears(tenantId, updatedList);
    return updatedList.find((y) => y.id === id);
  },

  deleteAcademicYear: (tenantId: string | null | undefined, id: string): AcademicYear[] => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    const updatedList = list.filter((y) => y.id !== id);
    academicYearsStore.saveAcademicYears(tenantId, updatedList);
    return updatedList;
  },

  getSuggestedNextYear: (tenantId?: string | null): Partial<AcademicYear> => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    if (!list || list.length === 0) {
      const currentYear = new Date().getFullYear();
      return {
        name: `${currentYear}-${currentYear + 1}`,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
        termSystem: 'SEMESTER',
        terms: [
          {
            id: 'term_new_1',
            name: '1st Semester',
            startDate: `${currentYear}-01-01`,
            endDate: `${currentYear}-06-30`,
          },
          {
            id: 'term_new_2',
            name: '2nd Semester',
            startDate: `${currentYear}-07-01`,
            endDate: `${currentYear}-12-31`,
          },
        ],
      };
    }

    const sorted = [...list].sort((a, b) => (b.endDate || '').localeCompare(a.endDate || ''));
    const latest = sorted[0] || list[0];

    const nextName = suggestNextYearName(latest.name);
    const nextStartDate = shiftDateByYears(latest.startDate, 1);
    const nextEndDate = shiftDateByYears(latest.endDate, 1);

    const nextTerms: AcademicTerm[] = (latest.terms || []).map((t, idx) => ({
      id: `term_new_${idx + 1}`,
      name: t.name || `Term ${idx + 1}`,
      startDate: shiftDateByYears(t.startDate, 1),
      endDate: shiftDateByYears(t.endDate, 1),
    }));

    return {
      name: nextName,
      startDate: nextStartDate || `${new Date().getFullYear()}-01-01`,
      endDate: nextEndDate || `${new Date().getFullYear()}-12-31`,
      termSystem: latest.termSystem || 'SEMESTER',
      isCurrent: false,
      terms:
        nextTerms.length > 0
          ? nextTerms
          : [
              {
                id: 'term_new_1',
                name: '1st Semester',
                startDate: nextStartDate || `${new Date().getFullYear()}-01-01`,
                endDate: shiftDateByYears(nextStartDate, 0.5) || `${new Date().getFullYear()}-06-30`,
              },
              {
                id: 'term_new_2',
                name: '2nd Semester',
                startDate: `${new Date().getFullYear()}-07-01`,
                endDate: nextEndDate || `${new Date().getFullYear()}-12-31`,
              },
            ],
    };
  },

  getConfiguredTerms: (
    tenantId?: string | null,
    academicYearId: string | null = null
  ): AcademicTerm[] => {
    const list = academicYearsStore.getAcademicYears(tenantId);
    if (!list || list.length === 0) {
      return [
        { id: 'sem_1', name: '1st Semester', startDate: '', endDate: '' },
        { id: 'sem_2', name: '2nd Semester', startDate: '', endDate: '' },
        { id: 'sem_final', name: 'Final Term', startDate: '', endDate: '' },
        { id: 'sem_annual', name: 'Annual Syllabus', startDate: '', endDate: '' },
      ];
    }

    if (academicYearId) {
      const found = list.find((y) => y.id === academicYearId || y.name === academicYearId);
      if (found && Array.isArray(found.terms) && found.terms.length > 0) {
        return found.terms;
      }
    }

    const activeYear = academicYearsStore.getActiveYear(tenantId);
    if (activeYear && Array.isArray(activeYear.terms) && activeYear.terms.length > 0) {
      return activeYear.terms;
    }

    const uniqueTermMap = new Map<string, AcademicTerm>();
    list.forEach((y) => {
      if (Array.isArray(y.terms)) {
        y.terms.forEach((t) => {
          if (t && t.name && !uniqueTermMap.has(t.name.trim())) {
            uniqueTermMap.set(t.name.trim(), t);
          }
        });
      }
    });

    if (uniqueTermMap.size > 0) {
      return Array.from(uniqueTermMap.values());
    }

    return [
      { id: 'sem_1', name: '1st Semester', startDate: '', endDate: '' },
      { id: 'sem_2', name: '2nd Semester', startDate: '', endDate: '' },
      { id: 'sem_final', name: 'Final Term', startDate: '', endDate: '' },
      { id: 'sem_annual', name: 'Annual Syllabus', startDate: '', endDate: '' },
    ];
  },
};
