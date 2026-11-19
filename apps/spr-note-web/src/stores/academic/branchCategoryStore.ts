/**
 * SPR Note — Branch Categories & Campus Taxonomy Store
 * =====================================================
 * Campus structures, categories, and branch label resolvers.
 */

import { readJSON, writeJSON } from '../coreStore';
import type { BranchCategory } from './types';

export const DEFAULT_BRANCH_CATEGORIES: BranchCategory[] = [
  {
    id: 'cat_main_campus',
    code: 'MAIN_CAMPUS',
    name: 'Main Campus',
    name_bn: 'মূল ক্যাম্পাস',
    order: 1,
    description: 'Central administrative headquarters and primary academic campus',
    is_active: true,
  },
  {
    id: 'cat_sub_branch',
    code: 'SUB_BRANCH',
    name: 'Sub Branch',
    name_bn: 'শাখা ক্যাম্পাস',
    order: 2,
    description: 'Secondary academic branch or feeder campus under the central institution',
    is_active: true,
  },
  {
    id: 'cat_female_branch',
    code: 'FEMALE_BRANCH',
    name: 'Female Branch / Mahila Branch',
    name_bn: 'মহিলা শাখা',
    order: 3,
    description: 'Dedicated campus for female students and faculty with separate facilities',
    is_active: true,
  },
  {
    id: 'cat_residential_campus',
    code: 'RESIDENTIAL_CAMPUS',
    name: 'Residential Campus & Boarding',
    name_bn: 'আবাসিক ক্যাম্পাস ও বোর্ডিং',
    order: 4,
    description: 'Full residential boarding campus with dormitory and residential care facilities',
    is_active: true,
  },
];

export const BRANCH_TYPE_LABELS: Record<string, string> = {
  MAIN_CAMPUS: 'Main Campus',
  FEMALE_BRANCH: 'Female Branch',
  SUB_BRANCH: 'Sub Branch',
  RESIDENTIAL_CAMPUS: 'Residential Campus',
};

export const branchCategoriesStore = {
  getCategories: (tenantId?: string | null): BranchCategory[] => {
    const key = `spr_branch_categories_${tenantId || 'default'}`;
    const raw = readJSON(key, null);
    if (!raw || !Array.isArray(raw) || raw.length === 0) {
      writeJSON(key, DEFAULT_BRANCH_CATEGORIES);
      return DEFAULT_BRANCH_CATEGORIES;
    }
    return raw.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
  },

  saveCategories: (tenantId: string | null | undefined, categories: BranchCategory[]): BranchCategory[] => {
    const key = `spr_branch_categories_${tenantId || 'default'}`;
    const sorted = [...categories].sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    writeJSON(key, sorted);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('spr_branch_categories_updated', { detail: sorted }));
    }
    return sorted;
  },

  addCategory: (tenantId: string | null | undefined, categoryData: Partial<BranchCategory>): BranchCategory => {
    const list = branchCategoriesStore.getCategories(tenantId);
    const code = (categoryData.code || categoryData.name || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .slice(0, 30);
    const newCat: BranchCategory = {
      ...categoryData,
      id: categoryData.id || `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: code || `CAT_${Date.now()}`,
      name: categoryData.name || code,
      name_bn: categoryData.name_bn || '',
      order: categoryData.order !== undefined ? Number(categoryData.order) : list.length + 1,
      description: categoryData.description || '',
      is_active: categoryData.is_active !== undefined ? categoryData.is_active : true,
    };
    const updated = [...list, newCat];
    branchCategoriesStore.saveCategories(tenantId, updated);
    return newCat;
  },

  updateCategory: (
    tenantId: string | null | undefined,
    id: string,
    updatedData: Partial<BranchCategory>
  ): BranchCategory[] => {
    const list = branchCategoriesStore.getCategories(tenantId);
    const updated = list.map((c) =>
      c.id === id || c.code === id
        ? {
            ...c,
            ...updatedData,
            id: c.id,
            code: c.code,
            order: updatedData.order !== undefined ? Number(updatedData.order) : c.order,
          }
        : c
    );
    branchCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },

  deleteCategory: (tenantId: string | null | undefined, id: string): BranchCategory[] => {
    const list = branchCategoriesStore.getCategories(tenantId);
    const updated = list.filter((c) => c.id !== id && c.code !== id);
    branchCategoriesStore.saveCategories(tenantId, updated);
    return updated;
  },

  resetToDefaults: (tenantId?: string | null): BranchCategory[] => {
    return branchCategoriesStore.saveCategories(tenantId, DEFAULT_BRANCH_CATEGORIES);
  },

  getCategoryLabel: (typeOrCode: string, tenantId?: string | null): string => {
    if (!typeOrCode) return '';
    const cats = branchCategoriesStore.getCategories(tenantId);
    const found = cats.find(
      (c) =>
        c.code?.toUpperCase() === typeOrCode.toUpperCase() ||
        c.id?.toUpperCase() === typeOrCode.toUpperCase() ||
        c.name?.toLowerCase() === typeOrCode.toLowerCase()
    );
    if (found) return found.name;
    return BRANCH_TYPE_LABELS[typeOrCode] || typeOrCode;
  },
};

/**
 * Returns clean, schema-driven display name for an academic branch
 * based on its branch_name, branch_code, or branch_type taxonomy.
 */
export function getBranchDisplayName(branch: any, tenantId?: string | null): string {
  if (!branch) return '';
  if (typeof branch === 'string') {
    let s = branch.trim();
    const dynamicLabel = branchCategoriesStore.getCategoryLabel(s, tenantId);
    if (dynamicLabel && dynamicLabel !== s) return dynamicLabel;
    if (BRANCH_TYPE_LABELS[s]) return BRANCH_TYPE_LABELS[s];
    if (s.includes(' - ')) {
      const parts = s.split(' - ');
      if (parts.length >= 2 && parts[parts.length - 1].trim()) {
        s = parts[parts.length - 1].trim();
      }
    }
    return branchCategoriesStore.getCategoryLabel(s, tenantId) || BRANCH_TYPE_LABELS[s] || s;
  }
  let name = '';
  // 1. Exact branch_name or name from schema
  if (branch.branch_name && typeof branch.branch_name === 'string' && branch.branch_name.trim()) {
    name = branch.branch_name.trim();
  } else if (branch.name && typeof branch.name === 'string' && branch.name.trim()) {
    name = branch.name.trim();
  }

  // If name has " - " with institution prefix (e.g. "Academy Name - Branch Name")
  if (name) {
    if (branch.institution_name && name.startsWith(branch.institution_name + ' - ')) {
      name = name.substring((branch.institution_name + ' - ').length).trim();
    } else if (
      branch.institution &&
      typeof branch.institution === 'object' &&
      branch.institution.name &&
      name.startsWith(branch.institution.name + ' - ')
    ) {
      name = name.substring((branch.institution.name + ' - ').length).trim();
    } else if (name.includes(' - ')) {
      const parts = name.split(' - ');
      if (parts.length >= 2 && parts[parts.length - 1].trim()) {
        name = parts[parts.length - 1].trim();
      }
    }
    if (name) return name;
  }

  // 2. Canonical branch_type or campus_type taxonomy label
  const type = branch.branch_type || branch.campus_type;
  if (type) {
    const label = branchCategoriesStore.getCategoryLabel(type, tenantId);
    if (label) return label;
  }
  // 3. Fallback to branch_code
  return branch.branch_code || 'Main Campus';
}
