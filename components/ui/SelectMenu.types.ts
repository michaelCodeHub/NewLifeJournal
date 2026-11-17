import type { Option } from './Choice';

/**
 * Props shared by every platform's SelectMenu (SelectMenu.tsx = web, .ios.tsx = SwiftUI
 * Menu, .android.tsx = Material 3 DropdownMenu). Public kit API — keep all three in sync.
 */
export interface SelectMenuProps<T extends string> {
  /** Field label shown above the trigger. */
  label?: string;
  optional?: boolean;
  /** Sheet title when the list falls back to a sheet; also names the native menu for screen readers. */
  title: string;
  options: Option<T>[];
  /** The selected option (checkmark / selected highlight). */
  value?: T;
  /** Shown in the trigger when nothing is selected. */
  placeholder?: string;
  /** Called for every option tap, including the already-selected one (same as OptionSheet). */
  onSelect: (v: T) => void;
}

/** Longest list that is shown as a native menu. */
export const NATIVE_MENU_MAX = 7;

/**
 * The rule: a native menu only for short, simple lists (≤ 7 options, text or text + icon).
 * Longer lists or rich options (descriptions) keep the sheet. Search isn't supported by
 * either, so it never applies here.
 */
export function canUseNativeMenu(options: readonly { value: string; label: string; description?: string }[]): boolean {
  return options.length > 0 && options.length <= NATIVE_MENU_MAX && options.every((o) => !o.description);
}

/** The trigger text: the selected option's label, else the placeholder. */
export function selectedLabel<T extends string>(options: readonly { value: T; label: string }[], value?: T) {
  return options.find((o) => o.value === value)?.label;
}
