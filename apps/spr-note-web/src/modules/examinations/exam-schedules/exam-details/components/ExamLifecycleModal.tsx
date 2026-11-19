import React, { useState, useEffect } from 'react';
import Modal from '../../../../../components/ui/Modal';
import CustomButton from '../../../../../components/ui/CustomButton';
import RadioCard from '../../../../../components/ui/RadioCard';
import ExamLifecyclePipeline from './ExamLifecyclePipeline';
import {
  CheckCircleIcon,
  ClockIcon,
  EditIcon,
  ChartBarIcon,
  LockClosedIcon,
  CheckIcon,
} from '../../../../../components/ui/Icons';
import { Exam } from '../types';

export interface ExamLifecycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  examTitle: string;
  onStatusChange: (examId: string, newStatus: string) => void;
}

interface LifecycleOption {
  status: string;
  stageNumber: number;
  stageLabel: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  helperNote: string;
}

const LIFECYCLE_OPTIONS: LifecycleOption[] = [
  {
    status: 'DRAFT',
    stageNumber: 1,
    stageLabel: 'Draft',
    title: 'Draft Setup',
    description: 'Configure routine and subjects. Mark entry is closed.',
    icon: EditIcon,
    helperNote: 'Suspends mark entry and allows routine modifications.',
  },
  {
    status: 'MARK_ENTRY',
    stageNumber: 2,
    stageLabel: 'Mark Entry',
    title: 'Mark Entry',
    description: 'Routine is active. Teachers can enter and submit marks.',
    icon: ChartBarIcon,
    helperNote: 'Opens grading sheets for assigned teachers.',
  },
  {
    status: 'UNDER_REVIEW',
    stageNumber: 3,
    stageLabel: 'Review',
    title: 'Academic Review',
    description: 'Preliminary tabulation active for committee verification.',
    icon: ClockIcon,
    helperNote: 'Locks routine edits and flags marks for academic review.',
  },
  {
    status: 'FINAL_PUBLISHED',
    stageNumber: 4,
    stageLabel: 'Certified',
    title: 'Certified & Published',
    description: 'Final marks locked. Official report cards published.',
    icon: LockClosedIcon,
    helperNote: 'Finalizes all grades and locks records against further edits.',
  },
];

function normalizeStatus(status?: string): string {
  if (!status) return 'DRAFT';
  if (status === 'FIRST_PUBLISHED' || status === 'UNDER_REVIEW') return 'UNDER_REVIEW';
  if (status === 'FINAL_PUBLISHED' || status === 'LOCKED') return 'FINAL_PUBLISHED';
  return status;
}

/**
 * ExamLifecycleModal
 * Dedicated modal for managing and declaring the multi-tier lifecycle stage
 * of an examination session (Draft -> Mark Entry -> Review -> Certified).
 */
export default function ExamLifecycleModal({
  isOpen,
  onClose,
  exam,
  examTitle,
  onStatusChange,
}: ExamLifecycleModalProps) {
  const currentNormalizedStatus = normalizeStatus(exam?.status);
  const [selectedStatus, setSelectedStatus] = useState<string>(currentNormalizedStatus);

  useEffect(() => {
    if (isOpen && exam) {
      setSelectedStatus(normalizeStatus(exam.status));
    }
  }, [isOpen, exam]);

  if (!isOpen || !exam) return null;

  const currentOption =
    LIFECYCLE_OPTIONS.find((opt) => opt.status === currentNormalizedStatus) || LIFECYCLE_OPTIONS[0];
  const selectedOption =
    LIFECYCLE_OPTIONS.find((opt) => opt.status === selectedStatus) || LIFECYCLE_OPTIONS[0];

  const handleConfirm = () => {
    onStatusChange(exam.id, selectedStatus);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Examination Lifecycle & Status"
      subtitle={`Declare or transition the lifecycle stage for "${examTitle}" (${exam.code || 'No Code'})`}
      icon={CheckCircleIcon}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          {/* Left side: Action Impact Note */}
          <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
            <CheckCircleIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
            <p className="text-[11px] theme-text-secondary leading-snug truncate sm:whitespace-normal">
              <span className="font-bold theme-text-primary">Impact: </span>
              {selectedOption.helperNote}
            </p>
          </div>

          {/* Right side: Action Buttons */}
          <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
            <CustomButton variant="sub" size="sm" onClick={onClose}>
              Cancel
            </CustomButton>
            <CustomButton
              variant="primary"
              size="sm"
              icon={CheckIcon}
              onClick={handleConfirm}
            >
              {selectedStatus === currentNormalizedStatus ? 'Confirm Status' : 'Declare & Update Status'}
            </CustomButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Current Active Status & Stepper Overview */}
        <div className="space-y-3 pb-4 border-b theme-border">
          <div className="text-xs font-bold theme-text-secondary uppercase tracking-wider">
            Current Active Stage
          </div>
          <ExamLifecyclePipeline status={exam.status} />
        </div>

        {/* Lifecycle Stages List (Single Column - 1 per row) */}
        <div className="space-y-3 pt-1">
          <div className="text-xs font-bold uppercase tracking-wider theme-text-secondary">
            Declare Target Lifecycle Stage
          </div>
          <div className="flex flex-col gap-2.5">
            {LIFECYCLE_OPTIONS.map((opt) => {
              const isSelected = selectedStatus === opt.status;
              const isCurrentlyActive = currentOption.status === opt.status;
              return (
                <RadioCard
                  key={opt.status}
                  selected={isSelected}
                  onClick={() => setSelectedStatus(opt.status)}
                  title={opt.title}
                  badge={`Stage ${opt.stageNumber}`}
                  icon={opt.icon}
                  indicatorType="radio"
                  description={opt.description}
                >
                  {isCurrentlyActive && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold theme-accent">
                        <CheckIcon className="w-3 h-3" />
                        Currently Active
                      </span>
                    </div>
                  )}
                </RadioCard>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
