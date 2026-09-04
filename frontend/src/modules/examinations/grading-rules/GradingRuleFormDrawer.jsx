import React, { useState, useEffect, useMemo } from 'react';
import CustomButton from '../../../components/ui/CustomButton';
import CustomInput from '../../../components/ui/CustomInput';
import CustomCheckbox from '../../../components/ui/CustomCheckbox';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../components/layout';
import {
  SettingsIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  SparklesIcon,
  HistoryIcon,
} from '../../../components/ui/Icons';
import { useToast } from '../../../context/ToastContext';
import { examStore, DEFAULT_GRADING_SYSTEMS } from '../../../utils/stores/examStore';
import { readJSON, writeJSON } from '../../../utils/stores/coreStore';

export default function GradingRuleFormDrawer({
  system = null,
  tenantId = 'default',
  onSaveSuccess,
  onCancel,
}) {
  const { showToast } = useToast();

  const draftKey = `spr_grading_rule_draft_${tenantId}_${system?.id || 'new'}`;
  const savedDraft = useMemo(() => {
    return readJSON(draftKey, null);
  }, [draftKey]);

  const [isDraftRestored, setIsDraftRestored] = useState(() => Boolean(savedDraft));

  const [name, setName] = useState(savedDraft?.name ?? system?.name ?? '');
  const [code, setCode] = useState(savedDraft?.code ?? system?.code ?? `SCALE_${Date.now().toString(36).toUpperCase()}`);
  const [description, setDescription] = useState(savedDraft?.description ?? system?.description ?? '');
  const [rules, setRules] = useState(() => {
    if (Array.isArray(savedDraft?.rules) && savedDraft.rules.length > 0) {
      return savedDraft.rules;
    }
    if (system?.rules && system.rules.length > 0) {
      return system.rules;
    }
    return [
      { grade: 'A+', title: 'Outstanding', minMark: 80, maxMark: 100, gradePoint: 5.0, division: '1st Division', isPass: true, color: 'emerald' },
      { grade: 'A', title: 'Excellent', minMark: 70, maxMark: 79, gradePoint: 4.0, division: '1st Division', isPass: true, color: 'teal' },
      { grade: 'B', title: 'Good', minMark: 50, maxMark: 69, gradePoint: 3.0, division: '2nd Division', isPass: true, color: 'blue' },
      { grade: 'C', title: 'Pass', minMark: 33, maxMark: 49, gradePoint: 2.0, division: '3rd Division', isPass: true, color: 'amber' },
      { grade: 'F', title: 'Fail', minMark: 0, maxMark: 32, gradePoint: 0.0, division: 'Failed', isPass: false, color: 'rose' },
    ];
  });
  const [saving, setSaving] = useState(false);

  // Auto-save form draft with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasContent = Boolean(name.trim() || description.trim() || rules.length > 5);
      if (hasContent) {
        writeJSON(draftKey, {
          name,
          code,
          description,
          rules,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [draftKey, name, code, description, rules]);

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setIsDraftRestored(false);

    setName(system?.name || '');
    setCode(system?.code || `SCALE_${Date.now().toString(36).toUpperCase()}`);
    setDescription(system?.description || '');
    setRules(
      system?.rules && system.rules.length > 0
        ? system.rules
        : [
            { grade: 'A+', title: 'Outstanding', minMark: 80, maxMark: 100, gradePoint: 5.0, division: '1st Division', isPass: true, color: 'emerald' },
            { grade: 'A', title: 'Excellent', minMark: 70, maxMark: 79, gradePoint: 4.0, division: '1st Division', isPass: true, color: 'teal' },
            { grade: 'B', title: 'Good', minMark: 50, maxMark: 69, gradePoint: 3.0, division: '2nd Division', isPass: true, color: 'blue' },
            { grade: 'C', title: 'Pass', minMark: 33, maxMark: 49, gradePoint: 2.0, division: '3rd Division', isPass: true, color: 'amber' },
            { grade: 'F', title: 'Fail', minMark: 0, maxMark: 32, gradePoint: 0.0, division: 'Failed', isPass: false, color: 'rose' },
          ]
    );

    showToast('Draft discarded and form reset.', 'info');
  };

  const handleLoadPreset = (presetId) => {
    const preset = DEFAULT_GRADING_SYSTEMS.find((p) => p.id === presetId);
    if (preset) {
      setName(preset.name);
      setCode(preset.code);
      setDescription(preset.description);
      setRules([...preset.rules]);
      showToast(`Loaded ${preset.name} preset rules.`, 'info');
    }
  };

  const handleAddRule = () => {
    setRules([
      ...rules,
      {
        grade: 'New',
        title: 'Grade',
        minMark: 0,
        maxMark: 0,
        gradePoint: 0.0,
        division: 'Pass',
        isPass: true,
        color: 'blue',
      },
    ]);
  };

  const handleRuleChange = (index, field, value) => {
    const updated = rules.map((r, i) => {
      if (i === index) {
        return {
          ...r,
          [field]: field === 'minMark' || field === 'maxMark' || field === 'gradePoint' ? Number(value) : value,
        };
      }
      return r;
    });
    setRules(updated);
  };

  const handleDeleteRule = (index) => {
    if (rules.length <= 1) {
      showToast('At least one grade rule is required.', 'warning');
      return;
    }
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleSaveSystem = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Grading system title is required.', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name,
        code,
        description,
        rules,
      };

      if (system?.id) {
        examStore.updateGradingSystem(tenantId, system.id, payload);
        showToast('Grading scale policy updated successfully.', 'success');
      } else {
        examStore.addGradingSystem(tenantId, payload);
        showToast('New grading scale policy created.', 'success');
      }

      // Clean up saved draft upon successful save
      try {
        localStorage.removeItem(draftKey);
      } catch {}

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
        {/* Restored Draft Notice Banner */}
        {isDraftRestored && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border theme-border theme-bg-subtle text-xs animate-fade-in">
            <div className="flex items-center gap-2 theme-text-primary font-medium">
              <HistoryIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Unsaved draft restored from your previous session.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <CustomButton
                type="button"
                variant="sub"
                size="xs"
                onClick={handleDiscardDraft}
                icon={TrashIcon}
              >
                Discard Draft
              </CustomButton>
            </div>
          </div>
        )}
        {/* Template Presets Toolbar */}
        <div className="p-3.5 rounded-xl border theme-border theme-bg-sub/40 space-y-2">
          <span className="text-xs font-bold theme-text-primary block">
            Quick Template Presets:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <CustomButton
              type="button"
              size="xs"
              variant="sub"
              onClick={() => handleLoadPreset('dars_e_nizami_standard')}
            >
              Dars-e-Nizami (Mumtaz to Rasib)
            </CustomButton>
            <CustomButton
              type="button"
              size="xs"
              variant="sub"
              onClick={() => handleLoadPreset('general_academic_gpa5')}
            >
              General Academic 5.0 GPA
            </CustomButton>
            <CustomButton
              type="button"
              size="xs"
              variant="sub"
              onClick={() => handleLoadPreset('percentage_division_scale')}
            >
              Percentage & Division Scale
            </CustomButton>
          </div>
        </div>

        {/* Basic Information */}
        <DrawerSection title="Policy Information" icon={SettingsIcon}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
              <CustomInput
                label="Grading Policy Title"
                placeholder="e.g. Standard 5.0 Scale"
                value={name}
                onChange={setName}
                required
              />
              <CustomInput
                label="System Identifier Code"
                placeholder="e.g. BEFAQ_QAWMI_2026"
                value={code}
                onChange={setCode}
                required
              />
            </div>
            <CustomInput
              type="textarea"
              label="Policy Notes / Description"
              placeholder="e.g. Applicable for Sanaviah, Dawrah, and general academic classes..."
              value={description}
              onChange={setDescription}
              rows={2}
            />
          </div>
        </DrawerSection>

        {/* Grade Breakdown Rows */}
        <DrawerSection title="Grade Tiers & Mark Boundaries" icon={SparklesIcon}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs theme-text-secondary">
                Configure grade letters, percentage range, and minimum pass thresholds.
              </span>
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

            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border theme-border theme-bg-sub/30 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold theme-text-primary">
                      Tier #{idx + 1}: {rule.grade || 'Unnamed'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-md cursor-pointer"
                      title="Remove Tier"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 @[480px]:grid-cols-4 gap-2">
                    <CustomInput
                      label="Letter / Title"
                      placeholder="e.g. Mumtaz"
                      value={rule.grade}
                      onChange={(v) => handleRuleChange(idx, 'grade', v)}
                      required
                    />
                    <CustomInput
                      label="Meaning"
                      placeholder="e.g. Outstanding"
                      value={rule.title}
                      onChange={(v) => handleRuleChange(idx, 'title', v)}
                    />
                    <CustomInput
                      type="number"
                      label="Min Mark"
                      value={rule.minMark}
                      onChange={(v) => handleRuleChange(idx, 'minMark', v)}
                      required
                    />
                    <CustomInput
                      type="number"
                      label="Max Mark"
                      value={rule.maxMark}
                      onChange={(v) => handleRuleChange(idx, 'maxMark', v)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 @[480px]:grid-cols-3 gap-2 items-center">
                    <CustomInput
                      type="number"
                      step="0.1"
                      label="Grade Point (GPA)"
                      value={rule.gradePoint}
                      onChange={(v) => handleRuleChange(idx, 'gradePoint', v)}
                    />
                    <CustomInput
                      label="Division"
                      placeholder="e.g. 1st Division"
                      value={rule.division}
                      onChange={(v) => handleRuleChange(idx, 'division', v)}
                    />
                    <div className="pt-5">
                      <CustomCheckbox
                        label="Passing Grade"
                        checked={rule.isPass}
                        onChange={(e) => handleRuleChange(idx, 'isPass', e.target.checked)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DrawerSection>

        {/* Footer */}
        <DrawerFooter>
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
        </DrawerFooter>
      </form>
    </DrawerContainer>
  );
}
