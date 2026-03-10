import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { getWeekInfo, getWeekImageUrl, WeekInfo } from '../services/firebase/weekInfoService';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type TabType = 'baby' | 'mom' | 'pregnancy';

interface WeekDetailModalProps {
  visible: boolean;
  initialWeek: number;
  onClose: () => void;
}

export default function WeekDetailModal({ visible, initialWeek, onClose }: WeekDetailModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>('baby');
  const [currentWeek, setCurrentWeek] = useState(initialWeek);
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadWeekData = useCallback(async (week: number) => {
    setLoading(true);
    setWeekInfo(null);
    setImageUrl(null);
    const [info, url] = await Promise.all([getWeekInfo(week), getWeekImageUrl(week)]);
    setWeekInfo(info);
    setImageUrl(url);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setCurrentWeek(initialWeek);
      setActiveTab('baby');
      loadWeekData(initialWeek);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, initialWeek]);

  const handleWeekChange = (delta: number) => {
    const next = Math.min(40, Math.max(1, currentWeek + delta));
    if (next === currentWeek) return;
    setCurrentWeek(next);
    loadWeekData(next);
  };

  const getTrimesterLabel = (week: number) => {
    if (week <= 13) return '1st Trimester';
    if (week <= 26) return '2nd Trimester';
    return '3rd Trimester';
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.arrowBtn, currentWeek <= 1 && styles.arrowBtnDisabled]}
            onPress={() => handleWeekChange(-1)}
            disabled={currentWeek <= 1}
          >
            <Text style={[styles.arrowText, currentWeek <= 1 && styles.arrowTextDisabled]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.weekLabel}>Week {currentWeek}</Text>
            <Text style={styles.trimesterLabel}>{getTrimesterLabel(currentWeek)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.arrowBtn, currentWeek >= 40 && styles.arrowBtnDisabled]}
            onPress={() => handleWeekChange(1)}
            disabled={currentWeek >= 40}
          >
            <Text style={[styles.arrowText, currentWeek >= 40 && styles.arrowTextDisabled]}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {(['baby', 'mom', 'pregnancy'] as TabType[]).map((tab) => {
            const labels: Record<TabType, string> = { baby: '🍼 Baby', mom: '🤱 Mom', pregnancy: '🩺 Pregnancy' };
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {labels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#81bec1" />
            <Text style={styles.loadingText}>Loading week {currentWeek}...</Text>
          </View>
        ) : weekInfo ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentInner}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'baby' && (
              <BabyTab weekInfo={weekInfo} imageUrl={imageUrl} />
            )}
            {activeTab === 'mom' && (
              <MomTab weekInfo={weekInfo} />
            )}
            {activeTab === 'pregnancy' && (
              <PregnancyTab weekInfo={weekInfo} />
            )}
          </ScrollView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.emptyText}>No data available for week {currentWeek}.</Text>
            <Text style={styles.emptySubtext}>Run "Initialize Week Data" in the Admin screen.</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

/* ─── Baby Tab ─────────────────────────────────────────────────── */
function BabyTab({ weekInfo, imageUrl }: { weekInfo: WeekInfo; imageUrl: string | null }) {
  return (
    <>
      {/* Size hero */}
      <View style={styles.sizeHero}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.weekImage} resizeMode="contain" />
        ) : (
          <View style={styles.weekImagePlaceholder}>
            <Text style={styles.weekImageEmoji}>👶</Text>
          </View>
        )}
        <View style={styles.sizeInfo}>
          <Text style={styles.sizeLabel}>Size</Text>
          <Text style={styles.sizeValue}>{weekInfo.babySize}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>📏</Text>
          <Text style={styles.statCardLabel}>Length</Text>
          <Text style={styles.statCardValue}>{weekInfo.babyLength}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statCardIcon}>⚖️</Text>
          <Text style={styles.statCardLabel}>Weight</Text>
          <Text style={styles.statCardValue}>{weekInfo.babyWeight}</Text>
        </View>
      </View>

      {/* Development */}
      {weekInfo.babyDevelopment.length > 0 && (
        <Section title="Development" icon="✨">
          {weekInfo.babyDevelopment.map((item, i) => (
            <BulletItem key={i} text={item} color="#81bec1" />
          ))}
        </Section>
      )}
    </>
  );
}

/* ─── Mom Tab ───────────────────────────────────────────────────── */
function MomTab({ weekInfo }: { weekInfo: WeekInfo }) {
  return (
    <>
      {weekInfo.motherChanges.length > 0 && (
        <Section title="Body Changes" icon="🤱">
          {weekInfo.motherChanges.map((item, i) => (
            <BulletItem key={i} text={item} color="#E91E8C" />
          ))}
        </Section>
      )}

      {weekInfo.tips.length > 0 && (
        <Section title="Tips for This Week" icon="💡">
          {weekInfo.tips.map((item, i) => (
            <BulletItem key={i} text={item} color="#FF9800" />
          ))}
        </Section>
      )}

      {weekInfo.dailyTips && weekInfo.dailyTips.length > 0 && (
        <Section title="Daily Reminders" icon="🌟">
          <View style={styles.dailyTipsGrid}>
            {weekInfo.dailyTips.map((tip, i) => (
              <View key={i} style={[styles.dailyTipCard, { backgroundColor: tip.color }]}>
                <Text style={styles.dailyTipIcon}>{tip.icon}</Text>
                <Text style={styles.dailyTipTitle}>{tip.title}</Text>
                <Text style={styles.dailyTipSub}>{tip.subtitle}</Text>
              </View>
            ))}
          </View>
        </Section>
      )}
    </>
  );
}

/* ─── Pregnancy Tab ─────────────────────────────────────────────── */
function PregnancyTab({ weekInfo }: { weekInfo: WeekInfo }) {
  const info = weekInfo.pregnancyInfo;

  if (!info || (!info.appointments.length && !info.tests.length && !info.milestones.length)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>No medical info seeded yet.</Text>
        <Text style={styles.emptySubtext}>Re-run "Initialize Week Data" in Admin to populate this tab.</Text>
      </View>
    );
  }

  return (
    <>
      {info.milestones.length > 0 && (
        <Section title="Pregnancy Milestones" icon="🏁">
          {info.milestones.map((item, i) => (
            <BulletItem key={i} text={item} color="#FFD700" />
          ))}
        </Section>
      )}

      {info.appointments.length > 0 && (
        <Section title="Appointments to Expect" icon="📅">
          {info.appointments.map((item, i) => (
            <BulletItem key={i} text={item} color="#81bec1" />
          ))}
        </Section>
      )}

      {info.tests.length > 0 && (
        <Section title="Tests & Screenings" icon="🔬">
          {info.tests.map((item, i) => (
            <BulletItem key={i} text={item} color="#9C27B0" />
          ))}
        </Section>
      )}
    </>
  );
}

/* ─── Shared sub-components ─────────────────────────────────────── */
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function BulletItem({ text, color }: { text: string; color: string }) {
  return (
    <View style={styles.bulletRow}>
      <View style={[styles.bullet, { backgroundColor: color }]} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

/* ─── Styles ────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '92%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  arrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDisabled: {
    backgroundColor: '#F5F5F5',
  },
  arrowText: {
    fontSize: 26,
    color: '#81bec1',
    lineHeight: 30,
  },
  arrowTextDisabled: {
    color: '#CCC',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekLabel: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  trimesterLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#666',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 14,
    padding: 3,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#888',
  },
  tabTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },

  // Content
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },

  // Baby tab
  sizeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FAFB',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 16,
  },
  weekImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  weekImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E8F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekImageEmoji: {
    fontSize: 56,
  },
  sizeInfo: {
    flex: 1,
  },
  sizeLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sizeValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  statCardIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  statCardLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },

  // Mom tab daily tips
  dailyTipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  dailyTipCard: {
    width: '47%',
    borderRadius: 14,
    padding: 14,
  },
  dailyTipIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  dailyTipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  dailyTipSub: {
    fontSize: 11,
    color: '#555',
  },

  // Shared section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
  },
});
