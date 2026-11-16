/**
 * SPR Note — Saved Comments Store
 * ================================
 * Quick comment templates and evaluation phrases for daily classroom reports.
 */

import { KEYS, readJSON, writeJSON } from '../coreStore';
import type { SavedCommentItem } from './types';

export const savedComments = {
  getAll: (): any[] => readJSON(KEYS.SAVED_COMMENTS, []),

  saveAll: (list: any[]): any[] => {
    writeJSON(KEYS.SAVED_COMMENTS, list);
    return list;
  },

  add: (
    text: string | { text: string }
  ): { updated: any[]; newItem: any | null } => {
    const trimmed = typeof text === 'string' ? text.trim() : (text?.text || '').trim();
    if (!trimmed) return { updated: savedComments.getAll(), newItem: null };
    const list = savedComments.getAll();
    const exists = list.some((item) => {
      const itemText = typeof item === 'object' && item !== null ? item.text : item;
      return (itemText || '').toLowerCase() === trimmed.toLowerCase();
    });
    if (!exists) {
      const newItem: SavedCommentItem = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
        text: trimmed,
        _local: true,
      };
      const updated = [...list, newItem];
      writeJSON(KEYS.SAVED_COMMENTS, updated);
      return { updated, newItem };
    }
    return { updated: list, newItem: null };
  },

  remove: (idOrTextOrIndex: string | number): any[] => {
    const list = savedComments.getAll();
    const updated = list.filter((item, idx) => {
      if (typeof idOrTextOrIndex === 'number' && idx === idOrTextOrIndex) {
        return false;
      }
      if (typeof item === 'string') {
        return (item as string).toLowerCase() !== String(idOrTextOrIndex).toLowerCase();
      }
      if (typeof item === 'object' && item !== null) {
        return (
          item.id !== idOrTextOrIndex &&
          (item.text || '').toLowerCase() !== String(idOrTextOrIndex).toLowerCase()
        );
      }
      return true;
    });
    writeJSON(KEYS.SAVED_COMMENTS, updated);
    return updated;
  },
};

export function mergeComments(
  apiComments: any[],
  localComments: any[]
): any[] {
  const apiNormalized: SavedCommentItem[] = (Array.isArray(apiComments) ? apiComments : [])
    .map((c) => {
      if (typeof c === 'object' && c !== null) {
        return { id: c.id, text: c.text || c.comment || '' };
      }
      return {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : String(Date.now()),
        text: String(c),
      };
    })
    .filter((c) => Boolean(c.text && c.text.trim()));

  const apiTextsLower = new Set(apiNormalized.map((c) => c.text.toLowerCase()));

  const localOnly = (Array.isArray(localComments) ? localComments : []).filter((c) => {
    if (typeof c === 'object' && c !== null) {
      return c._local && !apiTextsLower.has((c.text || '').toLowerCase());
    }
    return false;
  });

  const merged = [...apiNormalized, ...localOnly];
  writeJSON(KEYS.SAVED_COMMENTS, merged);
  return merged;
}
