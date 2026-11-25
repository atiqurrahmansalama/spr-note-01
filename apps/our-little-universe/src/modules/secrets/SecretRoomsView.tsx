import React, { useState } from 'react';
import { CollapsiblePageHeader, CustomButton, CustomInput, useToast } from '@repo/ui';
import { CheckCircleIcon, KeyIcon, LockIcon } from '../../components/icons/UniverseIcons';

export const SecretRoomsView: React.FC = () => {
  const { showToast } = useToast();
  const [code, setCode] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().toLowerCase() === 'forever' || code.trim() === '2024') {
      setUnlocked(true);
      showToast('Secret chamber unlocked!', 'success');
    } else {
      showToast('Wrong secret key! Find the clue inside Our Story timeline.', 'error');
    }
  };

  return (
    <div className="@container max-w-4xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Mystery & Hidden Surprises"
        subtitle="Enter secret passphrases discovered from clues across our universe."
        icon={LockIcon}
        badge="The Secret Chamber"
        collapsible={false}
      />

      <div className="max-w-md mx-auto p-8 rounded-3xl theme-bg-surface shadow-xs space-y-6 text-center border-0">
        {!unlocked ? (
          <form onSubmit={handleUnlock} className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center">
              <KeyIcon className="w-7 h-7" />
            </div>

            <CustomInput
              type="text"
              variant="app"
              label='Secret Passphrase (Clue hint: "forever")'
              placeholder="Enter secret word..."
              value={code}
              onChange={(val: string) => setCode(val)}
            />

            <CustomButton type="submit" variant="primary" fullWidth requireAll={[code.trim()]}>
              Unlock Secret Chamber
            </CustomButton>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl theme-bg-success-soft theme-success flex items-center justify-center">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold theme-text-primary">Chamber Unlocked!</h3>
            <p className="text-sm theme-accent font-serif italic">
              &quot;You found the secret door. Here is your hidden gift: A weekend getaway planned just for the two of us!&quot;
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecretRoomsView;
