import path from 'path';
import { execFileSync } from 'child_process';
import { transformFileSync } from '@babel/core';
import { clampDay, clampInstant, isDayAllowed, localNoon } from '../../components/ui/dateValue';

/**
 * Date rules for DateField / DateTimeField across timezones and DST changes.
 *
 * A process's timezone can't be changed from inside Jest (process.env is sandboxed),
 * so each zone runs the real helpers in a fresh Node process started with TZ=<zone>.
 * The helpers are compiled with the project's Babel; the checks below run in the child.
 */

const SOURCE = path.join(__dirname, '../../components/ui/dateValue.ts');
const compiled = transformFileSync(SOURCE, {
  babelrc: false,
  configFile: false,
  presets: [require.resolve('@babel/preset-typescript')],
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
})!.code!;

/** Runs `body(M)` (plain JS, M = the dateValue module) in a Node process in `tz`; returns its JSON result. */
function inZone<T>(tz: string, body: string): T {
  const script = `
    const module = { exports: {} }; const exports = module.exports;
    ${compiled}
    const M = module.exports;
    process.stdout.write(JSON.stringify((${body})(M)));
  `;
  const out = execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: tz } });
  return JSON.parse(out.toString());
}

const ZONES = [
  'UTC',
  'Asia/Kolkata', // UTC+5:30
  'Asia/Kathmandu', // UTC+5:45
  'America/Los_Angeles', // UTC-8 / -7 (US DST)
  'Europe/London', // UTC+0 / +1 (EU DST)
  'Pacific/Kiritimati', // UTC+14: naive UTC conversion lands on the previous day
  'Pacific/Pago_Pago', // UTC-11: naive local reading of UTC midnight lands on the previous day
  'Australia/Lord_Howe', // +10:30 / +11 (30-minute DST)
  'America/Santiago', // DST changes at midnight: 2026-09-06 00:00 does not exist
];

// [year, monthIndex, day] — DST change days, year/month edges, leap day.
const DAYS = [
  [2026, 2, 8], // US spring forward
  [2026, 10, 1], // US fall back
  [2026, 2, 29], // EU spring forward
  [2026, 9, 25], // EU fall back
  [2026, 3, 5], // Santiago + Lord Howe fall back
  [2026, 8, 6], // Santiago spring forward at midnight
  [2026, 9, 4], // Lord Howe spring forward
  [2026, 0, 1],
  [2026, 11, 31],
  [2028, 1, 29], // leap day
];

/** Every check for one zone; returns a list of human-readable failures (empty = pass). */
const ZONE_CHECKS = `(M) => {
  const DAYS = ${JSON.stringify(DAYS)};
  const pad = (n) => String(n).padStart(2, '0');
  const fail = [];
  const check = (ok, msg) => { if (!ok) fail.push(msg); };
  const offsetJan = new Date(2026, 0, 15).getTimezoneOffset();
  const offsetJul = new Date(2026, 6, 15).getTimezoneOffset();

  for (const [y, m, d] of DAYS) {
    const tag = y + '-' + pad(m + 1) + '-' + pad(d);

    // DateField stores the local day at local noon.
    const noon = M.localNoon(new Date(y, m, d, 0, 30));
    check(noon.getFullYear() === y && noon.getMonth() === m && noon.getDate() === d && noon.getHours() === 12,
      tag + ': localNoon -> ' + noon.toString());

    // Android (Compose) round trip, from any time of that local day.
    for (const hour of [0, 1, 12, 23]) {
      const local = new Date(y, m, d, hour, 59);
      if (local.getDate() !== d) continue; // that local time doesn't exist (DST gap)
      const iso = M.toComposeDay(local);
      check(iso === tag + 'T00:00:00.000Z', tag + ' ' + hour + ':59 toComposeDay -> ' + iso);
      const back = M.fromComposeDay(new Date(iso));
      check(M.sameLocalDay(back, local) && back.getHours() === 12, tag + ' fromComposeDay -> ' + back.toString());
    }

    // Android min/max greying (native: bounds -> UTC midnight of their LOCAL day) must match
    // the DateField rule, with bounds at awkward times of day.
    const toUtcDayMillis = (l) => Date.UTC(l.getFullYear(), l.getMonth(), l.getDate());
    const min = new Date(y, m, d, 18, 0);
    const max = new Date(y, m, d + 2, 6, 0);
    for (let off = -2; off <= 4; off++) {
      const cell = Date.UTC(y, m, d + off);
      const nativeAllows = cell >= toUtcDayMillis(min) && cell <= toUtcDayMillis(max);
      const ours = M.isDayAllowed(M.fromComposeDay(new Date(cell)), min, max);
      check(ours === nativeAllows, tag + ' +' + off + ': isDayAllowed ' + ours + ' vs native ' + nativeAllows);
    }

    // Start/end of day stay on the day even when midnight is skipped.
    const s = M.startOfLocalDay(new Date(y, m, d, 15));
    const e = M.endOfLocalDay(new Date(y, m, d, 15));
    check(s.getDate() === d && e.getDate() === d && e > s, tag + ': start/end of day');

    // Picking a day in DateTimeField keeps the chosen local time.
    const t = M.withLocalTime(new Date(y, m, d, 12), new Date(2020, 5, 5, 21, 7, 45));
    check(t.getDate() === d && t.getHours() === 21 && t.getMinutes() === 7 && t.getSeconds() === 0,
      tag + ': withLocalTime -> ' + t.toString());
  }

  // The two bugs the Compose helpers prevent, shown with the raw approach.
  const nov17 = M.localNoon(new Date(2026, 10, 17));
  const naiveToCompose = nov17.toISOString().slice(0, 10);
  const naiveFromCompose = new Date('2026-11-17T00:00:00.000Z').getDate();

  return { fail, offsetJan, offsetJul, naiveToCompose, naiveFromCompose,
    helperToCompose: M.toComposeDay(nov17).slice(0, 10),
    helperFromCompose: M.fromComposeDay(new Date('2026-11-17T00:00:00.000Z')).getDate() };
}`;

type ZoneResult = {
  fail: string[];
  offsetJan: number;
  offsetJul: number;
  naiveToCompose: string;
  naiveFromCompose: number;
  helperToCompose: string;
  helperFromCompose: number;
};

const results = new Map<string, ZoneResult>();
const run = (tz: string) => {
  if (!results.has(tz)) results.set(tz, inZone<ZoneResult>(tz, ZONE_CHECKS));
  return results.get(tz)!;
};

describe('the child processes really run in each zone (guards the test itself)', () => {
  it.each([
    ['UTC', 0, 0],
    ['Asia/Kolkata', -330, -330],
    ['Asia/Kathmandu', -345, -345],
    ['America/Los_Angeles', 480, 420],
    ['Pacific/Kiritimati', -840, -840],
    ['Pacific/Pago_Pago', 660, 660],
    ['Australia/Lord_Howe', -660, -630],
  ])('%s has UTC offsets %i (Jan) / %i (Jul)', (tz, jan, jul) => {
    const r = run(tz);
    expect([r.offsetJan, r.offsetJul]).toEqual([jan, jul]);
  });
});

describe.each(ZONES)('in %s', (tz) => {
  it('keeps every DST-change, edge and leap day on the right local day', () => {
    expect(run(tz).fail).toEqual([]);
  });

  it('Android conversions are always the same calendar day', () => {
    const r = run(tz);
    expect(r.helperToCompose).toBe('2026-11-17');
    expect(r.helperFromCompose).toBe(17);
  });
});

describe('why the Compose helpers exist', () => {
  it('UTC+14: handing Compose the raw local-noon instant would show the previous day', () => {
    expect(run('Pacific/Kiritimati').naiveToCompose).toBe('2026-11-16');
  });
  it('UTC-11: reading the Compose result with local getters would give the previous day', () => {
    expect(run('Pacific/Pago_Pago').naiveFromCompose).toBe(16);
  });
});

/* ------------------------------------------------ zone-independent rules (in-process) */

describe('min / max', () => {
  it('DateField compares calendar days: today is allowed even when "now" is earlier than noon', () => {
    const now = new Date(2026, 10, 17, 9, 0);
    expect(isDayAllowed(localNoon(now), undefined, now)).toBe(true);
    expect(isDayAllowed(new Date(2026, 10, 18, 0, 1), undefined, now)).toBe(false);
    expect(isDayAllowed(new Date(2026, 10, 16, 23, 59), now, undefined)).toBe(false);
  });

  it('clampDay pulls an out-of-range day to the nearest allowed day at noon', () => {
    const min = new Date(2026, 0, 10, 18);
    const max = new Date(2026, 0, 20, 6);
    expect(clampDay(new Date(2026, 0, 5), min, max)).toEqual(new Date(2026, 0, 10, 12));
    expect(clampDay(new Date(2026, 0, 25), min, max)).toEqual(new Date(2026, 0, 20, 12));
    expect(clampDay(new Date(2026, 0, 15, 3), min, max)).toEqual(new Date(2026, 0, 15, 12));
  });

  it('DateTimeField clamps to the exact instant, as before', () => {
    const max = new Date(2026, 10, 17, 9, 30);
    expect(clampInstant(new Date(2026, 10, 17, 9, 45), undefined, max)).toEqual(max);
    expect(clampInstant(new Date(2026, 10, 17, 9, 15), undefined, max)).toEqual(new Date(2026, 10, 17, 9, 15));
    const min = new Date(2026, 10, 1, 8);
    expect(clampInstant(new Date(2026, 9, 31, 23), min, max)).toEqual(min);
  });
});
