import React from "react";
import CustomButton from "@/components/ui/CustomButton";
import TemplateTextarea from "@/components/ui/TemplateTextarea";

export function CommentSection({
  comment = "",
  setComment,
  savedComments = [],
  onAddToRecord,
  onMakeReport,
  showActions = true,
  isEditMode = false,
  isSaving = false,
}: {
  comment?: string;
  setComment: (val: string) => void;
  savedComments?: string[];
  onAddToRecord: () => void;
  onMakeReport: () => void;
  showActions?: boolean;
  isEditMode?: boolean;
  isSaving?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="theme-bg-surface rounded-2xl p-5 shadow-lg relative z-0 space-y-3 border theme-border">
        <TemplateTextarea
          id="comment-textarea"
          label="Comments"
          value={comment}
          onChange={setComment}
          namespace="report_builder_comments"
          initialTemplates={savedComments}
          placeholder="Enter comment..."
          rows={5}
          onSaveShortcut={onMakeReport}
          onSubmitShortcut={onAddToRecord}
        />
      </div>

      {showActions && (
        <div className="flex flex-row items-center lg:justify-between gap-2.5 sm:gap-3 pt-1 w-full">
          <CustomButton
            type="button"
            size="lg"
            variant={isEditMode ? "primary" : "surface"}
            loading={isSaving}
            loadingText={isEditMode ? "Updating Report..." : "Saving..."}
            icon={false}
            onClick={onAddToRecord}
            className="flex-1 lg:flex-initial lg:w-auto lg:min-w-[180px] shadow-md hover:shadow-lg text-xs sm:text-sm md:text-base px-2 sm:px-4"
          >
            {isEditMode ? "Confirm Edit" : "Add to Record"}
          </CustomButton>

          <CustomButton
            type="button"
            size="lg"
            variant="primary"
            onClick={onMakeReport}
            data-shortcut="make-report"
            className="flex-1 lg:flex-initial lg:w-auto lg:min-w-[180px] shadow-md hover:shadow-lg text-xs sm:text-sm md:text-base px-2 sm:px-4"
          >
            Make Report
          </CustomButton>
        </div>
      )}
    </div>
  );
}
