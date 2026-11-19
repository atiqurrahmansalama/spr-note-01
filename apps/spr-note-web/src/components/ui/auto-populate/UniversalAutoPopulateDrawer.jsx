/**
 * UniversalAutoPopulateDrawer.jsx
 * Enterprise Unified Right Sidebar Drawer Form for the Auto-Populate Engine Framework.
 * Dynamically renders rules, strategies, live simulation diffs, and commits for any domain generator.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - padding="none" on DrawerContainer
 * - Zero Boxed Cards (streamlined border-b section headers)
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Zero hardcoded colors, 100% theme tokens
 * - Zero emojis in UI
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DrawerContainer, DrawerBanner, DrawerFooter } from '../../layout';
import CustomSelect from '../CustomSelect';
import { TeacherSelect } from '../../selectors';
import {
  SparklesIcon,
  LayersIcon,
  UserCheckIcon,
  BookOpenIcon,
  EyeIcon,
} from '../Icons';
import useAutoPopulate from '../../../hooks/useAutoPopulate';
import AutoPopulatePreviewSummary from './AutoPopulatePreviewSummary';

export default function UniversalAutoPopulateDrawer({
  domainKey,
  context = {},
  onSuccess,
  onCancel,
}) {
  const {
    generator,
    schema,
    isSimulating,
    isExecuting,
    simulationResult,
    errors,
    warnings,
    runSimulation,
    execute,
  } = useAutoPopulate(domainKey, context);

  // Form State initialized from schema defaults
  const [formData, setFormData] = useState(() => {
    return {
      invigilatorStrategy: 'BALANCED_ROTATION',
      invigilatorTeacherId: '',
      invigilatorTeacherName: '',
      examinerStrategy: 'SUBJECT_TEACHER',
      examinerTeacherId: '',
      examinerTeacherName: '',
      overwriteMode: 'REPLACE',
      ...(schema?.defaultOptions || {}),
    };
  });

  const [showPreview, setShowPreview] = useState(false);

  // Re-run simulation when strategy changes or when preview is active
  useEffect(() => {
    if (generator && showPreview) {
      runSimulation(formData);
    }
  }, [formData, showPreview, generator, runSimulation]);

  const handleFieldChange = (key, val) => {
    setFormData((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleTogglePreview = () => {
    if (!showPreview) {
      setShowPreview(true);
      runSimulation(formData);
    } else {
      setShowPreview(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    const res = await execute(formData);
    if (res.success && onSuccess) {
      onSuccess(res.data, res.summary);
    }
  };

  const isFormValid = errors.length === 0;

  return (
    <DrawerContainer padding="none">
      <form onSubmit={handleFormSubmit} className="@container space-y-6 pt-2 pb-6 text-left">
        {/* ── 1. Top Banner ── */}
        <DrawerBanner
          icon={SparklesIcon}
          title={schema?.title || generator?.title || 'Auto-Populate Data'}
          description={schema?.subtitle || generator?.description || 'Automated generation rules and scheduling engine'}
        />

        {/* ── 2. Strategy Rules Configuration Sections ── */}
        <div className="space-y-6 px-1">
          {/* Section: Invigilation Strategy (if present in schema) */}
          {schema?.strategies?.some((s) => s.key === 'invigilatorStrategy') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <UserCheckIcon className="w-4 h-4 theme-accent" />
                <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  Hall Invigilator Assignment Rules
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <CustomSelect
                  label="Invigilation Distribution Policy"
                  options={schema.strategies.find((s) => s.key === 'invigilatorStrategy')?.options || []}
                  value={formData.invigilatorStrategy}
                  onChange={(val) => handleFieldChange('invigilatorStrategy', val)}
                  required
                />

                {formData.invigilatorStrategy === 'SPECIFIC_TEACHER' && (
                  <div className="animate-fade-in">
                    <TeacherSelect
                      label="Designated Single Invigilator"
                      value={formData.invigilatorTeacherId}
                      teachers={context.teachers || []}
                      allowAll={false}
                      onlyTeachers={true}
                      searchable={true}
                      placeholder="Select designated invigilator..."
                      onChange={(tId, tObj) => {
                        handleFieldChange('invigilatorTeacherId', tId || '');
                        handleFieldChange('invigilatorTeacherName', tObj?.name || tObj?.name_en || tObj?.full_name || '');
                      }}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Examiner / Paper Setter (if present in schema) */}
          {schema?.strategies?.some((s) => s.key === 'examinerStrategy') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <BookOpenIcon className="w-4 h-4 theme-accent" />
                <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  Paper Setter & Examiner (Grader) Rules
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <CustomSelect
                  label="Examiner Assignment Policy"
                  options={schema.strategies.find((s) => s.key === 'examinerStrategy')?.options || []}
                  value={formData.examinerStrategy}
                  onChange={(val) => handleFieldChange('examinerStrategy', val)}
                  required
                />

                {formData.examinerStrategy === 'SPECIFIC_TEACHER' && (
                  <div className="animate-fade-in">
                    <TeacherSelect
                      label="Designated Chief Examiner"
                      value={formData.examinerTeacherId}
                      teachers={context.teachers || []}
                      allowAll={false}
                      onlyTeachers={true}
                      searchable={true}
                      placeholder="Select chief examiner..."
                      onChange={(tId, tObj) => {
                        handleFieldChange('examinerTeacherId', tId || '');
                        handleFieldChange('examinerTeacherName', tObj?.name || tObj?.name_en || tObj?.full_name || '');
                      }}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section: Overwrite & Conflict Policy */}
          {schema?.strategies?.some((s) => s.key === 'overwriteMode') && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b theme-border">
                <LayersIcon className="w-4 h-4 theme-accent" />
                <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                  Existing Data & Conflict Policy
                </span>
              </div>

              <CustomSelect
                label="Handling Strategy for Existing Entries"
                options={schema.strategies.find((s) => s.key === 'overwriteMode')?.options || []}
                value={formData.overwriteMode}
                onChange={(val) => handleFieldChange('overwriteMode', val)}
                required
              />
            </div>
          )}

          {/* ── 3. Live Simulation Preview & Diff ── */}
          <div className="pt-2">
            <div className="flex items-center justify-between gap-2 pb-2">
              <button
                type="button"
                onClick={handleTogglePreview}
                className="inline-flex items-center gap-1.5 text-xs font-semibold theme-accent hover:underline cursor-pointer select-none"
              >
                <EyeIcon className="w-3.5 h-3.5" />
                <span>{showPreview ? 'Hide Generation Simulation' : 'Preview Generation Simulation'}</span>
              </button>
            </div>

            {showPreview && (
              <AutoPopulatePreviewSummary
                simulation={simulationResult}
                isSimulating={isSimulating}
                errors={errors}
                warnings={warnings}
              />
            )}
          </div>
        </div>

        {/* ── 4. Drawer Footer ── */}
        <DrawerFooter
          onCancel={onCancel}
          onSave={handleFormSubmit}
          saveText={isExecuting ? 'Populating...' : 'Execute Auto-Populate'}
          saveDisabled={!isFormValid || isExecuting}
          cancelText="Cancel"
        />
      </form>
    </DrawerContainer>
  );
}
