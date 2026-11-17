/**
 * Props shared by every platform's kit SegmentedControl (SegmentedControl.tsx = web,
 * .ios.tsx = SwiftUI segmented Picker, .android.tsx = Material 3 segmented buttons).
 * This is the kit's public API — keep all three in sync and don't change it lightly.
 */
export interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}

/** Index of the selected option; falls back to the first one like the original control. */
export function selectedIndex<T extends string>(options: { value: T }[], value: T): number {
  return Math.max(0, options.findIndex((o) => o.value === value));
}
