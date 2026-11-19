import React from 'react';
import DataViewToolbar from '../../../../components/ui/DataViewToolbar';
import { DepartmentSelect, ClassSelect, SectionSelect } from '../../../../components/selectors';
import { AcademicClass, AcademicSection, AcademicDepartment } from '../types';

export interface ClassesSectionsToolbarProps {
  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;

  // View Mode Switcher
  viewMode: 'table' | 'grid' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;

  // Optional Filters
  departmentFilter?: {
    value: string;
    onChange: (deptId: string) => void;
    departments?: AcademicDepartment[];
  };
  classFilter?: {
    value: string;
    onChange: (classId: string) => void;
    classes?: AcademicClass[];
  };
  sectionFilter?: {
    value: string;
    onChange: (sectionId: string) => void;
    sections?: AcademicSection[];
    classId?: string | null;
  };

  // Result Counter
  totalCount: number;
  entityName: string;
}

/**
 * ClassesSectionsToolbar
 * Enterprise reusable and responsive filter & search toolbar for Classes, Sections, and Groups.
 * Built directly upon the canonical DataViewToolbar standard to guarantee 100% design token alignment,
 * zero text clipping, responsive widths, and smooth transitions across all viewport sizes.
 */
export default function ClassesSectionsToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search by name, code, teacher...',
  searchLabel,
  viewMode,
  onViewModeChange,
  departmentFilter,
  classFilter,
  sectionFilter,
  totalCount,
  entityName,
}: ClassesSectionsToolbarProps) {
  const hasClass = Boolean(classFilter);
  const hasSection = Boolean(sectionFilter);

  // Dynamic enterprise filter widths matching Campus Structure standard
  // Ensures zero text truncation on placeholders ("All Departments", "All Classes", "All Sections")
  // and balanced horizontal distribution across all screen sizes.
  const deptWidthClass = hasClass
    ? hasSection
      ? 'w-full sm:w-44 md:w-48 lg:w-52 min-w-[180px]'
      : 'w-full sm:w-52 md:w-60 lg:w-64 min-w-[210px]'
    : 'w-full sm:w-64 md:w-72 lg:w-80 min-w-[240px]';

  const classWidthClass = hasSection
    ? 'w-full sm:w-44 md:w-48 lg:w-52 min-w-[180px]'
    : 'w-full sm:w-52 md:w-60 lg:w-64 min-w-[210px]';

  const sectionWidthClass = 'w-full sm:w-44 md:w-48 lg:w-52 min-w-[180px]';

  const filterElement = (
    <div className="flex items-end gap-2 sm:gap-2.5 flex-nowrap">
      {/* 1. Optional Department Selector */}
      {departmentFilter && (
        <div className={`${deptWidthClass} shrink-0`}>
          <DepartmentSelect
            label="Department"
            placeholder="All Departments"
            departments={departmentFilter.departments}
            value={departmentFilter.value}
            onChange={(val: string) => departmentFilter.onChange(val)}
            allowAll={true}
            allLabel="All Departments"
            allValue="ALL"
            size="md"
          />
        </div>
      )}

      {/* 2. Optional Class Selector (for Sections and Groups) */}
      {classFilter && (
        <div className={`${classWidthClass} shrink-0`}>
          <ClassSelect
            label="Class"
            placeholder="All Classes"
            classes={classFilter.classes}
            value={classFilter.value}
            onChange={(val: string) => classFilter.onChange(val)}
            allowAll={true}
            allLabel="All Classes"
            allValue="ALL"
            size="md"
          />
        </div>
      )}

      {/* 3. Optional Section Selector (for Groups) */}
      {sectionFilter && (
        <div className={`${sectionWidthClass} shrink-0`}>
          <SectionSelect
            label="Section"
            placeholder="All Sections"
            sections={sectionFilter.sections}
            classId={sectionFilter.classId}
            value={sectionFilter.value}
            onChange={(val: string) => sectionFilter.onChange(val)}
            allowAll={true}
            allLabel="All Sections"
            allValue="ALL"
            size="md"
          />
        </div>
      )}
    </div>
  );

  const resolvedSearchLabel = searchLabel || `Search ${entityName || 'Records'}`;

  return (
    <DataViewToolbar
      searchLabel={resolvedSearchLabel}
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
      searchPlaceholder={searchPlaceholder}
      filterElement={filterElement}
      viewMode={viewMode === 'card' || viewMode === 'grid' ? 'grid' : 'table'}
      onToggleViewMode={(mode) => onViewModeChange(mode === 'grid' ? 'card' : 'table')}
      totalCount={totalCount}
      itemLabel={entityName.toLowerCase()}
    />
  );
}
