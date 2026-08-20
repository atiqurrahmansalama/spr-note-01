/**
 * Convert Gregorian date string (YYYY-MM-DD) to Islamic Hijri Date string
 * Format returned: "3 Safar, 1448h"
 */
export function getHijriDateString(gregorianDateStr) {
  if (!gregorianDateStr) return "";

  try {
    const [year, month, day] = gregorianDateStr.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return "";

    let m = month;
    let y = year;
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    const jdn = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;

    // Islamic Epoch JDN (July 16, 622 CE)
    const islamicEpoch = 1948439.5;
    const daysSinceEpoch = jdn - islamicEpoch;
    const cycle = Math.floor(daysSinceEpoch / 10631);
    const dayOfCycle = daysSinceEpoch - cycle * 10631;

    let yearOfCycle = Math.floor((dayOfCycle - 0.5) / 354.366);
    let dayOfYear = Math.floor(dayOfCycle - yearOfCycle * 354.366);
    if (dayOfYear < 0) dayOfYear = 0;

    const hijriYear = Math.floor(cycle * 30 + yearOfCycle + 1);

    const ISLAMIC_MONTHS = [
      "Muharram",
      "Safar",
      "Rabi' al-Awwal",
      "Rabi' al-Thani",
      "Jumada al-Awwal",
      "Jumada al-Thani",
      "Rajab",
      "Sha'ban",
      "Ramadan",
      "Shawwal",
      "Dhu al-Qi'dah",
      "Dhu al-Hijjah"
    ];

    let hijriMonth = 0;
    let accumulatedDays = 0;
    for (let i = 0; i < 12; i++) {
      const monthDays = (i % 2 === 0) ? 30 : 29;
      if (dayOfYear < accumulatedDays + monthDays) {
        hijriMonth = i;
        break;
      }
      accumulatedDays += monthDays;
    }

    const hijriDay = Math.max(1, Math.floor(dayOfYear - accumulatedDays) + 1);
    const monthName = ISLAMIC_MONTHS[hijriMonth] || "Safar";

    return `${hijriDay} ${monthName}, ${hijriYear}h`;
  } catch {
    return "3 Safar, 1448h";
  }
}

/**
 * Convert a Gregorian Date to structured Hijri details
 */
export function getHijriDetails(gregorianDate = new Date()) {
  const d = new Date(gregorianDate);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();

  let m = month;
  let y = year;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  const jdn = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;

  const islamicEpoch = 1948439.5;
  const daysSinceEpoch = jdn - islamicEpoch;
  const cycle = Math.floor(daysSinceEpoch / 10631);
  const dayOfCycle = daysSinceEpoch - cycle * 10631;

  let yearOfCycle = Math.floor((dayOfCycle - 0.5) / 354.366);
  let dayOfYear = Math.floor(dayOfCycle - yearOfCycle * 354.366);
  if (dayOfYear < 0) dayOfYear = 0;

  const hijriYear = Math.floor(cycle * 30 + yearOfCycle + 1);

  const ISLAMIC_MONTHS = [
    "Muharram",
    "Safar",
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi'dah",
    "Dhu al-Hijjah"
  ];

  let hijriMonth = 0;
  let accumulatedDays = 0;
  for (let i = 0; i < 12; i++) {
    const monthDays = (i % 2 === 0) ? 30 : 29;
    if (dayOfYear < accumulatedDays + monthDays) {
      hijriMonth = i;
      break;
    }
    accumulatedDays += monthDays;
  }

  const hijriDay = Math.max(1, Math.floor(dayOfYear - accumulatedDays) + 1);
  const totalDaysInThisMonth = (hijriMonth % 2 === 0) ? 30 : 29;
  const monthName = ISLAMIC_MONTHS[hijriMonth] || "Safar";

  return {
    year: hijriYear,
    month: hijriMonth + 1,
    monthName,
    day: hijriDay,
    daysInMonth: totalDaysInThisMonth,
  };
}

/**
 * Returns Gregorian start & end dates (YYYY-MM-DD) for the current full Hijri month
 */
export function getCurrentHijriMonthRange(gregorianDate = new Date()) {
  const details = getHijriDetails(gregorianDate);
  const today = new Date(gregorianDate);

  // Start date = today - (hijriDay - 1)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (details.day - 1));

  // End date = startDate + (daysInMonth - 1)
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + (details.daysInMonth - 1));

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  return {
    start: startStr,
    end: endStr,
    hijriMonthName: details.monthName,
    hijriYear: details.year,
    label: `Full Hijri Month (${details.monthName})`,
  };
}
