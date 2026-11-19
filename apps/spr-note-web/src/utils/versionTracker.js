const STORAGE_KEY = "spr_version_tracker_v1";
const COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes in milliseconds

const DEFAULT_STATE = {
  majorPrefix: "v1",
  subVersion: 94,
  lastVersionBumpTime: Date.now(),
  lastChangeTime: Date.now(),
};

function formatLocalTime(timestamp) {
  const d = new Date(timestamp);
  const dateStr = d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return { dateStr, timeStr, fullStr: `${dateStr} ${timeStr}` };
}

function loadTrackerState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        majorPrefix: "v1",
        subVersion: typeof parsed.subVersion === "number" ? parsed.subVersion : 94,
        lastVersionBumpTime: parsed.lastVersionBumpTime || Date.now(),
        lastChangeTime: parsed.lastChangeTime || Date.now(),
      };
    }
  } catch {
    // fallback
  }
  return { ...DEFAULT_STATE, lastVersionBumpTime: Date.now(), lastChangeTime: Date.now() };
}

function saveTrackerState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage fallback
  }
}

/**
 * Record a change event in the project.
 * Updates exact change timestamp. Increments subversion (v1.x) if >= 60 minutes have passed since last bump.
 */
export function recordProjectChange() {
  const state = loadTrackerState();
  const now = Date.now();
  state.lastChangeTime = now;

  const elapsed = now - state.lastVersionBumpTime;
  if (elapsed >= COOLDOWN_MS) {
    state.subVersion += 1;
    state.lastVersionBumpTime = now;
  }

  saveTrackerState(state);
  window.dispatchEvent(new CustomEvent("spr_version_updated", { detail: getVersionTrackerInfo() }));
  return getVersionTrackerInfo();
}

/**
 * Returns current version string (e.g. "v1.94") and last change time details.
 */
export function getVersionTrackerInfo() {
  const state = loadTrackerState();
  const timeFormatted = formatLocalTime(state.lastChangeTime);

  return {
    version: `${state.majorPrefix}.${state.subVersion}`,
    subVersion: state.subVersion,
    lastChangeTime: timeFormatted.timeStr,
    lastChangeDate: timeFormatted.dateStr,
    lastChangeFull: timeFormatted.fullStr,
    rawTimestamp: state.lastChangeTime,
    lastVersionBumpTime: state.lastVersionBumpTime,
  };
}

// Auto-initialize change listeners
if (typeof window !== "undefined") {
  window.addEventListener("spr_report_saved", () => {
    recordProjectChange();
  });
  window.addEventListener("spr_project_changed", () => {
    recordProjectChange();
  });
}
