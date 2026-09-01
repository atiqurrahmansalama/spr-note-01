import React, { useState } from 'react';
import CustomButton from '../../../components/ui/CustomButton';
import GradingRuleFormDrawer from './GradingRuleFormDrawer';
import {
  SettingsIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '../../../context/RightSidebarContext';
import { examStore } from '../../../utils/stores/examStore';
import useExamData from '../hooks/useExamData';

/**
 * GradingRulesView
 * Universal Grading Policy Builder & Rules Manager.
 * Supports Dars-e-Nizami (Mumtaz to Rasib), General Academic 5.0 GPA, and Custom Scales.
 */
export default function GradingRulesView() {
  const { showToast } = useToast();
  const { openDrawer, closeDrawer } = useRightSidebar();
  const { tenantId, gradingSystems, refreshExamData } = useExamData();

  // Register Global Drawer for Grading Policy
  useDrawerRegistration(
    'grading_policy',
    (params) => {
      const mode = params.get('mode') || 'add';
      const systemId = params.get('id');
      const foundSystem = systemId ? gradingSystems.find((s) => String(s.id) === String(systemId)) : null;

      return {
        title: mode === 'edit' ? 'Edit Grading Scale Policy' : 'Create Universal Grading Policy',
        subtitle: mode === 'edit' ? `Update rules for ${foundSystem?.name || 'Policy'}` : 'Configure custom letter grades, GPA thresholds, and division labels',
        category: 'Examination & Results',
        size: 'lg',
        width: 'lg',
        content: (
          <GradingRuleFormDrawer
            key={`grading-rule-drawer-${mode}-${systemId || 'new'}`}
            system={foundSystem}
            tenantId={tenantId}
            onSaveSuccess={() => {
              refreshExamData();
              closeDrawer();
            }}
            onCancel={closeDrawer}
          />
        ),
      };
    },
    [gradingSystems, tenantId, refreshExamData, closeDrawer]
  );

  const handleOpenNew = () => {
    openDrawer('grading_policy', { mode: 'add' });
  };

  const handleEdit = (system) => {
    openDrawer('grading_policy', { mode: 'edit', id: system.id });
  };

  const handleDelete = (systemId) => {
    if (window.confirm('Delete this grading scale policy? Any exam using this system will revert to default.')) {
      examStore.deleteGradingSystem(tenantId, systemId);
      refreshExamData();
      showToast('Grading system deleted.', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Header & New Policy Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs">
        <div>
          <h2 className="text-xl font-black theme-text-primary tracking-tight">
            Universal Grading Policies
          </h2>
          <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
            Configure dynamic evaluation rules, letter grades, division honors, and GPA scales across multiple curricula.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <CustomButton
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={handleOpenNew}
          >
            Create Grading Scale
          </CustomButton>
        </div>
      </div>

      {/* Grading Systems List Cards */}
      <div className="grid grid-cols-1 gap-5">
        {gradingSystems.map((system) => (
          <div
            key={system.id}
            className="p-5 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4 hover:border-[var(--accent-main)]/40 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold theme-text-primary">{system.name}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold theme-bg-sub theme-text-secondary border theme-border">
                    {system.code}
                  </span>
                  {system.isDefault && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" />
                      Default System
                    </span>
                  )}
                </div>
                {system.description && (
                  <p className="text-xs theme-text-secondary">{system.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <CustomButton
                  variant="sub"
                  size="xs"
                  icon={EditIcon}
                  onClick={() => handleEdit(system)}
                >
                  Edit Scale
                </CustomButton>
                {!system.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDelete(system.id)}
                    className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer transition-colors"
                    title="Delete Scale"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Rules Breakdown Table */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
                Grade Tier Thresholds & Honor Divisions
              </span>
              <div className="overflow-x-auto rounded-xl border theme-border">
                <table className="w-full text-xs text-left">
                  <thead className="theme-bg-sub/60 text-[11px] font-bold theme-text-secondary uppercase">
                    <tr>
                      <th className="px-3.5 py-2.5">Grade / Letter</th>
                      <th className="px-3.5 py-2.5">Meaning / Title</th>
                      <th className="px-3.5 py-2.5">Score Range (%)</th>
                      <th className="px-3.5 py-2.5">Grade Point (GPA)</th>
                      <th className="px-3.5 py-2.5">Division Honor</th>
                      <th className="px-3.5 py-2.5">Pass / Fail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                    {system.rules?.map((rule, idx) => (
                      <tr key={idx} className="hover:theme-bg-sub/30 transition-colors">
                        <td className="px-3.5 py-2.5 font-bold theme-text-primary">
                          {rule.grade}
                        </td>
                        <td className="px-3.5 py-2.5 theme-text-secondary">
                          {rule.title}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-medium theme-text-primary">
                          {rule.minMark}% — {rule.maxMark}%
                        </td>
                        <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(rule.gradePoint).toFixed(1)}
                        </td>
                        <td className="px-3.5 py-2.5 theme-text-primary font-medium">
                          {rule.division}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {rule.isPass ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                              PASS
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-600">
                              FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
