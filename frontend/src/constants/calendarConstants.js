export const TIMEZONE_LIST = [
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
  { id: "UTC", name: "UTC Standard", city: "Universal Coordinated Time", offset: "UTC+00:00" },
];

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
