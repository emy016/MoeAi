/** Native chat renderer for responsive CommonMark and KaTeX message content. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { createMarkdownDocument, hasMarkdownContent } from './katexMessageUtils';

export default function KaTeXMessage({ text, color, textAlign, fontStyle, maxWidth, style }) {
  const formatted = useMemo(() => hasMarkdownContent(text), [text]);
  const initialHeight = Math.max(fontStyle?.lineHeight || 20, 24);
  const [layout, setLayout] = useState({ width: maxWidth, height: initialHeight });
  const source = useMemo(() => ({
    html: createMarkdownDocument(text, {
      color,
      fontSize: fontStyle?.fontSize,
      lineHeight: fontStyle?.lineHeight,
      textAlign,
    }),
  }), [color, fontStyle?.fontSize, fontStyle?.lineHeight, text, textAlign]);
  useEffect(() => {
    setLayout((current) => ({ ...current, width: Math.min(current.width, maxWidth) }));
  }, [maxWidth]);
  const resize = useCallback((event) => {
    try {
      const next = JSON.parse(event.nativeEvent.data);
      const width = Math.max(1, Math.min(maxWidth, Math.ceil(Number(next.width) || maxWidth)));
      const height = Math.max(1, Math.ceil(Number(next.height) || initialHeight));
      setLayout((current) => current.width === width && current.height === height ? current : { width, height });
    } catch (_) {}
  }, [initialHeight, maxWidth]);
  const openLink = useCallback((request) => {
    if (request.url === 'about:blank' || request.url.startsWith('data:text/html')) return true;
    if (/^(https?:|mailto:)/i.test(request.url)) Linking.openURL(request.url).catch(() => {});
    return false;
  }, []);

  if (!formatted) return <Text style={[styles.plainText, style, { color, textAlign, maxWidth }, fontStyle]}>{text}</Text>;
  return (
    <View style={[style, { width: layout.width, maxWidth, height: layout.height }]} accessible accessibilityLabel={text}>
      <WebView
        originWhitelist={['*']}
        source={source}
        onMessage={resize}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled
        setSupportMultipleWindows={false}
        onShouldStartLoadWithRequest={openLink}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  plainText: { flexShrink: 1 },
  webView: { flex: 1, backgroundColor: 'transparent' },
  webViewContainer: { backgroundColor: 'transparent' },
});
