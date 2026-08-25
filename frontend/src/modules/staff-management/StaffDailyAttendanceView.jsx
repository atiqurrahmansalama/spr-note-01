import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { fetchWithAuth } from '../../utils/authService';
import { getHijriDateString } from '../../utils/hijriUtils';
import { DayAgendaDrawer, TimeScheduleDrawerForm } from '../../components/calendar';
import AttendanceMatrixTable, { TakeAttendanceButton } from '../../components/common/AttendanceMatrixTable';
import AdminAttendanceDrawer from '../../components/common/AdminAttendanceDrawer';
import useAttendanceDateManager from '../attendance/hooks/useAttendanceDateManager';
import {
  attendanceTimingPolicyStore,
} from '../../utils/localStore';
import {
  getAttendanceCellTimingState,
  cycleStatusWithinAllowed,
  calculateLateDelayMinutes,
} from '../../utils/attendanceTimingEngine';

// Icons & UI Components
import {
  DutyIcon,
  PrinterIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CheckIcon,
  ClockIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import { DateRangePicker, TeacherSelect } from '../../components/selectors';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';

/**
 * Staff Daily Attendance View (Institutional Employee Attendance Register)
 * Tracks daily presence, duty logs, and attendance across all institutional staff.
 * Powered by universal AttendanceMatrixTable and useAttendanceDateManager.
 */
export default function StaffDailyAttendanceView() {
  const { activeTenantId, isMultiTenantAdmin } = useTenant();
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const userProfile = useMemo(() => {
    try {
      const raw = localStorage.getItem('spr_user_profile');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);
  const isAdmin = Boolean(
    isMultiTenantAdmin ||
    userProfile.is_superuser ||
    userProfile.user_type === 'SUPER_ADMIN' ||
    userProfile.user_type === 'ADMIN' ||
    userProfile.role_code === 'ADMIN' ||
    userProfile.role_code === 'PRINCIPAL'
  );

  const [timingPolicy, setTimingPolicy] = useState(() => attendanceTimingPolicyStore.getPolicy(activeTenantId));

  useEffect(() => {
    attendanceTimingPolicyStore.fetchRemotePolicy(activeTenantId).then((res) => {
      if (res) setTimingPolicy(res);
    });

    const handlePolicyUpdate = (e) => {
      setTimingPolicy(e.detail || attendanceTimingPolicyStore.getPolicy(activeTenantId));
    };

    window.addEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    return () => {
      window.removeEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    };
  }, [activeTenantId]);

  // Unified Date Management Hook
  const {
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleResetDate,
    minDate,
    maxDate,
    activeAcademicYear,
    isDateInAcademicYear,
    enrichedDaysHeader,
    gregorianTitle,
    hijriTitle,
    isHijriEnabled,
    isFullscreen,
    setIsFullscreen,
    setCalendarEventsVersion,
  } = useAttendanceDateManager({ activeTenantId, moduleType: 'STAFF' });

  // Filter State
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState('ALL');

  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleTakeAttendance = () => {
    const nextState = !isEditing;
    setIsEditing(nextState);
    if (nextState) {
      showToast('Attendance marking mode enabled. Click any staff cell to mark attendance.', 'info');
    }
  };

  // Staff & Attendance Records State
  const [allStaffList, setAllStaffList] = useState([]);
  const [staffRecords, setStaffRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(`spr_staff_daily_attendance_${activeTenantId || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist Staff Records
  useEffect(() => {
    if (activeTenantId && Object.keys(staffRecords).length > 0) {
      try {
        localStorage.setItem(`spr_staff_daily_attendance_${activeTenantId}`, JSON.stringify(staffRecords));
      } catch (err) {
        console.warn('Failed to save staff daily records:', err);
      }
    }
  }, [staffRecords, activeTenantId]);

  // 1. Fetch Metadata (Departments & All Staff Roster)
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        const [deptRes, staffRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/staff/?page_size=500'),
        ]);

        if (!isMounted) return;

        if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
          const dData = await deptRes.value.json();
          setDepartments(Array.isArray(dData) ? dData : dData.results || []);
        }

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          setAllStaffList(Array.isArray(sData) ? sData : sData.results || []);
        }
      } catch (err) {
        console.error('Error loading staff metadata:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMetadata();
    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  // Filtered Staff Roster
  const filteredStaff = useMemo(() => {
    return allStaffList.filter((s) => {
      if (selectedDeptId && selectedDeptId !== 'ALL' && String(s.department_id || s.department) !== String(selectedDeptId)) {
        return false;
      }
      if (roleFilter && roleFilter !== 'ALL' && s.role !== roleFilter && s.user_type !== roleFilter) {
        return false;
      }
      if (selectedStaffId && selectedStaffId !== 'ALL' && String(s.id) !== String(selectedStaffId)) {
        return false;
      }
      return true;
    });
  }, [allStaffList, selectedDeptId, roleFilter, selectedStaffId]);

  // Helper to extract status from either string or rich object record
  const getStaffStatus = (rec) => {
    if (!rec) return '';
    if (typeof rec === 'string') return rec;
    return rec.status || '';
  };

  // Toggle Status Cell Handler with Timing Enforcement and Self-Only Attendance Rule
  const handleToggleCell = (staffId, dateStr, currentStatus) => {
    // 0. Ownership Authorization: Staff can only mark their own attendance
    if (!isAdmin) {
      const currentUserId = userProfile.id || userProfile.user_id;
      const currentStaffId = userProfile.staff_id || userProfile.employee_id || userProfile.id;
      const matchingStaff = allStaffList.find((s) => String(s.id) === String(staffId));

      const isSelf =
        String(staffId) === String(currentUserId) ||
        String(staffId) === String(currentStaffId) ||
        (matchingStaff && (
          String(matchingStaff.user_id) === String(currentUserId) ||
          String(matchingStaff.id) === String(currentUserId) ||
          (userProfile.phone_number && matchingStaff.phone_number === userProfile.phone_number)
        ));

      if (!isSelf) {
        showToast('You can only mark daily attendance for your own name.', 'warning');
        return;
      }
    }

    // 0. Check Academic Year Date Guard
    if (
      (minDate && dateStr < minDate) ||
      (maxDate && dateStr > maxDate)
    ) {
      showToast(
        `Staff attendance cannot be marked outside the active Academic Year (${activeAcademicYear?.name || 'Active Year'}).`,
        'warning'
      );
      return;
    }

    const timingState = getAttendanceCellTimingState({
      moduleType: 'STAFF',
      targetDate: dateStr,
      policy: timingPolicy,
      isAdmin,
      currentStatus,
    });

    if (!timingState.isEditable) {
      showToast(timingState.tooltip || 'Staff attendance cannot be marked at this time.', 'warning');
      return;
    }

    const key = `${staffId}_${dateStr}`;
    const nextStatus = cycleStatusWithinAllowed(currentStatus, timingState.allowedStatuses);

    const conductorName =
      userProfile.name ||
      userProfile.name_en ||
      (userProfile.first_name ? `${userProfile.first_name} ${userProfile.last_name || ''}`.trim() : '') ||
      'Staff';

    setStaffRecords((prev) => {
      const updated = { ...prev };
      if (nextStatus) {
        updated[key] = {
          status: nextStatus,
          recorded_by_id: userProfile.id || null,
          recorded_by_name: conductorName,
          self_marked: !isAdmin,
          recorded_at: new Date().toISOString(),
        };
      } else {
        delete updated[key];
      }
      return updated;
    });
  };

  // Admin Override Drawer for Staff Attendance
  const handleAdminEditCell = (row, dateStr, currentStatus) => {
    if (
      (minDate && dateStr < minDate) ||
      (maxDate && dateStr > maxDate)
    ) {
      showToast(
        `Staff attendance cannot be modified outside the active Academic Year (${activeAcademicYear?.name || 'Active Year'}).`,
        'warning'
      );
      return;
    }

    openRightSidebar({
      title: 'Admin Staff Attendance Override',
      subtitle: `${row.name || 'Staff Member'} • ${dateStr}`,
      icon: ClockIcon,
      content: (
        <AdminAttendanceDrawer
          personName={row.name || 'Staff Member'}
          personSubtitle={`ID: ${row.employee_id || row.roll_number || '—'} • Dept: ${row.department_name || 'General'}`}
          dateStr={dateStr}
          scheduledStartTime={timingPolicy.staff_start_time || '07:30'}
          initialStatus={currentStatus || 'PRESENT'}
          initialInTime={timingPolicy.staff_start_time || '07:30'}
          initialRemarks=""
          onClose={closeRightSidebar}
          onSave={async (formData) => {
            closeRightSidebar();
            const key = `${row.id}_${dateStr}`;
            setStaffRecords((prev) => ({
              ...prev,
              [key]: {
                status: formData.status,
                recorded_by_id: userProfile.id || null,
                recorded_by_name: userProfile.name || 'Admin',
                self_marked: false,
                recorded_at: new Date().toISOString(),
                in_time: formData.in_time,
                remarks: formData.remarks,
              },
            }));
            showToast(`Attendance updated for ${row.name}`, 'success');
          }}
        />
      ),
    });
  };

  // Transform Staff into Normalized Matrix Rows for AttendanceMatrixTable
  const staffRows = useMemo(() => {
    return filteredStaff.map((staff, idx) => {
      const dailyStatuses = {};
      let pCount = 0;
      let lCount = 0;
      let aCount = 0;
      let lvCount = 0;

      enrichedDaysHeader.forEach((d) => {
        const rawRec = staffRecords[`${staff.id}_${d.date}`];
        const rawStatus = getStaffStatus(rawRec);
        const timingState = getAttendanceCellTimingState({
          moduleType: 'STAFF',
          targetDate: d.date,
          policy: timingPolicy,
          isAdmin,
          currentStatus: rawStatus,
        });

        const st = rawStatus || timingState.displayStatus || '';
        dailyStatuses[d.date] = st;
        if (st === 'PRESENT') pCount++;
        else if (st === 'LATE' || st === 'HALF_DAY') lCount++;
        else if (st === 'ABSENT') aCount++;
        else if (st === 'ON_LEAVE') lvCount++;
      });

      const totalMarked = pCount + lCount + aCount + lvCount;
      const attendedUnits = pCount + lCount;
      const rate = totalMarked > 0 ? Math.round((attendedUnits / totalMarked) * 100) : 100;

      return {
        id: staff.id,
        roll_number: String(idx + 1),
        name: staff.name || staff.user_name || 'Staff Member',
        sub_title: staff.designation || 'Staff',
        department_name: staff.department_name || 'General',
        daily_statuses: dailyStatuses,
        totals: {
          present: pCount,
          late: lCount,
          absent: aCount,
          leave: lvCount,
          attendance_rate: rate,
        },
      };
    });
  }, [filteredStaff, enrichedDaysHeader, staffRecords, timingPolicy, isAdmin]);

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalLeave = 0;

    staffRows.forEach((r) => {
      totalPresent += r.totals.present;
      totalLate += r.totals.late;
      totalAbsent += r.totals.absent;
      totalLeave += r.totals.leave || 0;
    });

    const totalConducted = totalPresent + totalLate;
    const recordedTotal = totalPresent + totalLate + totalAbsent + totalLeave;
    const attendanceRate = recordedTotal > 0 ? Math.round((totalConducted / recordedTotal) * 100) : 100;

    return {
      totalStaff: staffRows.length,
      totalPresent,
      totalLate,
      totalAbsent,
      totalLeave,
      attendanceRate,
    };
  }, [staffRows]);

  // Open Day Agenda Drawer
  const handleOpenDayAgenda = (dateParam) => {
    const fullDate = typeof dateParam === 'string' ? dateParam : (dateParam?.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dateParam?.day || 1).padStart(2, '0')}`);
    const matchedDay = enrichedDaysHeader.find((d) => d.date === fullDate);
    const matchedEvt = matchedDay?.calendar_event;
    const isOff = Boolean(matchedDay?.is_holiday || matchedDay?.is_disabled);
    const offTitle = matchedDay?.holiday_title || (matchedDay?.is_disabled ? 'Staff Duty / Attendance Off' : '');

    openRightSidebar({
      title: `Staff Day Roster: ${fullDate}`,
      subtitle: `${getHijriDateString(fullDate)} • Master Calendar & Duties`,
      icon: CalendarIcon,
      width: 580,
      content: (
        <DayAgendaDrawer
          dateStr={fullDate}
          activeTenantId={activeTenantId}
          calendarEvent={matchedEvt}
          isHoliday={isOff}
          holidayTitle={offTitle}
          isClassOff={isOff}
          classOffReason={offTitle}
          onClose={closeRightSidebar}
          onOpenEventForm={(eventToEdit) => {
            openRightSidebar({
              title: eventToEdit ? `Edit: ${eventToEdit.title}` : 'Schedule Event / Shift',
              subtitle: `Date: ${fullDate}`,
              icon: CalendarIcon,
              width: 600,
              content: (
                <TimeScheduleDrawerForm
                  event={eventToEdit}
                  initialDate={fullDate}
                  onSaveSuccess={() => {
                    closeRightSidebar();
                    setCalendarEventsVersion((v) => v + 1);
                    showToast('Calendar event updated successfully.', 'success');
                  }}
                  onCancel={closeRightSidebar}
                />
              ),
            });
          }}
        />
      ),
    });
  };

  return (
    <PageContainer isFullscreen={isFullscreen} className="space-y-4">
      {/* 1. Header with Breadcrumb */}
      <PageHeader
        title="Staff Daily Attendance"
        subtitle={`Daily attendance register for all institutional employees & staff (${gregorianTitle}${isHijriEnabled ? ` • ${hijriTitle}` : ''})`}
        icon={DutyIcon}
        actions={
          <TakeAttendanceButton
            isEditing={isEditing}
            onClick={handleToggleTakeAttendance}
            activeLabel="Marking Mode"
            inactiveLabel="Take Attendance"
          />
        }
      />

      {/* 2. Top Filter Controls Bar */}
      <div className="p-3 sm:p-4 rounded-2xl theme-bg-surface border theme-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Department Filter */}
          <CustomSelect
            label="Department"
            value={selectedDeptId}
            onChange={(val) => setSelectedDeptId(val)}
            options={[
              { value: 'ALL', label: 'All Departments' },
              ...departments.map((d) => ({ value: String(d.id), label: d.name })),
            ]}
          />

          {/* Role Filter */}
          <CustomSelect
            label="Staff Role"
            value={roleFilter}
            onChange={(val) => setRoleFilter(val)}
            options={[
              { value: 'ALL', label: 'All Roles' },
              { value: 'TEACHER', label: 'Teaching Staff' },
              { value: 'ADMIN', label: 'Administrative Staff' },
              { value: 'SUPPORT', label: 'Support & Facilities' },
              { value: 'HOSTEL', label: 'Hostel & Residential' },
            ]}
          />

          {/* Date Range / Month Picker */}
          <DateRangePicker
            label="Date Range"
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            minDate={minDate}
            maxDate={maxDate}
            onMonthChange={(m) => {
              setSelectedMonth(m);
              setStartDate('');
              setEndDate('');
            }}
            onYearChange={(y) => {
              setSelectedYear(y);
              setStartDate('');
              setEndDate('');
            }}
            startDate={startDate}
            endDate={endDate}
            onRangeSelect={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onReset={handleResetDate}
            isHijriEnabled={isHijriEnabled}
            placeholder="Full Month View"
          />

          {/* Staff Member Selector */}
          <TeacherSelect
            label="Staff Member"
            value={selectedStaffId}
            onChange={setSelectedStaffId}
            teachers={allStaffList}
            allLabel="All Staff Members"
            onlyTeachers={false}
          />
        </div>
      </div>

      {/* 3. Main Staff Daily Attendance Matrix Table */}
      <div
        className={
          isFullscreen
            ? 'flex-1 overflow-hidden flex flex-col rounded-2xl theme-bg-surface border theme-border shadow-md my-2'
            : 'rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden'
        }
      >
        <AttendanceMatrixTable
          daysHeader={enrichedDaysHeader}
          rows={staffRows}
          idLabel="#"
          nameLabel="Staff Name"
          descriptorLabel="Department"
          descriptorIcon={BuildingOfficeIcon}
          isEditing={isEditing}
          onToggleCell={handleToggleCell}
          onAdminEditCell={isAdmin ? handleAdminEditCell : undefined}
          isHijriEnabled={isHijriEnabled}
          onDateClick={handleOpenDayAgenda}
          isLoading={isLoading}
          emptyMessage="No employees found matching your filter criteria."
          totalCount={filteredStaff.length}
          totalCountLabel="Total Staff"
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          tableContainerClass={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}
        />
      </div>
    </PageContainer>
  );
}
