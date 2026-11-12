/**
 * SPR Note — Reusable Staff Ranks & Designations Hook
 * ===================================================
 * Centralized, authoritative single source of truth for staff ranks and official designations.
 * Listens to live store updates (`spr_staff_ranks_updated`) and tenant context switches.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTenant } from '@/context/TenantContext';
import { staffRanksStore } from '@/utils/localStore';
import { useStaffTranslation } from '../locales';
import type { StaffRankItem } from '../types';

export interface UseStaffRanksOptions {
  activeTenantId?: string | null;
  allowedDesignations?: string[];
  includeCustomOption?: boolean;
  customOptionLabel?: string;
  staffType?: string;
}

export interface StaffRankOption {
  value: string;
  label: string;
  rank_order: number;
  type?: string;
  staff_type?: string;
  badge?: string;
  description?: string;
}

export function useStaffRanks(options?: UseStaffRanksOptions | string | null) {
  const { activeTenantId: contextTenantId } = useTenant();
  const { t, formatNumber } = useStaffTranslation();

  const resolvedTenantId =
    typeof options === 'string'
      ? options
      : options?.activeTenantId ?? contextTenantId ?? null;

  const allowedDesignations = typeof options === 'object' ? options?.allowedDesignations : undefined;
  const includeCustomOption = typeof options === 'object' ? options?.includeCustomOption : false;
  const customOptionLabel = typeof options === 'object' ? options?.customOptionLabel : undefined;
  const staffTypeFilter = typeof options === 'object' ? options?.staffType : undefined;

  const [ranksList, setRanksList] = useState<StaffRankItem[]>(() =>
    staffRanksStore.getRanks(resolvedTenantId)
  );

  const refreshRanks = useCallback(() => {
    setRanksList(staffRanksStore.getRanks(resolvedTenantId));
  }, [resolvedTenantId]);

  useEffect(() => {
    refreshRanks();

    const handleRanksUpdated = () => {
      refreshRanks();
    };
    const handleTenantChanged = () => {
      refreshRanks();
    };

    window.addEventListener('spr_staff_ranks_updated', handleRanksUpdated);
    window.addEventListener('spr_tenant_changed', handleTenantChanged);

    return () => {
      window.removeEventListener('spr_staff_ranks_updated', handleRanksUpdated);
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
    };
  }, [refreshRanks]);

  const getRankByName = useCallback(
    (name: string): StaffRankItem | undefined => {
      if (!name) return undefined;
      const lower = String(name).trim().toLowerCase();
      return ranksList.find(
        (r) =>
          String(r.name).trim().toLowerCase() === lower ||
          (r.name_bn && String(r.name_bn).trim().toLowerCase() === lower) ||
          (r.code && String(r.code).trim().toLowerCase() === lower)
      );
    },
    [ranksList]
  );

  const getRankByOrder = useCallback(
    (order: number): StaffRankItem | undefined => {
      return ranksList.find((r) => Number(r.order) === Number(order));
    },
    [ranksList]
  );

  const rankOptions: StaffRankOption[] = useMemo(() => {
    const allowedSet =
      Array.isArray(allowedDesignations) && allowedDesignations.length > 0
        ? new Set(allowedDesignations.map((d) => String(d).trim().toLowerCase()).filter(Boolean))
        : null;

    let filtered = ranksList.filter((r) => r.is_active !== false);

    if (allowedSet) {
      filtered = filtered.filter((r) => allowedSet.has(String(r.name).trim().toLowerCase()));
    }

    if (staffTypeFilter) {
      filtered = filtered.filter(
        (r) => !r.type || String(r.type).toUpperCase() === String(staffTypeFilter).toUpperCase()
      );
    }

    const opts: StaffRankOption[] = filtered.map((r) => ({
      value: r.name,
      label: `${r.name_bn ? `${r.name_bn} (${r.name})` : r.name} — [${formatNumber(r.order)}]`,
      rank_order: r.order,
      type: r.type,
      staff_type: r.type,
      badge: `#${formatNumber(r.order)}`,
      description: r.description || '',
    }));

    // If allowed designations has custom names not in local store, preserve them cleanly
    if (allowedDesignations && allowedDesignations.length > 0) {
      const existingLower = new Set(opts.map((o) => String(o.value).trim().toLowerCase()));
      allowedDesignations.forEach((rawName) => {
        const clean = String(rawName || '').trim();
        if (clean && !existingLower.has(clean.toLowerCase())) {
          opts.push({
            value: clean,
            label: clean,
            rank_order: 99,
            staff_type: staffTypeFilter || 'TEACHING',
            badge: '#99',
            description: clean,
          });
        }
      });
    }

    if (includeCustomOption) {
      opts.push({
        value: '__CUSTOM__',
        label: customOptionLabel || t('customDesignationOption', '+ Enter Custom Designation / Title...'),
        rank_order: 99,
      });
    }

    return opts;
  }, [
    allowedDesignations,
    ranksList,
    staffTypeFilter,
    formatNumber,
    includeCustomOption,
    customOptionLabel,
    t,
  ]);

  return {
    ranksList,
    rankOptions,
    getRankByName,
    getRankByOrder,
    refreshRanks,
  };
}

export default useStaffRanks;

