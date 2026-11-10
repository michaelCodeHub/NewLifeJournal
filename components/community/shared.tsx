import React from 'react';
import { Image } from 'expo-image';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../ui';

/** "now", "5m", "3h", "2d", then a short date. Tolerates pending/missing timestamps. */
export function timeAgo(ts: any): string {
  if (!ts) return 'now';
  const date: Date = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return '';
  const diff = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diff < 45) return 'now';
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Kit Avatar (initials) unless the person has a profile photo. */
export function PersonAvatar({ photo, name, size = 36 }: { photo?: string | null; name?: string | null; size?: number }) {
  const { colors } = useTheme();
  if (photo) {
    return (
      <Image
        source={{ uri: photo }}
        contentFit="cover"
        transition={200}
        accessibilityIgnoresInvertColors
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceTertiary }}
      />
    );
  }
  return <Avatar name={name} size={size} />;
}
