import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Skeleton } from '../ui';
import { SPACE, Theme, useThemedStyles } from '../../context/ThemeContext';

/** Placeholder rows shown while a session history subscription loads. */
export function HistorySkeleton({ rows = 3 }: { rows?: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card padded={false}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.row, i < rows - 1 && styles.divider]}>
          <Skeleton width={32} height={32} />
          <View style={{ flex: 1, gap: SPACE.xs }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="35%" height={12} />
          </View>
        </View>
      ))}
    </Card>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, padding: SPACE.lg },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth * 2, borderBottomColor: colors.border },
  });
