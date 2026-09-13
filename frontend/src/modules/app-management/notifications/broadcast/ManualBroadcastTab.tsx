import React, { useState } from 'react';
import CustomInput from '@/components/ui/CustomInput';
import CustomButton from '@/components/ui/CustomButton';
import CustomSelect from '@/components/ui/CustomSelect';
import { SendIcon, RadioTowerIcon, SparklesIcon } from '@/components/ui/Icons';
import BroadcastAudienceSelector from './BroadcastAudienceSelector';
import BroadcastChannelSelector from './BroadcastChannelSelector';
import BroadcastPreviewCard from './BroadcastPreviewCard';
import { sendManualBroadcast } from '@/api/notifications';
import { useToast } from '@/context/ToastContext';
import type { ManualBroadcastPayload, BroadcastAudience, TriggerChannel, NotificationType } from '@/types/notifications';

const NOTIFICATION_TYPE_OPTIONS = [
  { value: 'INFO', label: 'Standard Information (Blue)' },
  { value: 'SUCCESS', label: 'Success / Verified Notice (Green)' },
  { value: 'WARNING', label: 'Urgent Warning / Reminder (Amber)' },
  { value: 'ALERT', label: 'Critical Emergency Alert (Red)' },
];

export default function ManualBroadcastTab() {
  const { showToast } = useToast();

  const [payload, setPayload] = useState<ManualBroadcastPayload>({
    target_audience: 'ALL',
    class_id: '',
    channels: ['IN_APP', 'SMS'],
    title: 'Institutional Announcement',
    message: '',
    notification_type: 'INFO',
    action_url: '',
  });

  const [sending, setSending] = useState<boolean>(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!payload.message.trim()) {
      showToast('Please enter an announcement message body', 'warning');
      return;
    }
    if (payload.channels.length === 0) {
      showToast('Please select at least one dispatch channel', 'warning');
      return;
    }

    setSending(true);
    try {
      const res = await sendManualBroadcast(payload);
      showToast(res.message || `Broadcast dispatched to ${res.dispatched_count} recipients`, 'success');

      // Reset form
      setPayload((prev) => ({
        ...prev,
        message: '',
        title: 'Institutional Announcement',
        action_url: '',
      }));

      // Trigger local bell refresh
      window.dispatchEvent(new CustomEvent('spr_notification_refresh'));
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch broadcast', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Top Banner Guide */}
      <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <RadioTowerIcon className="w-5 h-5 theme-accent" />
            <h3 className="text-sm sm:text-base font-bold theme-text-primary">
              Manual Broadcast & Emergency Announcement Desk
            </h3>
          </div>
          <p className="text-xs theme-text-secondary leading-relaxed max-w-2xl">
            Dispatch mass communications instantly across multiple channels to parents, students, specific classes, or faculty staff members.
          </p>
        </div>
      </div>

      <form onSubmit={handleSend} className="space-y-6">
        {/* Step 1: Audience */}
        <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs">
          <BroadcastAudienceSelector
            selectedAudience={payload.target_audience}
            selectedClassId={payload.class_id || ''}
            onAudienceChange={(aud) => setPayload((prev) => ({ ...prev, target_audience: aud }))}
            onClassChange={(clsId) => setPayload((prev) => ({ ...prev, class_id: clsId }))}
          />
        </div>

        {/* Step 2: Channels */}
        <div className="p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface shadow-xs">
          <BroadcastChannelSelector
            selectedChannels={payload.channels}
            onChangeChannels={(chs) => setPayload((prev) => ({ ...prev, channels: chs }))}
          />
        </div>

        {/* Step 3: Content Composition & Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl border theme-border theme-bg-surface space-y-4 shadow-xs">
            <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
              3. Compose Announcement Message
            </label>

            <div>
              <CustomInput
                label="Headline / Title"
                placeholder="e.g. Campus Holiday Notice, Exam Schedule..."
                value={payload.title}
                onChange={(val: string) => setPayload((prev) => ({ ...prev, title: val }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <CustomSelect
                  label="Notice Urgency / Badge"
                  options={NOTIFICATION_TYPE_OPTIONS}
                  value={payload.notification_type || 'INFO'}
                  onChange={(val: string) =>
                    setPayload((prev) => ({ ...prev, notification_type: val as NotificationType }))
                  }
                />
              </div>

              <div>
                <CustomInput
                  label="Action Link / Target URL (Optional)"
                  placeholder="e.g. /academy/routines, /exams"
                  value={payload.action_url || ''}
                  onChange={(val: string) => setPayload((prev) => ({ ...prev, action_url: val }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold theme-text-secondary">
                Announcement Body
              </label>
              <textarea
                rows={5}
                value={payload.message}
                onChange={(e) => setPayload((prev) => ({ ...prev, message: e.target.value }))}
                placeholder="Type your official announcement here..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border theme-border theme-bg-sub theme-text-primary focus:outline-none focus:ring-1 focus:ring-[var(--accent-main)] font-mono leading-relaxed resize-y"
                required
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <BroadcastPreviewCard payload={payload} />

            <div className="pt-2">
              <CustomButton
                type="submit"
                variant="primary"
                size="lg"
                icon={SendIcon}
                loading={sending}
                className="w-full justify-center"
              >
                Dispatch Broadcast Announcement
              </CustomButton>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
