import React, { useState } from 'react';
import CustomCheckbox from '../ui/CustomCheckbox';
import CustomButton from '../ui/CustomButton';
import { ChevronIcon } from '../ui/Icons';

/**
 * PrintCollapsibleOption
 * Reusable expandable checkbox option wrapper for Print Studio drawer settings.
 * Streamlined, borderless, background-free with standard CustomButton toggle and left indentation.
 */
export default function PrintCollapsibleOption({
  checked = true,
  onChange,
  label = '',
  isExpanded: controlledExpanded,
  defaultExpanded = false,
  onToggleExpand,
  children,
  expandTitle = 'Customize options',
  collapseTitle = 'Hide options',
  className = '',
  contentClassName = '',
}) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    if (isControlled) {
      onToggleExpand?.(!isExpanded);
    } else {
      setInternalExpanded((prev) => !prev);
      onToggleExpand?.(!internalExpanded);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Header Option Row (Aligned with standard checkboxes, zero extra line-height) */}
      <div className="flex items-center justify-between gap-2 select-none">
        <CustomCheckbox
          checked={checked}
          onChange={onChange}
          label={label}
          size="sm"
          className="flex-1"
        />

        {checked && (
          <CustomButton
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleToggle}
            title={isExpanded ? collapseTitle : expandTitle}
            aria-label={isExpanded ? collapseTitle : expandTitle}
            className="h-5 w-5 p-0.5 rounded-md shrink-0 -my-0.5"
          >
            <ChevronIcon
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-180 theme-accent' : ''
              }`}
            />
          </CustomButton>
        )}
      </div>

      {/* Expandable Sub-options List (Clean, borderless, background-free with left indentation) */}
      {checked && isExpanded && (
        <div className={`space-y-2.5 pt-1 pl-3.5 pr-0.5 animate-fade-in ${contentClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
}
