import { getVersionTrackerInfo } from "../utils/versionTracker";

const trackerInfo = typeof window !== "undefined" ? getVersionTrackerInfo() : {
  version: "v1.94",
  lastChangeDate: "2026-08-06",
  lastChangeTime: "06:05 PM",
  lastChangeFull: "2026-08-06 06:05 PM"
};

export const APP_VERSION = trackerInfo.version;
export const APP_BUILD_DATE = trackerInfo.lastChangeDate;
export const APP_BUILD_TIME = trackerInfo.lastChangeTime;
export const APP_BUILD_TIMESTAMP = trackerInfo.lastChangeFull;

export const APP_INFO = {
  name: "SPR Note",
  fullTitle: "SPR Note - Hifz Progress Manager",
  version: APP_VERSION,
  buildDate: APP_BUILD_DATE,
  buildTime: APP_BUILD_TIME,
  buildTimestamp: APP_BUILD_TIMESTAMP,
  author: "SPR Note Team",
  description: "Management platform for logging student daily Hifz progress, tracking mistakes/stuck items, and generating automated reports."
};
