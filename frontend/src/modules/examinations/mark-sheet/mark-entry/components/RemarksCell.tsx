import React, { useState } from 'react';
import TemplateActionToolbar from '@/components/ui/TemplateActionToolbar';
import CustomInput from '@/components/ui/CustomInput';

export interface RemarksCellProps {
  stId: string;
  sIdx: number;
  remarksVal: string;
  isLocked: boolean;
  isNearBottom: boolean;
  handleRemarksChange: (stId: string, val: string) => void;
  handleKeyDown: (
    e: React.KeyboardEvent,
    sIdx: number,
    colIdxOrName: number | string,
    totalStudents: number,
    totalComponents: number
  ) => void;
  studentsCount: number;
  componentsCount: number;
}

export const RemarksCell = React.memo(function RemarksCell({
  stId,
  sIdx,
  remarksVal,
  isLocked,
  isNearBottom,
  handleRemarksChange,
  handleKeyDown,
  studentsCount,
  componentsCount,
}: RemarksCellProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const isExpanded = isFocused || isPopoverOpen;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      className="w-full min-w-[220px] py-1 flex flex-col justify-center transition-all duration-200"
    >
      <div
        className={`flex items-center justify-end overflow-hidden transition-all duration-200 ease-out ${
          isExpanded
            ? 'max-h-8 opacity-100 mb-1 pointer-events-auto'
            : 'max-h-0 opacity-0 mb-0 pointer-events-none'
        }`}
      >
        {!isLocked && (
          <TemplateActionToolbar
            value={remarksVal}
            onChange={(newVal: any) => handleRemarksChange(stId, newVal)}
            category="exam_mark_entry_remarks"
            namespace="exam_mark_entry_remarks"
            size="xs"
            dropdownPosition={isNearBottom ? 'top-right' : 'bottom-right'}
            onOpenChange={setIsPopoverOpen}
            {...({} as any)}
          />
        )}
      </div>

      <CustomInput
        id={`cell_${sIdx}_remarks`}
        name="teacherRemarks"
        type="text"
        size="sm"
        disabled={isLocked}
        value={remarksVal}
        onFocus={() => setIsFocused(true)}
        onChange={(val: any) =>
          handleRemarksChange(stId, typeof val === 'string' ? val : val?.target?.value ?? '')
        }
        onKeyDown={(e: any) =>
          handleKeyDown(e, sIdx, 'remarks', studentsCount, componentsCount)
        }
        placeholder="Optional feedback..."
        className="w-full"
        inputClassName="text-xs"
      />
    </div>
  );
});

export default RemarksCell;
