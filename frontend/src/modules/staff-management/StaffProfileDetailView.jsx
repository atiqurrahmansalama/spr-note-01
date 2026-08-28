import React, { useState, useEffect } from 'react';
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
} from '../../components/ui/Icons';
import { getStaffDetail, getTeacherAssignments, getStaffDuties, getStaffAttendance, getLeaveRequests, applyLeave } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import { useRightSidebar } from '../../context/RightSidebarContext';
import { PageContainer } from '../../components/layout';
import StaffDrawerForm from './StaffDrawerForm';
import TeacherAssignmentDrawerForm from './TeacherAssignmentDrawerForm';
import GeneralDutyDrawerForm from './GeneralDutyDrawerForm';

export default function StaffProfileDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { openRightSidebar, closeRightSidebar } = useRightSidebar();

  const [staff, setStaff] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [duties, setDuties] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'classes' | 'duties' | 'attendance' | 'payroll' | 'leaves'

  // Modals & Drawers
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  const [leaveForm, setLeaveForm] = useState({
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  const loadStaffData = async () => {
    setIsLoading(true);
    try {
      const data = await getStaffDetail(id);
      setStaff(data);

      // Concurrently fetch assignments, duties, attendance logs, and leaves
      const [assignRes, dutyRes, attRes, leaveRes] = await Promise.all([
        data.staff_type === 'TEACHING' ? getTeacherAssignments({ teacher: id }) : Promise.resolve([]),
        data.staff_type !== 'TEACHING' ? getStaffDuties({ staff: id }) : Promise.resolve([]),
        getStaffAttendance({ staff: id }),
        getLeaveRequests({ staff: id }),
      ]);

      setAssignments(Array.isArray(assignRes) ? assignRes : assignRes.results || []);
      setDuties(Array.isArray(dutyRes) ? dutyRes : dutyRes.results || []);
      setAttendanceLogs(Array.isArray(attRes) ? attRes : attRes.results || []);
      setLeaves(Array.isArray(leaveRes) ? leaveRes : leaveRes.results || []);
    } catch (err) {
      console.error('Error fetching staff profile details:', err);
      showToast(err.message || 'Failed to load staff details', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadStaffData();
  }, [id]);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.reason.trim()) {
      showToast('Please provide a reason for the leave.', 'error');
      return;
    }

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
    } catch (err) {
      showToast(err.message || 'Failed to submit leave', 'error');
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleOpenEditDrawer = () => {
    openRightSidebar({
      title: `Edit ${staff?.user_name || 'Staff'} Profile`,
      subtitle: 'Modify designation, qualifications, credentials, and hierarchy rank',
      width: 650,
      content: (
        <StaffDrawerForm
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
    openRightSidebar({
      title: 'Class & Subject Assignments',
      subtitle: `Manage assigned academic classes and groups for ${staff?.user_name || staff?.employee_id}`,
      width: 'md',
      content: (
        <TeacherAssignmentDrawerForm
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
    openRightSidebar({
      title: 'General & Campus Duties',
      subtitle: `Assign residential, dining, or gate duties for ${staff?.user_name || staff?.employee_id}`,
      width: 'md',
      content: (
        <GeneralDutyDrawerForm
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
        <svg className="animate-spin w-8 h-8 text-sky-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
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
          className="inline-flex items-center gap-1.5 px-4 py-2 theme-bg-sub hover:theme-bg-elevated theme-text-primary rounded-xl text-xs font-semibold cursor-pointer"
        >
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          <span>Return to Staff Roster</span>
        </button>
      </div>
    );
  }

  const isTeaching = staff.staff_type === 'TEACHING';
  const initials = staff.user_name
    ? staff.user_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : staff.employee_id?.slice(0, 2) || 'ST';

  return (
    <PageContainer maxWidth="6xl">
      {/* 1. Top Breadcrumb & Return Bar */}
      <div className="flex items-center justify-between">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ClassIcon className="w-4 h-4" />
              <span>Assign Classes</span>
            </button>
          ) : (
            <button
              onClick={handleOpenDutyDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <DutyIcon className="w-4 h-4" />
              <span>Assign Duties</span>
            </button>
          )}

          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors cursor-pointer"
          >
            <LeaveIcon className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>

          <button
            onClick={handleOpenEditDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl theme-bg-sub hover:theme-bg-elevated theme-text-primary border theme-border text-xs font-semibold transition-colors cursor-pointer"
          >
            <EditIcon className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Profile Banner */}
      <div className="relative rounded-3xl theme-bg-surface border theme-border p-6 md:p-8 overflow-hidden shadow-2xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-xl ${
              isTeaching
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}>
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight theme-text-primary">
                  {staff.user_name || 'Staff Member'}
                </h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  staff.employment_status === 'PERMANENT'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'theme-bg-sub theme-text-secondary border theme-border'
                }`}>
                  {staff.employment_status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  {staff.staff_type}
                </span>
              </div>

              <div className="text-sm font-medium theme-text-secondary">
                {staff.designation} • <span className="theme-text-secondary">{staff.department_name || 'General Department'}</span>
              </div>

              <div className="text-xs theme-text-secondary font-mono pt-1">
                Employee ID: <span className="theme-text-primary font-semibold">{staff.employee_id}</span>
                {staff.joining_date && <span> • Joined: {staff.joining_date}</span>}
              </div>
            </div>
          </div>

          {/* Quick Contact Chips */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            {staff.user_phone && (
              <a
                href={`tel:${staff.user_phone}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-mono theme-text-primary hover:text-sky-400 transition-colors"
              >
                <PhoneIcon className="w-4 h-4 text-sky-400" />
                <span>{staff.user_phone}</span>
              </a>
            )}
            {staff.user_email && (
              <a
                href={`mailto:${staff.user_email}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl theme-bg-sub border theme-border text-xs font-mono theme-text-primary hover:text-sky-400 transition-colors"
              >
                <MailIcon className="w-4 h-4 text-purple-400" />
                <span>{staff.user_email}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b theme-border overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'theme-bg-accent theme-accent-text shadow'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Overview & Bio
        </button>

        {isTeaching ? (
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'classes'
                ? 'theme-bg-accent theme-accent-text shadow'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
            }`}
          >
            Assigned Classes ({assignments.length})
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('duties')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
              activeTab === 'duties'
                ? 'theme-bg-accent theme-accent-text shadow'
                : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
            }`}
          >
            Operational Duties ({duties.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'attendance'
              ? 'theme-bg-accent theme-accent-text shadow'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Attendance Logs ({attendanceLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'payroll'
              ? 'theme-bg-accent theme-accent-text shadow'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Payroll & Banking
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
            activeTab === 'leaves'
              ? 'theme-bg-accent theme-accent-text shadow'
              : 'theme-text-secondary hover:theme-text-primary hover:theme-bg-sub'
          }`}
        >
          Leaves Record ({leaves.length})
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Core Info */}
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
                <span className="theme-text-primary">{staff.staff_type}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Designation:</span>
                <span className="theme-text-primary font-medium">{staff.designation}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Department:</span>
                <span className="theme-text-primary">{staff.department_name || 'None'}</span>
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
              {isTeaching ? 'Academic Credentials' : 'Operational Scope'}
            </h3>
            <div className="divide-y theme-border text-xs">
              {isTeaching ? (
                <>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Highest Degree:</span>
                    <span className="theme-text-primary font-medium">{staff.teacher_detail?.highest_degree || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Specialization:</span>
                    <span className="theme-text-primary font-medium">{staff.teacher_detail?.specialization || 'General'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Max Daily Periods:</span>
                    <span className="theme-text-primary font-mono">{staff.teacher_detail?.max_daily_periods || 4} Periods</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Report Review Authority:</span>
                    <span className={staff.teacher_detail?.can_review_reports ? 'text-emerald-400 font-semibold' : 'theme-text-secondary'}>
                      {staff.teacher_detail?.can_review_reports ? 'Authorized' : 'Standard'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Campus Zone:</span>
                    <span className="theme-text-primary font-medium">{staff.general_detail?.assigned_zone || 'Campus Wide'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Shift Schedule:</span>
                    <span className="theme-text-primary font-mono">{staff.general_detail?.shift_type || 'MORNING'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="theme-text-secondary">Reporting To:</span>
                    <span className="theme-text-primary">{staff.general_detail?.reporting_to_name || 'None'}</span>
                  </div>
                </>
              )}
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">NID / Passport:</span>
                <span className="font-mono theme-text-primary">{staff.nid_no || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="theme-text-secondary">Blood Group:</span>
                <span className="px-2 py-0.5 rounded theme-bg-sub theme-text-primary border theme-border font-mono">{staff.blood_group || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Academic Classes */}
      {activeTab === 'classes' && isTeaching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold theme-text-primary">Active Academic Classes & Groups</h3>
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
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
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
          <h3 className="text-sm font-bold theme-text-primary">Daily Attendance Records</h3>
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : log.status === 'LATE'
                            ? 'bg-amber-500/10 text-amber-400'
                            : log.status === 'ON_LEAVE'
                            ? 'bg-sky-500/10 text-sky-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">{log.in_time || '—'}</td>
                      <td className="py-2.5 px-4">{log.out_time || '—'}</td>
                      <td className="py-2.5 px-4 theme-text-secondary">{log.source}</td>
                      <td className="py-2.5 px-4 theme-text-secondary font-sans">{log.remarks || '—'}</td>
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
            <BankIcon className="w-4 h-4 text-emerald-400" />
            <span>Salary & Banking Setup</span>
          </h3>
          <div className="divide-y theme-border text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Compensation Type:</span>
              <span className="theme-text-primary font-semibold">{staff.salary_type}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Base Salary:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                BDT {Number(staff.base_salary || 0).toLocaleString()}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Bank Name:</span>
              <span className="theme-text-primary">{staff.bank_name || 'Not Provided'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Bank Account No:</span>
              <span className="font-mono theme-text-primary">{staff.bank_account_no || 'Not Provided'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="theme-text-secondary">Mobile Banking:</span>
              <span className="font-mono theme-text-primary">{staff.mobile_banking_no || 'Not Provided'}</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
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
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      l.status === 'APPROVED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : l.status === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  <div className="text-xs theme-text-secondary">
                    Duration: <span className="theme-text-primary font-mono font-semibold">{l.duration_days} Day(s)</span> ({l.start_date} to {l.end_date})
                  </div>
                  <p className="text-xs theme-text-primary italic">"{l.reason}"</p>
                  {l.admin_remarks && (
                    <div className="text-[11px] theme-text-secondary pt-1 border-t theme-border">
                      <span className="theme-text-secondary font-medium">Remarks by {l.approved_by_name || 'Admin'}:</span>{' '}
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
                <LeaveIcon className="w-4 h-4 text-emerald-400" />
                <span>Apply for Staff Leave</span>
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="theme-text-secondary hover:theme-text-primary cursor-pointer">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium theme-text-secondary mb-1">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="EMERGENCY">Emergency Leave</option>
                  <option value="MATERNITY">Maternity / Paternity</option>
                  <option value="UNPAID">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium theme-text-secondary mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium theme-text-secondary mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-1.5 theme-bg-sub border theme-border rounded-xl text-xs theme-text-primary focus:outline-none focus:border-[var(--accent-main)]/50 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium theme-text-secondary mb-1">Reason for Leave</label>
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
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
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
}
