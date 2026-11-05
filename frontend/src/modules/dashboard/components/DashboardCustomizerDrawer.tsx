import React from 'react';
import type { DashboardRole, DashboardLayoutItem } from '../types';
import { getWidgetsForRole, WIDGET_REGISTRY } from '../widgetRegistry';
import { 
  CheckCircleIcon, 
  CloseIcon, 
  Squares2X2Icon, 
  RefreshIcon,
  SparklesIcon,
  EyeIcon,
  EyeOffIcon
} from '../../../components/ui/Icons';
import CustomButton from '../../../components/ui/CustomButton';

export interface DashboardCustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: DashboardRole;
  currentLayout: DashboardLayoutItem[];
  onSaveLayout: (newLayout: DashboardLayoutItem[], saveAsRoleDefault?: boolean) => void;
  onResetLayout: () => void;
  isSuperAdmin: boolean;
}

export default function DashboardCustomizerDrawer({
  isOpen,
  onClose,
  role,
  currentLayout,
  onSaveLayout,
  onResetLayout,
  isSuperAdmin,
}: DashboardCustomizerDrawerProps) {
  const [draftLayout, setDraftLayout] = React.useState<DashboardLayoutItem[]>(currentLayout);
  const [saveAsDefault, setSaveAsDefault] = React.useState(false);

  React.useEffect(() => {
    setDraftLayout(currentLayout);
  }, [currentLayout]);

  if (!isOpen) return null;

  const eligibleWidgets = getWidgetsForRole(role);

  // Toggle widget visibility
  const handleToggleWidget = (widgetId: string) => {
    const existing = draftLayout.find((i) => i.widgetId === widgetId);
    if (existing) {
      setDraftLayout(
        draftLayout.map((i) =>
          i.widgetId === widgetId ? { ...i, isVisible: !i.isVisible } : i
        )
      );
    } else {
      const widgetDef = WIDGET_REGISTRY[widgetId];
      const newItem: DashboardLayoutItem = {
        widgetId,
        order: draftLayout.length + 1,
        colSpan: widgetDef ? widgetDef.defaultColSpan : 1,
        isVisible: true,
      };
      setDraftLayout([...draftLayout, newItem]);
    }
  };

  // Change width (colSpan)
  const handleChangeColSpan = (widgetId: string, span: 1 | 2 | 3) => {
    setDraftLayout(
      draftLayout.map((i) =>
        i.widgetId === widgetId ? { ...i, colSpan: span } : i
      )
    );
  };

  const handleApply = () => {
    onSaveLayout(draftLayout, saveAsDefault);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs animate-fade-in select-none">
      <div 
        className="w-full max-w-md h-full theme-bg-surface border-l theme-border shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-left text-left rtl:text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b theme-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl theme-bg-accent-soft text-[var(--accent-main)] border border-[var(--accent-main)]/20 flex items-center justify-center shrink-0">
              <Squares2X2Icon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold theme-text-primary leading-tight">
                Dashboard Customizer
              </h3>
              <p className="text-[11px] theme-text-secondary mt-0.5">
                Configure tools & widgets for {role.replace('_', ' ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated border theme-border theme-text-secondary hover:theme-text-primary transition-all cursor-pointer"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body: Eligible Widgets Catalog */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between text-xs pb-1 border-b theme-border">
            <span className="font-bold uppercase tracking-wider theme-text-secondary text-[10px]">
              Available Widgets Catalog ({eligibleWidgets.length})
            </span>
            <button
              type="button"
              onClick={() => {
                onResetLayout();
                onClose();
              }}
              className="text-[11px] font-semibold text-[var(--accent-main)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshIcon className="w-3 h-3" />
              <span>Reset to Default</span>
            </button>
          </div>

          <div className="space-y-3">
            {eligibleWidgets.map((widget) => {
              const layoutItem = draftLayout.find((i) => i.widgetId === widget.id);
              const isEnabled = layoutItem ? layoutItem.isVisible !== false : false;
              const currentSpan = layoutItem ? layoutItem.colSpan : widget.defaultColSpan;

              return (
                <div
                  key={widget.id}
                  className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                    isEnabled
                      ? 'theme-bg-sub/80 border-[var(--accent-main)]/30 ring-1 ring-[var(--accent-main)]/10 shadow-xs'
                      : 'theme-bg-sub/30 theme-border opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-bold theme-text-primary leading-snug">
                        {widget.title}
                      </h4>
                      <p className="text-[11px] theme-text-secondary leading-relaxed line-clamp-2">
                        {widget.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleWidget(widget.id)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                        isEnabled
                          ? 'theme-bg-accent theme-accent-text border-transparent shadow-xs'
                          : 'theme-bg-sub border theme-border theme-text-secondary hover:theme-text-primary'
                      }`}
                    >
                      {isEnabled ? (
                        <>
                          <EyeIcon className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <EyeOffIcon className="w-3 h-3" />
                          <span>Hidden</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Width Selector when Enabled */}
                  {isEnabled && (
                    <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px]">
                      <span className="theme-text-secondary font-medium">Card Width:</span>
                      <div className="flex items-center gap-1">
                        {([1, 2, 3] as const).map((span) => (
                          <button
                            key={span}
                            type="button"
                            onClick={() => handleChangeColSpan(widget.id, span)}
                            className={`px-2 py-0.5 rounded-lg font-bold border transition-all cursor-pointer ${
                              currentSpan === span
                                ? 'theme-bg-accent-soft text-[var(--accent-main)] border-[var(--accent-main)]/40 shadow-xs'
                                : 'theme-bg-surface border theme-border theme-text-secondary hover:theme-text-primary'
                            }`}
                          >
                            {span === 3 ? 'Full' : span === 2 ? '2-Col' : '1-Col'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Super Admin / Admin Exclusive Template Checkbox */}
          {isSuperAdmin && (
            <div className="p-3.5 rounded-2xl theme-bg-accent-soft/30 border border-[var(--accent-main)]/20 space-y-1.5 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold theme-text-primary">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                  className="rounded theme-accent"
                />
                <span>Save as Default Template for all {role} users</span>
              </label>
              <p className="text-[10px] theme-text-secondary pl-5">
                This will automatically apply this layout as the institutional starting view for every user with this role.
              </p>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-5 border-t theme-border theme-bg-sub/30 flex items-center justify-between gap-3 shrink-0">
          <CustomButton
            type="button"
            variant="sub"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </CustomButton>

          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={CheckCircleIcon}
            onClick={handleApply}
          >
            Apply Layout
          </CustomButton>
        </div>
      </div>
    </div>
  );
}
