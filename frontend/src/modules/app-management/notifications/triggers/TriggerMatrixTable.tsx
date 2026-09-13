import React from 'react';
import CustomSelect from '@/components/ui/CustomSelect';
import type {
  NotificationTriggerRule,
  NotificationTemplate,
  TriggerChannel,
  EventType,
} from '@/types/notifications';

export interface TriggerMatrixTableProps {
  matrix: NotificationTriggerRule[];
  templates: NotificationTemplate[];
  onChangeMatrix: (newMatrix: NotificationTriggerRule[]) => void;
}

const CHANNELS: { id: TriggerChannel; label: string }[] = [
  { id: 'IN_APP', label: 'In-App Bell' },
  { id: 'SMS', label: 'SMS' },
  { id: 'WHATSAPP', label: 'WhatsApp' },
  { id: 'EMAIL', label: 'Email' },
  { id: 'TELEGRAM', label: 'Telegram' },
];

const EVENT_DESCRIPTIONS: Record<string, string> = {
  STUDENT_ABSENT: 'Fired when a student is recorded absent in daily attendance.',
  STUDENT_LATE: 'Fired when a student arrives late past grace period.',
  GATE_BUNK_ALERT: 'Fired upon discrepancy at campus gate entrance/exit.',
  NEW_ADMISSION: 'Fired when a new student admission voucher is confirmed.',
  DAILY_REPORT_SAVED: 'Fired when daily recitation / hifz progress report is logged.',
  STAFF_LEAVE_ACTION: 'Fired when staff leave desk approves or rejects an application.',
  INSTITUTIONAL_ANNOUNCEMENT: 'Fired on general campus broadcast.',
};

export default function TriggerMatrixTable({
  matrix,
  templates,
  onChangeMatrix,
}: TriggerMatrixTableProps) {
  const handleToggleChannel = (ruleIndex: number, channel: TriggerChannel) => {
    const updated = [...matrix];
    const rule = updated[ruleIndex];
    const currentChannels = Array.isArray(rule.channels) ? rule.channels : [];
    const exists = currentChannels.includes(channel);

    rule.channels = exists
      ? currentChannels.filter((c) => c !== channel)
      : [...currentChannels, channel];

    onChangeMatrix(updated);
  };

  const handleToggleEnabled = (ruleIndex: number) => {
    const updated = [...matrix];
    updated[ruleIndex].is_enabled = !updated[ruleIndex].is_enabled;
    onChangeMatrix(updated);
  };

  const handleTemplateChange = (ruleIndex: number, templateId: string) => {
    const updated = [...matrix];
    updated[ruleIndex].template = templateId || null;
    onChangeMatrix(updated);
  };

  return (
    <div className="rounded-2xl border theme-border theme-bg-surface overflow-hidden shadow-xs">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b theme-border theme-bg-sub/70 text-xs font-bold theme-text-primary">
              <th className="py-3.5 px-4">Event Type & Description</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              {CHANNELS.map((ch) => (
                <th key={ch.id} className="py-3.5 px-4 text-center whitespace-nowrap">
                  {ch.label}
                </th>
              ))}
              <th className="py-3.5 px-4 min-w-[200px]">Assigned Template</th>
            </tr>
          </thead>
          <tbody className="divide-y theme-border text-xs">
            {matrix.map((rule, idx) => {
              const ruleTemplates = templates.filter(
                (t) => t.event_type === rule.event_type || t.event_type === 'CUSTOM'
              );
              const templateOptions = [
                { value: '', label: 'System Default Template' },
                ...ruleTemplates.map((t) => ({ value: t.id, label: t.name })),
              ];

              return (
                <tr
                  key={rule.event_type}
                  className={`hover:theme-bg-sub/30 transition-colors ${
                    !rule.is_enabled ? 'opacity-50' : ''
                  }`}
                >
                  {/* Event Info */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold theme-text-primary">
                      {rule.event_type.replace(/_/g, ' ')}
                    </div>
                    <p className="text-[11px] theme-text-secondary leading-tight mt-0.5">
                      {EVENT_DESCRIPTIONS[rule.event_type] || 'Automated trigger workflow event.'}
                    </p>
                  </td>

                  {/* Active Switch */}
                  <td className="py-3.5 px-4 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rule.is_enabled}
                        onChange={() => handleToggleEnabled(idx)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-neutral-300 dark:bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:theme-bg-accent" />
                    </label>
                  </td>

                  {/* Channel Checkboxes */}
                  {CHANNELS.map((ch) => {
                    const isChecked = Array.isArray(rule.channels) && rule.channels.includes(ch.id);
                    return (
                      <td key={ch.id} className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={!rule.is_enabled}
                          onChange={() => handleToggleChannel(idx, ch.id)}
                          className="w-4 h-4 rounded border theme-border theme-text-primary cursor-pointer disabled:cursor-not-allowed"
                        />
                      </td>
                    );
                  })}

                  {/* Template Dropdown */}
                  <td className="py-3.5 px-4">
                    <CustomSelect
                      options={templateOptions}
                      value={rule.template || ''}
                      onChange={(val: string) => handleTemplateChange(idx, val)}
                      disabled={!rule.is_enabled}
                      size="sm"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
