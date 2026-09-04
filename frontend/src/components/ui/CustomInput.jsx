import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useId,
  useImperativeHandle,
} from "react";
import {
  EyeIcon,
  EyeOffIcon,
  CloseIcon,
  SearchIcon,
  PhoneIcon,
  IdentificationIcon,
  MailIcon,
  LockClosedIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  HashIcon,
  PlusIcon,
  MinusIcon,
} from "./Icons";
import {
  INPUT_TYPE_CONFIGS,
  validateBDPhone,
  validateNID,
  validateBRN,
  validateEmail,
  validateURL,
  validateNumber,
  sanitizeNumeric,
  sanitizeDecimal,
  sanitizePhone,
} from "../../utils/inputValidators";
import {
  focusNextInput,
  focusPrevInput,
} from "../../utils/keyboardUtils";

/**
 * Enterprise Responsive Universal CustomInput Component
 * 
 * Reusable input for: text, number (with scroll/arrows), phone, NID, BRN,
 * email, password (with toggle), search (with clear), currency, textarea, etc.
 * 
 * Fully responsive across Mobile, Tablet, and Desktop screens.
 * Uses 100% theme tokens with zero hardcoded styling.
 */
const CustomInput = forwardRef(function CustomInput(
  {
    id,
    name,
    type = "text",
    value,
    defaultValue,
    onChange,
    onBlur,
    onFocus,
    onKeyDown,
    onEnter,
    onShiftEnter,
    onEmptyBackspace,
    onAdd,
    onAddShift,
    label,
    subLabel,
    required = false,
    optional = false,
    badge,
    placeholder,
    size = "md", // 'sm' | 'md' | 'lg'
    variant = "default", // 'default' | 'filled' | 'elevated' | 'sub' | 'borderless' | 'compact-number'
    disabled = false,
    readOnly = false,
    autoFocus = false,
    autoComplete,
    error: explicitError,
    helperText,
    success: explicitSuccess,
    showSuccessState = false,
    validate,
    validateOn = "blur", // 'blur' | 'change' | 'both'
    autoSanitize = true,
    clearable = false,
    showPasswordToggle = true,
    showDigitCounter,
    showCharCount = false,
    maxLength,
    minLength,
    min,
    max,
    step = 1,
    allowDecimals = true,
    allowNegative = false,
    scrollable = true,
    stepper = false,
    currencySymbol = "৳",
    prefix,
    suffix,
    unit,
    icon: CustomIcon,
    startAdornment,
    endAdornment,
    className = "",
    inputClassName = "",
    labelClassName = "",
    wrapperClassName = "",
    rows = 3,
    autoResize = false,
    inputMode,
    ...restProps
  },
  forwardedRef
) {
  const autoId = useId();
  const inputId = id || autoId;
  const innerRef = useRef(null);

  useImperativeHandle(forwardedRef, () => innerRef.current);

  // Controlled vs Uncontrolled value resolution
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    defaultValue !== undefined ? defaultValue : ""
  );
  const currentValue = isControlled ? (value ?? "") : internalValue;
  const stringValue = String(currentValue);

  // State management
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Normalize format/type
  const normalizedType = (type || "text").toLowerCase();
  const config = INPUT_TYPE_CONFIGS[normalizedType] || INPUT_TYPE_CONFIGS.text;

  // Resolve input HTML type
  let resolvedHtmlType = "text";
  if (normalizedType === "password") {
    resolvedHtmlType = showPassword ? "text" : "password";
  } else if (normalizedType === "number" || normalizedType === "currency") {
    resolvedHtmlType = "text"; // use text for custom numeric control & formatting
  } else if (["date", "time", "datetime-local", "color"].includes(normalizedType)) {
    resolvedHtmlType = normalizedType;
  }

  // Resolve inputMode
  const resolvedInputMode =
    inputMode ||
    config.inputMode ||
    (normalizedType === "number" || normalizedType === "currency"
      ? allowDecimals
        ? "decimal"
        : "numeric"
      : "text");

  // Effective Max Length
  const effectiveMaxLength = maxLength !== undefined ? maxLength : config.maxLength;

  // Effective Placeholder
  const effectivePlaceholder =
    placeholder !== undefined
      ? placeholder
      : config.defaultPlaceholder || (label ? `Enter ${label}...` : "");

  // ----------------------------------------------------------------------------
  // VALIDATION LOGIC
  // ----------------------------------------------------------------------------
  const runValidation = (val) => {
    const str = String(val ?? "").trim();

    // Required check
    if (required && str === "") {
      return "This field is required.";
    }

    if (str === "") {
      return "";
    }

    // Min length check
    if (minLength && str.length < minLength) {
      return `Must be at least ${minLength} characters.`;
    }

    // Type-specific validation
    if (normalizedType === "phone" || normalizedType === "bd-phone") {
      if (!validateBDPhone(str)) {
        return config.errorMessage || "Must be a valid 11-digit Bangladeshi phone number.";
      }
    } else if (normalizedType === "nid" || normalizedType === "national-id") {
      if (!validateNID(str)) {
        return config.errorMessage || "National ID must be 10, 13, or 17 digits.";
      }
    } else if (normalizedType === "brn" || normalizedType === "birth-certificate") {
      if (!validateBRN(str)) {
        return config.errorMessage || "Birth certificate number must be exactly 17 digits.";
      }
    } else if (normalizedType === "email") {
      if (!validateEmail(str)) {
        return config.errorMessage || "Please enter a valid email address.";
      }
    } else if (normalizedType === "url") {
      if (!validateURL(str)) {
        return config.errorMessage || "Please enter a valid web URL.";
      }
    } else if (normalizedType === "number") {
      if (!validateNumber(str, { min, max, allowDecimals, allowNegative })) {
        if (min !== undefined && max !== undefined) {
          return `Value must be between ${min} and ${max}.`;
        } else if (min !== undefined) {
          return `Value cannot be less than ${min}.`;
        } else if (max !== undefined) {
          return `Value cannot exceed ${max}.`;
        }
        return "Please enter a valid number.";
      }
    }

    // Custom validator
    if (typeof validate === "function") {
      const res = validate(str);
      if (typeof res === "string" && res) {
        return res;
      }
      if (res === false) {
        return "Invalid input format.";
      }
    }

    return "";
  };

  // Re-run validation on change if validateOn === 'change' or 'both'
  const triggerValidation = (val) => {
    const errorMsg = runValidation(val);
    setValidationError(errorMsg);
  };

  // ----------------------------------------------------------------------------
  // VALUE CHANGE & SANITIZATION HANDLER
  // ----------------------------------------------------------------------------
  const handleValueChange = (rawInput, event) => {
    let sanitized = rawInput;

    if (autoSanitize) {
      if (
        normalizedType === "phone" ||
        normalizedType === "bd-phone"
      ) {
        sanitized = sanitizePhone(rawInput);
      } else if (
        normalizedType === "nid" ||
        normalizedType === "national-id" ||
        normalizedType === "brn" ||
        normalizedType === "birth-certificate"
      ) {
        sanitized = sanitizeNumeric(rawInput);
      } else if (normalizedType === "number") {
        sanitized = allowDecimals
          ? sanitizeDecimal(rawInput, allowNegative)
          : sanitizeNumeric(rawInput);
      } else if (normalizedType === "currency") {
        sanitized = sanitizeDecimal(rawInput, false);
      }
    }

    // Enforce maxLength
    if (effectiveMaxLength && sanitized.length > effectiveMaxLength) {
      sanitized = sanitized.slice(0, effectiveMaxLength);
    }

    if (!isControlled) {
      setInternalValue(sanitized);
    }

    if (validateOn === "change" || validateOn === "both") {
      triggerValidation(sanitized);
    }

    if (onChange) {
      const syntheticEvent = (event && event.target) ? event : {
        target: { name, value: sanitized, id: inputId },
        currentTarget: { name, value: sanitized, id: inputId },
        type: "change",
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(sanitized, syntheticEvent);
    }
  };

  const handleInputChange = (e) => {
    handleValueChange(e.target.value, e);
  };

  // ----------------------------------------------------------------------------
  // FOCUS & BLUR HANDLERS
  // ----------------------------------------------------------------------------
  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    setTouched(true);

    if (validateOn === "blur" || validateOn === "both") {
      triggerValidation(stringValue);
    }

    // Number clamping on blur
    if (normalizedType === "number" && stringValue !== "") {
      let num = parseFloat(stringValue);
      if (!isNaN(num)) {
        let changed = false;
        if (min !== undefined && num < min) {
          num = min;
          changed = true;
        }
        if (max !== undefined && num > max) {
          num = max;
          changed = true;
        }
        if (changed) {
          const finalVal = num.toString();
          handleValueChange(finalVal, e);
        }
      }
    }

    onBlur?.(e);
  };

  // ----------------------------------------------------------------------------
  // STEPPING & NUMBER SHORTCUTS
  // ----------------------------------------------------------------------------
  const updateNumberValue = (stepAmount) => {
    let current = parseFloat(stringValue);
    if (isNaN(current)) {
      current = stepAmount > 0 ? (min !== undefined ? min : 0) : (max !== undefined ? max : 0);
    } else {
      current += stepAmount;
    }

    if (min !== undefined && current < min) {
      current = max !== undefined ? max : min;
    } else if (max !== undefined && current > max) {
      current = min !== undefined ? min : max;
    }

    // Round to avoid floating point anomalies if stepping decimals
    if (allowDecimals) {
      const precision = (step.toString().split(".")[1] || "").length;
      current = parseFloat(current.toFixed(precision || 2));
    }

    handleValueChange(current.toString());
  };

  // ----------------------------------------------------------------------------
  // KEYBOARD NAVIGATION
  // ----------------------------------------------------------------------------
  const handleKeyDown = (e) => {
    if (normalizedType === "number") {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        updateNumberValue(step || 1);
        return;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        updateNumberValue(-(step || 1));
        return;
      } else if (e.key === "ArrowLeft") {
        if (e.target.selectionStart === 0) {
          e.preventDefault();
          focusPrevInput(innerRef.current);
          return;
        }
      } else if (e.key === "ArrowRight") {
        if (e.target.selectionEnd === stringValue.length) {
          e.preventDefault();
          focusNextInput(innerRef.current);
          return;
        }
      } else if (e.key === "+" || e.key === "=") {
        if (e.shiftKey && onAddShift) {
          e.preventDefault();
          onAddShift(e);
          return;
        } else if (onAdd) {
          e.preventDefault();
          onAdd(e);
          return;
        }
      }
    }

    if (e.key === "Enter") {
      if (e.shiftKey && onShiftEnter) {
        e.preventDefault();
        onShiftEnter(e);
        return;
      } else if (onEnter) {
        e.preventDefault();
        onEnter(e);
        return;
      }
    } else if (e.key === "Backspace") {
      if (stringValue === "" && onEmptyBackspace) {
        e.preventDefault();
        onEmptyBackspace(e);
        return;
      }
    }

    onKeyDown?.(e);
  };

  // ----------------------------------------------------------------------------
  // MOUSE WHEEL SCROLLING FOR NUMBERS
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (normalizedType !== "number" || !scrollable || disabled || readOnly) return;
    const inputEl = innerRef.current;
    if (!inputEl) return;

    const onWheel = (e) => {
      e.preventDefault();
      const direction = e.deltaY < 0 ? (step || 1) : -(step || 1);
      updateNumberValue(direction);
    };

    inputEl.addEventListener("wheel", onWheel, { passive: false });
    return () => inputEl.removeEventListener("wheel", onWheel);
  }, [normalizedType, scrollable, disabled, readOnly, stringValue, min, max, step]);

  // ----------------------------------------------------------------------------
  // AUTO RESIZE TEXTAREA
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (normalizedType === "textarea" && autoResize && innerRef.current) {
      innerRef.current.style.height = "auto";
      innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
    }
  }, [stringValue, normalizedType, autoResize]);

  // ----------------------------------------------------------------------------
  // UI SIZES & STYLING TOKENS
  // ----------------------------------------------------------------------------
  const isCompactNumber = variant === "compact-number";
  const isBorderless = variant === "borderless";

  let sizeContainerClasses = {
    sm: isCompactNumber ? "h-[36px] sm:h-[38px]" : "min-h-[38px] px-3 py-1.5 text-xs rounded-xl",
    md: isCompactNumber ? "h-[42px] sm:h-[46px]" : "min-h-[46px] px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl",
    lg: isCompactNumber ? "h-[48px] sm:h-[54px]" : "min-h-[54px] px-5 py-3.5 text-sm sm:text-base rounded-2xl",
  }[size] || "min-h-[46px] px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl";

  if (isBorderless) {
    sizeContainerClasses = "w-full h-full p-0 min-h-0";
  }

  const isInvalid = Boolean(explicitError || (touched && validationError));
  const activeError = explicitError || validationError;
  const isValid = Boolean(
    explicitSuccess ||
      (showSuccessState && touched && !isInvalid && stringValue.trim() !== "")
  );

  // Variant classes
  let variantClasses = "theme-bg-sub theme-border border";
  if (variant === "filled") {
    variantClasses = "theme-bg-elevated theme-border border";
  } else if (variant === "elevated") {
    variantClasses = "theme-bg-elevated theme-border border shadow-sm";
  } else if (isBorderless) {
    variantClasses = "bg-transparent border-0 outline-none shadow-none";
  }

  // Focus & State Border/Ring classes
  let stateClasses = "";
  if (isBorderless) {
    stateClasses = "";
  } else if (disabled) {
    stateClasses = "opacity-50 cursor-not-allowed theme-bg-sub theme-border";
  } else if (readOnly) {
    stateClasses = "cursor-default theme-bg-sub/70 theme-border";
  } else if (isInvalid) {
    stateClasses =
      "border-[var(--color-danger)]/70 ring-2 ring-[var(--color-danger)]/20 shadow-xs";
  } else if (isValid) {
    stateClasses =
      "border-[var(--color-success)]/70 focus-within:ring-2 focus-within:ring-[var(--color-success)]/20 shadow-xs";
  } else {
    stateClasses =
      "hover:border-[var(--accent-main)]/40 focus-within:border-[var(--accent-main)] focus-within:ring-2 focus-within:ring-[var(--accent-main)]/20";
  }

  // ----------------------------------------------------------------------------
  // ICON RESOLUTION
  // ----------------------------------------------------------------------------
  const ResolvedDefaultIcon = () => {
    let iconElement = null;
    if (CustomIcon) iconElement = <CustomIcon className="w-4 h-4 shrink-0 theme-accent opacity-90" />;
    else if (normalizedType === "search") iconElement = <SearchIcon className="w-4 h-4 shrink-0 theme-text-secondary opacity-70" />;
    else if (normalizedType === "phone" || normalizedType === "bd-phone") iconElement = <PhoneIcon className="w-4 h-4 shrink-0 theme-accent opacity-80" />;
    else if (normalizedType === "nid" || normalizedType === "national-id" || normalizedType === "brn" || normalizedType === "birth-certificate") {
      iconElement = <IdentificationIcon className="w-4 h-4 shrink-0 theme-accent opacity-80" />;
    }
    else if (normalizedType === "email") iconElement = <MailIcon className="w-4 h-4 shrink-0 theme-accent opacity-80" />;
    else if (normalizedType === "password") iconElement = <LockClosedIcon className="w-4 h-4 shrink-0 theme-text-secondary opacity-70" />;

    if (!iconElement) return null;
    return (
      <div className="mr-3 shrink-0 flex items-center justify-center select-none pointer-events-none">
        {iconElement}
      </div>
    );
  };

  // ----------------------------------------------------------------------------
  // LIVE DIGIT / CHAR COUNTER RESOLUTION
  // ----------------------------------------------------------------------------
  const renderCounterBadge = () => {
    const shouldShowDigitCounter =
      showDigitCounter !== undefined ? showDigitCounter : config.showDigitCounter;

    if (shouldShowDigitCounter && stringValue.length > 0) {
      if (normalizedType === "phone" || normalizedType === "bd-phone") {
        const isWithPlus = stringValue.startsWith("+880");
        const isWith880 = !isWithPlus && stringValue.startsWith("880");
        const targetLen = isWithPlus ? 14 : isWith880 ? 13 : 11;
        const isComplete = validateBDPhone(stringValue);
        return (
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors ${
              isComplete
                ? "theme-bg-success-soft theme-success"
                : "theme-bg-surface theme-text-secondary border theme-border"
            }`}
          >
            {stringValue.length}/{targetLen}
          </span>
        );
      } else if (config.targetLength) {
        const isComplete = stringValue.length === config.targetLength;
        return (
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors ${
              isComplete
                ? "theme-bg-success-soft theme-success"
                : "theme-bg-surface theme-text-secondary border theme-border"
            }`}
          >
            {stringValue.length}/{config.targetLength}
          </span>
        );
      } else if (Array.isArray(config.targetLengths)) {
        const isMatched = config.targetLengths.includes(stringValue.length);
        return (
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md transition-colors ${
              isMatched
                ? "theme-bg-success-soft theme-success"
                : "theme-bg-surface theme-text-secondary border theme-border"
            }`}
          >
            {stringValue.length} Digits
          </span>
        );
      }
    }

    if (showCharCount && effectiveMaxLength) {
      return (
        <span className="text-[10px] font-mono font-medium theme-text-secondary">
          {stringValue.length}/{effectiveMaxLength}
        </span>
      );
    }

    return null;
  };

  // ----------------------------------------------------------------------------
  // CLEAR ACTION
  // ----------------------------------------------------------------------------
  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleValueChange("");
    innerRef.current?.focus();
  };

  return (
    <div className={`text-left font-sans ${isBorderless && !label && !subLabel && !badge && !optional ? (wrapperClassName || "w-full h-full") : `w-full ${wrapperClassName}`}`}>
      {/* Top Bar: Label, Optional Sublabel, and Badges */}
      {(label || subLabel || badge || optional) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {label && (
              <label
                htmlFor={inputId}
                className={`block text-xs font-bold theme-text-secondary uppercase tracking-wider ${
                  disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${labelClassName}`}
              >
                {label} {required && <span className="theme-danger">*</span>}
              </label>
            )}
            {optional && (
              <span className="text-[10px] font-semibold theme-text-secondary opacity-60 uppercase tracking-wider">
                (Optional)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md theme-bg-accent-soft theme-accent border theme-border">
                {badge}
              </span>
            )}
            {renderCounterBadge()}
          </div>
        </div>
      )}

      {subLabel && (
        <p className="text-[11px] theme-text-secondary mb-2 font-medium leading-tight">
          {subLabel}
        </p>
      )}

      {/* Input Outer Shell */}
      <div
        className={`relative flex items-center w-full transition-all duration-150 ${sizeContainerClasses} ${variantClasses} ${stateClasses} ${className}`}
      >
        {/* Left Side Prefix / Icon / Adornment */}
        {startAdornment ? (
          <div className="mr-3 shrink-0 flex items-center">{startAdornment}</div>
        ) : prefix ? (
          <div className="mr-3 shrink-0 text-xs font-bold theme-text-secondary font-mono">
            {prefix}
          </div>
        ) : normalizedType === "currency" ? (
          <div className="mr-2 shrink-0 text-sm font-bold theme-accent font-mono">
            {currencySymbol}
          </div>
        ) : (
          <ResolvedDefaultIcon />
        )}

        {/* Core Input Element / Textarea */}
        {normalizedType === "textarea" ? (
          <textarea
            ref={innerRef}
            id={inputId}
            name={name}
            value={stringValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            placeholder={effectivePlaceholder}
            rows={rows}
            maxLength={effectiveMaxLength}
            className={`w-full bg-transparent border-none outline-none resize-none font-semibold theme-text-primary placeholder:theme-text-secondary placeholder:opacity-50 focus:placeholder-transparent transition-all select-text ${inputClassName}`}
            {...restProps}
          />
        ) : (
          <input
            ref={innerRef}
            id={inputId}
            name={name}
            type={resolvedHtmlType}
            value={stringValue}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            readOnly={readOnly}
            autoFocus={autoFocus}
            autoComplete={autoComplete}
            inputMode={resolvedInputMode}
            placeholder={effectivePlaceholder}
            maxLength={effectiveMaxLength}
            className={`w-full bg-transparent border-none outline-none font-semibold theme-text-primary placeholder:theme-text-secondary placeholder:opacity-50 focus:placeholder-transparent transition-all select-text ${
              isCompactNumber ? "text-center font-mono" : ""
            } ${inputClassName}`}
            {...restProps}
          />
        )}

        {/* Right Side Suffix / Unit / Steppers / Password Toggle / Clear Button */}
        {((normalizedType === "number" && stepper && !disabled && !readOnly) ||
          (normalizedType === "password" && showPasswordToggle && !disabled) ||
          (clearable && stringValue.length > 0 && !disabled && !readOnly) ||
          (!isBorderless && isValid && !isInvalid) ||
          suffix ||
          unit ||
          endAdornment) && (
          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {/* Stepper Buttons for Number mode */}
            {normalizedType === "number" && stepper && !disabled && !readOnly && (
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => updateNumberValue(step || 1)}
                  className="p-1 rounded-md hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                  title="Increase value"
                >
                  <PlusIcon className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => updateNumberValue(-(step || 1))}
                  className="p-1 rounded-md hover:theme-bg-elevated theme-text-secondary hover:theme-text-primary transition cursor-pointer"
                  title="Decrease value"
                >
                  <MinusIcon className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Password Show/Hide Toggle */}
            {normalizedType === "password" && showPasswordToggle && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1 rounded-lg theme-text-secondary hover:theme-text-primary transition cursor-pointer focus:outline-none"
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Instant Clear Button */}
            {clearable && stringValue.length > 0 && !disabled && !readOnly && (
              <button
                type="button"
                tabIndex={-1}
                onClick={handleClear}
                className="p-1 rounded-full theme-bg-elevated theme-text-secondary hover:theme-text-primary hover:theme-danger transition cursor-pointer"
                title="Clear input"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}

            {/* Valid Success Check Icon */}
            {!isBorderless && isValid && !isInvalid && (
              <CheckCircleIcon className="w-4 h-4 theme-success shrink-0" />
            )}

            {/* Custom End Adornment / Suffix / Unit (Placeholder-style) */}
            {(suffix || unit) && (
              <span className="text-xs font-semibold theme-text-secondary opacity-60 select-none pointer-events-none pr-0.5">
                {suffix || unit}
              </span>
            )}
            {endAdornment}
          </div>
        )}
      </div>

      {/* Bottom Status / Error / Helper Text */}
      {isInvalid ? (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold theme-danger animate-fade-in">
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{activeError}</span>
        </div>
      ) : helperText ? (
        <p className="mt-1.5 text-[11px] theme-text-secondary font-medium leading-relaxed opacity-85">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

export default CustomInput;
