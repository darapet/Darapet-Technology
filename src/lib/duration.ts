import type { DurationUnit } from '@/types/database';

/** Compute an ISO timestamp `amount` `unit` from now, or null for a permanent (no expiry) restriction. */
export function computeExpiry(amount: number, unit: DurationUnit): string | null {
  if (unit === 'permanent' || !amount || amount <= 0) return null;
  const ms = unit === 'hours' ? amount * 60 * 60 * 1000 : amount * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + ms).toISOString();
}

/** Format the remaining time between now and an ISO timestamp as "2d 4h 12m" style text. */
export function formatRemaining(msRemaining: number): string {
  if (msRemaining <= 0) return '0s';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (days || hours) parts.push(`${hours}h`);
  if (days || hours || minutes) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
}

export function isExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}
