import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { useRightSidebar } from '@/context/RightSidebarContext';
import { useTenant } from '@/context/TenantContext';
import CustomButton from '@/components/ui/CustomButton';
import ActionMenu from '@/components/ui/ActionMenu';
import { ConfirmModal } from '@/components/ui/Modal';
import {
  CalendarIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  HistoryIcon,
} from '@/components/ui/Icons';
import { formatDisplayDate } from '@/utils/dateUtils';
import {
  lifecycleTimelineStore,
  LIFECYCLE_TIMELINE_UPDATE_EVENT,
} from './lifecycleTimelineStore';
import {
  LifecycleTimelineDrawerForm,
  LIFECYCLE_TIMELINE_ICONS,
} from './LifecycleTimelineDrawerForm';
import {
  EVENT_COLORS,
  resolveCanonicalEventColor,
} from '@/modules/academy/calendar-events/constants/eventColors';
import type {
  LifecycleTimelineRecord,
  TimelineEntityType,
} from './timelineTypes';

export interface LifecycleTimelineTabProps {
  entityType: TimelineEntityType;
  entityId: string | number;
  entityName: string;
  entitySubtitle?: string;
  initialRecord?: LifecycleTimelineRecord;
  className?: string;
}

function resolveIconComponent(iconKey?: string): React.ComponentType<{ className?: string }> {
  if (!iconKey) return CalendarIcon;
  const found = LIFECYCLE_TIMELINE_ICONS.find((item) => item.key === iconKey);
  return found ? found.icon : CalendarIcon;
}

export const LifecycleTimelineTab: React.FC<LifecycleTimelineTabProps> = ({
  entityType,
  entityId,
  entityName,
  entitySubtitle,
  initialRecord,
  className = '',
}) => {
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();
  const { currentTenant } = useTenant();

  const [records, setRecords] = useState<LifecycleTimelineRecord[]>(() =>
    lifecycleTimelineStore.getTimeline(currentTenant?.id, entityType, entityId, initialRecord)
  );
  const [deletingRecord, setDeletingRecord] = useState<LifecycleTimelineRecord | null>(null);

  const refreshTimeline = useCallback(() => {
    if (!entityId) return;
    const items = lifecycleTimelineStore.getTimeline(
      currentTenant?.id,
      entityType,
      entityId,
      initialRecord
    );
    setRecords(items);
  }, [currentTenant?.id, entityType, entityId, initialRecord]);

  useEffect(() => {
    refreshTimeline();

    const handleUpdate = (e: any) => {
      if (
        !e.detail ||
        (e.detail.entityType === entityType && String(e.detail.entityId) === String(entityId))
      ) {
        refreshTimeline();
      }
    };

    window.addEventListener(LIFECYCLE_TIMELINE_UPDATE_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(LIFECYCLE_TIMELINE_UPDATE_EVENT, handleUpdate);
    };
  }, [refreshTimeline, entityType, entityId]);

  // Open Add Milestone Drawer with URL sync (?drawer=add_milestone)
  const handleOpenAddDrawer = () => {
    openRightSidebar({
      drawerKey: 'add_milestone',
      syncUrl: true,
      title: 'Add Lifecycle Milestone',
      subtitle: `Log a lifecycle event, promotion, or credential for ${entityName}`,
      width: 'md',
      content: (
        <LifecycleTimelineDrawerForm
          key={`add_timeline_${entityType}_${entityId}_${Date.now()}`}
          entityType={entityType}
          onSave={(data) => {
            lifecycleTimelineStore.addEvent(currentTenant?.id, entityType, entityId, data);
            showToast('Milestone logged successfully!', 'success');
            refreshTimeline();
            closeRightSidebar();
          }}
          onClose={() => closeRightSidebar()}
        />
      ),
    });
  };

  // Open Edit Milestone Drawer with URL sync (?drawer=edit_milestone)
  const handleOpenEditDrawer = (item: LifecycleTimelineRecord) => {
    openRightSidebar({
      drawerKey: 'edit_milestone',
      syncUrl: true,
      title: 'Edit Lifecycle Milestone',
      subtitle: `Modify milestone details, date, or badge for ${entityName}`,
      width: 'md',
      content: (
        <LifecycleTimelineDrawerForm
          key={`edit_timeline_${item.id}`}
          entityType={entityType}
          initialData={item}
          onSave={(data) => {
            lifecycleTimelineStore.updateEvent(currentTenant?.id, entityType, entityId, item.id, data);
            showToast('Milestone updated successfully!', 'success');
            refreshTimeline();
            closeRightSidebar();
          }}
          onClose={() => closeRightSidebar()}
        />
      ),
    });
  };

  const isStudent = entityType === 'student';
  const headerTitle = isStudent ? 'Student Lifecycle & Academic History' : 'Lifecycle & Service Milestones';
  const headerDescription = isStudent
    ? 'Chronological official record of admissions, promotions, academic transfers, and credentials.'
    : 'Chronological official service record, promotions, duty appointments, and institutional transitions.';

  return (
    <div className={`@container space-y-6 animate-fade-in ${className}`}>
      {/* ─── Top Action & Header Card (Rule 14 Borderless Soft Surface) ─── */}
      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[520px]:p-6 shadow-xs flex flex-col @[520px]:flex-row items-start @[520px]:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold theme-text-primary tracking-tight">
            {headerTitle}
          </h3>
          <p className="text-xs theme-text-secondary mt-0.5">
            {headerDescription}
          </p>
        </div>

        <CustomButton
          type="button"
          variant="primary"
          size="sm"
          icon={PlusIcon}
          onClick={handleOpenAddDrawer}
          className="shrink-0"
        >
          Add Milestone
        </CustomButton>
      </div>

      {/* ─── Main Timeline Stream Card ─── */}
      <div className="rounded-3xl theme-bg-surface border-0 p-5 @[520px]:p-8 shadow-xs">
        {records.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center mx-auto">
              <HistoryIcon className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold theme-text-primary">No Milestones Logged</h4>
            <p className="text-xs theme-text-secondary">
              No lifecycle milestones or official credentials have been recorded for this profile yet.
            </p>
            <div className="pt-2">
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                icon={PlusIcon}
                onClick={handleOpenAddDrawer}
              >
                Add First Milestone
              </CustomButton>
            </div>
          </div>
        ) : (
          <div className="pl-1 @[520px]:pl-2">
            {records.map((item, index) => {
              const isLast = index === records.length - 1;
              const dateStr = formatDisplayDate(item.date);
              const ItemIcon = resolveIconComponent(item.iconKey);
              const badgeLabel = item.badge || item.subtitle || (item as any).action;
              const canonicalColor = item.color ? resolveCanonicalEventColor(item.color) : null;
              const colorDef = canonicalColor ? EVENT_COLORS.find((c) => c.id === canonicalColor) : null;

              return (
                <div
                  key={`timeline_${item.id}`}
                  className="relative flex items-start gap-3.5 @[520px]:gap-5 group"
                >
                  {/* Left Spine: Circular Dynamic Icon Node + Connecting Line */}
                  <div className="flex flex-col items-center shrink-0 self-stretch">
                    <div
                      className="w-7 h-7 @[520px]:w-8 @[520px]:h-8 rounded-full flex items-center justify-center shadow-xs shrink-0 z-10 transition-transform duration-150 group-hover:scale-105"
                      style={{
                        backgroundColor: colorDef ? colorDef.hex : 'var(--accent-main)',
                        color: colorDef ? colorDef.style.solidText : 'var(--accent-text)',
                      }}
                    >
                      <ItemIcon className="w-3.5 h-3.5 text-white" />
                    </div>

                    {!isLast && (
                      <div
                        className="w-[2px] flex-1 my-1 min-h-[44px]"
                        style={{
                          backgroundColor: colorDef ? `${colorDef.hex}40` : 'var(--accent-main)',
                          opacity: colorDef ? 1 : 0.8,
                        }}
                      />
                    )}
                  </div>

                  {/* Right Content Column */}
                  <div className={`flex-1 min-w-0 ${!isLast ? 'pb-6 @[520px]:pb-8' : 'pb-2'}`}>
                    {/* Top Row: Date, Badge & 3-Dot ActionMenu */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium theme-text-secondary">
                          {dateStr}
                        </span>

                        {badgeLabel && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{
                              backgroundColor: colorDef ? `${colorDef.hex}18` : 'var(--accent-main)/10',
                              color: colorDef ? colorDef.hex : 'var(--accent-main)',
                            }}
                          >
                            {badgeLabel}
                          </span>
                        )}
                      </div>

                      {/* 3-Dot ActionMenu */}
                      <div className="shrink-0">
                        <ActionMenu
                          align="right"
                          items={[
                            {
                              label: 'Edit Milestone',
                              icon: EditIcon,
                              onClick: () => handleOpenEditDrawer(item),
                            },
                            { divider: true },
                            {
                              label: 'Delete Milestone',
                              icon: TrashIcon,
                              variant: 'danger',
                              onClick: () => setDeletingRecord(item),
                            },
                          ]}
                        />
                      </div>
                    </div>

                    {/* Milestone Header (Title) */}
                    <h4 className="text-sm @[520px]:text-base font-semibold theme-text-primary mt-1 tracking-tight leading-snug">
                      {item.title}
                    </h4>

                    {/* Optional Subtitle */}
                    {item.subtitle && item.subtitle !== item.badge && (
                      <p
                        className="text-xs font-medium mt-0.5 opacity-90"
                        style={{
                          color: colorDef ? colorDef.hex : 'var(--accent-main)',
                        }}
                      >
                        {item.subtitle}
                      </p>
                    )}

                    {/* Milestone Narrative / Description */}
                    {item.description && (
                      <p className="text-xs @[520px]:text-sm theme-text-secondary mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Reusable Confirmation Modal for Delete ─── */}
      <ConfirmModal
        isOpen={Boolean(deletingRecord)}
        onClose={() => setDeletingRecord(null)}
        onConfirm={() => {
          if (deletingRecord) {
            lifecycleTimelineStore.deleteEvent(currentTenant?.id, entityType, entityId, deletingRecord.id);
            showToast('Milestone removed', 'success');
            refreshTimeline();
            setDeletingRecord(null);
          }
        }}
        title="Delete Lifecycle Milestone"
        subtitle={deletingRecord ? `Are you sure you want to remove "${deletingRecord.title}"?` : undefined}
        message="This milestone record will be permanently deleted from the official lifecycle history."
        confirmText="Delete Milestone"
        cancelText="Cancel"
        variant="danger"
        confirmIcon={TrashIcon}
      />
    </div>
  );
};

export default LifecycleTimelineTab;
