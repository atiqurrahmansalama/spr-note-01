import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_INFO } from '../../constants/version';
import { getVersionTrackerInfo } from '../../utils/versionTracker';
import { useTranslation } from '../../i18n/useTranslation';
import './locales';
import {
  AboutIcon,
  ClockIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  RefreshIcon,
  AdjustmentsHorizontalIcon,
  LayersIcon,
  ExternalLinkIcon,
  GlobeIcon,
} from '../../components/ui/Icons';

export const AboutAppView: React.FC = () => {
  const navigate = useNavigate();
  const { t, formatNumber } = useTranslation('about');
  const [versionInfo, setVersionInfo] = useState(() => getVersionTrackerInfo());

  useEffect(() => {
    const handleVersionUpdate = (e: any) => {
      if (e.detail) {
        setVersionInfo(e.detail);
      } else {
        setVersionInfo(getVersionTrackerInfo());
      }
    };
    window.addEventListener('spr_version_updated', handleVersionUpdate);
    window.addEventListener('spr_report_saved', handleVersionUpdate);
    return () => {
      window.removeEventListener('spr_version_updated', handleVersionUpdate);
      window.removeEventListener('spr_report_saved', handleVersionUpdate);
    };
  }, []);

  const architecturalPillars = [
    {
      icon: ShieldCheckIcon,
      title: t('architecture.tenantTitle', 'Multi-Tenant Isolation'),
      description: t(
        'architecture.tenantDesc',
        'Strict cryptographic data scoping across campuses and institutional branches guaranteeing zero cross-organization leakage.'
      ),
      badge: 'Zero Leakage',
    },
    {
      icon: DatabaseIcon,
      title: t('architecture.dualDbTitle', 'Dual-Database Parity'),
      description: t(
        'architecture.dualDbDesc',
        'Simultaneous synchronization engine maintaining 100% schema and record parity between Local SQLite and Cloud PostgreSQL (Supabase).'
      ),
      badge: 'SQLite + PG',
    },
    {
      icon: RefreshIcon,
      title: t('architecture.offlineTitle', 'Idempotent Offline-First'),
      description: t(
        'architecture.offlineDesc',
        'Comprehensive local IndexedDB repository enabling uninterrupted classroom operation with deterministic conflict resolution upon reconnection.'
      ),
      badge: 'IndexedDB Vault',
    },
    {
      icon: AdjustmentsHorizontalIcon,
      title: t('architecture.governanceTitle', '5-Tier Feature Governance'),
      description: t(
        'architecture.governanceDesc',
        'Granular access control spanning Global Defaults, Role Scopes, Academy Roles, Academy Overrides, and User-level configurations.'
      ),
      badge: 'Precedence Engine',
    },
  ];

  const coreModules = [
    t('modules.dashboard', 'Analytical Dashboard & Chronological Trends'),
    t('modules.helpdesk', 'Action, Governance & Helpdesk Ticketing'),
    t('modules.academicOrg', 'Academic Organization & Campus Structure'),
    t('modules.classroom', 'Daily Classroom, Attendance & Academic Performance'),
    t('modules.exams', 'Examinations, Gradebooks & Result Publishing'),
    t('modules.students', 'Student Directory, Admissions & Lifecycle'),
    t('modules.staff', 'Staff Management, Designations & Rosters'),
    t('modules.finance', 'Double-Entry Finance, Invoicing & Payroll'),
    t('modules.printStudio', 'Universal DocLab, ID Badges & Certificates'),
    t('modules.controlPanel', 'Feature & Module Precedence Control Panel'),
    t('modules.backup', 'Disaster Recovery, Telemetry & Vault Backups'),
  ];

  return (
    <div className="@container w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 theme-text-primary animate-fade-in py-6 sm:py-10 px-3 sm:px-6 select-none">
      {/* 1. Hero Platform Branding Card */}
      <div className="w-full theme-bg-surface border-0 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden text-center space-y-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl theme-bg-accent-soft text-[var(--accent-main)] mx-auto flex items-center justify-center shadow-xs">
          <AboutIcon className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        <div className="space-y-2 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight theme-text-primary">
            {t('hero.title', 'SPR Note Ecosystem')}
          </h1>
          <p className="text-xs sm:text-sm font-semibold theme-accent">
            {t('hero.subtitle', 'Next-Generation Comprehensive Academy Operating System')}
          </p>
          <p className="text-xs sm:text-[13px] theme-text-secondary leading-relaxed pt-1">
            {t(
              'hero.description',
              'A mission-critical management platform engineered for institutional governance, comprehensive academic administration, multi-campus operations, and idempotent offline-first performance.'
            )}
          </p>
        </div>

        {/* Dynamic Build & Version Badges */}
        <div className="pt-2 flex flex-wrap justify-center items-center gap-2.5 text-xs font-mono">
          <span className="theme-bg-app border-0 px-3.5 py-1.5 rounded-full theme-accent font-bold shadow-2xs">
            {t('hero.versionBadge', `Version ${versionInfo.version || APP_INFO.version}`, {
              version: versionInfo.version || APP_INFO.version,
            })}
          </span>
          <span className="theme-bg-app border-0 px-3.5 py-1.5 rounded-full theme-text-secondary flex items-center gap-1.5 shadow-2xs">
            <ClockIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {t('hero.lastUpdate', `Last Updated: ${versionInfo.lastChangeTime || APP_INFO.buildTime}`, {
                time: `${versionInfo.lastChangeTime || APP_INFO.buildTime} (${versionInfo.lastChangeDate || APP_INFO.buildDate})`,
              })}
            </span>
          </span>
        </div>
      </div>

      {/* 2. Enterprise Architectural Pillars */}
      <div className="w-full space-y-3">
        <div className="px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider theme-text-secondary">
            {t('architecture.title', 'Enterprise Architecture Pillars')}
          </h2>
          <p className="text-xs theme-text-secondary">
            {t('architecture.subtitle', 'Engineered for reliability, multi-tenant security, and zero downtime')}
          </p>
        </div>

        <div className="grid grid-cols-1 @[600px]:grid-cols-2 gap-3 sm:gap-4">
          {architecturalPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="theme-bg-surface border-0 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full theme-bg-app theme-text-secondary">
                    {pillar.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold theme-text-primary">
                    {pillar.title}
                  </h3>
                  <p className="text-xs theme-text-secondary leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Core System Subsystems & Modules */}
      <div className="w-full theme-bg-surface border-0 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b theme-border">
          <div className="w-8 h-8 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <LayersIcon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold theme-text-primary">
              {t('modules.title', 'Core System Capabilities')}
            </h2>
            <p className="text-[11px] theme-text-secondary">
              {t('modules.subtitle', '11 unified subsystems powering end-to-end institutional workflows')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 @[540px]:grid-cols-2 @[840px]:grid-cols-3 gap-2.5">
          {coreModules.map((modName, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 p-3 rounded-xl theme-bg-app border-0 text-xs font-semibold theme-text-primary"
            >
              <div className="w-5 h-5 rounded-md theme-bg-accent-soft theme-accent flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                {formatNumber(index + 1)}
              </div>
              <span className="truncate">{modName}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. System Specifications & Runtime Environment */}
      <div className="w-full theme-bg-surface border-0 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
          <div>
            <h2 className="text-sm font-bold theme-text-primary">
              {t('environment.title', 'System Specifications')}
            </h2>
            <p className="text-[11px] theme-text-secondary">
              {t('environment.subtitle', 'Runtime telemetry and platform environment configuration')}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/landing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated border-0 text-xs font-semibold theme-text-primary transition-colors cursor-pointer select-none shrink-0 no-underline"
            >
              <GlobeIcon className="w-3.5 h-3.5 shrink-0 text-[var(--accent-main)]" />
              <span>{t('environment.officialWebsite', 'Official Website')}</span>
            </Link>

            <button
              type="button"
              onClick={() => navigate('/version-control')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-app hover:theme-bg-elevated border-0 text-xs font-semibold theme-accent transition-colors cursor-pointer select-none shrink-0"
            >
              <span>{t('environment.releaseNotes', 'View Release Changelog')}</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 @[780px]:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl theme-bg-app border-0 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              {t('environment.platform', 'Platform Runtime')}
            </span>
            <div className="text-xs font-bold theme-text-primary">
              {t('environment.platformValue', 'SPR Note Web / Hybrid Native Shell')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-app border-0 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              {t('environment.dbEngine', 'Database Engines')}
            </span>
            <div className="text-xs font-bold theme-text-primary">
              {t('environment.dbEngineValue', 'PostgreSQL (Supabase Cloud) + SQLite (Local Edge)')}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl theme-bg-app border-0 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary">
              {t('environment.localVault', 'Client Storage Engine')}
            </span>
            <div className="text-xs font-bold theme-text-primary">
              {t('environment.localVaultValue', 'IndexedDB Replicated Edge Vault')}
            </div>
          </div>
        </div>
      </div>

      {/* 6. Footer Disclaimer & Copyright */}
      <div className="text-center space-y-1.5 pt-2 pb-6 text-xs theme-text-secondary">
        <p className="font-semibold theme-text-primary">
          {t('footer.copyright', `© ${new Date().getFullYear()} SPR Note Ecosystem. All rights reserved.`, {
            year: new Date().getFullYear(),
          })}
        </p>
        <p className="text-[11px] max-w-xl mx-auto opacity-70">
          {t(
            'footer.disclaimer',
            'Engineered with enterprise-grade architectural standards for mission-critical institutional and academic excellence.'
          )}
        </p>
      </div>
    </div>
  );
};

export default AboutAppView;
