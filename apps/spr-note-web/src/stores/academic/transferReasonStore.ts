/**
 * SPR Note — Student Academic Transfer & Progression Reasons Store
 * =================================================================
 * Configurable taxonomy for promotion, track elevation, and capacity rebalancing reasons.
 */

import { readJSON, writeJSON } from '../coreStore';
import type { TransferReason, TransferReasonTypeOption, TransferReasonDropdownOption } from './types';

export const TRANSFER_REASON_TYPE_OPTIONS: TransferReasonTypeOption[] = [
  { value: 'PROMOTION', label: 'Annual / Level Promotion', badgeColor: 'emerald' },
  { value: 'MERIT', label: 'Merit / Accelerated Elevation', badgeColor: 'blue' },
  { value: 'DEPARTMENT', label: 'Department / Track Switch', badgeColor: 'purple' },
  { value: 'BALANCING', label: 'Group / Capacity Balancing', badgeColor: 'amber' },
  { value: 'ADMINISTRATIVE', label: 'Administrative / Guardian Request', badgeColor: 'cyan' },
  { value: 'ACADEMIC', label: 'Academic Pacing / Revision', badgeColor: 'indigo' },
  { value: 'OTHER', label: 'Custom / Miscellaneous', badgeColor: 'zinc' },
];

export const DEFAULT_TRANSFER_REASONS: TransferReason[] = [
  {
    id: 'reason_1',
    name: 'Annual Promotion & Advancement',
    name_bn: 'বার্ষিক শ্রেণী প্রমোশন ও মূল্যায়ন',
    code: 'ANNUAL_PROMOTION',
    order: 1,
    type: 'PROMOTION',
    description: 'Standard end-of-year academic progression to next higher level',
    is_active: true,
  },
  {
    id: 'reason_2',
    name: 'Mid-Term Performance Elevation',
    name_bn: 'মধ্যবর্তী মেধা ভিত্তিক প্রমোশন',
    code: 'MIDTERM_ELEVATION',
    order: 2,
    type: 'MERIT',
    description: 'Accelerated advancement based on exceptional examination performance',
    is_active: true,
  },
  {
    id: 'reason_3',
    name: 'Department / Track Switch',
    name_bn: 'বিভাগ বা শিক্ষাক্রম পরিবর্তন',
    code: 'TRACK_SWITCH',
    order: 3,
    type: 'DEPARTMENT',
    description: 'Transfer between departments (e.g. Hifz track to General or vice versa)',
    is_active: true,
  },
  {
    id: 'reason_4',
    name: 'Group / Section Capacity Rebalancing',
    name_bn: 'গ্রুপ বা সেকশন পুনর্বণ্টন',
    code: 'SECTION_REBALANCE',
    order: 4,
    type: 'BALANCING',
    description: 'Administrative rebalancing of classroom or group student ratios',
    is_active: true,
  },
  {
    id: 'reason_5',
    name: 'Guardian Request / Relocation',
    name_bn: 'অভিভাবকের আবেদন বা বাসস্থান পরিবর্তন',
    code: 'GUARDIAN_REQUEST',
    order: 5,
    type: 'ADMINISTRATIVE',
    description: 'Shift approved upon guardian request or shift in residential status',
    is_active: true,
  },
  {
    id: 'reason_6',
    name: 'Academic Level Adjustment',
    name_bn: 'একাডেমিক লেভেল পুনর্নির্ধারণ',
    code: 'LEVEL_ADJUSTMENT',
    order: 6,
    type: 'ACADEMIC',
    description: 'Syllabus pacing, revision or foundational competency realignment',
    is_active: true,
  },
  {
    id: 'reason_other',
    name: 'OTHER',
    name_bn: 'অন্যান্য সুনির্দিষ্ট কারণ',
    code: 'OTHER',
    order: 99,
    type: 'OTHER',
    description: 'Custom administrative transfer reason entered manually',
    is_active: true,
  },
];

export const transferReasonsStore = {
  getReasons: (tenantId?: string | null): TransferReason[] => {
    const key = `spr_transfer_reasons_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_TRANSFER_REASONS);
      return DEFAULT_TRANSFER_REASONS;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },

  saveReasons: (tenantId: string | null | undefined, reasons: TransferReason[]): TransferReason[] => {
    const key = `spr_transfer_reasons_${tenantId || 'default'}`;
    const sorted = [...reasons].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_transfer_reasons_updated', { detail: sorted }));
    }
    return sorted;
  },

  addReason: (tenantId: string | null | undefined, reasonData: Partial<TransferReason>): TransferReason => {
    const list = transferReasonsStore.getReasons(tenantId);
    const code = (reasonData.code || reasonData.name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 30);
    const newReason: TransferReason = {
      ...reasonData,
      id: reasonData.id || `reason_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `REASON_${Date.now()}`,
      name: reasonData.name || code,
      name_bn: reasonData.name_bn || '',
      order: reasonData.order !== undefined ? Number(reasonData.order) : list.length + 1,
      type: reasonData.type || 'ACADEMIC',
      description: reasonData.description || '',
      is_active: reasonData.is_active !== undefined ? reasonData.is_active : true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...list, newReason];
    transferReasonsStore.saveReasons(tenantId, updated);
    return newReason;
  },

  updateReason: (
    tenantId: string | null | undefined,
    id: string,
    updatedData: Partial<TransferReason>
  ): TransferReason[] => {
    const list = transferReasonsStore.getReasons(tenantId);
    const updated = list.map((r) =>
      r.id === id || r.code === id
        ? {
            ...r,
            ...updatedData,
            id: r.id,
            code: r.code,
            order: updatedData.order !== undefined ? Number(updatedData.order) : r.order,
            updatedAt: new Date().toISOString(),
          }
        : r
    );
    transferReasonsStore.saveReasons(tenantId, updated);
    return updated;
  },

  deleteReason: (tenantId: string | null | undefined, id: string): TransferReason[] => {
    const list = transferReasonsStore.getReasons(tenantId);
    const updated = list.filter((r) => r.id !== id && r.code !== id);
    transferReasonsStore.saveReasons(tenantId, updated);
    return updated;
  },

  resetToDefaults: (tenantId?: string | null): TransferReason[] => {
    return transferReasonsStore.saveReasons(tenantId, DEFAULT_TRANSFER_REASONS);
  },

  getOptions: (tenantId?: string | null): TransferReasonDropdownOption[] => {
    const list = transferReasonsStore.getReasons(tenantId);
    return list
      .filter((r) => r.is_active !== false)
      .map((r) => {
        const val = r.code === 'OTHER' ? 'OTHER' : r.name || r.code;
        const lbl =
          r.code === 'OTHER'
            ? 'Custom Reason (Specify Below)'
            : r.name_bn && !r.name.includes(r.name_bn)
            ? `${r.name} (${r.name_bn})`
            : r.name;
        return {
          value: val,
          label: lbl,
          code: r.code,
          type: r.type,
          description: r.description || '',
          raw: r,
        };
      });
  },
};
