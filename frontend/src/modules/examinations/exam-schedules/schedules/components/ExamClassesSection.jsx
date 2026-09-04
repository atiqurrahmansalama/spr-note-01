import React from 'react';
import CustomSelect from '../../../../../components/ui/CustomSelect';
import { DrawerSection } from '../../../../../components/layout';
import { AcademicCapIcon, BuildingLibraryIcon, CheckIcon } from '../../../../../components/ui/Icons';

/**
 * ExamClassesSection
 * Wizard Step 2: Target Department & Participating Classes Selection.
 * 
 * Follows SPR Note Enterprise Engineering Guidelines:
 * - 100% Theme Tokens & Zero Hardcoded Colors
 * - Container Queries (@container, @[480px]:grid-cols-2)
 * - Reusable DrawerSection components
 * - Highly aesthetic interactive class selection cards
 */
export default function ExamClassesSection({
  departmentOptions = [],
  departmentId = 'ALL',
  onDepartmentChange,
  visibleClasses = [],
  targetClassIds = [],
  onClassToggle,
  onSelectAllClasses,
}) {
  const visibleSelectedCount = visibleClasses.filter((c) =>
    targetClassIds.some((id) => String(id) === String(c.value))
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Sub-Section 1: Target Department & Faculty Scope ── */}
      <DrawerSection
        title="Target Faculty & Department Scope"
        icon={BuildingLibraryIcon}
        className="!pt-0"
      >
        <CustomSelect
          label="Target Academic Department / Faculty"
          options={departmentOptions}
          value={departmentId}
          onChange={onDepartmentChange}
        />
      </DrawerSection>

      {/* ── Sub-Section 2: Participating Classes Selection ── */}
      <DrawerSection
        title="Participating Classes"
        subtitle={`${visibleSelectedCount} / ${visibleClasses.length} Selected`}
        icon={AcademicCapIcon}
        headerRight={
          visibleClasses.length > 0 && (
            <button
              type="button"
              onClick={onSelectAllClasses}
              className="px-2.5 py-1 rounded-lg text-xs font-bold theme-bg-surface border theme-border hover:border-[var(--accent-main)]/60 theme-text-primary hover:theme-accent transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
            >
              {visibleSelectedCount === visibleClasses.length
                ? 'Deselect All'
                : 'Select All'}
            </button>
          )
        }
      >
        {/* Interactive Classes Multi-Select Card Grid */}
        {visibleClasses.length === 0 ? (
          <div className="p-6 text-center border border-dashed theme-border rounded-2xl theme-bg-sub/20 flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-xl theme-bg-sub flex items-center justify-center border theme-border">
              <AcademicCapIcon className="w-5 h-5 theme-text-secondary opacity-75" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold theme-text-primary">No Academy Classes Found</p>
              <p className="text-[11px] theme-text-secondary">
                Please configure classes in the Academy module first.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1 no-scrollbar p-1">
            {visibleClasses.map((c) => {
              const isSelected = targetClassIds.some((id) => String(id) === String(c.value));
              return (
                <div
                  key={c.value}
                  onClick={() => onClassToggle(c.value)}
                  className={`group p-3 rounded-xl border theme-border transition-all duration-150 cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs select-none active:scale-[0.98] ${
                    isSelected
                      ? 'theme-bg-surface'
                      : 'theme-bg-surface/60 hover:theme-bg-surface opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border theme-border transition-colors ${
                        isSelected
                          ? 'theme-bg-accent-soft theme-accent'
                          : 'theme-bg-sub theme-text-secondary'
                      }`}
                    >
                      <AcademicCapIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-xs font-bold truncate transition-colors ${
                      isSelected ? 'theme-text-primary' : 'theme-text-secondary group-hover:theme-text-primary'
                    }`}>
                      {c.label}
                    </span>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border text-[11px] shrink-0 transition-all ${
                      isSelected
                        ? 'theme-bg-accent text-white border-[var(--accent-main)] shadow-2xs'
                        : 'theme-border theme-bg-sub/60 group-hover:border-[var(--accent-main)]/40'
                    }`}
                  >
                    {isSelected && <CheckIcon className="w-3 h-3 text-white stroke-[2.5]" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DrawerSection>
    </div>
  );
}
