import React, { useId, useState } from "react";
import { AlertCircleIcon, EyeIcon, EyeOffIcon } from "../ui/Icons";

export interface PortalInputFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "password";
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  labelRight?: React.ReactNode;
  hint?: string;
  error?: string | null;
  showError?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
}

/**
 * Shared borderless soft-surface input field for Standalone Auth & Public Portals.
 * Implements deferred post-interaction validation feedback, ARIA error linkage,
 * accessible password visibility toggle with aria-pressed, and RTL-logical alignment.
 */
export default function PortalInputField({
  name,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  required = false,
  disabled = false,
  icon,
  labelRight,
  hint,
  error,
  showError = false,
  inputRef,
  showPasswordLabel = "Show password",
  hidePasswordLabel = "Hide password",
}: PortalInputFieldProps): React.JSX.Element {
  const uid = useId();
  const inputId = `${uid}-${name}`;
  const hintId = `${uid}-${name}-hint`;
  const errorId = `${uid}-${name}-error`;

  const [passwordVisible, setPasswordVisible] = useState(false);

  const isPasswordField = type === "password";
  const resolvedType = isPasswordField ? (passwordVisible ? "text" : "password") : type;
  const hasVisibleError = Boolean(showError && error);

  // Order aria-describedby: hint first, error appended only while invalid
  const describedByIds: string[] = [];
  if (hint) describedByIds.push(hintId);
  if (hasVisibleError) describedByIds.push(errorId);
  const describedBy = describedByIds.length > 0 ? describedByIds.join(" ") : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold theme-text-primary text-start"
        >
          <span>{label}</span>
          {required && (
            <span aria-hidden="true" className="text-rose-500 ms-1">
              *
            </span>
          )}
        </label>
        {labelRight}
      </div>

      <div
        className={`flex items-center gap-2.5 px-3.5 py-3 rounded-2xl border-0 ring-0 transition-all shadow-2xs ${
          hasVisibleError
            ? "bg-rose-500/10"
            : "theme-bg-app focus-within:theme-bg-elevated/40"
        }`}
      >
        {icon && <span className="theme-text-secondary shrink-0 flex items-center">{icon}</span>}

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type={resolvedType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-invalid={hasVisibleError ? "true" : "false"}
          aria-describedby={describedBy}
          className="w-full min-w-0 bg-transparent border-none outline-none theme-text-primary placeholder:theme-text-muted text-sm text-start disabled:opacity-60"
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setPasswordVisible((prev) => !prev)}
            aria-label={passwordVisible ? hidePasswordLabel : showPasswordLabel}
            aria-pressed={passwordVisible}
            className="theme-text-secondary hover:theme-text-primary transition p-1 rounded-lg cursor-pointer shrink-0 border-0 ring-0"
          >
            {passwordVisible ? (
              <EyeOffIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {hint && !hasVisibleError && (
        <p id={hintId} className="text-[11px] theme-text-secondary text-start ps-1">
          {hint}
        </p>
      )}

      {hasVisibleError && (
        <p
          id={errorId}
          role="alert"
          className="text-[11px] font-medium text-rose-500 flex items-center gap-1.5 text-start ps-1"
        >
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

