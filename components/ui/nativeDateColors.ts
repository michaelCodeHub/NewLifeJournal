import type { ThemeColors } from '../../context/ThemeContext';

/**
 * Material 3 date / time picker colours (Android, @expo/ui Jetpack Compose) from theme
 * tokens. Selected states are `primaryDark` with `onPrimary` text (white on the brand
 * `primary` teal is only 3:1).
 */
export const datePickerColors = (c: ThemeColors) => ({
  containerColor: c.surface,
  titleContentColor: c.textSecondary,
  headlineContentColor: c.textPrimary,
  weekdayContentColor: c.textSecondary,
  subheadContentColor: c.textSecondary,
  navigationContentColor: c.textSecondary,
  yearContentColor: c.textPrimary,
  disabledYearContentColor: c.textMuted,
  currentYearContentColor: c.primaryDark,
  selectedYearContentColor: c.onPrimary,
  selectedYearContainerColor: c.primaryDark,
  dayContentColor: c.textPrimary,
  disabledDayContentColor: c.textMuted,
  selectedDayContentColor: c.onPrimary,
  selectedDayContainerColor: c.primaryDark,
  todayContentColor: c.primaryDark,
  todayDateBorderColor: c.primaryDark,
  dividerColor: c.border,
});

export const timePickerColors = (c: ThemeColors) => ({
  containerColor: c.surface,
  clockDialColor: c.surfaceSecondary,
  clockDialContentColor: c.textPrimary,
  clockDialSelectedContentColor: c.onPrimary,
  selectorColor: c.primaryDark,
  periodSelectorBorderColor: c.borderStrong,
  periodSelectorContainerColor: c.surface,
  periodSelectorContentColor: c.textSecondary,
  periodSelectorSelectedContainerColor: c.primaryDark,
  periodSelectorSelectedContentColor: c.onPrimary,
  timeSelectorContainerColor: c.surfaceSecondary,
  timeSelectorContentColor: c.textPrimary,
  timeSelectorSelectedContainerColor: c.primaryDark,
  timeSelectorSelectedContentColor: c.onPrimary,
});
