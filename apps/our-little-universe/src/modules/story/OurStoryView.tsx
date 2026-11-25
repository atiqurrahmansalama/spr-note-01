import React, { useCallback, useMemo, useState } from 'react';
import {
  TabSwitcher,
  useDrawerRegistration,
  useRightSidebar,
  useToast,
} from '@repo/ui';
import {
  BookOpenIcon,
  CalendarIcon,
  HeartIcon,
  ImageVaultIcon,
  RefreshIcon,
  SparklesIcon,
} from '../../components/icons/UniverseIcons';
import { useStoryHub } from './hooks/useStoryHub';
import { useStoryTranslation } from './locales';
import { StoryHeroCard } from './components/StoryHeroCard';
import { StoryBeginningTab } from './components/StoryBeginningTab';
import { StoryTimelineTab } from './components/StoryTimelineTab';
import { StoryFirstsTab } from './components/StoryFirstsTab';
import { ThenAndNowTab } from './components/ThenAndNowTab';
import { SpecialDatesTab } from './components/SpecialDatesTab';
import { StoryCoupleDossierTab } from './components/StoryCoupleDossierTab';
import { StoryPhotosTab } from './components/StoryPhotosTab';
import { StoryMemoryDetailModal } from './components/StoryMemoryDetailModal';
import { StoryProfileDrawerForm } from './components/drawers/StoryProfileDrawerForm';
import { StoryMilestoneDrawerForm } from './components/drawers/StoryMilestoneDrawerForm';
import { StoryFactsDrawerForm } from './components/drawers/StoryFactsDrawerForm';
import { StoryChapterDrawerForm } from './components/drawers/StoryChapterDrawerForm';
import { StoryComparisonDrawerForm } from './components/drawers/StoryComparisonDrawerForm';
import { StorySpecialDateDrawerForm } from './components/drawers/StorySpecialDateDrawerForm';
import type {
  StoryChapter,
  StoryComparison,
  StoryEntryType,
  StoryMilestone,
  StorySpecialDate,
} from './types';

type StoryTab =
  | 'beginning'
  | 'timeline'
  | 'firsts'
  | 'thenNow'
  | 'dates'
  | 'dossier'
  | 'photos';

export const OurStoryView: React.FC = () => {
  const { t } = useStoryTranslation();
  const { showToast } = useToast();
  const { openDrawer, openRightSidebar, closeRightSidebar } = useRightSidebar();
  const {
    data,
    loading,
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
    uploadStoryPhoto,
    uploadStoryAudio,
  } = useStoryHub();

  const [detailMilestone, setDetailMilestone] = useState<StoryMilestone | null>(null);
  const [activeTab, setActiveTab] = useState<StoryTab>(() => {
    try {
      const saved = sessionStorage.getItem('olu_story_active_tab') as StoryTab | null;
      return saved || 'beginning';
    } catch {
      return 'beginning';
    }
  });

  const handleTabChange = (nextTab: string) => {
    setActiveTab(nextTab as StoryTab);
    try {
      sessionStorage.setItem('olu_story_active_tab', nextTab);
    } catch {
      // Ignore storage errors
    }
  };

  // URL-Synced Right Drawer: Edit Story Profile & Beginning
  useDrawerRegistration(
    'story-profile',
    () => {
      if (!data?.profile) return null;
      return {
        title: t('drawers.profileTitle', 'Edit Story Profile & Beginning'),
        subtitle: t(
          'drawers.profileSubtitle',
          'Customize Hero banner, Our Beginning intro, signature quote, cover image, and origin dates.'
        ),
        category: t('badge', 'Our Story Hub'),
        icon: HeartIcon,
        size: 'md',
        content: (
          <StoryProfileDrawerForm
            key={`story-profile-${data.profile.updated_at}`}
            profile={data.profile}
            galleryAssets={data.gallery_assets}
            onSave={updateStoryProfile}
            onUploadPhoto={uploadStoryPhoto}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      };
    },
    [data?.profile, data?.gallery_assets, t, updateStoryProfile, uploadStoryPhoto, closeRightSidebar]
  );

  // URL-Synced Right Drawer: Manage Couple Dossier Facts
  useDrawerRegistration(
    'story-facts',
    () => {
      if (!data?.profile) return null;
      return {
        title: t('drawers.factsTitle', 'Manage Couple Dossier Facts'),
        subtitle: t(
          'drawers.factsSubtitle',
          'Add, edit, or reorder meaningful details shown inside Couple Dossier.'
        ),
        category: t('tabs.dossier', 'Couple Dossier'),
        icon: SparklesIcon,
        size: 'md',
        content: (
          <StoryFactsDrawerForm
            key={`story-facts-${data.profile.updated_at}`}
            initialFacts={data.profile.profile_facts || []}
            onSave={updateStoryProfile}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      };
    },
    [data?.profile, t, updateStoryProfile, closeRightSidebar]
  );

  const openAddChapterDrawer = useCallback(() => {
    if (!data) return;
    const nextNumber =
      data.chapters.reduce((maxNum, ch) => Math.max(maxNum, ch.chapter_number), 0) + 1;
    openRightSidebar({
      drawerKey: 'story-chapter-add',
      syncUrl: false,
      title: t('drawers.addChapterTitle', 'Add Story Chapter'),
      subtitle: t(
        'beginning.chaptersSubtitle',
        'Open each chapter to read memories in context and reveal hidden surprises.'
      ),
      category: t('tabs.beginning', 'Our Beginning & Chapters'),
      icon: BookOpenIcon,
      size: 'md',
      content: (
        <StoryChapterDrawerForm
          key={`story-chapter-add-${Date.now()}`}
          defaultChapterNumber={nextNumber}
          galleryAssets={data.gallery_assets}
          onSave={createChapter}
          onUploadPhoto={uploadStoryPhoto}
          onClose={() => closeRightSidebar(false)}
        />
      ),
    });
  }, [closeRightSidebar, createChapter, data, openRightSidebar, t, uploadStoryPhoto]);

  const openEditChapterDrawer = useCallback(
    (chapter: StoryChapter) => {
      if (!data) return;
      openRightSidebar({
        drawerKey: `story-chapter-edit-${chapter.id}`,
        syncUrl: false,
        title: t('drawers.editChapterTitle', 'Edit Story Chapter'),
        subtitle: chapter.subtitle || undefined,
        category: t('tabs.beginning', 'Our Beginning & Chapters'),
        icon: BookOpenIcon,
        size: 'md',
        content: (
          <StoryChapterDrawerForm
            key={`story-chapter-edit-${chapter.id}-${chapter.updated_at}`}
            initialData={chapter}
            galleryAssets={data.gallery_assets}
            onSave={(payload) => updateChapter(chapter.id, payload)}
            onUploadPhoto={uploadStoryPhoto}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      });
    },
    [closeRightSidebar, data, openRightSidebar, t, updateChapter, uploadStoryPhoto]
  );

  const openAddMilestoneDrawer = useCallback(
    (entryType: StoryEntryType = 'timeline', photoAssetId: string | null = null) => {
      if (!data) return;
      openRightSidebar({
        drawerKey: 'story-milestone-add',
        syncUrl: false,
        title: t('drawers.addMilestoneTitle', 'Add Story Event'),
        subtitle: t(
          'drawers.addMilestoneSubtitle',
          'Write a timeline chapter or capture one of Our Firsts.'
        ),
        category: t('badge', 'Our Story Hub'),
        icon: BookOpenIcon,
        size: 'md',
        content: (
          <StoryMilestoneDrawerForm
            key={`story-ms-add-${entryType}-${Date.now()}`}
            defaultEntryType={entryType}
            defaultPhotoAssetId={photoAssetId}
            chapters={data.chapters}
            galleryAssets={data.gallery_assets}
            audioAssets={data.audio_assets}
            onSave={createMilestone}
            onUploadPhoto={uploadStoryPhoto}
            onUploadAudio={uploadStoryAudio}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      });
    },
    [closeRightSidebar, createMilestone, data, openRightSidebar, t, uploadStoryAudio, uploadStoryPhoto]
  );

  const openEditMilestoneDrawer = useCallback(
    (milestone: StoryMilestone) => {
      if (!data) return;
      openRightSidebar({
        drawerKey: `story-milestone-edit-${milestone.id}`,
        syncUrl: false,
        title: t('drawers.editMilestoneTitle', 'Edit Story Event'),
        subtitle: t(
          'drawers.editMilestoneSubtitle',
          'Refine dates, visibility, chapter link, audio clip, or attached private photo.'
        ),
        category: milestone.badge || t('badge', 'Our Story Hub'),
        icon: BookOpenIcon,
        size: 'md',
        content: (
          <StoryMilestoneDrawerForm
            key={`story-ms-edit-${milestone.id}-${milestone.updated_at}`}
            initialData={milestone}
            chapters={data.chapters}
            galleryAssets={data.gallery_assets}
            audioAssets={data.audio_assets}
            onSave={(payload) => updateMilestone(milestone.id, payload)}
            onUploadPhoto={uploadStoryPhoto}
            onUploadAudio={uploadStoryAudio}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      });
    },
    [closeRightSidebar, data, openRightSidebar, t, updateMilestone, uploadStoryAudio, uploadStoryPhoto]
  );

  const openAddComparisonDrawer = useCallback(() => {
    if (!data) return;
    openRightSidebar({
      drawerKey: 'story-comparison-add',
      syncUrl: false,
      title: t('drawers.addComparisonTitle', 'Add Then & Now Comparison'),
      category: t('tabs.thenNow', 'Then & Now'),
      icon: ImageVaultIcon,
      size: 'md',
      content: (
        <StoryComparisonDrawerForm
          key={`story-comp-add-${Date.now()}`}
          galleryAssets={data.gallery_assets}
          onSave={createComparison}
          onUploadPhoto={uploadStoryPhoto}
          onClose={() => closeRightSidebar(false)}
        />
      ),
    });
  }, [closeRightSidebar, createComparison, data, openRightSidebar, t, uploadStoryPhoto]);

  const openEditComparisonDrawer = useCallback(
    (comparison: StoryComparison) => {
      if (!data) return;
      openRightSidebar({
        drawerKey: `story-comparison-edit-${comparison.id}`,
        syncUrl: false,
        title: t('drawers.editComparisonTitle', 'Edit Then & Now Comparison'),
        category: t('tabs.thenNow', 'Then & Now'),
        icon: ImageVaultIcon,
        size: 'md',
        content: (
          <StoryComparisonDrawerForm
            key={`story-comp-edit-${comparison.id}-${comparison.updated_at}`}
            initialData={comparison}
            galleryAssets={data.gallery_assets}
            onSave={(payload) => updateComparison(comparison.id, payload)}
            onUploadPhoto={uploadStoryPhoto}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      });
    },
    [closeRightSidebar, data, openRightSidebar, t, updateComparison, uploadStoryPhoto]
  );

  const openAddSpecialDateDrawer = useCallback(() => {
    openRightSidebar({
      drawerKey: 'story-date-add',
      syncUrl: false,
      title: t('drawers.addDateTitle', 'Add Special Date'),
      category: t('tabs.dates', 'Special Dates'),
      icon: CalendarIcon,
      size: 'md',
      content: (
        <StorySpecialDateDrawerForm
          key={`story-date-add-${Date.now()}`}
          onSave={createSpecialDate}
          onClose={() => closeRightSidebar(false)}
        />
      ),
    });
  }, [closeRightSidebar, createSpecialDate, openRightSidebar, t]);

  const openEditSpecialDateDrawer = useCallback(
    (dateItem: StorySpecialDate) => {
      openRightSidebar({
        drawerKey: `story-date-edit-${dateItem.id}`,
        syncUrl: false,
        title: t('drawers.editDateTitle', 'Edit Special Date'),
        category: t('tabs.dates', 'Special Dates'),
        icon: CalendarIcon,
        size: 'md',
        content: (
          <StorySpecialDateDrawerForm
            key={`story-date-edit-${dateItem.id}-${dateItem.updated_at}`}
            initialData={dateItem}
            onSave={(payload) => updateSpecialDate(dateItem.id, payload)}
            onClose={() => closeRightSidebar(false)}
          />
        ),
      });
    },
    [closeRightSidebar, openRightSidebar, t, updateSpecialDate]
  );

  const handleReorderMilestone = useCallback(
    async (list: StoryMilestone[], item: StoryMilestone, direction: 'up' | 'down') => {
      const idx = list.findIndex((m) => m.id === item.id);
      if (idx === -1) return;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return;
      const neighbor = list[targetIdx];

      const currentOrder = item.sort_order === neighbor.sort_order ? idx * 10 : item.sort_order;
      const neighborOrder =
        item.sort_order === neighbor.sort_order ? targetIdx * 10 : neighbor.sort_order;

      await Promise.all([
        updateMilestone(item.id, { sort_order: neighborOrder }),
        updateMilestone(neighbor.id, { sort_order: currentOrder }),
      ]);
      showToast(t('timeline.savedToast', 'Story entry saved!'), 'success');
    },
    [showToast, t, updateMilestone]
  );

  const handleUnlockSurprise = useCallback(
    async (item: StoryMilestone) => {
      await unlockMilestone(item.id);
      showToast(t('timeline.unlockedToast', 'Hidden story note revealed!'), 'success');
    },
    [showToast, t, unlockMilestone]
  );

  const timelineItems = useMemo(
    () => (data?.milestones || []).filter((m) => m.entry_type === 'timeline'),
    [data?.milestones]
  );

  const firstsItems = useMemo(
    () => (data?.milestones || []).filter((m) => m.entry_type === 'first'),
    [data?.milestones]
  );

  const favoritesCount = useMemo(
    () => (data?.milestones || []).filter((m) => m.is_favorite).length,
    [data?.milestones]
  );

  const tabs = useMemo(
    () => [
      {
        id: 'beginning',
        label: t('tabs.beginning', 'Our Beginning & Chapters'),
        icon: HeartIcon,
        badge: data?.chapters.length || 0,
      },
      {
        id: 'timeline',
        label: t('tabs.timeline', 'Relationship Timeline'),
        icon: BookOpenIcon,
        badge: timelineItems.length,
      },
      {
        id: 'firsts',
        label: t('tabs.firsts', 'Our Firsts'),
        icon: SparklesIcon,
        badge: firstsItems.length,
      },
      {
        id: 'thenNow',
        label: t('tabs.thenNow', 'Then & Now'),
        icon: ImageVaultIcon,
        badge: data?.comparisons.length || 0,
      },
      {
        id: 'dates',
        label: t('tabs.dates', 'Special Dates'),
        icon: CalendarIcon,
        badge: data?.special_dates.length || 0,
      },
      {
        id: 'dossier',
        label: t('tabs.dossier', 'Couple Dossier'),
        icon: HeartIcon,
      },
      {
        id: 'photos',
        label: t('tabs.photos', 'Story Keepsakes'),
        icon: ImageVaultIcon,
        badge: data?.gallery_assets.length || 0,
      },
    ],
    [
      t,
      data?.chapters.length,
      timelineItems.length,
      firstsItems.length,
      data?.comparisons.length,
      data?.special_dates.length,
      data?.gallery_assets.length,
    ]
  );

  if (loading && !data) {
    return (
      <div className="max-w-5xl w-full mx-auto p-6 sm:p-10 py-24 text-center theme-text-secondary flex flex-col items-center gap-3">
        <RefreshIcon className="w-7 h-7 theme-accent animate-spin" />
        <span className="text-xs font-medium">{t('loading', 'Loading your shared story...')}</span>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="@container max-w-5xl w-full mx-auto p-4 sm:p-8 pb-20 space-y-6">
      {/* 1. Dynamic Couple Story Hero Card */}
      <StoryHeroCard
        profile={data.profile}
        totalMilestones={data.milestones.length}
        favoritesCount={favoritesCount}
        canEdit={data.can_edit}
        onEditProfile={() => openDrawer('story-profile')}
        onManageFacts={() => openDrawer('story-facts')}
        onAddMilestone={() => openAddMilestoneDrawer('timeline')}
        onAddFirst={() => openAddMilestoneDrawer('first')}
        onAddChapter={openAddChapterDrawer}
        onAddComparison={openAddComparisonDrawer}
        onAddSpecialDate={openAddSpecialDateDrawer}
      />

      {/* 2. Reusable Project TabSwitcher */}
      <TabSwitcher tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

      {/* 3. Dynamic Tab Panels */}
      {activeTab === 'beginning' && (
        <StoryBeginningTab
          profile={data.profile}
          chapters={data.chapters}
          milestones={data.milestones}
          completedChapterIds={data.interaction.completed_chapter_ids}
          canEdit={data.can_edit}
          onEditProfile={() => openDrawer('story-profile')}
          onAddChapter={openAddChapterDrawer}
          onEditChapter={openEditChapterDrawer}
          onDeleteChapter={async (id) => {
            await deleteChapter(id);
            showToast(t('timeline.deletedToast', 'Story entry removed.'), 'success');
          }}
          onCompleteChapter={async (id) => {
            const res = await completeChapter(id);
            if (res.stars_awarded > 0 || res.surprise_message) {
              showToast(
                t('beginning.surpriseUnlockedTitle', 'Chapter Surprise Revealed'),
                'success'
              );
            }
            return res;
          }}
          onOpenMilestoneDetail={setDetailMilestone}
        />
      )}

      {activeTab === 'timeline' && (
        <StoryTimelineTab
          items={timelineItems}
          chapters={data.chapters}
          canEdit={data.can_edit}
          onAdd={() => openAddMilestoneDrawer('timeline')}
          onEdit={openEditMilestoneDrawer}
          onOpenDetail={setDetailMilestone}
          onToggleFavorite={toggleFavorite}
          onUnlockSurprise={handleUnlockSurprise}
          onReorder={(item, dir) => handleReorderMilestone(timelineItems, item, dir)}
          onDelete={async (id) => {
            await deleteMilestone(id);
            showToast(t('timeline.deletedToast', 'Story entry removed.'), 'success');
          }}
        />
      )}

      {activeTab === 'firsts' && (
        <StoryFirstsTab
          items={firstsItems}
          canEdit={data.can_edit}
          onAdd={() => openAddMilestoneDrawer('first')}
          onEdit={openEditMilestoneDrawer}
          onOpenDetail={setDetailMilestone}
          onToggleFavorite={toggleFavorite}
          onUnlockSurprise={handleUnlockSurprise}
          onReorder={(item, dir) => handleReorderMilestone(firstsItems, item, dir)}
          onDelete={async (id) => {
            await deleteMilestone(id);
            showToast(t('timeline.deletedToast', 'Story entry removed.'), 'success');
          }}
        />
      )}

      {activeTab === 'thenNow' && (
        <ThenAndNowTab
          items={data.comparisons}
          canEdit={data.can_edit}
          onAdd={openAddComparisonDrawer}
          onEdit={openEditComparisonDrawer}
          onDelete={async (id) => {
            await deleteComparison(id);
            showToast(t('timeline.deletedToast', 'Story entry removed.'), 'success');
          }}
        />
      )}

      {activeTab === 'dates' && (
        <SpecialDatesTab
          items={data.special_dates}
          canEdit={data.can_edit}
          onAdd={openAddSpecialDateDrawer}
          onEdit={openEditSpecialDateDrawer}
          onDelete={async (id) => {
            await deleteSpecialDate(id);
            showToast(t('timeline.deletedToast', 'Story entry removed.'), 'success');
          }}
        />
      )}

      {activeTab === 'dossier' && (
        <StoryCoupleDossierTab
          profile={data.profile}
          canEdit={data.can_edit}
          onEditProfile={() => openDrawer('story-profile')}
          onManageFacts={() => openDrawer('story-facts')}
        />
      )}

      {activeTab === 'photos' && (
        <StoryPhotosTab
          assets={data.gallery_assets}
          activeCoverAssetId={data.profile.cover_asset_id}
          canEdit={data.can_edit}
          onUploadPhoto={async (file) => {
            await uploadStoryPhoto(file);
          }}
          onSetCoverAsset={async (assetId) => {
            await updateStoryProfile({ cover_asset_id: assetId });
            showToast(t('photos.coverUpdatedToast', 'Story cover photo updated!'), 'success');
          }}
          onAddChapterWithPhoto={(assetId) => openAddMilestoneDrawer('timeline', assetId)}
        />
      )}

      {/* OS-07 Memory Details Reader Modal */}
      <StoryMemoryDetailModal
        milestone={detailMilestone}
        isOpen={Boolean(detailMilestone)}
        canEdit={data.can_edit}
        onClose={() => setDetailMilestone(null)}
        onEdit={openEditMilestoneDrawer}
        onToggleFavorite={toggleFavorite}
        onUnlockSurprise={handleUnlockSurprise}
      />
    </div>
  );
};

export default OurStoryView;
