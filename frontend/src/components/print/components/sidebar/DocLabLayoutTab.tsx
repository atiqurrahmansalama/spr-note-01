import React from 'react';
import CustomSelect from '../../../ui/CustomSelect';
import CustomInput from '../../../ui/CustomInput';
import CustomCheckbox from '../../../ui/CustomCheckbox';
import {
  PRINT_ORIENTATION_OPTIONS,
  PRINT_PAPER_SIZE_OPTIONS,
  PRINT_MARGIN_OPTIONS,
  PRINT_DENSITY_OPTIONS,
  PRINT_COLOR_MODE_OPTIONS,
} from '../../../../stores/printStore';
import { PrintOptions } from '../../types';

interface DocLabLayoutTabProps {
  options: Partial<PrintOptions>;
  onOptionsChange: (newOptions: Partial<PrintOptions>) => void;
  isCustomDocxActive?: boolean;
}

/**
 * DocLabLayoutTab
 * Paper dimensions, margins, typography density, branding, and watermark settings.
 * Formatted with pure container queries (@container @[480px]:grid-cols-2).
 */
export const DocLabLayoutTab: React.FC<DocLabLayoutTabProps> = ({
  options = {},
  onOptionsChange,
  isCustomDocxActive = false,
}) => {
  const updateOption = (key: string, value: any) => {
    if (onOptionsChange) {
      onOptionsChange({
        ...options,
        [key]: value,
      });
    }
  };

  return (
    <div className="@container space-y-6 pt-1">
      {/* ─── 1. Paper & Dimensions Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Paper & Dimensions
          </span>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Paper Size
            </label>
            <CustomSelect
              value={options.pageSize || 'A4'}
              onChange={(val: any) => updateOption('pageSize', val)}
              options={PRINT_PAPER_SIZE_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Orientation
            </label>
            <CustomSelect
              value={options.orientation || 'PORTRAIT'}
              onChange={(val: any) => updateOption('orientation', val)}
              options={PRINT_ORIENTATION_OPTIONS}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Page Margins
            </label>
            <CustomSelect
              value={options.margin || 'NORMAL'}
              onChange={(val: any) => updateOption('margin', val)}
              options={PRINT_MARGIN_OPTIONS}
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium theme-text-secondary mb-1">
              Grid Density
            </label>
            <CustomSelect
              value={options.density || 'NORMAL'}
              onChange={(val: any) => updateOption('density', val)}
              options={PRINT_DENSITY_OPTIONS}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium theme-text-secondary mb-1">
            Print Color Palette
          </label>
          <CustomSelect
            value={options.colorMode || 'FULL_COLOR'}
            onChange={(val: any) => updateOption('colorMode', val)}
            options={PRINT_COLOR_MODE_OPTIONS}
          />
        </div>
      </div>

      {/* ─── 2. Institutional Branding & Title ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Header & Branding
          </span>
        </div>

        <div className="space-y-2">
          <CustomCheckbox
            checked={options.showHeader !== false}
            onChange={(checked: boolean) => updateOption('showHeader', checked)}
            label="Show Institutional Header & Logo"
          />

          <CustomCheckbox
            checked={options.showTitle !== false}
            onChange={(checked: boolean) => updateOption('showTitle', checked)}
            label="Show Document Title Banner"
          />

          <CustomCheckbox
            checked={Boolean(options.showTitleLine)}
            onChange={(checked: boolean) => updateOption('showTitleLine', checked)}
            label="Show Underline Below Title"
          />
        </div>
      </div>

      {/* ─── 3. Metadata Grid Box ─── */}
      {!isCustomDocxActive && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b theme-border">
            <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
              Document Metadata Grid
            </span>
          </div>

          <div className="space-y-2">
            <CustomCheckbox
              checked={options.showMeta !== false}
              onChange={(checked: boolean) => updateOption('showMeta', checked)}
              label="Display Metadata Info Grid (Class, Session, Date)"
            />

            <CustomCheckbox
              checked={options.showMetaBox !== false}
              onChange={(checked: boolean) => updateOption('showMetaBox', checked)}
              label="Show Border Box Around Metadata"
            />
          </div>
        </div>
      )}

      {/* ─── 4. Watermark & Security ─── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b theme-border">
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Security & Watermark
          </span>
        </div>

        <div className="space-y-2">
          <CustomCheckbox
            checked={Boolean(options.showWatermark)}
            onChange={(checked: boolean) => updateOption('showWatermark', checked)}
            label="Enable Diagonal Security Watermark"
          />

          {options.showWatermark && (
            <div className="pt-1">
              <label className="block text-[11px] font-medium theme-text-secondary mb-1">
                Watermark Text
              </label>
              <CustomInput
                value={options.watermarkText || 'CONFIDENTIAL'}
                onChange={(val: any) => updateOption('watermarkText', typeof val === 'string' ? val : val?.target?.value ?? '')}
                placeholder="e.g. OFFICIAL / CONFIDENTIAL"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
