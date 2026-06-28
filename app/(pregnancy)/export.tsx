import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { usePregnancy } from '../../context/PregnancyContext';
import { generateReportHTML, formatDate } from '../../utils/exportUtils';

export default function ExportScreen() {
  const { pregnancy, hospitalVisits, symptoms, milestones, loading, getCurrentWeek } =
    usePregnancy();
  const [generating, setGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const handleExport = async () => {
    if (!pregnancy) return;
    setGenerating(true);
    try {
      const html = generateReportHTML(
        pregnancy,
        hospitalVisits,
        symptoms,
        milestones,
        getCurrentWeek()
      );
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setPdfUri(uri);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share your pregnancy report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing not available', 'PDF saved to: ' + uri);
      }
    } catch (err: any) {
      Alert.alert('Export failed', err.message || 'Please try again');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareAgain = async () => {
    if (!pdfUri) return;
    setGenerating(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share your pregnancy report',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Sharing not available', 'PDF saved to: ' + pdfUri);
      }
    } catch (err: any) {
      Alert.alert('Share failed', err.message || 'Please try again');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#81bec1" />
        <Text style={styles.loadingText}>Loading your data...</Text>
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Pregnancy Found</Text>
        <Text style={styles.emptySubtitle}>
          Please create a pregnancy profile to generate a report.
        </Text>
      </View>
    );
  }

  const currentWeek = getCurrentWeek();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Export Report</Text>
        <Text style={styles.headerSubtitle}>
          Generate a PDF of your complete pregnancy journal
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Report Preview Card */}
        <View style={styles.previewCard}>
          <Text style={styles.previewTitle}>What will be included</Text>

          {/* Pregnancy Info */}
          <View style={styles.previewSection}>
            <View style={styles.previewRow}>
              <Text style={styles.previewIcon}>🤱</Text>
              <View style={styles.previewTextContainer}>
                <Text style={styles.previewLabel}>Pregnancy Summary</Text>
                <Text style={styles.previewValue}>
                  {pregnancy.motherName} · Week {currentWeek} of 40
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>📅</Text>
              <Text style={styles.summaryCount}>{hospitalVisits.length}</Text>
              <Text style={styles.summaryLabel}>Hospital{'\n'}Visits</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>💊</Text>
              <Text style={styles.summaryCount}>{symptoms.length}</Text>
              <Text style={styles.summaryLabel}>Symptoms{'\n'}Logged</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>🌟</Text>
              <Text style={styles.summaryCount}>{milestones.length}</Text>
              <Text style={styles.summaryLabel}>Milestones{'\n'}Recorded</Text>
            </View>
          </View>
        </View>

        {/* Report Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Report Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📄</Text>
            <Text style={styles.detailText}>PDF format — shareable and printable</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              Generated on {formatDate(new Date())}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🔒</Text>
            <Text style={styles.detailText}>Your data stays private — no upload required</Text>
          </View>
          {pregnancy.doctorName ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>👩‍⚕️</Text>
              <Text style={styles.detailText}>Doctor: {pregnancy.doctorName}</Text>
            </View>
          ) : null}
          {pregnancy.hospital ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🏥</Text>
              <Text style={styles.detailText}>Hospital: {pregnancy.hospital}</Text>
            </View>
          ) : null}
        </View>

        {/* PDF Ready Banner */}
        {pdfUri && !generating && (
          <View style={styles.readyBanner}>
            <Text style={styles.readyIcon}>✅</Text>
            <View style={styles.readyTextContainer}>
              <Text style={styles.readyTitle}>PDF ready</Text>
              <Text style={styles.readySubtitle}>Tap below to share again</Text>
            </View>
          </View>
        )}

        {/* Generate Button */}
        {generating ? (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color="#81bec1" />
            <Text style={styles.generatingText}>Generating your report...</Text>
          </View>
        ) : (
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExport}
              activeOpacity={0.85}
            >
              <Text style={styles.exportButtonIcon}>📄</Text>
              <Text style={styles.exportButtonText}>
                {pdfUri ? 'Regenerate PDF Report' : 'Generate PDF Report'}
              </Text>
            </TouchableOpacity>

            {pdfUri && (
              <TouchableOpacity
                style={styles.shareAgainButton}
                onPress={handleShareAgain}
                activeOpacity={0.85}
              >
                <Text style={styles.shareAgainText}>Share Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <Text style={styles.disclaimer}>
          Your pregnancy report is generated on-device and never uploaded to any server.
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
  previewSection: {
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewIcon: {
    fontSize: 28,
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
    marginVertical: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#E0F2F3',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#81bec1',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Details Card
  detailsCard: {
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
  detailsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  detailIcon: {
    fontSize: 16,
    width: 24,
  },
  detailText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },

  // Ready Banner
  readyBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  readyIcon: {
    fontSize: 24,
  },
  readyTextContainer: {
    flex: 1,
  },
  readyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2E7D32',
  },
  readySubtitle: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 2,
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

  // Buttons
  buttonsContainer: {
    gap: 12,
  },
  exportButton: {
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
  },
  exportButtonIcon: {
    fontSize: 20,
  },
  exportButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  shareAgainButton: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#81bec1',
  },
  shareAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#81bec1',
  },

  // Disclaimer
  disclaimer: {
    marginTop: 20,
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
  },
});
