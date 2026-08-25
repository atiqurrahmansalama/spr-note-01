import CustomCheckbox from "../../../components/ui/CustomCheckbox";

export function ReportControls({
  includeGroup,
  setIncludeGroup,
  includeTeacher,
  setIncludeTeacher,
  showGroupCheckbox,
  showTeacherCheckbox,
}) {
  // Only render the bar if at least one checkbox is visible
  if (!showGroupCheckbox && !showTeacherCheckbox) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-3 theme-bg-sub border-t theme-border text-xs theme-text-secondary select-none">
      {showGroupCheckbox && (
        <CustomCheckbox
          id="report-include-group"
          checked={includeGroup}
          onChange={(checked) => {
            setIncludeGroup(checked);
            if (!checked) setIncludeTeacher(false);
          }}
          label="Include Group"
          size="sm"
        />
      )}

      {showTeacherCheckbox && (
        <CustomCheckbox
          id="report-include-teacher"
          checked={includeTeacher}
          disabled={!includeGroup}
          onChange={(checked) => setIncludeTeacher(checked)}
          label="Mention Teacher"
          size="sm"
        />
      )}
    </div>
  );
}
