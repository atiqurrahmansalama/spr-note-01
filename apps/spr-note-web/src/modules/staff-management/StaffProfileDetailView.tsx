import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  TeacherIcon,
  AttendanceIcon,
  LeaveIcon,
  DutyIcon,
  PhoneIcon,
  MailIcon,
  ClassIcon,
  BuildingOfficeIcon,
  BankIcon,
  EditIcon,
  RefreshIcon,
  CalendarIcon,
  CloseIcon,
  PlusIcon,
  ChevronLeftIcon,
  WhatsAppIcon,
  SparklesIcon,
  CheckCircleIcon,
} from '../../components/ui/Icons';
import {
  getStaffDetail,
  getTeacherAssignments,
  getStaffDuties,
  getStaffAttendance,
  getLeaveRequests,
  applyLeave,
} from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { PageContainer } from '../../components/layout';
import TabSwitcher from '../../components/ui/TabSwitcher';
import MetricsGrid from '../../components/ui/MetricsGrid';
import ActionMenu from '../../components/ui/ActionMenu';
import StaffDrawerForm from './StaffDrawerForm';
import TeacherAssignmentDrawerForm from './TeacherAssignmentDrawerForm';
import GeneralDutyDrawerForm from './GeneralDutyDrawerForm';
import type {
  StaffMember,
  StaffAttendanceRecord,
  StaffLeaveRequest,
  LeaveType,
} from '../../types/staff';

interface TeacherAssignmentItem {
  id: string | number;
  class_name: string;
  role_in_class?: string;
  group_name?: string;
  session_name?: string;
}

interface GeneralDutyItem {
  id: string | number;
  duty_title: string;
  duty_description?: string;
  priority?: string;
  effective_from?: string;
  effective_to?: string;
}

export const StaffProfileDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [assignments, setAssignments] = useState<TeacherAssignmentItem[]>([]);
  const [duties, setDuties] = useState<GeneralDutyItem[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<StaffAttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Leave Modal State
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState<boolean>(false);
  const [leaveForm, setLeaveForm] = useState<{
    leave_type: LeaveType;
    start_date: string;
    end_date: string;
    reason: string;
  }>({
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState<boolean>(false);

  const loadStaffData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data: StaffMember = await getStaffDetail(id);
      setStaff(data);

      const [assignRes, dutyRes, attRes, leaveRes] = await Promise.allSettled([
        data.staff_type === 'TEACHING'
          ? getTeacherAssignments({ teacher: id })
          : Promise.resolve([]),
        data.staff_type !== 'TEACHING'
          ? getStaffDuties({ staff: id })
          : Promise.resolve([]),
        getStaffAttendance({ staff: id }),
        getLeaveRequests({ staff: id }),
      ]);

      if (assignRes.status === 'fulfilled') {
        const aVal = assignRes.value;
        setAssignments(Array.isArray(aVal) ? aVal : aVal?.results || []);
      }

      if (dutyRes.status === 'fulfilled') {
        const dVal = dutyRes.value;
        setDuties(Array.isArray(dVal) ? dVal : dVal?.results || []);
      }

      if (attRes.status === 'fulfilled') {
        const attVal = attRes.value;
        setAttendanceLogs(Array.isArray(attVal) ? attVal : attVal?.results || []);
      }

      if (leaveRes.status === 'fulfilled') {
        const lVal = leaveRes.value;
        setLeaves(Array.isArray(lVal) ? lVal : lVal?.results || []);
      }
    } catch (err: any) {
      console.error('Error fetching staff profile details:', err);
      showToast(err.message || 'Failed to load staff details', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    if (id) loadStaffData();
  }, [id, loadStaffData]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      showToast('Please provide a reason for the leave.', 'error');
      return;
    }
    if (!staff?.id) return;

    setIsSubmittingLeave(true);
    try {
      const payload = {
        staff: staff.id,
        leave_type: leaveForm.leave_type,
        start_date: leaveForm.start_date,
        end_date: leaveForm.end_date,
        reason: leaveForm.reason.trim(),
      };

      await applyLeave(payload);
      showToast('Leave application submitted successfully!', 'success');
      setIsLeaveModalOpen(false);
      setLeaveForm({
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      loadStaffData();
    } catch (err: any) {
      showToast(err.message || 'Failed to submit leave', 'error');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleOpenEditDrawer = () => {
    if (!staff) return;
    openRightSidebar({
      title: `Edit ${staff.user_name || 'Staff'} Profile`,
      subtitle: 'Modify designation, qualifications, credentials, and hierarchy rank',
      width: 'lg',
      content: (
        <StaffDrawerForm
          key={`edit_staff_profile_${staff.id}`}
          staffData={staff}
          onSaved={() => {
            showToast('Profile updated!', 'success');
            loadStaffData();
            closeRightSidebar();
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  const handleOpenAssignDrawer = () => {
    if (!staff) return;
    openRightSidebar({
      title: 'Class & Subject Assignments',
      subtitle: `Manage assigned academic classes and groups for ${staff.user_name || staff.employee_id}`,
      width: 'md',
      content: (
        <TeacherAssignmentDrawerForm
          key={`assign_drawer_${staff.id}`}
          teacher={staff}
          onUpdated={() => {
            loadStaffData();
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  const handleOpenDutyDrawer = () => {
    if (!staff) return;
    openRightSidebar({
      title: 'General & Campus Duties',
      subtitle: `Assign residential, dining, or gate duties for ${staff.user_name || staff.employee_id}`,
      width: 'md',
      content: (
        <GeneralDutyDrawerForm
          key={`duty_drawer_${staff.id}`}
          staff={staff}
          onUpdated={() => {
            loadStaffData();
          }}
          onCancel={() => closeRightSidebar()}
        />
      ),
    });
  };

  // Metrics calculation
  const attendanceStats = useMemo(() => {
    const total = attendanceLogs.length;
    const present = attendanceLogs.filter((l) => l.status === 'PRESENT').length;
    const late = attendanceLogs.filter((l) => l.status === 'LATE').length;
    const leave = attendanceLogs.filter((l) => l.status === 'ON_LEAVE' || l.status === 'LEAVE').length;
    const absent = attendanceLogs.filter((l) => l.status === 'ABSENT').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { total, present, late, leave, absent, rate };
  }, [attendanceLogs]);

  const leaveStats = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l) => l.status === 'APPROVED').length;
    const pending = leaves.filter((l) => l.status === 'PENDING').length;
    const rejected = leaves.filter((l) => l.status === 'REJECTED').length;
    return { total, approved, pending, rejected };
  }, [leaves]);

  if (isLoading) {
    return (
      <div className="p-12 text-center theme-text-secondary flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <RefreshIcon className="w-8 h-8 theme-accent animate-spin" />
        <span className="text-sm font-medium">Loading staff profile...</span>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-lg font-bold theme-text-primary">Staff Profile Not Found</h2>
        <button
          onClick={() => navigate('/staff/roster')}
          className="inline-flex items-center gap-1.5 px-4 py-2 theme-bg-app hover:theme-bg-elevated/40 theme-text-primary rounded-2xl text-xs font-semibold cursor-pointer border-0 shadow-xs"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          <span>Return to Staff Roster</span>
        </button>
      </div>
    );
  }

  const isTeaching = staff.staff_type === 'TEACHING';
  const displayName = staff.user_name || staff.name_en || staff.employee_id;
  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';
  const phone = staff.phone_number || staff.emergency_contact;

  const tabs = [
    { id: 'overview', label: 'Overview & Profile', icon: TeacherIcon },
    ...(isTeaching
      ? [{ id: 'classes', label: 'Assigned Classes', badge: assignments.length, icon: ClassIcon }]
      : [{ id: 'duties', label: 'Operational Duties', badge: duties.length, icon: DutyIcon }]),
    { id: 'attendance', label: 'Attendance Logs', badge: attendanceLogs.length, icon: AttendanceIcon },
    { id: 'payroll', label: 'Payroll & Banking', icon: BankIcon },
    { id: 'leaves', label: 'Leaves Record', badge: leaves.length, icon: LeaveIcon },
  ];

  const profileActionItems = [
    {
      label: 'Edit Profile',
      icon: EditIcon,
      onClick: handleOpenEditDrawer,
    },
    ...(isTeaching
      ? [
          {
            label: 'Assign Classes',
            icon: ClassIcon,
            onClick: handleOpenAssignDrawer,
          },
        ]
      : [
          {
            label: 'Assign Duties',
            icon: DutyIcon,
            onClick: handleOpenDutyDrawer,
          },
        ]),
    {
      label: 'Apply Leave',
      icon: LeaveIcon,
      onClick: () => setIsLeaveModalOpen(true),
    },
    ...(phone
      ? [
          {
            label: 'WhatsApp Message',
            icon: WhatsAppIcon,
            onClick: () => {
              const num = phone.replace(/[^\d]/g, '');
              window.open(`https://wa.me/${num}`, '_blank');
            },
          },
        ]
      : []),
    { divider: true },
    {
      label: 'Back to Staff Roster',
      icon: ChevronLeftIcon,
      onClick: () => navigate('/staff/roster'),
    },
  ];

  return (
    <PageContainer maxWidth="6xl">
      {/* 1. Hero Profile Card (Borderless Soft-Surface Standard) */}
      <div className="relative rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          {/* Avatar + Only Name, Role & ID */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xs shrink-0 theme-bg-accent-soft theme-accent border-0 overflow-hidden">
              {staff.avatar ? (
                <img
                  src={staff.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="space-y-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight theme-text-primary truncate">
                {displayName}
              </h1>
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium theme-text-secondary">
                <span className="theme-accent font-semibold">
                  {staff.staff_type === 'TEACHING'
                    ? 'Teaching Faculty'
                    : staff.staff_type === 'ADMIN'
                    ? 'Administration'
                    : staff.staff_type || 'Faculty'}
                </span>
                <span className="opacity-40">•</span>
                <span className="font-mono theme-text-primary font-semibold">
                  {staff.employee_id || 'ID: —'}
                </span>
              </div>
            </div>
          </div>

          {/* Top Right: 3-Dot ActionMenu & Quick Contacts */}
          <div className="flex items-center gap-2 shrink-0">
            {phone && (
              <div className="hidden sm:flex items-center gap-1.5">
                <a
                  href={`tel:${phone}`}
                  className="p-2.5 rounded-2xl theme-bg-app hover:theme-bg-accent-soft hover:theme-accent theme-text-secondary transition-all border-0 shadow-xs"
                  title={`Call ${phone}`}
                >
                  <PhoneIcon className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-2xl theme-bg-app hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-all border-0 shadow-xs"
                  title="WhatsApp Chat"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              </div>
            )}
            <ActionMenu items={profileActionItems} align="right" />
          </div>
        </div>
      </div>

      {/* 3. Reusable Enterprise Tab Switcher */}
      <TabSwitcher
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 4. Tab Contents */}

      {/* TAB 1: Overview & Profile */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <MetricsGrid
            cols={4}
            items={[
              {
                label: 'Employment Category',
                value: staff.staff_type || 'Faculty',
                icon: TeacherIcon,
                subLabel: staff.employment_status || 'Active',
                color: 'default',
              },
              {
                label: isTeaching ? 'Active Classes' : 'Active Duties',
                value: isTeaching ? assignments.length : duties.length,
                icon: isTeaching ? ClassIcon : DutyIcon,
                subLabel: isTeaching ? 'Assigned teaching sessions' : 'Campus duties',
                color: 'accent',
              },
              {
                label: 'Attendance Rate',
                value: `${attendanceStats.rate}%`,
                icon: SparklesIcon,
                subLabel: `${attendanceStats.present} present of ${attendanceStats.total} days`,
                color: 'emerald',
              },
              {
                label: 'Leave Requests',
                value: leaveStats.total,
                icon: LeaveIcon,
                subLabel: `${leaveStats.approved} approved, ${leaveStats.pending} pending`,
                color: leaveStats.pending > 0 ? 'amber' : 'default',
              },
            ]}
          />

          <div className="@container grid grid-cols-1 @[720px]:grid-cols-2 gap-4 sm:gap-6">
            {/* Employment Details */}
            <div className="p-6 rounded-3xl theme-bg-surface border-0 shadow-xs space-y-4">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-2 pb-2 border-b theme-border-subtle">
                <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
                <span>Employment Details</span>
              </h3>
              <div className="space-y-1 text-xs">
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Employee ID</span>
                  <span className="font-mono theme-accent font-bold">{staff.employee_id || '—'}</span>
                </div>
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Category</span>
                  <span className="theme-text-primary font-medium">{staff.staff_type || 'Faculty'}</span>
                </div>
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Designation</span>
                  <span className="theme-text-primary font-semibold">{staff.designation || 'Staff'}</span>
                </div>
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Department</span>
                  <span className="theme-text-primary">{staff.department_name || 'General Department'}</span>
                </div>
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Joining Date</span>
                  <span className="theme-text-primary">{staff.joining_date || 'N/A'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="theme-text-secondary">Employment Status</span>
                  <span className="theme-text-primary font-semibold">{staff.employment_status || 'Active'}</span>
                </div>
              </div>
            </div>

            {/* Academic & Professional Profile */}
            <div className="p-6 rounded-3xl theme-bg-surface border-0 shadow-xs space-y-4">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-2 pb-2 border-b theme-border-subtle">
                <TeacherIcon className="w-4 h-4 theme-accent" />
                <span>{isTeaching ? 'Academic & Faculty Profile' : 'Operational Scope'}</span>
              </h3>
              <div className="space-y-1 text-xs">
                {isTeaching ? (
                  <>
                    <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                      <span className="theme-text-secondary">Highest Degree</span>
                      <span className="theme-text-primary font-medium">
                        {staff.teacher_detail?.highest_degree || 'N/A'}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                      <span className="theme-text-secondary">Specialization</span>
                      <span className="theme-text-primary font-medium">
                        {staff.teacher_detail?.specialization || 'General Curriculum'}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                      <span className="theme-text-secondary">Max Daily Teaching Periods</span>
                      <span className="theme-text-primary font-mono font-bold">
                        {staff.teacher_detail?.max_daily_periods || 4} Periods
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                      <span className="theme-text-secondary">Report Review Authority</span>
                      <span
                        className={
                          staff.teacher_detail?.can_review_reports
                            ? 'theme-accent font-semibold'
                            : 'theme-text-secondary'
                        }
                      >
                        {staff.teacher_detail?.can_review_reports ? 'Authorized' : 'Standard'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                      <span className="theme-text-secondary">Campus Zone</span>
                      <span className="theme-text-primary font-medium">
                        {staff.general_detail?.assigned_zone || 'Campus Wide'}
                      </span>
                    </div>
                    <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                      <span className="theme-text-secondary">Shift Schedule</span>
                      <span className="theme-text-primary font-mono">
                        {staff.general_detail?.shift_type || 'MORNING'}
                      </span>
                    </div>
                  </>
                )}
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">National ID (NID)</span>
                  <span className="font-mono theme-text-primary">{staff.nid_no || 'N/A'}</span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="theme-text-secondary">Blood Group</span>
                  <span className="font-mono theme-accent font-bold">
                    {staff.blood_group || 'Not Specified'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Academic Classes */}
      {activeTab === 'classes' && isTeaching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold theme-text-primary">Assigned Classes &amp; Subjects</h3>
              <p className="text-xs theme-text-secondary">Classes, groups, and academic sessions assigned to this teacher</p>
            </div>
            <button
              onClick={handleOpenAssignDrawer}
              className="flex items-center gap-1.5 px-3.5 py-2 theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold rounded-2xl cursor-pointer shadow-xs active:scale-98 border-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Assign Class</span>
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-3xl border-0 shadow-xs theme-text-secondary text-xs">
              No classes currently assigned to this teacher. Click "Assign Class" to link academic sessions.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <div key={a.id} className="p-5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-3 hover:theme-bg-elevated/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold theme-text-primary">{a.class_name}</div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent font-semibold border-0">
                      {a.role_in_class?.replace('_', ' ') || 'Instructor'}
                    </span>
                  </div>
                  <div className="text-xs theme-text-secondary space-y-1">
                    <div>
                      Group: <span className="theme-text-primary font-medium">{a.group_name || 'All Groups in Class'}</span>
                    </div>
                    <div>
                      Academic Session: <span className="theme-text-primary font-medium">{a.session_name || 'Current'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2 (Alt): Operational Duties */}
      {activeTab === 'duties' && !isTeaching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold theme-text-primary">Assigned Operational Duties</h3>
              <p className="text-xs theme-text-secondary">Campus, residential, dining, or administrative duties</p>
            </div>
            <button
              onClick={handleOpenDutyDrawer}
              className="flex items-center gap-1.5 px-3.5 py-2 theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold rounded-2xl cursor-pointer shadow-xs active:scale-98 border-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Assign Duty</span>
            </button>
          </div>

          {duties.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-3xl border-0 shadow-xs theme-text-secondary text-xs">
              No operational tasks assigned to this staff member. Click "Assign Duty" to delegate responsibilities.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {duties.map((d) => (
                <div key={d.id} className="p-5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-3 hover:theme-bg-elevated/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold theme-text-primary">{d.duty_title}</div>
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full theme-bg-app theme-text-secondary font-semibold border-0">
                      {d.priority || 'NORMAL'}
                    </span>
                  </div>
                  {d.duty_description && (
                    <p className="text-xs theme-text-secondary">{d.duty_description}</p>
                  )}
                  <div className="text-[11px] theme-text-secondary font-mono">
                    From: {d.effective_from || '—'} {d.effective_to ? `→ ${d.effective_to}` : '(Ongoing)'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Attendance History */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Attendance Stats Cards */}
          <MetricsGrid
            cols={4}
            items={[
              {
                label: 'Total Logs',
                value: attendanceStats.total,
                icon: CalendarIcon,
                subLabel: 'Recorded days',
                color: 'default',
              },
              {
                label: 'Present',
                value: attendanceStats.present,
                icon: CheckCircleIcon,
                subLabel: 'On-time attendance',
                color: 'emerald',
              },
              {
                label: 'Late Arrivals',
                value: attendanceStats.late,
                icon: AttendanceIcon,
                subLabel: 'Delayed check-in',
                color: attendanceStats.late > 0 ? 'amber' : 'default',
              },
              {
                label: 'Leaves / Absent',
                value: attendanceStats.leave + attendanceStats.absent,
                icon: LeaveIcon,
                subLabel: 'Approved leaves or absent',
                color: 'default',
              },
            ]}
          />

          <div className="flex items-center justify-between pt-2">
            <h3 className="text-sm font-bold theme-text-primary">Daily Attendance Punch Records</h3>
            <button
              onClick={() => loadStaffData()}
              className="flex items-center gap-1.5 text-xs theme-accent font-semibold hover:underline cursor-pointer border-0 bg-transparent"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-3xl border-0 shadow-xs theme-text-secondary text-xs">
              No attendance records logged for this employee yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-3xl theme-bg-surface border-0 shadow-xs">
              <table className="w-full text-left text-xs theme-text-primary">
                <thead className="theme-bg-app theme-text-secondary text-[11px] uppercase tracking-wider border-0">
                  <tr>
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">In Time</th>
                    <th className="py-3 px-4 font-bold">Out Time</th>
                    <th className="py-3 px-4 font-bold">Source</th>
                    <th className="py-3 px-4 font-bold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border-subtle font-mono">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:theme-bg-elevated/30 transition-colors">
                      <td className="py-3 px-4 font-semibold theme-text-primary">{log.date}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              log.status === 'PRESENT'
                                ? 'theme-bg-accent'
                                : log.status === 'LATE'
                                ? 'bg-amber-500'
                                : log.status === 'ON_LEAVE'
                                ? 'theme-bg-subtle'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span
                            className={`text-xs font-semibold ${
                              log.status === 'PRESENT'
                                ? 'theme-accent'
                                : log.status === 'LATE'
                                ? 'text-amber-500'
                                : log.status === 'ON_LEAVE'
                                ? 'theme-text-secondary'
                                : 'text-rose-500'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{log.in_time || '—'}</td>
                      <td className="py-3 px-4">{log.out_time || '—'}</td>
                      <td className="py-3 px-4 theme-text-secondary font-sans">{log.source || 'Manual'}</td>
                      <td className="py-3 px-4 theme-text-secondary font-sans">{log.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Payroll & Banking */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          <div className="@container grid grid-cols-1 @[720px]:grid-cols-2 gap-4 sm:gap-6">
            {/* Salary Structure Card */}
            <div className="p-6 rounded-3xl theme-bg-surface border-0 shadow-xs space-y-4">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-2 pb-2 border-b theme-border-subtle">
                <BankIcon className="w-4 h-4 theme-accent" />
                <span>Salary &amp; Compensation</span>
              </h3>
              <div className="space-y-1 text-xs">
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Compensation Type</span>
                  <span className="theme-text-primary font-semibold">{staff.salary_type || 'MONTHLY_FIXED'}</span>
                </div>
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Base Salary</span>
                  <span className="theme-accent font-mono font-bold text-sm">
                    BDT {Number(staff.base_salary || 0).toLocaleString()}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="theme-text-secondary">Disbursement Status</span>
                  <span className="theme-text-primary font-medium">Regular Institutional Payroll</span>
                </div>
              </div>
            </div>

            {/* Official Banking Setup Card */}
            <div className="p-6 rounded-3xl theme-bg-surface border-0 shadow-xs space-y-4">
              <h3 className="text-xs font-bold theme-text-secondary uppercase tracking-wider flex items-center gap-2 pb-2 border-b theme-border-subtle">
                <BuildingOfficeIcon className="w-4 h-4 theme-accent" />
                <span>Banking Credentials</span>
              </h3>
              <div className="space-y-1 text-xs">
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Bank Name</span>
                  <span className="theme-text-primary font-semibold">{staff.bank_name || 'Not Provided'}</span>
                </div>
                <div className="py-2 flex items-center justify-between border-b theme-border-subtle">
                  <span className="theme-text-secondary">Account Number</span>
                  <span className="font-mono theme-text-primary font-semibold">
                    {staff.bank_account_no || 'Not Provided'}
                  </span>
                </div>
                <div className="py-2 flex items-center justify-between">
                  <span className="theme-text-secondary">Mobile Banking (MFS)</span>
                  <span className="font-mono theme-accent font-semibold">
                    {staff.mobile_banking_no || 'Not Provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Leaves Record */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          {/* Leaves Summary Metrics */}
          <MetricsGrid
            cols={3}
            items={[
              {
                label: 'Total Requests',
                value: leaveStats.total,
                icon: LeaveIcon,
                subLabel: 'Submitted applications',
                color: 'default',
              },
              {
                label: 'Approved Leaves',
                value: leaveStats.approved,
                icon: CheckCircleIcon,
                subLabel: 'Authorized by admin',
                color: 'emerald',
              },
              {
                label: 'Pending Review',
                value: leaveStats.pending,
                icon: CalendarIcon,
                subLabel: 'Awaiting administrative approval',
                color: leaveStats.pending > 0 ? 'amber' : 'default',
              },
            ]}
          />

          <div className="flex items-center justify-between pt-2">
            <div>
              <h3 className="text-sm font-bold theme-text-primary">Submitted Leave Requests</h3>
              <p className="text-xs theme-text-secondary">History of casual, sick, and emergency leave applications</p>
            </div>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 theme-bg-accent theme-accent-text hover:opacity-95 text-xs font-bold rounded-2xl cursor-pointer shadow-xs active:scale-98 border-0"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          </div>

          {leaves.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-3xl border-0 shadow-xs theme-text-secondary text-xs">
              No leave applications recorded for this staff member. Click "Apply Leave" to submit a request.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {leaves.map((l) => (
                <div key={l.id} className="p-5 rounded-2xl theme-bg-surface border-0 shadow-xs space-y-3 hover:theme-bg-elevated/20 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold theme-text-primary uppercase">{l.leave_type} Leave</span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          l.status === 'APPROVED'
                            ? 'theme-bg-accent'
                            : l.status === 'REJECTED'
                            ? 'bg-rose-500'
                            : 'bg-amber-500'
                        }`}
                      />
                      <span
                        className={`text-[11px] font-bold ${
                          l.status === 'APPROVED'
                            ? 'theme-accent'
                            : l.status === 'REJECTED'
                            ? 'text-rose-500'
                            : 'text-amber-500'
                        }`}
                      >
                        {l.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs theme-text-secondary">
                    Duration: <span className="theme-text-primary font-mono font-semibold">{l.duration_days} Day(s)</span> ({l.start_date} to {l.end_date})
                  </div>
                  <p className="text-xs theme-text-primary italic">"{l.reason}"</p>
                  {l.admin_remarks && (
                    <div className="text-[11px] theme-text-secondary pt-2 border-t theme-border-subtle">
                      <span className="font-medium">Remarks by {l.approved_by_name || 'Admin'}:</span>{' '}
                      <span className="theme-text-primary">{l.admin_remarks}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal (Borderless Soft-Surface Standard) */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl theme-bg-surface border-0 p-6 space-y-5 shadow-2xl theme-text-primary">
            <div className="flex items-center justify-between border-b theme-border-subtle pb-3">
              <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                <LeaveIcon className="w-4 h-4 theme-accent" />
                <span>Apply for Staff Leave</span>
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="theme-text-secondary hover:theme-text-primary cursor-pointer border-0 bg-transparent p-1"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                  Leave Type
                </label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, leave_type: e.target.value as LeaveType })
                  }
                  className="w-full px-3.5 py-2.5 theme-bg-app rounded-xl text-xs theme-text-primary focus:outline-none border-0 cursor-pointer shadow-xs"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, start_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 theme-bg-app rounded-xl text-xs theme-text-primary focus:outline-none border-0 cursor-pointer shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, end_date: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 theme-bg-app rounded-xl text-xs theme-text-primary focus:outline-none border-0 cursor-pointer shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-secondary mb-1.5">
                  Reason for Leave
                </label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Explain reason for leave..."
                  className="w-full px-3.5 py-2.5 theme-bg-app rounded-xl text-xs theme-text-primary focus:outline-none placeholder:theme-text-secondary resize-none border-0 shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold theme-text-secondary hover:theme-text-primary cursor-pointer border-0 bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-5 py-2.5 theme-bg-accent theme-accent-text rounded-2xl text-xs font-bold disabled:opacity-50 cursor-pointer shadow-xs active:scale-98 border-0"
                >
                  {isSubmittingLeave ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default StaffProfileDetailView;
