/**
 * Enterprise Reusable Attendance Timing & Lifecycle Engine
 * 
 * Provides unified, dynamic rule resolution for:
 * - Class Attendance (Period slot based)
 * - Residential Attendance (Checkpoint based)
 * - Staff Daily Attendance (Daily shift based)
 * - Teacher Class Attendance (Student class derived)
 * 
 * Enforces:
 * 1. Unstarted Window -> Blank / Locked (Teacher cannot mark; Admin can override)
 * 2. Normal Window (Before Late Cutoff) -> Only PRESENT or ABSENT allowed
 * 3. Late Grace Window (After Late Cutoff until Window End) -> Only LATE or ABSENT allowed (PRESENT blocked)
 * 4. Window Expired / Post-Lockout -> Automatically resolves to ABSENT if blank; Teachers locked out; Admin can edit within Admin Edit Window.
 * 5. Leave (ON_LEAVE) -> Admin-only status.
 * 6. Precise Delay Minutes Calculation.
 */

import { DEFAULT_ATTENDANCE_TIMING_POLICY } from './localStore.js';

/**
 * Parses "HH:MM" or "HH:MM:SS" string and returns minutes from midnight.
 */
export function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  return h * 60 + m;
}

/**
 * Converts minutes from midnight into 24h "HH:MM" string.
 */
export function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates exact delay minutes between scheduled start time and actual arrival time.
 * @param {string} scheduledTimeStr - "HH:MM"
 * @param {string} actualTimeStr - "HH:MM"
 * @returns {number} positive minutes late or 0 if on-time/early
 */
export function calculateLateDelayMinutes(scheduledTimeStr, actualTimeStr) {
  if (!scheduledTimeStr || !actualTimeStr) return 0;
  const schMin = timeStringToMinutes(scheduledTimeStr);
  const actMin = timeStringToMinutes(actualTimeStr);
  const diff = actMin - schMin;
  return diff > 0 ? diff : 0;
}

/**
 * Resolves the historical or active policy in effect for a given target date.
 * Ensures changing policies today does not retroactively alter the evaluation
 * of historical dates.
 * 
 * @param {string} targetDate - 'YYYY-MM-DD'
 * @param {Object} basePolicy - The currently loaded Attendance Policy Object
 * @returns {Object} Policy configuration active on targetDate
 */
export function resolvePolicyForDate(targetDate, basePolicy) {
  if (!basePolicy) return DEFAULT_ATTENDANCE_TIMING_POLICY;
  if (!targetDate || typeof targetDate !== 'string') {
    return { ...DEFAULT_ATTENDANCE_TIMING_POLICY, ...basePolicy };
  }

  const effectiveFrom = basePolicy.effective_from || '1970-01-01';

  if (targetDate < effectiveFrom && Array.isArray(basePolicy.history_log) && basePolicy.history_log.length > 0) {
    // Search history log for matching snapshot
    for (let i = basePolicy.history_log.length - 1; i >= 0; i--) {
      const hist = basePolicy.history_log[i];
      if (hist && hist.policy) {
        const fromDate = hist.effective_from || '1970-01-01';
        const toDate = hist.effective_to || '9999-12-31';
        if (targetDate >= fromDate && targetDate <= toDate) {
          return {
            ...DEFAULT_ATTENDANCE_TIMING_POLICY,
            ...hist.policy,
            is_historical_version: true,
            historical_period: `${fromDate} to ${toDate}`,
          };
        }
      }
    }

    const oldestHist = basePolicy.history_log[0];
    if (oldestHist && oldestHist.policy) {
      return {
        ...DEFAULT_ATTENDANCE_TIMING_POLICY,
        ...oldestHist.policy,
        is_historical_version: true,
      };
    }
  }

  return { ...DEFAULT_ATTENDANCE_TIMING_POLICY, ...basePolicy };
}

/**
 * Resolves cell lifecycle state, editability, allowed statuses, and display fallback.
 * 
 * @param {Object} params
 * @param {'CLASS'|'RESIDENTIAL'|'STAFF'|'TEACHER_CLASS'} params.moduleType
 * @param {string} params.targetDate - 'YYYY-MM-DD'
 * @param {string} [params.startTime] - 'HH:MM'
 * @param {string} [params.endTime] - 'HH:MM'
 * @param {Object} [params.policy] - Attendance Policy Object
 * @param {boolean} [params.isAdmin] - Whether the active user is an Admin / SuperAdmin / Principal
 * @param {string} [params.currentStatus] - Current recorded status (e.g. 'PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE')
 * @param {Date} [params.nowDate] - Current real-world datetime object
 * @returns {Object} { state, isEditable, allowedStatuses, displayStatus, lateMinutes, tooltip, canEditArrivalTime }
 */
export function getAttendanceCellTimingState({
  moduleType = 'CLASS',
  targetDate,
  startTime = '',
  endTime = '',
  policy = DEFAULT_ATTENDANCE_TIMING_POLICY,
  isAdmin = false,
  currentStatus = '',
  effectiveStartDate = null,
  nowDate = new Date(),
}) {
  const activePolicyForDate = resolvePolicyForDate(targetDate, policy);
  const safePolicy = { ...DEFAULT_ATTENDANCE_TIMING_POLICY, ...(activePolicyForDate || {}) };

  const nowYear = nowDate.getFullYear();
  const nowMonth = String(nowDate.getMonth() + 1).padStart(2, '0');
  const nowDay = String(nowDate.getDate()).padStart(2, '0');
  const todayStr = `${nowYear}-${nowMonth}-${nowDay}`;
  const nowMinutes = nowDate.getHours() * 60 + nowDate.getMinutes();

  // Helper status lists
  const ADMIN_STATUS_OPTIONS = ['PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE'];
  const NORMAL_STATUS_OPTIONS = ['PRESENT', 'ABSENT'];
  const LATE_STATUS_OPTIONS = ['LATE', 'ABSENT'];

  // Normalize currentStatus
  const normalizedCurrentStatus = currentStatus || '';

  // ─── 0. Target Date Precedes Admission / Joining Date ─────────────────────
  if (effectiveStartDate && targetDate < effectiveStartDate && !normalizedCurrentStatus) {
    return {
      state: 'BEFORE_ONBOARDING',
      isEditable: false,
      allowedStatuses: [],
      displayStatus: 'NOT_APPLICABLE',
      lateMinutes: 0,
      tooltip: `Date precedes official joining / admission date (${effectiveStartDate}).`,
      canEditArrivalTime: false,
      reason: 'BEFORE_ONBOARDING',
    };
  }

  // Dynamically resolve auto-absent policy flag based on moduleType
  const isAutoAbsentEnabled =
    moduleType === 'RESIDENTIAL'
      ? Boolean(safePolicy.residential_auto_absent_on_expiry)
      : moduleType === 'STAFF'
      ? Boolean(safePolicy.staff_auto_absent_on_expiry)
      : Boolean(safePolicy.class_auto_absent_on_expiry);

  // ─── 1. Target Date is in the Future ──────────────────────────────────────
  if (targetDate > todayStr) {
    return {
      state: 'FUTURE_LOCKED',
      isEditable: false,
      allowedStatuses: [],
      displayStatus: '',
      lateMinutes: 0,
      tooltip: 'Attendance cannot be marked for future dates.',
      canEditArrivalTime: false,
      reason: 'FUTURE_DATE',
    };
  }

  // ─── 2. Target Date is in the Past (< today) ──────────────────────────────
  if (targetDate < todayStr) {
    const tObj = new Date(targetDate);
    const nowObj = new Date(todayStr);
    const diffDays = Math.floor((nowObj - tObj) / (1000 * 60 * 60 * 24));
    const adminWindowDays = Number(safePolicy.admin_edit_window_days) || 30;

    // Check Admin Override Privilege
    if (isAdmin) {
      const isWithinAdminWindow = adminWindowDays <= 0 || diffDays <= adminWindowDays;
      if (isWithinAdminWindow) {
        return {
          state: 'ADMIN_OVERRIDE',
          isEditable: true,
          allowedStatuses: ADMIN_STATUS_OPTIONS,
          displayStatus: normalizedCurrentStatus || (isAutoAbsentEnabled ? 'ABSENT' : ''),
          lateMinutes: 0,
          tooltip: `Admin Override (${diffDays} days past). Full status & arrival editing available.`,
          canEditArrivalTime: true,
          reason: 'ADMIN_PAST_OVERRIDE',
        };
      }
      return {
        state: 'ADMIN_WINDOW_EXPIRED',
        isEditable: false,
        allowedStatuses: [],
        displayStatus: normalizedCurrentStatus || (isAutoAbsentEnabled ? 'ABSENT' : ''),
        lateMinutes: 0,
        tooltip: `Admin edit window (${adminWindowDays} days) has expired.`,
        canEditArrivalTime: false,
        reason: 'ADMIN_WINDOW_EXPIRED',
      };
    }

    // Regular Teachers / Staff (Locked on past dates; unrecorded auto-resolves to Absent)
    return {
      state: 'PAST_LOCKED',
      isEditable: false,
      allowedStatuses: [],
      displayStatus: normalizedCurrentStatus || (isAutoAbsentEnabled ? 'ABSENT' : ''),
      lateMinutes: 0,
      tooltip: 'Attendance window expired for past dates. Automatically resolved to Absent.',
      canEditArrivalTime: false,
      reason: 'TEACHER_PAST_EXPIRED',
    };
  }

  // ─── 3. Target Date is Today (Live Day Time-Window Evaluation) ─────────────
  let slotStartMin = 0;
  let lateStartMin = 0;
  let lateEndMin = 0;
  let slotEndMin = 0;
  let teacherEditLimitMin = 0;

  if (moduleType === 'CLASS' || moduleType === 'TEACHER_CLASS' || moduleType === 'TEACHER') {
    const defaultStart = startTime || '08:00';
    const defaultEnd = endTime || '08:45';
    slotStartMin = timeStringToMinutes(defaultStart);
    const rawEndMin = timeStringToMinutes(defaultEnd);
    slotEndMin = rawEndMin > slotStartMin ? rawEndMin : slotStartMin + 45;

    const lateStartGrace = Number(safePolicy.class_late_start_minutes) || 10;
    const lateEndGrace = Number(safePolicy.class_late_end_minutes) || 25;
    const bufferMin = Number(safePolicy.class_end_buffer_minutes) || 15;
    const teacherEditHours = Number(safePolicy.class_teacher_edit_window_hours) || 4;

    lateStartMin = slotStartMin + lateStartGrace;
    lateEndMin = slotStartMin + lateEndGrace;
    const sessionCloseMin = slotEndMin + bufferMin;
    teacherEditLimitMin = sessionCloseMin + teacherEditHours * 60;
  } else if (moduleType === 'RESIDENTIAL') {
    const defaultStart = startTime || '05:30';
    slotStartMin = timeStringToMinutes(defaultStart);

    const lateStartGrace = Number(safePolicy.residential_late_start_minutes) || 15;
    const lateEndGrace = Number(safePolicy.residential_late_end_minutes) || 35;
    const bufferMin = Number(safePolicy.residential_end_buffer_minutes) || 45;
    const teacherEditHours = Number(safePolicy.residential_teacher_edit_window_hours) || 4;

    lateStartMin = slotStartMin + lateStartGrace;
    lateEndMin = slotStartMin + lateEndGrace;
    slotEndMin = slotStartMin + bufferMin;
    teacherEditLimitMin = slotEndMin + teacherEditHours * 60;
  } else {
    // STAFF DAILY ATTENDANCE
    const staffStartStr = safePolicy.staff_start_time || '07:30';
    const staffLateStartStr = safePolicy.staff_late_start_time || '08:15';
    const staffLateEndStr = safePolicy.staff_late_end_time || '09:00';
    const staffEndStr = safePolicy.staff_end_time || '10:00';
    const teacherEditHours = Number(safePolicy.staff_teacher_edit_window_hours) || 2;

    slotStartMin = timeStringToMinutes(staffStartStr);
    lateStartMin = timeStringToMinutes(staffLateStartStr);
    lateEndMin = timeStringToMinutes(staffLateEndStr);
    slotEndMin = timeStringToMinutes(staffEndStr);
    teacherEditLimitMin = slotEndMin + teacherEditHours * 60;
  }

  // A. Before Start Time (Unstarted)
  if (nowMinutes < slotStartMin) {
    if (isAdmin) {
      return {
        state: 'ADMIN_EARLY_OVERRIDE',
        isEditable: true,
        allowedStatuses: ADMIN_STATUS_OPTIONS,
        displayStatus: normalizedCurrentStatus,
        lateMinutes: 0,
        tooltip: `Admin Early Access. Starts at ${minutesToTimeString(slotStartMin)}.`,
        canEditArrivalTime: true,
        reason: 'ADMIN_EARLY',
      };
    }
    return {
      state: 'UNSTARTED_LOCKED',
      isEditable: false,
      allowedStatuses: [],
      displayStatus: '',
      lateMinutes: 0,
      tooltip: `Attendance session will open at ${minutesToTimeString(slotStartMin)}.`,
      canEditArrivalTime: false,
      reason: 'SESSION_NOT_STARTED',
    };
  }

  // B. Normal Active Window (Between Start Time and Late Start Threshold)
  if (nowMinutes >= slotStartMin && nowMinutes < lateStartMin) {
    return {
      state: 'OPEN_NORMAL',
      isEditable: true,
      allowedStatuses: isAdmin ? ADMIN_STATUS_OPTIONS : NORMAL_STATUS_OPTIONS,
      displayStatus: normalizedCurrentStatus,
      lateMinutes: 0,
      tooltip: `Active Attendance Session (Normal). On-time check-in until ${minutesToTimeString(lateStartMin)}.`,
      canEditArrivalTime: isAdmin,
      reason: 'ACTIVE_NORMAL',
    };
  }

  // C. Late Grace Window (Between Late Start Threshold and Late End Threshold)
  if (nowMinutes >= lateStartMin && nowMinutes < lateEndMin) {
    const delay = nowMinutes - slotStartMin;
    return {
      state: 'OPEN_LATE',
      isEditable: true,
      allowedStatuses: isAdmin ? ADMIN_STATUS_OPTIONS : LATE_STATUS_OPTIONS,
      displayStatus: normalizedCurrentStatus,
      lateMinutes: delay,
      tooltip: `Late Grace Period Active (${delay} mins delay). Only Late and Absent allowed.`,
      canEditArrivalTime: isAdmin,
      reason: 'ACTIVE_LATE',
    };
  }

  // D. Post Late Window but within Teacher Edit Window (Active edit window - unrecorded remains pending)
  if (nowMinutes >= lateEndMin && nowMinutes < teacherEditLimitMin) {
    const delay = nowMinutes - slotStartMin;
    return {
      state: 'TEACHER_EDIT_WINDOW',
      isEditable: true,
      allowedStatuses: isAdmin ? ADMIN_STATUS_OPTIONS : LATE_STATUS_OPTIONS,
      displayStatus: normalizedCurrentStatus,
      lateMinutes: delay,
      tooltip: `Teacher edit window active until ${minutesToTimeString(teacherEditLimitMin)}.`,
      canEditArrivalTime: isAdmin,
      reason: 'TEACHER_EDIT_EXTENDED',
    };
  }

  // E. Session Closed / Expired
  if (isAdmin) {
    return {
      state: 'ADMIN_OVERRIDE',
      isEditable: true,
      allowedStatuses: ADMIN_STATUS_OPTIONS,
      displayStatus: normalizedCurrentStatus || (isAutoAbsentEnabled ? 'ABSENT' : ''),
      lateMinutes: 0,
      tooltip: `Session ended. Admin full override permitted.`,
      canEditArrivalTime: true,
      reason: 'ADMIN_SAME_DAY_OVERRIDE',
    };
  }

  return {
    state: 'SESSION_EXPIRED_LOCKED',
    isEditable: false,
    allowedStatuses: [],
    displayStatus: normalizedCurrentStatus || (isAutoAbsentEnabled ? 'ABSENT' : ''),
    lateMinutes: 0,
    tooltip: `Attendance window expired at ${minutesToTimeString(teacherEditLimitMin)}. Unrecorded marked Absent.`,
    canEditArrivalTime: false,
    reason: 'SESSION_EXPIRED',
  };
}

/**
 * Cycles to the next allowable status based on dynamic timing rules.
 * @param {string} currentStatus 
 * @param {Array<string>} allowedStatuses 
 * @returns {string}
 */
export function cycleStatusWithinAllowed(currentStatus, allowedStatuses = ['PRESENT', 'ABSENT']) {
  if (!Array.isArray(allowedStatuses) || allowedStatuses.length === 0) {
    return currentStatus || '';
  }

  const norm = String(currentStatus || '').toUpperCase();
  const currentIndex = allowedStatuses.indexOf(norm);

  if (currentIndex === -1) {
    return allowedStatuses[0];
  }

  if (currentIndex < allowedStatuses.length - 1) {
    return allowedStatuses[currentIndex + 1];
  }

  // Cycle back to first or empty
  return allowedStatuses[0];
}
