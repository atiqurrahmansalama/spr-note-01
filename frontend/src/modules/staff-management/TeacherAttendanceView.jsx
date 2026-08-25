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
  TeacherIcon,
  ClassIcon,
  SearchIcon,
  PrinterIcon,
  CalendarIcon,
  CheckIcon,
} from '../../components/ui/Icons';
import CustomSelect from '../../components/ui/CustomSelect';
import CustomInput from '../../components/ui/CustomInput';
import { DateRangePicker } from '../../components/selectors';
import PageHeader from '../../components/ui/PageHeader';
import { PageContainer } from '../../components/layout';
import { cycleAttendanceStatus } from '../../constants/attendanceConstants';

/**
 * Teacher Attendance View (Teaching Staff Class Conduction Register)
 * Tracks teaching staff class conduction, period presence, and academic attendance.
 * Powered by universal AttendanceMatrixTable and useAttendanceDateManager.
 */
export default function TeacherAttendanceView() {
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
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [departments, setDepartments] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // UI Modes
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Staff & Attendance Records State
  const [teachersList, setTeachersList] = useState([]);
  const [teacherRecords, setTeacherRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(`spr_teacher_attendance_${activeTenantId || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Load / Update Teacher Records on activeTenantId change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`spr_teacher_attendance_${activeTenantId || 'default'}`);
      setTeacherRecords(saved ? JSON.parse(saved) : {});
    } catch {
      setTeacherRecords({});
    }
  }, [activeTenantId]);

  // Persist Teacher Records
  useEffect(() => {
    if (activeTenantId && Object.keys(teacherRecords).length > 0) {
      try {
        localStorage.setItem(`spr_teacher_attendance_${activeTenantId}`, JSON.stringify(teacherRecords));
      } catch (err) {
        console.warn('Failed to save teacher attendance records:', err);
      }
    }
  }, [teacherRecords, activeTenantId]);

  // 1. Fetch Metadata (Classes, Departments, Teaching Staff)
  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        setIsLoading(true);
        const [clsRes, deptRes, staffRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/'),
          fetchWithAuth('/api/v1/departments/'),
          fetchWithAuth('/api/v1/staff/?page_size=500'),
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

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          const list = Array.isArray(sData) ? sData : sData.results || [];
          const teachingOnly = list.filter(
            (s) =>
              s.is_teaching_staff ||
              s.role_type === 'TEACHER' ||
              s.department_name?.toLowerCase().includes('academic') ||
              s.department_name?.toLowerCase().includes('quran') ||
              s.department_name?.toLowerCase().includes('arabic') ||
              s.designation?.toLowerCase().includes('teacher') ||
              s.designation?.toLowerCase().includes('ustadh') ||
              s.designation?.toLowerCase().includes('muallim')
          );
          setTeachersList(teachingOnly.length > 0 ? teachingOnly : list);
        }
      } catch (err) {
        console.error('Error fetching teacher metadata:', err);
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

  // Filtered Teachers List
  const filteredTeachers = useMemo(() => {
    return teachersList.filter((t) => {
      if (selectedDeptId !== 'ALL' && String(t.department_id || t.department) !== String(selectedDeptId)) {
        return false;
      }
      if (selectedClassId !== 'ALL' && t.assigned_class_id && String(t.assigned_class_id) !== String(selectedClassId)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (t.name || t.user_name || '').toLowerCase();
        const empId = (t.employee_id || '').toLowerCase();
        const dept = (t.department_name || '').toLowerCase();
        const desig = (t.designation || '').toLowerCase();
        if (!name.includes(q) && !empId.includes(q) && !dept.includes(q) && !desig.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [teachersList, selectedDeptId, selectedClassId, searchQuery]);

  // Toggle Status Cell Handler (Reusable helper)
  const handleToggleCell = (teacherId, dateStr, currentStatus) => {
    const key = `${teacherId}_${dateStr}`;
    const nextStatus = cycleAttendanceStatus(currentStatus);

    setTeacherRecords((prev) => {
      const updated = { ...prev };
      if (nextStatus) {
        updated[key] = nextStatus;
      } else {
        delete updated[key];
      }
      return updated;
    });
  };

  // Transform Teachers into Normalized Matrix Rows for AttendanceMatrixTable
  const teacherRows = useMemo(() => {
    return filteredTeachers.map((teacher) => {
      const dailyStatuses = {};
      let pCount = 0;
      let lCount = 0;
      let aCount = 0;
      let hCount = 0;
      let lvCount = 0;

      enrichedDaysHeader.forEach((d) => {
        const st = teacherRecords[`${teacher.id}_${d.date}`];
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
        id: teacher.id,
        roll_number: teacher.employee_id || `T-${String(teacher.id).padStart(3, '0')}`,
        name: teacher.name || teacher.user_name || 'Teacher',
        sub_title: teacher.designation || 'Faculty',
        department_name: teacher.assigned_class_name || teacher.department_name || 'General',
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
  }, [filteredTeachers, enrichedDaysHeader, teacherRecords]);

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalLeave = 0;

    teacherRows.forEach((r) => {
      totalPresent += r.totals.present;
      totalLate += r.totals.late;
      totalAbsent += r.totals.absent;
      totalHalfDay += r.totals.half_day || 0;
      totalLeave += r.totals.leave || 0;
    });

    const totalConducted = totalPresent + totalLate + totalHalfDay * 0.5;
    const recordedTotal = totalPresent + totalLate + totalAbsent + totalHalfDay + totalLeave;
    const conductionRate = recordedTotal > 0 ? Math.round((totalConducted / recordedTotal) * 100) : 100;

    return {
      totalTeachers: teacherRows.length,
      totalPresent,
      totalLate,
      totalAbsent,
      totalLeave,
      conductionRate,
    };
  }, [teacherRows]);

  // Open Day Agenda Drawer
  const handleOpenDayAgenda = (dateStr) => {
    const fullDate = typeof dateStr === 'object' ? dateStr.date : dateStr;
    const matchedDay = enrichedDaysHeader.find((d) => d.date === fullDate);
    const matchedEvt = matchedDay?.calendar_event;

    openRightSidebar({
      title: `Teacher Schedule: ${fullDate}`,
      subtitle: `${getHijriDateString(fullDate)} • Academic Time & Master Events`,
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
        title="Teacher Class Attendance"
        subtitle={`Track teaching staff presence and period class conduction (${gregorianTitle}${isHijriEnabled ? ` • ${hijriTitle}` : ''})`}
        icon={TeacherIcon}
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
              title="Print Teacher Attendance Register"
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

          {/* Teacher Search */}
          <CustomInput
            label="Search Teacher"
            placeholder="Name, ID or Subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<SearchIcon className="w-4 h-4 theme-text-secondary" />}
          />
        </div>
      </div>

      {/* 3. Main Teacher Attendance Matrix Table (Reusing AttendanceMatrixTable) */}
      <div
        className={
          isFullscreen
            ? 'flex-1 overflow-hidden flex flex-col rounded-2xl theme-bg-surface border theme-border shadow-md my-2'
            : 'rounded-3xl theme-bg-surface border theme-border shadow-xs overflow-hidden'
        }
      >
        <AttendanceMatrixTable
          daysHeader={enrichedDaysHeader}
          rows={teacherRows}
          idLabel="ID"
          nameLabel="Teacher Name"
          descriptorLabel="Department / Class"
          descriptorIcon={ClassIcon}
          isEditing={isEditing}
          onToggleCell={handleToggleCell}
          isHijriEnabled={isHijriEnabled}
          onDateClick={handleOpenDayAgenda}
          isLoading={isLoading}
          emptyMessage="No teaching staff found matching your filter criteria."
          totalCount={filteredTeachers.length}
          totalCountLabel="Total Teachers"
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          tableContainerClass={isFullscreen ? "flex-1 overflow-auto max-h-[calc(100vh-130px)] w-full scrollbar-none" : "overflow-x-auto max-h-[75vh] scrollbar-none"}
        />
      </div>
    </PageContainer>
  );
}
