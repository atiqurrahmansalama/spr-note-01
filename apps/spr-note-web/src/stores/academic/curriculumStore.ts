/**
 * SPR Note — Curriculum & Syllabus Store
 * =======================================
 * Academic books, kitabs, syllabus pacing, metrics, and routine conflict detection.
 */

import { readJSON, writeJSON } from '../coreStore';
import { weeklyHolidaysStore, WEEKDAY_OPTIONS } from '../calendarStore';
import { DEFAULT_CURRICULUM_ITEMS } from './curriculumData';
import type { CurriculumItem } from './types';

export { DEFAULT_CURRICULUM_ITEMS };

export const curriculumStore = {
  getItems: (tenantId?: string | null): CurriculumItem[] => {
    const key = `spr_curriculum_syllabus_${tenantId || 'default'}`;
    const legacyKey = `spr_curriculum_kitabs_${tenantId || 'default'}`;
    let raw = readJSON(key, null);
    if (!raw) {
      raw = readJSON(legacyKey, null);
    }
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      return DEFAULT_CURRICULUM_ITEMS;
    }

    // Deduplicate purely by unique item ID
    const seenIds = new Set<string>();
    const cleanList: CurriculumItem[] = [];

    raw.forEach((item: any) => {
      if (!item || !item.id) return;
      const idStr = String(item.id);
      if (!seenIds.has(idStr)) {
        seenIds.add(idStr);
        cleanList.push(item);
      }
    });

    return cleanList.length > 0 ? cleanList : DEFAULT_CURRICULUM_ITEMS;
  },

  saveItems: (tenantId: string | null | undefined, items: CurriculumItem[]): CurriculumItem[] => {
    const key = `spr_curriculum_syllabus_${tenantId || 'default'}`;
    const safe = Array.isArray(items) ? items : [];
    writeJSON(key, safe);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_curriculum_updated', { detail: safe }));
      window.dispatchEvent(new CustomEvent('spr_curriculum_kitabs_updated', { detail: safe }));
    }
    return safe;
  },

  addItem: (tenantId: string | null | undefined, data: Partial<CurriculumItem>): CurriculumItem => {
    const list = curriculumStore.getItems(tenantId);
    const start = Number(data.startPage) || 1;
    const end = Number(data.endPage) || start;
    const cur = Number(data.currentPage) || 0;
    const total = Number(data.totalPages) || (end >= start ? end - start + 1 : 1);
    let status = 'NOT_STARTED';
    if (cur >= end && end > 0) status = 'COMPLETED';
    else if (cur > start || cur > 0) status = 'IN_PROGRESS';

    const newItem: CurriculumItem = {
      id: `syllabus_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: data.name || '',
      subject: data.subject || '',
      className: data.className || '',
      classId: data.classId || '',
      ...data,
      startPage: start,
      endPage: end,
      currentPage: cur,
      totalPages: total,
      status: data.status || status,
      updatedAt: new Date().toISOString(),
    };
    const updated = [newItem, ...list];
    curriculumStore.saveItems(tenantId, updated);
    return newItem;
  },

  updateItem: (
    tenantId: string | null | undefined,
    id: string,
    data: Partial<CurriculumItem>
  ): void => {
    const list = curriculumStore.getItems(tenantId);
    const updated = list.map((item) => {
      if (item.id === id) {
        const start = data.startPage !== undefined ? Number(data.startPage) : item.startPage;
        const end = data.endPage !== undefined ? Number(data.endPage) : item.endPage;
        const cur = data.currentPage !== undefined ? Number(data.currentPage) : item.currentPage;
        const total =
          data.totalPages !== undefined
            ? Number(data.totalPages)
            : (end || 0) >= (start || 0)
            ? (end || 0) - (start || 0) + 1
            : item.totalPages || 1;
        let status = 'NOT_STARTED';
        if ((cur || 0) >= (end || 0) && (end || 0) > 0) status = 'COMPLETED';
        else if ((cur || 0) > (start || 0) || (cur || 0) > 0) status = 'IN_PROGRESS';

        return {
          ...item,
          ...data,
          startPage: start,
          endPage: end,
          currentPage: cur,
          totalPages: total,
          status: data.status || status,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    curriculumStore.saveItems(tenantId, updated);
  },

  updateProgress: (
    tenantId: string | null | undefined,
    id: string,
    newPage: number | string,
    note?: string
  ): void => {
    const list = curriculumStore.getItems(tenantId);
    const updated = list.map((item) => {
      if (item.id === id) {
        const cur = Number(newPage);
        let status: string;
        if (cur >= (item.endPage || 0) && (item.endPage || 0) > 0) status = 'COMPLETED';
        else if (cur >= (item.startPage || 0) || cur > 0) status = 'IN_PROGRESS';
        else status = 'NOT_STARTED';

        return {
          ...item,
          currentPage: cur,
          status,
          notes: note !== undefined && note !== null && note.trim() !== '' ? note : item.notes,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });
    curriculumStore.saveItems(tenantId, updated);
  },

  deleteItem: (tenantId: string | null | undefined, id: string): void => {
    const list = curriculumStore.getItems(tenantId);
    const updated = list.filter((item) => item.id !== id);
    curriculumStore.saveItems(tenantId, updated);
  },

  getMetrics: (
    tenantId?: string | null
  ): {
    totalItems: number;
    completedItems: number;
    inProgressItems: number;
    notStartedItems: number;
    overallProgressPct: number;
  } => {
    const list = curriculumStore.getItems(tenantId);
    const total = list.length;
    const completed = list.filter(
      (k) => k.status === 'COMPLETED' || ((k.currentPage || 0) >= (k.endPage || 0) && (k.endPage || 0) > 0)
    ).length;
    const inProgress = list.filter(
      (k) => k.status === 'IN_PROGRESS' && (k.currentPage || 0) < (k.endPage || 0)
    ).length;
    const notStarted = list.filter(
      (k) => k.status === 'NOT_STARTED' || !k.currentPage || k.currentPage === 0
    ).length;

    let sumPct = 0;
    list.forEach((k) => {
      const start = Number(k.startPage) || 1;
      const end = Number(k.endPage) || start;
      const cur = Number(k.currentPage) || 0;
      const span = Math.max(1, end - start + 1);
      const covered = Math.max(0, cur - start + 1);
      const pct = Math.min(100, Math.round((covered / span) * 100));
      sumPct += isNaN(pct) ? 0 : pct;
    });
    const avgProgress = total > 0 ? Math.round(sumPct / total) : 0;

    return {
      totalItems: total,
      completedItems: completed,
      inProgressItems: inProgress,
      notStartedItems: notStarted,
      overallProgressPct: avgProgress,
    };
  },

  /**
   * Detects routine schedule conflicts for a book / syllabus item.
   * Checks if another book in the same Class & Section is already scheduled during the same Period Slot on overlapping days.
   */
  detectScheduleConflicts: (
    tenantId?: string | null,
    {
      itemId = null,
      classId = '',
      sectionId = '',
      sectionScope = 'ALL',
      periodSlotId = '',
      scheduleType = 'FULL_WEEK',
      scheduleDays = [],
    }: {
      itemId?: string | null;
      classId?: string;
      sectionId?: string;
      sectionScope?: string;
      periodSlotId?: string;
      scheduleType?: string;
      scheduleDays?: string[];
    } = {}
  ): any[] => {
    if (!classId || !periodSlotId) return [];

    const allItems = curriculumStore.getItems(tenantId);
    const workingDayCodes = weeklyHolidaysStore.getWorkingDayCodes(tenantId, true);

    // Normalize target days
    const targetDays =
      scheduleType === 'FULL_WEEK' || !Array.isArray(scheduleDays) || scheduleDays.length === 0
        ? workingDayCodes
        : scheduleDays.map((d: any) => weeklyHolidaysStore.normalizeDayCode(d)).filter(Boolean);

    const conflicts: any[] = [];

    allItems.forEach((other: any) => {
      // 1. Skip self
      if (itemId && String(other.id) === String(itemId)) return;

      // 2. Must match the same Class ID
      if (!other.classId || String(other.classId) !== String(classId)) return;

      // 3. Must match the same Period Slot ID
      if (!other.periodSlotId || String(other.periodSlotId) !== String(periodSlotId)) return;

      // 4. Section overlap check:
      const isTargetSpecific = sectionScope === 'SPECIFIC' && Boolean(sectionId);
      const isOtherSpecific = Boolean(other.sectionId);

      if (isTargetSpecific && isOtherSpecific && String(other.sectionId) !== String(sectionId)) {
        // Both are specific sections and they are different -> no conflict
        return;
      }

      // 5. Day overlap check:
      const otherDays =
        other.scheduleType === 'SPLIT_DAYS' &&
        Array.isArray(other.scheduleDays) &&
        other.scheduleDays.length > 0
          ? other.scheduleDays
              .map((d: any) => weeklyHolidaysStore.normalizeDayCode(d))
              .filter(Boolean)
          : workingDayCodes;

      const overlappingDayCodes = targetDays.filter((tDay: string) =>
        otherDays.some(
          (oDay: string) => oDay === tDay || oDay.startsWith(tDay) || tDay.startsWith(oDay)
        )
      );

      if (overlappingDayCodes.length > 0) {
        const dayNames = overlappingDayCodes.map((code: string) => {
          const found = WEEKDAY_OPTIONS.find(
            (w: any) => w.short.toUpperCase() === code || w.code === code
          );
          return found ? found.short : code;
        });

        conflicts.push({
          id: other.id,
          bookName: other.name,
          subject: other.subject || '',
          periodSlotId: other.periodSlotId,
          periodName: other.periodName || 'Selected Period',
          className: other.className || '',
          classId: other.classId,
          sectionName:
            other.sectionName || (other.sectionId ? 'Specific Section' : 'All Sections'),
          sectionId: other.sectionId || '',
          teacherName: other.teacherName || '',
          conflictingDays: overlappingDayCodes,
          conflictingDaysLabel: dayNames.join(', '),
          isFullWeekOverlap: overlappingDayCodes.length === workingDayCodes.length,
        });
      }
    });

    return conflicts;
  },
};

// Aliases for backward compatibility
export const curriculumKitabsStore = {
  getKitabs: (tenantId?: string | null): CurriculumItem[] => curriculumStore.getItems(tenantId),
  saveKitabs: (tenantId: string | null | undefined, list: CurriculumItem[]): CurriculumItem[] =>
    curriculumStore.saveItems(tenantId, list),
  addKitab: (tenantId: string | null | undefined, data: Partial<CurriculumItem>): CurriculumItem =>
    curriculumStore.addItem(tenantId, data),
  updateKitab: (
    tenantId: string | null | undefined,
    id: string,
    data: Partial<CurriculumItem>
  ): void => curriculumStore.updateItem(tenantId, id, data),
  updateProgress: (
    tenantId: string | null | undefined,
    id: string,
    p: number | string,
    n?: string
  ): void => curriculumStore.updateProgress(tenantId, id, p, n),
  deleteKitab: (tenantId: string | null | undefined, id: string): void =>
    curriculumStore.deleteItem(tenantId, id),
  getMetrics: (
    tenantId?: string | null
  ): {
    totalKitabs: number;
    completedKitabs: number;
    inProgressKitabs: number;
    notStartedKitabs: number;
    overallProgressPct: number;
  } => {
    const m = curriculumStore.getMetrics(tenantId);
    return {
      totalKitabs: m.totalItems,
      completedKitabs: m.completedItems,
      inProgressKitabs: m.inProgressItems,
      notStartedKitabs: m.notStartedItems,
      overallProgressPct: m.overallProgressPct,
    };
  },
};
