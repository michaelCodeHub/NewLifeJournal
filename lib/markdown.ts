/**
 * A small Markdown reader for assistant replies. It covers what chat answers
 * actually use (paragraphs, headings, bullet and numbered lists, quotes, code,
 * dividers, **bold**, *italic*, `code` and [links](https://…)) and nothing
 * else, so there is no HTML, no images and no tables to worry about.
 *
 * `streaming` is for a reply that is still being written: an emphasis marker
 * that hasn't been closed yet styles the text after it instead of showing the
 * raw `**`, so the formatting doesn't flicker as the words arrive.
 */

export type InlineStyle = 'bold' | 'italic' | 'code';

export interface InlineSpan {
  text: string;
  styles: InlineStyle[];
  /** Set for [label](url) links (http/https/mailto/tel only). */
  href?: string;
}

export type MarkdownBlock =
  | { type: 'paragraph'; spans: InlineSpan[] }
  | { type: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { type: 'list'; ordered: boolean; start: number; items: InlineSpan[][] }
  | { type: 'quote'; spans: InlineSpan[] }
  | { type: 'code'; text: string }
  | { type: 'divider' };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s{0,3}[-*+•]\s+(.*)$/;
const ORDERED = /^\s{0,3}(\d{1,3})[.)]\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const DIVIDER = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const FENCE = /^\s{0,3}(```|~~~)/;
/** An indented line inside a list item continues that item. */
const CONTINUATION = /^\s{2,}\S/;
const SAFE_LINK = /^(https?:\/\/|mailto:|tel:)/i;

export function parseMarkdown(source: string, { streaming = false }: { streaming?: boolean } = {}): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  const inline = (text: string) => parseInline(text, { streaming });

  let paragraph: string[] = [];
  const endParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', spans: inline(paragraph.join('\n')) });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.trim()) {
      endParagraph();
      continue;
    }

    if (FENCE.test(line)) {
      endParagraph();
      const fence = line.trim().slice(0, 3);
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(fence)) code.push(lines[i++]);
      blocks.push({ type: 'code', text: code.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      endParagraph();
      const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, spans: inline(heading[2]) });
      continue;
    }

    if (DIVIDER.test(line)) {
      endParagraph();
      blocks.push({ type: 'divider' });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = bullet ? null : ORDERED.exec(line);
    if (bullet || ordered) {
      endParagraph();
      const isOrdered = !!ordered;
      const items: string[] = [];
      const start = ordered ? parseInt(ordered[1], 10) : 1;
      // Collect this list's items (and their indented continuation lines).
      while (i < lines.length) {
        const l = lines[i];
        const b = BULLET.exec(l);
        const o = b ? null : ORDERED.exec(l);
        if ((isOrdered && o) || (!isOrdered && b)) {
          items.push((o ? o[2] : b![1]).trim());
          i++;
        } else if (items.length && CONTINUATION.test(l) && !(BULLET.test(l) || ORDERED.test(l))) {
          items[items.length - 1] += '\n' + l.trim();
          i++;
        } else if (items.length && !l.trim() && i + 1 < lines.length && (isOrdered ? ORDERED : BULLET).test(lines[i + 1])) {
          i++; // a blank line between items of the same list
        } else if (CONTINUATION.test(l) && (BULLET.test(l) || ORDERED.test(l)) && items.length) {
          // A nested list item: kept as its own line in the parent item.
          items[items.length - 1] += '\n• ' + (BULLET.exec(l)?.[1] ?? ORDERED.exec(l)?.[2] ?? '').trim();
          i++;
        } else break;
      }
      i--;
      blocks.push({ type: 'list', ordered: isOrdered, start, items: items.map(inline) });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      endParagraph();
      const quoted: string[] = [quote[1]];
      while (i + 1 < lines.length && QUOTE.test(lines[i + 1])) quoted.push(QUOTE.exec(lines[++i])![1]);
      blocks.push({ type: 'quote', spans: inline(quoted.join('\n')) });
      continue;
    }

    paragraph.push(line.trim());
  }
  endParagraph();
  return blocks;
}

/** Inline emphasis, code and links. Unmatched markers stay as plain text (unless streaming). */
export function parseInline(text: string, { streaming = false }: { streaming?: boolean } = {}): InlineSpan[] {
  const spans: InlineSpan[] = [];
  const push = (t: string, styles: InlineStyle[], href?: string) => {
    if (!t) return;
    const last = spans[spans.length - 1];
    if (last && !href && !last.href && sameStyles(last.styles, styles)) last.text += t;
    else spans.push({ text: t, styles, ...(href ? { href } : {}) });
  };

  const walk = (s: string, styles: InlineStyle[]) => {
    let i = 0;
    let plain = '';
    const flush = () => {
      push(plain, styles);
      plain = '';
    };
    while (i < s.length) {
      const ch = s[i];

      // Backslash escape: \* \_ \` \[ etc.
      if (ch === '\\' && i + 1 < s.length && /[\\`*_[\]()#>~-]/.test(s[i + 1])) {
        plain += s[i + 1];
        i += 2;
        continue;
      }

      if (ch === '`') {
        const end = s.indexOf('`', i + 1);
        if (end > i + 1) {
          flush();
          push(s.slice(i + 1, end), [...styles, 'code']);
          i = end + 1;
          continue;
        }
        if (streaming && end < 0 && i + 1 < s.length) {
          flush();
          push(s.slice(i + 1), [...styles, 'code']);
          return;
        }
      }

      if (ch === '[') {
        const close = s.indexOf('](', i + 1);
        const end = close > i ? matchingParen(s, close + 1) : -1;
        if (close > i && end > close) {
          const label = s.slice(i + 1, close);
          const url = s.slice(close + 2, end).trim();
          flush();
          if (SAFE_LINK.test(url)) push(label, styles, url);
          else walk(label, styles);
          i = end + 1;
          continue;
        }
      }

      const marker = s.startsWith('**', i) ? '**' : s.startsWith('__', i) ? '__' : ch === '*' || ch === '_' ? ch : null;
      if (marker && canOpen(s, i, marker)) {
        const style: InlineStyle = marker.length === 2 ? 'bold' : 'italic';
        const end = findClose(s, i + marker.length, marker);
        if (end > 0) {
          flush();
          walk(s.slice(i + marker.length, end), styles.includes(style) ? styles : [...styles, style]);
          i = end + marker.length;
          continue;
        }
        if (streaming) {
          // Still being written: style what follows rather than showing the marker.
          flush();
          walk(s.slice(i + marker.length), styles.includes(style) ? styles : [...styles, style]);
          return;
        }
      }

      plain += ch;
      i++;
    }
    flush();
  };

  walk(text, []);
  return spans;
}

/** Index of the ")" that closes the "(" at `open`, allowing balanced parentheses inside (URLs). */
function matchingParen(s: string, open: number) {
  let depth = 0;
  for (let j = open; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')' && --depth === 0) return j;
  }
  return -1;
}

function sameStyles(a: InlineStyle[], b: InlineStyle[]) {
  return a.length === b.length && a.every((s) => b.includes(s));
}

const WORD = /[\p{L}\p{N}]/u;

/** A marker opens emphasis only before a non-space; `_` also not inside a word (snake_case). */
function canOpen(s: string, i: number, marker: string) {
  const next = s[i + marker.length];
  if (!next || /\s/.test(next)) return false;
  if (marker[0] === '_' && i > 0 && WORD.test(s[i - 1])) return false;
  // "2 * 3": a lone * between spaces is arithmetic, not emphasis.
  return true;
}

function findClose(s: string, from: number, marker: string) {
  let j = from;
  while (j < s.length) {
    const at = s.indexOf(marker, j);
    if (at < 0) return -1;
    const before = s[at - 1];
    const after = s[at + marker.length];
    const closes =
      at > from &&
      before !== undefined &&
      !/\s/.test(before) &&
      // A single * must not be the first half of a ** pair.
      !(marker.length === 1 && after === marker) &&
      !(marker[0] === '_' && after !== undefined && WORD.test(after));
    if (closes) return at;
    j = at + marker.length;
  }
  return -1;
}

/** The plain text of a reply (for copying, accessibility and previews). */
export function markdownToPlainText(source: string): string {
  return parseMarkdown(source)
    .map((b) => {
      switch (b.type) {
        case 'divider':
          return '';
        case 'code':
          return b.text;
        case 'list':
          return b.items.map((it, n) => `${b.ordered ? `${b.start + n}.` : '•'} ${spansText(it)}`).join('\n');
        default:
          return spansText(b.spans);
      }
    })
    .join('\n\n')
    .trim();
}

const spansText = (spans: InlineSpan[]) => spans.map((s) => s.text).join('');
