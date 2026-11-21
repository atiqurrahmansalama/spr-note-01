import React from 'react';
import { BookOpenIcon, CheckCircleIcon, SparklesIcon } from '../../../../../components/ui/Icons';
import { StudentFullProfile } from '../types';

export interface StudentQuranTabProps {
  student: StudentFullProfile;
}

export const StudentQuranTab: React.FC<StudentQuranTabProps> = ({ student }) => {
  const completedJuz = student.details?.initial_completed_juz || 0;
  const percentage = Math.round((completedJuz / 30) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Memorization & Revision Matrix Card */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b theme-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
              <BookOpenIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
                30-Juz Quran Memorization &amp; Revision Matrix
              </h3>
              <p className="text-xs theme-text-secondary mt-0.5">
                Tracking Sabq (New Lesson), Sabqi (Recent Revision), and Manzil (Distant Revision)
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 font-mono text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 border-0 shadow-xs">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            <span>Completed: {completedJuz} / 30 Juz</span>
          </div>
        </div>

        {/* Progress Bar with Soft Apple Minimalist styling */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="theme-text-secondary">Overall Hifz Milestones</span>
            <span className="theme-accent font-mono">{percentage}%</span>
          </div>
          <div className="w-full h-3 rounded-full theme-bg-app overflow-hidden p-0.5 border-0">
            <div
              className="h-full rounded-full theme-bg-accent transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
            />
          </div>
        </div>

        {/* 30-Juz Visual Grid */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-secondary block">
            Juz-by-Juz Status Breakdown
          </span>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
            {Array.from({ length: 30 }, (_, i) => {
              const juzNum = i + 1;
              const isCompleted = juzNum <= completedJuz;
              const isCurrent = juzNum === completedJuz + 1 && completedJuz < 30;

              return (
                <div
                  key={`juz_${juzNum}`}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all border-0 shadow-xs select-none ${
                    isCompleted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold'
                      : isCurrent
                      ? 'theme-bg-accent-soft theme-accent font-bold ring-0'
                      : 'theme-bg-app theme-text-secondary opacity-70'
                  }`}
                  title={`Juz ${juzNum}: ${isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}`}
                >
                  <span className="text-[10px] uppercase font-semibold opacity-70">Juz</span>
                  <span className="text-sm font-mono font-extrabold">{juzNum}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Daily Academic Protocol */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <SparklesIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Daily Hifz Protocol &amp; Lesson Methodology
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Standardized recitation and revision parameters
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl theme-bg-app border-0 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider theme-accent">
              1. Sabq (New Memorization)
            </span>
            <p className="theme-text-secondary leading-relaxed">
              Daily assigned verses recited to ustadh with pristine tajweed rules.
            </p>
          </div>
          <div className="p-4 rounded-2xl theme-bg-app border-0 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
              2. Sabqi (Recent Revision)
            </span>
            <p className="theme-text-secondary leading-relaxed">
              Continuous revision of current active juz (last 5-10 pages recited).
            </p>
          </div>
          <div className="p-4 rounded-2xl theme-bg-app border-0 shadow-xs space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">
              3. Manzil (Distant Revision)
            </span>
            <p className="theme-text-secondary leading-relaxed">
              Full cycle revision of all previously memorized ajza (1 quarter or half juz daily).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentQuranTab;
