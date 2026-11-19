import React, { useMemo } from "react";
import CustomSelect from "../ui/CustomSelect";
import { getEnrichedTimezoneList, getSystemTimezone, TIMEZONE_LIST } from "../../constants/calendarConstants";

export default function TimezoneSelect({
  value,
  onChange,
  label = "Timezone",
  placeholder = "Select Timezone",
  className = "",
  disabled = false,
  error = "",
}) {
  const options = useMemo(() => {
    const list = getEnrichedTimezoneList();
    return list.map((tz) => ({
      value: tz.id,
      label: `(${tz.offset}) ${tz.name} - ${tz.city}${tz.isSystem ? " (Local System)" : ""}`,
    }));
  }, []);

  // Standardize value if passed as GMT offset or raw timezone ID
  const selectedValue = useMemo(() => {
    const list = getEnrichedTimezoneList();
    if (!value) return getSystemTimezone();
    const directMatch = list.find((tz) => tz.id === value);
    if (directMatch) return directMatch.id;

    // Check if value is formatted like "GMT+06:00" or "UTC+06:00"
    const offsetMatch = list.find(
      (tz) => tz.offset.replace("UTC", "GMT") === value || tz.offset === value
    );
    if (offsetMatch) return offsetMatch.id;

    return value;
  }, [value]);

  return (
    <div className={className}>
      {label && <label className="block text-xs font-semibold theme-text-secondary mb-1.5">{label}</label>}
      <CustomSelect
        value={selectedValue}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        searchable
        disabled={disabled}
        error={error}
      />
    </div>
  );
}
