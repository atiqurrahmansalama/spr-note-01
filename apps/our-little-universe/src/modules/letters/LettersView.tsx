import React from 'react';
import {
  CollapsiblePageHeader,
  CustomButton,
  DataCardGrid,
  DrawerBanner,
  DrawerContainer,
  DrawerSection,
  useRightSidebar,
} from '@repo/ui';
import { HeartIcon, MailIcon, VolumeOnIcon } from '../../components/icons/UniverseIcons';

interface LetterPreview {
  id: string;
  category: string;
  title: string;
  preview: string;
  content: string;
  hasVoiceNote: boolean;
}

const LETTERS: LetterPreview[] = [
  {
    id: '1',
    category: 'Open When',
    title: 'Open when you miss me',
    preview: 'Remember that distance means so little when someone means so much...',
    content:
      'My dearest,\n\nWhenever you feel that quiet ache in your chest, remember all our late-night talks, the times we laughed until our stomachs hurt, and the promise that I am always just one thought away.\n\nAlways yours,\nMe',
    hasVoiceNote: true,
  },
  {
    id: '2',
    category: 'Open When',
    title: 'Open when you feel stressed',
    preview: 'Take a deep breath, close your eyes, and let me remind you...',
    content:
      'Hey there superstar,\n\nYou are doing so much better than you give yourself credit for. Take a deep breath. Drink some water. Everything will align in its own time.',
    hasVoiceNote: false,
  },
  {
    id: '3',
    category: 'Anniversary',
    title: 'A Letter for Our Special Day',
    preview: 'To the one who made every ordinary day extraordinary...',
    content:
      'Happy Anniversary my love!\n\nEvery moment with you feels like discovering a new star in our personal sky. Thank you for walking beside me through every season.',
    hasVoiceNote: true,
  },
];

export const LettersView: React.FC = () => {
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const openLetterDrawer = (letter: LetterPreview) => {
    openRightSidebar({
      drawerKey: `letter-reader-${letter.id}`,
      title: letter.title,
      subtitle: letter.category,
      icon: MailIcon,
      size: 'md',
      syncUrl: false,
      content: (
        <DrawerContainer padding="none">
          <DrawerBanner
            icon={HeartIcon}
            title={letter.title}
            subtitle={letter.hasVoiceNote ? 'Includes synced voice letter audio track' : 'Written with love'}
            badge={letter.category}
          />
          <DrawerSection title="Letter" icon={MailIcon}>
            <div className="p-5 rounded-2xl theme-bg-app font-serif theme-text-primary text-sm leading-relaxed whitespace-pre-line">
              {letter.content}
            </div>
          </DrawerSection>
        </DrawerContainer>
      ),
      onCancel: () => closeRightSidebar(false),
      cancelLabel: 'Close Letter',
    });
  };

  return (
    <div className="@container max-w-4xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      <CollapsiblePageHeader
        title="Words From the Heart"
        subtitle="Envelopes sealed with care, open-when notes, and audio recordings waiting for the right moment."
        icon={MailIcon}
        badge="Letters & Sealed Messages"
        collapsible={false}
      />

      <DataCardGrid
        data={LETTERS}
        keyExtractor={(l: LetterPreview) => l.id}
        gridClassName="grid grid-cols-1 @[520px]:grid-cols-2 gap-4"
        renderCard={(l: LetterPreview) => (
          <div className="p-6 rounded-3xl theme-bg-surface shadow-xs space-y-4 border-0 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent">
                {l.category}
              </span>
              {l.hasVoiceNote && (
                <div className="flex items-center gap-1 text-[11px] theme-accent font-semibold">
                  <VolumeOnIcon className="w-3.5 h-3.5" />
                  <span>Voice Note</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold theme-text-primary">{l.title}</h3>
              <p className="text-xs theme-text-secondary mt-1 line-clamp-2 leading-relaxed">
                {l.preview}
              </p>
            </div>

            <CustomButton
              variant="soft"
              size="sm"
              fullWidth
              iconRight={HeartIcon}
              onClick={() => openLetterDrawer(l)}
            >
              Break the Seal
            </CustomButton>
          </div>
        )}
      />
    </div>
  );
};

export default LettersView;
