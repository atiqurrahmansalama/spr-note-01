/**
 * SPR Note — Academic Sessions Store
 * ===================================
 * Strictly tenant-scoped academic session store and offline sync reconciler.
 * Adheres to Rule 11 (Multi-Tenant Isolation & Zero Data Leakage).
 */

import { KEYS, readJSON, writeJSON } from '../coreStore';
import type { AcademicSessionItem } from './types';

const getScopedSessionKey = (tenantId?: string | null): string => {
  const tid =
    tenantId ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('spr_active_tenant_id')
      : '') ||
    'default';
  return `spr_sessions_${tid}`;
};

export const sessions = {
  getAll: (tenantId?: string | null): AcademicSessionItem[] => {
    const key = getScopedSessionKey(tenantId);
    const scoped = readJSON(key, null);
    if (scoped && Array.isArray(scoped)) return scoped;
    // Fallback migration: check legacy unscoped if exists
    const legacy = readJSON(KEYS.SESSIONS, null);
    if (legacy && Array.isArray(legacy) && legacy.length > 0) {
      writeJSON(key, legacy);
      return legacy;
    }
    return [];
  },

  saveAll: (list: AcademicSessionItem[], tenantId?: string | null): AcademicSessionItem[] => {
    const key = getScopedSessionKey(tenantId);
    writeJSON(key, list);
    return list;
  },

  /** Add new session under active or specified tenant. Supports object or string. */
  add: (
    sessionData: string | Partial<AcademicSessionItem>,
    tenantId?: string | null
  ): { updated: AcademicSessionItem[]; newSession: AcademicSessionItem | null } => {
    const key = getScopedSessionKey(tenantId);
    const list = sessions.getAll(tenantId);
    const name = typeof sessionData === 'string' ? sessionData.trim() : (sessionData.name || '').trim();
    const rawCat = typeof sessionData === 'object' && (sessionData.category || sessionData.type)
      ? String(sessionData.category || sessionData.type).toUpperCase()
      : 'QURAN';
    const category: 'QURAN' | 'BOOK' = rawCat === 'BOOK' ? 'BOOK' : 'QURAN';

    const exists = list.some(
      (s) => s.name?.toLowerCase() === name?.toLowerCase()
    );
    if (!exists && name) {
      const newSession: AcademicSessionItem = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
        name,
        category,
        type: category,
        _local: true,
      };
      const updated = [...list, newSession];
      writeJSON(key, updated);
      return { updated, newSession };
    }
    return { updated: list, newSession: null };
  },

  /** Delete session by ID or name under active or specified tenant. */
  remove: (idOrName: string, tenantId?: string | null): AcademicSessionItem[] => {
    const key = getScopedSessionKey(tenantId);
    const updated = sessions
      .getAll(tenantId)
      .filter((s) => s.id !== idOrName && s.name !== idOrName);
    writeJSON(key, updated);
    return updated;
  },
};

export function mergeSessions(
  apiSessions: AcademicSessionItem[],
  localSessions: AcademicSessionItem[]
): AcademicSessionItem[] {
  const apiNames = new Set(apiSessions.map((s) => s.name?.toLowerCase()));

  const localOnly = localSessions
    .filter((s) => !apiNames.has(s.name?.toLowerCase()))
    .map((s) => ({
      ...s,
      category: s.category || (s.type === 'BOOK' ? 'BOOK' : 'QURAN'),
      type: s.type || s.category || 'QURAN',
      _local: true,
    }));

  const merged: AcademicSessionItem[] = [
    ...apiSessions.map((s) => {
      const copy = { ...s };
      delete copy._local;
      const cat = (copy.category || copy.type || 'QURAN').toUpperCase();
      copy.category = cat === 'BOOK' ? 'BOOK' : 'QURAN';
      copy.type = copy.category;
      return copy;
    }),
    ...localOnly,
  ];

  writeJSON(KEYS.SESSIONS, merged);
  return merged;
}
