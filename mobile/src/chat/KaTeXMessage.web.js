/** Browser chat renderer for responsive CommonMark and KaTeX message content. */
import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import { CHAT_MARKDOWN_CSS, hasMarkdownContent, renderMarkdownMarkup } from './katexMessageUtils';

export default function KaTeXMessage({ text, color, textAlign, fontStyle, maxWidth, style }) {
  const formatted = useMemo(() => hasMarkdownContent(text), [text]);
  const markup = useMemo(() => renderMarkdownMarkup(text), [text]);
  if (!formatted) return <Text style={[style, { color, textAlign, maxWidth, flexShrink: 1 }, fontStyle]}>{text}</Text>;
  const flattened = StyleSheet.flatten([style, fontStyle]) || {};
  return React.createElement('div', {
    'aria-label': text,
    dir: textAlign === 'right' ? 'rtl' : 'ltr',
    dangerouslySetInnerHTML: { __html: `<style>${CHAT_MARKDOWN_CSS}</style><div class="moeai-markdown">${markup}</div>` },
    style: {
      display: 'inline-block',
      color,
      textAlign,
      fontSize: flattened.fontSize,
      lineHeight: flattened.lineHeight ? `${flattened.lineHeight}px` : undefined,
      fontFamily: flattened.fontFamily,
      fontWeight: flattened.fontWeight,
      marginTop: flattened.marginTop,
      maxWidth,
      minWidth: 0,
      overflowWrap: 'anywhere',
      wordBreak: 'break-word',
    },
  });
}
