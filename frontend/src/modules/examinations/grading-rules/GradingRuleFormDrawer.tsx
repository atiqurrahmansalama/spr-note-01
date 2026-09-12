import React, { useState, useEffect, useMemo } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import CustomCheckbox from '@/components/ui/CustomCheckbox';
import { DrawerContainer } from '@/components/layout';
import InlineTaxonomyManager from '@/components/common/InlineTaxonomyManager';
import {
  SettingsIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  CloseIcon,
  DuplicateIcon,
  SparklesIcon,
} from '@/components/ui/Icons';
import { useToast } from '@/context/ToastContext';
import { examStore } from '@/stores/examStore';
import { useFormAutoSave } from '@/hooks';
import { GradingRuleFormDrawerProps, GradingTierRule } from './types';

export interface TaxonomyOptionItem {
  id?: string;
  value: string;
  label: string;
}

export default function GradingRuleFormDrawer({
  system = null,
  tenantId = 'default',
  onSaveSuccess,
  onCancel,
}: GradingRuleFormDrawerProps) {
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    name: system?.name ?? '',
    code: system?.code ?? `SCALE_${Date.now().toString(36).toUpperCase()}`,
    description: system?.description ?? '',
    includeGradePoint: system?.includeGradePoint ?? true,
    rules: system?.rules && system.rules.length > 0
      ? system.rules
      : [
          { grade: 'A+', minMark: 80, maxMark: 100, gradePoint: 5.0, division: '1st Division', isPass: true, color: 'emerald' },
          { grade: 'A', minMark: 70, maxMark: 79, gradePoint: 4.0, division: '1st Division', isPass: true, color: 'teal' },
          { grade: 'B', minMark: 50, maxMark: 69, gradePoint: 3.0, division: '2nd Division', isPass: true, color: 'blue' },
          { grade: 'C', minMark: 33, maxMark: 49, gradePoint: 2.0, division: '3rd Division', isPass: true, color: 'amber' },
          { grade: 'F', minMark: 0, maxMark: 32, gradePoint: 0.0, division: 'Failed', isPass: false, color: 'rose' },
        ],
  });

  const { name, code, description, includeGradePoint, rules } = formData;
  const setName = (val: string) => setFormData((p) => ({ ...p, name: val }));
  const setDescription = (val: string) => setFormData((p) => ({ ...p, description: val }));
  const setIncludeGradePoint = (val: boolean) => setFormData((p) => ({ ...p, includeGradePoint: val }));
  const setRules = (valOrFn: GradingTierRule[] | ((prev: GradingTierRule[]) => GradingTierRule[])) =>
    setFormData((p) => ({ ...p, rules: typeof valOrFn === 'function' ? valOrFn(p.rules) : valOrFn }));

  // ── Division & Remarks Taxonomy State ──────────────────────────────────────
  const [divisionsList, setDivisionsList] = useState<TaxonomyOptionItem[]>(() => {
    return examStore.getGradingDivisions(tenantId) || [];
  });
  const [isManageDivisionsOpen, setIsManageDivisionsOpen] = useState(false);

  const refreshDivisions = () => {
    const list = examStore.getGradingDivisions(tenantId) || [];
    setDivisionsList(list);
  };

  useEffect(() => {
    refreshDivisions();
  }, [tenantId]);

  const divisionOptions = useMemo(() => {
    if (!Array.isArray(divisionsList)) return [];
    return divisionsList.map((d, idx) => {
      const val = typeof d === 'string' ? d : d?.value || d?.label || `division_${idx}`;
      const lbl = typeof d === 'string' ? d : d?.label || d?.value || `Division ${idx + 1}`;
      return { value: val, label: lbl };
    });
  }, [divisionsList]);

  // Handle Add Division / Remarks
  const handleAddDivision = (trimmed: string) => {
    try {
      examStore.addGradingDivision(tenantId, trimmed);
      refreshDivisions();
      showToast(`Added division "${trimmed}"`, 'success');
    } catch {
      showToast('Failed to add division', 'error');
    }
  };

  // Handle Edit Division / Remarks
  const handleSaveEditDivision = (oldVal: string, trimmed: string) => {
    try {
      examStore.updateGradingDivision(tenantId, oldVal, trimmed);
      // Auto-update any existing rules in form that had the old division value
      setRules((prev) =>
        prev.map((r) => (r.division === oldVal ? { ...r, division: trimmed } : r))
      );
      refreshDivisions();
      showToast(`Division updated to "${trimmed}"`, 'success');
    } catch {
      showToast('Failed to update division', 'error');
    }
  };

  // Handle Delete Division / Remarks
  const handleDeleteDivision = (valToDelete: string) => {
    try {
      examStore.deleteGradingDivision(tenantId, valToDelete);
      refreshDivisions();
      showToast(`Deleted division "${valToDelete}"`, 'info');
    } catch {
      showToast('Failed to delete division', 'error');
    }
  };

  // Auto-Save / Draft Persistence (Silently runs in background)
  const storageKey = system?.id ? `grading_rule_edit_${system.id}` : `grading_rule_create_${tenantId || 'default'}`;
  const { clearDraft, hasRestoredDraft } = useFormAutoSave({
    formData,
    setFormData,
    storageKey,
    enabled: true,
  });

  // Brief toast notification when draft is restored
  useEffect(() => {
    if (hasRestoredDraft) {
      showToast('Previous draft data restored', 'info');
    }
  }, [hasRestoredDraft, showToast]);

  const [saving, setSaving] = useState(false);
  const [activeTierIdx, setActiveTierIdx] = useState<number | null>(0);

  const handleAddRule = () => {
    const defaultDivision = divisionOptions[0]?.value || 'Pass';
    const newIdx = rules.length;
    setRules([
      ...rules,
      {
        grade: '',
        minMark: 0,
        maxMark: 0,
        gradePoint: 0.0,
        division: defaultDivision,
        isPass: true,
        color: 'blue',
      },
    ]);
    setActiveTierIdx(newIdx);
  };

  const handleAddTierAfter = (idx: number) => {
    const defaultDivision = divisionOptions[0]?.value || 'Pass';
    const newTier: GradingTierRule = {
      grade: '',
      minMark: 0,
      maxMark: 0,
      gradePoint: 0.0,
      division: defaultDivision,
      isPass: true,
      color: 'blue',
    };
    const nextRules = [...rules];
    nextRules.splice(idx + 1, 0, newTier);
    setRules(nextRules);
    setActiveTierIdx(idx + 1);
  };

  const handleDuplicateTier = (idx: number) => {
    const sourceTier = rules[idx];
    const duplicatedTier: GradingTierRule = {
      ...sourceTier,
      grade: sourceTier.grade ? `${sourceTier.grade} (Copy)` : '',
    };
    const nextRules = [...rules];
    nextRules.splice(idx + 1, 0, duplicatedTier);
    setRules(nextRules);
    setActiveTierIdx(idx + 1);
    showToast(`Duplicated tier "${sourceTier.grade || 'Tier ' + (idx + 1)}"`, 'info');
  };

  const handleRuleChange = (index: number, field: keyof GradingTierRule, value: any) => {
    const updated = rules.map((r, i) => {
      if (i === index) {
        let finalVal = value;
        if (field === 'minMark' || field === 'maxMark' || field === 'gradePoint') {
          finalVal = value === '' ? '' : (isNaN(Number(value)) ? value : Number(value));
        }
        return {
          ...r,
          [field]: finalVal,
        };
      }
      return r;
    });
    setRules(updated);
  };

  const handleDeleteRule = (index: number) => {
    if (rules.length <= 1) {
      showToast('At least one grade rule is required.', 'warning');
      return;
    }
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSaveSystem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Grading system title is required.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const sanitizedRules = rules.map((r) => ({
        ...r,
        minMark: Number(r.minMark) || 0,
        maxMark: Number(r.maxMark) || 0,
        gradePoint: includeGradePoint ? (Number(r.gradePoint) || 0) : 0,
      }));

      const payload = {
        name,
        code,
        description,
        includeGradePoint,
        rules: sanitizedRules,
      };

      if (system?.id) {
        examStore.updateGradingSystem(tenantId, system.id, payload);
        showToast('Grading scale policy updated successfully.', 'success');
      } else {
        examStore.addGradingSystem(tenantId, payload);
        showToast('New grading scale policy created.', 'success');
      }

      clearDraft();
      onSaveSuccess?.();
    } catch {
      showToast('Failed to save grading scale policy.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DrawerContainer padding="none">
      <form onSubmit={handleSaveSystem} className="@container p-4 @[480px]:p-6 space-y-6 text-left">
        {/* Section 1: Policy Information */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <SettingsIcon className="w-4 h-4 theme-accent" />
            <h3 className="text-sm font-bold theme-text-primary">Policy Information</h3>
          </div>
          <CustomInput
            label="Grading Policy Title"
            placeholder="e.g. Standard 5.0 Scale"
            value={name}
            onChange={setName}
            required
          />
          <CustomInput
            type="textarea"
            label="Description"
            placeholder="e.g. Applicable for Sanaviah, Dawrah, and general academic classes..."
            value={description}
            onChange={setDescription}
            rows={2}
          />
          <div className="pt-1">
            <CustomCheckbox
              label="Enable Grade Point (GPA)"
              description="Calculate and assign numeric grade points (e.g. 5.0, 4.0, 3.5) alongside letter grades"
              checked={includeGradePoint}
              onChange={setIncludeGradePoint}
            />
          </div>
        </div>

        {/* Section 2: Grade Tiers & Mark Boundaries */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between pb-2 border-b theme-border flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 theme-accent" />
              <h3 className="text-sm font-bold theme-text-primary">Grade Tiers & Mark Boundaries</h3>
            </div>
            <div className="flex items-center gap-2">
              <CustomButton
                type="button"
                size="xs"
                variant="sub"
                icon={PlusIcon}
                onClick={handleAddRule}
              >
                Add Tier
              </CustomButton>
            </div>
          </div>

          {/* Reusable Inline Division & Remarks Manager Panel */}
          <InlineTaxonomyManager
            title="Manage Divisions & Remarks"
            itemTypeName="Division"
            items={divisionsList}
            isOpen={isManageDivisionsOpen}
            onClose={() => setIsManageDivisionsOpen(false)}
            onAdd={handleAddDivision}
            onUpdate={handleSaveEditDivision}
            onDelete={handleDeleteDivision}
            placeholder="New division/remarks honor (e.g. 1st Star, Distinction, Mumtaz)..."
            minItems={1}
          />

          {/* Tier Cards List */}
          <div className="space-y-3">
            {rules.map((rule, idx) => {
              const isActive = activeTierIdx === idx;
              return (
                <div key={idx} className="space-y-1.5">
                  <div
                    onClick={() => setActiveTierIdx(idx)}
                    onFocus={() => setActiveTierIdx(idx)}
                    className={`p-3.5 rounded-xl border transition-all space-y-3 cursor-default ${
                      isActive
                        ? 'theme-bg-sub/60 border-[var(--accent-main)]/50 ring-2 ring-[var(--accent-main)]/15 shadow-sm'
                        : 'theme-bg-sub/20 theme-border hover:border-[var(--accent-main)]/30 hover:theme-bg-sub/30'
                    }`}
                  >
                    {/* Tier Card Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b theme-border">
                      <span className="text-xs font-bold theme-text-primary">
                        Tier {idx + 1}: {rule.grade || 'Unnamed'}
                      </span>
                      {/* Interactive Pass / Fail Pill Toggle using Theme Tokens */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRuleChange(idx, 'isPass', !rule.isPass);
                        }}
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md border transition-all cursor-pointer flex items-center gap-1 shadow-2xs ${
                          rule.isPass
                            ? 'theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/30 hover:opacity-85'
                            : 'theme-bg-sub theme-text-secondary border theme-border hover:theme-text-primary'
                        }`}
                        title={rule.isPass ? 'Click to mark as Fail' : 'Click to mark as Pass'}
                      >
                        {rule.isPass ? (
                          <>
                            <CheckIcon className="w-3 h-3" />
                            PASS
                          </>
                        ) : (
                          <>
                            <CloseIcon className="w-3 h-3" />
                            FAIL
                          </>
                        )}
                      </button>
                    </div>

                    {/* Row 1: Grade & Division/Remarks */}
                    <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5">
                      <CustomInput
                        label="Grade"
                        placeholder="e.g. A+, Mumtaz, A, B..."
                        value={rule.grade}
                        onChange={(v: string) => handleRuleChange(idx, 'grade', v)}
                        required
                      />

                      <CustomSelect
                        label="Division"
                        onManage={() => setIsManageDivisionsOpen((prev) => !prev)}
                        manageLabel="Manage"
                        manageTitle="Manage Divisions"
                        value={rule.division || ''}
                        options={divisionOptions}
                        searchable={false}
                        placeholder="Select Division"
                        onChange={(val: any) => {
                          const str = typeof val === 'object' ? val?.value || val?.label || '' : val || '';
                          handleRuleChange(idx, 'division', str);
                        }}
                      />
                    </div>

                    {/* Row 2: Mark Boundaries (Always 2 columns on small screens) & Optional Grade Point */}
                    <div className={`grid ${includeGradePoint ? 'grid-cols-2 @[480px]:grid-cols-3' : 'grid-cols-2'} gap-2.5`}>
                      <CustomInput
                        type="number"
                        label="Min Mark"
                        suffix="%"
                        min={0}
                        max={100}
                        value={rule.minMark}
                        onChange={(v: string | number) => handleRuleChange(idx, 'minMark', v)}
                      />
                      <CustomInput
                        type="number"
                        label="Max Mark"
                        suffix="%"
                        min={0}
                        max={100}
                        value={rule.maxMark}
                        onChange={(v: string | number) => handleRuleChange(idx, 'maxMark', v)}
                      />
                      {includeGradePoint && (
                        <div className="col-span-2 @[480px]:col-span-1">
                          <CustomInput
                            type="number"
                            step={0.1}
                            min={0}
                            max={10}
                            label="Grade Point"
                            value={rule.gradePoint}
                            onChange={(v: string | number) => handleRuleChange(idx, 'gradePoint', v)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* External Bottom Icon-Only Action Bar on Active / Click */}
                  {isActive && (
                    <div className="flex items-center justify-between gap-2 px-1 pt-0.5 animate-fade-in">
                      <span className="text-[11px] font-medium theme-text-secondary opacity-75">
                        Tier {idx + 1} of {rules.length}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddTierAfter(idx);
                          }}
                          className="w-7 h-7 rounded-lg theme-bg-elevated theme-text-secondary hover:theme-accent hover:border-[var(--accent-main)]/40 border theme-border transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Add new tier below"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateTier(idx);
                          }}
                          className="w-7 h-7 rounded-lg theme-bg-elevated theme-text-secondary hover:theme-accent hover:border-[var(--accent-main)]/40 border theme-border transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                          title="Duplicate this tier"
                        >
                          <DuplicateIcon className="w-3.5 h-3.5" />
                        </button>

                        {rules.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRule(idx);
                            }}
                            className="w-7 h-7 rounded-lg theme-bg-elevated theme-text-secondary hover:theme-danger hover:border-[var(--color-danger)]/40 border theme-border transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                            title="Delete this tier"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Cancel on Left, Save/Create on Right */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t theme-border w-full">
          <CustomButton
            type="button"
            variant="sub"
            size="md"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </CustomButton>
          <CustomButton
            type="submit"
            variant="primary"
            size="md"
            icon={CheckIcon}
            loading={saving}
          >
            {system?.id ? 'Update Policy' : 'Create Policy'}
          </CustomButton>
        </div>
      </form>
    </DrawerContainer>
  );
}
