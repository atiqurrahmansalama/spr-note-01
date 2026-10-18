import React, { useState } from 'react';
import SectionToggleCard from './SectionToggleCard';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { SectionCategory } from '../types';

export interface SectionCategoryGroupProps {
  category: SectionCategory;
  modifiedFlags: Record<string, boolean>;
  searchFilter: string;
  onToggle: (sectionKey: string, currentVal: boolean) => void;
}

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

  const filteredSections = category.sections.filter((sec) => {
    if (!searchFilter.trim()) return true;
    const search = searchFilter.toLowerCase();
    const matchSelf =
      sec.section_key.toLowerCase().includes(search) ||
      sec.title.toLowerCase().includes(search) ||
      (sec.description || '').toLowerCase().includes(search);

    if (matchSelf) return true;

    if (sec.children && sec.children.length > 0) {
      return sec.children.some((child) => {
        const matchChild =
          child.section_key.toLowerCase().includes(search) ||
          child.title.toLowerCase().includes(search) ||
          (child.description || '').toLowerCase().includes(search);
        if (matchChild) return true;

        if (child.children && child.children.length > 0) {
          return child.children.some(
            (grandchild) =>
              grandchild.section_key.toLowerCase().includes(search) ||
              grandchild.title.toLowerCase().includes(search) ||
              (grandchild.description || '').toLowerCase().includes(search)
          );
        }
        return false;
      });
    }
    return false;
  });

  if (filteredSections.length === 0) return null;

  return (
    <div className="space-y-2 sm:space-y-2.5">
      {/* Category Header Row */}
      <div className="border-b theme-border pb-1 px-1">
        <h3 className="text-xs font-bold uppercase tracking-wider theme-text-secondary flex items-center gap-2">
          <span>{category.title}</span>
        </h3>
      </div>

      {/* Sections List (Tier 1: Parent Module) */}
      <div className="space-y-2 sm:space-y-2.5">
        {filteredSections.map((sec) => {
          const hasLocalMod = modifiedFlags[sec.section_key] !== undefined;
          const isEnabled = hasLocalMod ? modifiedFlags[sec.section_key] : sec.effective_enabled;
          const isParent = Boolean(sec.is_parent);
          const hasChildren = Boolean(isParent && sec.children && sec.children.length > 0);
          const childrenCount = sec.children ? sec.children.length : 0;

          // Auto-expand Tier 1 if active search matches any child or grandchild
          const childMatchesSearch = Boolean(
            searchFilter.trim() &&
              sec.children?.some(
                (c) =>
                  c.section_key.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                  (c.description || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
                  c.children?.some(
                    (gc) =>
                      gc.section_key.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      gc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      (gc.description || '').toLowerCase().includes(searchFilter.toLowerCase())
                  )
              )
          );

          // By default, children are collapsed unless explicitly toggled or matching search
          const isExpanded = childMatchesSearch || Boolean(expandedMap[sec.section_key]);

          return (
            <div key={sec.id} className="space-y-2">
              {/* Tier 1: Main Parent Section Card */}
              <SectionToggleCard
                section={sec}
                isEnabled={isEnabled}
                hasLocalMod={hasLocalMod}
                isParent={isParent}
                hasChildren={hasChildren}
                childrenCount={childrenCount}
                isExpanded={isExpanded}
                onToggleExpand={() => handleToggleExpand(sec.section_key)}
                onToggle={onToggle}
              />

              {/* Tier 2: Collapsible Subordinate Modules */}
              {hasChildren && isExpanded && (
                <div className="pl-3 sm:pl-4.5 border-l-2 border-[var(--accent-main)]/20 space-y-2 mt-1.5 ml-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  {sec.children!.map((child) => {
                    const childHasLocalMod = modifiedFlags[child.section_key] !== undefined;
                    const childEnabled = childHasLocalMod
                      ? modifiedFlags[child.section_key]
                      : child.effective_enabled;
                    const childHasChildren = Boolean(
                      child.is_parent && child.children && child.children.length > 0
                    );
                    const childGrandchildrenCount = child.children ? child.children.length : 0;

                    // Auto-expand Tier 2 if search matches any grandchild tab
                    const grandchildMatchesSearch = Boolean(
                      searchFilter.trim() &&
                        child.children?.some(
                          (gc) =>
                            gc.section_key.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            gc.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            (gc.description || '').toLowerCase().includes(searchFilter.toLowerCase())
                        )
                    );

                    const isChildExpanded =
                      grandchildMatchesSearch || Boolean(expandedMap[child.section_key]);

                    return (
                      <div key={child.id} className="space-y-1.5">
                        {/* Tier 2: Sub-module Card */}
                        <SectionToggleCard
                          section={child}
                          isEnabled={childEnabled}
                          hasLocalMod={childHasLocalMod}
                          isChild={true}
                          parentActive={isEnabled}
                          hasChildren={childHasChildren}
                          childrenCount={childGrandchildrenCount}
                          isExpanded={isChildExpanded}
                          onToggleExpand={() => handleToggleExpand(child.section_key)}
                          onToggle={onToggle}
                        />

                        {/* Tier 3: Collapsible Child Tabs */}
                        {childHasChildren && isChildExpanded && (
                          <div className="pl-3 sm:pl-4 border-l-2 border-[var(--accent-main)]/15 space-y-1.5 mt-1 ml-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            {child.children!.map((grandchild) => {
                              const gcHasLocalMod = modifiedFlags[grandchild.section_key] !== undefined;
                              const gcEnabled = gcHasLocalMod
                                ? modifiedFlags[grandchild.section_key]
                                : grandchild.effective_enabled;

                              return (
                                <SectionToggleCard
                                  key={grandchild.id}
                                  section={grandchild}
                                  isEnabled={gcEnabled}
                                  hasLocalMod={gcHasLocalMod}
                                  isChild={true}
                                  parentActive={isEnabled && childEnabled}
                                  onToggle={onToggle}
                                />
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SectionCategoryGroup;
