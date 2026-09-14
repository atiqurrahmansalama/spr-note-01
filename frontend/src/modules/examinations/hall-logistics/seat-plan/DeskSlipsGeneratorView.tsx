import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CustomButton,
  CustomSelect,
  CustomInput,
  CustomCheckbox,
  Modal,
} from '../../../../components/ui';
import {
  PrinterIcon,
  SearchIcon,
  BuildingIcon,
  EyeIcon,
} from '../../../../components/ui/Icons';
import { DeskSlipItem } from '../types';
import DeskSlipCard from './DeskSlipCard';
import DeskSlipsPrintModal from './DeskSlipsPrintModal';

export interface DeskSlipsGeneratorViewProps {
  exams: any[];
  classes: any[];
  sections: any[];
  availableRooms: string[];
  selectedExamId: string;
  setSelectedExamId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  selectedRoomName: string;
  setSelectedRoomName: (room: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  deskSlipsList: DeskSlipItem[];
  selectedStudentIds: Set<string | number>;
  handleToggleSelectStudent: (id: string | number) => void;
  handleSelectAll: () => void;
  institutionDetails: {
    name: string;
    address: string;
    logo?: string;
    sessionYear: string;
  };
}

/**
 * Seat Plan & Desk Slips Planning Center
 */
export default function DeskSlipsGeneratorView({
  exams,
  classes,
  sections,
  availableRooms,
  selectedExamId,
  setSelectedExamId,
  selectedClassId,
  setSelectedClassId,
  selectedSectionId,
  setSelectedSectionId,
  selectedRoomName,
  setSelectedRoomName,
  searchQuery,
  setSearchQuery,
  deskSlipsList,
  selectedStudentIds,
  handleToggleSelectStudent,
  handleSelectAll,
  institutionDetails,
}: DeskSlipsGeneratorViewProps) {
  const [searchParams] = useSearchParams();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('print') === 'desk_slips';
    }
    return false;
  });
  const [previewSlip, setPreviewSlip] = useState<DeskSlipItem | null>(null);

  useEffect(() => {
    if (searchParams.get('print') === 'desk_slips') {
      setIsPrintModalOpen(true);
    }
  }, [searchParams]);

  const printableSlips = React.useMemo(() => {
    if (selectedStudentIds.size === 0) return deskSlipsList;
    return deskSlipsList.filter((s) => selectedStudentIds.has(s.studentId));
  }, [deskSlipsList, selectedStudentIds]);

  const examOptions = exams.map((e: any) => ({
    value: String(e.id),
    label: `${e.title || e.name || 'Exam'} (${e.academic_year || '2026'})`,
  }));

  const classOptions = [
    { value: 'ALL', label: 'All Classes' },
    ...classes.map((c: any) => ({
      value: String(c.id),
      label: c.name || c.class_name || `Class ${c.id}`,
    })),
  ];

  const sectionOptions = [
    { value: 'ALL', label: 'All Sections' },
    ...sections.map((s: any) => ({
      value: String(s.id),
      label: s.name || s.section_name || `Section ${s.id}`,
    })),
  ];

  const roomOptions = [
    { value: 'ALL', label: 'All Examination Halls & Rooms' },
    ...availableRooms.map((r) => ({
      value: r,
      label: r,
    })),
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Filter Toolbar */}
      <div className="p-4 theme-bg-surface border theme-border rounded-2xl shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CustomSelect
            label="Examination"
            value={selectedExamId}
            options={examOptions}
            onChange={(val: any) => setSelectedExamId(String(val))}
          />

          <CustomSelect
            label="Class Scope"
            value={selectedClassId}
            options={classOptions}
            onChange={(val: any) => setSelectedClassId(String(val))}
          />

          <CustomSelect
            label="Section"
            value={selectedSectionId}
            options={sectionOptions}
            onChange={(val: any) => setSelectedSectionId(String(val))}
          />

          <CustomSelect
            label="Hall / Room"
            value={selectedRoomName}
            options={roomOptions}
            onChange={(val: any) => setSelectedRoomName(String(val))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <CustomInput
            label="Search Student"
            placeholder="Name, Roll, Student ID..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            icon={SearchIcon}
          />
        </div>

        {/* Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t theme-border">
          <div className="flex items-center gap-3">
            <CustomButton
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              {selectedStudentIds.size === deskSlipsList.length && deskSlipsList.length > 0
                ? 'Deselect All'
                : 'Select All Desks'}
            </CustomButton>
            <span className="text-xs theme-text-secondary">
              Selected: <strong className="theme-text-primary">{selectedStudentIds.size}</strong> of {deskSlipsList.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <CustomButton
              variant="primary"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={deskSlipsList.length === 0}
              icon={PrinterIcon}
              className="shadow-xs"
            >
              <span>
                {selectedStudentIds.size > 0
                  ? `Print Selected Desk Slips (${selectedStudentIds.size})`
                  : `Print All Desk Slips (${deskSlipsList.length})`}
              </span>
            </CustomButton>
          </div>
        </div>
      </div>

      {/* 2. Desk Slips Grid */}
      {deskSlipsList.length === 0 ? (
        <div className="text-center py-16 px-4 theme-bg-surface border theme-border rounded-2xl">
          <BuildingIcon className="w-12 h-12 mx-auto theme-text-secondary opacity-40 mb-3" />
          <h3 className="text-base font-semibold theme-text-primary">No Desk Slips Available</h3>
          <p className="text-sm theme-text-secondary mt-1">
            Adjust your room, class, or section filters to generate seat plans.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {deskSlipsList.map((slip) => {
            const isSelected = selectedStudentIds.has(slip.studentId);

            return (
              <div
                key={slip.id}
                className={`relative group theme-bg-surface border rounded-2xl p-3.5 transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? 'border-[var(--accent-main)] ring-2 ring-[var(--accent-main)]/20 shadow-xs'
                    : 'theme-border'
                }`}
              >
                {/* Selection Bar */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b theme-border">
                  <div className="flex items-center gap-2">
                    <CustomCheckbox
                      checked={isSelected}
                      onChange={() => handleToggleSelectStudent(slip.studentId)}
                    />
                    <span className="text-xs font-semibold theme-text-secondary">
                      Select Slip
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewSlip(slip)}
                    className="text-xs font-medium theme-accent hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Desk Slip Canvas Preview */}
                <DeskSlipCard
                  slip={slip}
                  institutionName={institutionDetails.name}
                  showDottedBorder={true}
                  className="w-full shadow-2xs"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Desk Slips Print Modal */}
      {isPrintModalOpen && (
        <DeskSlipsPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          slips={printableSlips}
          institutionName={institutionDetails.name}
        />
      )}

      {/* 4. Single Slip Preview Modal (Standard Project Modal) */}
      <Modal
        isOpen={Boolean(previewSlip)}
        onClose={() => setPreviewSlip(null)}
        title={previewSlip ? `Desk Sticker Preview — Roll ${previewSlip.rollNumber}` : 'Desk Slip Preview'}
        size="md"
      >
        {previewSlip && (
          <div className="p-4 theme-bg-sub/60 rounded-xl flex justify-center">
            <DeskSlipCard
              slip={previewSlip}
              institutionName={institutionDetails.name}
              showDottedBorder={true}
              className="w-full shadow-md"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

