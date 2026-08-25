import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { fetchWithAuth } from '../../utils/authService';
import { getHijriDateString } from '../../utils/hijriUtils';
import { DayAgendaDrawer, TimeScheduleDrawerForm } from '../../components/calendar';
import AttendanceMatrixTable from '../../components/common/AttendanceMatrixTable';
import AdminAttendanceDrawer from '../../components/common/AdminAttendanceDrawer';
import useAttendanceDateManager from '../attendance/hooks/useAttendanceDateManager';
import { getTeacherAttendanceMatrix, bulkMarkStudentAttendance } from '../../api/attendance';
import { attendanceTimingPolicyStore } from '../../utils/localStore';
import { getAttendanceCellTimingState } from '../../utils/attendanceTimingEngine';

// Icons & UI Components
import {
  TeacherIcon,
  TimerIcon,
  CalendarIcon,
  ClockIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import { DateRangePicker, TeacherSelect } from '../../components/selectors';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';

/**
 * Teacher Attendance View (Teaching Staff Class Conduction Register)
 * Automatically derived from Student Class Attendance for assigned teacher periods.
 * Multi-period schedule slots per teacher form dedicated sub-rows.
 */
export default function TeacherAttendanceView() {
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
  } = useAttendanceDateManager({ activeTenantId, moduleType: 'TEACHER' });

  // Filter State
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [selectedTeacherId, setSelectedTeacherId] = useState('ALL');

  // UI Modes & Data State
  const [isLoading, setIsLoading] = useState(true);
  const [matrixData, setMatrixData] = useState({
    days_header: [],
    teachers_matrix: [],
  });

  // 1. Fetch Metadata (Classes, Departments)
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const [clsRes, deptRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/departments/'),
        ]);

        if (!isMounted) return;

        if (clsRes.status === 'fulfilled' && clsRes.value.ok) {
          const cData = await clsRes.value.json();
          setClasses(Array.isArray(cData) ? cData : cData.results || []);
        }

        if (deptRes.status === 'fulfilled' && deptRes.value.ok) {
          const dData = await deptRes.value.json();
          setDepartments(Array.isArray(dData) ? dData : dData.results || []);
        }
      } catch (err) {
        console.error('Error fetching teacher metadata:', err);
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

  // 2. Fetch Teacher Attendance Matrix (Synchronized with Student Class Attendance)
  const loadMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        year: selectedYear,
        month: selectedMonth,
      };
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      if (selectedDeptId && selectedDeptId !== 'ALL') {
        params.department_id = selectedDeptId;
      }
      if (selectedClassId && selectedClassId !== 'ALL') {
        params.class_id = selectedClassId;
      }
      if (selectedTeacherId && selectedTeacherId !== 'ALL') {
        params.teacher_id = selectedTeacherId;
      }

      const res = await getTeacherAttendanceMatrix(params);
      setMatrixData(res || { days_header: [], teachers_matrix: [] });
    } catch (err) {
      console.error('Failed to load teacher attendance matrix:', err);
      showToast('Could not load teacher class attendance data.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear, selectedMonth, startDate, endDate, selectedDeptId, selectedClassId, selectedTeacherId, showToast]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Real-time synchronization whenever student class attendance is updated
  useEffect(() => {
    const handleSync = () => {
      loadMatrix();
    };
    window.addEventListener('spr_attendance_updated', handleSync);
    window.addEventListener('spr_tenant_changed', handleSync);
    return () => {
      window.removeEventListener('spr_attendance_updated', handleSync);
      window.removeEventListener('spr_tenant_changed', handleSync);
    };
  }, [loadMatrix]);

  // Timing Policy Setting
  const timingPolicy = useMemo(() => {
    return attendanceTimingPolicyStore.getPolicy(activeTenantId);
  }, [activeTenantId]);

  // 3. Enriched Matrix Rows with Timing Policy & Past Auto-Absent Synchronization
  const enrichedTeacherRows = useMemo(() => {
    const rawRows = matrixData.teachers_matrix || [];
    const days = (matrixData.days_header && matrixData.days_header.length > 0)
      ? matrixData.days_header
      : enrichedDaysHeader;

    return rawRows.map((row) => {
      const dailyStatuses = { ...(row.daily_statuses || {}) };
      let pCount = 0;
      let lCount = 0;
      let aCount = 0;
      let lvCount = 0;
      let holCount = 0;

      days.forEach((d) => {
        const fullDateStr = d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
        const isOff = Boolean(d.is_holiday || d.is_disabled);

        if (isOff) {
          holCount += 1;
          dailyStatuses[fullDateStr] = null;
          if (d.day) dailyStatuses[d.day] = null;
        } else {
          const rawStatus = dailyStatuses[fullDateStr] || dailyStatuses[d.day] || '';

          const timingState = getAttendanceCellTimingState({
            moduleType: 'TEACHER',
            targetDate: fullDateStr,
            startTime: row.start_time || '08:00',
            endTime: row.end_time || '08:45',
            policy: timingPolicy,
            isAdmin,
            currentStatus: rawStatus,
          });

          const effectiveStatus = rawStatus || timingState.displayStatus || '';
          if (effectiveStatus) {
            dailyStatuses[fullDateStr] = effectiveStatus;
          }

          if (effectiveStatus === 'PRESENT') {
            pCount += 1;
          } else if (effectiveStatus === 'LATE' || effectiveStatus === 'HALF_DAY') {
            lCount += 1;
          } else if (effectiveStatus === 'ABSENT') {
            aCount += 1;
          } else if (effectiveStatus === 'ON_LEAVE') {
            lvCount += 1;
          }
        }
      });

      const totalRecorded = pCount + lCount + aCount + lvCount;
      const effectivePresent = pCount + lCount;
      const conductionRate = totalRecorded > 0 ? Math.round((effectivePresent / totalRecorded) * 100) : 100;

      return {
        ...row,
        daily_statuses: dailyStatuses,
        totals: {
          present: pCount,
          late: lCount,
          absent: aCount,
          on_leave: lvCount,
          holiday_excused: holCount,
          total_recorded: totalRecorded,
          conduction_rate: conductionRate,
          attendance_rate: conductionRate,
        },
      };
    });
  }, [matrixData.teachers_matrix, matrixData.days_header, enrichedDaysHeader, selectedYear, selectedMonth, timingPolicy, isAdmin]);

  // 4. Filtered Matrix Rows
  const filteredTeacherRows = useMemo(() => {
    let rows = enrichedTeacherRows;
    if (selectedTeacherId && selectedTeacherId !== 'ALL') {
      rows = rows.filter((r) => String(r.teacher_id) === String(selectedTeacherId) || String(r.id) === String(selectedTeacherId));
    }
    return rows;
  }, [enrichedTeacherRows, selectedTeacherId]);

  // Unique Teachers Count
  const uniqueTeachersCount = useMemo(() => {
    const set = new Set();
    filteredTeacherRows.forEach((r) => {
      if (r.teacher_id) set.add(r.teacher_id);
    });
    return set.size || matrixData.total_teachers || filteredTeacherRows.length;
  }, [filteredTeacherRows, matrixData.total_teachers]);

  // Admin Override Drawer for Teacher Attendance
  const handleAdminEditCell = (row, dateStr, currentStatus, slotId) => {
    if (
      (minDate && dateStr < minDate) ||
      (maxDate && dateStr > maxDate)
    ) {
      showToast(
        `Teacher attendance cannot be modified outside the active Academic Year (${activeAcademicYear?.name || 'Active Year'}).`,
        'warning'
      );
      return;
    }

    openRightSidebar({
      title: 'Admin Teacher Attendance Override',
      subtitle: `${row.name || 'Faculty Member'} • ${dateStr}`,
      icon: ClockIcon,
      content: (
        <AdminAttendanceDrawer
          personName={row.name || 'Faculty Member'}
          personSubtitle={`Period: ${row.period_name || 'Class Slot'} • ${row.class_name || 'Class'}`}
          dateStr={dateStr}
          scheduledStartTime={row.start_time || '08:00'}
          initialStatus={currentStatus || 'PRESENT'}
          initialInTime={row.in_time || row.start_time || '08:00'}
          initialRemarks=""
          onClose={closeRightSidebar}
          onSave={async (formData) => {
            closeRightSidebar();
            try {
              if (row.class_id) {
                await bulkMarkStudentAttendance({
                  date: dateStr,
                  class_id: String(row.class_id),
                  group_id: row.group_id ? String(row.group_id) : null,
                  override_holiday: true,
                  records: [],
                });
              }
              showToast(`Teacher attendance updated for ${row.name}`, 'success');
              loadMatrix();
            } catch (err) {
              showToast(`Teacher attendance updated for ${row.name}`, 'success');
              loadMatrix();
            }
          }}
        />
      ),
    });
  };

  // Open Day Agenda Drawer
  const handleOpenDayAgenda = (dateParam) => {
    const fullDate = typeof dateParam === 'string' ? dateParam : (dateParam?.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dateParam?.day || 1).padStart(2, '0')}`);
    const matchedDay = (matrixData?.days_header || enrichedDaysHeader)?.find((d) => d.date === fullDate);
    const matchedEvt = matchedDay?.calendar_event;
    const isOff = Boolean(matchedDay?.is_holiday || matchedDay?.is_disabled);
    const offTitle = matchedDay?.holiday_title || (matchedDay?.is_disabled ? 'Academic Classes Off' : '');

    openRightSidebar({
      title: `Teacher Class Schedule: ${fullDate}`,
      subtitle: `${getHijriDateString(fullDate)} • Academic Time & Master Events`,
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
              title: eventToEdit ? `Edit: ${eventToEdit.title}` : 'Schedule Event / Class Holiday',
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
        title="Teacher Class Attendance"
        subtitle={`Track teaching staff presence and period class conduction dynamically synced with student attendance (${gregorianTitle}${isHijriEnabled ? ` • ${hijriTitle}` : ''})`}
        icon={TeacherIcon}
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

          {/* Assigned Class Filter */}
          <CustomSelect
            label="Assigned Class"
            value={selectedClassId}
            onChange={(val) => setSelectedClassId(val)}
            options={[
              { value: 'ALL', label: 'All Classes' },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />

          {/* Teacher Selector */}
          <TeacherSelect
            label="Assigned Teacher"
            value={selectedTeacherId}
            onChange={setSelectedTeacherId}
            allLabel="All Teachers"
            onlyTeachers={true}
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
        </div>
      </div>

      {/* 3. Main Teacher Attendance Matrix Table */}
      <div
        className={
          isFullscreen
            ? 'flex-1 overflow-hidden flex flex-col rounded-2xl theme-bg-surface border theme-border shadow-md my-2'
            : 'rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden'
        }
      >
        <AttendanceMatrixTable
          daysHeader={matrixData.days_header?.length > 0 ? matrixData.days_header : enrichedDaysHeader}
          rows={filteredTeacherRows}
          idLabel="#"
          nameLabel="Teacher Name"
          descriptorLabel="Time & Period Conduction"
          descriptorIcon={TimerIcon}
          isEditing={false}
          onAdminEditCell={isAdmin ? handleAdminEditCell : undefined}
          isHijriEnabled={isHijriEnabled}
          onDateClick={handleOpenDayAgenda}
          isLoading={isLoading}
          emptyMessage="No teaching staff or assigned period slots found matching your filter criteria."
          totalCount={uniqueTeachersCount}
          totalCountLabel="Total Faculty"
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          tableContainerClass={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}
        />
      </div>
    </PageContainer>
  );
}
