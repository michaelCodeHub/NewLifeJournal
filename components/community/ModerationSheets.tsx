import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmSheet, OptionSheet, useToast, type Option } from '../ui';
import {
  blockUser,
  reportContent,
  type ReportReason,
  type ReportTarget,
} from '../../services/firebase/communityService';
import type { ModerationAction } from './MoreMenuButton.types';

/** What the overflow (…) menu was opened on. */
export interface ModerationRequest {
  target: ReportTarget;
  authorId: string;
  authorName: string;
  /** The signed-in user wrote it: offer Delete instead of Report/Block. */
  isOwner: boolean;
  /**
   * Already chosen in the native "…" menu (iOS / Android): skip the options sheet and go
   * straight to that step. Absent (web): show the options sheet as before.
   */
  action?: ModerationAction;
}

/** Shown under "Block" in the options sheet, and in the block confirmation after the native menu. */
const BLOCK_DESCRIPTION = "You won't see their posts or comments";

type Step = 'menu' | 'reason' | 'block' | null;
type MenuAction = ModerationAction;

const REASONS: Option<ReportReason>[] = [
  { value: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
  { value: 'harassment', label: 'Harassment', icon: 'sad-outline' },
  { value: 'misinformation', label: 'Medical misinformation', icon: 'alert-circle-outline' },
  { value: 'other', label: 'Other', icon: 'help-circle-outline' },
];

/**
 * The overflow menu for a post or comment and the steps behind it:
 * Report (pick a reason) → toast, Block {author} (confirm), or Delete for your
 * own content (handed back to the caller, which owns its delete confirmation).
 */
export function ModerationSheets({
  request,
  userId,
  onDone,
  onDelete,
  onReported,
  onBlocked,
}: {
  request: ModerationRequest | null;
  userId: string;
  /** Flow finished or was cancelled; clear `request`. */
  onDone: () => void;
  onDelete: (request: ModerationRequest) => void;
  onReported: (target: ReportTarget) => void;
  onBlocked?: (authorId: string) => void;
}) {
  const toast = useToast();
  const [step, setStepState] = useState<Step>(null);
  // OptionSheet calls onSelect then onClose in the same tick, so onClose needs
  // the step chosen by onSelect, not the one captured at render time.
  const stepRef = useRef<Step>(null);
  const setStep = useCallback((s: Step) => {
    stepRef.current = s;
    setStepState(s);
  }, []);

  useEffect(() => {
    if (!request) return setStep(null);
    // From the native menu: the item is already chosen — same next step as the sheet.
    if (request.action === 'report') return setStep('reason');
    if (request.action === 'block') return setStep('block');
    if (request.action === 'delete') {
      onDelete(request);
      setStep(null);
      onDone();
      return;
    }
    setStep('menu');
    // Only a new request starts the flow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, setStep]);

  const finish = useCallback(() => {
    setStep(null);
    onDone();
  }, [onDone, setStep]);

  const noun = request?.target.type === 'comment' ? 'comment' : 'post';
  const author = request?.authorName?.trim() || 'this person';

  const menu = useMemo<Option<MenuAction>[]>(() => {
    if (!request) return [];
    if (request.isOwner) return [{ value: 'delete', label: `Delete ${noun}`, icon: 'trash-outline' }];
    return [
      { value: 'report', label: `Report ${noun}`, icon: 'flag-outline' },
      { value: 'block', label: `Block ${author}`, description: BLOCK_DESCRIPTION, icon: 'ban-outline' },
    ];
  }, [request, noun, author]);

  const onMenuSelect = (action: MenuAction) => {
    if (!request) return;
    if (action === 'report') setStep('reason');
    else if (action === 'block') setStep('block');
    else {
      onDelete(request);
      finish();
    }
  };

  const onReason = async (reason: ReportReason) => {
    if (!request) return;
    const target = request.target;
    finish();
    try {
      await reportContent(userId, target, reason);
      onReported(target);
      toast.show("Thanks — we'll review this.");
    } catch {
      toast.show('Could not send report', 'error');
    }
  };

  return (
    <>
      <OptionSheet<MenuAction>
        visible={step === 'menu'}
        onClose={() => {
          if (stepRef.current === 'menu') finish();
        }}
        title={noun === 'comment' ? 'Comment' : 'Post'}
        options={menu}
        onSelect={onMenuSelect}
      />

      <OptionSheet<ReportReason>
        visible={step === 'reason'}
        onClose={() => {
          if (stepRef.current === 'reason') finish();
        }}
        title={`Why are you reporting this ${noun}?`}
        options={REASONS}
        onSelect={onReason}
      />

      <ConfirmSheet
        visible={step === 'block'}
        onClose={finish}
        title={`Block ${author}?`}
        body={
          // After the native menu the description hasn't been seen yet, so the dialog shows it.
          request?.action === 'block'
            ? `${BLOCK_DESCRIPTION}. They won't be told.`
            : "Their posts and comments will be hidden from you. They won't be told."
        }
        confirmLabel="Block"
        icon="ban-outline"
        onConfirm={async () => {
          if (!request) return;
          try {
            await blockUser(userId, request.authorId, request.authorName);
            onBlocked?.(request.authorId);
            toast.show(`Blocked ${author}`);
          } catch {
            toast.show('Could not block', 'error');
          }
        }}
      />
    </>
  );
}
