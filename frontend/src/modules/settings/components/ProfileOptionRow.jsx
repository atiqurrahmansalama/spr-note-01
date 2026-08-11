import { ChevronRightIcon } from "./Icons";

export default function ProfileOptionRow({
  icon,
  title,
  subtitle,
  badgeText,
  badgeStyle,
  onClick,
  isDanger = false,
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-4.5 flex items-center justify-between transition-colors cursor-pointer group select-none ${
        isDanger ? "hover:theme-bg-danger-soft" : "hover:theme-bg-elevated"
      }`}
    >
      {/* Left Side: Icon Badge + Text Stack */}
      <div className="flex items-center min-w-0 pr-3">
        <div
          className={`p-2.5 rounded-xl border flex items-center justify-center mr-3.5 w-10 h-10 shrink-0 transition-colors ${
            isDanger
              ? "theme-bg-danger-soft theme-danger border-rose-500/20"
              : "theme-bg-sub theme-text-primary border-white/[0.06] group-hover:theme-border"
          }`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <h3
            className={`text-sm font-semibold transition-colors ${
              isDanger ? "theme-danger" : "theme-text-primary"
            }`}
          >
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs theme-text-secondary font-normal mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Side: Badge / Status + Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        {badgeText && (
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-semibold font-mono ${
              badgeStyle || "theme-bg-sub theme-text-primary border theme-border"
            }`}
          >
            {badgeText}
          </span>
        )}

        <ChevronRightIcon
          className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${
            isDanger ? "theme-danger" : "theme-text-secondary group-hover:theme-text-primary"
          }`}
        />
      </div>
    </div>
  );
}
