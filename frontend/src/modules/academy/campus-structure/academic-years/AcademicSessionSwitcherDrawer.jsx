import React, { useState, useMemo } from 'react';
import {
  SessionsIcon,
  CalendarIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClockIcon,
} from '../../../../components/ui/Icons';
import CustomSelect from '../../../../components/ui/CustomSelect';
import { DrawerContainer, DrawerSection, DrawerFooter } from '../../../../components/layout';
import { useAcademicSession } from '../../../../context/AcademicSessionContext';
import { useTenant } from '../../../../context/TenantContext';
import { useToast } from '../../../../context/ToastContext';
import { academicYearsStore, getAcademicYearStatus } from '../../../../utils/localStore';

function formatDateDisplay(dateStr) {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const d = parts[2];
    const m = months[parseInt(parts[1], 10) - 1] || parts[1];
    const y = parts[0];
    return `${d} ${m} ${y}`;
  } catch {
    return dateStr;
  }
}

/**
 * AcademicSessionSwitcherDrawer
 * Enterprise Right Sidebar Drawer to switch system-wide Active Academic Year & Active Semester / Term
 */
export default function AcademicSessionSwitcherDrawer({ onSaved, onCancel }) {
  const { activeTenantId } = useTenant();
  const {
    activeYear: globalActiveYear,
    activeSemester: globalActiveSemester,
    setActiveYear,
    setActiveSemester,
  } = useAcademicSession();
  const { showToast } = useToast();

  const academicYears = useMemo(() => {
    return academicYearsStore.getAcademicYears(activeTenantId) || [];
  }, [activeTenantId]);

  // Selected Year ID state
  const [selectedYearId, setSelectedYearId] = useState(() => {
    return globalActiveYear ? String(globalActiveYear.id) : (academicYears[0] ? String(academicYears[0].id) : '');
  });

  const selectedYear = useMemo(() => {
    return academicYears.find((y) => String(y.id) === String(selectedYearId)) || academicYears[0] || null;
  }, [academicYears, selectedYearId]);

  // Selected Semester ID state
  const [selectedSemesterId, setSelectedSemesterId] = useState(() => {
    if (globalActiveSemester && selectedYear) {
      const match = selectedYear.terms?.find((t) => String(t.id) === String(globalActiveSemester.id));
      if (match) return String(match.id);
    }
    return selectedYear?.terms?.[0] ? String(selectedYear.terms[0].id) : '';
  });

  const selectedTerm = useMemo(() => {
    if (!selectedYear || !selectedYear.terms) return null;
    return selectedYear.terms.find((t) => String(t.id) === String(selectedSemesterId)) || selectedYear.terms[0] || null;
  }, [selectedYear, selectedSemesterId]);

  // Year options with badges
  const yearOptions = useMemo(() => {
    return academicYears.map((y) => {
      const status = getAcademicYearStatus(y.startDate, y.endDate);
      const isCurrentActive = String(y.id) === String(globalActiveYear?.id);
      return {
        value: String(y.id),
        label: y.name,
        badge: isCurrentActive ? 'Active Session' : status === 'ACTIVE' ? 'Ongoing' : status === 'UPCOMING' ? 'Upcoming' : 'Past',
      };
    });
  }, [academicYears, globalActiveYear]);

  // Term options for selected year
  const termOptions = useMemo(() => {
    if (!selectedYear || !selectedYear.terms) return [];
    return selectedYear.terms.map((t) => {
      const isCurrentActiveTerm = String(globalActiveYear?.id) === String(selectedYear.id) && String(globalActiveSemester?.id) === String(t.id);
      return {
        value: String(t.id),
        label: `${t.name} (${formatDateDisplay(t.startDate)} – ${formatDateDisplay(t.endDate)})`,
        badge: isCurrentActiveTerm ? 'Active Term' : undefined,
      };
    });
  }, [selectedYear, globalActiveYear, globalActiveSemester]);

  // Handle Year Change
  const handleYearChange = (yearId) => {
    setSelectedYearId(yearId);
    const target = academicYears.find((y) => String(y.id) === String(yearId));
    if (target && target.terms && target.terms.length > 0) {
      setSelectedSemesterId(String(target.terms[0].id));
    } else {
      setSelectedSemesterId('');
    }
  };

  // Submit Active Session Switch
  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!selectedYear) {
      showToast('Please select a valid academic year.', 'error');
      return;
    }

    setActiveYear(selectedYear);
    if (selectedTerm) {
      setActiveSemester(selectedTerm);
    }

    showToast(`Active academic session set to "${selectedYear.name}" ${selectedTerm ? `(${selectedTerm.name})` : ''}`, 'success');
    if (onSaved) onSaved();
  };

  const selectedYearStatus = selectedYear ? getAcademicYearStatus(selectedYear.startDate, selectedYear.endDate) : 'UPCOMING';

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-8 pt-3">
        {/* Section 1: Academic Year Selection */}
        <DrawerSection
          title="Active Academic Year"
          icon={SessionsIcon}
          subtitle="Choose the master academic calendar session for this academy"
          className="pt-1"
        >
          <div className="space-y-4">
            <CustomSelect
              label="Select Academic Year"
              value={selectedYearId}
              onChange={handleYearChange}
              options={yearOptions}
              placeholder="Choose Academic Year..."
              icon={SessionsIcon}
              required
            />

            {selectedYear && (
              <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                  <span className="font-bold theme-text-primary">{selectedYear.name}</span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedYearStatus === 'ACTIVE'
                        ? 'theme-bg-accent theme-accent-text'
                        : 'theme-bg-surface border theme-border theme-text-secondary'
                    }`}
                  >
                    {selectedYearStatus === 'ACTIVE' ? 'ONGOING' : selectedYearStatus}
                  </span>
                </div>
                <div className="text-[11px] font-mono theme-text-secondary flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span>
                    {formatDateDisplay(selectedYear.startDate)} – {formatDateDisplay(selectedYear.endDate)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Section 2: Term / Semester Selection */}
        <DrawerSection
          title="Active Semester / Term"
          icon={CalendarIcon}
          subtitle="Choose the active instructional term, semester, or cycle"
        >
          <div className="space-y-4">
            <CustomSelect
              label="Select Term / Semester"
              value={selectedSemesterId}
              onChange={(val) => setSelectedSemesterId(val)}
              options={termOptions}
              placeholder={termOptions.length > 0 ? 'Choose Active Term...' : 'No terms configured for this year'}
              disabled={termOptions.length === 0}
              icon={CalendarIcon}
            />

            {selectedTerm && (
              <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold theme-text-primary">{selectedTerm.name}</span>
                  <span className="text-[11px] font-mono theme-accent font-semibold">Active Cycle</span>
                </div>
                <div className="text-[11px] font-mono theme-text-secondary flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 theme-accent shrink-0" />
                  <span>
                    {formatDateDisplay(selectedTerm.startDate)} – {formatDateDisplay(selectedTerm.endDate)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DrawerSection>

        {/* Section 3: System-Wide Impact Notice */}
        <div className="p-3.5 rounded-2xl bg-[var(--accent-main)]/10 border border-[var(--accent-main)]/20 text-xs flex items-start gap-2.5">
          <InformationCircleIcon className="w-4 h-4 theme-accent shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold theme-text-primary">System-Wide Synchronization</p>
            <p className="theme-text-secondary text-[11px] leading-relaxed">
              Applying this session will immediately update classroom schedules, student attendance records, fee cycles, and evaluation portals across all campuses.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <DrawerFooter
          onCancel={onCancel}
          saveLabel="Apply Active Session"
          saveIcon={CheckCircleIcon}
        />
      </form>
    </DrawerContainer>
  );
}
