/**
 * Date value rules shared by DateField / DateTimeField on every platform.
 * Keep these exact — dates are stored in Firestore and shown across timezones.
 *
 * - DateField values are a LOCAL calendar day, stored as that day at local noon
 *   (noon is never inside a DST gap and stays on the same day for ±11h shifts).
 * - min/max for DateField compare local calendar days (a day is allowed if it is
 *   on or between the min and max days).
 * - DateTimeField values are exact instants; min/max clamp to the exact instant.
 * - Android's Material 3 date picker speaks "UTC midnight of the day". Never hand it
 *   a local Date directly, and never read its result with local getters.
 */

/** The local calendar day of `d`, at local noon — what DateField has always stored. */
export const localNoon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

export const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const endOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

export const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** DateField rule: is `d`'s local day within the min/max days? */
export function isDayAllowed(d: Date, min?: Date, max?: Date): boolean {
  const day = startOfLocalDay(d).getTime();
  if (min && day < startOfLocalDay(min).getTime()) return false;
  if (max && day > startOfLocalDay(max).getTime()) return false;
  return true;
}

/** DateField: keep a picked day inside the min/max days (the picker should already prevent it). */
export function clampDay(d: Date, min?: Date, max?: Date): Date {
  if (min && !isDayAllowed(d, min, undefined)) return localNoon(min);
  if (max && !isDayAllowed(d, undefined, max)) return localNoon(max);
  return localNoon(d);
}

/** DateTimeField rule: clamp to the exact min/max instants (unchanged from the original field). */
export function clampInstant(d: Date, min?: Date, max?: Date): Date {
  if (max && d > max) return new Date(max);
  if (min && d < min) return new Date(min);
  return d;
}

/** `day`'s local calendar day with `time`'s local hour and minute (seconds dropped). */
export const withLocalTime = (day: Date, time: Date) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes());

/* ---------------------------------------------- Android Material 3 (Compose) */

/** ISO string of UTC midnight of `d`'s LOCAL day — what Compose needs to show that day. */
export const toComposeDay = (d: Date) =>
  new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();

/** Compose's selected day (UTC midnight) → that calendar day at local noon. */
export const fromComposeDay = (utcMidnight: Date) =>
  new Date(utcMidnight.getUTCFullYear(), utcMidnight.getUTCMonth(), utcMidnight.getUTCDate(), 12);
