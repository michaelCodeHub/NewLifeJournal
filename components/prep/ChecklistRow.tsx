import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../ui/Icon';
import { Theme, useThemedStyles, RADIUS, SPACE } from '../../context/ThemeContext';
import { IconButton, IconTile, Pill, PressableScale, Text } from '../ui';
import { AnimatedCheckbox } from './AnimatedCheckbox';
import type { ChecklistItem } from '../../services/firebase/checklistService';

/* -------------------------------------------------------- ChecklistRow */

interface ChecklistRowProps {
  item: ChecklistItem;
  /** First / last row of its category: draws the rounded card edges. */
  first: boolean;
  last: boolean;
  onToggle: (item: ChecklistItem) => void;
  onDelete: (item: ChecklistItem) => void;
}

/**
 * One checklist item. Rows of a category stack into what looks like a single
 * `Card padded={false}`, but each row is its own list cell so the list stays virtualized.
 */
export const ChecklistRow = memo(function ChecklistRow({ item, first, last, onToggle, onDelete }: ChecklistRowProps) {
  const styles = useThemedStyles(makeStyles);
  const checked = item.checked;
  return (
    <View style={[styles.shell, first && styles.first, last && styles.last]}>
      <View style={[styles.inner, !last && styles.divider]}>
        <PressableScale
          haptic={false}
          scaleTo={0.985}
          onPress={() => onToggle(item)}
          onLongPress={item.isCustom ? () => onDelete(item) : undefined}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={item.name}
          style={styles.row}
        >
          <AnimatedCheckbox checked={checked} />
          <Text
            variant="body"
            color={checked ? 'textMuted' : 'textPrimary'}
            style={[styles.name, checked && styles.struck]}
            numberOfLines={2}
          >
            {item.name}
          </Text>
        </PressableScale>
        {/* Beside the row, not inside it: no nested buttons on web. */}
        {item.isCustom ? (
          <View style={styles.actions}>
            <Pill label="Custom" tone="teal" />
            <IconButton
              name="trash-outline"
              variant="plain"
              size={30}
              color="textMuted"
              onPress={() => onDelete(item)}
              accessibilityLabel={`Delete ${item.name}`}
            />
          </View>
        ) : null}
      </View>
    </View>
  );
});

/* ------------------------------------------------------ CategoryHeader */

export const CategoryHeader = memo(function CategoryHeader({
  title,
  icon,
  done,
  total,
}: {
  title: string;
  icon: IconName;
  done: number;
  total: number;
}) {
  const styles = useThemedStyles(makeStyles);
  const complete = total > 0 && done === total;
  return (
    <View style={styles.header}>
      <IconTile name={icon} tone={complete ? 'green' : 'teal'} size={26} />
      <Text variant="overline" color="textSecondary" style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text variant="caption" color={complete ? 'green' : 'textMuted'} tabular>
        {done}/{total}
      </Text>
    </View>
  );
});

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    // A category's rows stack into one soft-filled group (same as Card).
    shell: { backgroundColor: colors.card, paddingLeft: SPACE.lg },
    first: { borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
    last: { borderBottomLeftRadius: RADIUS.lg, borderBottomRightRadius: RADIUS.lg },
    inner: { flexDirection: 'row', alignItems: 'center' },
    row: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      minHeight: 44,
      paddingVertical: 10,
      paddingRight: SPACE.lg,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: SPACE.xs, paddingRight: SPACE.sm },
    divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    name: { flex: 1 },
    struck: { textDecorationLine: 'line-through' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.sm,
      paddingHorizontal: 2,
      paddingTop: SPACE.xxl,
      paddingBottom: SPACE.sm,
    },
    headerTitle: { flex: 1 },
  });
