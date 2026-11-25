import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { CollapsiblePageHeader, CustomButton } from '@repo/ui';
import { GiftIcon } from '../../components/icons/UniverseIcons';

export const DigitalGiftsView: React.FC = () => {
  const [opened, setOpened] = useState(false);

  const handleOpenGift = () => {
    setOpened(true);
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore confetti errors
    }
  };

  return (
    <div className="@container max-w-4xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Surprise Packages & Rewards"
        subtitle="Unwrap special surprise boxes, scratch cards, and tokens of affection."
        icon={GiftIcon}
        badge="Interactive Digital Gifts"
        collapsible={false}
      />

      <div className="max-w-md mx-auto p-8 rounded-3xl theme-bg-surface text-center space-y-6 shadow-xs border-0">
        <div className="w-20 h-20 mx-auto rounded-3xl theme-bg-accent-soft theme-accent flex items-center justify-center shadow-xs">
          <GiftIcon className="w-10 h-10" />
        </div>

        <div>
          <h3 className="text-xl font-bold theme-text-primary">
            {opened ? 'Gift Box Opened!' : 'Tap the Box to Unwrap'}
          </h3>
          <p className="text-xs theme-text-secondary mt-1">
            {opened
              ? 'Coupon: One Candlelight Dinner & No Chores for a Week!'
              : 'A special digital gift prepared with love.'}
          </p>
        </div>

        {!opened && (
          <CustomButton variant="primary" fullWidth onClick={handleOpenGift}>
            Unwrap Mystery Box
          </CustomButton>
        )}
      </div>
    </div>
  );
};

export default DigitalGiftsView;
