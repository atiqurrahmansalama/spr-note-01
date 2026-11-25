import React, { useState } from 'react';
import { CollapsiblePageHeader, CustomButton, DataCardGrid } from '@repo/ui';
import { DropletsIcon, FlowerIcon } from '../../components/icons/UniverseIcons';

interface FlowerSeed {
  id: string;
  name: string;
  meaning: string;
  bloomStage: number;
}

export const VirtualGardenView: React.FC = () => {
  const [flowers, setFlowers] = useState<FlowerSeed[]>([
    { id: '1', name: 'Cosmic Rose', meaning: 'Unconditional Love', bloomStage: 3 },
    { id: '2', name: 'Lavender Starlight', meaning: 'Peace & Serenity', bloomStage: 3 },
    { id: '3', name: 'Golden Lily', meaning: 'Joy & Bright Futures', bloomStage: 2 },
    { id: '4', name: 'Emerald Sprout', meaning: 'New Adventures', bloomStage: 1 },
  ]);

  const waterFlower = (id: string) => {
    setFlowers((prev) =>
      prev.map((f) => (f.id === id ? { ...f, bloomStage: Math.min(3, f.bloomStage + 1) } : f))
    );
  };

  return (
    <div className="@container max-w-5xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Nurtured with Love"
        subtitle="Flowers planted together that bloom as memories grow."
        icon={FlowerIcon}
        badge="Our Living Virtual Garden"
        collapsible={false}
      />

      <DataCardGrid
        data={flowers}
        keyExtractor={(f: FlowerSeed) => f.id}
        gridClassName="grid grid-cols-1 @[480px]:grid-cols-2 @[820px]:grid-cols-4 gap-4"
        renderCard={(f: FlowerSeed) => (
          <div className="p-6 rounded-3xl theme-bg-surface shadow-xs text-center space-y-4 border-0">
            <div className="w-16 h-16 mx-auto rounded-2xl theme-bg-success-soft theme-success flex items-center justify-center">
              <FlowerIcon className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-bold theme-text-primary">{f.name}</h3>
              <p className="text-xs theme-text-secondary mt-1">{f.meaning}</p>
            </div>

            <div className="text-[11px] font-semibold theme-success">
              {f.bloomStage === 3 ? 'Full Bloom' : f.bloomStage === 2 ? 'Budding' : 'Growing Seed'}
            </div>

            <CustomButton
              size="sm"
              variant="soft"
              fullWidth
              icon={DropletsIcon}
              onClick={() => waterFlower(f.id)}
            >
              Water Flower
            </CustomButton>
          </div>
        )}
      />
    </div>
  );
};

export default VirtualGardenView;
