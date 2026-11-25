import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollapsiblePageHeader, CustomButton, MetricsGrid } from '@repo/ui';
import { useAdminFoundation } from './hooks/useAdminFoundation';
import {
  DashboardControlTab,
  ModulesRegistryTab,
  OverviewTab,
  PrivateMediaTab,
  RecipientAccessTab,
  WelcomeConfigTab,
} from './components';
import { useAdminTranslation } from './locales';
import {
  ArrowRightIcon,
  CompassIcon,
  ImageVaultIcon,
  KeyIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
} from '../../components/icons/UniverseIcons';

type AdminTab = 'overview' | 'welcome' | 'dashboard' | 'modules' | 'recipient' | 'media';

export const AdminDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatNumber } = useAdminTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  const {
    loading,
    overview,
    modules,
    mediaAssets,
    surprises,
    achievements,
    updateSpaceConfig,
    updateModuleConfig,
    saveRecipient,
    uploadPrivateMedia,
    deletePrivateMedia,
    saveSurprise,
    deleteSurprise,
    saveAchievement,
    deleteAchievement,
  } = useAdminFoundation();

  const enabledModulesCount = modules.filter((m) => m.is_enabled).length;
  const recipientRecord = overview?.progress_records.find((r) =>
    overview.members.some((m) => m.user_id === r.user_id && m.role === 'RECIPIENT')
  );

  return (
    <div className="@container max-w-6xl w-full mx-auto p-4 sm:p-8 pb-28 space-y-6">
      {/* Project CollapsiblePageHeader with Integrated TabSwitcher */}
      <CollapsiblePageHeader
        title={t('title', 'Universe Control Hub')}
        subtitle={t(
          'subtitle',
          'Configure welcome experience, modules, private recipient access, and private media without touching code.'
        )}
        icon={ShieldIcon}
        badge={t('badge', 'Owner Control Foundation')}
        collapsible={false}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as AdminTab)}
        tabs={[
          { id: 'overview', label: t('tabs.overview', 'Overview & Audit'), icon: ShieldIcon },
          { id: 'welcome', label: t('tabs.welcome', 'Welcome & PIN'), icon: KeyIcon },
          { id: 'dashboard', label: t('tabs.dashboard', 'Dashboard & Surprises'), icon: CompassIcon },
          { id: 'modules', label: t('tabs.modules', 'Module Registry'), icon: SettingsIcon },
          { id: 'recipient', label: t('tabs.recipient', 'Recipient Access'), icon: UsersIcon },
          { id: 'media', label: t('tabs.media', 'Private Vault'), icon: ImageVaultIcon },
        ]}
        actions={
          <CustomButton
            variant="soft"
            size="sm"
            iconRight={ArrowRightIcon}
            onClick={() => navigate('/welcome?stage=landing')}
          >
            {t('previewWelcome', 'Preview Welcome')}
          </CustomButton>
        }
      />

      {/* Metrics Summary */}
      <MetricsGrid
        cols={4}
        variant="kpi"
        items={[
          {
            id: 'modules',
            label: t('metrics.activeModules', 'Active Modules'),
            value: formatNumber(enabledModulesCount),
            icon: SettingsIcon,
            color: 'accent',
            variant: 'surface',
          },
          {
            id: 'members',
            label: t('metrics.membersCount', 'Private Members'),
            value: formatNumber(overview?.members.length || 0),
            icon: UsersIcon,
            color: 'purple',
            variant: 'surface',
          },
          {
            id: 'media',
            label: t('metrics.privateAssets', 'Private Assets'),
            value: formatNumber(mediaAssets.length),
            icon: ImageVaultIcon,
            color: 'sky',
            variant: 'surface',
          },
          {
            id: 'entry',
            label: t('metrics.entryStatus', 'Recipient Entry'),
            value: recipientRecord?.data.entry_unlocked
              ? t('metrics.unlocked', 'Unlocked')
              : t('metrics.waiting', 'Locked'),
            icon: SparklesIcon,
            color: recipientRecord?.data.entry_unlocked ? 'emerald' : 'amber',
            variant: 'surface',
          },
        ]}
      />

      {/* Active Tab Content */}
      {loading && !overview ? (
        <div className="rounded-3xl theme-bg-surface p-10 text-center text-xs theme-text-secondary">
          Loading control foundation...
        </div>
      ) : (
        <>
          {activeTab === 'overview' && overview && (
            <OverviewTab
              progressRecords={overview.progress_records}
              auditLogs={overview.audit_logs}
            />
          )}
          {activeTab === 'welcome' && overview && (
            <WelcomeConfigTab space={overview.space} onSave={updateSpaceConfig} />
          )}
          {activeTab === 'dashboard' && overview && (
            <DashboardControlTab
              space={overview.space}
              surprises={surprises}
              achievements={achievements}
              onSaveSpace={updateSpaceConfig}
              onSaveSurprise={saveSurprise}
              onDeleteSurprise={deleteSurprise}
              onSaveAchievement={saveAchievement}
              onDeleteAchievement={deleteAchievement}
            />
          )}
          {activeTab === 'modules' && (
            <ModulesRegistryTab modules={modules} onUpdateModule={updateModuleConfig} />
          )}
          {activeTab === 'recipient' && overview && (
            <RecipientAccessTab
              members={overview.members}
              onSaveRecipient={saveRecipient}
            />
          )}
          {activeTab === 'media' && (
            <PrivateMediaTab
              assets={mediaAssets}
              onUpload={uploadPrivateMedia}
              onDelete={deletePrivateMedia}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboardView;
