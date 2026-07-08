import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getWeekInfo, WeekInfo } from '../services/firebase/weekInfoService';
import {
  PREGNANCY_WEEK_COUNT,
  getPregnancyGrowthImage,
} from '../constants/pregnancyGrowthImages';

interface GrowthGalleryModalProps {
  visible: boolean;
  /** The pregnancy's current week — used to pick the initial week. */
  currentWeek: number;
  onClose: () => void;
}

const getTrimesterLabel = (week: number) => {
  if (week <= 13) return '1st Trimester';
  if (week <= 26) return '2nd Trimester';
  return '3rd Trimester';
};

export default function GrowthGalleryModal({ visible, currentWeek, onClose }: GrowthGalleryModalProps) {
  const { colors } = useTheme();
  const [week, setWeek] = useState(1);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const pillScrollRef = useRef<ScrollView>(null);

  const loadInfo = useCallback(async (w: number) => {
    setLoadingInfo(true);
    setWeekInfo(null);
    const info = await getWeekInfo(w);
    setWeekInfo(info);
    setLoadingInfo(false);
  }, []);

  // Reset to the current week whenever the modal opens.
  useEffect(() => {
    if (visible) {
      const initialWeek = Math.min(PREGNANCY_WEEK_COUNT, Math.max(1, Math.round(currentWeek)));
      setWeek(initialWeek);
    }
  }, [visible, currentWeek]);

  // Fetch development info whenever the selected week changes.
  useEffect(() => {
    if (!visible) return;
    loadInfo(week);
  }, [week, visible, loadInfo]);

  const goToWeek = (next: number) => {
    const clamped = Math.min(PREGNANCY_WEEK_COUNT, Math.max(1, next));
    if (clamped === week) return;
    setWeek(clamped);
    // Keep the active pill in view.
    pillScrollRef.current?.scrollTo({ x: (clamped - 1) * 60 - 120, animated: true });
  };

  const isCurrentWeek = Math.round(currentWeek) === week;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSide} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Baby Growth</Text>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Week title */}
        <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>Week {week}</Text>
        <Text style={[styles.monthSubtitle, { color: colors.textSecondary }]}>
          {getTrimesterLabel(week)}
        </Text>

        {/* Image with side arrows */}
        <View style={styles.stage}>
          <TouchableOpacity
            style={[styles.arrowBtn, { backgroundColor: colors.surface }, week <= 1 && styles.arrowBtnDisabled]}
            onPress={() => goToWeek(week - 1)}
            disabled={week <= 1}
          >
            <Ionicons name="chevron-back" size={26} color={week <= 1 ? colors.border : colors.primary} />
          </TouchableOpacity>

          <View style={[styles.imageCard, { backgroundColor: colors.surface }]}>
            <Image
              source={getPregnancyGrowthImage(week)}
              style={styles.image}
              resizeMode="contain"
            />
            {isCurrentWeek && (
              <View style={[styles.currentBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.currentBadgeText}>You are here</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.arrowBtn,
              { backgroundColor: colors.surface },
              week >= PREGNANCY_WEEK_COUNT && styles.arrowBtnDisabled,
            ]}
            onPress={() => goToWeek(week + 1)}
            disabled={week >= PREGNANCY_WEEK_COUNT}
          >
            <Ionicons
              name="chevron-forward"
              size={26}
              color={week >= PREGNANCY_WEEK_COUNT ? colors.border : colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Size chip */}
        <View style={styles.sizeWrap}>
          <View style={[styles.sizeChip, { backgroundColor: colors.surface }]}>
            <Ionicons name="nutrition-outline" size={16} color={colors.primary} />
            {loadingInfo ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.sizeText, { color: colors.textPrimary }]}>
                {weekInfo?.babySize ? `Size of ${weekInfo.babySize}` : 'Size unavailable'}
              </Text>
            )}
          </View>
        </View>

        {/* Development details — explains what's expected this week, tied to the image and size shown above */}
        <ScrollView
          style={styles.detailsScroll}
          contentContainerStyle={styles.detailsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {!loadingInfo && weekInfo && (weekInfo.babyLength || weekInfo.babyWeight) && (
            <View style={styles.statsRow}>
              {!!weekInfo.babyLength && (
                <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                  <Ionicons name="resize-outline" size={14} color={colors.primary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {weekInfo.babyLength}
                  </Text>
                </View>
              )}
              {!!weekInfo.babyWeight && (
                <View style={[styles.statChip, { backgroundColor: colors.surface }]}>
                  <Ionicons name="scale-outline" size={14} color={colors.primary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {weekInfo.babyWeight}
                  </Text>
                </View>
              )}
            </View>
          )}

          {loadingInfo && (
            <View style={styles.developmentLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}

          {!loadingInfo && weekInfo && weekInfo.babyDevelopment?.length > 0 && (
            <View style={[styles.developmentCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.developmentTitle, { color: colors.textPrimary }]}>
                What&apos;s happening this week
              </Text>
              {weekInfo.babyDevelopment.map((item, idx) => (
                <View key={idx} style={styles.developmentRow}>
                  <View style={[styles.developmentDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.developmentText, { color: colors.textSecondary }]}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {!loadingInfo && !weekInfo && (
            <Text style={[styles.developmentUnavailable, { color: colors.textMuted }]}>
              Development details aren&apos;t available for this week yet.
            </Text>
          )}
        </ScrollView>

        {/* Week pill selector */}
        <ScrollView
          ref={pillScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillStrip}
          contentContainerStyle={styles.pillStripContent}
        >
          {Array.from({ length: PREGNANCY_WEEK_COUNT }, (_, i) => {
            const w = i + 1;
            const active = w === week;
            return (
              <TouchableOpacity
                key={w}
                style={[
                  styles.pill,
                  { backgroundColor: active ? colors.primary : colors.surface },
                ]}
                onPress={() => goToWeek(w)}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: active ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {w}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerSide: {
    width: 44,
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  monthSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  stage: {
    height: 220,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  arrowBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  arrowBtnDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  imageCard: {
    flex: 1,
    height: '100%',
    marginHorizontal: 12,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  currentBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  sizeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sizeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  detailsScroll: {
    flex: 1,
    marginTop: 12,
  },
  detailsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
  },
  developmentLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  developmentCard: {
    borderRadius: 20,
    padding: 16,
  },
  developmentTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  developmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  developmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  developmentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  developmentUnavailable: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
  pillStrip: {
    maxHeight: 72,
    marginTop: 4,
  },
  pillStripContent: {
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  pill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
