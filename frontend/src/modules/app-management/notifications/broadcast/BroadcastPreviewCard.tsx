import React from 'react';
import { RadioTowerIcon, BellIcon, MessageSquareIcon } from '@/components/ui/Icons';
import type { ManualBroadcastPayload } from '@/types/notifications';

export interface BroadcastPreviewCardProps {
  payload: ManualBroadcastPayload;
}

export default function BroadcastPreviewCard({ payload }: BroadcastPreviewCardProps) {
  const charCount = payload.message.length;
  const isUnicode = /[^\u0000-\u007f]/.test(payload.message);
  const smsLimit = isUnicode ? 70 : 160;
  const smsCount = charCount > 0 ? Math.ceil(charCount / smsLimit) : 1;

  return (
    <div className="p-4 rounded-2xl border theme-border theme-bg-surface space-y-3">
      <div className="flex items-center justify-between border-b theme-border pb-2.5">
        <div className="flex items-center gap-2">
          <RadioTowerIcon className="w-4 h-4 theme-accent" />
          <span className="text-xs font-bold uppercase tracking-wider theme-text-primary">
            Live Dispatch Preview
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[10px] theme-text-secondary">
          <span>{charCount} Chars</span>
          <span>•</span>
          <span>{smsCount} SMS ({isUnicode ? 'Unicode' : 'GSM'})</span>
        </div>
      </div>

      {/* Simulated Device Frame */}
      <div className="p-3.5 rounded-xl theme-bg-sub border theme-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md theme-bg-accent-soft theme-accent flex items-center justify-center font-bold text-xs">
              <BellIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold theme-text-primary">
              {payload.title || 'Institutional Announcement'}
            </span>
          </div>
          <span className="text-[10px] font-mono theme-text-secondary">Just now</span>
        </div>

        <p className="text-xs theme-text-primary font-mono whitespace-pre-wrap leading-relaxed">
          {payload.message || 'Type your message above to see how it will appear to recipients...'}
        </p>

        {payload.action_url && (
          <div className="pt-1 text-[11px] font-semibold theme-accent truncate">
            Link: {payload.action_url}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] theme-text-secondary pt-1">
        <span>Audience: <strong>{payload.target_audience}</strong></span>
        <span>Channels: <strong>{payload.channels.join(', ') || 'None'}</strong></span>
      </div>
    </div>
  );
}
