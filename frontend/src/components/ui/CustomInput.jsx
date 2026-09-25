import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useId,
  useImperativeHandle,
} from "react";
import { Link } from "react-router-dom";
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
  GlobeIcon,
  ChevronIcon,
  CalendarIcon,
} from "./Icons";
import IconButton from "./IconButton";
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
import TemplateActionToolbar from "./TemplateActionToolbar";
import { useUndoRedo } from "../../context/useUndoRedo";
import { SUPPORTED_LANGUAGES } from "../../i18n/constants";
import { useTranslation } from "../../i18n/useTranslation";
import {
  normalizeLocalizedValue,
  hasMultiLanguageContent,
  hasAnyLanguageContent,
  getFilledLanguagesCount,
  sanitizeScriptForLanguage,
  getLocalizedPlaceholder,
} from "../../i18n/localizedEntity";

/**
 * Enterprise Responsive Universal CustomInput Component
 * 
 * Reusable input for: text, number (with scroll/arrows), phone, NID, BRN,
 * email, password (with toggle), search (with clear), currency, textarea, multi-language, etc.
 * 
 * Fully responsive across Mobile, Tablet, and Desktop screens.
 * Uses 100% theme tokens with zero hardcoded styling.
 */
/** @type {any} */
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
    cyclic = true,
    initialScrollValue,
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
    enableTemplates = false,
    templateCategory,
    templateNamespace,
    category,
    namespace,
    templateInitialList = [],
    templateMode = "append",
    showTemplateClear = true,
    showTemplateSave = true,
    showTemplateSaved = true,
    showTemplateCount = true,
    showTemplateSearch = true,
    templateSearchable,
    showTemplateEdit = true,
    templateEditable,
    showTemplateDelete = true,
    templateDeletable,
    showTemplateOnFocusOnly = false,
    onManage = null,
    manageLabel = 'Manage',
    manageTitle = null,
    onActionClick = null,
    actionLabel = null,
    actionTo = null,
    headerAction = null,
    multiLanguage = false,
    collapsible = false,
    defaultExpanded = false,
    expanded: controlledExpanded,
    onToggle = null,
    children = null,
    expandableContentClassName = "",
    bodyClassName = "",
    ...restProps
  },
  forwardedRef
) {
  const autoId = useId();
  const inputId = id || autoId;
  const innerRef = useRef(null);

  // Multi-Language state & resolution
  const isMultiLang = Boolean(multiLanguage || type === "multilang");
  const { language: currentLang } = useTranslation();
  const expandStorageKey = `spr_multilang_open_${name || id || (label ? String(label).toLowerCase().replace(/[^a-z0-9]/g, '_') : 'global')}`;

  const [isMultiLangExpanded, setIsMultiLangExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(expandStorageKey);
      if (saved === "true") return true;
      if (saved === "false") return false;
    } catch {
      // fallback
    }
    const initialMap = normalizeLocalizedValue(value !== undefined ? value : defaultValue, currentLang);
    return hasMultiLanguageContent(initialMap);
  });

  const toggleMultiLangExpanded = () => {
    setIsMultiLangExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(expandStorageKey, String(next));
      } catch {
        // fallback
      }
      return next;
    });
  };

  const localizedMap = useMemo(() => {
    if (!isMultiLang) return null;
    return normalizeLocalizedValue(value !== undefined ? value : defaultValue, currentLang);
  }, [isMultiLang, value, defaultValue, currentLang]);

  // Auto-expand if incoming data has multiple languages populated
  useEffect(() => {
    if (isMultiLang && localizedMap && hasMultiLanguageContent(localizedMap)) {
      setIsMultiLangExpanded(true);
    }
  }, [isMultiLang, localizedMap]);

  const primaryLang = useMemo(() => {
    if (!isMultiLang) return null;
    return SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];
  }, [isMultiLang, currentLang]);

  const handleMultiLangFieldChange = (langCode, textVal) => {
    const cleanText = sanitizeScriptForLanguage(textVal, langCode);
    const updated = { ...(localizedMap || {}), [langCode]: cleanText };
    if (!isControlled) {
      setInternalValue(updated);
    }
    if (validateOn === "change" || validateOn === "both") {
      triggerValidation(updated);
    }
    if (onChange) {
      const syntheticEvent = {
        target: { name, value: updated, id: inputId },
        currentTarget: { name, value: updated, id: inputId },
        type: "change",
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(updated, syntheticEvent);
    }
  };

  // Resolve template category: priority to explicit category/namespace, then field name, avoiding row-specific DOM ID
  const resolvedTemplateCategory =
    category ||
    templateCategory ||
    namespace ||
    templateNamespace ||
    (name ? name : "general");

  let undoRedoCtx = null;
  try {
    undoRedoCtx = useUndoRedo();
  } catch {
    // Graceful fallback
  }

  useImperativeHandle(forwardedRef, () => innerRef.current);

  // Controlled vs Uncontrolled value resolution
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(
    defaultValue !== undefined ? defaultValue : ""
  );
  const currentValue = isMultiLang
    ? (localizedMap && primaryLang ? localizedMap[primaryLang.code] || "" : "")
    : (isControlled ? (value ?? "") : internalValue);
  const stringValue = String(currentValue);

  // State management
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Collapsible state & toggle logic
  const isCollapsible = Boolean(collapsible || type === "collapsible");
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlledExpanded = controlledExpanded !== undefined;
  const isExpanded = isCollapsible ? (isControlledExpanded ? Boolean(controlledExpanded) : internalExpanded) : false;

  const handleCollapsibleToggle = () => {
    if (!isCollapsible || disabled || readOnly) return;
    if (isControlledExpanded) {
      onToggle?.(!isExpanded);
    } else {
      setInternalExpanded((prev) => {
        const next = !prev;
        onToggle?.(next);
        return next;
      });
    }
  };
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
  const effectivePlaceholder = isMultiLang && primaryLang
    ? getLocalizedPlaceholder(placeholder, primaryLang.code, label)
    : placeholder !== undefined
    ? placeholder
    : config.defaultPlaceholder || (label ? `Enter ${label}...` : "");

  // ----------------------------------------------------------------------------
  // VALIDATION LOGIC
  // ----------------------------------------------------------------------------
  const runValidation = (val) => {
    if (isMultiLang) {
      const map =
        typeof val === "object" && val !== null
          ? val
          : localizedMap || normalizeLocalizedValue(val, currentLang);
      if (required && !hasAnyLanguageContent(map)) {
        return "This field is required.";
      }
      return "";
    }

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

  // Clear validation error reactively as soon as valid input is entered
  useEffect(() => {
    if (touched && validationError) {
      const errorMsg = runValidation(isMultiLang ? localizedMap : currentValue);
      if (!errorMsg) {
        setValidationError("");
      }
    }
  }, [touched, validationError, isMultiLang, localizedMap, currentValue]);

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

    if (isMultiLang && primaryLang) {
      handleMultiLangFieldChange(primaryLang.code, sanitized);
      return;
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
      triggerValidation(isMultiLang ? localizedMap : stringValue);
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
    const numericStep = typeof step === "number" ? step : parseFloat(step) || 1;
    const numStep = typeof stepAmount === "number" ? stepAmount : parseFloat(stepAmount) || numericStep;
    const effectiveMin = min !== undefined ? Number(min) : (!allowNegative ? 0 : undefined);
    const effectiveMax = max !== undefined ? Number(max) : undefined;

    let current = parseFloat(stringValue);
    if (isNaN(current)) {
      if (initialScrollValue !== undefined && initialScrollValue !== null && initialScrollValue !== "" && !isNaN(Number(initialScrollValue))) {
        let base = Number(initialScrollValue);
        if (effectiveMin !== undefined && base < effectiveMin) base = effectiveMin;
        if (effectiveMax !== undefined && base > effectiveMax) base = effectiveMax;
        current = base + numStep;
      } else {
        current = numStep > 0
          ? (effectiveMin !== undefined ? effectiveMin : 0)
          : (effectiveMax !== undefined ? effectiveMax : (effectiveMin !== undefined ? effectiveMin : 0));
      }
    } else {
      current += numStep;
    }

    // Cyclic wrap-around when boundaries are defined
    if (cyclic && effectiveMin !== undefined && effectiveMax !== undefined && effectiveMax >= effectiveMin) {
      if (current > effectiveMax) {
        current = effectiveMin;
      } else if (current < effectiveMin) {
        current = effectiveMax;
      }
    } else {
      // Clamping fallback if cyclic is disabled or boundaries are one-sided
      if (effectiveMin !== undefined && current < effectiveMin) {
        current = effectiveMin;
      }
      if (effectiveMax !== undefined && current > effectiveMax) {
        current = effectiveMax;
      }
    }

    // Round to avoid floating point anomalies if stepping decimals
    if (allowDecimals) {
      const stepStr = numericStep.toString();
      const precision = stepStr.includes(".") ? (stepStr.split(".")[1] || "").length : 2;
      current = parseFloat(current.toFixed(precision));
    } else {
      current = Math.round(current);
    }

    handleValueChange(current.toString());
  };

  // Keep a ref to latest updateNumberValue for stable event listeners
  const updateNumberValueRef = useRef(updateNumberValue);
  updateNumberValueRef.current = updateNumberValue;

  // ----------------------------------------------------------------------------
  // KEYBOARD NAVIGATION
  // ----------------------------------------------------------------------------
  const handleKeyDown = (e) => {
    // If consumer provided onKeyDown, invoke it first and respect defaultPrevented
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (isCmdOrCtrl && e.key.toLowerCase() === "z" && !e.shiftKey && !e.altKey && undoRedoCtx?.canUndo) {
      e.preventDefault();
      undoRedoCtx.undo();
      return;
    } else if (isCmdOrCtrl && ((e.key.toLowerCase() === "z" && e.shiftKey) || (e.key.toLowerCase() === "y" && !e.shiftKey)) && undoRedoCtx?.canRedo) {
      e.preventDefault();
      undoRedoCtx.redo();
      return;
    }

    if (normalizedType === "number") {
      const numericStep = typeof step === "number" ? step : parseFloat(step) || 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        updateNumberValue(numericStep);
        return;
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        updateNumberValue(-numericStep);
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
      } else if (e.key === "+" || e.key === "=" || e.code === "NumpadAdd" || e.key === ",") {
        const addHandler = (e.shiftKey && onAddShift) ? onAddShift : (onAdd || onAddShift);
        if (addHandler) {
          e.preventDefault();
          addHandler(e);
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
      const numericStep = typeof step === "number" ? step : parseFloat(step) || 1;
      const direction = e.deltaY < 0 ? numericStep : -numericStep;
      updateNumberValueRef.current?.(direction);
    };

    inputEl.addEventListener("wheel", onWheel, { passive: false });
    return () => inputEl.removeEventListener("wheel", onWheel);
  }, [normalizedType, scrollable, disabled, readOnly, step]);

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
  const hasValue = isMultiLang
    ? hasAnyLanguageContent(localizedMap)
    : stringValue.trim() !== "";
  const isValid = Boolean(
    explicitSuccess ||
      (showSuccessState && touched && !isInvalid && hasValue)
  );

  // Variant classes
  let variantClasses = "theme-bg-sub theme-border border";
  if (variant === "filled") {
    variantClasses = "theme-bg-elevated theme-border border";
  } else if (variant === "elevated") {
    variantClasses = "theme-bg-elevated theme-border border";
  } else if (isBorderless) {
    variantClasses = "bg-transparent border-0 outline-none shadow-none";
  }

  // Focus & State Border classes (Thin Minimal Single Border with Soft Tone States)
  let stateClasses = "";
  if (isBorderless) {
    stateClasses = "";
  } else if (disabled) {
    stateClasses = "opacity-50 cursor-not-allowed theme-bg-sub theme-border";
  } else if (readOnly) {
    stateClasses = "cursor-default theme-bg-sub/70 theme-border";
  } else if (isInvalid) {
    stateClasses =
      "border-[var(--danger-text)]/40 hover:border-[var(--danger-text)]/60 focus-within:border-[var(--danger-text)]/75";
  } else if (isValid) {
    stateClasses =
      "border-[var(--color-success)]/40 hover:border-[var(--color-success)]/60 focus-within:border-[var(--color-success)]/75";
  } else {
    stateClasses =
      "hover:border-[var(--border-hover)] focus-within:border-[var(--accent-main)]";
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
    else if (normalizedType === "date" || normalizedType === "datetime-local") {
      iconElement = <CalendarIcon className="w-4 h-4 shrink-0 theme-accent opacity-80" />;
    }

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

  const multiLangFilledCount = localizedMap ? getFilledLanguagesCount(localizedMap) : 0;

  const multiLangToggleButton = isMultiLang ? (
    <button
      type="button"
      onClick={toggleMultiLangExpanded}
      className="text-[10px] font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1 select-none"
      title={isMultiLangExpanded ? "Collapse to single language input" : "Expand all language fields"}
    >
      <GlobeIcon className="w-3.5 h-3.5 shrink-0" />
      <span>MultiLang</span>
      {multiLangFilledCount > 1 && (
        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold theme-bg-accent-soft theme-accent border theme-border font-mono leading-none">
          {multiLangFilledCount}
        </span>
      )}
    </button>
  ) : null;

  return (
    <div className={`text-left font-sans ${isBorderless && !label && !subLabel && !badge && !optional ? (wrapperClassName || "w-full h-full") : `w-full ${wrapperClassName}`}`}>
      {/* Top Bar: Label, Optional Sublabel, Badges, Multi-Lang Toggle & Actions */}
      {(label || subLabel || badge || optional || enableTemplates || headerAction || onManage || onActionClick || actionTo || actionLabel || isMultiLang) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {label && (
              <label
                htmlFor={inputId}
                className={`block text-xs font-bold theme-text-secondary uppercase tracking-wider ${
                  disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                } ${labelClassName}`}
              >
                {label} {required && <span className="text-[var(--danger-text)] font-semibold ml-0.5">*</span>}
              </label>
            )}
            {optional && (
              <span className="text-[10px] font-semibold theme-text-secondary opacity-60 uppercase tracking-wider">
                (Optional)
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {multiLangToggleButton}
            {headerAction ? (
              headerAction
            ) : actionTo ? (
              <Link
                to={actionTo}
                className="text-[10px] font-semibold theme-accent hover:underline hover:opacity-80 transition-all flex items-center gap-1 cursor-pointer"
                title={actionTitle || manageTitle || (typeof actionLabel === "string" ? actionLabel : undefined)}
              >
                <span>{actionLabel || manageLabel || "+ Add"}</span>
              </Link>
            ) : (onManage || onActionClick) ? (
              <button
                type="button"
                onClick={onManage || onActionClick}
                className="text-[10px] font-semibold theme-accent hover:underline cursor-pointer flex items-center gap-1"
                title={actionTitle || manageTitle || `Manage ${label || 'options'}`}
              >
                <span>{manageLabel || actionLabel || 'Manage'}</span>
              </button>
            ) : null}
            {enableTemplates && !disabled && !readOnly && (
              <TemplateActionToolbar
                value={stringValue}
                onChange={handleValueChange}
                category={resolvedTemplateCategory}
                namespace={resolvedTemplateCategory}
                initialTemplates={templateInitialList}
                mode={templateMode}
                showClear={showTemplateClear}
                showSave={showTemplateSave}
                showSaved={showTemplateSaved}
                showCount={showTemplateCount}
                showSearch={templateSearchable !== undefined ? templateSearchable : showTemplateSearch}
                showEdit={templateEditable !== undefined ? templateEditable : showTemplateEdit}
                showDelete={templateDeletable !== undefined ? templateDeletable : showTemplateDelete}
                showOnFocusOnly={showTemplateOnFocusOnly}
                size="sm"
              />
            )}
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

      {/* Input Core: Expanded Multi-Language Stack vs Standard Single Input Shell */}
      {isMultiLang && isMultiLangExpanded ? (
        <div className="w-full space-y-2 animate-fade-in">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const langVal = localizedMap ? (localizedMap[lang.code] || "") : "";
            const badge = lang.code.toUpperCase();
            const isRTL = lang.dir === "rtl";
            return (
              <div
                key={lang.code}
                className={`relative flex items-center w-full transition-all duration-150 ${sizeContainerClasses} ${variantClasses} ${stateClasses}`}
              >
                {/* LTR Indicator (EN, BN) on Left */}
                {!isRTL && (
                  <div className="mr-3 shrink-0 text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono select-none pointer-events-none">
                    {badge}
                  </div>
                )}

                {/* Core Input Field for this language */}
                <input
                  id={`${inputId}-${lang.code}`}
                  type="text"
                  disabled={disabled}
                  readOnly={readOnly}
                  dir={lang.dir}
                  value={langVal}
                  onChange={(e) => handleMultiLangFieldChange(lang.code, e.target.value)}
                  placeholder={getLocalizedPlaceholder(placeholder, lang.code, label)}
                  className={`w-full bg-transparent border-none outline-none font-semibold theme-text-primary placeholder:theme-text-secondary placeholder:opacity-50 focus:placeholder-transparent text-xs sm:text-sm select-text ${
                    isRTL ? "text-right" : "text-left"
                  }`}
                  style={{ fontFamily: lang.fontFamily }}
                />

                {/* RTL Indicator (AR, UR) on Right */}
                {isRTL && (
                  <div className="ml-3 shrink-0 text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono select-none pointer-events-none">
                    {badge}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : isCollapsible ? (
        /* Collapsible Accordion Mode with Merged Card Shell (Instant Zero Transition) */
        isExpanded ? (
          <div
            className={`w-full rounded-2xl border theme-border theme-bg-sub/10 shadow-2xs overflow-hidden`}
          >
            {/* Expanded Header Bar */}
            <div
              role="button"
              onClick={disabled ? undefined : handleCollapsibleToggle}
              style={restProps.style}
              className={`relative flex items-center justify-between w-full ${sizeContainerClasses} rounded-t-2xl rounded-b-none border-0 border-b theme-border theme-bg-surface shadow-none ${
                disabled
                  ? "opacity-60 cursor-not-allowed select-none"
                  : "cursor-pointer hover:theme-bg-sub/20 select-none"
              } ${className}`}
            >
              {/* Left Side Prefix / Icon / Start Adornment */}
              <div className="flex items-center flex-1 min-w-0 mr-2">
                {startAdornment ? (
                  <div className="mr-3 shrink-0 flex items-center">{startAdornment}</div>
                ) : prefix ? (
                  <div className="mr-3 shrink-0 text-xs font-bold theme-text-secondary font-mono">
                    {prefix}
                  </div>
                ) : (
                  <ResolvedDefaultIcon />
                )}

                {/* Collapsible Text Summary Display */}
                <span
                  className={`font-semibold text-xs sm:text-sm truncate text-left select-none ${
                    stringValue
                      ? "theme-text-primary"
                      : "theme-text-secondary opacity-60"
                  }`}
                >
                  {stringValue || effectivePlaceholder || "Click to configure"}
                </span>
              </div>

              {/* Right Side Collapsible Chevron & End Adornment */}
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {endAdornment}
                <div
                  className="flex items-center justify-center shrink-0"
                  title="Collapse"
                >
                  <ChevronIcon
                    isOpen={true}
                    className="w-4 h-4 theme-accent"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Expandable Body / Children */}
            {children && (
              <div
                className={`p-3.5 sm:p-4 space-y-3 animate-fade-in ${
                  expandableContentClassName || bodyClassName
                }`}
              >
                {children}
              </div>
            )}
          </div>
        ) : (
          /* Collapsed Single Input Shell (Instant Zero Transition) */
          <div
            role="button"
            onClick={disabled ? undefined : handleCollapsibleToggle}
            style={restProps.style}
            className={`relative flex items-center justify-between w-full ${sizeContainerClasses} ${variantClasses} hover:border-[var(--accent-main)]/40 ${
              disabled
                ? "opacity-60 cursor-not-allowed select-none"
                : "cursor-pointer hover:theme-bg-sub/20 select-none"
            } ${className}`}
          >
            {/* Left Side Prefix / Icon / Start Adornment */}
            <div className="flex items-center flex-1 min-w-0 mr-2">
              {startAdornment ? (
                <div className="mr-3 shrink-0 flex items-center">{startAdornment}</div>
              ) : prefix ? (
                <div className="mr-3 shrink-0 text-xs font-bold theme-text-secondary font-mono">
                  {prefix}
                </div>
              ) : (
                <ResolvedDefaultIcon />
              )}

              {/* Collapsible Text Summary Display */}
              <span
                className={`font-semibold text-xs sm:text-sm truncate text-left select-none ${
                  stringValue
                    ? "theme-text-primary"
                    : "theme-text-secondary opacity-60"
                }`}
              >
                {stringValue || effectivePlaceholder || "Click to configure"}
              </span>
            </div>

            {/* Right Side Collapsible Chevron & End Adornment */}
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              {endAdornment}
              <div
                className="flex items-center justify-center shrink-0"
                title="Expand"
              >
                <ChevronIcon
                  isOpen={false}
                  className="w-4 h-4 theme-accent"
                />
              </div>
            </div>
          </div>
        )
      ) : (
        /* Standard Single Input / Textarea Shell */
        <div
          style={restProps.style}
          className={`relative flex items-center w-full ${sizeContainerClasses} ${variantClasses} ${stateClasses} ${className}`}
        >
          {/* Left Side Prefix / Icon / Adornment / LTR MultiLang Indicator */}
          {startAdornment ? (
            <div className="mr-3 shrink-0 flex items-center">{startAdornment}</div>
          ) : prefix ? (
            <div className="mr-3 shrink-0 text-xs font-bold theme-text-secondary font-mono">
              {prefix}
            </div>
          ) : isMultiLang && primaryLang && primaryLang.dir !== "rtl" ? (
            <div className="mr-3 shrink-0 text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono select-none pointer-events-none">
              {primaryLang.code.toUpperCase()}
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
              dir={isMultiLang && primaryLang ? primaryLang.dir : undefined}
              style={
                isMultiLang && primaryLang
                  ? { fontFamily: primaryLang.fontFamily, ...restProps.style }
                  : restProps.style
              }
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
              dir={isMultiLang && primaryLang ? primaryLang.dir : undefined}
              style={
                isMultiLang && primaryLang
                  ? { fontFamily: primaryLang.fontFamily, ...restProps.style }
                  : restProps.style
              }
              className={`w-full bg-transparent border-none outline-none font-semibold theme-text-primary placeholder:theme-text-secondary placeholder:opacity-50 focus:placeholder-transparent transition-all select-text ${
                isCompactNumber ? "text-center font-mono" : ""
              } ${isMultiLang && primaryLang?.dir === "rtl" ? "text-right" : ""} ${inputClassName}`}
              {...restProps}
            />
          )}

          {/* Right Side Suffix / Unit / Steppers / Password Toggle / Clear Button */}
          {((normalizedType === "number" && stepper && !disabled && !readOnly) ||
            (normalizedType === "password" && showPasswordToggle && !disabled) ||
            (clearable && stringValue.length > 0 && !disabled && !readOnly) ||
            (!isBorderless && isValid && !isInvalid) ||
            (isMultiLang && primaryLang && primaryLang.dir === "rtl") ||
            suffix ||
            unit ||
            endAdornment) && (
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              {/* RTL Indicator (AR, UR) in Collapsed Mode */}
              {isMultiLang && primaryLang && primaryLang.dir === "rtl" && (
                <div className="ml-1 mr-1 shrink-0 text-xs font-bold theme-text-secondary uppercase tracking-wider font-mono select-none pointer-events-none">
                  {primaryLang.code.toUpperCase()}
                </div>
              )}
              {/* Stepper Buttons for Number mode */}
              {normalizedType === "number" && stepper && !disabled && !readOnly && (
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <IconButton
                    icon={PlusIcon}
                    size="2xs"
                    variant="ghost"
                    tabIndex={-1}
                    onClick={() => {
                      const numericStep = typeof step === "number" ? step : parseFloat(step) || 1;
                      updateNumberValue(numericStep);
                    }}
                    title="Increase value"
                    ariaLabel="Increase value"
                  />
                  <IconButton
                    icon={MinusIcon}
                    size="2xs"
                    variant="ghost"
                    tabIndex={-1}
                    onClick={() => {
                      const numericStep = typeof step === "number" ? step : parseFloat(step) || 1;
                      updateNumberValue(-numericStep);
                    }}
                    title="Decrease value"
                    ariaLabel="Decrease value"
                  />
                </div>
              )}

              {/* Password Show/Hide Toggle */}
              {normalizedType === "password" && showPasswordToggle && !disabled && (
                <IconButton
                  icon={showPassword ? EyeOffIcon : EyeIcon}
                  size="xs"
                  variant="ghost"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? "Hide password" : "Show password"}
                  ariaLabel={showPassword ? "Hide password" : "Show password"}
                />
              )}

              {/* Instant Clear Button */}
              {clearable && stringValue.length > 0 && !disabled && !readOnly && (
                <IconButton
                  icon={CloseIcon}
                  size="2xs"
                  variant="ghost"
                  tabIndex={-1}
                  onClick={handleClear}
                  title="Clear input"
                  ariaLabel="Clear input"
                  className="hover:text-[var(--danger-text)]"
                />
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
      )}

      {/* Bottom Status / Error / Helper Text */}
      {isInvalid ? (
        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-medium text-[var(--danger-text)] animate-fade-in">
          <AlertCircleIcon className="w-3.5 h-3.5 shrink-0 opacity-85" />
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
