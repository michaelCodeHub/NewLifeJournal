/**
 * Props shared by every platform's DateTimeField (DateTimeField.tsx = web,
 * .ios.tsx = SwiftUI, .android.tsx = Material 3). Public kit API — keep all three in sync.
 */
export interface DateTimeFieldProps {
  label?: string;
  /** An exact instant (the time of day is kept). */
  value: Date;
  onChange: (d: Date) => void;
  /** Usually `new Date()`: you can't log something in the future. Clamps to the exact instant. */
  maximumDate?: Date;
  minimumDate?: Date;
}
