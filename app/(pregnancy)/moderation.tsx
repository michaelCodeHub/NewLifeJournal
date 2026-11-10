import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { SPACE } from '../../context/ThemeContext';
import { useIsModerator } from '../../hooks/useIsModerator';
import {
  Button,
  Card,
  ConfirmSheet,
  EmptyState,
  Pill,
  Screen,
  ScreenState,
  SegmentedControl,
  Text,
  Tone,
  useToast,
} from '../../components/ui';
import { timeAgo } from '../../components/community/shared';
import {
  getReportedContent,
  resolveReport,
  subscribeToReports,
  type Report,
  type ReportReason,
} from '../../services/firebase/communityService';

const HEADER = { title: 'Moderation', variant: 'bar' as const };

const REASON: Record<ReportReason, { label: string; tone: Tone }> = {
  spam: { label: 'Spam', tone: 'neutral' },
  harassment: { label: 'Harassment', tone: 'red' },
  misinformation: { label: 'Medical misinformation', tone: 'orange' },
  other: { label: 'Other', tone: 'neutral' },
};

type Tab = 'open' | 'closed';
type Preview = { authorName: string; content: string } | null | undefined; // undefined = loading, null = gone

/** Report queue for accounts with the moderator claim (Profile → Moderation). */
export default function ModerationScreen() {
  const { user } = useAuth();
  const isModerator = useIsModerator(user?.uid);
  const [reports, setReports] = useState<Report[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('open');

  useEffect(() => {
    if (!isModerator) return;
    return subscribeToReports(setReports, () => setFailed(true));
  }, [isModerator]);

  const visible = useMemo(
    () => (reports ?? []).filter((r) => (tab === 'open' ? r.status === 'open' : r.status !== 'open')),
    [reports, tab]
  );

  if (isModerator === null) {
    return (
      <Screen header={HEADER} scroll={false}>
        <ScreenState loading />
      </Screen>
    );
  }
  if (!isModerator) {
    return (
      <Screen header={HEADER} scroll={false}>
        <ScreenState icon="lock-closed-outline" title="Moderators only" body="This account can’t review reports." />
      </Screen>
    );
  }
  if (failed) {
    return (
      <Screen header={HEADER} scroll={false}>
        <ScreenState icon="cloud-offline-outline" title="Couldn’t load reports" body="Check your connection and try again." />
      </Screen>
    );
  }
  if (!reports) {
    return (
      <Screen header={HEADER} scroll={false}>
        <ScreenState loading />
      </Screen>
    );
  }

  return (
    <Screen header={HEADER} contentStyle={styles.body}>
      <SegmentedControl<Tab>
        options={[
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {visible.length === 0 ? (
        <EmptyState
          icon="checkmark-done-outline"
          tone="green"
          title={tab === 'open' ? 'All caught up' : 'Nothing closed yet'}
          body={tab === 'open' ? 'New reports from the community will show up here.' : undefined}
        />
      ) : (
        visible.map((r) => <ReportCard key={r.id} report={r} moderatorId={user!.uid} />)
      )}
    </Screen>
  );
}

function ReportCard({ report, moderatorId }: { report: Report; moderatorId: string }) {
  const toast = useToast();
  const [preview, setPreview] = useState<Preview>(undefined);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [busy, setBusy] = useState(false);
  const { targetType, postId, commentId } = report;
  const open = report.status === 'open';
  const noun = report.targetType === 'comment' ? 'comment' : 'post';
  const reason = REASON[report.reason] ?? REASON.other;

  useEffect(() => {
    let active = true;
    getReportedContent({ targetType, postId, commentId })
      .then((p) => active && setPreview(p))
      .catch(() => active && setPreview(null));
    return () => {
      active = false;
    };
    // Re-check after a status change so a removed item reads as deleted.
  }, [targetType, postId, commentId, report.status]);

  const close = async (action: 'dismissed' | 'removed') => {
    setBusy(true);
    try {
      await resolveReport(report, moderatorId, action);
      toast.show(action === 'removed' ? `${noun === 'post' ? 'Post' : 'Comment'} removed` : 'Report dismissed');
    } catch {
      toast.show('Could not update the report', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.meta}>
        <Pill label={reason.label} tone={reason.tone} />
        <Text variant="caption" color="textMuted" style={styles.flex}>
          {noun === 'post' ? 'Post' : 'Comment'} · {timeAgo(report.createdAt)}
        </Text>
        {!open ? (
          <Pill label={report.status === 'removed' ? 'Removed' : 'Dismissed'} tone={report.status === 'removed' ? 'red' : 'green'} />
        ) : null}
      </View>

      {preview === undefined ? (
        <Text variant="callout" color="textMuted">
          Loading…
        </Text>
      ) : preview === null ? (
        <Text variant="callout" color="textMuted">
          {report.status === 'removed' ? 'Removed from Community.' : `This ${noun} has already been deleted.`}
        </Text>
      ) : (
        <View style={styles.preview}>
          <Text variant="calloutMedium">{preview.authorName}</Text>
          <Text variant="body" color="textSecondary" numberOfLines={6}>
            {preview.content}
          </Text>
        </View>
      )}

      {open ? (
        <View style={styles.actions}>
          <Button title="Keep" size="sm" variant="secondary" disabled={busy} onPress={() => close('dismissed')} style={styles.flex} />
          <Button
            title={preview === null ? 'Close' : `Remove ${noun}`}
            size="sm"
            variant={preview === null ? 'secondary' : 'danger'}
            disabled={busy || preview === undefined}
            onPress={() => (preview === null ? close('dismissed') : setConfirmRemove(true))}
            style={styles.flex}
          />
        </View>
      ) : null}

      <ConfirmSheet
        visible={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        destructive
        title={`Remove this ${noun}?`}
        body={`It’s deleted for everyone. ${preview?.authorName ?? 'The author'} isn’t notified.`}
        confirmLabel="Remove"
        onConfirm={() => close('removed')}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: SPACE.md },
  card: { gap: SPACE.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  flex: { flex: 1 },
  preview: { gap: SPACE.xxs },
  actions: { flexDirection: 'row', gap: SPACE.sm },
});
