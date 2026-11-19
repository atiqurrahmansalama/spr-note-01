import React, { useMemo } from 'react';
import DepartmentSelect from '../selectors/DepartmentSelect';
import ClassSelect from '../selectors/ClassSelect';
import CustomSelect from '../ui/CustomSelect';

/**
 * Enterprise Reusable Academic Hierarchy & Scope Picker Component
 * 
 * Renders an intelligent cascading selector row:
 * Department ➔ Target Class ➔ Section Scope & Target Section (auto-hidden if class has no sections) ➔ Period Slot (optional)
 * 
 * Fully responsive with CSS Container Queries (`@container`, `@[480px]:grid-cols-2`).
 * Zero hardcoded logic, uses 100% theme design tokens.
 * 
 * @param {Object} props
 * @param {string|number} [props.departmentId='']
 * @param {Function} props.onDepartmentChange - `(departmentId, deptObj) => void`
 * @param {string|number} [props.classId='']
 * @param {Function} props.onClassChange - `(classId, classObj) => void`
 * @param {'ALL'|'SPECIFIC'} [props.sectionScope='ALL']
 * @param {Function} [props.onSectionScopeChange] - `(scope) => void`
 * @param {string|number} [props.sectionId='']
 * @param {Function} [props.onSectionChange] - `(sectionId, sectionObj) => void`
 * @param {string|number} [props.periodSlotId='']
 * @param {Function} [props.onPeriodSlotChange] - `(periodSlotId, periodObj) => void`
 * @param {Array} [props.departments]
 * @param {Array} [props.classes]
 * @param {Array} [props.sections]
 * @param {Array} [props.periodSlots]
 * @param {boolean} [props.showDepartment=true]
 * @param {boolean} [props.showClass=true]
 * @param {boolean} [props.showSection=true]
 * @param {boolean} [props.showPeriod=false]
 * @param {boolean} [props.requiredClass=true]
 * @param {boolean} [props.requiredSection=true]
 * @param {boolean} [props.requiredPeriod=false]
 * @param {boolean} [props.disabled=false]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.className='']
 */
export default function AcademicScopePicker({
  departmentId = '',
  onDepartmentChange,
  classId = '',
  onClassChange,
  sectionScope = 'ALL',
  onSectionScopeChange,
  sectionId = '',
  onSectionChange,
  periodSlotId = '',
  onPeriodSlotChange,
  departments = [],
  classes = [],
  sections = [],
  periodSlots = [],
  showDepartment = true,
  showClass = true,
  showSection = true,
  showPeriod = false,
  requiredClass = true,
  requiredSection = true,
  requiredPeriod = false,
  disabled = false,
  size = 'md',
  className = '',
}) {
  // 1. Filter Classes based on selected Department
  const filteredClasses = useMemo(() => {
    if (!departmentId || departmentId === 'ALL') return classes;
    return classes.filter((c) => {
      const clsDept = c.department !== undefined ? c.department : c.department_id;
      const deptId = clsDept ? (typeof clsDept === 'object' ? String(clsDept.id || '') : String(clsDept)) : '';
      return deptId === String(departmentId);
    });
  }, [classes, departmentId]);

  // 2. Available Sections for currently selected Class
  const availableSections = useMemo(() => {
    if (!classId || classId === 'ALL') return [];
    return sections.filter((sec) => {
      const secClass = sec.student_class !== undefined ? sec.student_class : (sec.student_class_id || sec.class_id || sec.classId || sec.class);
      const sClsId = secClass ? (typeof secClass === 'object' ? String(secClass.id || '') : String(secClass)) : '';
      return sClsId === String(classId);
    });
  }, [sections, classId]);

  const hasSectionsForClass = availableSections.length > 0;

  // Section Dropdown Options
  const sectionOptions = useMemo(() => {
    return availableSections.map((sec) => ({
      value: String(sec.id),
      label: sec.section_name || `Section ${sec.name || ''}`,
      description: sec.room_number ? `Room: ${sec.room_number}` : '',
      raw: sec,
    }));
  }, [availableSections]);

  const sectionScopeOptions = useMemo(() => [
    {
      value: 'ALL',
      label: 'All Sections (Class-Wide)',
      description: 'Apply across all sections of this class',
    },
    {
      value: 'SPECIFIC',
      label: 'Specific Section',
      description: 'Select a specific section for this scope',
    },
  ], []);

  // 3. Filter Period Slots based on Class & Section (or directly Class if no sections)
  const filteredPeriods = useMemo(() => {
    if (!showPeriod) return [];
    return periodSlots.filter((p) => {
      if (!classId || classId === 'ALL') return true;

      const rawSlotClass = p.student_class !== undefined ? p.student_class : (p.student_class_id || p.class_id || p.class);
      const slotClassId = rawSlotClass
        ? (typeof rawSlotClass === 'object' ? String(rawSlotClass.id || '') : String(rawSlotClass))
        : '';

      if (!slotClassId) return true;
      if (slotClassId !== String(classId)) return false;

      // If class has no sections, direct period connection applies
      if (!hasSectionsForClass) return true;

      const rawSlotSec = p.section !== undefined ? p.section : p.section_id;
      const slotSecId = rawSlotSec
        ? (typeof rawSlotSec === 'object' ? String(rawSlotSec.id || '') : String(rawSlotSec))
        : '';

      if (!slotSecId) return true;
      if (sectionScope === 'SPECIFIC' && sectionId) {
        return slotSecId === String(sectionId);
      }
      return false;
    });
  }, [periodSlots, classId, hasSectionsForClass, sectionScope, sectionId, showPeriod]);

  const periodOptions = useMemo(() => {
    if (!showPeriod) return [];
    return [
      { value: '', label: 'Unassigned / General Slot' },
      ...filteredPeriods.map((p) => {
        const timeStr = p.start_time && p.end_time
          ? ` (${p.start_time.slice(0, 5)} - ${p.end_time.slice(0, 5)})`
          : '';
        const rawSec = p.section !== undefined ? p.section : p.section_id;
        const secId = rawSec ? (typeof rawSec === 'object' ? String(rawSec.id || '') : String(rawSec)) : '';
        const secName = p.section_name || (secId ? sections.find((s) => String(s.id) === secId)?.section_name : null);
        const secBadge = secName ? ` • Section: ${secName}` : '';

        return {
          value: String(p.id),
          label: `${p.period_name || 'Period'}${timeStr}${secBadge}`,
          raw: p,
        };
      }),
    ];
  }, [filteredPeriods, sections, showPeriod]);

  // Handlers
  const handleDeptChange = (val, deptObj) => {
    if (onDepartmentChange) {
      onDepartmentChange(val, deptObj);
    }
  };

  const handleClassSelectChange = (val, classObj) => {
    if (onClassChange) {
      onClassChange(val, classObj);
    }
  };

  const handleScopeChange = (val) => {
    if (onSectionScopeChange) {
      onSectionScopeChange(val);
    }
    if (val === 'ALL') {
      if (onSectionChange) onSectionChange('', null);
    } else if (val === 'SPECIFIC' && availableSections.length > 0 && !sectionId) {
      if (onSectionChange) onSectionChange(String(availableSections[0].id), availableSections[0]);
    }
  };

  const handleSectionSelectChange = (val) => {
    const matchedSec = availableSections.find((s) => String(s.id) === String(val));
    if (onSectionChange) {
      onSectionChange(val, matchedSec || null);
    }
  };

  const handlePeriodChange = (val) => {
    const matchedPeriod = filteredPeriods.find((p) => String(p.id) === String(val));
    if (onPeriodSlotChange) {
      onPeriodSlotChange(val, matchedPeriod || null);
    }
  };

  return (
    <div className={`space-y-3.5 ${className}`}>
      {/* Row 1: Department & Class Selection */}
      {(showDepartment || showClass) && (
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4 items-start">
          {showDepartment && (
            <div>
              <DepartmentSelect
                label="Department"
                optional
                placeholder="All Departments (Institution-Wide)"
                value={departmentId}
                onChange={handleDeptChange}
                departments={departments}
                disabled={disabled}
                size={size}
              />
            </div>
          )}

          {showClass && (
            <div className={!showDepartment ? '@[480px]:col-span-2' : ''}>
              <ClassSelect
                label="Assign Class"
                value={classId}
                onChange={handleClassSelectChange}
                required={requiredClass}
                classes={filteredClasses}
                allLabel={departmentId ? 'Select Class in Department' : 'Select Class'}
                disabled={disabled}
                size={size}
              />
            </div>
          )}
        </div>
      )}

      {/* Row 2: Section Applicability & Target Section (Rendered ONLY if Class has Sections) */}
      {showSection && Boolean(classId) && hasSectionsForClass && (
        <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3.5 @[480px]:gap-4 items-start animate-fade-in">
          <div className={sectionScope !== 'SPECIFIC' ? '@[480px]:col-span-2' : ''}>
            <CustomSelect
              label="Section Applicability"
              options={sectionScopeOptions}
              value={sectionScope}
              onChange={handleScopeChange}
              disabled={disabled}
              size={size}
            />
          </div>

          {sectionScope === 'SPECIFIC' && (
            <div className="animate-fade-in">
              <CustomSelect
                label="Target Section"
                required={requiredSection}
                placeholder="Select Section"
                options={sectionOptions}
                value={sectionId}
                onChange={handleSectionSelectChange}
                disabled={disabled}
                size={size}
              />
            </div>
          )}
        </div>
      )}

      {/* Row 3: Period Slot Selection (Optional) */}
      {showPeriod && (
        <div className="animate-fade-in">
          <CustomSelect
            label="Routine Period Slot"
            required={requiredPeriod}
            options={periodOptions}
            value={periodSlotId}
            onChange={handlePeriodChange}
            disabled={disabled}
            size={size}
          />
        </div>
      )}
    </div>
  );
}
