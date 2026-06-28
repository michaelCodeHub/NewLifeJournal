import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { usePregnancy } from '../../context/PregnancyContext';
import {
  buildTimelineSummary,
  generateTimelineText,
  generateTimelineHTML,
} from '../../utils/shareUtils';

type ShareFormat = 'text' | 'pdf';

export default function ShareTimelineScreen() {
  const { pregnancy, hospitalVisits, symptoms, milestones, loading, getCurrentWeek } =
    usePregnancy();
  const [shareFormat, setShareFormat] = useState<ShareFormat>('text');
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!pregnancy) return;
    setSharing(true);
    try {
      const currentWeek = getCurrentWeek();
      if (shareFormat === 'text') {
        const text = generateTimelineText(
          pregnancy,
          hospitalVisits,
          symptoms,
          milestones,
          currentWeek
        );
        await Share.share({
          message: text,
          title: `${pregnancy.motherName}'s Pregnancy Journey`,
        });
      } else {
        const html = generateTimelineHTML(
          pregnancy,
          hospitalVisits,
          symptoms,
          milestones,
          currentWeek
        );
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share your pregnancy timeline',
            UTI: 'com.adobe.pdf',
          });
        } else {
          Alert.alert('PDF saved', uri);
        }
      }
    } catch (err: any) {
      Alert.alert('Share failed', err.message || 'Please try again');
    } finally {
      setSharing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#81bec1" />
        <Text style={styles.loadingText}>Loading your journey...</Text>
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📤</Text>
        <Text style={styles.emptyTitle}>No Pregnancy Found</Text>
        <Text style={styles.emptySubtitle}>
          Please create a pregnancy profile to share your timeline.
        </Text>
      </View>
    );
  }

  const currentWeek = getCurrentWeek();
  const summary = buildTimelineSummary(
    pregnancy,
    hospitalVisits,
    symptoms,
    milestones,
    currentWeek
  );
  const dueDate = pregnancy.dueDate.toDate().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Share Timeline</Text>
        <Text style={styles.headerSubtitle}>
          Share your pregnancy journey with family and friends
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Preview Card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>Your Journey</Text>

          <View style={styles.previewRow}>
            <Text style={styles.previewIcon}>🤱</Text>
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewLabel}>Mother</Text>
              <Text style={styles.previewValue}>{pregnancy.motherName}</Text>
            </View>
          </View>

          <View style={styles.previewRow}>
            <Text style={styles.previewIcon}>📅</Text>
            <View style={styles.previewTextContainer}>
              <Text style={styles.previewLabel}>Progress</Text>
              <Text style={styles.previewValue}>
                Week {currentWeek} of 40 · Due {dueDate}
              </Text>
            </View>
          </View>

          {pregnancy.babyName ? (
            <View style={styles.previewRow}>
              <Text style={styles.previewIcon}>👶</Text>
              <View style={styles.previewTextContainer}>
                <Text style={styles.previewLabel}>Baby Name</Text>
                <Text style={styles.previewValue}>{pregnancy.babyName}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />

          {/* Stats Grid */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🏥</Text>
              <Text style={styles.statCount}>{summary.totalVisits}</Text>
              <Text style={styles.statLabel}>Hospital{'\n'}Visits</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>💊</Text>
              <Text style={styles.statCount}>{summary.totalSymptoms}</Text>
              <Text style={styles.statLabel}>Symptoms{'\n'}Logged</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>🌟</Text>
              <Text style={styles.statCount}>{summary.totalMilestones}</Text>
              <Text style={styles.statLabel}>Milestones{'\n'}Recorded</Text>
            </View>
          </View>

          {/* Latest Stats */}
          {(summary.latestWeight || summary.latestBP) ? (
            <>
              <View style={styles.divider} />
              <View style={styles.latestStatsRow}>
                {summary.latestWeight ? (
                  <View style={styles.latestStatItem}>
                    <Text style={styles.latestStatIcon}>⚖️</Text>
                    <Text style={styles.latestStatLabel}>Latest Weight</Text>
                    <Text style={styles.latestStatValue}>{summary.latestWeight} kg</Text>
                  </View>
                ) : null}
                {summary.latestBP ? (
                  <View style={styles.latestStatItem}>
                    <Text style={styles.latestStatIcon}>❤️</Text>
                    <Text style={styles.latestStatLabel}>Latest BP</Text>
                    <Text style={styles.latestStatValue}>{summary.latestBP}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
        </View>

        {/* Format Toggle */}
        <View style={styles.formatCard}>
          <Text style={styles.formatTitle}>Share Format</Text>
          <View style={styles.formatToggle}>
            <TouchableOpacity
              style={[
                styles.formatButton,
                shareFormat === 'text' && styles.formatButtonActive,
              ]}
              onPress={() => setShareFormat('text')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  shareFormat === 'text' && styles.formatButtonTextActive,
                ]}
              >
                📝 Text
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.formatButton,
                shareFormat === 'pdf' && styles.formatButtonActive,
              ]}
              onPress={() => setShareFormat('pdf')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.formatButtonText,
                  shareFormat === 'pdf' && styles.formatButtonTextActive,
                ]}
              >
                📄 PDF
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.formatDescription}>
            {shareFormat === 'text'
              ? 'Share as a plain text message — works with any messaging app.'
              : 'Generate a beautiful PDF — great for printing or saving.'}
          </Text>
        </View>

        {/* Share Button */}
        {sharing ? (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color="#81bec1" />
            <Text style={styles.generatingText}>
              {shareFormat === 'pdf' ? 'Generating your PDF...' : 'Preparing to share...'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShare}
            activeOpacity={0.85}
          >
            <Text style={styles.shareButtonIcon}>📤</Text>
            <Text style={styles.shareButtonText}>Share My Journey</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Your data stays private — shared only when you tap the button above.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2F3',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2F3',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Header
  header: {
    backgroundColor: '#81bec1',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },

  // Preview Card
  previewCard: {
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
  previewTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewIcon: {
    fontSize: 26,
  },
  previewTextContainer: {
    flex: 1,
  },
  previewLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 14,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#E0F2F3',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#81bec1',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Latest Stats
  latestStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  latestStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  latestStatIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  latestStatLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  latestStatValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 2,
  },

  // Format Card
  formatCard: {
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
  formatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  formatToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  formatButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  formatButtonActive: {
    backgroundColor: '#81bec1',
    shadowColor: '#81bec1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  formatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  formatButtonTextActive: {
    color: '#fff',
  },
  formatDescription: {
    fontSize: 13,
    color: '#777',
    lineHeight: 19,
  },

  // Generating
  generatingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  generatingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },

  // Share Button
  shareButton: {
    backgroundColor: '#81bec1',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#81bec1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  shareButtonIcon: {
    fontSize: 20,
  },
  shareButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Disclaimer
  disclaimer: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
  },
});
