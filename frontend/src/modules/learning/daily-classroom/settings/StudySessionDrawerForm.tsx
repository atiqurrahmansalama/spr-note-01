import React, { useState } from "react";
import { DrawerContainer } from "@/components/layout";
import CustomInput from "@/components/ui/CustomInput";
import CustomSelect from "@/components/ui/CustomSelect";
import CustomButton from "@/components/ui/CustomButton";
import { SessionsIcon } from "@/components/ui/Icons";

export interface StudySessionDrawerFormProps {
  initialData?: any;
  onSave: (payload: any) => Promise<void> | void;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = [
  { value: "QURAN", label: "Quran" },
  { value: "BOOK", label: "Book" },
];

/**
 * Enterprise Right Sidebar Form for Creating & Editing Daily Classroom Study Sessions
 * Features clean Quran vs Book category selection via CustomSelect and container query responsiveness.
 */
export const StudySessionDrawerForm: React.FC<StudySessionDrawerFormProps> = ({
  initialData,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState<string>(() => initialData?.name || "");
  const [category, setCategory] = useState<'QURAN' | 'BOOK'>(() => {
    const raw = initialData?.category || initialData?.type || "QURAN";
    return String(raw).toUpperCase() === "BOOK" ? "BOOK" : "QURAN";
  });
  const [description, setDescription] = useState<string>(() => initialData?.description || "");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      setError("Study session title is required.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      await onSave({
        name: cleanName,
        category,
        type: category,
        description: description.trim(),
        is_active: true,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save study session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full text-left @container">
      <DrawerContainer padding="normal" spacing="normal">
        <div className="space-y-6 pt-1">
          {/* ─── Section: Session Details ─── */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b theme-border">
              <SessionsIcon className="w-4 h-4 theme-accent shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
                Session Details
              </span>
            </div>

            {/* Complementary Field Pairing: Study Category & Topic Title */}
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <CustomSelect
                label="Study Category"
                value={category}
                onChange={(val: any) => {
                  const targetVal = typeof val === "object" ? val?.value : val;
                  if (targetVal) setCategory(targetVal);
                }}
                options={CATEGORY_OPTIONS}
                required={true}
                searchable={false}
                placeholder="Select category..."
              />

              <CustomInput
                label="Study Session Title"
                value={name}
                onChange={(val: any) => {
                  const cleanVal = typeof val === "object" && val?.target ? val.target.value : val;
                  setName(cleanVal || "");
                  if (error) setError("");
                }}
                placeholder={category === "QURAN" ? "e.g. Sabaq, Saat Sabaq, Amukta, Nazira" : "e.g. Arabic Grammar, Hadith Lesson, Science"}
                required={true}
                error={error}
              />
            </div>

            <CustomInput
              type="textarea"
              label="Description"
              value={description}
              onChange={(val: any) => {
                const cleanVal = typeof val === "object" && val?.target ? val.target.value : val;
                setDescription(cleanVal || "");
              }}
              rows={3}
              placeholder="Optional recitation scope, evaluation criteria, or instructions..."
            />
          </div>
        </div>
      </DrawerContainer>

      {/* ─── Bottom Action Bar (Border-t with two buttons on opposite sides) ─── */}
      <div className="p-4 border-t theme-border flex items-center justify-between gap-3 shrink-0">
        <CustomButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </CustomButton>
        <CustomButton
          type="submit"
          variant="primary"
          size="sm"
          loading={isSubmitting}
        >
          {initialData ? "Save Changes" : "Create Session"}
        </CustomButton>
      </div>
    </form>
  );
};

export default StudySessionDrawerForm;
