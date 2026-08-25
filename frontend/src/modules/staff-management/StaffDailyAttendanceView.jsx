import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { fetchWithAuth } from '../../utils/authService';
import { getHijriDateString } from '../../utils/hijriUtils';
import DayAgendaDrawer from '../../components/calendar/DayAgendaDrawer';
import AttendanceMatrixTable, { TakeAttendanceButton } from '../../components/common/AttendanceMatrixTable';
import useAttendanceDateManager from '../attendance/hooks/useAttendanceDateManager';

// Icons & UI Components
import {
  DutyIcon,
  SearchIcon,
  PrinterIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CheckIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import { DateRangePicker } from '../../components/selectors';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';
import {
  cycleAttendanceStatus,
} from '../../constants/attendanceConstants';

/**
 * Staff Daily Attendance View (Institutional Employee Attendance Register)
 * Tracks daily presence, duty logs, and attendance across all institutional staff.
 * Powered by universal AttendanceMatrixTable and useAttendanceDateManager.
 */
export default function StaffDailyAttendanceView() {
  const { activeTenantId } = useTenant();
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  // Unified Date Management Hook
  const {
    todayStr,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    handleResetDate,
    enrichedDaysHeader,
    gregorianTitle,
    hijriTitle,
    isHijriEnabled,
    isFullscreen,
    setIsFullscreen,
    setCalendarEventsVersion,
  } = useAttendanceDateManager({ activeTenantId });

  // Filter State
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Modes
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load / Update Staff Records on activeTenantId change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`spr_staff_daily_attendance_${activeTenantId || 'default'}`);
      setStaffRecords(saved ? JSON.parse(saved) : {});
    } catch {
      setStaffRecords({});
    }
  }, [activeTenantId]);

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
        console.error('Error fetching staff metadata:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMetadata();

    const handleTenantChanged = () => {
      fetchMetadata();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
    };
  }, [activeTenantId]);

  // Filtered Staff List
  const filteredStaff = useMemo(() => {
    return allStaffList.filter((s) => {
      if (selectedDeptId !== 'ALL' && String(s.department_id || s.department) !== String(selectedDeptId)) {
        return false;
      }
      if (roleFilter !== 'ALL' && s.role_type !== roleFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (s.name || s.user_name || '').toLowerCase();
        const empId = (s.employee_id || '').toLowerCase();
        const dept = (s.department_name || '').toLowerCase();
        const desig = (s.designation || '').toLowerCase();
        if (!name.includes(q) && !empId.includes(q) && !dept.includes(q) && !desig.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [allStaffList, selectedDeptId, roleFilter, searchQuery]);

  // Toggle Status Cell Handler (Reusable helper)
  const handleToggleCell = (staffId, dateStr, currentStatus) => {
    const key = `${staffId}_${dateStr}`;
    const nextStatus = cycleAttendanceStatus(currentStatus);

    setStaffRecords((prev) => {
      const updated = { ...prev };
      if (nextStatus) {
        updated[key] = nextStatus;
      } else {
        delete updated[key];
      }
      return updated;
    });
  };

  // Transform Staff into Normalized Matrix Rows for AttendanceMatrixTable
  const staffRows = useMemo(() => {
    return filteredStaff.map((staff) => {
      const dailyStatuses = {};
      let pCount = 0;
      let lCount = 0;
      let aCount = 0;
      let hCount = 0;
      let lvCount = 0;

      enrichedDaysHeader.forEach((d) => {
        const st = staffRecords[`${staff.id}_${d.date}`];
        dailyStatuses[d.date] = st;
        if (st === 'PRESENT') pCount++;
        else if (st === 'LATE') lCount++;
        else if (st === 'ABSENT') aCount++;
        else if (st === 'HALF_DAY') hCount++;
        else if (st === 'ON_LEAVE') lvCount++;
      });

      const totalMarked = pCount + lCount + aCount + hCount + lvCount;
      const attendedUnits = pCount + lCount + hCount * 0.5;
      const rate = totalMarked > 0 ? Math.round((attendedUnits / totalMarked) * 100) : 100;

      return {
        id: staff.id,
        roll_number: staff.employee_id || `S-${String(staff.id).padStart(3, '0')}`,
        name: staff.name || staff.user_name || 'Staff Member',
        sub_title: staff.designation || 'Staff',
        department_name: staff.department_name || 'General',
        daily_statuses: dailyStatuses,
        totals: {
          present: pCount,
          late: lCount,
          absent: aCount,
          half_day: hCount,
          leave: lvCount,
          attendance_rate: rate,
        },
      };
    });
  }, [filteredStaff, enrichedDaysHeader, staffRecords]);

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalLeave = 0;

    staffRows.forEach((r) => {
      totalPresent += r.totals.present;
      totalLate += r.totals.late;
      totalAbsent += r.totals.absent;
      totalHalfDay += r.totals.half_day || 0;
      totalLeave += r.totals.leave || 0;
    });

    const totalConducted = totalPresent + totalLate + totalHalfDay * 0.5;
    const recordedTotal = totalPresent + totalLate + totalAbsent + totalHalfDay + totalLeave;
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
  const handleOpenDayAgenda = (dateStr) => {
    const fullDate = typeof dateStr === 'object' ? dateStr.date : dateStr;
    const matchedDay = enrichedDaysHeader.find((d) => d.date === fullDate);
    const matchedEvt = matchedDay?.calendar_event;

    openRightSidebar({
      title: `Staff Day Roster: ${fullDate}`,
      subtitle: `${getHijriDateString(fullDate)} • Master Calendar & Duties`,
      icon: CalendarIcon,
      width: 580,
      content: (
        <DayAgendaDrawer
          dateStr={fullDate}
          event={matchedEvt}
          onClose={closeRightSidebar}
          onAddSuccess={() => setCalendarEventsVersion((v) => v + 1)}
        />
      ),
    });
  };

  return (
    <PageContainer isFullscreen={isFullscreen} className="space-y-4">
      {/* 1. Header with Breadcrumb & Core Actions */}
      <PageHeader
        title="Staff Daily Attendance"
        subtitle={`Daily attendance register for all institutional employees & staff (${gregorianTitle}${isHijriEnabled ? ` • ${hijriTitle}` : ''})`}
        icon={DutyIcon}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <TakeAttendanceButton
              isEditing={isEditing}
              onToggle={() => setIsEditing((prev) => !prev)}
              size="sm"
            />

            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border theme-border theme-bg-surface hover:theme-bg-sub theme-text-primary text-xs font-semibold transition cursor-pointer shadow-xs flex items-center gap-1.5"
              title="Print Staff Attendance Register"
            >
              <PrinterIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </div>
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

          {/* Staff Search */}
          <CustomInput
            label="Search Staff"
            placeholder="Name, ID or Designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon className="w-4 h-4 theme-text-secondary" />}
          />
        </div>
      </div>

      {/* 3. Main Staff Daily Attendance Matrix Table (Reusing AttendanceMatrixTable) */}
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
          idLabel="ID"
          nameLabel="Staff Name"
          descriptorLabel="Department"
          descriptorIcon={BuildingOfficeIcon}
          isEditing={isEditing}
          onToggleCell={handleToggleCell}
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
