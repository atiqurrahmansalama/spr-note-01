import React, { useMemo } from "react";
import CustomSelect from "../ui/CustomSelect";
import { TIMEZONE_LIST } from "../../constants/calendarConstants";

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
    return TIMEZONE_LIST.map((tz) => ({
      value: tz.id,
      label: `(${tz.offset}) ${tz.name} - ${tz.city}`,
    }));
  }, []);

  // Standardize value if passed as GMT offset or raw timezone ID
  const selectedValue = useMemo(() => {
    if (!value) return "Asia/Dhaka";
    const directMatch = TIMEZONE_LIST.find((tz) => tz.id === value);
    if (directMatch) return directMatch.id;

    // Check if value is formatted like "GMT+06:00" or "UTC+06:00"
    const offsetMatch = TIMEZONE_LIST.find(
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
