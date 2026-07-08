/**
 * Local baby-growth illustrations — one per pregnancy week (1–40).
 * Minimalist flat-vector icons in the app's teal theme (#81bec1 / #E0F2F3),
 * with transparent backgrounds.
 *
 * Assets live in /assets/pregnancy-growth-weeks/week-01.png ... week-40.png
 */
export const PREGNANCY_GROWTH_IMAGES: Record<number, number> = {
  1: require('../assets/pregnancy-growth-weeks/week-01.png'),
  2: require('../assets/pregnancy-growth-weeks/week-02.png'),
  3: require('../assets/pregnancy-growth-weeks/week-03.png'),
  4: require('../assets/pregnancy-growth-weeks/week-04.png'),
  5: require('../assets/pregnancy-growth-weeks/week-05.png'),
  6: require('../assets/pregnancy-growth-weeks/week-06.png'),
  7: require('../assets/pregnancy-growth-weeks/week-07.png'),
  8: require('../assets/pregnancy-growth-weeks/week-08.png'),
  9: require('../assets/pregnancy-growth-weeks/week-09.png'),
  10: require('../assets/pregnancy-growth-weeks/week-10.png'),
  11: require('../assets/pregnancy-growth-weeks/week-11.png'),
  12: require('../assets/pregnancy-growth-weeks/week-12.png'),
  13: require('../assets/pregnancy-growth-weeks/week-13.png'),
  14: require('../assets/pregnancy-growth-weeks/week-14.png'),
  15: require('../assets/pregnancy-growth-weeks/week-15.png'),
  16: require('../assets/pregnancy-growth-weeks/week-16.png'),
  17: require('../assets/pregnancy-growth-weeks/week-17.png'),
  18: require('../assets/pregnancy-growth-weeks/week-18.png'),
  19: require('../assets/pregnancy-growth-weeks/week-19.png'),
  20: require('../assets/pregnancy-growth-weeks/week-20.png'),
  21: require('../assets/pregnancy-growth-weeks/week-21.png'),
  22: require('../assets/pregnancy-growth-weeks/week-22.png'),
  23: require('../assets/pregnancy-growth-weeks/week-23.png'),
  24: require('../assets/pregnancy-growth-weeks/week-24.png'),
  25: require('../assets/pregnancy-growth-weeks/week-25.png'),
  26: require('../assets/pregnancy-growth-weeks/week-26.png'),
  27: require('../assets/pregnancy-growth-weeks/week-27.png'),
  28: require('../assets/pregnancy-growth-weeks/week-28.png'),
  29: require('../assets/pregnancy-growth-weeks/week-29.png'),
  30: require('../assets/pregnancy-growth-weeks/week-30.png'),
  31: require('../assets/pregnancy-growth-weeks/week-31.png'),
  32: require('../assets/pregnancy-growth-weeks/week-32.png'),
  33: require('../assets/pregnancy-growth-weeks/week-33.png'),
  34: require('../assets/pregnancy-growth-weeks/week-34.png'),
  35: require('../assets/pregnancy-growth-weeks/week-35.png'),
  36: require('../assets/pregnancy-growth-weeks/week-36.png'),
  37: require('../assets/pregnancy-growth-weeks/week-37.png'),
  38: require('../assets/pregnancy-growth-weeks/week-38.png'),
  39: require('../assets/pregnancy-growth-weeks/week-39.png'),
  40: require('../assets/pregnancy-growth-weeks/week-40.png'),
};

/** Total number of pregnancy weeks tracked. */
export const PREGNANCY_WEEK_COUNT = 40;

/** Returns the local growth illustration asset for a given pregnancy week (1-40). */
export const getPregnancyGrowthImage = (week: number) => {
  const clampedWeek = Math.min(PREGNANCY_WEEK_COUNT, Math.max(1, Math.round(week)));
  return PREGNANCY_GROWTH_IMAGES[clampedWeek];
};
