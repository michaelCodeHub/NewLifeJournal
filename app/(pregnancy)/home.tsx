import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { usePregnancy } from '../../context/PregnancyContext';
import { useAuth } from '../../context/AuthContext';
import { getWeekInfo, getWeekImageUrl, WeekInfo, DailyTip } from '../../services/firebase/weekInfoService';

const TOTAL_WEEKS = 40;

const getTrimester = (week: number): string => {
  if (week <= 13) return '1st Trimester';
  if (week <= 26) return '2nd Trimester';
  return '3rd Trimester';
};


export default function PregnancyHomeScreen() {
  const { pregnancy, loading, getCurrentWeek, getDaysUntilDue } = usePregnancy();
  const { user } = useAuth();
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [weekImageUrl, setWeekImageUrl] = useState<string | null>(null);
  const [loadingWeekInfo, setLoadingWeekInfo] = useState(true);
  const [showMoreThisWeek, setShowMoreThisWeek] = useState(false);

  useEffect(() => {
    const fetchWeekInfo = async () => {
      if (pregnancy) {
        const week = getCurrentWeek();
        const [info, imageUrl] = await Promise.all([
          getWeekInfo(week),
          getWeekImageUrl(week),
        ]);
        setWeekInfo(info);
        setWeekImageUrl(imageUrl);
        setLoadingWeekInfo(false);
      }
    };

    fetchWeekInfo();
  }, [pregnancy]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#81bec1" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>No Pregnancy Found</Text>
        <Text style={styles.emptySubtitle}>Please create a pregnancy profile</Text>
      </View>
    );
  }

  const currentWeek = getCurrentWeek();
  const daysUntilDue = getDaysUntilDue();
  const remainingWeeks = Math.ceil(daysUntilDue / 7);
  const trimester = getTrimester(currentWeek);
  const dailyTips = weekInfo?.dailyTips || [];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.profileImageContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                <Text style={styles.profileInitial}>
                  {pregnancy.motherName?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={styles.bellButton}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>Hello, {pregnancy.motherName}</Text>
        <Text style={styles.subtitle}>
          In <Text style={styles.subtitleBold}>{remainingWeeks} weeks</Text> you are going to meet{' '}
          <Text style={styles.subtitleBold}>{pregnancy.babyName || 'your baby'}</Text>
        </Text>

        {/* Week Progress Card */}
        <View style={styles.weekCard}>
          <Text style={styles.weekCardTitle}>
            Week {currentWeek} · {trimester}
          </Text>
          <View style={styles.weekBarContainer}>
            {Array.from({ length: TOTAL_WEEKS }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.weekBarSegment,
                  i < currentWeek ? styles.weekBarFilled : styles.weekBarEmpty,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Baby Image + Stats Row */}
        <View style={styles.tilesRow}>
          {/* Baby Image Tile */}
          <View style={styles.babyImageTile}>
            <View style={styles.babyImageContainer}>
              {weekImageUrl ? (
                <Image
                  source={{ uri: weekImageUrl }}
                  style={styles.babyImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.babyEmoji}>👶</Text>
              )}
            </View>
            <TouchableOpacity style={styles.switchFruitButton}>
              <Text style={styles.switchFruitText}>
                🍎 {weekInfo?.babySize || 'Size by fruit'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats Tile */}
          <View style={styles.statsTile}>
            <Text style={styles.statsTitle}>Stats</Text>
            {loadingWeekInfo ? (
              <ActivityIndicator size="small" color="#81bec1" style={{ marginTop: 12 }} />
            ) : weekInfo ? (
              <>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>📏</Text>
                  <View>
                    <Text style={styles.statLabel}>Avg. height</Text>
                    <Text style={styles.statValue}>{weekInfo.babyLength}</Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statIcon}>⚖️</Text>
                  <View>
                    <Text style={styles.statLabel}>Avg. weight</Text>
                    <Text style={styles.statValue}>{weekInfo.babyWeight}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>

        {/* More This Week Expandable */}
        {showMoreThisWeek && weekInfo && (
          <View style={styles.moreCard}>
            {weekInfo.babyDevelopment.length > 0 && (
              <View style={styles.moreSection}>
                <Text style={styles.moreSectionTitle}>Baby Development</Text>
                {weekInfo.babyDevelopment.map((item, idx) => (
                  <Text key={idx} style={styles.moreBullet}>• {item}</Text>
                ))}
              </View>
            )}
            {weekInfo.motherChanges.length > 0 && (
              <View style={styles.moreSection}>
                <Text style={styles.moreSectionTitle}>Your Body</Text>
                {weekInfo.motherChanges.map((item, idx) => (
                  <Text key={idx} style={styles.moreBullet}>• {item}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* This Week Highlights */}
        {weekInfo && weekInfo.babyDevelopment.length > 0 && (
          <TouchableOpacity style={styles.thisWeekCard} activeOpacity={0.8}>
            <View style={styles.thisWeekContent}>
              <View style={styles.thisWeekHeader}>
                <View style={styles.thisWeekIconCircle}>
                  <Text style={styles.thisWeekIcon}>✨</Text>
                </View>
                <Text style={styles.thisWeekTitle}>This Week</Text>
              </View>
              {weekInfo.babyDevelopment.slice(0, 2).map((item, idx) => (
                <View key={idx} style={styles.thisWeekBulletRow}>
                  <View style={styles.thisWeekDot} />
                  <Text style={styles.thisWeekBulletText}>{item}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.thisWeekArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Today's Tips */}
        {dailyTips.length > 0 && (
          <View style={styles.tipsCard}>
            <Text style={styles.tipsCardTitle}>Today's Tips</Text>
            <View style={styles.tipsGrid}>
              {dailyTips.slice(0, 4).map((tip: DailyTip, index: number) => (
                <View key={index} style={styles.tipGridItem}>
                  <View style={[styles.tipIconCircle, { backgroundColor: tip.color }]}>
                    <Text style={styles.tipGridIcon}>{tip.icon}</Text>
                  </View>
                  <Text style={styles.tipGridTitle}>{tip.title}</Text>
                  <Text style={styles.tipGridSubtitle}>{tip.subtitle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4F5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F4F5',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  profileImagePlaceholder: {
    backgroundColor: '#81bec1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  bellIcon: {
    fontSize: 20,
  },

  // Greeting
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  subtitleBold: {
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Week Progress Card
  weekCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  weekCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  weekBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1.5,
  },
  weekBarSegment: {
    flex: 1,
    height: 16,
    borderRadius: 2,
  },
  weekBarFilled: {
    backgroundColor: '#81bec1',
  },
  weekBarEmpty: {
    backgroundColor: '#D9D9D9',
  },

  // Tiles Row
  tilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },

  // Baby Image Tile (50%)
  babyImageTile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  babyImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyImage: {
    width: '90%',
    height: '90%',
    borderRadius: 12,
  },
  babyEmoji: {
    fontSize: 80,
  },
  switchFruitButton: {
    backgroundColor: '#E8F4F5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 8,
  },
  switchFruitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a9a9d',
  },

  // Stats Tile (50%)
  statsTile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
    color: '#888',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2C3E50',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
    gap: 4,
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  moreButtonArrow: {
    fontSize: 11,
    color: '#fff',
  },

  // More This Week Expandable
  moreCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    marginTop: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  moreSection: {
    marginBottom: 12,
  },
  moreSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  moreBullet: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    paddingLeft: 4,
  },

  // This Week Card
  thisWeekCard: {
    backgroundColor: '#FFF8EE',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  thisWeekContent: {
    flex: 1,
  },
  thisWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  thisWeekIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEECD2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thisWeekIcon: {
    fontSize: 18,
  },
  thisWeekTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  thisWeekBulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    paddingLeft: 4,
  },
  thisWeekDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#F5A623',
  },
  thisWeekBulletText: {
    fontSize: 14,
    color: '#444',
    flex: 1,
    lineHeight: 20,
  },
  thisWeekArrow: {
    fontSize: 28,
    color: '#CCAA77',
    fontWeight: '300',
    marginLeft: 8,
  },

  // Today's Tips
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 14,
  },
  tipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tipGridItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  tipIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipGridIcon: {
    fontSize: 18,
  },
  tipGridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  tipGridSubtitle: {
    fontSize: 12,
    color: '#888',
  },
});
