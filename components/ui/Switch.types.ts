/**
 * Props shared by every platform's kit Switch (Switch.tsx = web, Switch.ios.tsx =
 * SwiftUI, Switch.android.tsx = Jetpack Compose). Keep all three in sync.
 */
export interface SwitchProps {
  value: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  /** What screen readers announce. Pass the row title the switch controls. */
  accessibilityLabel?: string;
  testID?: string;
}
