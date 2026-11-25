import React, { useEffect, useMemo, useState } from 'react';
import { CalendarIcon } from '../../../components/icons/UniverseIcons';
import { useWelcomeTranslation } from '../locales';

interface CountdownTimerProps {
  title: string;
  targetIso: string | null;
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  arrived: boolean;
}

function computeRemaining(targetMs: number): TimeParts {
  const diff = targetMs - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, arrived: true };
  }
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds, arrived: false };
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ title, targetIso }) => {
  const { t, formatNumber } = useWelcomeTranslation();

  const targetMs = useMemo(() => {
    if (!targetIso) return null;
    const ms = new Date(targetIso).getTime();
    return Number.isNaN(ms) ? null : ms;
  }, [targetIso]);

  const [parts, setParts] = useState<TimeParts | null>(() =>
    targetMs ? computeRemaining(targetMs) : null
  );

  useEffect(() => {
    if (!targetMs) {
      setParts(null);
      return;
    }
    setParts(computeRemaining(targetMs));
    const timer = window.setInterval(() => {
      setParts(computeRemaining(targetMs));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [targetMs]);

  if (!targetMs || !parts) return null;

  const units = [
    { key: 'days', value: parts.days, label: t('countdownDays', 'Days') },
    { key: 'hours', value: parts.hours, label: t('countdownHours', 'Hours') },
    { key: 'minutes', value: parts.minutes, label: t('countdownMinutes', 'Mins') },
    { key: 'seconds', value: parts.seconds, label: t('countdownSeconds', 'Secs') },
  ];

  return (
    <div className="rounded-2xl theme-bg-app p-4 space-y-3 border-0">
      <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider theme-text-secondary">
        <CalendarIcon className="w-3.5 h-3.5 theme-accent" />
        <span>{title}</span>
      </div>

      {parts.arrived ? (
        <div className="text-sm font-bold theme-accent text-center py-1">
          {t('countdownArrived', 'The special moment has arrived!')}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {units.map((u) => (
            <div key={u.key} className="rounded-xl theme-bg-surface py-2.5 px-1 text-center">
              <div className="text-lg sm:text-xl font-extrabold font-mono theme-text-primary">
                {formatNumber(String(u.value).padStart(2, '0'))}
              </div>
              <div className="text-[10px] font-semibold theme-text-secondary uppercase">
                {u.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
