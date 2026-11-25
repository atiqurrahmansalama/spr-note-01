import { useCallback, useEffect, useState } from 'react';
import { universeRequest } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import type {
  UniverseAuditLogItem,
  UniverseMediaAsset,
  UniverseMemberItem,
  UniverseModuleItem,
  UniverseProgress,
  UniverseSpaceConfig,
} from '../../../types';
import type { AchievementItem, DailySurpriseItem } from '../../universe/types';

export interface AdminProgressRecord {
  user_id: number;
  email: string;
  name: string;
  data: UniverseProgress;
}

export interface AdminSpaceOverviewResponse {
  space: UniverseSpaceConfig;
  members: UniverseMemberItem[];
  progress_records: AdminProgressRecord[];
  audit_logs: UniverseAuditLogItem[];
}

export function useAdminFoundation() {
  const { refreshSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<AdminSpaceOverviewResponse | null>(null);
  const [modules, setModules] = useState<UniverseModuleItem[]>([]);
  const [mediaAssets, setMediaAssets] = useState<UniverseMediaAsset[]>([]);
  const [surprises, setSurprises] = useState<DailySurpriseItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, mods, media, surps, achs] = await Promise.all([
        universeRequest<AdminSpaceOverviewResponse>('/api/v1/universe/admin/space/'),
        universeRequest<UniverseModuleItem[]>('/api/v1/universe/admin/modules/'),
        universeRequest<UniverseMediaAsset[]>('/api/v1/universe/admin/media/'),
        universeRequest<DailySurpriseItem[]>('/api/v1/universe/admin/surprises/'),
        universeRequest<AchievementItem[]>('/api/v1/universe/admin/achievements/'),
      ]);
      setOverview(ov);
      setModules(mods);
      setMediaAssets(media);
      setSurprises(surps);
      setAchievements(achs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const updateSpaceConfig = useCallback(
    async (payload: Partial<UniverseSpaceConfig> & { new_secret_pin?: string }) => {
      const updated = await universeRequest<UniverseSpaceConfig>('/api/v1/universe/admin/space/', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      await Promise.all([loadAll(), refreshSession()]);
      return updated;
    },
    [loadAll, refreshSession]
  );

  const updateModuleConfig = useCallback(
    async (moduleId: string, payload: Partial<UniverseModuleItem>) => {
      const updated = await universeRequest<UniverseModuleItem>(
        `/api/v1/universe/admin/modules/${moduleId}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );
      await Promise.all([loadAll(), refreshSession()]);
      return updated;
    },
    [loadAll, refreshSession]
  );

  const saveRecipient = useCallback(
    async (payload: {
      email: string;
      display_name: string;
      password?: string;
      is_active: boolean;
    }) => {
      const member = await universeRequest<UniverseMemberItem>('/api/v1/universe/admin/recipient/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await loadAll();
      return member;
    },
    [loadAll]
  );

  const uploadPrivateMedia = useCallback(
    async (formData: FormData) => {
      const asset = await universeRequest<UniverseMediaAsset>('/api/v1/universe/admin/media/', {
        method: 'POST',
        isMultipart: true,
        body: formData,
      });
      await loadAll();
      return asset;
    },
    [loadAll]
  );

  const deletePrivateMedia = useCallback(
    async (assetId: string) => {
      await universeRequest<void>(`/api/v1/universe/admin/media/${assetId}/`, {
        method: 'DELETE',
      });
      await loadAll();
    },
    [loadAll]
  );

  const saveSurprise = useCallback(
    async (payload: Partial<DailySurpriseItem>, surpriseId?: string) => {
      const url = surpriseId
        ? `/api/v1/universe/admin/surprises/${surpriseId}/`
        : '/api/v1/universe/admin/surprises/';
      const res = await universeRequest<DailySurpriseItem>(url, {
        method: surpriseId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      await loadAll();
      return res;
    },
    [loadAll]
  );

  const deleteSurprise = useCallback(
    async (surpriseId: string) => {
      await universeRequest<void>(`/api/v1/universe/admin/surprises/${surpriseId}/`, {
        method: 'DELETE',
      });
      await loadAll();
    },
    [loadAll]
  );

  const saveAchievement = useCallback(
    async (payload: Partial<AchievementItem>, achievementId?: string) => {
      const url = achievementId
        ? `/api/v1/universe/admin/achievements/${achievementId}/`
        : '/api/v1/universe/admin/achievements/';
      const res = await universeRequest<AchievementItem>(url, {
        method: achievementId ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      });
      await loadAll();
      return res;
    },
    [loadAll]
  );

  const deleteAchievement = useCallback(
    async (achievementId: string) => {
      await universeRequest<void>(`/api/v1/universe/admin/achievements/${achievementId}/`, {
        method: 'DELETE',
      });
      await loadAll();
    },
    [loadAll]
  );

  return {
    loading,
    overview,
    modules,
    mediaAssets,
    surprises,
    achievements,
    reload: loadAll,
    updateSpaceConfig,
    updateModuleConfig,
    saveRecipient,
    uploadPrivateMedia,
    deletePrivateMedia,
    saveSurprise,
    deleteSurprise,
    saveAchievement,
    deleteAchievement,
  };
}
