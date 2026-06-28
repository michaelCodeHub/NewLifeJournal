import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePregnancy } from '../../context/PregnancyContext';
import {
  ChecklistItem,
  CHECKLIST_CATEGORIES,
  initializeChecklist,
  subscribeToChecklist,
  toggleChecklistItem,
  addCustomChecklistItem,
  deleteChecklistItem,
} from '../../services/firebase/checklistService';

const PRIMARY = '#81bec1';
const BACKGROUND = '#E0F2F3';
const GREEN = '#4CAF50';

export default function ChecklistScreen() {
  const { user } = useAuth();
  const { pregnancy } = usePregnancy();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>(CHECKLIST_CATEGORIES[0]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Subscribe to checklist items
  useEffect(() => {
    if (!user || !pregnancy) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToChecklist(user.uid, pregnancy.id, (data) => {
      setItems(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, pregnancy]);

  // Initialize default items on first load
  useEffect(() => {
    if (!user || !pregnancy || loading || initializing) return;
    if (items.length === 0) {
      setInitializing(true);
      initializeChecklist(user.uid, pregnancy.id)
        .catch((err: any) => {
          console.error('Error initializing checklist:', err);
          Alert.alert('Error', 'Failed to initialize checklist.');
        })
        .finally(() => setInitializing(false));
    }
  }, [user, pregnancy, loading, items.length, initializing]);

  // Grouping logic
  const itemsByCategory = CHECKLIST_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const totalItems = items.length;
  const checkedItems = items.filter(i => i.checked).length;
  const overallProgress = totalItems > 0 ? checkedItems / totalItems : 0;

  const handleToggle = useCallback(async (item: ChecklistItem) => {
    if (!user || !pregnancy) return;
    try {
      await toggleChecklistItem(user.uid, pregnancy.id, item.id, !item.checked);
    } catch (err: any) {
      console.error('Error toggling item:', err);
      Alert.alert('Error', 'Failed to update item.');
    }
  }, [user, pregnancy]);

  const handleDelete = useCallback((item: ChecklistItem) => {
    if (!user || !pregnancy) return;
    Alert.alert('Delete Item', `Remove "${item.name}" from your checklist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChecklistItem(user.uid, pregnancy.id, item.id);
          } catch (err: any) {
            console.error('Error deleting item:', err);
            Alert.alert('Error', 'Failed to delete item.');
          }
        },
      },
    ]);
  }, [user, pregnancy]);

  const handleAddItem = useCallback(async () => {
    if (!user || !pregnancy) return;
    if (!newItemName.trim()) {
      Alert.alert('Required', 'Please enter an item name.');
      return;
    }
    setSaving(true);
    try {
      await addCustomChecklistItem(user.uid, pregnancy.id, newItemName.trim(), newItemCategory);
      setNewItemName('');
      setNewItemCategory(CHECKLIST_CATEGORIES[0]);
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Error adding item:', err);
      Alert.alert('Error', 'Failed to add item.');
    } finally {
      setSaving(false);
    }
  }, [user, pregnancy, newItemName, newItemCategory]);

  const handleCloseModal = useCallback(() => {
    setShowAddModal(false);
    setNewItemName('');
    setNewItemCategory(CHECKLIST_CATEGORIES[0]);
    setShowCategoryPicker(false);
  }, []);

  if (!user || !pregnancy) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Baby Checklist</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No active pregnancy</Text>
          <Text style={styles.emptyStateSubText}>Create a pregnancy profile to use the checklist.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || initializing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Baby Checklist</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>
            {initializing ? 'Setting up your checklist...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Baby Checklist</Text>
        <Text style={styles.headerSubtitle}>
          {checkedItems} of {totalItems} items ready
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overall Progress */}
        <View style={styles.overallProgressCard}>
          <View style={styles.overallProgressHeader}>
            <Text style={styles.overallProgressLabel}>Overall Progress</Text>
            <Text style={styles.overallProgressPct}>{Math.round(overallProgress * 100)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${overallProgress * 100}%` }]} />
          </View>
        </View>

        {/* Category Sections */}
        {CHECKLIST_CATEGORIES.map(cat => {
          const catItems = itemsByCategory[cat] || [];
          const catChecked = catItems.filter(i => i.checked).length;
          const catTotal = catItems.length;
          const catProgress = catTotal > 0 ? catChecked / catTotal : 0;

          return (
            <View key={cat} style={styles.categorySection}>
              {/* Category Header */}
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>
                  {cat}{' '}
                  <Text style={styles.categoryCount}>
                    ({catChecked}/{catTotal})
                  </Text>
                </Text>
              </View>
              {/* Category Progress Bar */}
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${catProgress * 100}%` }]} />
              </View>

              {/* Items */}
              {catItems.length === 0 ? (
                <Text style={styles.emptyCategory}>No items in this category yet.</Text>
              ) : (
                catItems.map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemRow}
                    onPress={() => handleToggle(item)}
                    onLongPress={() => item.isCustom && handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox */}
                    <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                      {item.checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    {/* Item name */}
                    <View style={styles.itemTextContainer}>
                      <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                        {item.name}
                      </Text>
                      {item.isCustom && (
                        <Text style={styles.customBadge}>custom</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          );
        })}

        {/* Bottom padding for FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+ Add Item</Text>
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={handleCloseModal} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Item</Text>

            {/* Item Name Input */}
            <Text style={styles.inputLabel}>Item Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Baby swing"
              placeholderTextColor="#aaa"
              value={newItemName}
              onChangeText={setNewItemName}
              maxLength={80}
              returnKeyType="done"
            />

            {/* Category Picker */}
            <Text style={styles.inputLabel}>Category</Text>
            <TouchableOpacity
              style={styles.categoryPickerBtn}
              onPress={() => setShowCategoryPicker(v => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.categoryPickerBtnText}>{newItemCategory}</Text>
              <Text style={styles.categoryPickerArrow}>{showCategoryPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showCategoryPicker && (
              <View style={styles.categoryDropdown}>
                <FlatList
                  data={CHECKLIST_CATEGORIES as unknown as string[]}
                  keyExtractor={item => item}
                  scrollEnabled={false}
                  renderItem={({ item: cat }) => (
                    <TouchableOpacity
                      style={[
                        styles.categoryOption,
                        cat === newItemCategory && styles.categoryOptionSelected,
                      ]}
                      onPress={() => {
                        setNewItemCategory(cat);
                        setShowCategoryPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          cat === newItemCategory && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                      {cat === newItemCategory && (
                        <Text style={styles.categoryOptionCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCloseModal}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddItem}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  header: {
    backgroundColor: PRIMARY,
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Overall progress card
  overallProgressCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overallProgressLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  overallProgressPct: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY,
  },

  // Progress bar
  progressBarBg: {
    height: 8,
    backgroundColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    backgroundColor: PRIMARY,
    borderRadius: 4,
  },

  // Category section
  categorySection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  categoryHeader: {
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '500',
    color: PRIMARY,
  },
  emptyCategory: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Item rows
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  itemTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  customBadge: {
    fontSize: 10,
    color: PRIMARY,
    backgroundColor: '#E0F2F3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    fontWeight: '600',
    overflow: 'hidden',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  categoryPickerBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
  },
  categoryPickerBtnText: {
    fontSize: 15,
    color: '#333',
  },
  categoryPickerArrow: {
    fontSize: 12,
    color: '#888',
  },
  categoryDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryOptionSelected: {
    backgroundColor: '#E0F2F3',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#333',
  },
  categoryOptionTextSelected: {
    fontWeight: '700',
    color: PRIMARY,
  },
  categoryOptionCheck: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: '700',
  },

  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
