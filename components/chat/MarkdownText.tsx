import { memo, useMemo } from 'react';
import { Linking, Platform, StyleSheet, TextStyle, View } from 'react-native';
import { Theme, useThemedStyles, FONT, RADIUS, SPACE } from '../../context/ThemeContext';
import { Text } from '../ui';
import { InlineSpan, parseMarkdown } from '../../lib/markdown';

/**
 * Renders an assistant reply's Markdown with the kit's type scale and theme
 * colours: paragraphs, headings, lists, quotes, code, **bold**, *italic* and
 * links. See lib/markdown.ts for what is supported.
 */
export const MarkdownText = memo(function MarkdownText({
  children,
  streaming = false,
}: {
  children: string;
  /** The reply is still arriving: unclosed markers style the text after them. */
  streaming?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const blocks = useMemo(() => parseMarkdown(children, { streaming }), [children, streaming]);

  return (
    <View style={styles.root}>
      {blocks.map((block, b) => {
        switch (block.type) {
          case 'heading':
            return (
              <Text key={b} variant={block.level === 1 ? 'title2' : 'headline'} accessibilityRole="header" selectable>
                <Inline spans={block.spans} />
              </Text>
            );
          case 'list':
            return (
              <View key={b} style={styles.list}>
                {block.items.map((item, n) => (
                  <View key={n} style={styles.item}>
                    <Text variant="body" color="textSecondary" tabular style={block.ordered ? styles.number : styles.bullet}>
                      {block.ordered ? `${block.start + n}.` : '•'}
                    </Text>
                    <Text variant="body" selectable style={styles.itemText}>
                      <Inline spans={item} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'quote':
            return (
              <View key={b} style={styles.quote}>
                <Text variant="body" color="textSecondary" selectable>
                  <Inline spans={block.spans} />
                </Text>
              </View>
            );
          case 'code':
            return (
              <View key={b} style={styles.codeBlock}>
                <Text variant="callout" selectable style={styles.mono}>
                  {block.text}
                </Text>
              </View>
            );
          case 'divider':
            return <View key={b} style={styles.divider} />;
          default:
            return (
              <Text key={b} variant="body" selectable>
                <Inline spans={block.spans} />
              </Text>
            );
        }
      })}
    </View>
  );
});

function Inline({ spans }: { spans: InlineSpan[] }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <>
      {spans.map((span, i) => {
        const style: TextStyle[] = [];
        if (span.styles.includes('bold')) style.push(styles.bold);
        if (span.styles.includes('italic')) style.push(styles.italic);
        if (span.styles.includes('code')) style.push(styles.code);
        if (span.href) {
          const href = span.href;
          return (
            <Text
              key={i}
              color="primaryDark"
              style={[...style, styles.link]}
              accessibilityRole="link"
              onPress={() => Linking.openURL(href).catch(() => {})}
            >
              {span.text}
            </Text>
          );
        }
        return style.length ? (
          <Text key={i} style={style}>
            {span.text}
          </Text>
        ) : (
          span.text
        );
      })}
    </>
  );
}

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { gap: SPACE.sm },
    // Inter is loaded per weight, so bold is a font family, not fontWeight.
    bold: { fontFamily: FONT.semibold },
    italic: { fontStyle: 'italic' },
    code: { fontFamily: MONO, backgroundColor: colors.surfaceSecondary },
    link: { textDecorationLine: 'underline' },
    list: { gap: SPACE.xs },
    item: { flexDirection: 'row', gap: SPACE.sm },
    bullet: { width: 10, textAlign: 'center' },
    number: { minWidth: 18, textAlign: 'right' },
    itemText: { flex: 1 },
    quote: { borderLeftWidth: 3, borderLeftColor: colors.border, paddingLeft: SPACE.sm + 2 },
    codeBlock: { backgroundColor: colors.surfaceSecondary, borderRadius: RADIUS.sm, padding: SPACE.sm + 2 },
    mono: { fontFamily: MONO },
    divider: { height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginVertical: SPACE.xs },
  });
