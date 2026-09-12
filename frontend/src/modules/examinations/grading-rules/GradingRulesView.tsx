import React, { useMemo } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import ActionMenu, { ActionMenuItem } from '@/components/ui/ActionMenu';
import DataTable, { Column } from '@/components/ui/DataTable';
import GradingRuleFormDrawer from './GradingRuleFormDrawer';
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  CheckIcon,
  AcademicCapIcon,
} from '@/components/ui/Icons';
import { useToast } from '@/context/ToastContext';
import { useRightSidebar, useDrawerRegistration } from '@/context/RightSidebarContext';
import { examStore } from '@/stores/examStore';
import useExamData from '../hooks/useExamData';
import { GradingSystemPolicy, GradingTierRule } from './types';

/**
 * GradingRulesView
 * Universal Grading Policy Builder & Evaluation Rules Console.
 * Supports Dars-e-Nizami (Mumtaz to Rasib), National 5.0 GPA, Higher Education 4.0 GPA, and Custom Scales.
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
      const foundSystem = systemId
        ? gradingSystems.find((s: GradingSystemPolicy) => String(s.id) === String(systemId))
        : null;

      return {
        title: mode === 'edit' ? 'Edit Grading Scale Policy' : 'Create Universal Grading Policy',
        subtitle:
          mode === 'edit'
            ? `Update rules for ${foundSystem?.name || 'Policy'}`
            : 'Configure custom letter grades, GPA thresholds, and division labels',
        category: 'Admin Tools & Academic Policies',
        size: 'lg',
        width: 'lg',
        content: (
          <GradingRuleFormDrawer
            key={`grading-rule-drawer-${mode}-${systemId || 'new'}`}
            system={foundSystem as GradingSystemPolicy}
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

  const handleEdit = (system: GradingSystemPolicy) => {
    openDrawer('grading_policy', { mode: 'edit', id: system.id });
  };

  const handleDelete = (systemId: string) => {
    if (window.confirm('Delete this grading scale policy? Any exam using this system will revert to default.')) {
      examStore.deleteGradingSystem(tenantId, systemId);
      refreshExamData();
      showToast('Grading system deleted.', 'success');
    }
  };

  const getSystemActionItems = (system: GradingSystemPolicy): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [
      {
        label: 'Edit Scale',
        icon: EditIcon,
        onClick: () => handleEdit(system),
      },
    ];

    if (!system.isDefault) {
      items.push({
        label: 'Delete Scale',
        icon: TrashIcon,
        danger: true,
        onClick: () => handleDelete(system.id),
      });
    }

    return items;
  };

  // Standardized Project DataTable Columns Definition
  const tierColumns: Column<GradingTierRule>[] = useMemo(
    () => [
      {
        key: 'grade',
        header: 'Grade',
        sortable: false,
        headerClassName: 'text-left px-3.5 py-2.5 font-bold uppercase text-[11px]',
        cellClassName: 'text-left px-3.5 py-2.5 font-bold theme-text-primary text-xs',
        render: (rule: GradingTierRule) => (
          <span className="font-bold theme-text-primary">{rule.grade}</span>
        ),
      },
      {
        key: 'minMark',
        header: 'Score Range (%)',
        sortable: false,
        sortValue: (rule: GradingTierRule) => Number(rule.minMark) || 0,
        headerClassName: 'text-left px-3.5 py-2.5 font-bold uppercase text-[11px]',
        cellClassName: 'text-left px-3.5 py-2.5 font-mono font-medium theme-text-primary text-xs',
        render: (rule: GradingTierRule) => (
          <span>
            {rule.minMark}% — {rule.maxMark}%
          </span>
        ),
      },
      {
        key: 'gradePoint',
        header: 'Grade Point',
        sortable: false,
        sortValue: (rule: GradingTierRule) => Number(rule.gradePoint) || 0,
        headerClassName: 'text-left px-3.5 py-2.5 font-bold uppercase text-[11px]',
        cellClassName: 'text-left px-3.5 py-2.5 font-mono font-bold theme-accent text-xs',
        render: (rule: GradingTierRule) => Number(rule.gradePoint).toFixed(2),
      },
      {
        key: 'division',
        header: 'Division',
        sortable: false,
        headerClassName: 'text-left px-3.5 py-2.5 font-bold uppercase text-[11px]',
        cellClassName: 'text-left px-3.5 py-2.5 theme-text-primary font-medium text-xs',
        render: (rule: GradingTierRule) => rule.division || rule.title || '-',
      },
      {
        key: 'isPass',
        header: 'Pass / Fail',
        sortable: false,
        sortValue: (rule: GradingTierRule) => (rule.isPass ? 1 : 0),
        headerClassName: 'text-left px-3.5 py-2.5 font-bold uppercase text-[11px]',
        cellClassName: 'text-left px-3.5 py-2.5 text-xs',
        render: (rule: GradingTierRule) =>
          rule.isPass ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 inline-block">
              PASS
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border inline-block">
              FAIL
            </span>
          ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl theme-bg-accent-soft theme-accent flex items-center justify-center shrink-0">
            <AcademicCapIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black theme-text-primary tracking-tight">
              Universal Grading Policies & GPA Scales
            </h2>
            <p className="text-xs sm:text-sm theme-text-secondary mt-0.5">
              Configure dynamic evaluation rules, letter grades, division honors, and GPA scales across multiple curricula.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
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
        {gradingSystems.map((system: GradingSystemPolicy) => (
          <div
            key={system.id}
            className="p-5 sm:p-6 rounded-2xl border theme-border theme-bg-surface shadow-xs space-y-4 hover:border-[var(--accent-main)]/40 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold theme-text-primary">{system.name}</h3>
                  {system.isDefault && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 flex items-center gap-1 shadow-2xs">
                      <CheckIcon className="w-3 h-3" />
                      Default System
                    </span>
                  )}
                  {system.includeGradePoint === false ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-sub theme-text-secondary border theme-border">
                      Letter Grade Only
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20">
                      GPA Scale
                    </span>
                  )}
                </div>
                {system.description && (
                  <p className="text-xs theme-text-secondary">{system.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ActionMenu items={getSystemActionItems(system)} align="right" />
              </div>
            </div>

            {/* Rules Breakdown Table using project standard DataTable */}
            <DataTable
              columns={
                system.includeGradePoint === false
                  ? tierColumns.filter((c) => c.key !== 'gradePoint')
                  : tierColumns
              }
              data={system.rules || []}
              keyExtractor={(rule: GradingTierRule, idx: number) => `${rule.grade}-${rule.minMark}-${idx}`}
              tableTitle={`Grade Divisions (${system.rules?.length || 0} Tiers)`}
              compact={true}
              transparent={true}
              sortable={true}
              emptyTitle="No Tier Rules Configured"
              emptySubMessage="Edit this grading system scale to configure grade boundaries and thresholds."
              wrapperClassName="border theme-border rounded-xl overflow-hidden"
              theadClassName="theme-bg-sub/60 text-[11px] font-bold theme-text-secondary uppercase"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
