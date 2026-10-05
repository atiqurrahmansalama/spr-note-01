import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  MatrixIcon,
  RefreshIcon,
  PrintIcon,
  FullScreenIcon,
  MinimizeIcon,
} from '@/components/ui/Icons';
import PageHeader from '@/components/ui/PageHeader';
import { PageContainer } from '@/components/layout';
import { ClassSelect, GroupSelect, TeacherSelect, DateRangePicker } from '@/components/selectors';
import ActionMenu from '@/components/ui/ActionMenu';
import AttendanceTable, { TakeAttendanceButton, AttendanceDateStepper } from '@/components/common/AttendanceTable';
import { getMonthlyAttendanceMatrix, bulkMarkStudentAttendance } from '@/api/attendance';
import { fetchWithAuth } from '@/utils/authService';
import { useToast } from '@/context/ToastContext';
import { useTenant } from '@/context/TenantContext';
import {
  attendanceFilters,
  attendanceTimingPolicyStore,
  periodCategoriesStore,
} from '@/utils/localStore';
import {
  cycleStatusWithinAllowed,
} from '@/utils/attendanceTimingEngine';
import useAttendanceDateManager from './hooks/useAttendanceDateManager';
import type { ClassAttendanceViewProps } from './types';

export default function ClassAttendanceView({
  classId: propClassId,
  groupId: propGroupId,
  hideHeader = false,
  onStudentClick,
}: ClassAttendanceViewProps) {
  const { showToast } = useToast();
  const { activeTenantId, isMultiTenantAdmin } = useTenant();

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

  // Timing Policy state & live store sync
  const [timingPolicy, setTimingPolicy] = useState(() => attendanceTimingPolicyStore.getPolicy(activeTenantId));

  useEffect(() => {
    let isMounted = true;
    attendanceTimingPolicyStore.fetchRemotePolicy(activeTenantId).then((res) => {
      if (res && isMounted) setTimingPolicy(res);
    });

    const handlePolicyUpdate = (e: any) => {
      if (isMounted) {
        setTimingPolicy(e.detail || attendanceTimingPolicyStore.getPolicy(activeTenantId));
      }
    };

    window.addEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('spr_attendance_timing_policy_updated', handlePolicyUpdate);
    };
  }, [activeTenantId]);

  // Read saved filters once per tenant
  const savedFilters = useMemo(() => {
    return attendanceFilters.getMonthlyFilters(activeTenantId) || {};
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
    enrichedDaysHeader,
    gregorianTitle,
    hijriTitle,
    isHijriEnabled,
    isFullscreen,
    setIsFullscreen,
    stepLabels,
    isAtMinBound,
    isAtMaxBound,
    handleStepBackward,
    handleStepForward,
    handleGoToToday,
    isCurrentPeriodToday,
  } = useAttendanceDateManager({
    activeTenantId,
    moduleType: 'STUDENT',
    isAdmin,
    initialYear: savedFilters.year ? Number(savedFilters.year) : undefined,
    initialMonth: savedFilters.month ? Number(savedFilters.month) : undefined,
    initialStartDate: savedFilters.startDate || '',
    initialEndDate: savedFilters.endDate || '',
  });

  // Class, Group & Teacher State
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => String(propClassId || savedFilters.classId || 'ALL'));
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() => String(propGroupId || savedFilters.groupId || 'ALL'));
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => String(savedFilters.teacherId || 'ALL'));

  // Interactive Attendance Marking Mode
  const [isEditing, setIsEditing] = useState(false);

  // Matrix Data & Loading
  const [matrixData, setMatrixData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  // Persist filters to localStorage (throttled)
  useEffect(() => {
    attendanceFilters.saveMonthlyFilters(activeTenantId, {
      classId: selectedClassId,
      groupId: selectedGroupId,
      teacherId: selectedTeacherId,
      year: selectedYear,
      month: selectedMonth,
      startDate,
      endDate,
      hasExplicitDateChoice: true,
    });
  }, [selectedClassId, selectedGroupId, selectedTeacherId, selectedYear, selectedMonth, startDate, endDate, activeTenantId]);

  // 1. Fetch Classes, Teachers, and Groups on Mount & Tenant Change
  useEffect(() => {
    let isMounted = true;

    const fetchAllMetadata = async () => {
      try {
        const [classRes, staffRes, grpRes] = await Promise.allSettled([
          fetchWithAuth('/api/v1/classes/?page_size=500&all=true'),
          fetchWithAuth('/api/v1/staff/?page_size=500'),
          fetchWithAuth('/api/v1/groups/?page_size=500'),
        ]);

        if (!isMounted) return;

        if (classRes.status === 'fulfilled' && classRes.value.ok) {
          const data = await classRes.value.json();
          const classList = Array.isArray(data) ? data : data.results || [];
          setClasses(classList);

          // Auto-select first class on initial load if no explicit saved filter exists
          if (!propClassId && (!savedFilters.classId || savedFilters.classId === 'ALL') && classList.length > 0) {
            const firstId = String(classList[0].id || classList[0].value || '');
            if (firstId) {
              setSelectedClassId(firstId);
            }
          }
        }

        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const sData = await staffRes.value.json();
          setTeachers(Array.isArray(sData) ? sData : sData.results || []);
        }

        if (grpRes.status === 'fulfilled' && grpRes.value.ok) {
          const gData = await grpRes.value.json();
          setGroups(Array.isArray(gData) ? gData : gData.results || []);
        }
      } catch (err) {
        console.error('Error fetching attendance metadata:', err);
      } finally {
        if (isMounted) {
          setMetadataLoaded(true);
        }
      }
    };

    fetchAllMetadata();

    const handleTenantChanged = () => {
      fetchAllMetadata();
    };
    window.addEventListener('spr_tenant_changed', handleTenantChanged);

    return () => {
      isMounted = false;
      window.removeEventListener('spr_tenant_changed', handleTenantChanged);
    };
  }, [activeTenantId]);

  // 2. Fetch Monthly / Range Attendance Matrix with request cancellation ref
  const activeRequestIdRef = useRef(0);

  const loadMatrix = useCallback(async () => {
    if (!metadataLoaded && !propClassId) {
      return;
    }

    const requestId = ++activeRequestIdRef.current;
    setIsLoading(true);

    try {
      const trackedCategories = periodCategoriesStore.getAttendanceTrackedCategoryCodes(activeTenantId);
      const params: any = {
        institution_id: activeTenantId || undefined,
        class_id: selectedClassId && selectedClassId !== 'ALL' ? selectedClassId : undefined,
        group_id: selectedGroupId && selectedGroupId !== 'ALL' ? selectedGroupId : undefined,
        teacher_id: selectedTeacherId && selectedTeacherId !== 'ALL' ? selectedTeacherId : undefined,
        slot_types: trackedCategories.length > 0 ? trackedCategories.join(',') : undefined,
      };

      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        params.year = selectedYear;
        params.month = selectedMonth;
      }

      const res = await getMonthlyAttendanceMatrix(params);
      if (requestId === activeRequestIdRef.current) {
        setMatrixData(res);
      }
    } catch (err) {
      if (requestId === activeRequestIdRef.current) {
        console.error('Error loading attendance matrix:', err);
        showToast('Failed to load class attendance matrix', 'error');
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    metadataLoaded,
    selectedClassId,
    selectedGroupId,
    selectedTeacherId,
    selectedYear,
    selectedMonth,
    startDate,
    endDate,
    propClassId,
    activeTenantId,
    showToast,
  ]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  const handleDateRangeSelect = useCallback((start: string, end: string) => {
    let safeStart = start;
    let safeEnd = end;

    if (!isAdmin) {
      if (minDate && safeStart && safeStart < minDate) {
        safeStart = minDate;
      }
      if (maxDate && safeEnd && safeEnd > maxDate) {
        safeEnd = maxDate;
      }
    }

    setStartDate(safeStart || '');
    setEndDate(safeEnd || '');
  }, [isAdmin, minDate, maxDate, setStartDate, setEndDate]);

  // Cell status toggling / bulk updating
  const handleCellClick = useCallback(async (studentId: string | number, date: string, currentStatus?: string) => {
    if (!isEditing) return;

    const dayMeta = enrichedDaysHeader.find((d) => d.date === date);
    if (dayMeta?.is_disabled) {
      showToast(`Attendance is disabled for ${date} (${dayMeta.holiday_title || 'Restricted Event'}).`, 'warning');
      return;
    }

    const nextStatus = cycleStatusWithinAllowed(currentStatus, timingPolicy);

    // Optimistic UI Update
    setMatrixData((prev: any) => {
      if (!prev || !prev.students_matrix) return prev;
      const updatedRows = prev.students_matrix.map((row: any) => {
        const rStudentId = row.student_id || row.id;
        if (String(rStudentId) === String(studentId)) {
          return {
            ...row,
            daily_statuses: {
              ...row.daily_statuses,
              [date]: nextStatus,
            },
          };
        }
        return row;
      });
      return { ...prev, students_matrix: updatedRows };
    });

    try {
      await bulkMarkStudentAttendance({
        date,
        records: [{ student_id: studentId, status: nextStatus }],
      });
    } catch (err) {
      console.error('Failed to mark student attendance:', err);
      showToast('Failed to save attendance change', 'error');
      loadMatrix();
    }
  }, [isEditing, enrichedDaysHeader, timingPolicy, showToast, loadMatrix]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev: boolean) => !prev);
  }, [setIsFullscreen]);

  const actionMenuActions = useMemo(() => [
    {
      label: isFullscreen ? 'Exit Full Screen' : 'Full Screen',
      icon: isFullscreen ? MinimizeIcon : FullScreenIcon,
      onClick: handleToggleFullscreen,
    },
    {
      label: 'Print Register',
      icon: PrintIcon,
      onClick: () => window.print(),
    },
    {
      label: 'Refresh Data',
      icon: RefreshIcon,
      onClick: loadMatrix,
    },
  ], [isFullscreen, handleToggleFullscreen, loadMatrix]);

  const toggleEditing = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  return (
    <PageContainer isEmbedded={hideHeader} className="space-y-4">
      {/* 1. Header Toolbar */}
      {!hideHeader && (
        <PageHeader
          title="Class Attendance"
          subtitle={
            isHijriEnabled
              ? `${hijriTitle} (${gregorianTitle})`
              : `${gregorianTitle}`
          }
          icon={MatrixIcon}
        >
          <div className="flex items-center gap-2">
            <TakeAttendanceButton
              title="Take / Edit Attendance"
              isEditing={isEditing}
              onToggle={toggleEditing}
            />
            <ActionMenu actions={actionMenuActions} />
          </div>
        </PageHeader>
      )}

      {/* 2. Stepper & Filter Controls */}
      <div className="theme-bg-surface p-4 rounded-xl border theme-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <AttendanceDateStepper
            stepLabels={stepLabels}
            isAtMinBound={isAtMinBound}
            isAtMaxBound={isAtMaxBound}
            isToday={isCurrentPeriodToday}
            onStepBackward={handleStepBackward}
            onStepForward={handleStepForward}
            onToday={handleGoToToday}
          />

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              minDate={minDate}
              maxDate={maxDate}
              onRangeSelect={handleDateRangeSelect}
              onReset={handleResetDate}
              isHijriEnabled={isHijriEnabled}
              placeholder="Select Date Range"
            />
          </div>
        </div>

        {/* Dynamic Class, Group & Teacher Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t theme-border">
          <ClassSelect
            classes={classes}
            value={selectedClassId}
            onChange={setSelectedClassId}
            allowAll={true}
            allLabel="All Classes"
          />
          <GroupSelect
            groups={groups}
            classId={selectedClassId}
            value={selectedGroupId}
            onChange={setSelectedGroupId}
            allowAll={true}
            allLabel="All Sections / Groups"
          />
          <TeacherSelect
            teachers={teachers}
            value={selectedTeacherId}
            onChange={setSelectedTeacherId}
            allowAll={true}
            allLabel="All Teachers"
          />
        </div>
      </div>

      {/* 3. Monthly / Period Attendance Table */}
      <div className="theme-bg-surface rounded-xl border theme-border shadow-sm overflow-hidden">
        <AttendanceTable
          matrixData={matrixData}
          daysHeader={enrichedDaysHeader}
          rows={matrixData?.students_matrix || []}
          isLoading={isLoading}
          isEditing={isEditing}
          onToggleCell={handleCellClick}
          onStudentClick={onStudentClick}
          isHijriEnabled={isHijriEnabled}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>
    </PageContainer>
  );
}
