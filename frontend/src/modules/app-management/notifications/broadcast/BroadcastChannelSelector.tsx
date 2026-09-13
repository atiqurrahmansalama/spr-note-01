import React from 'react';
import { BellIcon, MessageSquareIcon, WhatsappIcon, MailIcon, TelegramIcon } from '@/components/ui/Icons';
import type { TriggerChannel } from '@/types/notifications';

export interface BroadcastChannelSelectorProps {
  selectedChannels: TriggerChannel[];
  onChangeChannels: (channels: TriggerChannel[]) => void;
}

const CHANNELS: { id: TriggerChannel; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'IN_APP', label: 'In-App Bell Dropdown', sub: 'Instant portal banner & bell notification', icon: BellIcon },
  { id: 'SMS', label: 'SMS Text Message', sub: 'Send phone SMS via active gateway', icon: MessageSquareIcon },
  { id: 'WHATSAPP', label: 'WhatsApp Message', sub: 'Send via WhatsApp Business API', icon: WhatsappIcon },
  { id: 'EMAIL', label: 'Email Notice', sub: 'Send HTML email via SMTP server', icon: MailIcon },
  { id: 'TELEGRAM', label: 'Telegram Bot & Channel', sub: 'Post to Telegram channel, group, or user chat', icon: TelegramIcon },
];

export default function BroadcastChannelSelector({
  selectedChannels,
  onChangeChannels,
}: BroadcastChannelSelectorProps) {
  const handleToggle = (ch: TriggerChannel) => {
    const exists = selectedChannels.includes(ch);
    const next = exists
      ? selectedChannels.filter((c) => c !== ch)
      : [...selectedChannels, ch];
    onChangeChannels(next);
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-bold uppercase tracking-wider theme-text-secondary">
        2. Select Dispatch Channels
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
        {CHANNELS.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedChannels.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleToggle(item.id)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 select-none ${
                isSelected
                  ? 'theme-bg-accent-soft border-[var(--accent-main)] shadow-xs ring-1 ring-[var(--accent-main)]'
                  : 'theme-bg-surface theme-border hover:theme-bg-sub/50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected
                    ? 'theme-bg-accent theme-accent-text'
                    : 'theme-bg-sub theme-text-secondary'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold block leading-tight ${
                      isSelected ? 'theme-accent' : 'theme-text-primary'
                    }`}
                  >
                    {item.label}
                  </span>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 rounded border theme-border theme-text-primary"
                  />
                </div>
                <span className="text-[10px] theme-text-secondary block mt-0.5 leading-tight">
                  {item.sub}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
