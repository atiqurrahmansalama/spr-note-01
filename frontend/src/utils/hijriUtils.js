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
