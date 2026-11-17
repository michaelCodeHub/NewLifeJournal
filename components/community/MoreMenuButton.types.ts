/** What a moderation menu item does. Same actions as the old overflow sheet. */
export type ModerationAction = 'report' | 'block' | 'delete';

export interface MoreMenuButtonProps {
  /** The signed-in user wrote it: offer Delete instead of Report / Block. */
  isOwner: boolean;
  noun: 'post' | 'comment';
  authorName: string;
  /** The trigger's screen-reader label (unchanged from the old "…" button). */
  accessibilityLabel: string;
  /** Trigger size, as the old IconButton (posts 30 / 20, comments 24 / 16). */
  size: number;
  iconSize: number;
  /**
   * iOS / Android: called with the chosen item. Web: called with no action when the
   * "…" is tapped, and the caller opens today's options sheet.
   */
  onSelect: (action?: ModerationAction) => void;
}

export interface ModerationItem {
  action: ModerationAction;
  label: string;
  destructive: boolean;
}

/** The menu items — the same labels as the old overflow sheet; Block is destructive. */
export function moderationItems(isOwner: boolean, noun: 'post' | 'comment', authorName: string): ModerationItem[] {
  if (isOwner) return [{ action: 'delete', label: `Delete ${noun}`, destructive: false }];
  const author = authorName.trim() || 'this person';
  return [
    { action: 'report', label: `Report ${noun}`, destructive: false },
    { action: 'block', label: `Block ${author}`, destructive: true },
  ];
}
