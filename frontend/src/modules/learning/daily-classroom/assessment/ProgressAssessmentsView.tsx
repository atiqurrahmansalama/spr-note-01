import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUpIcon, 
  SparklesIcon, 
  TimerIcon, 
  BookOpenIcon, 
  ChecklistIcon, 
  ChartBarIcon 
} from '../../../../components/ui/Icons';
import { CustomButton } from '../../../../components/ui';
import { useTranslation } from '../../../../i18n';

interface ProgressAssessmentsViewProps {
  onNavigateToDailyProgress?: () => void;
  isEmbedded?: boolean;
}

/**
 * Enterprise Progress Assessments Pending & Roadmap View
 * Displays high-level specifications and preview metrics for the upcoming
 * Quran Hifz & Academic Progress Assessment evaluation system.
 */
export default function ProgressAssessmentsView({
  onNavigateToDailyProgress,
  isEmbedded = false,
}: ProgressAssessmentsViewProps) {
  const navigate = useNavigate();
  const { t } = useTranslation('navigation');

  const handleGoToProgress = () => {
    if (onNavigateToDailyProgress) {
      onNavigateToDailyProgress();
    } else {
      navigate('/studies/daily-progress');
    }
  };

  const handleGoToReports = () => {
    navigate('/student-reports');
  };

  const upcomingFeatures = [
    {
      id: 'periodic_milestones',
      title: 'Periodic Hifz Milestones & Retention Evaluations',
      description: 'Standardized monthly, quarterly, and annual memorization audits with multi-teacher verification panels.',
      icon: TrendingUpIcon,
    },
    {
      id: 'rubric_grading',
      title: 'Rubric-Based Tajweed & Fluency Scoring',
      description: 'Structured scoring criteria across Makharij, Sifat, waqf rules, rhythm, and recitation accuracy.',
      icon: ChecklistIcon,
    },
    {
      id: 'exam_weightage_sync',
      title: 'Continuous Assessment & Examination Sync',
      description: 'Seamless integration with Continuous Assessment (CA) weightage in Institutional Examination & Marksheet engines.',
      icon: ChartBarIcon,
    },
  ];

  return (
    <div className={`space-y-6 ${isEmbedded ? 'pt-2' : 'p-4 sm:p-6'}`}>
      {/* 1. Status Banner */}
      <div className="p-5 sm:p-6 rounded-2xl theme-bg-surface border theme-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <TimerIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold theme-text-primary tracking-tight">
                {t('progressAssessments', 'Progress Assessments')}
              </h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary border theme-border">
                {t('pending', 'Pending')}
              </span>
            </div>
            <p className="text-xs sm:text-sm theme-text-secondary mt-1 max-w-2xl leading-relaxed">
              Progress Assessments module is currently under development. It will provide formal periodic evaluations, comprehensive Hifz milestone certification, and recitation audits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <CustomButton
            type="button"
            variant="secondary"
            size="sm"
            icon={BookOpenIcon}
            onClick={handleGoToReports}
            className="flex-1 sm:flex-none"
          >
            {t('studentReports', 'Student Reports')}
          </CustomButton>
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={TrendingUpIcon}
            onClick={handleGoToProgress}
            className="flex-1 sm:flex-none"
          >
            {t('dailyProgress', 'Daily Progress')}
          </CustomButton>
        </div>
      </div>

      {/* 2. Feature Architecture Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {upcomingFeatures.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <div
              key={feature.id}
              className="p-5 rounded-xl theme-bg-surface border theme-border shadow-xs flex flex-col justify-between space-y-3 transition-all hover:border-current theme-accent-border"
            >
              <div className="space-y-2.5">
                <div className="w-9 h-9 rounded-lg theme-bg-sub theme-text-primary flex items-center justify-center">
                  <FeatureIcon className="w-4 h-4 opacity-80" />
                </div>
                <h3 className="text-sm font-semibold theme-text-primary leading-snug">
                  {feature.title}
                </h3>
                <p className="text-xs theme-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>

              <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
                <span className="font-medium">Formulation Phase</span>
                <span className="theme-accent font-semibold flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  Upcoming
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
