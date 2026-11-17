/**
 * Props shared by every platform's DateField (DateField.tsx = web, .ios.tsx = SwiftUI,
 * .android.tsx = Material 3). Public kit API — keep all three in sync.
 */
export interface DateFieldProps {
  label?: string;
  /** A local calendar day. onChange always reports the picked day at local noon. */
  value: Date;
  onChange: (d: Date) => void;
  /** Earliest selectable day (compared by local calendar day). */
  minimumDate?: Date;
  /** Latest selectable day (compared by local calendar day). */
  maximumDate?: Date;
  optional?: boolean;
}
