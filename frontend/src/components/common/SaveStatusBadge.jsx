import { useState, useEffect, useRef } from "react";
import { SleekCheckIcon, CloudCheckIcon } from "../ui/Icons";

export default function SaveStatusBadge() {
  const [status, setStatus] = useState(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const handleStatusChange = (e) => {
      if (e.detail) {
        setStatus(e.detail);
        setVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setVisible(false);
        }, 600);
      }
    };
    window.addEventListener("spr_save_status_change", handleStatusChange);
    return () => {
      window.removeEventListener("spr_save_status_change", handleStatusChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!status) return null;

  const isDb = status.type === "database";

  return (
    <div 
      className={`flex items-center gap-1.5 text-xs font-semibold transition-all duration-300 transform select-none ${
        visible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 -translate-y-1 scale-95 pointer-events-none"
      } ${isDb ? "text-emerald-400" : "theme-accent"}`}
    >
      {isDb ? (
        <CloudCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <SleekCheckIcon className="w-4 h-4 theme-accent shrink-0" />
      )}
      <span>{status.message || (isDb ? "Saved to Cloud DB" : "Saved Locally")}</span>
    </div>
  );
}
