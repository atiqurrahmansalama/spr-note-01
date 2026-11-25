import React from 'react';
import { CustomButton } from '@repo/ui';
import { EditIcon, HeartIcon, SparklesIcon } from '../../../components/icons/UniverseIcons';
import { resolveStoryIcon } from '../constants/storyStyles';
import { useStoryTranslation } from '../locales';
import type { StoryProfile } from '../types';

export interface StoryCoupleDossierTabProps {
  profile: StoryProfile;
  canEdit: boolean;
  onEditProfile: () => void;
  onManageFacts: () => void;
}

/**
 * Couple Dossier Tab inspired by StudentPersonalTab.tsx.
 * Borderless soft cards displaying structured origin fields + dynamic customizable facts.
 */
export const StoryCoupleDossierTab: React.FC<StoryCoupleDossierTabProps> = ({
  profile,
  canEdit,
  onEditProfile,
  onManageFacts,
}) => {
  const { t, formatDate } = useStoryTranslation();

  return (
    <div className="@container space-y-6">
      {/* 1. Structured Origin & Couple Credentials */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 @[560px]:p-8 shadow-xs space-y-6">
        <div className="flex flex-col @[520px]:flex-row @[520px]:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <HeartIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm @[560px]:text-base uppercase tracking-wider theme-text-primary">
                {t('dossier.coreTitle', 'Couple & Origin Details')}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {t('dossier.coreSubtitle', 'Dynamic identity details customizable anytime from the Right Drawer.')}
              </p>
            </div>
          </div>

          {canEdit && (
            <CustomButton variant="soft" size="sm" icon={EditIcon} onClick={onEditProfile}>
              {t('dossier.editProfile', 'Edit Profile')}
            </CustomButton>
          )}
        </div>

        <div className="grid grid-cols-1 @[520px]:grid-cols-2 @[820px]:grid-cols-3 gap-5 text-xs">
          <div className="p-4 rounded-2xl theme-bg-app space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
              {t('dossier.coupleNames', 'Couple Names')}
            </span>
            <p className="font-bold theme-text-primary text-sm">{profile.couple_names || '—'}</p>
          </div>

          <div className="p-4 rounded-2xl theme-bg-app space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
              {t('dossier.startDate', 'Special Start Date')}
            </span>
            <p className="font-bold theme-text-primary text-sm">
              {profile.relationship_start_date ? formatDate(profile.relationship_start_date) : '—'}
            </p>
          </div>

          <div className="p-4 rounded-2xl theme-bg-app space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
              {t('dossier.meetingPlace', 'Origin Place')}
            </span>
            <p className="font-bold theme-text-primary text-sm">{profile.meeting_place || '—'}</p>
          </div>

          <div className="p-4 rounded-2xl theme-bg-app space-y-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
              {t('dossier.song', 'Our Soundtrack')}
            </span>
            <p className="font-bold theme-text-primary text-sm">{profile.our_song_title || '—'}</p>
          </div>

          <div className="p-4 rounded-2xl theme-bg-app space-y-1 @[520px]:col-span-2">
            <span className="block text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
              {t('dossier.quote', 'Signature Quote')}
            </span>
            <p className="font-semibold theme-text-primary text-sm italic">
              {profile.signature_quote || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Custom Couple Facts */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 @[560px]:p-8 shadow-xs space-y-5">
        <div className="flex flex-col @[520px]:flex-row @[520px]:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm @[560px]:text-base uppercase tracking-wider theme-text-primary">
                {t('dossier.factsTitle', 'Shared Rituals & Story Facts')}
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                {t('dossier.factsSubtitle', 'Favorite places, inside jokes, shared dreams, and meaningful notes.')}
              </p>
            </div>
          </div>

          {canEdit && (
            <CustomButton variant="soft" size="sm" icon={EditIcon} onClick={onManageFacts}>
              {t('dossier.manageFacts', 'Edit Facts')}
            </CustomButton>
          )}
        </div>

        {profile.profile_facts && profile.profile_facts.length > 0 ? (
          <div className="grid grid-cols-1 @[540px]:grid-cols-2 gap-4">
            {profile.profile_facts.map((fact) => {
              const FactIcon = resolveStoryIcon(fact.icon_name);
              return (
                <div
                  key={fact.id}
                  className="p-4 rounded-2xl theme-bg-app flex items-start gap-3.5 border-0"
                >
                  <div className="w-9 h-9 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                    <FactIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-bold theme-text-primary">{fact.label}</span>
                      {fact.category && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full theme-bg-surface theme-text-secondary">
                          {fact.category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs theme-text-secondary leading-relaxed">{fact.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs theme-text-secondary py-4 text-center">
            {t('dossier.noFacts', 'No custom story facts added yet.')}
          </p>
        )}
      </div>
    </div>
  );
};

export default StoryCoupleDossierTab;
