import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { usePregnancy } from '../../context/PregnancyContext';
import {
  getWeightDataPoints,
  getBPDataPoints,
  formatWeekLabel,
  WeightDataPoint,
  BPDataPoint,
} from '../../utils/chartUtils';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#ffffff',
  backgroundGradientFrom: '#ffffff',
  backgroundGradientTo: '#E0F2F3',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(129, 190, 193, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(60, 60, 60, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '5', strokeWidth: '2', stroke: '#81bec1' },
};

type TabType = 'weight' | 'bp';

export default function ChartsScreen() {
  const { pregnancy, hospitalVisits, loading } = usePregnancy();
  const [activeTab, setActiveTab] = useState<TabType>('weight');

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#81bec1" />
      </View>
    );
  }

  if (!pregnancy) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>No Pregnancy Found</Text>
        <Text style={styles.emptySubtitle}>Please create a pregnancy profile first.</Text>
      </View>
    );
  }

  const weightPoints: WeightDataPoint[] = getWeightDataPoints(hospitalVisits);
  const bpPoints: BPDataPoint[] = getBPDataPoints(hospitalVisits);

  const latestWeight = weightPoints.length > 0 ? weightPoints[weightPoints.length - 1] : null;
  const latestBP = bpPoints.length > 0 ? bpPoints[bpPoints.length - 1] : null;

  const weightChartData = {
    labels: weightPoints.map(p => formatWeekLabel(p.week)),
    datasets: [
      {
        data: weightPoints.map(p => p.weight),
        color: (opacity = 1) => `rgba(129, 190, 193, ${opacity})`,
      },
    ],
  };

  const bpChartData = {
    labels: bpPoints.map(p => formatWeekLabel(p.week)),
    datasets: [
      {
        data: bpPoints.map(p => p.systolic),
        color: (opacity = 1) => `rgba(129, 190, 193, ${opacity})`,
      },
      {
        data: bpPoints.map(p => p.diastolic),
        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`,
      },
    ],
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Health Charts</Text>
      </View>

      {/* Tab Toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'weight' && styles.tabButtonActive]}
          onPress={() => setActiveTab('weight')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'weight' && styles.tabTextActive]}>
            Weight
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'bp' && styles.tabButtonActive]}
          onPress={() => setActiveTab('bp')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'bp' && styles.tabTextActive]}>
            Blood Pressure
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Tab */}
        {activeTab === 'weight' && (
          <View>
            {latestWeight && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Latest</Text>
                <Text style={styles.summaryValue}>
                  {latestWeight.weight.toFixed(1)} kg
                </Text>
                <Text style={styles.summaryMeta}>at Week {latestWeight.week}</Text>
              </View>
            )}

            {weightPoints.length >= 2 ? (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Weight Progress (kg)</Text>
                <LineChart
                  data={weightChartData}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={true}
                />
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>⚖️</Text>
                <Text style={styles.emptyCardText}>
                  Add weight measurements during hospital visits to see your chart.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Blood Pressure Tab */}
        {activeTab === 'bp' && (
          <View>
            {latestBP && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Latest</Text>
                <Text style={styles.summaryValue}>
                  {latestBP.systolic}/{latestBP.diastolic} mmHg
                </Text>
                <Text style={styles.summaryMeta}>at Week {latestBP.week}</Text>
              </View>
            )}

            {bpPoints.length >= 2 ? (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Blood Pressure (mmHg)</Text>
                <LineChart
                  data={bpChartData}
                  width={screenWidth - 40}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                  withInnerLines={true}
                  withOuterLines={true}
                />
                {/* Legend */}
                <View style={styles.legend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#81bec1' }]} />
                    <Text style={styles.legendText}>Systolic</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Diastolic</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyIcon}>🩺</Text>
                <Text style={styles.emptyCardText}>
                  Add blood pressure during hospital visits to see your chart.
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2F3',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0F2F3',
    paddingHorizontal: 24,
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
  },

  // Header
  header: {
    backgroundColor: '#81bec1',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },

  // Tab Toggle
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#81bec1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#ffffff',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#81bec1',
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 13,
    color: '#999',
  },

  // Chart Card
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },

  // Empty State Card
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 14,
  },
  emptyCardText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
  },
});
