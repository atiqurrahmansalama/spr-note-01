import React from 'react';
import { useTranslation } from '../../../../i18n';
import type { AdmissionPipelineData } from '../../types';
import { AdmissionIcon } from '../../../../components/ui/Icons';

export interface AdmissionPipelineWidgetProps {
  data?: AdmissionPipelineData;
  title?: string;
  onViewPipeline?: () => void;
  className?: string;
}

export default function AdmissionPipelineWidget({
  data,
  title,
  onViewPipeline,
  className = '',
}: AdmissionPipelineWidgetProps) {
  const { t, formatNumber } = useTranslation('dashboard');

  const pipeline: AdmissionPipelineData = data || {
    totalApplications: 64,
    underReview: 18,
    interviewScheduled: 12,
    approved: 24,
    enrolled: 10,
  };

  const stages = [
    { label: 'Under Review', count: pipeline.underReview, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Interview', count: pipeline.interviewScheduled, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-500/10' },
    { label: 'Approved', count: pipeline.approved, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Enrolled', count: pipeline.enrolled, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  ];

  return (
    <div className={`p-5 rounded-2xl theme-bg-surface shadow-xs h-full flex flex-col justify-start space-y-4 select-none ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <AdmissionIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold theme-text-primary leading-tight">
              {title || t('admissionPipeline', 'Admission Application Pipeline')}
            </h3>
            <p className="text-[11px] theme-text-secondary mt-0.5">
              Total Applicants: <span className="font-mono font-bold theme-text-primary">{formatNumber(pipeline.totalApplications)}</span>
            </p>
          </div>
        </div>

        {onViewPipeline && (
          <button
            type="button"
            onClick={onViewPipeline}
            className="px-3 py-1.5 rounded-xl theme-bg-sub/60 hover:theme-bg-elevated text-xs font-semibold theme-text-primary transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{t('viewReport', 'Pipeline')}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>

      {/* Pipeline 4-Stage Grid (Borderless) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className={`p-3 rounded-xl text-center space-y-1 ${stage.bg}`}
          >
            <div className={`text-lg font-bold font-mono ${stage.color}`}>
              {formatNumber(stage.count)}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider theme-text-secondary truncate">
              {stage.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
