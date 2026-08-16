import React, { useState, useEffect, useCallback } from 'react';
import {
  LeaveIcon,
  PlusIcon,
  RefreshIcon,
  CheckCircleIcon,
  CloseIcon,
  SearchIcon,
  CalendarIcon,
  TeacherIcon,
  SleekCheckIcon,
} from '../../components/ui/Icons';
import { getLeaveRequests, actionLeaveRequest, applyLeave, getStaffList } from '../../api/staff';
import { useToast } from '../../context/ToastContext';

export default function StaffLeaveManagementView() {
  const { showToast } = useToast();

  const [leaves, setLeaves] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING | ALL | APPROVED | REJECTED
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Action Modals
  const [actioningLeave, setActioningLeave] = useState(null); // { id, status: 'APPROVED'|'REJECTED', item }
  const [adminRemarks, setAdminRemarks] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Apply Modal
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    staff: '',
    leave_type: 'CASUAL',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    reason: '',
  });
  const [isSubmittingApply, setIsSubmittingApply] = useState(false);

  const loadLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        leave_type: leaveTypeFilter !== 'ALL' ? leaveTypeFilter : undefined,
      };

      const [leaveRes, staffRes] = await Promise.all([
        getLeaveRequests(params),
        getStaffList({ is_active: true }),
      ]);

      setLeaves(Array.isArray(leaveRes) ? leaveRes : leaveRes.results || []);
      setStaffList(Array.isArray(staffRes) ? staffRes : staffRes.results || []);
    } catch (err) {
      console.error('Error fetching leave desk requests:', err);
      showToast('Failed to load leave requests', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, leaveTypeFilter, showToast]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const handleOpenAction = (item, targetStatus) => {
    setActioningLeave({ item, status: targetStatus });
    setAdminRemarks(targetStatus === 'APPROVED' ? 'Approved by administration.' : '');
  };

  const handleConfirmAction = async (e) => {
    e.preventDefault();
    if (!actioningLeave) return;

    setIsProcessingAction(true);
    try {
      await actionLeaveRequest(actioningLeave.item.id, {
        status: actioningLeave.status,
        admin_remarks: adminRemarks.trim(),
      });

      showToast(
        actioningLeave.status === 'APPROVED'
          ? 'Leave request APPROVED! Attendance synchronized to ON_LEAVE.'
          : 'Leave request REJECTED.',
        actioningLeave.status === 'APPROVED' ? 'success' : 'info'
      );

      setActioningLeave(null);
      loadLeaves();
    } catch (err) {
      showToast(err.message || 'Failed to update leave status', 'error');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!applyForm.staff || !applyForm.reason.trim()) {
      showToast('Please select staff member and enter a reason.', 'error');
      return;
    }

    setIsSubmittingApply(true);
    try {
      await applyLeave(applyForm);
      showToast('Leave request submitted successfully!', 'success');
      setIsApplyOpen(false);
      setApplyForm({
        staff: '',
        leave_type: 'CASUAL',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: '',
      });
      loadLeaves();
    } catch (err) {
      showToast(err.message || 'Failed to apply leave', 'error');
    } finally {
      setIsSubmittingApply(false);
    }
  };

  const filteredLeaves = leaves.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.staff_name && l.staff_name.toLowerCase().includes(q)) ||
      (l.staff_employee_id && l.staff_employee_id.toLowerCase().includes(q)) ||
      (l.staff_designation && l.staff_designation.toLowerCase().includes(q)) ||
      (l.reason && l.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto min-h-screen">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
            <LeaveIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-100 flex items-center gap-2">
              Staff Leave Desk & Approvals
            </h1>
            <p className="text-xs text-zinc-400">
              Review and approve staff leave requests with automatic attendance synchronization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadLeaves}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            title="Refresh"
          >
            <RefreshIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsApplyOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-amber-600/20 transition-all"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* 2. Filters & Status Tabs */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="inline-flex p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
            {[
              { id: 'PENDING', label: 'Pending Approvals' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'REJECTED', label: 'Rejected' },
              { id: 'ALL', label: 'All Requests' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Type Filter & Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[200px]">
              <SearchIcon className="absolute left-2.5 top-2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search staff, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 placeholder-zinc-500"
              />
            </div>

            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Leave Types</option>
              <option value="CASUAL">Casual Leave</option>
              <option value="SICK">Sick Leave</option>
              <option value="EMERGENCY">Emergency Leave</option>
              <option value="MATERNITY">Maternity Leave</option>
              <option value="UNPAID">Unpaid Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Leave Requests Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm font-medium">Loading leave requests...</span>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800 text-zinc-400 text-xs">
          No leave requests found matching the active filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeaves.map((leave) => {
            const isPending = leave.status === 'PENDING';
            const isApproved = leave.status === 'APPROVED';

            return (
              <div
                key={leave.id}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top Badge & Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold font-mono bg-zinc-950 border border-zinc-800 text-zinc-300">
                      {leave.leave_type} LEAVE
                    </span>

                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                      isApproved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : leave.status === 'REJECTED'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {leave.status}
                    </span>
                  </div>

                  {/* Employee Info */}
                  <div className="mt-3">
                    <div className="text-sm font-bold text-zinc-100">
                      {leave.staff_name || 'Staff Member'}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {leave.staff_designation} • <span className="font-mono text-zinc-500">{leave.staff_employee_id}</span>
                    </div>
                  </div>

                  {/* Dates & Duration */}
                  <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Duration:</span>
                      <span className="text-amber-400 font-mono font-bold">{leave.duration_days} Day(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Date Range:</span>
                      <span className="text-zinc-300 font-mono">{leave.start_date} → {leave.end_date}</span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      Reason
                    </span>
                    <p className="text-xs text-zinc-300 italic bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/60">
                      "{leave.reason}"
                    </p>
                  </div>

                  {/* Admin Remarks if reviewed */}
                  {leave.admin_remarks && (
                    <div className="mt-2 text-[11px] text-zinc-400">
                      <span className="text-zinc-500 font-medium">Remarks by {leave.approved_by_name || 'Admin'}:</span>{' '}
                      <span className="text-zinc-300">{leave.admin_remarks}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Pending */}
                {isPending && (
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenAction(leave, 'REJECTED')}
                      className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleOpenAction(leave, 'APPROVED')}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-1"
                    >
                      <SleekCheckIcon className="w-3.5 h-3.5" />
                      <span>Approve & Sync</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Action Confirmation Modal */}
      {actioningLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                {actioningLeave.status === 'APPROVED' ? (
                  <>
                    <SleekCheckIcon className="w-5 h-5 text-emerald-400" />
                    <span>Approve Staff Leave</span>
                  </>
                ) : (
                  <>
                    <CloseIcon className="w-5 h-5 text-rose-400" />
                    <span>Reject Staff Leave</span>
                  </>
                )}
              </h3>
              <button onClick={() => setActioningLeave(null)} className="text-zinc-400 hover:text-zinc-200">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              {actioningLeave.status === 'APPROVED'
                ? `Approving leave for ${actioningLeave.item.staff_name} (${actioningLeave.item.duration_days} days). Attendance records from ${actioningLeave.item.start_date} to ${actioningLeave.item.end_date} will be automatically updated with status 'ON_LEAVE'.`
                : `Are you sure you want to reject the leave application for ${actioningLeave.item.staff_name}?`}
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Admin Remarks / Feedback
                </label>
                <textarea
                  rows={3}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Optional admin remarks..."
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActioningLeave(null)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50 ${
                    actioningLeave.status === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {isProcessingAction ? 'Processing...' : `Confirm ${actioningLeave.status}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Apply Leave Modal */}
      {isApplyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <LeaveIcon className="w-4 h-4 text-amber-400" />
                <span>Submit Staff Leave Application</span>
              </h3>
              <button onClick={() => setIsApplyOpen(false)} className="text-zinc-400 hover:text-zinc-200">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Select Staff Member <span className="text-rose-400">*</span>
                </label>
                <select
                  value={applyForm.staff}
                  onChange={(e) => setApplyForm({ ...applyForm, staff: e.target.value })}
                  required
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                >
                  <option value="">-- Choose Employee --</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user_name || s.employee_id} ({s.designation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Leave Type</label>
                <select
                  value={applyForm.leave_type}
                  onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
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
                    value={applyForm.start_date}
                    onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={applyForm.end_date}
                    onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  placeholder="Explain reason for leave..."
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsApplyOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApply}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50"
                >
                  {isSubmittingApply ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
