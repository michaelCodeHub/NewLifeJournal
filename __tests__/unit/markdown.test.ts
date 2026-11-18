import { markdownToPlainText, parseInline, parseMarkdown } from '../../lib/markdown';

const text = (spans: { text: string }[]) => spans.map((s) => s.text).join('');

describe('parseInline', () => {
  it('turns **bold** and *italic* into styles without the markers', () => {
    expect(parseInline('Try **side sleeping** and *rest*.')).toEqual([
      { text: 'Try ', styles: [] },
      { text: 'side sleeping', styles: ['bold'] },
      { text: ' and ', styles: [] },
      { text: 'rest', styles: ['italic'] },
      { text: '.', styles: [] },
    ]);
  });

  it('handles __bold__, `code` and nested emphasis', () => {
    expect(parseInline('__Note:__ use `ml`')).toEqual([
      { text: 'Note:', styles: ['bold'] },
      { text: ' use ', styles: [] },
      { text: 'ml', styles: ['code'] },
    ]);
    expect(parseInline('**very *soft* food**')).toEqual([
      { text: 'very ', styles: ['bold'] },
      { text: 'soft', styles: ['bold', 'italic'] },
      { text: ' food', styles: ['bold'] },
    ]);
  });

  it('leaves arithmetic, snake_case and unmatched markers alone', () => {
    expect(text(parseInline('2 * 3 = 6'))).toBe('2 * 3 = 6');
    expect(parseInline('folic_acid_dose')).toEqual([{ text: 'folic_acid_dose', styles: [] }]);
    expect(parseInline('a **b')).toEqual([{ text: 'a **b', styles: [] }]);
  });

  it('keeps safe links and drops unsafe ones to plain text', () => {
    expect(parseInline('See [NHS](https://www.nhs.uk) now')).toEqual([
      { text: 'See ', styles: [] },
      { text: 'NHS', styles: [], href: 'https://www.nhs.uk' },
      { text: ' now', styles: [] },
    ]);
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ text: 'x', styles: [] }]);
  });

  it('honours backslash escapes', () => {
    expect(parseInline('\\*not italic\\*')).toEqual([{ text: '*not italic*', styles: [] }]);
  });

  it('while streaming, styles text after an unclosed marker instead of showing it', () => {
    expect(parseInline('Try **side sle', { streaming: true })).toEqual([
      { text: 'Try ', styles: [] },
      { text: 'side sle', styles: ['bold'] },
    ]);
    // A marker at the very end shows nothing yet.
    expect(text(parseInline('Rest **', { streaming: true }))).toBe('Rest **');
  });
});

describe('parseMarkdown', () => {
  it('reads the shape of a typical reply', () => {
    const reply = [
      'Here are 3 gentle tips:',
      '',
      '- **Position:** Sleep on your side.',
      '- **Routine:** Keep a regular bedtime.',
      '',
      '1. First',
      '2. Second',
      '',
      '## When to call',
      '> Call your midwife if it is severe.',
      '',
      '---',
      '```',
      'code line',
      '```',
    ].join('\n');
    const blocks = parseMarkdown(reply);
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'list', 'list', 'heading', 'quote', 'divider', 'code']);

    const bullets = blocks[1] as Extract<(typeof blocks)[number], { type: 'list' }>;
    expect(bullets.ordered).toBe(false);
    expect(bullets.items).toHaveLength(2);
    expect(bullets.items[0][0]).toEqual({ text: 'Position:', styles: ['bold'] });

    const numbered = blocks[2] as Extract<(typeof blocks)[number], { type: 'list' }>;
    expect(numbered).toMatchObject({ ordered: true, start: 1 });
    expect(blocks[3]).toMatchObject({ type: 'heading', level: 2 });
    expect(blocks[6]).toEqual({ type: 'code', text: 'code line' });
  });

  it('joins wrapped lines of a paragraph and keeps a list item continuation', () => {
    const blocks = parseMarkdown('one\ntwo\n\n- item\n  more');
    expect(blocks[0]).toEqual({ type: 'paragraph', spans: [{ text: 'one\ntwo', styles: [] }] });
    expect(text((blocks[1] as any).items[0])).toBe('item\nmore');
  });

  it('keeps a numbered list together across blank lines and starts at its first number', () => {
    const blocks = parseMarkdown('3. c\n\n4. d');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'list', ordered: true, start: 3 });
  });

  it('copes with CRLF and an unterminated code fence while streaming', () => {
    expect(parseMarkdown('a\r\n\r\nb').map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
    expect(parseMarkdown('```\npartial', { streaming: true })).toEqual([{ type: 'code', text: 'partial' }]);
  });
});

describe('markdownToPlainText', () => {
  it('drops the markers and keeps list markers readable', () => {
    expect(markdownToPlainText('**Hi** there\n\n- a\n- *b*')).toBe('Hi there\n\n• a\n• b');
  });
});
