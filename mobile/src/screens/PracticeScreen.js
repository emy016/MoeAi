/**
 * PracticeScreen.js — the Ranked tab.
 * ---------------------------------------------------------------------
 * EduMoe's Ranked Arena, exactly as it is on the site (public/ranked.html),
 * filling the tab edge to edge. `?embed=1` tells the page it lives inside the
 * app: it drops its own back link and keeps its sections scrollable at phone
 * width. It runs on the same origin, so live matches, Elo and the leaderboard
 * use the student's own session.
 *
 * Mounted the first time the tab is opened, never before: the arena opens a
 * realtime socket, and a student who never plays should not pay for one.
 * ---------------------------------------------------------------------
 */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SiteFrame from '../components/SiteFrame';
import { API_BASE_URL } from '../ai/client';
import { TabBar } from '../constants/layout';
import { usePreferences } from '../context/AppPreferences';

const RANKED_URL = `${API_BASE_URL}/ranked?embed=1`;

export default function PracticeScreen({ active }) {
  const { colors } = usePreferences();
  const insets = useSafeAreaInsets();
  const [opened, setOpened] = useState(Boolean(active));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { if (active) setOpened(true); }, [active]);
  // On the web the tab bar floats over the page; stop the arena above it so nothing sits underneath.
  const bottom = Platform.OS === 'web' ? TabBar.HEIGHT + TabBar.PILL_MARGIN_BOTTOM + insets.bottom : 0;
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingBottom: bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      {opened ? <SiteFrame url={RANKED_URL} title="EduMoe Ranked Arena" onLoad={() => setLoaded(true)} /> : null}
      {!loaded ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}><ActivityIndicator color={colors.accent} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
