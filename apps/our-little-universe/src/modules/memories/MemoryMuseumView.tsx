import React from 'react';
import { CollapsiblePageHeader, CustomButton, DataCardGrid } from '@repo/ui';
import { FullScreenIcon, ImageVaultIcon } from '../../components/icons/UniverseIcons';

interface MemoryPreviewItem {
  id: string;
  title: string;
  date: string;
  category: string;
}

const MEMORIES: MemoryPreviewItem[] = [
  { id: '1', title: 'First Sunset Together', date: 'Summer 2024', category: 'Adventures' },
  { id: '2', title: 'Coffee in the Rain', date: 'Autumn 2024', category: 'Daily Smiles' },
  { id: '3', title: 'Midnight Starlight', date: 'Winter 2025', category: 'Milestones' },
  { id: '4', title: 'Spring Blossoms', date: 'Spring 2025', category: 'Adventures' },
];

export const MemoryMuseumView: React.FC = () => {
  return (
    <div className="@container max-w-6xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Moments Frozen in Time"
        subtitle="Photographs, albums, and snapshots that bring warmth whenever you look at them."
        icon={ImageVaultIcon}
        badge="Memory Museum & Gallery"
        collapsible={false}
      />

      <DataCardGrid
        data={MEMORIES}
        keyExtractor={(m: MemoryPreviewItem) => m.id}
        gridClassName="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-4 gap-4"
        renderCard={(m: MemoryPreviewItem) => (
          <div className="rounded-3xl overflow-hidden theme-bg-surface shadow-xs border-0 flex flex-col justify-between">
            <div className="h-44 w-full theme-bg-accent-soft flex items-center justify-center">
              <div className="w-12 h-12 rounded-2xl theme-bg-surface flex items-center justify-center theme-accent shadow-xs">
                <FullScreenIcon className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 space-y-2">
              <span className="text-[10px] font-bold theme-accent uppercase tracking-wider">
                {m.category}
              </span>
              <h4 className="text-sm font-bold theme-text-primary">{m.title}</h4>
              <p className="text-xs theme-text-secondary">{m.date}</p>
              <CustomButton size="xs" variant="app" fullWidth>
                View Memory
              </CustomButton>
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default MemoryMuseumView;
