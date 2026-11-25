import React from 'react';
import { CollapsiblePageHeader, CustomButton } from '@repo/ui';
import { GamepadIcon, HeartIcon, HelpCircleIcon } from '../../components/icons/UniverseIcons';

export const GamesHubView: React.FC = () => {
  return (
    <div className="@container max-w-4xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Fun & Little Challenges"
        subtitle="Couple quizzes, photo matching puzzles, and mini-games to collect stars."
        icon={GamepadIcon}
        badge="Interactive Mini-Games"
        collapsible={false}
      />

      <div className="grid grid-cols-1 @[520px]:grid-cols-2 gap-4">
        <div className="p-6 rounded-3xl theme-bg-surface shadow-xs space-y-4 border-0">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <HelpCircleIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold theme-text-primary">The Couple Quiz</h3>
            <p className="text-xs theme-text-secondary mt-1">
              Who fell first? What was our first meal? Test your memory!
            </p>
          </div>
          <CustomButton variant="primary" fullWidth>
            Start Quiz (5 Questions)
          </CustomButton>
        </div>

        <div className="p-6 rounded-3xl theme-bg-surface shadow-xs space-y-4 border-0">
          <div className="w-12 h-12 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center">
            <HeartIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold theme-text-primary">Catch the Falling Hearts</h3>
            <p className="text-xs theme-text-secondary mt-1">
              Tap the glowing hearts before they float away into the night sky.
            </p>
          </div>
          <CustomButton variant="soft" fullWidth>
            Play Game
          </CustomButton>
        </div>
      </div>
    </div>
  );
};

export default GamesHubView;
