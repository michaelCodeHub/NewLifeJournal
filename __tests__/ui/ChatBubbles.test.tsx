import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import { ThemeProvider, FONT } from '../../context/ThemeContext';
import { LiveReply, MessageBubble } from '../../components/chat/MessageBubble';

/**
 * Assistant replies render their Markdown (no raw ** on screen), carry the
 * brand avatar, and the live reply turns from dots into the words in place.
 */

const wrap = (ui: React.ReactElement) => render(<ThemeProvider>{ui}</ThemeProvider>);
const ts = { toMillis: () => 1, toDate: () => new Date(1) } as never;

const flatStyle = (node: { props: { style?: unknown } }) =>
  Object.assign({}, ...([] as unknown[]).concat(node.props.style as never).flat(Infinity).filter(Boolean));

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('renders a reply as formatted text, without the Markdown markers', async () => {
  await wrap(
    <MessageBubble
      message={{
        id: 'm1',
        role: 'assistant',
        timestamp: ts,
        content: 'Here are tips:\n\n- **Position:** Sleep on your side.\n- **Routine:** Keep a bedtime.',
      }}
    />
  );
  expect(screen.queryByText(/\*\*/)).toBeNull();
  const bold = screen.getByText('Position:');
  expect(flatStyle(bold).fontFamily).toBe(FONT.semibold);
  expect(screen.getByText(/Sleep on your side\./)).toBeOnTheScreen();
  expect(screen.getAllByText('•')).toHaveLength(2);
  expect(screen.getAllByLabelText('Bloom & Bump').length).toBeGreaterThan(0);
});

it('keeps your own messages as plain text', async () => {
  await wrap(<MessageBubble message={{ id: 'm2', role: 'user', timestamp: ts, content: 'is **this** ok?' }} />);
  expect(screen.getByText('is **this** ok?')).toBeOnTheScreen();
});

it('shows dots until the first words, then types the reply in', async () => {
  const view = await wrap(<LiveReply text="" />);
  expect(screen.getByLabelText('Assistant is typing')).toBeOnTheScreen();

  await view.rerender(
    <ThemeProvider>
      <LiveReply text="Try **side sleeping** tonight." />
    </ThemeProvider>
  );
  // Let the reveal catch up frame by frame.
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(screen.getByLabelText('Assistant is replying')).toBeOnTheScreen();
  expect(screen.getByText('side sleeping')).toBeOnTheScreen();
  expect(screen.queryByText(/\*\*/)).toBeNull();
});
