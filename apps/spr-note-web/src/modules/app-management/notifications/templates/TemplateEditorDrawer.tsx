import React, { useState, useEffect, useRef } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomSelect from '@/components/ui/CustomSelect';
import { TemplateIcon, SparklesIcon, MessageSquareIcon } from '@/components/ui/Icons';
import { DrawerContainer, DrawerSection, DrawerFooter } from '@/components/layout';
import TagSelectorPills from './TagSelectorPills';
import { createTemplate, updateTemplate } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import { useFormAutoSave } from '@/hooks';
import type { NotificationTemplate, TemplateFormData, EventType } from '@/types/notifications';

export interface TemplateEditorDrawerProps {
  template?: NotificationTemplate | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}

const EVENT_TYPE_OPTIONS = [
  { value: 'STUDENT_ABSENT', label: 'Student Absent Alert' },
  { value: 'STUDENT_LATE', label: 'Student Late Arrival' },
  { value: 'GATE_BUNK_ALERT', label: 'Gate Bunk / Discrepancy Alert' },
  { value: 'NEW_ADMISSION', 'label': 'Student Admission Confirmation' },
  { value: 'DAILY_REPORT_SAVED', label: 'Daily Recitation / Progress Report' },
  { value: 'STAFF_LEAVE_ACTION', label: 'Staff Leave Notice' },
  { value: 'GENERAL_BROADCAST', label: 'General Announcement' },
  { value: 'CUSTOM', label: 'Custom User Template' },
];

export default function TemplateEditorDrawer({
  template,
  onSaveSuccess,
  onCancel,
}: TemplateEditorDrawerProps) {
  const { showToast } = useToast();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<TemplateFormData>({
    name: template?.name || '',
    event_type: template?.event_type || 'CUSTOM',
    subject: template?.subject || '',
    body: template?.body || '',
    available_tags: template?.available_tags || [],
  });

  const [saving, setSaving] = useState<boolean>(false);

  const storageKey = `notification_template_form_${template?.id || 'new'}`;
  const { status: autoSaveStatus, lastSavedAt, clearDraft } = useFormAutoSave({
    storageKey,
    formData,
    setFormData,
    enabled: true,
  });

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        event_type: template.event_type || 'CUSTOM',
        subject: template.subject || '',
        body: template.body || '',
        available_tags: template.available_tags || [],
      });
    }
  }, [template]);

  const handleInsertTag = (tag: string) => {
    const textarea = bodyRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = formData.body;
      const newText = currentText.substring(0, start) + tag + currentText.substring(end);
      setFormData((prev) => ({ ...prev, body: newText }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 50);
    } else {
      setFormData((prev) => ({ ...prev, body: prev.body + tag }));
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Template name is required', 'warning');
      return;
    }
    if (!formData.body.trim()) {
      showToast('Template message body is required', 'warning');
      return;
    }

    setSaving(true);
    try {
      if (template?.id) {
        await updateTemplate(template.id, formData);
        showToast('Notification template updated successfully.', 'success');
      } else {
        await createTemplate(formData);
        showToast('Notification template created successfully.', 'success');
      }
      clearDraft();
      onSaveSuccess?.();
    } catch (err: any) {
      showToast(err.message || 'Failed to save template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const charCount = formData.body.length;
  const isUnicode = /[^\u0000-\u007f]/.test(formData.body);
  const smsLimit = isUnicode ? 70 : 160;
  const smsCount = charCount > 0 ? Math.ceil(charCount / smsLimit) : 1;

  return (
    <DrawerContainer padding="none" spacing="normal">
      <form onSubmit={handleSubmit} className="space-y-6">
        <DrawerSection title="Template Metadata" icon={TemplateIcon}>
          <div className="@container">
            <div className="grid grid-cols-1 @[480px]:grid-cols-2 gap-4">
              <div className="@[480px]:col-span-2">
                <CustomInput
                  label="Template Name"
                  placeholder="e.g. Student Absent Notice"
                  value={formData.name}
                  onChange={(val: string) => setFormData((prev) => ({ ...prev, name: val }))}
                  required
                />
              </div>

              <div>
                <CustomSelect
                  label="Event Trigger Category"
                  options={EVENT_TYPE_OPTIONS}
                  value={formData.event_type}
                  onChange={(val: string) =>
                    setFormData((prev) => ({ ...prev, event_type: val as EventType }))
                  }
                />
              </div>

              <div>
                <CustomInput
                  label="Subject Line (for Email / WhatsApp Header)"
                  placeholder="e.g. Notice from {institution_name}"
                  value={formData.subject}
                  onChange={(val: string) => setFormData((prev) => ({ ...prev, subject: val }))}
                />
              </div>
            </div>
          </div>
        </DrawerSection>

        <DrawerSection title="Message Content & Dynamic Tags" icon={MessageSquareIcon}>
          <div className="space-y-4">
            <TagSelectorPills onInsertTag={handleInsertTag} />

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold theme-text-secondary">Message Body Template</label>
                <div className="flex items-center gap-2 font-mono text-[11px] theme-text-secondary">
                  <span>{charCount} Chars</span>
                  <span>•</span>
                  <span>{smsCount} SMS ({isUnicode ? 'Unicode' : 'GSM'})</span>
                </div>
              </div>

              <textarea
                ref={bodyRef}
                rows={6}
                value={formData.body}
                onChange={(e) => setFormData((prev) => ({ ...prev, body: e.target.value }))}
                placeholder="Dear Guardian, your ward {student_name} was recorded ABSENT today..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] font-mono leading-relaxed resize-y"
              />
            </div>
          </div>
        </DrawerSection>

        <DrawerFooter
          onCancel={onCancel}
          onSave={handleSubmit}
          isSubmitting={saving}
          isSaveDisabled={!formData.name.trim() || !formData.body.trim()}
          saveLabel={template?.id ? 'Update Template' : 'Save Template'}
          autoSaveStatus={autoSaveStatus}
          lastSavedAt={lastSavedAt}
        />
      </form>
    </DrawerContainer>
  );
}
