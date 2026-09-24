/** A block's page in a WebView: its own JS context, links open outside the app. */
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

const SandboxFrame = forwardRef(function SandboxFrame({ html, frameId, height, onMessage, style }, ref) {
  const view = useRef(null);
  const source = useMemo(() => ({ html, baseUrl: 'https://moe-ai-sable.vercel.app/' }), [html]);

  useImperativeHandle(ref, () => ({
    send(command) { view.current?.injectJavaScript(`window.__moeaiCommand && window.__moeaiCommand(${JSON.stringify(command)}); true;`); },
  }), []);

  const receive = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data?.__moeai === frameId) onMessage?.(data);
    } catch (_) {}
  }, [frameId, onMessage]);

  const openLink = useCallback((request) => {
    if (request.url === 'about:blank' || request.url.startsWith('data:') || request.url.startsWith('https://moe-ai-sable.vercel.app/')) return true;
    if (/^https?:/i.test(request.url) && request.navigationType === 'click') { Linking.openURL(request.url).catch(() => {}); return false; }
    return true;
  }, []);

  return (
    <WebView
      ref={view}
      originWhitelist={['*']}
      source={source}
      onMessage={receive}
      onShouldStartLoadWithRequest={openLink}
      javaScriptEnabled
      setSupportMultipleWindows={false}
      nestedScrollEnabled
      style={[{ height, backgroundColor: 'transparent' }, style]}
    />
  );
});

export default SandboxFrame;
