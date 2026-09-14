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
  AcademicCapIcon,
  EyeIcon,
} from '../../../../components/ui/Icons';
import { AdmitCardStudent } from '../types';
import AdmitCardCanvas from './AdmitCardCanvas';
import AdmitCardPrintModal from './AdmitCardPrintModal';

export interface AdmitCardGeneratorViewProps {
  exams: any[];
  classes: any[];
  sections: any[];
  selectedExamId: string;
  setSelectedExamId: (id: string) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  admitCardList: AdmitCardStudent[];
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
 * Admit Card Generator & Roster Control Center
 */
export default function AdmitCardGeneratorView({
  exams,
  classes,
  sections,
  selectedExamId,
  setSelectedExamId,
  selectedClassId,
  setSelectedClassId,
  selectedSectionId,
  setSelectedSectionId,
  searchQuery,
  setSearchQuery,
  admitCardList,
  selectedStudentIds,
  handleToggleSelectStudent,
  handleSelectAll,
  institutionDetails,
}: AdmitCardGeneratorViewProps) {
  const [searchParams] = useSearchParams();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('print') === 'admit_cards';
    }
    return false;
  });
  const [previewCard, setPreviewCard] = useState<AdmitCardStudent | null>(null);
  const [singleCardToPrint, setSingleCardToPrint] = useState<AdmitCardStudent | null>(null);

  useEffect(() => {
    if (searchParams.get('print') === 'admit_cards') {
      setIsPrintModalOpen(true);
    }
  }, [searchParams]);

  // Filtered print list (either single card override, selected subset, or all if none selected)
  const printableCards = React.useMemo(() => {
    if (singleCardToPrint) return [singleCardToPrint];
    if (selectedStudentIds.size === 0) return admitCardList;
    return admitCardList.filter((c) => selectedStudentIds.has(c.id));
  }, [admitCardList, selectedStudentIds, singleCardToPrint]);

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. Filter & Controls Toolbar */}
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

          <div className="relative">
            <CustomInput
              label="Search Student"
              placeholder="Name, Roll, Student ID..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              icon={SearchIcon}
            />
          </div>
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
              {selectedStudentIds.size === admitCardList.length && admitCardList.length > 0
                ? 'Deselect All'
                : 'Select All Candidates'}
            </CustomButton>
            <span className="text-xs theme-text-secondary">
              Selected: <strong className="theme-text-primary">{selectedStudentIds.size}</strong> of {admitCardList.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <CustomButton
              variant="primary"
              onClick={() => setIsPrintModalOpen(true)}
              disabled={admitCardList.length === 0}
              icon={PrinterIcon}
              className="shadow-xs"
            >
              <span>
                {selectedStudentIds.size > 0
                  ? `Bulk Print Selected (${selectedStudentIds.size})`
                  : `Bulk Print All (${admitCardList.length})`}
              </span>
            </CustomButton>
          </div>
        </div>
      </div>

      {/* 2. Admit Card Candidates Grid */}
      {admitCardList.length === 0 ? (
        <div className="text-center py-16 px-4 theme-bg-surface border theme-border rounded-2xl">
          <AcademicCapIcon className="w-12 h-12 mx-auto theme-text-secondary opacity-40 mb-3" />
          <h3 className="text-base font-semibold theme-text-primary">No Examinees Found</h3>
          <p className="text-sm theme-text-secondary mt-1">
            Try adjusting your class, section or search filters to find registered students.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {admitCardList.map((card) => {
            const isSelected = selectedStudentIds.has(card.id);

            return (
              <div
                key={card.id}
                className={`relative group theme-bg-surface border rounded-2xl p-4 transition-all duration-200 hover:shadow-md ${
                  isSelected
                    ? 'border-[var(--accent-main)] ring-2 ring-[var(--accent-main)]/20 shadow-xs'
                    : 'theme-border'
                }`}
              >
                {/* Header with Selection Checkbox & Meta */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <CustomCheckbox
                      checked={isSelected}
                      onChange={() => handleToggleSelectStudent(card.id)}
                    />
                    <div>
                      <h4 className="text-sm font-bold theme-text-primary leading-tight">
                        {card.name}
                      </h4>
                      <p className="text-xs theme-text-secondary font-mono mt-0.5">
                        ID: {card.uniqId}
                      </p>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 theme-bg-accent-soft theme-accent font-bold text-xs rounded-md border border-[var(--accent-main)]/20">
                    Roll: {card.rollNumber}
                  </span>
                </div>

                {/* Card summary row */}
                <div className="grid grid-cols-2 gap-2 text-xs py-2.5 px-3 theme-bg-sub rounded-xl mb-3 border theme-border">
                  <div>
                    <span className="theme-text-secondary block text-[10px]">Class & Section</span>
                    <span className="font-semibold theme-text-primary">
                      {card.className} {card.sectionName ? `(${card.sectionName})` : ''}
                    </span>
                  </div>
                  <div>
                    <span className="theme-text-secondary block text-[10px]">Hall / Room</span>
                    <span className="font-semibold theme-text-primary">
                      {card.roomNumber || 'Room 101'}
                    </span>
                  </div>
                  <div>
                    <span className="theme-text-secondary block text-[10px]">Subjects</span>
                    <span className="font-semibold theme-text-primary">
                      {card.routine.length} Scheduled
                    </span>
                  </div>
                  <div>
                    <span className="theme-text-secondary block text-[10px]">Session</span>
                    <span className="font-semibold theme-text-primary">
                      {card.sessionYear}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t theme-border">
                  <button
                    type="button"
                    onClick={() => setPreviewCard(card)}
                    className="flex items-center gap-1.5 text-xs font-medium theme-accent hover:underline cursor-pointer"
                  >
                    <EyeIcon className="w-3.5 h-3.5" />
                    <span>Quick Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSingleCardToPrint(card);
                      setIsPrintModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium theme-text-secondary hover:theme-text-primary cursor-pointer transition-colors"
                  >
                    <PrinterIcon className="w-3.5 h-3.5" />
                    <span>Print Card</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Bulk / Single Print Modal */}
      {isPrintModalOpen && (
        <AdmitCardPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            setSingleCardToPrint(null);
          }}
          cards={printableCards}
          institutionDetails={institutionDetails}
        />
      )}

      {/* 4. Single Card Preview Modal (Standard Project Modal) */}
      <Modal
        isOpen={Boolean(previewCard)}
        onClose={() => setPreviewCard(null)}
        title={previewCard ? `Admit Card Preview — ${previewCard.name}` : 'Admit Card Preview'}
        size="2xl"
        footer={
          previewCard ? (
            <div className="flex items-center justify-end gap-3 w-full">
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => setPreviewCard(null)}
              >
                Close
              </CustomButton>
              <CustomButton
                variant="primary"
                size="sm"
                onClick={() => {
                  setSingleCardToPrint(previewCard);
                  setPreviewCard(null);
                  setIsPrintModalOpen(true);
                }}
                icon={PrinterIcon}
              >
                Print This Card
              </CustomButton>
            </div>
          ) : null
        }
      >

        {previewCard && (
          <div className="p-2 sm:p-4 theme-bg-sub/60 rounded-xl flex justify-center">
            <AdmitCardCanvas
              card={previewCard}
              institutionName={institutionDetails.name}
              institutionLogo={institutionDetails.logo}
              institutionAddress={institutionDetails.address}
              showSignature={true}
              showQrCode={true}
              className="w-full max-w-xl shadow-lg"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}

