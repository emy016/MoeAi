/**
 * An assistant reply: Markdown + math through Youssef's KaTeXMessage, with
 * every fenced block lifted out into an interactive BlockCard. Prose-only
 * replies take the original single-renderer path unchanged.
 */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import KaTeXMessage from './KaTeXMessage';
import BlockCard from './blocks/BlockCard';
import PhetCard from './blocks/PhetCard';
import QuestionCard from './blocks/QuestionCard';
import FlashcardsCard from './blocks/FlashcardsCard';
import { hasBlocks, splitSegments } from './blocks/segments';

/** Math wrapped in a code span (`$A^T$`) is still math: models do this, and it rendered as raw source. */
const unwrapMath = (value) => String(value || '').replace(/`(\${1,2}[^`\n]+?\${1,2})`/g, '$1');

export default React.memo(function RichMessage({ text: rawText, color, textAlign, fontStyle, maxWidth, style, onFix }) {
  const text = useMemo(() => unwrapMath(rawText), [rawText]);
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
        segment.kind === 'phet'
          ? <PhetCard key={`b${index}-phet`} block={segment} onAsk={onFix} />
          : segment.kind === 'ask'
            ? <QuestionCard key={`b${index}-ask`} block={segment} onSend={onFix} />
            : segment.kind === 'flashcards'
            ? <FlashcardsCard key={`b${index}-cards`} block={segment} maxWidth={maxWidth} />
            : <BlockCard key={`b${index}-${segment.kind}`} block={segment} onFix={onFix} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  column: { gap: 4 },
});
