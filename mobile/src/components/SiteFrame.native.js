/** One of the site's own pages in a WebView; links off the site open in the browser. */
import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { API_BASE_URL } from '../ai/client';

export default function SiteFrame({ url, style, onLoad }) {
  const stayOnSite = useCallback((request) => {
    if (request.url.startsWith(API_BASE_URL) || request.url === 'about:blank') return true;
    if (/^https?:/i.test(request.url)) { Linking.openURL(request.url).catch(() => {}); return false; }
    return false;
  }, []);
  return (
    <WebView source={{ uri: url }} onShouldStartLoadWithRequest={stayOnSite} onLoadEnd={onLoad} javaScriptEnabled domStorageEnabled
      sharedCookiesEnabled setSupportMultipleWindows={false} style={[{ flex: 1, backgroundColor: 'transparent' }, style]} />
  );
}
