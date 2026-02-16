import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Alert, FlatList, Animated } from 'react-native';
import { useState, useRef, useCallback, useEffect } from 'react';
import { usePregnancy } from '../../context/PregnancyContext';

type FilterType = 'all' | 'visits' | 'symptoms';

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'All Events',
  visits: '🏥 Visits',
  symptoms: '💊 Symptoms',
};

const FILTER_OPTIONS: FilterType[] = ['all', 'visits', 'symptoms'];

export default function TimelineScreen() {
  const { pregnancy, hospitalVisits, symptoms, milestones, loading } = usePregnancy();
  const [showAddOptions, setShowAddOptions] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const scrollViewRef = useRef<ScrollView>(null);
  const weekPickerSlideAnim = useRef(new Animated.Value(500)).current;
  const weekPickerFadeAnim = useRef(new Animated.Value(0)).current;
  const filterPickerSlideAnim = useRef(new Animated.Value(500)).current;
  const filterPickerFadeAnim = useRef(new Animated.Value(0)).current;
  const contentFadeAnim = useRef(new Animated.Value(1)).current;
  const weekRefs = useRef<{ [key: number]: number }>({});
  const pendingScrollWeek = useRef<number | null | undefined>(undefined);

  // After filter change, scroll to the selected week once layout settles
  useEffect(() => {
    if (pendingScrollWeek.current === undefined) return;
    const week = pendingScrollWeek.current;
    pendingScrollWeek.current = undefined;

    // Wait a frame for onLayout to fire with new positions
    requestAnimationFrame(() => {
      if (week === null) {
        scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      } else if (week !== null && weekRefs.current[week] !== undefined) {
        scrollViewRef.current?.scrollTo({ y: weekRefs.current[week], animated: false });
      }
    });
  }, [filterType]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#81bec1" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active pregnancy</Text>
      </View>
    );
  }

  // Combine all events into a single timeline
  const allEvents = [
    ...hospitalVisits.map((visit) => ({
      id: visit.id,
      type: 'visit' as const,
      date: visit.date.toDate(),
      week: visit.week,
      title: visit.type,
      subtitle: visit.notes,
      icon: '🏥',
      color: '#4CAF50',
      time: visit.date.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      fullDate: visit.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    })),
    ...symptoms.map((symptom) => ({
      id: symptom.id,
      type: 'symptom' as const,
      date: symptom.date.toDate(),
      week: symptom.week,
      title: symptom.type.replace('_', ' '),
      subtitle: symptom.notes,
      icon: '💊',
      color: '#FF9800',
      severity: symptom.severity,
      time: symptom.date.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      fullDate: symptom.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    })),
    ...milestones.map((milestone) => ({
      id: milestone.id,
      type: 'milestone' as const,
      date: milestone.date.toDate(),
      week: milestone.week,
      title: milestone.title,
      subtitle: milestone.description,
      icon: '⭐',
      color: '#FFD700',
      time: milestone.date.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      fullDate: milestone.date.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by most recent first

  // Apply filter
  const timelineEvents = allEvents.filter(event => {
    if (filterType === 'all') return true;
    if (filterType === 'visits') return event.type === 'visit';
    if (filterType === 'symptoms') return event.type === 'symptom';
    return true;
  });

  const openWeekPicker = useCallback(() => {
    setShowWeekPicker(true);
    Animated.parallel([
      Animated.timing(weekPickerSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(weekPickerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [weekPickerSlideAnim, weekPickerFadeAnim]);

  const closeWeekPicker = useCallback(() => {
    Animated.parallel([
      Animated.timing(weekPickerSlideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(weekPickerFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowWeekPicker(false));
  }, [weekPickerSlideAnim, weekPickerFadeAnim]);

  const handleWeekSelect = (week: number | null) => {
    setSelectedWeek(week);
    closeWeekPicker();

    if (week === null) {
      // Scroll to top for "All Weeks"
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    } else {
      // Scroll to the week section
      const yOffset = weekRefs.current[week];
      if (yOffset !== undefined && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
      }
    }
  };

  const openFilterPicker = useCallback(() => {
    setShowFilterPicker(true);
    Animated.parallel([
      Animated.timing(filterPickerSlideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(filterPickerFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [filterPickerSlideAnim, filterPickerFadeAnim]);

  const closeFilterPicker = useCallback(() => {
    Animated.parallel([
      Animated.timing(filterPickerSlideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(filterPickerFadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowFilterPicker(false));
  }, [filterPickerSlideAnim, filterPickerFadeAnim]);

  const handleFilterSelect = useCallback((filter: FilterType) => {
    closeFilterPicker();
    if (filter === filterType) return;
    // Queue scroll to selected week after filter changes
    pendingScrollWeek.current = selectedWeek;
    // Fade out, switch filter, fade in
    Animated.timing(contentFadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setFilterType(filter);
      Animated.timing(contentFadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    });
  }, [filterType, selectedWeek, contentFadeAnim, closeFilterPicker]);

  const handleAddOption = (type: 'visit' | 'symptom') => {
    setShowAddOptions(false);
    // Navigate to the respective tab
    // This would require router navigation which we can implement
    Alert.alert('Navigate', `Navigate to add ${type}`);
  };

  // Get unique weeks from events
  const availableWeeks = Array.from(
    new Set([...hospitalVisits, ...symptoms, ...milestones].map(item => item.week))
  ).sort((a, b) => b - a); // Sort descending (most recent first)

  // Group events by week
  const eventsByWeek: { [key: number]: typeof timelineEvents } = {};
  timelineEvents.forEach(event => {
    if (!eventsByWeek[event.week]) {
      eventsByWeek[event.week] = [];
    }
    eventsByWeek[event.week].push(event);
  });

  const sortedWeeks = Object.keys(eventsByWeek)
    .map(Number)
    .sort((a, b) => b - a); // Sort descending

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.pageTitle}>Timeline</Text>
            <Text style={styles.subtitle}>Your pregnancy journey</Text>
          </View>
        </View>
        <View style={styles.headerFilters}>
          <TouchableOpacity
            style={styles.dropdownPill}
            onPress={openFilterPicker}
          >
            <Text style={styles.dropdownPillText}>
              {FILTER_LABELS[filterType]}
            </Text>
            <Text style={styles.dropdownPillArrow}>▼</Text>
          </TouchableOpacity>
          {availableWeeks.length > 0 && (
            <TouchableOpacity
              style={styles.dropdownPill}
              onPress={openWeekPicker}
            >
              <Text style={styles.dropdownPillText}>
                {selectedWeek ? `Week ${selectedWeek}` : 'All Weeks'}
              </Text>
              <Text style={styles.dropdownPillArrow}>▼</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Timeline Events */}
      <Animated.View style={[styles.timeline, { opacity: contentFadeAnim }]}>
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {timelineEvents.length > 0 ? (
          sortedWeeks.map((week) => (
            <View
              key={`week-${week}`}
              onLayout={(event) => {
                weekRefs.current[week] = event.nativeEvent.layout.y;
              }}
            >
              {/* Week Header */}
              <View style={styles.weekHeader}>
                <View style={styles.weekHeaderLine} />
                <Text style={styles.weekHeaderText}>Week {week}</Text>
                <View style={styles.weekHeaderLine} />
              </View>

              {/* Events for this week */}
              {eventsByWeek[week].map((event, index) => (
                <View key={event.id || `event-${index}`} style={styles.eventCardWrapper}>
                  {/* Event card */}
                  <View style={[
                    styles.eventCard,
                    event.type === 'visit' && styles.eventCardVisit,
                    event.type === 'symptom' && styles.eventCardSymptom,
                    event.type === 'milestone' && styles.eventCardMilestone,
                  ]}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventTitleContainer}>
                        <Text style={styles.eventIcon}>{event.icon}</Text>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                      </View>
                    </View>
                    <Text style={styles.eventDate}>{event.fullDate} • {event.time}</Text>
                    {event.subtitle && (
                      <Text style={styles.eventSubtitle} numberOfLines={3}>
                        {event.subtitle}
                      </Text>
                    )}
                    {'severity' in event && (
                      <View style={styles.severityContainer}>
                        <Text style={styles.severityText}>Severity: {event.severity}/5</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))
        ) : (
          <View style={styles.emptyDay}>
            <Text style={styles.emptyDayIcon}>📅</Text>
            <Text style={styles.emptyDayText}>No timeline events yet</Text>
            <Text style={styles.emptyDaySubtext}>
              Tap the + button to add a visit or symptom
            </Text>
          </View>
        )}
      </ScrollView>
      </Animated.View>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddOptions(true)}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add Options Modal */}
      <Modal
        visible={showAddOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddOptions(false)}
        >
          <View style={styles.addOptionsContainer}>
            <TouchableOpacity
              style={[styles.addOptionButton, styles.addOptionVisit]}
              onPress={() => handleAddOption('visit')}
            >
              <Text style={styles.addOptionIcon}>🏥</Text>
              <Text style={styles.addOptionText}>Add Hospital Visit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addOptionButton, styles.addOptionSymptom]}
              onPress={() => handleAddOption('symptom')}
            >
              <Text style={styles.addOptionIcon}>💊</Text>
              <Text style={styles.addOptionText}>Add Symptom</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Filter Picker Modal */}
      {showFilterPicker && (
        <Modal
          visible={showFilterPicker}
          transparent={true}
          animationType="none"
          onRequestClose={closeFilterPicker}
        >
          <View style={styles.pickerOverlay}>
            <Animated.View style={[styles.pickerBackdrop, { opacity: filterPickerFadeAnim }]}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={closeFilterPicker}
              />
            </Animated.View>
            <Animated.View style={[styles.pickerContainer, { transform: [{ translateY: filterPickerSlideAnim }] }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Filter Events</Text>
                <TouchableOpacity onPress={closeFilterPicker}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              {FILTER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.pickerOption}
                  onPress={() => handleFilterSelect(option)}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    option === filterType && styles.pickerOptionSelected
                  ]}>
                    {FILTER_LABELS[option]}
                  </Text>
                  {option === filterType && (
                    <Text style={styles.pickerCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* Week Picker Modal */}
      {showWeekPicker && (
        <Modal
          visible={showWeekPicker}
          transparent={true}
          animationType="none"
          onRequestClose={closeWeekPicker}
        >
          <View style={styles.pickerOverlay}>
            <Animated.View style={[styles.pickerBackdrop, { opacity: weekPickerFadeAnim }]}>
              <TouchableOpacity
                style={StyleSheet.absoluteFill}
                activeOpacity={1}
                onPress={closeWeekPicker}
              />
            </Animated.View>
            <Animated.View style={[styles.pickerContainer, { transform: [{ translateY: weekPickerSlideAnim }] }]}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Select Week</Text>
                <TouchableOpacity onPress={closeWeekPicker}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={[null, ...availableWeeks]} // null represents "All Weeks"
                keyExtractor={(item) => item === null ? 'all' : `week-${item}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => handleWeekSelect(item as number)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      (item === selectedWeek || (item === null && selectedWeek === null)) && styles.pickerOptionSelected
                    ]}>
                      {item === null ? 'All Weeks' : `Week ${item}`}
                    </Text>
                    {(item === selectedWeek || (item === null && selectedWeek === null)) && (
                      <Text style={styles.pickerCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={styles.pickerList}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2F3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2F3',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#E0F2F3',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  headerFilters: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  dropdownPill: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#81bec1',
    marginRight: 5,
  },
  dropdownPillArrow: {
    fontSize: 9,
    color: '#81bec1',
  },
  timeline: {
    flex: 1,
  },
  timelineContent: {
    padding: 20,
    paddingBottom: 100,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  weekHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#81bec1',
    opacity: 0.3,
  },
  weekHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#81bec1',
    paddingHorizontal: 16,
    backgroundColor: '#E0F2F3',
  },
  eventCardWrapper: {
    marginBottom: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventCardVisit: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  eventCardSymptom: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  eventCardMilestone: {
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eventIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
    flex: 1,
  },
  eventMetaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventWeek: {
    fontSize: 12,
    fontWeight: '600',
    color: '#81bec1',
    backgroundColor: '#E0F2F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  eventSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  severityContainer: {
    marginTop: 8,
  },
  severityText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyDayIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyDayText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyDaySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 80,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#81bec1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  addOptionsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  addOptionVisit: {
    backgroundColor: '#E8F5E9',
  },
  addOptionSymptom: {
    backgroundColor: '#FFF3E0',
  },
  addOptionIcon: {
    fontSize: 24,
  },
  addOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: 500,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  pickerDone: {
    fontSize: 16,
    color: '#81bec1',
    fontWeight: '600',
  },
  pickerList: {
    flexGrow: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  pickerOptionSelected: {
    color: '#81bec1',
    fontWeight: '600',
  },
  pickerCheckmark: {
    fontSize: 18,
    color: '#81bec1',
    fontWeight: 'bold',
  },
});
