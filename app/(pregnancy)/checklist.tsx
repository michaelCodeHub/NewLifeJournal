import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import { Theme, useThemedStyles, useTheme, GUTTER, SPACE } from '../../context/ThemeContext';
import {
  Button,
  Card,
  Chip,
  ConfirmSheet,
  EmptyState,
  FieldLabel,
  HeaderAction,
  Screen,
  ScreenState,
  Sheet,
  Text,
  TextField,
  useToast,
} from '../../components/ui';
import { AnimatedProgress } from '../../components/prep/AnimatedProgress';
import { CategoryHeader, ChecklistRow } from '../../components/prep/ChecklistRow';
import { haptics } from '../../lib/haptics';
import {
  ChecklistItem,
  CHECKLIST_CATEGORIES,
  initializeChecklist,
  subscribeToChecklist,
  toggleChecklistItem,
  addCustomChecklistItem,
  deleteChecklistItem,
} from '../../services/firebase/checklistService';

type Category = (typeof CHECKLIST_CATEGORIES)[number];
type Filter = 'All' | Category;

const CATEGORY_ICON: Record<Category, IconName> = {
  Nursery: 'bed-outline',
  Clothing: 'shirt-outline',
  Feeding: 'nutrition-outline',
  'Health & Safety': 'medkit-outline',
  Travel: 'car-outline',
  'Hospital Bag': 'bag-handle-outline',
};

const iconFor = (cat: string) => CATEGORY_ICON[cat as Category] ?? 'list-outline';

interface Section {
  title: string;
  data: ChecklistItem[];
  done: number;
}

const TITLE = 'Baby checklist';

export default function ChecklistScreen() {
  const { user } = useAuth();
  const { pregnancy } = usePregnancy();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const uid = user?.uid;
  const pid = pregnancy?.id;

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [initFailed, setInitFailed] = useState(false);
  const initAttempted = useRef<string | null>(null);

  // Optimistic check state: id -> checked, shown until the snapshot agrees.
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const toggleSeq = useRef<Record<string, number>>({});

  const [filter, setFilter] = useState<Filter>('All');

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<string>(CHECKLIST_CATEGORIES[0]);
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [toDelete, setToDelete] = useState<ChecklistItem | null>(null);

  // Subscribe to checklist items
  useEffect(() => {
    if (!uid || !pid) {
      setLoading(false);
      return;
    }
    const unsubscribe = subscribeToChecklist(uid, pid, (data) => {
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid, pid]);

  // Seed the default items the first time this pregnancy opens the checklist (once per pregnancy).
  useEffect(() => {
    if (!uid || !pid || loading || initializing || initFailed) return;
    if (items.length > 0 || initAttempted.current === pid) return;
    initAttempted.current = pid;
    setInitializing(true);
    initializeChecklist(uid, pid)
      .catch((err: any) => {
        console.error('Error initializing checklist:', err);
        setInitFailed(true);
        toast.show('Could not set up your checklist', 'error');
      })
      .finally(() => setInitializing(false));
  }, [uid, pid, loading, initializing, initFailed, items.length, toast]);

  // Drop optimistic overrides once the snapshot has caught up.
  useEffect(() => {
    setOverrides((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      let changed = false;
      const next: Record<string, boolean> = {};
      for (const id of ids) {
        const live = items.find((i) => i.id === id);
        if (!live || live.checked === prev[id]) changed = true;
        else next[id] = prev[id];
      }
      return changed ? next : prev;
    });
  }, [items]);

  const displayed = useMemo(
    () => items.map((i) => (i.id in overrides && overrides[i.id] !== i.checked ? { ...i, checked: overrides[i.id] } : i)),
    [items, overrides],
  );

  const totalItems = displayed.length;
  const checkedItems = useMemo(() => displayed.filter((i) => i.checked).length, [displayed]);
  const overallProgress = totalItems > 0 ? checkedItems / totalItems : 0;

  const sections = useMemo<Section[]>(() => {
    const cats = filter === 'All' ? CHECKLIST_CATEGORIES : [filter];
    return cats.map((cat) => {
      const data = displayed.filter((i) => i.category === cat);
      return { title: cat, data, done: data.filter((i) => i.checked).length };
    });
  }, [displayed, filter]);

  const handleToggle = useCallback(
    (item: ChecklistItem) => {
      if (!uid || !pid) return;
      const next = !item.checked;
      if (next) haptics.medium();
      else haptics.selection();

      const seq = (toggleSeq.current[item.id] ?? 0) + 1;
      toggleSeq.current[item.id] = seq;
      setOverrides((prev) => ({ ...prev, [item.id]: next }));

      const clear = () =>
        setOverrides((prev) => {
          if (!(item.id in prev)) return prev;
          const { [item.id]: _drop, ...rest } = prev;
          return rest;
        });

      toggleChecklistItem(uid, pid, item.id, next)
        .then(() => {
          // The snapshot already reflects the write; stop overriding it.
          if (toggleSeq.current[item.id] === seq) clear();
        })
        .catch((err: any) => {
          console.error('Error toggling item:', err);
          // Only revert if no newer toggle of this item is in flight.
          if (toggleSeq.current[item.id] !== seq) return;
          clear(); // falls back to the server value (Firestore rolls back the local write)
          toast.show('Could not update item', 'error');
        });
    },
    [uid, pid, toast],
  );

  const handleDelete = useCallback((item: ChecklistItem) => setToDelete(item), []);

  const openAdd = useCallback(() => {
    setNewCategory(filter === 'All' ? CHECKLIST_CATEGORIES[0] : filter);
    setAddOpen(true);
  }, [filter]);

  const closeAdd = useCallback(() => {
    setAddOpen(false);
    setNewName('');
    setNewCategory(CHECKLIST_CATEGORIES[0]);
    setNameError(undefined);
  }, []);

  const handleAddItem = useCallback(async () => {
    if (!uid || !pid) return;
    const name = newName.trim();
    if (!name) {
      setNameError('Enter an item name');
      return;
    }
    setSaving(true);
    try {
      await addCustomChecklistItem(uid, pid, name, newCategory);
      toast.show(`Added to ${newCategory}`);
      closeAdd();
    } catch (err: any) {
      console.error('Error adding item:', err);
      toast.show('Could not add item', 'error');
    } finally {
      setSaving(false);
    }
  }, [uid, pid, newName, newCategory, toast, closeAdd]);

  const retryInit = useCallback(() => {
    initAttempted.current = null;
    setInitFailed(false);
  }, []);

  const renderItem = useCallback(
    ({ item, index, section }: { item: ChecklistItem; index: number; section: Section }) => (
      <ChecklistRow
        item={item}
        first={index === 0}
        last={index === section.data.length - 1}
        onToggle={handleToggle}
        onDelete={handleDelete}
      />
    ),
    [handleToggle, handleDelete],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: Section }) => (
      <CategoryHeader title={section.title} icon={iconFor(section.title)} done={section.done} total={section.data.length} />
    ),
    [],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: Section }) =>
      section.data.length === 0 ? (
        <Card>
          <Text variant="footnote" color="textMuted">
            No items in this category yet.
          </Text>
        </Card>
      ) : null,
    [],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <Card style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="overline" color="textMuted">
                Overall progress
              </Text>
              <Text variant="title2" tabular>
                {checkedItems} of {totalItems} packed
              </Text>
            </View>
            <Text variant="title2" color="primaryDark" tabular>
              {Math.round(overallProgress * 100)}%
            </Text>
          </View>
          <AnimatedProgress value={overallProgress} height={8} />
          <Text variant="footnote" color="textSecondary">
            {totalItems > 0 && checkedItems === totalItems
              ? "Everything's ready for baby."
              : `${totalItems - checkedItems} still to get. Tap an item to check it off.`}
          </Text>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          <Chip label="All" selected={filter === 'All'} onPress={() => setFilter('All')} />
          {CHECKLIST_CATEGORIES.map((cat) => (
            <Chip key={cat} label={cat} icon={CATEGORY_ICON[cat]} selected={filter === cat} onPress={() => setFilter(cat)} />
          ))}
        </ScrollView>
      </View>
    ),
    [styles, checkedItems, totalItems, overallProgress, filter],
  );

  const addButton = <HeaderAction name="add" onPress={openAdd} accessibilityLabel="Add item" />;

  if (!user || !pregnancy) {
    return (
      <Screen header={{ variant: 'bar', title: TITLE }} scroll={false}>
        <ScreenState
          icon="leaf-outline"
          title="No active pregnancy"
          body="Create a pregnancy profile to use the checklist."
        />
      </Screen>
    );
  }

  if (loading || initializing || (items.length === 0 && !initFailed)) {
    return (
      <Screen header={{ variant: 'bar', title: TITLE }} scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.textMuted} />
          <Text variant="footnote" color="textMuted">
            {initializing ? 'Setting up your checklist…' : 'Loading…'}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={{
        variant: 'bar',
        title: TITLE,
        right: addButton,
      }}
      scroll={false}
    >
      {items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Card>
            <EmptyState
              icon="list-outline"
              title="Checklist unavailable"
              body="We couldn't set up your default checklist. Check your connection and try again."
              action={<Button title="Try again" icon="refresh" onPress={retryInit} />}
            />
          </Card>
        </View>
      ) : (
        <SectionList<ChecklistItem, Section>
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          renderSectionFooter={renderSectionFooter}
          ListHeaderComponent={listHeader}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + SPACE.xxxl }]}
        />
      )}

      <Sheet
        visible={addOpen}
        onClose={closeAdd}
        title="Add item"
        subtitle="Add something of your own to the checklist"
        footer={<Button title="Add to checklist" size="lg" fullWidth loading={saving} onPress={handleAddItem} />}
      >
        <TextField
          label="Item name"
          placeholder="e.g. Baby swing"
          value={newName}
          onChangeText={(t) => {
            setNewName(t);
            if (nameError) setNameError(undefined);
          }}
          maxLength={80}
          returnKeyType="done"
          onSubmitEditing={handleAddItem}
          error={nameError}
          autoFocus
        />
        <View style={{ gap: SPACE.sm }}>
          <FieldLabel label="Category" />
          <View style={styles.chipsWrap}>
            {CHECKLIST_CATEGORIES.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                icon={CATEGORY_ICON[cat]}
                selected={newCategory === cat}
                onPress={() => setNewCategory(cat)}
              />
            ))}
          </View>
        </View>
      </Sheet>

      <ConfirmSheet
        visible={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Remove this item?"
        body={toDelete ? `"${toDelete.name}" will be removed from your checklist.` : undefined}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!toDelete || !uid || !pid) return;
          try {
            await deleteChecklistItem(uid, pid, toDelete.id);
            toast.show('Item removed');
          } catch (err: any) {
            console.error('Error deleting item:', err);
            toast.show('Could not remove item', 'error');
          }
        }}
      />
    </Screen>
  );
}

const makeStyles = (_: Theme) =>
  StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACE.md },
    emptyWrap: { paddingHorizontal: GUTTER, paddingTop: SPACE.lg },
    listContent: { paddingHorizontal: GUTTER, paddingTop: SPACE.lg },
    listHeader: { gap: SPACE.lg },
    progressCard: { gap: SPACE.md },
    progressTop: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACE.md },
    chipScroll: { marginHorizontal: -GUTTER, flexGrow: 0 },
    chipRow: { paddingHorizontal: GUTTER, gap: SPACE.sm },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  });
