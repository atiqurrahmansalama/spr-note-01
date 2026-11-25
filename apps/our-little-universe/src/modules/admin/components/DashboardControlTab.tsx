import React, { useEffect, useState } from 'react';
import {
  CustomButton,
  CustomCheckbox,
  CustomInput,
  CustomSelect,
  DrawerContainer,
  DrawerFooter,
  DrawerSection,
  IconButton,
  TemplateTextarea,
  useRightSidebar,
  useToast,
} from '@repo/ui';
import {
  CheckIcon,
  CompassIcon,
  EditIcon,
  GiftIcon,
  PlusIcon,
  TrashIcon,
  TrophyIcon,
} from '../../../components/icons/UniverseIcons';
import type { UniverseSpaceConfig } from '../../../types';
import type { AchievementItem, DailySurpriseItem, SurpriseType } from '../../universe/types';
import { useAdminTranslation } from '../locales';

interface DashboardControlTabProps {
  space: UniverseSpaceConfig;
  surprises: DailySurpriseItem[];
  achievements: AchievementItem[];
  onSaveSpace: (payload: Partial<UniverseSpaceConfig>) => Promise<unknown>;
  onSaveSurprise: (payload: Partial<DailySurpriseItem>, id?: string) => Promise<unknown>;
  onDeleteSurprise: (id: string) => Promise<unknown>;
  onSaveAchievement: (payload: Partial<AchievementItem>, id?: string) => Promise<unknown>;
  onDeleteAchievement: (id: string) => Promise<unknown>;
}

const SurpriseDrawerForm: React.FC<{
  initial?: DailySurpriseItem | null;
  onSave: (payload: Partial<DailySurpriseItem>) => Promise<unknown>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const { t } = useAdminTranslation();
  const { showToast } = useToast();
  const [title, setTitle] = useState(initial?.title || '');
  const [message, setMessage] = useState(initial?.message || '');
  const [surpriseType, setSurpriseType] = useState<SurpriseType>(initial?.surprise_type || 'note');
  const [rewardStars, setRewardStars] = useState(String(initial?.reward_stars ?? 5));
  const [actionRoute, setActionRoute] = useState(initial?.action_route || '/story');
  const [isActive, setIsActive] = useState(initial ? initial.is_active : true);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        message: message.trim(),
        surprise_type: surpriseType,
        reward_stars: Math.max(0, parseInt(rewardStars, 10) || 0),
        action_route: actionRoute.trim(),
        is_active: isActive,
      });
      showToast(t('dashboardCtrl.surpriseSaved', 'Daily surprise saved.'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('dashboardCtrl.surpriseDrawerTitle', 'Daily Surprise Details')} icon={GiftIcon}>
          <CustomInput
            label={t('dashboardCtrl.titleLabel', 'Title')}
            required
            variant="card"
            value={title}
            onChange={(val: string) => setTitle(val)}
          />
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomSelect
              label={t('dashboardCtrl.typeLabel', 'Type')}
              value={surpriseType}
              onChange={(val: SurpriseType) => setSurpriseType(val)}
              options={[
                { value: 'note', label: 'Love Note' },
                { value: 'quote', label: 'Romantic Quote' },
                { value: 'clue', label: 'Secret Clue' },
                { value: 'reward', label: 'Star Reward' },
              ]}
            />
            <CustomInput
              type="number"
              label={t('dashboardCtrl.rewardLabel', 'Bonus Stars')}
              variant="card"
              value={rewardStars}
              onChange={(val: string) => setRewardStars(val)}
            />
          </div>
          <CustomInput
            label={t('dashboardCtrl.routeLabel', 'Target Route')}
            variant="card"
            value={actionRoute}
            onChange={(val: string) => setActionRoute(val)}
          />
          <TemplateTextarea
            label={t('dashboardCtrl.messageLabel', 'Message')}
            value={message}
            onChange={(val: string) => setMessage(val)}
            rows={3}
          />
          <CustomCheckbox
            checked={isActive}
            onChange={(checked: boolean) => setIsActive(checked)}
            label={t('dashboardCtrl.activeLabel', 'Active in Daily Pool')}
          />
        </DrawerSection>
        <DrawerFooter onCancel={onClose} saveLabel={t('dashboardCtrl.saveBtn', 'Save')} isSubmitting={saving} />
      </DrawerContainer>
    </form>
  );
};

const AchievementDrawerForm: React.FC<{
  initial?: AchievementItem | null;
  onSave: (payload: Partial<AchievementItem>) => Promise<unknown>;
  onClose: () => void;
}> = ({ initial, onSave, onClose }) => {
  const { t } = useAdminTranslation();
  const { showToast } = useToast();
  const [key, setKey] = useState(initial?.achievement_key || '');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [badgeLabel, setBadgeLabel] = useState(initial?.badge_label || 'Milestone');
  const [points, setPoints] = useState(String(initial?.points ?? 10));
  const [ruleType, setRuleType] = useState(initial?.rule_type || 'stars_min');
  const [ruleTarget, setRuleTarget] = useState(String(initial?.rule_target ?? 10));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        achievement_key: key.trim() || `ach_${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        badge_label: badgeLabel.trim(),
        points: Math.max(0, parseInt(points, 10) || 0),
        rule_type: ruleType,
        rule_target: Math.max(1, parseInt(ruleTarget, 10) || 1),
      });
      showToast(t('dashboardCtrl.achievementSaved', 'Achievement saved.'), 'success');
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <DrawerContainer padding="none" spacing="normal">
        <DrawerSection title={t('dashboardCtrl.achievementDrawerTitle', 'Achievement Rules')} icon={TrophyIcon}>
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5">
            <CustomInput
              label={t('dashboardCtrl.keyLabel', 'Unique Key')}
              required
              variant="card"
              value={key}
              onChange={(val: string) => setKey(val)}
            />
            <CustomInput
              label={t('dashboardCtrl.badgeLabel', 'Badge Label')}
              variant="card"
              value={badgeLabel}
              onChange={(val: string) => setBadgeLabel(val)}
            />
          </div>
          <CustomInput
            label={t('dashboardCtrl.titleLabel', 'Title')}
            required
            variant="card"
            value={title}
            onChange={(val: string) => setTitle(val)}
          />
          <TemplateTextarea
            label={t('dashboardCtrl.descriptionLabel', 'Description')}
            value={description}
            onChange={(val: string) => setDescription(val)}
            rows={2}
          />
          <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-3">
            <CustomSelect
              label={t('dashboardCtrl.ruleTypeLabel', 'Rule')}
              value={ruleType}
              onChange={(val: string) => setRuleType(val)}
              options={[
                { value: 'entry_unlocked', label: 'Entry Unlocked' },
                { value: 'stars_min', label: 'Stars Collected' },
                { value: 'surprises_min', label: 'Surprises Opened' },
                { value: 'story_chapters_min', label: 'Story Chapters' },
                { value: 'modules_visited_min', label: 'Worlds Explored' },
              ]}
            />
            <CustomInput
              type="number"
              label={t('dashboardCtrl.targetLabel', 'Target')}
              variant="card"
              value={ruleTarget}
              onChange={(val: string) => setRuleTarget(val)}
            />
            <CustomInput
              type="number"
              label={t('dashboardCtrl.rewardLabel', 'Bonus Stars')}
              variant="card"
              value={points}
              onChange={(val: string) => setPoints(val)}
            />
          </div>
        </DrawerSection>
        <DrawerFooter onCancel={onClose} saveLabel={t('dashboardCtrl.saveBtn', 'Save')} isSubmitting={saving} />
      </DrawerContainer>
    </form>
  );
};

export const DashboardControlTab: React.FC<DashboardControlTabProps> = ({
  space,
  surprises,
  achievements,
  onSaveSpace,
  onSaveSurprise,
  onDeleteSurprise,
  onSaveAchievement,
  onDeleteAchievement,
}) => {
  const { t } = useAdminTranslation();
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [greeting, setGreeting] = useState(space.dashboard_greeting || '');
  const [message, setMessage] = useState(space.dashboard_message || '');
  const [featuredBadge, setFeaturedBadge] = useState(space.featured_badge || '');
  const [featuredTitle, setFeaturedTitle] = useState(space.featured_title || '');
  const [featuredSubtitle, setFeaturedSubtitle] = useState(space.featured_subtitle || '');
  const [featuredRoute, setFeaturedRoute] = useState(space.featured_route || '/story');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setGreeting(space.dashboard_greeting || '');
    setMessage(space.dashboard_message || '');
    setFeaturedBadge(space.featured_badge || '');
    setFeaturedTitle(space.featured_title || '');
    setFeaturedSubtitle(space.featured_subtitle || '');
    setFeaturedRoute(space.featured_route || '/story');
  }, [space]);

  const handleSaveHero = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveSpace({
        dashboard_greeting: greeting,
        dashboard_message: message,
        featured_badge: featuredBadge,
        featured_title: featuredTitle,
        featured_subtitle: featuredSubtitle,
        featured_route: featuredRoute,
      });
      showToast(t('welcomeConfig.savedSuccess', 'Universe configuration saved.'), 'success');
    } catch (err: any) {
      showToast(err?.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openSurpriseDrawer = (item?: DailySurpriseItem) => {
    openRightSidebar({
      drawerKey: item ? `admin-surprise-${item.id}` : 'admin-surprise-new',
      syncUrl: false,
      title: item ? t('dashboardCtrl.editSurprise', 'Edit Daily Surprise') : t('dashboardCtrl.addSurprise', 'New Daily Surprise'),
      icon: GiftIcon,
      size: 'md',
      content: (
        <SurpriseDrawerForm
          key={item?.id || `new-${Date.now()}`}
          initial={item}
          onSave={(payload) => onSaveSurprise(payload, item?.id)}
          onClose={() => closeRightSidebar(false)}
        />
      ),
    });
  };

  const openAchievementDrawer = (item?: AchievementItem) => {
    openRightSidebar({
      drawerKey: item ? `admin-ach-${item.id}` : 'admin-ach-new',
      syncUrl: false,
      title: item ? t('dashboardCtrl.editAchievement', 'Edit Achievement') : t('dashboardCtrl.addAchievement', 'New Achievement'),
      icon: TrophyIcon,
      size: 'md',
      content: (
        <AchievementDrawerForm
          key={item?.id || `new-ach-${Date.now()}`}
          initial={item}
          onSave={(payload) => onSaveAchievement(payload, item?.id)}
          onClose={() => closeRightSidebar(false)}
        />
      ),
    });
  };

  return (
    <div className="@container space-y-6">
      {/* 1. Dashboard Greeting & Featured Moment */}
      <form onSubmit={handleSaveHero} className="rounded-3xl theme-bg-surface p-6 space-y-5 shadow-xs border-0">
        <div className="flex items-center gap-2">
          <CompassIcon className="w-4 h-4 theme-accent" />
          <h3 className="text-base font-bold theme-text-primary">
            {t('dashboardCtrl.heroSection', 'Dashboard Home & Featured Highlight')}
          </h3>
        </div>

        <div className="grid grid-cols-1 @[520px]:grid-cols-2 gap-4">
          <CustomInput
            variant="app"
            label={t('dashboardCtrl.greeting', 'Dashboard Greeting')}
            value={greeting}
            onChange={(val: string) => setGreeting(val)}
          />
          <CustomInput
            variant="app"
            label={t('dashboardCtrl.featuredRoute', 'Featured Destination Route')}
            value={featuredRoute}
            onChange={(val: string) => setFeaturedRoute(val)}
          />
        </div>

        <CustomInput
          type="textarea"
          variant="app"
          rows={2}
          label={t('dashboardCtrl.message', 'Dashboard Subtitle Message')}
          value={message}
          onChange={(val: string) => setMessage(val)}
        />

        <div className="grid grid-cols-1 @[520px]:grid-cols-3 gap-4">
          <CustomInput
            variant="app"
            label={t('dashboardCtrl.featuredBadge', 'Highlight Badge')}
            value={featuredBadge}
            onChange={(val: string) => setFeaturedBadge(val)}
          />
          <CustomInput
            variant="app"
            label={t('dashboardCtrl.featuredTitle', 'Featured Memory / Letter Title')}
            value={featuredTitle}
            onChange={(val: string) => setFeaturedTitle(val)}
          />
          <CustomInput
            variant="app"
            label={t('dashboardCtrl.featuredSubtitle', 'Highlight Description')}
            value={featuredSubtitle}
            onChange={(val: string) => setFeaturedSubtitle(val)}
          />
        </div>

        <div className="flex justify-end">
          <CustomButton type="submit" variant="primary" loading={saving} icon={CheckIcon}>
            {t('welcomeConfig.saveChanges', 'Save Configuration')}
          </CustomButton>
        </div>
      </form>

      {/* 2. Daily Surprises + Achievements Grid */}
      <div className="grid grid-cols-1 @[780px]:grid-cols-2 gap-6">
        <div className="rounded-3xl theme-bg-surface p-6 space-y-4 shadow-xs border-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GiftIcon className="w-4 h-4 theme-accent" />
              <h3 className="text-sm font-bold theme-text-primary">
                {t('dashboardCtrl.surprisesList', 'Daily Surprises Pool')}
              </h3>
            </div>
            <CustomButton size="xs" variant="soft" icon={PlusIcon} onClick={() => openSurpriseDrawer()}>
              {t('dashboardCtrl.addSurprise', 'Add Surprise')}
            </CustomButton>
          </div>

          <div className="space-y-2.5">
            {surprises.map((s) => (
              <div key={s.id} className="p-3.5 rounded-2xl theme-bg-app flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold theme-text-primary truncate">{s.title}</div>
                  <div className="text-[11px] theme-text-secondary truncate">
                    +{s.reward_stars} Stars • {s.surprise_type}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconButton icon={EditIcon} size="xs" variant="ghost" onClick={() => openSurpriseDrawer(s)} />
                  <IconButton icon={TrashIcon} size="xs" variant="danger" onClick={() => onDeleteSurprise(s.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl theme-bg-surface p-6 space-y-4 shadow-xs border-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrophyIcon className="w-4 h-4 theme-accent" />
              <h3 className="text-sm font-bold theme-text-primary">
                {t('dashboardCtrl.achievementsList', 'Achievements Configuration')}
              </h3>
            </div>
            <CustomButton size="xs" variant="soft" icon={PlusIcon} onClick={() => openAchievementDrawer()}>
              {t('dashboardCtrl.addAchievement', 'Add Achievement')}
            </CustomButton>
          </div>

          <div className="space-y-2.5">
            {achievements.map((a) => (
              <div key={a.id || a.achievement_key} className="p-3.5 rounded-2xl theme-bg-app flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold theme-text-primary truncate">{a.title}</div>
                  <div className="text-[11px] theme-text-secondary truncate">
                    {a.rule_type} ({a.rule_target}) • +{a.points} Stars
                  </div>
                </div>
                {a.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <IconButton icon={EditIcon} size="xs" variant="ghost" onClick={() => openAchievementDrawer(a)} />
                    <IconButton icon={TrashIcon} size="xs" variant="danger" onClick={() => onDeleteAchievement(a.id!)} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardControlTab;
