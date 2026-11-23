import React, { useMemo } from 'react';
import {
  AttendanceIcon,
  CheckCircleIcon,
  ClockIcon,
  CloseIcon,
  LeaveIcon,
} from '@/components/ui/Icons';
import MetricsGrid from '@/components/ui/MetricsGrid';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StaffAttendanceRecord } from '@/types/staff';

export interface StaffAttendanceTabProps {
  attendanceLogs: StaffAttendanceRecord[];
}

export const StaffAttendanceTab: React.FC<StaffAttendanceTabProps> = ({
  attendanceLogs,
}) => {
  const stats = useMemo(() => {
    const total = attendanceLogs.length;
    const present = attendanceLogs.filter((l) => l.status === 'PRESENT').length;
    const late = attendanceLogs.filter((l) => l.status === 'LATE').length;
    const leave = attendanceLogs.filter(
      (l) => l.status === 'ON_LEAVE' || l.status === 'LEAVE'
    ).length;
    const absent = attendanceLogs.filter((l) => l.status === 'ABSENT').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 100;
    return { total, present, late, leave, absent, rate };
  }, [attendanceLogs]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Quick Stats Grid */}
      <MetricsGrid
        cols={4}
        items={[
          {
            label: 'Attendance Rate',
            value: `${stats.rate}%`,
            icon: AttendanceIcon,
            subLabel: 'Overall reliability metric',
            color: stats.rate >= 90 ? 'emerald' : 'amber',
          },
          {
            label: 'Present Days',
            value: stats.present,
            icon: CheckCircleIcon,
            subLabel: 'On-time present',
            color: 'emerald',
          },
          {
            label: 'Late Arrivals',
            value: stats.late,
            icon: ClockIcon,
            subLabel: 'Recorded late check-in',
            color: stats.late > 0 ? 'amber' : 'default',
          },
          {
            label: 'Leaves & Absences',
            value: stats.leave + stats.absent,
            icon: LeaveIcon,
            subLabel: `${stats.leave} leave, ${stats.absent} absent`,
            color: stats.absent > 0 ? 'rose' : 'default',
          },
        ]}
      />

      {/* 2. Attendance Logs History */}
      <div className="rounded-3xl theme-bg-surface border-0 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b theme-border">
          <div className="w-10 h-10 rounded-2xl theme-bg-accent-soft theme-accent flex items-center justify-center border-0 shadow-xs">
            <AttendanceIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base uppercase tracking-wider theme-text-primary">
              Daily Attendance &amp; Punch Log History
            </h3>
            <p className="text-xs theme-text-secondary mt-0.5">
              Historical presence, check-in timestamps, and punch device records
            </p>
          </div>
        </div>

        {attendanceLogs.length === 0 ? (
          <EmptyState
            icon={AttendanceIcon}
            title="No Attendance Logs"
            description="No recent attendance check-in records found for this staff member."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b theme-border text-[11px] font-semibold uppercase tracking-wider theme-text-secondary">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Check In</th>
                  <th className="py-3 px-4">Check Out</th>
                  <th className="py-3 px-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {attendanceLogs.slice(0, 25).map((log, idx) => (
                  <tr
                    key={log.id || idx}
                    className="hover:theme-bg-app/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold theme-text-primary">
                      {log.date}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={log.status || 'PRESENT'} />
                    </td>
                    <td className="py-3 px-4 font-mono theme-text-secondary">
                      {log.in_time || log.check_in_time || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono theme-text-secondary">
                      {log.out_time || log.check_out_time || '—'}
                    </td>
                    <td className="py-3 px-4 theme-text-secondary">
                      {log.remarks || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffAttendanceTab;
