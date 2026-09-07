import React from 'react';
import MetricsGrid from '../../../../components/ui/MetricsGrid';
import {
  UsersIcon,
  CheckCircleIcon,
  AwardIcon,
  ChartBarIcon,
  TrophyIcon,
} from '../../../../components/ui/Icons';

/**
 * MarkEntryStatsBar
 * Real-time metric ribbon utilizing the project's standard MetricsGrid component.
 * 100% Theme Tokens, zero hardcoded colors.
 */
export default function MarkEntryStatsBar({ stats, fullMarks }) {
  if (!stats || stats.totalStudents === 0) return null;

  const metricItems = [
    {
      id: 'progress',
      label: 'Evaluation Progress',
      value: `${stats.evaluatedCount} / ${stats.totalStudents}`,
      subLabel: `${stats.evaluatedPct}% Completed (${stats.presentCount} Present, ${stats.absentCount} Absent)`,
      icon: UsersIcon,
      color: 'accent',
    },
    {
      id: 'pass_rate',
      label: 'Passing Rate',
      value: `${stats.passRate}%`,
      subLabel: `${stats.passedCount} Passed • ${stats.failedCount} Failed / Absent`,
      icon: CheckCircleIcon,
      color: 'default',
    },
    {
      id: 'scores',
      label: 'Average Score',
      value: `${stats.averageObtained}`,
      subLabel: `Highest Score: ${stats.highestObtained} / ${fullMarks} pts`,
      icon: TrophyIcon,
      color: 'accent',
    },
    {
      id: 'grades',
      label: 'Grade Counts',
      value: `${Object.keys(stats.gradeCounts).length} Distinct`,
      subLabel: Object.entries(stats.gradeCounts).map(([g, c]) => `${g}: ${c}`).join(' • ') || 'No marks evaluated',
      icon: ChartBarIcon,
      color: 'default',
    },
  ];

  return (
    <div className="print:hidden w-full">
      <MetricsGrid items={metricItems} cols={4} />
    </div>
  );
}
