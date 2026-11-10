import { useCallback, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Icon, IconName } from '../../components/ui/Icon';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { trackEvent } from '../../services/monitoring/analytics';
import { usePregnancy } from '../../context/PregnancyContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { Theme, useTheme, useThemedStyles, RADIUS, SPACE } from '../../context/ThemeContext';
import PremiumGate from '../../components/PremiumGate';
import {
  Button,
  Card,
  Divider,
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
import { JournalCounts } from '../../components/insights/JournalCounts';
import { buildTimelineSummary, generateTimelineText, generateTimelineHTML } from '../../utils/shareUtils';
import { longDate, trimesterLabel } from '../../lib/journal';

type ShareFormat = 'text' | 'pdf';

const FORMATS: { value: ShareFormat; title: string; subtitle: string; icon: 'chatbubble-ellipses-outline' | 'document-outline' }[] = [
  {
    value: 'text',
    title: 'Text message',
    subtitle: 'Plain text that works in any messaging app',
    icon: 'chatbubble-ellipses-outline',
  },
  { value: 'pdf', title: 'PDF document', subtitle: 'A formatted page for printing or saving', icon: 'document-outline' },
];

export default function ShareTimelineScreen() {
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pregnancy, hospitalVisits, symptoms, milestones, loading, getCurrentWeek } = usePregnancy();
  const { isPremium } = useSubscription();
  const [shareFormat, setShareFormat] = useState<ShareFormat>('text');
  const [sharing, setSharing] = useState(false);

  const week = getCurrentWeek();

  const summary = useMemo(
    () => (pregnancy ? buildTimelineSummary(pregnancy, hospitalVisits, symptoms, milestones, week) : null),
    [pregnancy, hospitalVisits, symptoms, milestones, week]
  );

  const previewText = useMemo(
    () => (pregnancy ? generateTimelineText(pregnancy, hospitalVisits, symptoms, milestones, week) : ''),
    [pregnancy, hospitalVisits, symptoms, milestones, week]
  );

  const handleShare = useCallback(async () => {
    if (!pregnancy) return;
    setSharing(true);
    try {
      const currentWeek = getCurrentWeek();
      if (shareFormat === 'text') {
        const text = generateTimelineText(pregnancy, hospitalVisits, symptoms, milestones, currentWeek);
        const result = await Share.share({ message: text, title: `${pregnancy.motherName}'s Pregnancy Journey` });
        if (result.action === Share.sharedAction) {
          trackEvent('timeline_shared', { action: 'text' });
          toast.show('Journey shared');
        }
      } else {
        const html = generateTimelineHTML(pregnancy, hospitalVisits, symptoms, milestones, currentWeek);
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        trackEvent('timeline_shared', { action: 'pdf' });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share your pregnancy timeline',
            UTI: 'com.adobe.pdf',
          });
        } else {
          toast.show('Sharing isn’t available here — the PDF was saved on this device', 'info');
        }
      }
    } catch (err: any) {
      toast.show(err?.message || 'Share failed — please try again', 'error');
    } finally {
      setSharing(false);
    }
  }, [pregnancy, hospitalVisits, symptoms, milestones, getCurrentWeek, shareFormat, toast]);

  if (!isPremium) {
    return (
      <PremiumGate
        title="Share timeline"
        description="Create a beautifully formatted summary of your pregnancy journey to share with family, with Plus."
        icon="share-social-outline"
        preview="sharetimeline"
      >
        {null}
      </PremiumGate>
    );
  }

  if (loading) return <ScreenState loading />;
  if (!pregnancy || !summary) {
    return (
      <ScreenState
        icon="share-social-outline"
        title="No active pregnancy"
        body="Create a pregnancy profile to share your timeline."
      />
    );
  }

  const hasLatest = !!(summary.latestWeight || summary.latestBP);

  return (
    <Screen
      header={{ variant: 'bar', title: 'Share timeline' }}
      contentStyle={{ paddingTop: SPACE.lg }}
      footer={
        <FooterBar>
          <Button
            title={shareFormat === 'pdf' ? 'Share as PDF' : 'Share my journey'}
            icon="share-outline"
            size="lg"
            fullWidth
            loading={sharing}
            onPress={handleShare}
          />
        </FooterBar>
      }
    >
      <Card style={styles.summary}>
        <View style={styles.summaryHead}>
          <IconTile name="heart-outline" tone="plum" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="headline" numberOfLines={1}>
              {pregnancy.motherName}
            </Text>
            <Text variant="footnote" color="textMuted">
              Week {week} of 40 · {trimesterLabel(week)}
            </Text>
            <Text variant="footnote" color="textMuted">
              Due {longDate(pregnancy.dueDate.toDate())}
            </Text>
          </View>
          {pregnancy.babyName ? <Pill label={pregnancy.babyName} tone="plum" icon="happy-outline" /> : null}
        </View>

        <JournalCounts visits={summary.totalVisits} symptoms={summary.totalSymptoms} milestones={summary.totalMilestones} />

        {hasLatest ? (
          <>
            <Divider />
            <View style={styles.latestRow}>
              {summary.latestWeight ? (
                <View style={styles.latestItem}>
                  <Text variant="overline" color="textMuted">
                    Latest weight
                  </Text>
                  <Text variant="headline" tabular>
                    {summary.latestWeight} kg
                  </Text>
                </View>
              ) : null}
              {summary.latestBP ? (
                <View style={styles.latestItem}>
                  <Text variant="overline" color="textMuted">
                    Latest BP
                  </Text>
                  <Text variant="headline" tabular>
                    {summary.latestBP}
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        ) : null}
      </Card>

      <View>
        <SectionHeader title="Format" />
        <Card padded={false}>
          {FORMATS.map((f, i) => {
            const active = f.value === shareFormat;
            return (
              <ListRow
                key={f.value}
                icon={f.icon}
                tone={active ? 'teal' : 'neutral'}
                title={f.title}
                subtitle={f.subtitle}
                chevron={false}
                onPress={() => setShareFormat(f.value)}
                accessibilityLabel={`${f.title}${active ? ', selected' : ''}`}
                right={
                  <Icon
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={active ? colors.primaryDark : colors.borderStrong}
                  />
                }
                last={i === FORMATS.length - 1}
              />
            );
          })}
        </Card>
      </View>

      <View>
        <SectionHeader title="Preview" />
        {shareFormat === 'text' ? (
          <Card tone="tinted" tint="surfaceSecondary">
            <Text variant="footnote" color="textSecondary" selectable>
              {previewText}
            </Text>
          </Card>
        ) : (
          <Card style={styles.pdfPreview}>
            <IconTile name="document-text-outline" tone="teal" size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="bodyMedium">{pregnancy.motherName}’s Pregnancy Journey</Text>
              <Text variant="footnote" color="textSecondary">
                A one-page PDF with your progress, journal stats
                {hasLatest ? ', latest readings' : ''}
                {summary.totalMilestones > 0 ? ` and ${summary.totalMilestones} milestone${summary.totalMilestones === 1 ? '' : 's'}` : ''}.
              </Text>
            </View>
          </Card>
        )}
      </View>

      <Text variant="footnote" color="textMuted" align="center">
        Your data stays private — it’s only shared when you tap Share.
      </Text>
    </Screen>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    summary: { gap: SPACE.lg },
    summaryHead: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
    latestRow: { flexDirection: 'row', gap: SPACE.md },
    latestItem: { flex: 1, gap: SPACE.xxs },
    pdfPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACE.md,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      borderRadius: RADIUS.lg,
    },
  });
