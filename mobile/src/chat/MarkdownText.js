/**
 * Enough Markdown for a chat bubble.
 *
 * MoeAI answers the mobile app exactly as it answers the web: headings, bold,
 * inline code, fenced blocks, lists, and LaTeX. Rendered as plain text that
 * came out as literal asterisks and dollar signs, which reads as broken rather
 * than as formatting.
 *
 * This is deliberately not a Markdown engine. It is a line-wise pass over the
 * handful of constructs a tutor actually uses, because pulling a parser and a
 * renderer into a React Native bundle for bold text is not a trade worth
 * making. Anything it does not recognise falls through as text, which is the
 * right failure: a student sees the words either way.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseBlocks, parseInline } from './markdown';

/** Splits one line into runs of plain text, **bold**, *italic* and `code`. */
function inline(line, key, styles, colors) {
  return parseInline(line).map((run, index) => {
    const id = `${key}-${index}`;
    if (run.type === 'bold') return <Text key={id} style={styles.bold}>{run.text}</Text>;
    if (run.type === 'italic') return <Text key={id} style={styles.italic}>{run.text}</Text>;
    if (run.type === 'code') {
      return <Text key={id} style={[styles.code, { backgroundColor: colors.card, color: colors.accent }]}>{run.text}</Text>;
    }
    return <Text key={id}>{run.text}</Text>;
  });
}

export default function MarkdownText({ text, colors, type, isRTL, baseColor }) {
  const blocks = parseBlocks(text);

  const codeBlock = (block, key) => (
    <ScrollView key={key} horizontal showsHorizontalScrollIndicator={false} style={[styles.block, { backgroundColor: colors.card }]}>
      <Text style={[styles.code, { color: baseColor }, type(12, 'regular', 19)]}>{block.body}</Text>
    </ScrollView>
  );

  return (
    <View>
      {blocks.map((block, index) => {
        const key = `${block.kind}-${index}`;
        if (block.kind === 'gap') return <View key={key} style={styles.gap} />;
        if (block.kind === 'code') return codeBlock(block, key);
        if (block.kind === 'heading') {
          const size = 19 - block.level * 1.5;
          return (
            <Text key={key} style={[styles.heading, { color: baseColor, textAlign: isRTL ? 'right' : 'left' }, type(size, 'bold', size + 7)]}>
              {inline(block.text, key, styles, colors)}
            </Text>
          );
        }
        if (block.kind === 'list') {
          return (
            <View key={key} style={styles.list}>
              {block.items.map((item, i) => (
                <View key={i} style={[styles.listItem, isRTL && styles.listItemRTL]}>
                  <Text style={[{ color: colors.accent }, type(14, 'regular', 21)]}>{item.marker}</Text>
                  <Text style={[styles.flex, { color: baseColor, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 21)]}>
                    {inline(item.text, `${key}-${i}`, styles, colors)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text key={key} style={[{ color: baseColor, textAlign: isRTL ? 'right' : 'left' }, type(14, 'regular', 21)]}>
            {inline(block.text, key, styles, colors)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  code: { fontFamily: 'monospace', paddingHorizontal: 3, borderRadius: 4 },
  block: { borderRadius: 8, padding: 10, marginVertical: 6 },
  heading: { marginTop: 10, marginBottom: 2 },
  list: { marginVertical: 2 },
  listItem: { flexDirection: 'row', gap: 8, paddingVertical: 1 },
  listItemRTL: { flexDirection: 'row-reverse' },
  flex: { flex: 1 },
  gap: { height: 8 },
});
