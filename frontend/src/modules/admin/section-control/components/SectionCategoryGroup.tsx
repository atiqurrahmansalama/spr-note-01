import React, { useState } from 'react';
import SectionToggleCard from './SectionToggleCard';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { SectionCategory, SectionItem } from '../types';

const WIDGET_GROUP_FALLBACKS: Record<string, string> = {
  dashboard_widget_kpi_metrics: 'Executive & KPI Analytics',
  dashboard_widget_quick_actions: 'Executive & KPI Analytics',
  dashboard_widget_attendance_pulse: 'Class Attendance & Presence',
  dashboard_widget_recitation_trends: 'Daily Classroom & Hifz Progress',
  dashboard_widget_hifz_tracker: 'Daily Classroom & Hifz Progress',
  dashboard_widget_academic_progress: 'Daily Classroom & Hifz Progress',
  dashboard_widget_timetable_schedule: 'Routine & Period Timetable',
  dashboard_widget_working_hours: 'Calendar & Institutional Events',
  dashboard_widget_academic_events: 'Calendar & Institutional Events',
  dashboard_widget_agenda_schedule: 'Calendar & Institutional Events',
  dashboard_widget_admission_pipeline: 'Operations, Finance & Notices',
  dashboard_widget_finance_overview: 'Operations, Finance & Notices',
  dashboard_widget_residential_occupancy: 'Operations, Finance & Notices',
  dashboard_widget_notice_board: 'Operations, Finance & Notices',
  dashboard_widget_recent_activity: 'System Health & Audit Trail',
  dashboard_widget_system_gateways: 'System Health & Audit Trail',
};

function groupChildrenWithSubHeaders(children: SectionItem[]): Array<{ groupTitle: string; items: SectionItem[] }> {
  const groups: Array<{ groupTitle: string; items: SectionItem[] }> = [];
  const map = new Map<string, SectionItem[]>();

  for (const child of children) {
    const groupTitle =
      child.widget_group ||
      WIDGET_GROUP_FALLBACKS[child.section_key] ||
      'General';
    if (!map.has(groupTitle)) {
      const bucket: SectionItem[] = [];
      map.set(groupTitle, bucket);
      groups.push({ groupTitle, items: bucket });
    }
    map.get(groupTitle)!.push(child);
  }
  return groups;
}

export interface SectionCategoryGroupProps {
  category: SectionCategory;
  modifiedFlags: Record<string, boolean>;
  searchFilter: string;
  onToggle: (sectionKey: string, currentVal: boolean) => void;
}

/**
 * Recursively checks if a section or any of its nested descendants match the search query
 */
function matchesSearchRecursive(item: SectionItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const matchSelf =
    Boolean(item.section_key && item.section_key.toLowerCase().includes(q)) ||
    Boolean(item.title && item.title.toLowerCase().includes(q)) ||
    Boolean(item.description && item.description.toLowerCase().includes(q));

  if (matchSelf) return true;

  if (item.children && item.children.length > 0) {
    return item.children.some((child) => matchesSearchRecursive(child, q));
  }
  return false;
}

interface SectionTreeNodeProps {
  section: SectionItem;
  depth: number;
  parentActive: boolean;
  modifiedFlags: Record<string, boolean>;
  searchFilter: string;
  expandedMap: Record<string, boolean>;
  onToggleExpand: (sectionKey: string) => void;
  onToggle: (sectionKey: string, currentVal: boolean) => void;
}

/**
 * Recursive tree node component capable of rendering any tier depth (Tier 1 .. Tier N).
 * Supports automatic search expansion, cascading active inheritance, and enterprise indentation.
 */
const SectionTreeNode: React.FC<SectionTreeNodeProps> = ({
  section,
  depth,
  parentActive,
  modifiedFlags,
  searchFilter,
  expandedMap,
  onToggleExpand,
  onToggle,
}) => {
  const hasLocalMod = modifiedFlags[section.section_key] !== undefined;
  const isEnabled = hasLocalMod ? modifiedFlags[section.section_key] : section.effective_enabled;
  const isParent = Boolean(section.is_parent);
  const hasChildren = Boolean(isParent && section.children && section.children.length > 0);
  const childrenCount = section.children ? section.children.length : 0;

  // Auto-expand if active search matches any descendant
  const childMatchesSearch = Boolean(
    searchFilter.trim() &&
      section.children?.some((child) => matchesSearchRecursive(child, searchFilter))
  );

  // Expanded if search matches descendant or user clicked to expand
  const isExpanded = childMatchesSearch || Boolean(expandedMap[section.section_key]);
  const { t, formatNumber } = useSectionTranslation();
  const hasGroupedWidgets = Boolean(
    hasChildren &&
      (section.section_key === 'nav_dashboard' ||
        section.children?.some((c) => c.widget_group || c.section_key.startsWith('dashboard_widget_')))
  );

  const visibleChildren =
    searchFilter.trim() && section.children
      ? section.children.filter((c) => matchesSearchRecursive(c, searchFilter))
      : section.children || [];

  const borderClass =
    depth === 1
      ? 'border-[var(--accent-main)]/20'
      : depth === 2
      ? 'border-[var(--accent-main)]/15'
      : 'border-[var(--accent-main)]/10';

  const marginClass = depth === 0 ? 'space-y-2' : 'space-y-1.5';

  return (
    <div className={marginClass}>
      <SectionToggleCard
        section={section}
        isEnabled={isEnabled}
        hasLocalMod={hasLocalMod}
        isParent={isParent}
        isChild={depth > 0}
        parentActive={parentActive}
        hasChildren={hasChildren}
        childrenCount={childrenCount}
        isExpanded={isExpanded}
        onToggleExpand={() => onToggleExpand(section.section_key)}
        onToggle={onToggle}
      />

      {/* Render subordinate children recursively */}
      {hasChildren && isExpanded && (
        <div
          className={`pl-3 sm:pl-4 border-l-2 ${borderClass} space-y-2 mt-1.5 ml-3 animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {hasGroupedWidgets ? (
            <div className="space-y-3 pt-1">
              {/* Primary Sub-Header making Dashboard Widgets clearly distinct under Dashboard */}
              <div className="flex items-center justify-between gap-2 px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider theme-text-primary">
                  {t('badges.dashboardWidgetsSubheader', 'Dashboard Widgets')}
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full theme-bg-sub theme-text-secondary">
                  {t('badges.widgetsCount', '{{count}} widgets', {
                    count: formatNumber(visibleChildren.length),
                  })}
                </span>
              </div>

              {/* Modular Widget Group Sub-Headers */}
              {groupChildrenWithSubHeaders(visibleChildren).map((group) => (
                <div key={group.groupTitle} className="space-y-1.5">
                  <div className="px-1 pt-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider theme-text-secondary opacity-85 block">
                      {group.groupTitle}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.items.map((child) => (
                      <SectionTreeNode
                        key={child.id || child.section_key}
                        section={child}
                        depth={depth + 1}
                        parentActive={parentActive && isEnabled}
                        modifiedFlags={modifiedFlags}
                        searchFilter={searchFilter}
                        expandedMap={expandedMap}
                        onToggleExpand={onToggleExpand}
                        onToggle={onToggle}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            visibleChildren.map((child) => (
              <SectionTreeNode
                key={child.id || child.section_key}
                section={child}
                depth={depth + 1}
                parentActive={parentActive && isEnabled}
                modifiedFlags={modifiedFlags}
                searchFilter={searchFilter}
                expandedMap={expandedMap}
                onToggleExpand={onToggleExpand}
                onToggle={onToggle}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const SectionCategoryGroup: React.FC<SectionCategoryGroupProps> = ({
  category,
  modifiedFlags,
  searchFilter,
  onToggle,
}) => {
  const { t } = useSectionTranslation();

  // State map for tracking expanded parent sections. Default is collapsed (empty = false).
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (sectionKey: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const filteredSections = category.sections.filter((sec) =>
    matchesSearchRecursive(sec, searchFilter)
  );

  if (filteredSections.length === 0) return null;

  return (
    <div className="space-y-2 sm:space-y-2.5">
      {/* Category Header Row */}
      <div className="border-b theme-border pb-1 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
          <span>{category.title}</span>
        </h3>
      </div>

      {/* Sections List rendered via recursive tree nodes */}
      <div className="space-y-2 sm:space-y-2.5">
        {filteredSections.map((sec) => (
          <SectionTreeNode
            key={sec.id || sec.section_key}
            section={sec}
            depth={0}
            parentActive={true}
            modifiedFlags={modifiedFlags}
            searchFilter={searchFilter}
            expandedMap={expandedMap}
            onToggleExpand={handleToggleExpand}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  );
};

export default SectionCategoryGroup;
