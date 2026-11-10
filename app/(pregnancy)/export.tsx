import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { trackEvent } from '../../services/monitoring/analytics';
import { usePregnancy } from '../../context/PregnancyContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { SPACE } from '../../context/ThemeContext';
import PremiumGate from '../../components/PremiumGate';
import {
  Button,
  Card,
  IconTile,
  ListRow,
  Pill,
  Screen,
  ScreenState,
  SectionHeader,
  Text,
  useToast,
} from '../../components/ui';
import { FooterBar } from '../../components/insights/FooterBar';
import type { ListRowProps } from '../../components/ui/Surfaces';
import { generateReportHTML } from '../../utils/exportUtils';
import { longDate, trimesterLabel } from '../../lib/journal';

const SHARE_OPTIONS = {
  mimeType: 'application/pdf',
  dialogTitle: 'Share your pregnancy report',
  UTI: 'com.adobe.pdf',
} as const;

export default function ExportScreen() {
  const toast = useToast();
  const { pregnancy, hospitalVisits, symptoms, milestones, loading, getCurrentWeek } = usePregnancy();
  const { isPremium } = useSubscription();
  const [generating, setGenerating] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  const week = getCurrentWeek();

  const shareFile = useCallback(
    async (uri: string) => {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, SHARE_OPTIONS);
        return true;
      }
      toast.show('Sharing isn’t available here — the PDF was saved on this device', 'info');
      return false;
    },
    [toast]
  );

  const handleExport = useCallback(async () => {
    if (!pregnancy) return;
    setGenerating(true);
    try {
      const html = generateReportHTML(pregnancy, hospitalVisits, symptoms, milestones, getCurrentWeek());
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setPdfUri(uri);
      trackEvent('data_exported', { action: 'pdf' });
      if (await shareFile(uri)) toast.show('Report ready');
    } catch (err: any) {
      toast.show(err?.message || 'Export failed — please try again', 'error');
    } finally {
      setGenerating(false);
    }
  }, [pregnancy, hospitalVisits, symptoms, milestones, getCurrentWeek, shareFile, toast]);

  const handleShareAgain = useCallback(async () => {
    if (!pdfUri) return;
    setGenerating(true);
    try {
      await shareFile(pdfUri);
    } catch (err: any) {
      toast.show(err?.message || 'Share failed — please try again', 'error');
    } finally {
      setGenerating(false);
    }
  }, [pdfUri, shareFile, toast]);

  if (!isPremium) {
    return (
      <PremiumGate
        title="PDF export"
        description="Generate a shareable PDF report of your visits, symptoms and milestones with Plus."
        icon="document-text-outline"
        preview="export"
      >
        {null}
      </PremiumGate>
    );
  }

  if (loading) return <ScreenState loading />;
  if (!pregnancy) {
    return (
      <ScreenState
        icon="document-text-outline"
        title="No active pregnancy"
        body="Create a pregnancy profile to generate a report."
      />
    );
  }

  const included: Pick<ListRowProps, 'icon' | 'tone' | 'title' | 'subtitle' | 'value'>[] = [
    { icon: 'person-circle-outline', tone: 'teal', title: 'Pregnancy summary', subtitle: 'Due date, baby name and care team' },
    { icon: 'medkit-outline', tone: 'green', title: 'Hospital visits', subtitle: 'Weight, blood pressure and notes', value: String(hospitalVisits.length) },
    { icon: 'thermometer-outline', tone: 'orange', title: 'Symptoms', subtitle: 'Severity and notes by week', value: String(symptoms.length) },
    { icon: 'star-outline', tone: 'gold', title: 'Milestones', subtitle: 'Your special moments', value: String(milestones.length) },
  ];

  const details: Pick<ListRowProps, 'icon' | 'title' | 'value'>[] = [
    { icon: 'flag-outline', title: 'Due date', value: longDate(pregnancy.dueDate.toDate()) },
  ];
  if (pregnancy.doctorName) details.push({ icon: 'person-outline', title: 'Doctor', value: pregnancy.doctorName });
  if (pregnancy.hospital) details.push({ icon: 'business-outline', title: 'Hospital', value: pregnancy.hospital });

  return (
    <Screen
      header={{ variant: 'bar', title: 'Export report' }}
      contentStyle={{ paddingTop: SPACE.lg }}
      footer={
        <FooterBar>
          <Button
            title={pdfUri ? 'Regenerate PDF' : 'Generate PDF report'}
            icon="document-text-outline"
            size="lg"
            fullWidth
            loading={generating}
            onPress={handleExport}
          />
          {pdfUri ? (
            <Button
              title="Share again"
              icon="share-outline"
              variant="secondary"
              fullWidth
              disabled={generating}
              onPress={handleShareAgain}
            />
          ) : null}
        </FooterBar>
      }
    >
      <Card>
        <View style={styles.summaryHead}>
          <IconTile name="document-text-outline" tone="teal" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline" numberOfLines={1}>
              {pregnancy.motherName}
            </Text>
            <Text variant="footnote" color="textMuted">
              Week {week} of 40 · {trimesterLabel(week)}
            </Text>
            <Text variant="footnote" color="textMuted">
              {pdfUri && !generating ? 'Your PDF is ready to share' : 'Everything in your journal, in one PDF'}
            </Text>
          </View>
          {pdfUri && !generating ? <Pill label="Ready" tone="green" icon="checkmark" /> : null}
        </View>
      </Card>

      <View>
        <SectionHeader title="What’s included" />
        <Card padded={false}>
          {included.map((row, i) => (
            <ListRow
              key={row.title}
              icon={row.icon}
              tone={row.tone}
              title={row.title}
              subtitle={row.subtitle}
              value={row.value}
              last={i === included.length - 1}
            />
          ))}
        </Card>
      </View>

      <View>
        <SectionHeader title="Report details" />
        <Card padded={false}>
          {details.map((d, i) => (
            <ListRow key={d.title} icon={d.icon} tone="neutral" title={d.title} value={d.value} last={i === details.length - 1} />
          ))}
        </Card>
      </View>

      <View style={styles.privacy}>
        <IconTile name="lock-closed-outline" tone="neutral" size={28} />
        <Text variant="footnote" color="textMuted" style={{ flex: 1 }}>
          Your report is generated on this device and never uploaded. It’s only shared when you choose to.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.xs },
});
