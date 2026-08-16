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
} from '../../components/ui/Icons';
import { getStaffDetail, getTeacherAssignments, getStaffDuties, getStaffAttendance, getLeaveRequests, applyLeave } from '../../api/staff';
import { useToast } from '../../context/ToastContext';
import StaffFormModal from './StaffFormModal';
import TeacherAssignmentModal from './TeacherAssignmentModal';
import GeneralDutyModal from './GeneralDutyModal';

export default function StaffProfileDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [staff, setStaff] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [duties, setDuties] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [leaves, setLeaves] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'classes' | 'duties' | 'attendance' | 'payroll' | 'leaves'

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isDutyOpen, setIsDutyOpen] = useState(false);
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

  if (isLoading) {
    return (
      <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
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
        <h2 className="text-lg font-bold text-zinc-200">Staff Profile Not Found</h2>
        <button
          onClick={() => navigate('/staff')}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold"
        >
          ← Return to Directory
        </button>
      </div>
    );
  }

  const isTeaching = staff.staff_type === 'TEACHING';
  const initials = staff.user_name
    ? staff.user_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : staff.employee_id?.slice(0, 2) || 'ST';

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto min-h-screen">
      {/* 1. Top Breadcrumb & Return Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/staff')}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <span>← Back to Staff Directory</span>
        </button>

        <div className="flex items-center gap-2">
          {isTeaching ? (
            <button
              onClick={() => setIsAssignOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 text-xs font-semibold transition-colors"
            >
              <ClassIcon className="w-4 h-4" />
              <span>Assign Classes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsDutyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 text-xs font-semibold transition-colors"
            >
              <DutyIcon className="w-4 h-4" />
              <span>Assign Duties</span>
            </button>
          )}

          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-colors"
          >
            <LeaveIcon className="w-4 h-4" />
            <span>Apply Leave</span>
          </button>

          <button
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
          >
            <EditIcon className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Profile Banner */}
      <div className="relative rounded-3xl bg-zinc-900/80 border border-zinc-800 p-6 md:p-8 overflow-hidden shadow-2xl backdrop-blur">
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
                <h1 className="text-xl md:text-2xl font-bold text-zinc-100">
                  {staff.user_name || 'Staff Member'}
                </h1>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                  staff.employment_status === 'PERMANENT'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  {staff.employment_status}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                  {staff.staff_type}
                </span>
              </div>

              <div className="text-sm font-medium text-zinc-300">
                {staff.designation} • <span className="text-zinc-400">{staff.department_name || 'General Department'}</span>
              </div>

              <div className="text-xs text-zinc-500 font-mono pt-1">
                Employee ID: <span className="text-zinc-300 font-semibold">{staff.employee_id}</span>
                {staff.joining_date && <span> • Joined: {staff.joining_date}</span>}
              </div>
            </div>
          </div>

          {/* Quick Contact Chips */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
            {staff.user_phone && (
              <a
                href={`tel:${staff.user_phone}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-sky-400 transition-colors"
              >
                <PhoneIcon className="w-4 h-4 text-sky-400" />
                <span>{staff.user_phone}</span>
              </a>
            )}
            {staff.user_email && (
              <a
                href={`mailto:${staff.user_email}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-300 hover:text-sky-400 transition-colors"
              >
                <MailIcon className="w-4 h-4 text-purple-400" />
                <span>{staff.user_email}</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'overview'
              ? 'bg-sky-600 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Overview & Bio
        </button>

        {isTeaching ? (
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'classes'
                ? 'bg-sky-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            Assigned Classes ({assignments.length})
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('duties')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'duties'
                ? 'bg-sky-600 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            Operational Duties ({duties.length})
          </button>
        )}

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'attendance'
              ? 'bg-sky-600 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Attendance Logs ({attendanceLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'payroll'
              ? 'bg-sky-600 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Payroll & Banking
        </button>

        <button
          onClick={() => setActiveTab('leaves')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
            activeTab === 'leaves'
              ? 'bg-sky-600 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          Leaves Record ({leaves.length})
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Core Info */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Employment Details
            </h3>
            <div className="divide-y divide-zinc-800/60 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">Employee ID:</span>
                <span className="font-mono text-zinc-200 font-semibold">{staff.employee_id}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">Category:</span>
                <span className="text-zinc-200">{staff.staff_type}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">Designation:</span>
                <span className="text-zinc-200 font-medium">{staff.designation}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">Department:</span>
                <span className="text-zinc-200">{staff.department_name || 'None'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">Joining Date:</span>
                <span className="text-zinc-200">{staff.joining_date || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Academic / Operational Credentials */}
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              {isTeaching ? 'Academic Credentials' : 'Operational Scope'}
            </h3>
            <div className="divide-y divide-zinc-800/60 text-xs">
              {isTeaching ? (
                <>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Highest Degree:</span>
                    <span className="text-zinc-200 font-medium">{staff.teacher_detail?.highest_degree || 'N/A'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Specialization:</span>
                    <span className="text-zinc-200 font-medium">{staff.teacher_detail?.specialization || 'General'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Max Daily Periods:</span>
                    <span className="text-zinc-200 font-mono">{staff.teacher_detail?.max_daily_periods || 4} Periods</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Report Review Authority:</span>
                    <span className={staff.teacher_detail?.can_review_reports ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}>
                      {staff.teacher_detail?.can_review_reports ? 'Authorized' : 'Standard'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Campus Zone:</span>
                    <span className="text-zinc-200 font-medium">{staff.general_detail?.assigned_zone || 'Campus Wide'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Shift Schedule:</span>
                    <span className="text-zinc-200 font-mono">{staff.general_detail?.shift_type || 'MORNING'}</span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-zinc-400">Reporting To:</span>
                    <span className="text-zinc-200">{staff.general_detail?.reporting_to_name || 'None'}</span>
                  </div>
                </>
              )}
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">NID / Passport:</span>
                <span className="font-mono text-zinc-200">{staff.nid_no || 'N/A'}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-zinc-400">Blood Group:</span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">{staff.blood_group || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Academic Classes */}
      {activeTab === 'classes' && isTeaching && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200">Active Academic Classes & Groups</h3>
            <button
              onClick={() => setIsAssignOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-xl"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Assign Class</span>
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
              No classes currently assigned to this teacher.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((a) => (
                <div key={a.id} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-zinc-100">{a.class_name}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      {a.role_in_class?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    Group: <span className="text-zinc-200 font-medium">{a.group_name || 'All Groups in Class'}</span>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Academic Session: <span className="text-zinc-300">{a.session_name}</span>
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
            <h3 className="text-sm font-bold text-zinc-200">Assigned Operational Tasks</h3>
            <button
              onClick={() => setIsDutyOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Assign Task</span>
            </button>
          </div>

          {duties.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
              No operational tasks assigned to this staff member.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {duties.map((d) => (
                <div key={d.id} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-zinc-100">{d.duty_title}</div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-zinc-800 text-zinc-300">
                      {d.priority}
                    </span>
                  </div>
                  {d.duty_description && (
                    <p className="text-xs text-zinc-400">{d.duty_description}</p>
                  )}
                  <div className="text-[11px] text-zinc-500">
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
          <h3 className="text-sm font-bold text-zinc-200">Daily Attendance Records</h3>
          {attendanceLogs.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
              No attendance records punched for this employee yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl bg-zinc-900 border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950/80 text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">In Time</th>
                    <th className="py-3 px-4">Out Time</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {attendanceLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-4 font-semibold text-zinc-200">{log.date}</td>
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
                      <td className="py-2.5 px-4 text-zinc-500">{log.source}</td>
                      <td className="py-2.5 px-4 text-zinc-400 font-sans">{log.remarks || '—'}</td>
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
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4 max-w-xl">
          <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <BankIcon className="w-4 h-4 text-emerald-400" />
            <span>Salary & Banking Setup</span>
          </h3>
          <div className="divide-y divide-zinc-800/60 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-400">Compensation Type:</span>
              <span className="text-zinc-200 font-semibold">{staff.salary_type}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-400">Base Salary:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ৳ {Number(staff.base_salary || 0).toLocaleString()} BDT
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-400">Bank Name:</span>
              <span className="text-zinc-200">{staff.bank_name || 'Not Provided'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-400">Bank Account No:</span>
              <span className="font-mono text-zinc-200">{staff.bank_account_no || 'Not Provided'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-zinc-400">Mobile Banking:</span>
              <span className="font-mono text-zinc-200">{staff.mobile_banking_no || 'Not Provided'}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Leaves Record */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-200">Submitted Leave Requests</h3>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Apply Leave</span>
            </button>
          </div>

          {leaves.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
              No leave applications recorded for this staff member.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {leaves.map((l) => (
                <div key={l.id} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-100">{l.leave_type} LEAVE</span>
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
                  <div className="text-xs text-zinc-400">
                    Duration: <span className="text-zinc-200 font-mono font-semibold">{l.duration_days} Day(s)</span> ({l.start_date} to {l.end_date})
                  </div>
                  <p className="text-xs text-zinc-300 italic">"{l.reason}"</p>
                  {l.admin_remarks && (
                    <div className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/80">
                      Admin: <span className="text-zinc-300">{l.admin_remarks}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {isEditOpen && (
        <StaffFormModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          staffData={staff}
          onSaved={() => {
            showToast('Profile updated!', 'success');
            loadStaffData();
          }}
        />
      )}

      {isAssignOpen && (
        <TeacherAssignmentModal
          isOpen={isAssignOpen}
          onClose={() => setIsAssignOpen(false)}
          teacher={staff}
          onUpdated={loadStaffData}
        />
      )}

      {isDutyOpen && (
        <GeneralDutyModal
          isOpen={isDutyOpen}
          onClose={() => setIsDutyOpen(false)}
          staff={staff}
          onUpdated={loadStaffData}
        />
      )}

      {/* Apply Leave Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <LeaveIcon className="w-4 h-4 text-emerald-400" />
                <span>Apply for Staff Leave</span>
              </h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Leave Type</label>
                <select
                  value={leaveForm.leave_type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
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
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Explain reason for leave..."
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmittingLeave ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
