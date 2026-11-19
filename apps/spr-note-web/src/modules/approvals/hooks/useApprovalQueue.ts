/**
 * SPR Note — Reusable Approval Queue Hook
 * =======================================
 * Manages listing, domain/status filtering, summary badge counts,
 * and atomic approve/reject workflows across any domain.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import {
  approveApprovalRequest,
  getApprovals,
  getApprovalSummary,
  rejectApprovalRequest,
  type ApprovalDecisionPayload,
} from '@/api/approvals';
import { useApprovalsTranslation } from '../locales';
import type { ApprovalDomain, ApprovalRequestItem, ApprovalSummaryCounts } from '../types';

export interface UseApprovalQueueOptions {
  domain?: ApprovalDomain;
  initialStatus?: string;
  autoLoad?: boolean;
}

export function useApprovalQueue({
  domain = 'ALL',
  initialStatus = 'PENDING',
  autoLoad = true,
}: UseApprovalQueueOptions = {}) {
  const { showToast } = useToast();
  const { activeTenantId } = useTenant();
  const { t } = useApprovalsTranslation();

  const [requests, setRequests] = useState<ApprovalRequestItem[]>([]);
  const [summary, setSummary] = useState<ApprovalSummaryCounts>({
    total_pending: 0,
    by_domain: {},
  });
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const loadQueue = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [listRes, sumRes] = await Promise.allSettled([
          getApprovals({
            domain: domain === 'ALL' ? '' : domain,
            status: statusFilter === 'ALL' ? '' : statusFilter,
            search: searchQuery.trim(),
          }),
          getApprovalSummary(),
        ]);

        if (listRes.status === 'fulfilled') {
          const items = Array.isArray(listRes.value)
            ? listRes.value
            : listRes.value?.results || [];
          setRequests(items);
        }

        if (sumRes.status === 'fulfilled' && sumRes.value) {
          setSummary(sumRes.value);
        }
      } catch (err: any) {
        console.error('[useApprovalQueue] Failed to load queue:', err);
        showToast(err?.message || 'Failed to load approval requests.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [domain, statusFilter, searchQuery, showToast]
  );

  useEffect(() => {
    if (autoLoad) {
      loadQueue();
    }
  }, [autoLoad, loadQueue, activeTenantId]);

  const handleApprove = useCallback(
    async (id: string, decision: ApprovalDecisionPayload = {}) => {
      setActingId(id);
      try {
        const res = await approveApprovalRequest(id, decision);
        showToast(res?.message || t('approveSuccess', 'Request approved and provisioned successfully'), 'success');
        await loadQueue(true);
        return res;
      } catch (err: any) {
        showToast(err?.message || 'Failed to approve request', 'error');
        throw err;
      } finally {
        setActingId(null);
      }
    },
    [loadQueue, showToast, t]
  );

  const handleReject = useCallback(
    async (id: string, decision: ApprovalDecisionPayload = {}) => {
      setActingId(id);
      try {
        const res = await rejectApprovalRequest(id, decision);
        showToast(res?.message || t('rejectSuccess', 'Request rejected'), 'info');
        await loadQueue(true);
        return res;
      } catch (err: any) {
        showToast(err?.message || 'Failed to reject request', 'error');
        throw err;
      } finally {
        setActingId(null);
      }
    },
    [loadQueue, showToast, t]
  );

  return {
    requests,
    summary,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    loading,
    actingId,
    loadQueue,
    handleApprove,
    handleReject,
  };
}

export default useApprovalQueue;

