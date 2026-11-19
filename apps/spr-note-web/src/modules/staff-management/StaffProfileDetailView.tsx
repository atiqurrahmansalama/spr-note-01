import React, { useState, useEffect, useCallback } from 'react';
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
  TrashIcon,
  RefreshIcon,
  CalendarIcon,
  SleekCheckIcon,
  CloseIcon,
  PlusIcon,
  ChevronLeftIcon,
  WhatsAppIcon,
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
  const [activeTab, setActiveTab] = useState<
    'overview' | 'classes' | 'duties' | 'attendance' | 'payroll' | 'leaves'
  >('overview');

  // Modals & Drawers
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

      // Concurrently fetch assignments, duties, attendance logs, and leaves with allSettled
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
      } else {
        // Log gracefully without blocking whole page
        console.warn('Attendance logs not available:', attRes.reason);
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
          className="inline-flex items-center gap-1.5 px-4 py-2 theme-bg-sub hover:theme-bg-accent-soft theme-text-primary rounded-xl text-xs font-semibold cursor-pointer border theme-border"
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

  return (
    <PageContainer maxWidth="6xl">
      {/* 1. Top Return Bar & Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate('/staff/roster')}
          className="flex items-center gap-1.5 text-xs font-medium theme-text-secondary hover:theme-text-primary transition-colors cursor-pointer"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          <span>Back to Staff Roster</span>
        </button>

        <div className="flex items-center gap-2">
          {isTeaching ? (
            <button
              onClick={handleOpenAssignDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ClassIcon className="w-4 h-4" />
              <span>Assign Classes</span>
            </button>
          ) : (
            <button
              onClick={handleOpenDutyDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <DutyIcon className="w-4 h-4" />
              <span>Assign Duties</span>
            </button>
          )}

          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-accent-soft theme-text-primary border theme-border text-xs font-semibold transition-colors cursor-pointer"
          >
            <LeaveIcon className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>

          <button
            onClick={handleOpenEditDrawer}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl theme-bg-accent theme-accent-text text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-98"
          >
            <EditIcon className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Profile Banner */}
      <div className="relative rounded-3xl theme-bg-surface border theme-border p-6 md:p-8 overflow-hidden shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 theme-bg-accent-soft theme-accent border theme-border">
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
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight theme-text-primary truncate">
                  {displayName}
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    staff.employment_status === 'PERMANENT'
                      ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                      : 'theme-bg-sub theme-text-secondary border theme-border'
                  }`}
                >
                  {staff.employment_status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full theme-bg-sub theme-accent border theme-border font-mono font-semibold">
                  {staff.staff_type}
                </span>
                {staff.rank_order && staff.rank_order !== 99 ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full theme-bg-accent-soft theme-accent border theme-border font-mono font-bold">
                    Rank {staff.rank_order}
                  </span>
                ) : null}
              </div>

              <div className="text-sm font-medium theme-text-secondary">
                {staff.designation} •{' '}
                <span className="theme-text-secondary">
                  {staff.department_name || 'General Department'}
                </span>
              </div>

              <div className="text-xs theme-text-secondary font-mono pt-1">
                Employee ID: <span className="theme-text-primary font-semibold">{staff.employee_id}</span>
                {staff.joining_date && <span> • Joined: {staff.joining_date}</span>}
              </div>
            </div>
          </div>

          {/* Quick Contact Chips */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            {phone && (
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${phone}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-mono theme-text-primary hover:theme-accent transition-colors"
                >
                  <PhoneIcon className="w-4 h-4 theme-accent" />
                  <span>{phone}</span>
                </a>
                <a
                  href={`https://wa.me/${phone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl theme-bg-sub border theme-border hover:bg-emerald-500/10 hover:text-emerald-500 theme-text-secondary transition-colors"
                  title="WhatsApp"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
              </div>
            )}
            {staff.email && (
              <a
                href={`mailto:${staff.email}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-mono theme-text-primary hover:theme-accent transition-colors"
              >
                <MailIcon className="w-4 h-4 theme-accent" />
                <span>{staff.email}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b theme-border overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'theme-bg-accent theme-accent-text shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Overview &amp; Profile
        </button>

        {isTeaching ? (
          <button
            type="button"
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'theme-bg-accent theme-accent-text shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
            }`}
          >
            Assigned Classes ({assignments.length})
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('duties')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'duties'
                ? 'theme-bg-accent theme-accent-text shadow-xs'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
            }`}
          >
            Operational Duties ({duties.length})
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'theme-bg-accent theme-accent-text shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Attendance Logs ({attendanceLogs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'theme-bg-accent theme-accent-text shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Payroll &amp; Banking
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'theme-bg-accent theme-accent-text shadow-xs'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Leaves Record ({leaves.length})
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Employment Details */}
          <div className="p-6 rounded-2xl theme-bg-surface border theme-border space-y-4">
            <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
              Employment Details
            </h3>
            <div className="divide-y theme-border text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Employee ID:</span>
                <span className="font-mono theme-text-primary font-semibold">{staff.employee_id}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Category:</span>
                <span className="theme-text-primary font-medium">{staff.staff_type}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Designation:</span>
                <span className="theme-text-primary font-medium">{staff.designation}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Hierarchy Rank:</span>
                <span className="theme-text-primary font-mono font-bold">
                  {staff.rank_order && staff.rank_order !== 99 ? `Rank ${staff.rank_order}` : 'Default Rank'}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Department:</span>
                <span className="theme-text-primary">{staff.department_name || 'General Department'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Joining Date:</span>
                <span className="theme-text-primary">{staff.joining_date || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Academic / Operational Credentials */}
          <div className="p-6 rounded-2xl theme-bg-surface border theme-border space-y-4">
            <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider">
              {isTeaching ? 'Academic & Faculty Profile' : 'Operational Scope'}
            </h3>
            <div className="divide-y theme-border text-xs">
              {isTeaching ? (
                <>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Highest Degree:</span>
                    <span className="theme-text-primary font-medium">
                      {staff.teacher_detail?.highest_degree || 'N/A'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Specialization:</span>
                    <span className="theme-text-primary font-medium">
                      {staff.teacher_detail?.specialization || 'General Curriculum'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Max Daily Teaching Periods:</span>
                    <span className="theme-text-primary font-mono font-bold">
                      {staff.teacher_detail?.max_daily_periods || 4} Periods
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Report Review Authority:</span>
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
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Campus Zone:</span>
                    <span className="theme-text-primary font-medium">
                      {staff.general_detail?.assigned_zone || 'Campus Wide'}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Shift Schedule:</span>
                    <span className="theme-text-primary font-mono">
                      {staff.general_detail?.shift_type || 'MORNING'}
                    </span>
                  </div>
                </>
              )}
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">National ID (NID):</span>
                <span className="font-mono theme-text-primary">{staff.nid_no || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Blood Group:</span>
                <span className="px-2 py-0.5 rounded theme-bg-sub theme-text-primary border theme-border font-mono">
                  {staff.blood_group || 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Academic Classes */}
      {activeTab === 'classes' && isTeaching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold theme-text-primary">Active Academic Classes &amp; Groups</h3>
            <button
              onClick={handleOpenAssignDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Assign Class</span>
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-2xl border theme-border theme-text-secondary text-xs">
              No classes currently assigned to this teacher.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold theme-text-primary">{a.class_name}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full theme-bg-accent-soft theme-accent border border-[var(--accent-main)]/20 font-mono">
                      {a.role_in_class?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs theme-text-secondary">
                    Group: <span className="theme-text-primary font-medium">{a.group_name || 'All Groups in Class'}</span>
                  </div>
                  <div className="text-xs theme-text-secondary">
                    Academic Session: <span className="theme-text-primary">{a.session_name}</span>
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
            <h3 className="text-sm font-bold theme-text-primary">Assigned Operational Tasks</h3>
            <button
              onClick={handleOpenDutyDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-semibold rounded-xl cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Assign Task</span>
            </button>
          </div>

          {duties.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-2xl border theme-border theme-text-secondary text-xs">
              No operational tasks assigned to this staff member.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duties.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold theme-text-primary">{d.duty_title}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono theme-bg-sub theme-text-primary border theme-border">
                      {d.priority}
                    </span>
                  </div>
                  {d.duty_description && (
                    <p className="text-xs theme-text-secondary">{d.duty_description}</p>
                  )}
                  <div className="text-[11px] theme-text-secondary">
                    From: {d.effective_from} {d.effective_to ? `→ ${d.effective_to}` : '(Ongoing)'}
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold theme-text-primary">Daily Attendance Records</h3>
            <button
              onClick={() => loadStaffData()}
              className="flex items-center gap-1 text-xs theme-accent font-semibold hover:underline cursor-pointer"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
              <span>Refresh Logs</span>
            </button>
          </div>
          {attendanceLogs.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-2xl border theme-border theme-text-secondary text-xs">
              No attendance records punched for this employee yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl theme-bg-surface border theme-border">
              <table className="w-full text-left text-xs theme-text-primary">
                <thead className="theme-bg-sub theme-text-secondary text-[11px] uppercase tracking-wider border-b theme-border">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">In Time</th>
                    <th className="py-3 px-4">Out Time</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border font-mono">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:theme-bg-elevated/40">
                      <td className="py-2.5 px-4 font-semibold theme-text-primary">{log.date}</td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status === 'PRESENT'
                              ? 'theme-bg-accent-soft theme-accent'
                              : log.status === 'LATE'
                              ? 'bg-amber-500/10 text-amber-500'
                              : log.status === 'ON_LEAVE'
                              ? 'theme-bg-sub theme-text-secondary'
                              : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">{log.in_time || '—'}</td>
                      <td className="py-2.5 px-4">{log.out_time || '—'}</td>
                      <td className="py-2.5 px-4 theme-text-secondary">{log.source}</td>
                      <td className="py-2.5 px-4 theme-text-secondary font-sans">
                        {log.remarks || '—'}
                      </td>
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
        <div className="p-6 rounded-2xl theme-bg-surface border theme-border space-y-4 max-w-xl">
          <h3 className="text-sm font-bold theme-text-primary uppercase tracking-wider flex items-center gap-2">
            <BankIcon className="w-4 h-4 theme-accent" />
            <span>Salary &amp; Banking Setup</span>
          </h3>
          <div className="divide-y theme-border text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Compensation Type:</span>
              <span className="theme-text-primary font-semibold">{staff.salary_type || 'MONTHLY_FIXED'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Base Salary:</span>
              <span className="theme-accent font-mono font-bold text-sm">
                BDT {Number(staff.base_salary || 0).toLocaleString()}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Bank Name:</span>
              <span className="theme-text-primary">{staff.bank_name || 'Not Provided'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Bank Account No:</span>
              <span className="font-mono theme-text-primary">
                {staff.bank_account_no || 'Not Provided'}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Mobile Banking:</span>
              <span className="font-mono theme-text-primary">
                {staff.mobile_banking_no || 'Not Provided'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Leaves Record */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold theme-text-primary">Submitted Leave Requests</h3>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 theme-bg-accent theme-accent-text hover:opacity-90 text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          </div>

          {leaves.length === 0 ? (
            <div className="p-8 text-center theme-bg-surface rounded-2xl border theme-border theme-text-secondary text-xs">
              No leave applications recorded for this staff member.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaves.map((l) => (
                <div key={l.id} className="p-4 rounded-2xl theme-bg-surface border theme-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold theme-text-primary">{l.leave_type} LEAVE</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                        l.status === 'APPROVED'
                          ? 'theme-bg-accent-soft theme-accent border-[var(--accent-main)]/20'
                          : l.status === 'REJECTED'
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <div className="text-xs theme-text-secondary">
                    Duration: <span className="theme-text-primary font-mono font-semibold">{l.duration_days} Day(s)</span> ({l.start_date} to {l.end_date})
                  </div>
                  <p className="text-xs theme-text-primary italic">"{l.reason}"</p>
                  {l.admin_remarks && (
                    <div className="text-[11px] theme-text-secondary pt-1 border-t theme-border">
                      <span className="theme-text-secondary font-medium">
                        Remarks by {l.approved_by_name || 'Admin'}:
                      </span>{' '}
                      <span className="theme-text-primary">{l.admin_remarks}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl theme-bg-surface border theme-border p-6 space-y-4 shadow-2xl theme-text-primary">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-sm font-bold theme-text-primary flex items-center gap-2">
                <LeaveIcon className="w-4 h-4 theme-accent" />
                <span>Apply for Staff Leave</span>
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="theme-text-secondary hover:theme-text-primary cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium theme-text-secondary mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) =>
                    setLeaveForm({ ...leaveForm, leave_type: e.target.value as LeaveType })
                  }
                  className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium theme-text-secondary mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, start_date: e.target.value })
                    }
                    className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium theme-text-secondary mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) =>
                      setLeaveForm({ ...leaveForm, end_date: e.target.value })
                    }
                    className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium theme-text-secondary mb-1">
                  Reason for Leave
                </label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Explain reason for leave..."
                  className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 placeholder:theme-text-secondary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3 py-1.5 text-xs theme-text-secondary hover:theme-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-4 py-1.5 theme-bg-accent theme-accent-text rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
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
