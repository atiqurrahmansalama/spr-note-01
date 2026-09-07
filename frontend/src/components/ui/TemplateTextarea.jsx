import React, { forwardRef } from "react";
import CustomInput from "./CustomInput";
import { useUndoRedo } from "../../context/useUndoRedo";

/**
 * Enterprise Universal TemplateTextarea
 * 
 * Uses the project's standard CustomInput with type="textarea" and enableTemplates={true}.
 * Guarantees 100% theme design tokens, consistent border/radius, validation, and full
 * Clear, Save, and Saved Messages / Templates functionality with Universal Undo & Redo.
 */
const TemplateTextarea = forwardRef(function TemplateTextarea(
  {
    id,
    label,
    value = "",
    onChange,
    placeholder = "Enter text...",
    rows = 4,
    category,
    templateCategory,
    namespace = "comments",
    templateNamespace,
    initialTemplates = [],
    mode = "append", // 'append' | 'replace'
    required = false,
    disabled = false,
    readOnly = false,
    maxLength,
    showCharCount = false,
    showClear = true,
    showSave = true,
    showSaved = true,
    showCount = true,
    showCountBadge,
    showSearch = true,
    searchable,
    showEdit = true,
    editable,
    showDelete = true,
    deletable,
    showOnFocusOnly = false,
    helperText,
    error,
    className = "",
    textareaClassName = "",
    onSaveShortcut,
    onSubmitShortcut,
    onKeyDown,
    ...props
  },
  ref
) {
  let undoRedoCtx = null;
  try {
    undoRedoCtx = useUndoRedo();
  } catch {
    // Fallback if outside provider
  }

  const shouldShowCount = showCountBadge !== undefined ? Boolean(showCountBadge) : Boolean(showCount);
  const shouldShowSearch = searchable !== undefined ? Boolean(searchable) : Boolean(showSearch);
  const shouldAllowEdit = editable !== undefined ? Boolean(editable) : Boolean(showEdit);
  const shouldAllowDelete = deletable !== undefined ? Boolean(deletable) : Boolean(showDelete);

  const resolvedCategory =
    category ||
    templateCategory ||
    namespace ||
    templateNamespace ||
    (props.name ? props.name : "comments");

  const handleKeyDown = (e) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    if (isCmdOrCtrl && e.key.toLowerCase() === "s" && onSaveShortcut) {
      e.preventDefault();
      onSaveShortcut(value);
    } else if (isCmdOrCtrl && e.key === "Enter" && onSubmitShortcut) {
      e.preventDefault();
      onSubmitShortcut(value);
    } else if (isCmdOrCtrl && e.key.toLowerCase() === "z" && !e.shiftKey && !e.altKey && undoRedoCtx?.canUndo) {
      e.preventDefault();
      undoRedoCtx.undo();
    } else if (isCmdOrCtrl && ((e.key.toLowerCase() === "z" && e.shiftKey) || (e.key.toLowerCase() === "y" && !e.shiftKey)) && undoRedoCtx?.canRedo) {
      e.preventDefault();
      undoRedoCtx.redo();
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <CustomInput
      ref={ref}
      id={id}
      type="textarea"
      label={label}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      maxLength={maxLength}
      showCharCount={showCharCount}
      helperText={helperText}
      error={error}
      wrapperClassName={className}
      inputClassName={textareaClassName}
      enableTemplates={true}
      templateCategory={resolvedCategory}
      templateNamespace={resolvedCategory}
      templateInitialList={initialTemplates}
      templateMode={mode}
      showTemplateClear={showClear}
      showTemplateSave={showSave}
      showTemplateSaved={showSaved}
      showTemplateCount={shouldShowCount}
      showTemplateSearch={shouldShowSearch}
      showTemplateEdit={shouldAllowEdit}
      showTemplateDelete={shouldAllowDelete}
      showTemplateOnFocusOnly={showOnFocusOnly}
      {...props}
    />
  );
});

export default TemplateTextarea;
