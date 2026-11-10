/**
 * Local baby-growth illustrations — one per pregnancy week (1–40).
 * Minimalist flat-vector icons in the app's teal theme (#81bec1 / #E0F2F3),
 * with transparent backgrounds.
 *
 * Assets live in /assets/pregnancy-growth-weeks/week-01.webp ... week-40.webp
 */
export const PREGNANCY_GROWTH_IMAGES: Record<number, number> = {
  1: require('../assets/pregnancy-growth-weeks/week-01.webp'),
  2: require('../assets/pregnancy-growth-weeks/week-02.webp'),
  3: require('../assets/pregnancy-growth-weeks/week-03.webp'),
  4: require('../assets/pregnancy-growth-weeks/week-04.webp'),
  5: require('../assets/pregnancy-growth-weeks/week-05.webp'),
  6: require('../assets/pregnancy-growth-weeks/week-06.webp'),
  7: require('../assets/pregnancy-growth-weeks/week-07.webp'),
  8: require('../assets/pregnancy-growth-weeks/week-08.webp'),
  9: require('../assets/pregnancy-growth-weeks/week-09.webp'),
  10: require('../assets/pregnancy-growth-weeks/week-10.webp'),
  11: require('../assets/pregnancy-growth-weeks/week-11.webp'),
  12: require('../assets/pregnancy-growth-weeks/week-12.webp'),
  13: require('../assets/pregnancy-growth-weeks/week-13.webp'),
  14: require('../assets/pregnancy-growth-weeks/week-14.webp'),
  15: require('../assets/pregnancy-growth-weeks/week-15.webp'),
  16: require('../assets/pregnancy-growth-weeks/week-16.webp'),
  17: require('../assets/pregnancy-growth-weeks/week-17.webp'),
  18: require('../assets/pregnancy-growth-weeks/week-18.webp'),
  19: require('../assets/pregnancy-growth-weeks/week-19.webp'),
  20: require('../assets/pregnancy-growth-weeks/week-20.webp'),
  21: require('../assets/pregnancy-growth-weeks/week-21.webp'),
  22: require('../assets/pregnancy-growth-weeks/week-22.webp'),
  23: require('../assets/pregnancy-growth-weeks/week-23.webp'),
  24: require('../assets/pregnancy-growth-weeks/week-24.webp'),
  25: require('../assets/pregnancy-growth-weeks/week-25.webp'),
  26: require('../assets/pregnancy-growth-weeks/week-26.webp'),
  27: require('../assets/pregnancy-growth-weeks/week-27.webp'),
  28: require('../assets/pregnancy-growth-weeks/week-28.webp'),
  29: require('../assets/pregnancy-growth-weeks/week-29.webp'),
  30: require('../assets/pregnancy-growth-weeks/week-30.webp'),
  31: require('../assets/pregnancy-growth-weeks/week-31.webp'),
  32: require('../assets/pregnancy-growth-weeks/week-32.webp'),
  33: require('../assets/pregnancy-growth-weeks/week-33.webp'),
  34: require('../assets/pregnancy-growth-weeks/week-34.webp'),
  35: require('../assets/pregnancy-growth-weeks/week-35.webp'),
  36: require('../assets/pregnancy-growth-weeks/week-36.webp'),
  37: require('../assets/pregnancy-growth-weeks/week-37.webp'),
  38: require('../assets/pregnancy-growth-weeks/week-38.webp'),
  39: require('../assets/pregnancy-growth-weeks/week-39.webp'),
  40: require('../assets/pregnancy-growth-weeks/week-40.webp'),
};

/** Total number of pregnancy weeks tracked. */
export const PREGNANCY_WEEK_COUNT = 40;

/** Returns the local growth illustration asset for a given pregnancy week (1-40). */
export const getPregnancyGrowthImage = (week: number) => {
  const clampedWeek = Math.min(PREGNANCY_WEEK_COUNT, Math.max(1, Math.round(week)));
  return PREGNANCY_GROWTH_IMAGES[clampedWeek];
};
