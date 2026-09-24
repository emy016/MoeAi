/**
 * An assistant reply: Markdown + math through Youssef's KaTeXMessage, with
 * every fenced block lifted out into an interactive BlockCard. Prose-only
 * replies take the original single-renderer path unchanged.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import KaTeXMessage from './KaTeXMessage';
import BlockCard from './blocks/BlockCard';
import { hasBlocks, splitSegments } from './blocks/segments';

export default React.memo(function RichMessage({ text, color, textAlign, fontStyle, maxWidth, style, onFix }) {
  const segments = useMemo(() => (hasBlocks(text) ? splitSegments(text) : null), [text]);
  if (!segments) {
    return <KaTeXMessage text={text} color={color} textAlign={textAlign} fontStyle={fontStyle} maxWidth={maxWidth} style={style} />;
  }
  return (
    <View style={[styles.column, { width: maxWidth, maxWidth }, style]}>
      {segments.map((segment, index) => segment.type === 'markdown' ? (
        <KaTeXMessage key={`m${index}`} text={segment.text.trim()} color={color} textAlign={textAlign} fontStyle={fontStyle} maxWidth={maxWidth} />
      ) : (
        // Keyed by position and kind, so a block keeps its live page while
        // the rest of the reply streams in around it.
        <BlockCard key={`b${index}-${segment.kind}`} block={segment} onFix={onFix} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  column: { gap: 4 },
});
