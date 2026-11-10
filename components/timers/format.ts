/** Formatting helpers shared by the kick counter and contraction timer. */

const pad = (n: number) => String(n).padStart(2, '0');

/** Stopwatch style: `04:09`, or `1:04:09` past an hour. */
export const formatClock = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
};

/** Compact duration: `45s`, `4m 30s`, `1h 12m`. */
export const formatShort = (totalSeconds: number): string => {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m ? `${h}h ${m}m` : `${h}h`;
  return sec ? `${m}m ${sec}s` : `${m}m`;
};

/** `45s ago`, `4m ago` — for "time since" tickers. */
export const formatAgo = (totalSeconds: number): string => {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ${m % 60}m ago`;
};

/** `Nov 6 · 9:41 AM` */
export const formatSessionDate = (d: Date): string =>
  `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

/** `9:41 AM` */
export const formatTimeOfDay = (d: Date): string =>
  d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
