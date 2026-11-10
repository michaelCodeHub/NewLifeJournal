import React, { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from '../ui';
import { SPACE, Theme, useThemedStyles } from '../../context/ThemeContext';

export interface StatItem {
  label: string;
  /** A string, or a node such as <ElapsedText /> for live values. */
  value: React.ReactNode;
}

/** A card of (usually three) stat columns separated by hairlines, like the home stats row. */
export function StatsCard({ items }: { items: StatItem[] }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Card style={styles.row}>
      {items.map((item, i) => (
        <Fragment key={item.label}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.col}>
            <Text variant="caption" color="textMuted" numberOfLines={1}>
              {item.label}
            </Text>
            {typeof item.value === 'string' || typeof item.value === 'number' ? (
              <Text variant="headline" tabular numberOfLines={1}>
                {item.value}
              </Text>
            ) : (
              item.value
            )}
          </View>
        </Fragment>
      ))}
    </Card>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    col: { flex: 1, gap: 2 },
    divider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch', backgroundColor: colors.border },
  });
