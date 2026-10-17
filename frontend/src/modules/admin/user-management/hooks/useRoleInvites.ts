import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '../../../../context/ToastContext';
import { fetchWithAuth } from '../../../../utils/authService';
import {
  RoleInviteRecord,
  RoleInviteFormData,
  RoleInviteFilterState,
  RoleInviteMetrics,
} from '../types';
import { useUserTranslation } from './useUserTranslation';

const STORAGE_KEY_INVITES_VIEW_MODE = 'spr_role_invites_view_mode';

export const useRoleInvites = (onRefresh?: () => void) => {
  const { showToast } = useToast();
  const { t } = useUserTranslation();

  const [invites, setInvites] = useState<RoleInviteRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVITES_VIEW_MODE);
      if (saved === 'grid' || saved === 'table') return saved;
    } catch {
      // Ignore
    }
    return 'table';
  });

  const [filters, setFilters] = useState<RoleInviteFilterState>({
    role: 'ALL',
    status: 'ALL',
    search: '',
  });

  // 1. Fetch Invites
  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/admin/invites/');
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.results || [];
        setInvites(list);
      } else {
        showToast(t('toasts.loadInvitesError', 'Failed to load role invites.'), 'error');
      }
    } catch {
      showToast(t('toasts.loadInvitesError', 'Failed to load role invites.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  // 2. View Mode Toggle
  const handleToggleViewMode = useCallback((mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_INVITES_VIEW_MODE, mode);
    } catch {
      // Ignore
    }
  }, []);

  // 3. Filter Controls
  const updateFilters = useCallback((updates: Partial<RoleInviteFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      role: 'ALL',
      status: 'ALL',
      search: '',
    });
  }, []);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.search.trim() ||
          filters.role !== 'ALL' ||
          filters.status !== 'ALL'
      ),
    [filters]
  );

  // 4. Filtered Invites
  const filteredInvites = useMemo(() => {
    return invites.filter((invite) => {
      // Search matching
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const matchesTitle = (invite.title || '').toLowerCase().includes(query);
        const matchesRole = (invite.target_role_name || '').toLowerCase().includes(query);
        const matchesToken = (invite.token || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesRole && !matchesToken) return false;
      }

      // Role filter
      if (filters.role !== 'ALL') {
        if (
          String(invite.target_role) !== String(filters.role) &&
          invite.target_role_code !== filters.role
        ) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'ALL') {
        const isExpired = Boolean(
          invite.expires_at && new Date(invite.expires_at) < new Date()
        );
        const isRevoked = !invite.is_active;
        const isActive = invite.is_active && !isExpired;

        if (filters.status === 'ACTIVE' && !isActive) return false;
        if (filters.status === 'REVOKED' && !isRevoked) return false;
        if (filters.status === 'EXPIRED' && !isExpired) return false;
      }

      return true;
    });
  }, [invites, filters]);

  // 5. Aggregate Metrics
  const metrics: RoleInviteMetrics = useMemo(() => {
    let activeCount = 0;
    let revokedCount = 0;
    let expiredCount = 0;
    let totalUses = 0;

    const now = new Date();
    invites.forEach((invite) => {
      totalUses += invite.used_count || 0;
      const isExpired = Boolean(invite.expires_at && new Date(invite.expires_at) < now);
      if (!invite.is_active) {
        revokedCount += 1;
      } else if (isExpired) {
        expiredCount += 1;
      } else {
        activeCount += 1;
      }
    });

    return {
      totalInvites: invites.length,
      activeInvites: activeCount,
      revokedInvites: revokedCount,
      expiredInvites: expiredCount,
      totalUses,
    };
  }, [invites]);

  // 6. Join URL Generator
  const getJoinUrl = useCallback((token: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/join?token=${token}`;
  }, []);

  // 7. Copy Link to Clipboard
  const copyInviteLink = useCallback(
    (token: string) => {
      const url = getJoinUrl(token);
      navigator.clipboard.writeText(url);
      showToast(t('invites.copiedToast', 'Join link copied to clipboard!'), 'success');
    },
    [getJoinUrl, showToast, t]
  );

  // 8. Create Invite
  const createInvite = useCallback(
    async (formData: RoleInviteFormData): Promise<boolean> => {
      setSubmitting(true);
      try {
        let expires_at: string | null = null;
        if (formData.expiryPreset && formData.expiryPreset !== 'never') {
          const now = new Date();
          if (formData.expiryPreset === '1h') now.setHours(now.getHours() + 1);
          else if (formData.expiryPreset === '24h') now.setDate(now.getDate() + 1);
          else if (formData.expiryPreset === '7d') now.setDate(now.getDate() + 7);
          else if (formData.expiryPreset === '30d') now.setDate(now.getDate() + 30);
          expires_at = now.toISOString();
        } else if (formData.expires_at) {
          expires_at = formData.expires_at;
        }

        const payload = {
          title: formData.title.trim(),
          target_role: parseInt(String(formData.target_role), 10),
          max_uses: parseInt(String(formData.max_uses), 10) || 0,
          expires_at,
          is_active: true,
        };

        const res = await fetchWithAuth('/api/v1/admin/invites/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          showToast(t('invites.createdToast', 'Invite token and QR generated successfully!'), 'success');
          loadInvites();
          onRefresh?.();
          return true;
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || errData.detail || t('toasts.validationError', 'Failed to generate invite.'), 'error');
          return false;
        }
      } catch {
        showToast(t('toasts.networkError', 'Network connection error.'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [loadInvites, onRefresh, showToast, t]
  );

  // 9. Revoke Invite
  const revokeInvite = useCallback(
    async (id: string): Promise<boolean> => {
      setSubmitting(true);
      try {
        const res = await fetchWithAuth(`/api/v1/admin/invites/${id}/revoke/`, {
          method: 'POST',
        });
        if (res.ok) {
          showToast(t('invites.revokedToast', 'Invitation token revoked.'), 'success');
          loadInvites();
          onRefresh?.();
          return true;
        } else {
          showToast(t('toasts.revokeError', 'Failed to revoke invitation.'), 'error');
          return false;
        }
      } catch {
        showToast(t('toasts.networkError', 'Network connection error.'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [loadInvites, onRefresh, showToast, t]
  );

  // 10. Delete Invite
  const deleteInvite = useCallback(
    async (invite: RoleInviteRecord): Promise<boolean> => {
      setSubmitting(true);
      try {
        const res = await fetchWithAuth(`/api/v1/admin/invites/${invite.id}/`, {
          method: 'DELETE',
        });
        if (res.ok) {
          showToast(
            t('invites.deletedToast', 'Invite "{{title}}" deleted successfully.', {
              title: invite.title,
            }),
            'success'
          );
          loadInvites();
          onRefresh?.();
          return true;
        } else {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || errData.detail || t('toasts.deleteError', 'Failed to delete invite.'), 'error');
          return false;
        }
      } catch {
        showToast(t('toasts.networkError', 'Network connection error.'), 'error');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [loadInvites, onRefresh, showToast, t]
  );

  // 11. Export Invites CSV
  const exportInvitesCsv = useCallback(() => {
    try {
      const headers = ['ID', 'Title', 'Role', 'Role Code', 'Usages', 'Max Uses', 'Expires At', 'Status', 'Created At'];
      const rows = filteredInvites.map((inv) => {
        const isExpired = Boolean(inv.expires_at && new Date(inv.expires_at) < new Date());
        const statusLabel = !inv.is_active ? 'REVOKED' : isExpired ? 'EXPIRED' : 'ACTIVE';

        return [
          inv.id,
          `"${(inv.title || '').replace(/"/g, '""')}"`,
          `"${(inv.target_role_name || '').replace(/"/g, '""')}"`,
          inv.target_role_code,
          inv.used_count || 0,
          inv.max_uses === 0 ? 'Unlimited' : inv.max_uses,
          inv.expires_at || 'Never',
          statusLabel,
          inv.created_at,
        ];
      });

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `role_invites_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(t('toasts.exportSuccess', 'Invites exported successfully.'), 'success');
    } catch (err: any) {
      showToast(err.message || 'Export failed', 'error');
    }
  }, [filteredInvites, showToast, t]);

  return {
    invites,
    loading,
    submitting,
    viewMode,
    filters,
    filteredInvites,
    metrics,
    hasActiveFilters,
    loadInvites,
    updateFilters,
    resetFilters,
    handleToggleViewMode,
    createInvite,
    revokeInvite,
    deleteInvite,
    copyInviteLink,
    getJoinUrl,
    exportInvitesCsv,
  };
};

export default useRoleInvites;
