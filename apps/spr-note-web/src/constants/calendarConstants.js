export const getSystemTimezone = () => {
  try {
    if (typeof Intl !== "undefined" && Intl.DateTimeFormat) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) return tz;
    }
  } catch (e) {
    // fallback
  }
  return "UTC";
};

export const getTimezoneOffsetString = (timeZone) => {
  try {
    const targetTz = timeZone || getSystemTimezone();
    const date = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    if (tzPart && tzPart.value) {
      const val = tzPart.value.replace("GMT", "UTC");
      if (val === "UTC") return "UTC+00:00";
      const match = val.match(/UTC([+-])(\d+)(?::(\d+))?/);
      if (match) {
        const sign = match[1];
        const hours = match[2].padStart(2, "0");
        const minutes = (match[3] || "00").padStart(2, "0");
        return `UTC${sign}${hours}:${minutes}`;
      }
      return val;
    }
  } catch (e) {
    // Fallback using local device offset
    try {
      const offsetMin = -new Date().getTimezoneOffset();
      const sign = offsetMin >= 0 ? "+" : "-";
      const hrs = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, "0");
      const mins = String(Math.abs(offsetMin) % 60).padStart(2, "0");
      return `UTC${sign}${hrs}:${mins}`;
    } catch {
      // ignore
    }
  }
  return "UTC+00:00";
};

export const getTodayInTimezone = (timeZone) => {
  try {
    const tz = timeZone || getSystemTimezone();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (year && month && day) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  } catch (e) {
    console.warn("[calendarConstants] Failed to format date in timezone:", timeZone, e);
  }
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getClassroomEffectiveTimezone = () => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const classroomTz = localStorage.getItem("spr_classroom_timezone");
      if (classroomTz && classroomTz !== "APP_DEFAULT") {
        return classroomTz;
      }
      const appTz = localStorage.getItem("spr_timezone") || localStorage.getItem("spr_calendar_timezone");
      if (appTz) return appTz;
    }
  } catch (e) {
    // fallback
  }
  return getSystemTimezone();
};

export const getClassroomTodayDate = () => {
  return getTodayInTimezone(getClassroomEffectiveTimezone());
};

export const TIMEZONE_LIST = [
  { id: "UTC", name: "UTC (International Standard)", city: "Universal Coordinated Time (GMT)", offset: "UTC+00:00" },
  { id: "Asia/Dhaka", name: "Asia / Dhaka", city: "Dhaka, Bangladesh", offset: "UTC+06:00" },
  { id: "Asia/Riyadh", name: "Asia / Riyadh", city: "Riyadh & Makkah, Saudi Arabia", offset: "UTC+03:00" },
  { id: "Asia/Dubai", name: "Asia / Dubai", city: "Dubai, United Arab Emirates", offset: "UTC+04:00" },
  { id: "Asia/Kolkata", name: "Asia / Kolkata", city: "New Delhi & Kolkata, India", offset: "UTC+05:30" },
  { id: "Asia/Karachi", name: "Asia / Karachi", city: "Karachi & Islamabad, Pakistan", offset: "UTC+05:00" },
  { id: "Asia/Kuala_Lumpur", name: "Asia / Kuala Lumpur", city: "Kuala Lumpur, Malaysia", offset: "UTC+08:00" },
  { id: "Asia/Jakarta", name: "Asia / Jakarta", city: "Jakarta, Indonesia", offset: "UTC+07:00" },
  { id: "Europe/London", name: "Europe / London", city: "London, United Kingdom", offset: "UTC+01:00" },
  { id: "Europe/Paris", name: "Europe / Paris", city: "Paris & Berlin, Europe", offset: "UTC+02:00" },
  { id: "America/New_York", name: "America / New York", city: "New York, USA", offset: "UTC-04:00" },
  { id: "America/Chicago", name: "America / Chicago", city: "Chicago, USA", offset: "UTC-05:00" },
  { id: "America/Los_Angeles", name: "America / Los Angeles", city: "Los Angeles, USA", offset: "UTC-07:00" },
  { id: "America/Toronto", name: "America / Toronto", city: "Toronto, Canada", offset: "UTC-04:00" },
  { id: "Australia/Sydney", name: "Australia / Sydney", city: "Sydney, Australia", offset: "UTC+10:00" },
];

export const getEnrichedTimezoneList = () => {
  const systemTz = getSystemTimezone();
  const exists = TIMEZONE_LIST.some((tz) => tz.id === systemTz);
  if (!exists && systemTz && systemTz !== "UTC") {
    const formattedName = systemTz.replace(/_/g, " ");
    const offset = getTimezoneOffsetString(systemTz);
    return [
      {
        id: systemTz,
        name: formattedName,
        city: "Detected Device Timezone",
        offset,
        isSystem: true,
      },
      ...TIMEZONE_LIST,
    ];
  }
  return TIMEZONE_LIST;
};

export const DATE_FORMAT_LIST = [
  { id: "DD/MM/YYYY", name: "DD/MM/YYYY", sample: "05/08/2026", label: "Day / Month / Year (UK / Asia / International Standard)" },
  { id: "MM/DD/YYYY", name: "MM/DD/YYYY", sample: "08/05/2026", label: "Month / Day / Year (US Standard)" },
  { id: "YYYY-MM-DD", name: "YYYY-MM-DD", sample: "2026-08-05", label: "Year - Month - Day (ISO 8601 Standard)" },
  { id: "DD MMM YYYY", name: "DD MMM YYYY", sample: "05 Aug 2026", label: "Day Short-Month Year" },
  { id: "DD MMMM YYYY", name: "DD MMMM YYYY", sample: "05 August 2026", label: "Day Full-Month Year" },
  { id: "MMM DD, YYYY", name: "MMM DD, YYYY", sample: "Aug 05, 2026", label: "Short-Month Day, Year" },
  { id: "MMMM DD, YYYY", name: "MMMM DD, YYYY", sample: "August 05, 2026", label: "Full-Month Day, Year" },
  { id: "DD.MM.YYYY", name: "DD.MM.YYYY", sample: "05.08.2026", label: "Day.Month.Year (European Standard)" },
  { id: "YYYY/MM/DD", name: "YYYY/MM/DD", sample: "2026/08/05", label: "Year / Month / Day (East Asia Standard)" },
];

export const FIRST_DAY_LIST = [
  { id: "Saturday", name: "Saturday", label: "Madrasa / Regional Weekend Standard" },
  { id: "Sunday", name: "Sunday", label: "International Weekend Standard" },
  { id: "Monday", name: "Monday", label: "ISO 8601 Standard" },
];
