import React, { useState, useMemo } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import CustomSelect from '@/components/ui/CustomSelect';
import ActionMenu from '@/components/ui/ActionMenu';
import {
  TemplateIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SparklesIcon,
  SearchIcon,
} from '@/components/ui/Icons';
import { seedDefaultTemplates } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import type { NotificationTemplate, EventType } from '@/types/notifications';

export interface TemplateStudioTabProps {
  templates: NotificationTemplate[];
  loading?: boolean;
  onOpenTemplateDrawer: (template?: NotificationTemplate | null) => void;
  onDeleteTemplate: (template: NotificationTemplate) => void;
  onRefreshData?: () => void;
}

const CATEGORY_FILTERS = [
  { value: 'ALL', label: 'All Event Categories' },
  { value: 'STUDENT_ABSENT', label: 'Student Absent Alert' },
  { value: 'STUDENT_LATE', label: 'Student Late Arrival' },
  { value: 'GATE_BUNK_ALERT', label: 'Gate Discrepancy' },
  { value: 'NEW_ADMISSION', label: 'Student Admission' },
  { value: 'DAILY_REPORT_SAVED', label: 'Daily Recitation Report' },
  { value: 'STAFF_LEAVE_ACTION', label: 'Staff Leave Desk' },
  { value: 'GENERAL_BROADCAST', label: 'General Broadcast' },
  { value: 'CUSTOM', label: 'Custom Templates' },
];

export default function TemplateStudioTab({
  templates,
  loading = false,
  onOpenTemplateDrawer,
  onDeleteTemplate,
  onRefreshData,
}: TemplateStudioTabProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const filteredTemplates = useMemo(() => {
    return (Array.isArray(templates) ? templates : []).filter((t) => {
      if (!t) return false;
      if (categoryFilter !== 'ALL' && t.event_type !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          (t.name || '').toLowerCase().includes(q) ||
          (t.subject || '').toLowerCase().includes(q) ||
          (t.body || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [templates, categoryFilter, search]);

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await seedDefaultTemplates();
      showToast(res.message || 'Default system templates seeded.', 'success');
      onRefreshData?.();
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
            <TemplateIcon className="w-5 h-5 theme-accent" />
            <h3 className="text-sm sm:text-base font-bold theme-text-primary">
              Message Template Studio
            </h3>
          </div>
          <p className="text-xs theme-text-secondary leading-relaxed max-w-2xl">
            Design and curate dynamic SMS and email message templates using merge tags like &#123;student_name&#125;, &#123;class_name&#125;, and &#123;date&#125;.
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
            Reset System Templates
          </CustomButton>

          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            icon={PlusIcon}
            onClick={() => onOpenTemplateDrawer(null)}
          >
            Create Template
          </CustomButton>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="w-full sm:flex-1 relative">
          <input
            type="text"
            placeholder="Search templates by name, keyword or body..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border theme-border theme-bg-surface theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)]"
          />
        </div>

        <div className="w-full sm:w-56 shrink-0">
          <CustomSelect
            options={CATEGORY_FILTERS}
            value={categoryFilter}
            onChange={(val: string) => setCategoryFilter(val)}
            size="md"
          />
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="py-16 text-center text-xs theme-text-secondary">
          Loading message templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl border border-dashed theme-border text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl theme-bg-sub border theme-border flex items-center justify-center mx-auto theme-accent">
            <TemplateIcon className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold theme-text-primary">No Message Templates Found</h4>
          <p className="text-xs theme-text-secondary max-w-md mx-auto">
            You can create custom message templates or seed system default templates for automatic event notifications.
          </p>
          <CustomButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSeedDefaults}
            loading={isSeeding}
          >
            Seed System Defaults
          </CustomButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => {
            const actionItems = [
              {
                label: 'Edit Template',
                icon: EditIcon,
                onClick: () => onOpenTemplateDrawer(tpl),
              },
              {
                label: 'Delete Template',
                icon: TrashIcon,
                isDanger: true,
                onClick: () => onDeleteTemplate(tpl),
              },
            ];

            return (
              <div
                key={tpl.id}
                className="p-4 rounded-2xl border theme-border theme-bg-surface hover:theme-bg-sub/20 transition-all shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2.5">
                  {/* Top Bar: Title & Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold theme-text-primary leading-tight">
                        {tpl.name}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary mt-0.5 block">
                        {tpl.event_type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {tpl.is_system_default && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider theme-bg-sub theme-text-secondary border theme-border">
                          System
                        </span>
                      )}
                      <ActionMenu items={actionItems} />
                    </div>
                  </div>

                  {/* Body Snippet */}
                  <div className="p-3 rounded-xl theme-bg-sub border theme-border text-xs font-mono theme-text-primary leading-relaxed line-clamp-4">
                    {tpl.body}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] theme-text-secondary">
                  <span>{tpl.body.length} Chars</span>
                  <button
                    type="button"
                    onClick={() => onOpenTemplateDrawer(tpl)}
                    className="font-bold theme-accent hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Edit →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
