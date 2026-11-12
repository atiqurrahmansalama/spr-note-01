/**
 * SPR Note — Reusable Staff Categories Hook
 * ==========================================
 * Centralized, single source of truth for dynamic staff categories.
 * Automatically synchronizes with `spr_staff_categories_updated` and tenant switches.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { staffCategoriesStore } from '@/utils/localStore';

export interface UseStaffCategoriesOptions {
  activeTenantId?: string | null;
  currentValue?: string;
}

export interface StaffCategoryOption {
  value: string;
  label: string;
  badge?: string;
  description?: string;
}

export function useStaffCategories(options?: UseStaffCategoriesOptions | string | null) {
  const { activeTenantId: contextTenantId } = useTenant();

  const resolvedTenantId =
    typeof options === 'string'
      ? options
      : options?.activeTenantId ?? contextTenantId ?? null;

  const currentValue = typeof options === 'object' ? options?.currentValue : undefined;

  const [categoriesList, setCategoriesList] = useState<any[]>(() =>
    staffCategoriesStore.getCategories(resolvedTenantId)
  );

  const refreshCategories = useCallback(() => {
    setCategoriesList(staffCategoriesStore.getCategories(resolvedTenantId));
  }, [resolvedTenantId]);

  useEffect(() => {
    refreshCategories();

    const handleUpdated = () => refreshCategories();
    window.addEventListener('spr_staff_categories_updated', handleUpdated);
    window.addEventListener('spr_tenant_changed', handleUpdated);

    return () => {
      window.removeEventListener('spr_staff_categories_updated', handleUpdated);
      window.removeEventListener('spr_tenant_changed', handleUpdated);
    };
  }, [refreshCategories]);

  const categoryOptions: StaffCategoryOption[] = useMemo(() => {
    const active = categoriesList
      .filter((c) => c.is_active !== false)
      .map((c) => ({
        value: c.value || c.name,
        label: c.name || c.label,
        badge: c.badge,
        description: c.description,
      }));

    if (currentValue && !active.some((opt) => opt.value === currentValue)) {
      active.push({
        value: currentValue,
        label: currentValue,
        badge: currentValue.slice(0, 6),
        description: '',
      });
    }

    return active;
  }, [categoriesList, currentValue]);

  return {
    categoriesList,
    categoryOptions,
    refreshCategories,
  };
}

export default useStaffCategories;

