import React, { useState, useMemo } from 'react';
import CustomButton from '@/components/ui/CustomButton';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import ReusableCalendar from '@/components/common/ReusableCalendar';
import DepartmentSelect from '@/components/selectors/DepartmentSelect';
import { DrawerContainer, DrawerSection } from '@/components/layout';
import {
  CheckIcon,
  CloseIcon,
  ClockIcon,
  SaveIcon,
  ShieldCheckIcon,
  TeacherIcon,
  SparklesIcon,
  UsersIcon,
  AlertCircleIcon,
  AcademicCapIcon,
  StudentIcon,
} from '@/components/ui/Icons';
import { ApprovalStatusBadge } from './ApprovalStatusBadge';
import { useStaffRanks, useStaffCategories } from '@/modules/staff-management/hooks';
import { useApprovalsTranslation } from '../locales';
import type { ApprovalRequestItem } from '../types';

export interface ApprovalReviewDrawerProps {
  request: ApprovalRequestItem;
  onApprove: (id: string, decision: any) => Promise<any>;
  onReject: (id: string, decision: any) => Promise<any>;
  onClose?: () => void;
}

export const ApprovalReviewDrawer: React.FC<ApprovalReviewDrawerProps> = ({
  request,
  onApprove,
  onReject,
  onClose,
}) => {
  const { t, formatDate } = useApprovalsTranslation();

  const isStaffDomain = request.domain === 'STAFF_ONBOARDING';
  const isStudentDomain = request.domain === 'STUDENT_ADMISSION';
  const initialPayload = request.payload || {};
  const summaryMeta = request.summary_meta || {};

  // Reviewer Overrides State (Preset from candidate submission)
  const [designation, setDesignation] = useState(
    request.reviewer_overrides?.designation || initialPayload.designation || request.summary_meta?.designation || ''
  );
  const [staffType, setStaffType] = useState(
    request.reviewer_overrides?.staff_type || initialPayload.staff_type || request.summary_meta?.staff_type || 'TEACHING'
  );
  const [department, setDepartment] = useState(
    request.reviewer_overrides?.department || initialPayload.department || request.summary_meta?.department_id || ''
  );
  const [joiningDate, setJoiningDate] = useState(
    request.reviewer_overrides?.joining_date || initialPayload.joining_date || request.summary_meta?.joining_date || ''
  );
  const [baseSalary, setBaseSalary] = useState(
    request.reviewer_overrides?.base_salary ?? initialPayload.base_salary ?? 0
  );

  // Student Admission Overrides State
  const [targetClass, setTargetClass] = useState(
    request.reviewer_overrides?.class_name || initialPayload.class_name || summaryMeta.target_class || ''
  );
  const [targetGroup, setTargetGroup] = useState(
    request.reviewer_overrides?.group_name || initialPayload.group_name || summaryMeta.target_group || ''
  );
  const [rollNumber, setRollNumber] = useState(
    request.reviewer_overrides?.roll_number || initialPayload.roll_number || ''
  );

  // Decision & Audit Controls
  const [effectiveDate, setEffectiveDate] = useState(request.effective_date || '');
  const [adminRemarks, setAdminRemarks] = useState(request.admin_remarks || '');
  const [rejectionReason, setRejectionReason] = useState(request.rejection_reason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);

  // Ranks & Taxonomy for adjustments
  const { categoryOptions } = useStaffCategories({ currentValue: staffType });
  const { rankOptions, getRankByName } = useStaffRanks();

  const handleRankSelect = (selectedName: string) => {
    setDesignation(selectedName);
    const matched = getRankByName(selectedName);
    if (matched && matched.type && matched.type !== staffType) {
      setStaffType(matched.type);
    }
  };

  const handleApproveClick = async () => {
    setIsSubmitting(true);
    try {
      const overrides: Record<string, any> = {};
      if (isStaffDomain) {
        overrides.designation = designation;
        overrides.staff_type = staffType;
        overrides.department = department || null;
        overrides.joining_date = joiningDate;
        overrides.base_salary = baseSalary;
      } else if (isStudentDomain) {
        if (targetClass) overrides.class_name = targetClass;
        if (targetGroup) overrides.group_name = targetGroup;
        if (rollNumber) overrides.roll_number = rollNumber;
      }

      await onApprove(request.id, {
        overrides,
        admin_remarks: adminRemarks.trim(),
        effective_date: effectiveDate || null,
      });
      onClose?.();
    } catch (err) {
      // Toast handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectClick = async () => {
    if (!rejectionReason.trim()) {
      setShowRejectBox(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(request.id, {
        rejection_reason: rejectionReason.trim(),
        admin_remarks: adminRemarks.trim(),
      });
      onClose?.();
    } catch (err) {
      // Toast handled by hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPending = request.status === 'PENDING' || request.status === 'IN_REVIEW';

  return (
    <DrawerContainer padding="none" spacing="normal">
      <div className="space-y-6 pt-2 pb-6 @container text-start">
        {/* 1. Applicant Header & Status Ribbon */}
        <div className="p-4 rounded-3xl theme-bg-surface shadow-xs space-y-3 border-0">
          <div className="flex items-start justify-between gap-3 border-0">
            <div className="min-w-0 space-y-1">
              <span className="text-[11px] font-mono font-bold theme-text-secondary tracking-wider block">
                {request.tracking_code}
              </span>
              <h3 className="text-base font-bold theme-text-primary truncate">
                {request.applicant_name || 'Applicant'}
              </h3>
              <div className="flex flex-wrap items-center gap-2 text-xs theme-text-secondary">
                {request.email && <span>{request.email}</span>}
                {request.email && request.phone_number && <span>•</span>}
                {request.phone_number && <span>{request.phone_number}</span>}
              </div>
            </div>

            <ApprovalStatusBadge status={request.status} />
          </div>

          <div className="p-3 rounded-2xl theme-bg-app border-0 grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                {t('colSubmitted', 'Submitted')}
              </span>
              <span className="font-mono font-semibold theme-text-primary">
                {formatDate(request.created_at)}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                {t('colDomain', 'Domain')}
              </span>
              <span className="font-semibold theme-text-primary">
                {request.domain.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* 2. Reviewer Adjustments & Final Assignment (For Staff Onboarding) */}
        {isStaffDomain && (
          <DrawerSection
            icon={TeacherIcon}
            title={t('reviewerOverridesTitle', 'Institutional Role & Terms')}
          >
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start">
              <CustomSelect
                label="Staff Category"
                options={categoryOptions}
                value={staffType}
                onChange={(val) => setStaffType(val)}
                disabled={!isPending}
              />

              <CustomSelect
                label="Designation / Official Rank"
                options={rankOptions}
                value={designation}
                onChange={(val) => handleRankSelect(val)}
                searchable={true}
                disabled={!isPending}
              />

              <DepartmentSelect
                label="Assigned Department"
                value={department}
                onChange={(val: any) => setDepartment(val)}
                placeholder="None / Institution-Wide"
                allowAll={true}
                allLabel="None / Institution-Wide"
                allValue=""
                disabled={!isPending}
              />

              <div>
                <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider block mb-1.5">
                  Official Joining Date
                </label>
                <ReusableCalendar
                  selectedDate={joiningDate}
                  onSelectDate={(val: string) => setJoiningDate(val)}
                  placeholder="Select Joining Date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start pt-1">
              <CustomInput
                label="Base Monthly Salary (Optional)"
                type="number"
                placeholder="0.00"
                value={String(baseSalary || '')}
                onChange={(val) => setBaseSalary(Number(val) || 0)}
                disabled={!isPending}
              />

              <div>
                <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider block mb-1.5">
                  {t('effectiveDateLabel', 'Effective Date (Optional)')}
                </label>
                <ReusableCalendar
                  selectedDate={effectiveDate}
                  onSelectDate={(val: string) => setEffectiveDate(val)}
                  placeholder="Immediate if blank"
                />
              </div>
            </div>
          </DrawerSection>
        )}

        {/* 2b. Reviewer Adjustments & Details (For Student Admission) */}
        {isStudentDomain && (
          <DrawerSection
            icon={AcademicCapIcon}
            title={t('studentAdmissionDetailsTitle', 'Admission & Academic Terms')}
          >
            {/* Summary Highlights */}
            <div className="p-3.5 rounded-2xl theme-bg-app border-0 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                    Session Year
                  </span>
                  <span className="font-semibold theme-text-primary">
                    {summaryMeta.session_year || 'Ongoing Year'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                    Gender & Blood
                  </span>
                  <span className="font-semibold theme-text-primary">
                    {summaryMeta.gender || 'MALE'} {summaryMeta.blood_group ? `• ${summaryMeta.blood_group}` : ''}
                  </span>
                </div>
              </div>

              {(summaryMeta.guardian_name || summaryMeta.guardian_phone) && (
                <div className="pt-2 border-t border-[var(--border-color)]/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold theme-text-secondary block">
                      Primary Guardian
                    </span>
                    <span className="font-semibold theme-text-primary">
                      {summaryMeta.guardian_name || 'Guardian'}
                    </span>
                  </div>
                  {summaryMeta.guardian_phone && (
                    <span className="font-mono text-xs theme-accent font-semibold">
                      {summaryMeta.guardian_phone}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-3 items-start pt-1">
              <CustomInput
                label="Target Class / Grade"
                placeholder="e.g. Class 1, Hifz, Grade 6"
                value={targetClass}
                onChange={(val) => setTargetClass(val)}
                disabled={!isPending}
              />

              <CustomInput
                label="Group / Section (Optional)"
                placeholder="e.g. General, Science, Hifz A"
                value={targetGroup}
                onChange={(val) => setTargetGroup(val)}
                disabled={!isPending}
              />

              <CustomInput
                label="Roll / Student ID (Optional)"
                placeholder="Leave blank to auto-generate"
                value={rollNumber}
                onChange={(val) => setRollNumber(val)}
                disabled={!isPending}
              />

              <div>
                <label className="text-xs font-bold theme-text-secondary uppercase tracking-wider block mb-1.5">
                  {t('effectiveDateLabel', 'Effective Date (Optional)')}
                </label>
                <ReusableCalendar
                  selectedDate={effectiveDate}
                  onSelectDate={(val: string) => setEffectiveDate(val)}
                  placeholder="Immediate if blank"
                />
              </div>
            </div>
          </DrawerSection>
        )}

        {/* 3. Reviewer Remarks & Rejection Area */}
        <DrawerSection
          icon={ShieldCheckIcon}
          title={t('decisionRemarksSection', 'Reviewer Notes & Decision')}
        >
          <CustomInput
            label={t('adminRemarksLabel', 'Reviewer Remarks (Optional)')}
            placeholder="e.g. Verified by Nazem-e-Ta'limat on campus visit"
            value={adminRemarks}
            onChange={(val) => setAdminRemarks(val)}
            disabled={!isPending}
          />

          {showRejectBox && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border-0 space-y-2 animate-fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                <AlertCircleIcon className="w-4 h-4 shrink-0" />
                <span>{t('rejectionReasonRequired', 'Rejection Reason (Required)')}</span>
              </div>
              <CustomInput
                placeholder={t('rejectionReasonPlaceholder', 'Provide a clear reason for rejection...')}
                value={rejectionReason}
                onChange={(val) => setRejectionReason(val)}
              />
            </div>
          )}
        </DrawerSection>

        {/* 4. Action Buttons */}
        {isPending && (
          <div className="pt-2 border-0 flex items-center justify-end gap-2.5">
            <CustomButton
              type="button"
              variant="danger"
              size="md"
              icon={CloseIcon}
              onClick={handleRejectClick}
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              {showRejectBox ? t('confirmReject', 'Confirm Rejection') : t('rejectAction', 'Reject')}
            </CustomButton>

            <CustomButton
              type="button"
              variant="primary"
              size="md"
              icon={CheckIcon}
              onClick={handleApproveClick}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="flex-1"
            >
              {effectiveDate ? t('confirmSchedule', 'Schedule Approval') : t('confirmApprove', 'Approve & Activate')}
            </CustomButton>
          </div>
        )}
      </div>
    </DrawerContainer>
  );
};

export default ApprovalReviewDrawer;

