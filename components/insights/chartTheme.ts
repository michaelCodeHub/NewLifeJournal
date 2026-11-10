import { useMemo, type ComponentProps } from 'react';
import type { LineChart } from 'react-native-chart-kit';
import { useTheme, FONT, TYPE, ThemeColors } from '../../context/ThemeContext';

export type ChartConfig = NonNullable<ComponentProps<typeof LineChart>['chartConfig']>;

/**
 * Apply an opacity to a theme color token. Tokens are `#RRGGBB` (or `rgb(a)`),
 * so chart-kit's `(opacity) => color` callbacks can stay on the theme palette.
 */
export function withAlpha(color: string, opacity = 1): string {
  const a = Math.max(0, Math.min(1, opacity));
  const hex = color.trim().replace('#', '');
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const [r, g, b] = hex.split('').map((c) => parseInt(c + c, 16));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  const rgb = color.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((p) => p.trim());
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return color;
}

/** A dataset color callback bound to a theme token. */
export const lineColor = (color: string) => (opacity = 1) => withAlpha(color, opacity);

/**
 * react-native-chart-kit config built from theme tokens: transparent background
 * (the Card is the surface), faint solid grid, muted Inter labels, small dots
 * ringed in the surface color.
 */
export function useChartConfig(line: keyof ThemeColors, decimalPlaces = 1): ChartConfig {
  const { colors } = useTheme();
  return useMemo<ChartConfig>(
    () => ({
      backgroundColor: colors.surface,
      backgroundGradientFrom: colors.surface,
      backgroundGradientFromOpacity: 0,
      backgroundGradientTo: colors.surface,
      backgroundGradientToOpacity: 0,
      decimalPlaces,
      color: lineColor(colors[line]),
      labelColor: lineColor(colors.textMuted),
      strokeWidth: 2,
      fillShadowGradientFrom: colors[line],
      fillShadowGradientFromOpacity: 0.14,
      fillShadowGradientTo: colors[line],
      fillShadowGradientToOpacity: 0,
      propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '', strokeWidth: 1 },
      propsForLabels: { fontFamily: FONT.medium, fontSize: TYPE.caption.fontSize },
      propsForDots: { r: '3.5', strokeWidth: '2', stroke: colors.surface },
    }),
    [colors, line, decimalPlaces]
  );
}

/** Keep at most `max` x-axis labels so weeks never collide. */
export function thinLabels(labels: string[], max = 6): string[] {
  if (labels.length <= max) return labels;
  const step = Math.ceil(labels.length / max);
  return labels.map((l, i) => (i % step === 0 || i === labels.length - 1 ? l : ''));
}
