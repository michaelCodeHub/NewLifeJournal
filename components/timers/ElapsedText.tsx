import React, { memo, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { Text, TextProps } from '../ui';
import { formatClock } from './format';

export interface ElapsedTextProps extends Omit<TextProps, 'children'> {
  /** Epoch millis the timer started at. */
  startedAt: number;
  /** Seconds -> label. Pass a module-level function so memo holds. */
  format?: (seconds: number) => string;
}

/**
 * Self-ticking elapsed time label. Always derived from `Date.now() - startedAt`,
 * so it is correct after the app was backgrounded, and only this tiny component
 * re-renders each second (never the whole screen).
 */
export const ElapsedText = memo(function ElapsedText({
  startedAt,
  format = formatClock,
  variant = 'number',
  ...rest
}: ElapsedTextProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      // Re-align to the next whole second of elapsed time so the digits flip crisply.
      const ms = 1000 - (Math.max(0, t - startedAt) % 1000);
      timer = setTimeout(tick, ms + 5);
    };
    tick();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (timer) clearTimeout(timer);
        tick();
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [startedAt]);

  return (
    <Text variant={variant} tabular {...rest}>
      {format(Math.max(0, Math.floor((now - startedAt) / 1000)))}
    </Text>
  );
});
