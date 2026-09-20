import React from "react";
import CustomButton from "../../../../../components/ui/CustomButton";
import { EditIcon } from "../../../../../components/ui/Icons";
import TemplateTextarea from "../../../../../components/ui/TemplateTextarea";

export interface CommentSectionProps {
  comment?: string;
  setComment: (val: string) => void;
  savedComments?: string[];
  setSavedComments?: (val: string[]) => void;
  onAddToRecord: () => void;
  onMakeReport: () => void;
  showActions?: boolean;
  isEditMode?: boolean;
  isSaving?: boolean;
}

export default function CommentSection({
  comment = "",
  setComment,
  savedComments = [],
  setSavedComments,
  onAddToRecord,
  onMakeReport,
  showActions = true,
  isEditMode = false,
  isSaving = false,
}: CommentSectionProps) {
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center lg:justify-between gap-3 pt-1 w-full">
          <CustomButton
            type="button"
            size="lg"
            variant={isEditMode ? "primary" : "surface"}
            loading={isSaving}
            loadingText={isEditMode ? "Updating Report..." : "Saving..."}
            icon={!isSaving && isEditMode ? EditIcon : undefined}
            onClick={onAddToRecord}
            className="w-full sm:flex-1 lg:flex-initial lg:w-auto lg:min-w-[180px] shadow-md hover:shadow-lg"
          >
            {isEditMode ? "Confirm Edit" : "Add to Record"}
          </CustomButton>

          <CustomButton
            type="button"
            size="lg"
            variant="primary"
            onClick={onMakeReport}
            data-shortcut="make-report"
            className="w-full sm:flex-1 lg:flex-initial lg:w-auto lg:min-w-[180px] shadow-md hover:shadow-lg"
          >
            Make Report
          </CustomButton>
        </div>
      )}
    </div>
  );
}
