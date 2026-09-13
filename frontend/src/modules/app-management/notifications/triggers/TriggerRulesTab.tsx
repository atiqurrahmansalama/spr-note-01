import React, { useState, useEffect } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import { SparklesIcon, CheckCircle2Icon } from '@/components/ui/Icons';
import TriggerMatrixTable from './TriggerMatrixTable';
import { getTriggerRulesMatrix, batchUpdateTriggerRules, getTemplates, seedDefaultTemplates } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import type { NotificationTriggerRule, NotificationTemplate } from '@/types/notifications';

export default function TriggerRulesTab() {
  const { showToast } = useToast();
  const [matrix, setMatrix] = useState<NotificationTriggerRule[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matrixData, tplData] = await Promise.all([
        getTriggerRulesMatrix(),
        getTemplates(),
      ]);
      setMatrix(matrixData);
      setTemplates(tplData);
    } catch {
      showToast('Failed to load trigger rules matrix', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await batchUpdateTriggerRules(matrix);
      showToast('Trigger rules matrix updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save trigger rules', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDefaultTemplates();
      showToast(res.message, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to seed templates', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Banner Guide */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 theme-accent" />
            <h3 className="text-sm sm:text-base font-bold theme-text-primary">
              Automated Event Trigger Rules
            </h3>
          </div>
          <p className="text-xs theme-text-secondary leading-relaxed max-w-2xl">
            Configure exactly which communication channels fire automatically when campus events occur (e.g. Student Absence, Gate Bunk Alert, New Admission).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CustomButton
            type="button"
            variant="sub"
            size="sm"
            onClick={handleSeedDefaults}
            loading={isSeeding}
          >
            Reset Default Templates
          </CustomButton>
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={CheckCircle2Icon}
            onClick={handleSave}
            loading={saving}
          >
            Save Trigger Matrix
          </CustomButton>
        </div>
      </div>

      {/* Trigger Matrix Table */}
      {loading ? (
        <div className="py-16 text-center text-xs theme-text-secondary">
          Loading trigger matrix...
        </div>
      ) : (
        <TriggerMatrixTable
          matrix={matrix}
          templates={templates}
          onChangeMatrix={setMatrix}
        />
      )}
    </div>
  );
}
