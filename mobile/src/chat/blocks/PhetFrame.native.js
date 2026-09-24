/** A PhET simulation in a WebView; it stays on phet.colorado.edu, other links open outside the app. */
import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';

export default function PhetFrame({ url, height, style }) {
  const stayOnPhet = useCallback((request) => {
    if (request.url.startsWith('https://phet.colorado.edu/') || request.url === 'about:blank') return true;
    if (/^https?:/i.test(request.url)) { Linking.openURL(request.url).catch(() => {}); return false; }
    return false;
  }, []);
  return (
    <WebView source={{ uri: url }} onShouldStartLoadWithRequest={stayOnPhet} javaScriptEnabled domStorageEnabled
      allowsFullscreenVideo setSupportMultipleWindows={false} style={[{ height, backgroundColor: '#fff' }, style]} />
  );
}
