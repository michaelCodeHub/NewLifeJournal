import React, { useState } from 'react';
import { View } from 'react-native';
import { SPACE } from '../../context/ThemeContext';
import { Button, Chip, Sheet, Text, TextField } from '../ui';

const MAX = 1000;

export function ComposeSheet({
  visible,
  pregnancyWeek,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  /** When set, offers a "Tag Week N" chip. */
  pregnancyWeek?: number;
  onClose: () => void;
  /** Throws on failure; the sheet stays open so nothing typed is lost. */
  onSubmit: (content: string, week?: number) => Promise<void>;
}) {
  const [content, setContent] = useState('');
  const [includeWeek, setIncludeWeek] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const trimmed = content.trim();

  const submit = async () => {
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed, includeWeek ? pregnancyWeek : undefined);
      setContent('');
      setIncludeWeek(false);
    } catch {
      // Caller reports the error; keep the draft.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={submitting ? () => {} : onClose}
      title="New post"
      subtitle="Share how you're doing with other parents"
      footer={<Button title="Post" size="lg" fullWidth loading={submitting} disabled={!trimmed} onPress={submit} />}
    >
      <View style={{ gap: SPACE.xs }}>
        <TextField
          placeholder="What's on your mind?"
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          maxLength={MAX}
          style={{ minHeight: 120 }}
          accessibilityLabel="Post text"
        />
        <Text variant="caption" color={content.length > MAX * 0.9 ? 'orange' : 'textMuted'} align="right" tabular>
          {content.length}/{MAX}
        </Text>
      </View>
      {pregnancyWeek !== undefined ? (
        <View style={{ flexDirection: 'row' }}>
          <Chip
            label={`Tag week ${pregnancyWeek}`}
            icon={includeWeek ? 'checkmark' : 'pricetag-outline'}
            selected={includeWeek}
            onPress={() => setIncludeWeek((v) => !v)}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
