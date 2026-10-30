import React, { useState } from 'react';
import SectionToggleCard from './SectionToggleCard';
import { useSectionTranslation } from '../hooks/useSectionTranslation';
import { SectionCategory, SectionItem } from '../types';

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
          className={`pl-3 sm:pl-4 border-l-2 ${borderClass} space-y-1.5 mt-1 ml-3 animate-in fade-in slide-in-from-top-1 duration-200`}
        >
          {section.children!.map((child) => (
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
