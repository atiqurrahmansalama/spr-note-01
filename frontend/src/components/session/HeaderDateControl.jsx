import { useMemo, useState, useRef } from "react";

const TIMEZONE_MAP = {
  "America/New_York": "EDT",
  "America/Chicago": "CDT",
  "America/Denver": "MDT",
  "America/Los_Angeles": "PDT",
  "Asia/Dhaka": "BST",
  "Europe/London": "BST",
  "UTC": "UTC",
};

export default function HeaderDateControl({ timeZone = "America/New_York", dateFormat = "MM/DD/YYYY", onDateChange }) {
  const [selectedCustomDate, setSelectedCustomDate] = useState(null);
  const dateInputRef = useRef(null);

  // ১. টাইমজোন অনুযায়ী ডিফল্ট তারিখ গণনা
  const defaultCalculatedDate = useMemo(() => {
    try {
      const now = new Date();
      const tzDateString = now.toLocaleDateString("en-US", { timeZone });
      const tzDate = new Date(tzDateString);

      const year = tzDate.getFullYear();
      const month = String(tzDate.getMonth() + 1).padStart(2, "0");
      const day = String(tzDate.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    } catch {
      return "2026-07-30";
    }
  }, [timeZone]);

  const activeRawDate = selectedCustomDate || defaultCalculatedDate;

  // ২. সিলেক্টেড ডেট ফরমেট অনুযায়ী ডিসপ্লে স্ট্রিং
  const formattedDisplayDate = useMemo(() => {
    if (!activeRawDate) return "";
    const [year, month, day] = activeRawDate.split("-");

    if (dateFormat === "MM/DD/YYYY") {
      return `${month}/${day}/${year}`;
    } else if (dateFormat === "DD/MM/YYYY") {
      return `${day}/${month}/${year}`;
    } else {
      return `${year}-${month}-${day}`;
    }
  }, [activeRawDate, dateFormat]);

  // 🎯 পুরো বক্সে ক্লিকে ক্যালেন্ডার ওপেন করার হ্যান্ডলার
  const handleContainerClick = () => {
    if (dateInputRef.current) {
      if ("showPicker" in HTMLInputElement.prototype) {
        dateInputRef.current.showPicker(); // Modern Native Calendar Trigger
      } else {
        dateInputRef.current.focus();
      }
    }
  };

  const handleDatePick = (e) => {
    const pickedValue = e.target.value;
    if (pickedValue) {
      setSelectedCustomDate(pickedValue);
      if (onDateChange) onDateChange(pickedValue);
    }
  };

  const tzAbbr = TIMEZONE_MAP[timeZone] || "TZ";

  return (
    <div className="flex items-center justify-center gap-2.5 text-xs font-semibold uppercase tracking-widest text-slate-400 bg-[#17181a] px-4 py-2 rounded-xl border border-slate-800 shadow-inner w-fit mx-auto select-none">
      <span className="text-slate-500 font-bold">DATE</span>

      {/* 🚀 পুরো কন্টেইনার ক্লিকাবল (JS Trigger Method) */}
      <div
        onClick={handleContainerClick}
        className="relative cursor-pointer hover:bg-slate-800/60 px-3 py-1 rounded-lg transition-all duration-150 flex items-center justify-center border border-transparent hover:border-slate-700/80 group"
        title="Click anywhere to pick date"
      >
        {/* রেন্ডারকৃত সুন্দর তারিখ টেক্সট (কোনো আন্ডারলাইন ছাড়া) */}
        <span className="text-slate-100 font-serif font-bold text-sm tracking-normal group-hover:text-indigo-300 transition-colors">
          {formattedDisplayDate}
        </span>

        {/* হিডেন ইনপুট যা ব্যাকগ্রাউন্ডে রেফারেন্স হিসেবে কাজ করছে */}
        <input
          ref={dateInputRef}
          type="date"
          value={activeRawDate}
          onChange={handleDatePick}
          className="sr-only" // Screen reader style hidden
        />
      </div>

      {/* টাইমজোন ব্যাজ */}
      <span className="text-[11px] font-mono text-indigo-400 font-bold bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/50">
        ({tzAbbr})
      </span>
    </div>
  );
}