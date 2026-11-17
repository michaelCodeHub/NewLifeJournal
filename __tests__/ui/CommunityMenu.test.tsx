import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ThemeProvider, LIGHT_COLORS } from '../../context/ThemeContext';
import CommunityScreen from '../../app/(pregnancy)/community';
import { CommentsSheet } from '../../components/community/CommentsSheet';
import type { MoreMenuButtonProps } from '../../components/community/MoreMenuButton.types';
import { blockUser, reportContent } from '../../services/firebase/communityService';
import { trackEvent } from '../../services/monitoring/analytics';

/**
 * Community "…" → native anchored menu on iOS / Android, today's sheet on web.
 * Jest renders the iOS menu on the screens; the Android and web buttons are loaded
 * explicitly below. Report, Delete and the services they call are unchanged; Block is a
 * destructive item that only blocks after the confirmation.
 */

jest.mock('../../services/monitoring/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'me', displayName: 'Me', photoURL: null }, userProfile: { name: 'Me' } }),
}));
jest.mock('../../context/SubscriptionContext', () => ({ useSubscription: () => ({ isPremium: true }) }));
jest.mock('../../context/PregnancyContext', () => ({ usePregnancy: () => ({ pregnancy: null, getCurrentWeek: () => 0 }) }));

const mockTs = () => ({ toDate: () => new Date(Date.now() - 3600000), toMillis: () => Date.now() - 3600000, seconds: 0, nanoseconds: 0 });
const mockPosts = [
  { id: 'p-ann', userId: 'ann', authorName: 'Ann', authorPhoto: null, content: 'Hello from Ann', likesCount: 0, commentsCount: 1, createdAt: mockTs(), updatedAt: mockTs() },
  { id: 'p-me', userId: 'me', authorName: 'Me', authorPhoto: null, content: 'My own post', likesCount: 0, commentsCount: 0, createdAt: mockTs(), updatedAt: mockTs() },
];
const mockComments = [{ id: 'c1', userId: 'ann', authorName: 'Ann', authorPhoto: null, content: 'A comment', createdAt: mockTs() }];

jest.mock('../../services/firebase/communityService', () => ({
  ...jest.requireActual('../../services/firebase/communityService'),
  subscribeToPosts: jest.fn((cb: (p: unknown[]) => void) => {
    cb(mockPosts);
    return () => {};
  }),
  subscribeToComments: jest.fn((_id: string, cb: (c: unknown[]) => void) => {
    cb(mockComments);
    return () => {};
  }),
  subscribeToBlockedUsers: jest.fn(() => () => {}),
  getUserLikedPosts: jest.fn(async () => new Set()),
  reportContent: jest.fn(async () => {}),
  blockUser: jest.fn(async () => {}),
  deletePost: jest.fn(async () => {}),
  deleteComment: jest.fn(async () => {}),
  createPost: jest.fn(async () => {}),
  addComment: jest.fn(async () => {}),
  toggleLike: jest.fn(async () => {}),
}));

const mockBlock = blockUser as jest.Mock;
const mockReport = reportContent as jest.Mock;

const menus = () => screen.container.queryAll((n) => n.type === 'ExpoUI.Menu');
const menuFor = (label: string) => {
  const m = menus().find((n) => n.props.modifiers?.[0]?.args?.[0] === label);
  if (!m) throw new Error(`no menu "${label}"`);
  return m;
};
const itemsOf = (menu: { queryAll: (p: (n: { type: unknown }) => boolean) => { props: Record<string, any> }[] }) =>
  menu.queryAll((n) => n.type === 'ExpoUI.Button');
const pick = async (menuLabel: string, item: string) => {
  const btn = itemsOf(menuFor(menuLabel) as never).find((b) => b.props.label === item);
  if (!btn) throw new Error(`no item "${item}"`);
  await fireEvent(btn as never, 'press');
};

beforeEach(async () => {
  await AsyncStorage.clear();
  mockBlock.mockClear();
  mockReport.mockClear();
  (trackEvent as jest.Mock).mockClear();
});

describe('Community screen (iOS native menu)', () => {
  async function renderCommunity() {
    await render(
      <ThemeProvider>
        <CommunityScreen />
      </ThemeProvider>
    );
    await waitFor(() => expect(menus()).toHaveLength(2));
  }

  it('the "…" on each post is a native menu with the same labels; Block is destructive', async () => {
    await renderCommunity();
    const ann = itemsOf(menuFor("More options for Ann's post") as never).map((b) => [b.props.label, b.props.role]);
    expect(ann).toEqual([
      ['Report post', 'default'],
      ['Block Ann', 'destructive'],
    ]);
    const mine = itemsOf(menuFor("More options for Me's post") as never).map((b) => b.props.label);
    expect(mine).toEqual(['Delete post']);
  });

  it('Block asks first — with the old description, Cancel and Block — and Cancel blocks nobody', async () => {
    await renderCommunity();
    await pick("More options for Ann's post", 'Block Ann');
    expect(screen.getByText('Block Ann?')).toBeOnTheScreen();
    expect(screen.getByText("You won't see their posts or comments. They won't be told.")).toBeOnTheScreen();
    expect(screen.getByText('Cancel')).toBeOnTheScreen();
    expect(mockBlock).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Cancel'));
    expect(mockBlock).not.toHaveBeenCalled();
  });

  it('confirming Block blocks the author', async () => {
    await renderCommunity();
    await pick("More options for Ann's post", 'Block Ann');
    await fireEvent.press(screen.getByText('Block'));
    await waitFor(() => expect(mockBlock).toHaveBeenCalledWith('me', 'ann', 'Ann'));
  });

  it('Report goes to the same reason sheet and reports the post', async () => {
    await renderCommunity();
    await pick("More options for Ann's post", 'Report post');
    expect(screen.getByText('Why are you reporting this post?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Spam'));
    await waitFor(() => expect(mockReport).toHaveBeenCalledWith('me', { type: 'post', postId: 'p-ann' }, 'spam'));
    expect(mockBlock).not.toHaveBeenCalled();
  });

  it('Delete on your own post opens the same delete confirmation', async () => {
    await renderCommunity();
    await pick("More options for Me's post", 'Delete post');
    expect(screen.getByText('Delete this post?')).toBeOnTheScreen();
  });

  it('fires no analytics event of its own (none existed in this flow before)', async () => {
    await renderCommunity();
    await pick("More options for Ann's post", 'Report post');
    await fireEvent.press(screen.getByText('Spam'));
    await waitFor(() => expect(mockReport).toHaveBeenCalled());
    expect(trackEvent).not.toHaveBeenCalled();
  });
});

describe('Comments sheet (iOS native menu)', () => {
  async function renderComments(onHide = jest.fn()) {
    await render(
      <ThemeProvider>
        <CommentsSheet
          visible
          post={mockPosts[0] as never}
          me={{ id: 'me', name: 'Me', photo: null }}
          blocked={new Set()}
          hidden={new Set()}
          onHide={onHide}
          onClose={() => {}}
        />
      </ThemeProvider>
    );
    await waitFor(() => expect(menus()).toHaveLength(1));
    return onHide;
  }

  it('comment menu: Report comment / Block Ann (destructive)', async () => {
    await renderComments();
    expect(itemsOf(menuFor("More options for Ann's comment") as never).map((b) => [b.props.label, b.props.role])).toEqual([
      ['Report comment', 'default'],
      ['Block Ann', 'destructive'],
    ]);
  });

  it('reporting a comment works as before and hides it', async () => {
    const onHide = await renderComments();
    await pick("More options for Ann's comment", 'Report comment');
    expect(screen.getByText('Why are you reporting this comment?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Harassment'));
    await waitFor(() =>
      expect(mockReport).toHaveBeenCalledWith('me', { type: 'comment', postId: 'p-ann', commentId: 'c1' }, 'harassment')
    );
    await waitFor(() => expect(onHide).toHaveBeenCalled());
  });

  it('blocking from a comment also asks first', async () => {
    await renderComments();
    await pick("More options for Ann's comment", 'Block Ann');
    expect(screen.getByText("You won't see their posts or comments. They won't be told.")).toBeOnTheScreen();
    expect(mockBlock).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('Block'));
    await waitFor(() => expect(mockBlock).toHaveBeenCalledWith('me', 'ann', 'Ann'));
  });
});

describe('MoreMenuButton on Android and web', () => {
  type Btn = React.FC<MoreMenuButtonProps>;
  const { MoreMenuButton: AndroidButton } = require('../../components/community/MoreMenuButton.android.tsx') as { MoreMenuButton: Btn };
  const { MoreMenuButton: WebButton } = require('../../components/community/MoreMenuButton.tsx') as { MoreMenuButton: Btn };
  const base = { isOwner: false, noun: 'post' as const, authorName: 'Ann', accessibilityLabel: "More options for Ann's post", size: 30, iconSize: 20 };

  it('Android: the same "…" button opens a Material menu anchored to it; Block in the error colour', async () => {
    const onSelect = jest.fn();
    await render(
      <ThemeProvider>
        <AndroidButton {...base} onSelect={onSelect} />
      </ThemeProvider>
    );
    const dropdown = () => screen.container.queryAll((n) => n.type === 'ExpoUI.DropdownMenu')[0];
    expect(dropdown().props.expanded).toBe(false);
    await fireEvent.press(screen.getByLabelText("More options for Ann's post"));
    expect(dropdown().props.expanded).toBe(true);
    const items = screen.container.queryAll((n) => n.type === 'ExpoUI.DropdownMenuItem');
    expect(items.map((i) => i.props.elementColors.textColor)).toEqual([LIGHT_COLORS.textPrimary, LIGHT_COLORS.red]);
    expect(screen.getByText('Block Ann')).toBeOnTheScreen();
    await fireEvent(items[1], 'click');
    expect(onSelect).toHaveBeenCalledWith('block');
    expect(dropdown().props.expanded).toBe(false);
  });

  it('web: the "…" button keeps opening the options sheet (no action chosen)', async () => {
    const onSelect = jest.fn();
    await render(
      <ThemeProvider>
        <WebButton {...base} onSelect={onSelect} />
      </ThemeProvider>
    );
    expect(screen.container.queryAll((n) => n.type === 'ExpoUI.Menu')).toHaveLength(0);
    await fireEvent.press(screen.getByLabelText("More options for Ann's post"));
    expect(onSelect).toHaveBeenCalledWith();
  });
});

describe('web flow (no action chosen) is unchanged', () => {
  const { ModerationSheets } = require('../../components/community/ModerationSheets') as typeof import('../../components/community/ModerationSheets');

  it('opens the options sheet with the Block description, then the original confirmation', async () => {
    await render(
      <ThemeProvider>
        <ModerationSheets
          request={{ target: { type: 'post', postId: 'p-ann' }, authorId: 'ann', authorName: 'Ann', isOwner: false }}
          userId="me"
          onDone={() => {}}
          onDelete={() => {}}
          onReported={() => {}}
        />
      </ThemeProvider>
    );
    expect(screen.getByText('Report post')).toBeOnTheScreen();
    expect(screen.getByText("You won't see their posts or comments")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Block Ann'));
    expect(await screen.findByText("Their posts and comments will be hidden from you. They won't be told.")).toBeOnTheScreen();
    expect(mockBlock).not.toHaveBeenCalled();
  });
});
