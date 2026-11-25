import { useCallback, useEffect, useState } from 'react';
import { universeRequest } from '../../../core/api/client';
import { useAuth } from '../../../core/auth/AuthContext';
import type { UniverseMediaAsset } from '../../../types';
import type {
  StoryChapter,
  StoryChapterFormPayload,
  StoryComparison,
  StoryComparisonFormPayload,
  StoryHubPayload,
  StoryMilestone,
  StoryMilestoneFormPayload,
  StoryProfile,
  StorySpecialDate,
  StorySpecialDateFormPayload,
} from '../types';

export function useStoryHub() {
  const { refreshSession } = useAuth();
  const [data, setData] = useState<StoryHubPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const payload = await universeRequest<StoryHubPayload>('/api/v1/universe/story/');
      setData(payload);
      return payload;
    } catch (err: any) {
      setError(err?.message || 'Unable to load story hub.');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStory();
  }, [refreshStory]);

  const updateStoryProfile = useCallback(
    async (patch: Partial<StoryProfile>) => {
      const updated = await universeRequest<StoryProfile>('/api/v1/universe/story/profile/', {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      await refreshStory(true);
      return updated;
    },
    [refreshStory]
  );

  // Interactive Chapters CRUD & Completion
  const createChapter = useCallback(
    async (payload: StoryChapterFormPayload) => {
      const created = await universeRequest<StoryChapter>('/api/v1/universe/story/chapters/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshStory(true);
      return created;
    },
    [refreshStory]
  );

  const updateChapter = useCallback(
    async (id: string, patch: Partial<StoryChapterFormPayload>) => {
      const updated = await universeRequest<StoryChapter>(
        `/api/v1/universe/story/chapters/${id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      await refreshStory(true);
      return updated;
    },
    [refreshStory]
  );

  const deleteChapter = useCallback(
    async (id: string) => {
      await universeRequest<void>(`/api/v1/universe/story/chapters/${id}/`, {
        method: 'DELETE',
      });
      await refreshStory(true);
    },
    [refreshStory]
  );

  const completeChapter = useCallback(
    async (id: string) => {
      const res = await universeRequest<{
        completed_chapter_ids: string[];
        stars_awarded: number;
        surprise_title: string;
        surprise_message: string;
      }>(`/api/v1/universe/story/chapters/${id}/complete/`, {
        method: 'POST',
      });
      await Promise.all([refreshStory(true), refreshSession()]);
      return res;
    },
    [refreshStory, refreshSession]
  );

  // Milestones CRUD & Surprise Unlock
  const createMilestone = useCallback(
    async (payload: StoryMilestoneFormPayload) => {
      const created = await universeRequest<StoryMilestone>('/api/v1/universe/story/milestones/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refreshStory(true);
      return created;
    },
    [refreshStory]
  );

  const updateMilestone = useCallback(
    async (id: string, patch: Partial<StoryMilestoneFormPayload>) => {
      const updated = await universeRequest<StoryMilestone>(
        `/api/v1/universe/story/milestones/${id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      await refreshStory(true);
      return updated;
    },
    [refreshStory]
  );

  const unlockMilestone = useCallback(
    async (id: string) => {
      const res = await universeRequest<{
        unlocked_milestone_ids: string[];
        stars_awarded: number;
        surprise_note: string;
      }>(`/api/v1/universe/story/milestones/${id}/unlock/`, {
        method: 'POST',
      });
      await Promise.all([refreshStory(true), refreshSession()]);
      return res;
    },
    [refreshStory, refreshSession]
  );

  const toggleFavorite = useCallback(async (milestone: StoryMilestone) => {
    const updated = await universeRequest<StoryMilestone>(
      `/api/v1/universe/story/milestones/${milestone.id}/`,
      {
        method: 'PATCH',
        body: JSON.stringify({ is_favorite: !milestone.is_favorite }),
      }
    );
    setData((prev) =>
      prev
        ? {
            ...prev,
            milestones: prev.milestones.map((m) => (m.id === updated.id ? updated : m)),
          }
        : prev
    );
    return updated;
  }, []);

  const deleteMilestone = useCallback(
    async (id: string) => {
      await universeRequest<void>(`/api/v1/universe/story/milestones/${id}/`, {
        method: 'DELETE',
      });
      await refreshStory(true);
    },
    [refreshStory]
  );

  // Then & Now Comparisons CRUD
  const createComparison = useCallback(
    async (payload: StoryComparisonFormPayload) => {
      const created = await universeRequest<StoryComparison>(
        '/api/v1/universe/story/comparisons/',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      await refreshStory(true);
      return created;
    },
    [refreshStory]
  );

  const updateComparison = useCallback(
    async (id: string, patch: Partial<StoryComparisonFormPayload>) => {
      const updated = await universeRequest<StoryComparison>(
        `/api/v1/universe/story/comparisons/${id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      await refreshStory(true);
      return updated;
    },
    [refreshStory]
  );

  const deleteComparison = useCallback(
    async (id: string) => {
      await universeRequest<void>(`/api/v1/universe/story/comparisons/${id}/`, {
        method: 'DELETE',
      });
      await refreshStory(true);
    },
    [refreshStory]
  );

  // Special Dates CRUD
  const createSpecialDate = useCallback(
    async (payload: StorySpecialDateFormPayload) => {
      const created = await universeRequest<StorySpecialDate>(
        '/api/v1/universe/story/special-dates/',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      await refreshStory(true);
      return created;
    },
    [refreshStory]
  );

  const updateSpecialDate = useCallback(
    async (id: string, patch: Partial<StorySpecialDateFormPayload>) => {
      const updated = await universeRequest<StorySpecialDate>(
        `/api/v1/universe/story/special-dates/${id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }
      );
      await refreshStory(true);
      return updated;
    },
    [refreshStory]
  );

  const deleteSpecialDate = useCallback(
    async (id: string) => {
      await universeRequest<void>(`/api/v1/universe/story/special-dates/${id}/`, {
        method: 'DELETE',
      });
      await refreshStory(true);
    },
    [refreshStory]
  );

  // Private Media Uploads (Image / Audio)
  const uploadStoryMedia = useCallback(
    async (file: File, title?: string, category = 'memory') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('category', category);
      const asset = await universeRequest<UniverseMediaAsset>('/api/v1/universe/admin/media/', {
        method: 'POST',
        body: formData,
      });
      await refreshStory(true);
      return asset;
    },
    [refreshStory]
  );

  return {
    data,
    loading,
    error,
    refreshStory,
    updateStoryProfile,
    createChapter,
    updateChapter,
    deleteChapter,
    completeChapter,
    createMilestone,
    updateMilestone,
    unlockMilestone,
    toggleFavorite,
    deleteMilestone,
    createComparison,
    updateComparison,
    deleteComparison,
    createSpecialDate,
    updateSpecialDate,
    deleteSpecialDate,
    uploadStoryPhoto: (file: File, title?: string) => uploadStoryMedia(file, title, 'memory'),
    uploadStoryAudio: (file: File, title?: string) => uploadStoryMedia(file, title, 'story-audio'),
  };
}
