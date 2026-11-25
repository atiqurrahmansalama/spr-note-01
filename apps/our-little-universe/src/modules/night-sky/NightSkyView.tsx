import React from 'react';
import { CollapsiblePageHeader } from '@repo/ui';
import { StarsIcon } from '../../components/icons/UniverseIcons';

export const NightSkyView: React.FC = () => {
  return (
    <div className="@container max-w-4xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Our Constellation in the Sky"
        subtitle="Trace custom constellations connected by the memories we have created together."
        icon={StarsIcon}
        badge="Interactive Starfield & Constellations"
        collapsible={false}
      />

      <div className="p-10 rounded-3xl theme-bg-surface text-center space-y-4 shadow-xs border-0">
        <div className="w-16 h-16 mx-auto rounded-2xl theme-bg-warning-soft theme-warning flex items-center justify-center">
          <StarsIcon className="w-8 h-8 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold theme-text-primary">The &quot;Us&quot; Constellation</h3>
        <p className="text-xs theme-text-secondary max-w-md mx-auto leading-relaxed">
          12 interconnected star nodes representing our core relationship milestones.
          Click any star to reveal the wish written within it.
        </p>
      </div>
    </div>
  );
};

export default NightSkyView;
