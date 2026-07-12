import { useEffect, useState } from 'react';
import { Clock, Infinity as InfinityIcon } from 'lucide-react';
import { formatRemaining } from '@/lib/duration';

interface CountdownTimerProps {
  expiresAt: string | null;
  onExpire?: () => void;
  accentClassName?: string;
}

/** Live-ticking countdown display. Shows "Permanent" (infinity icon) when `expiresAt` is null. */
export function CountdownTimer({ expiresAt, onExpire, accentClassName = 'text-white' }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (expiresAt && new Date(expiresAt).getTime() <= now) onExpire?.();
  }, [expiresAt, now, onExpire]);

  if (!expiresAt) {
    return (
      <div className={`flex items-center justify-center gap-2 ${accentClassName}`}>
        <InfinityIcon className="w-5 h-5" />
        <span className="font-semibold tracking-wide">Permanent</span>
      </div>
    );
  }

  const remaining = new Date(expiresAt).getTime() - now;

  return (
    <div className={`flex items-center justify-center gap-2 ${accentClassName}`}>
      <Clock className="w-5 h-5" />
      <span className="font-mono font-semibold tracking-wide text-lg">
        {remaining > 0 ? formatRemaining(remaining) : 'Expiring…'}
      </span>
    </div>
  );
}
