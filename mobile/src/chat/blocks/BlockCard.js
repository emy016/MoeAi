/** One interactive block in a MoeAI reply: header, live sandboxed page, full-screen view. */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownTrayIcon, ArrowsPointingOutIcon, ChartBarIcon, ClipboardDocumentIcon, CodeBracketIcon, CubeTransparentIcon,
  FilmIcon, ListBulletIcon, PlayIcon, QuestionMarkCircleIcon, ShareIcon, SparklesIcon, StopIcon, WrenchScrewdriverIcon, XMarkIcon,
} from 'react-native-heroicons/outline';
import { usePreferences } from '../../context/AppPreferences';
import { Radius } from '../../constants/layout';
import SandboxFrame from './SandboxFrame';
import { blockDocument, themeFrom } from './document';
import { RUNNABLE } from './segments';

const KIND_META = {
  visualizer: { icon: SparklesIcon, label: 'blockVisualizer', height: 380, max: 900 },
  chart: { icon: ChartBarIcon, label: 'blockChart', height: 300, max: 560 },
  mermaid: { icon: ShareIcon, label: 'blockDiagram', height: 200, max: 900 },
  steps: { icon: ListBulletIcon, label: 'blockSteps', height: 200, max: 900 },
  quiz: { icon: QuestionMarkCircleIcon, label: 'blockQuiz', height: 220, max: 700 },
  scene3d: { icon: CubeTransparentIcon, label: 'block3d', height: 362, max: 362 },
  animation: { icon: FilmIcon, label: 'blockAnimation', height: 360, max: 700 },
  code: { icon: CodeBracketIcon, label: 'blockCode', height: 120, max: 560 },
};

let frameCounter = 0;
const nextFrameId = () => `moeai-frame-${Date.now().toString(36)}-${++frameCounter}`;

function HeaderButton({ icon: Icon, label, onPress, color, tint, showLabel = false }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { backgroundColor: pressed ? tint : 'transparent' }]}>
      <Icon size={16} color={color} />
      {showLabel ? <Text style={[styles.actionText, { color }]} numberOfLines={1}>{label}</Text> : null}
    </Pressable>
  );
}

function downloadHtml(html, name) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default React.memo(function BlockCard({ block, onFix }) {
  const { colors, effectiveTheme, t, type } = usePreferences();
  const insets = useSafeAreaInsets();
  const meta = KIND_META[block.kind] || KIND_META.code;
  const frame = useRef(null);
  const frameId = useMemo(nextFrameId, []);
  const fullId = useMemo(nextFrameId, []);
  const theme = useMemo(() => themeFrom(colors, effectiveTheme !== 'light'), [colors, effectiveTheme]);
  const runnable = block.kind === 'code' && RUNNABLE.has(block.language);
  const codeLines = block.kind === 'code' ? block.code.split('\n').length : 0;
  const [height, setHeight] = useState(block.kind === 'code' ? Math.min(meta.max, 26 + codeLines * 19.5) : meta.height);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const html = useMemo(() => block.closed
    ? blockDocument({ id: frameId, kind: block.kind, language: block.language, code: block.code, theme })
    : null, [block.closed, block.code, block.kind, block.language, frameId, theme]);
  const fullHtml = useMemo(() => expanded
    ? blockDocument({ id: fullId, kind: block.kind, language: block.language, code: block.code, theme, fullscreen: true })
    : null, [block.code, block.kind, block.language, expanded, fullId, theme]);

  const onMessage = useCallback((msg) => {
    if (msg.type === 'size' && msg.height > 0) setHeight(Math.min(meta.max, Math.max(48, msg.height)));
    else if (msg.type === 'error') setError(msg.message);
    else if (msg.type === 'load-error') setLoadFailed(true);
    else if (msg.type === 'run-state') setRunning(Boolean(msg.running));
  }, [meta.max]);

  const copy = useCallback(() => {
    Clipboard.setStringAsync(block.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [block.code]);

  const fix = useCallback(() => {
    const what = t(meta.label).toLowerCase();
    onFix?.(t('blockFixPrompt', { what, error: error || '' }));
  }, [error, meta.label, onFix, t]);

  const muted = colors.textMuted;
  const title = block.kind === 'code' ? (block.language === 'text' ? t('blockCode') : block.language) : t(meta.label);
  const Icon = meta.icon;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Icon size={16} color={colors.accent} />
          <Text style={[{ color: colors.textPrimary }, type(12, 'bold', 16)]} numberOfLines={1}>{title}</Text>
        </View>
        {block.closed && (
          <View style={styles.actions}>
            {error && !loadFailed && onFix ? <HeaderButton icon={WrenchScrewdriverIcon} label={t('blockFix')} onPress={fix} color={colors.danger} tint={colors.cardButton} showLabel /> : null}
            {runnable ? (
              <HeaderButton icon={running ? StopIcon : PlayIcon} label={running ? t('blockStop') : t('blockRun')}
                onPress={() => frame.current?.send({ type: running ? 'stop' : 'run' })} color={colors.accent} tint={colors.cardButton} showLabel />
            ) : null}
            {block.kind !== 'code' && block.kind !== 'steps' && block.kind !== 'quiz' ? (
              <HeaderButton icon={ArrowsPointingOutIcon} label={t('blockExpand')} onPress={() => setExpanded(true)} color={muted} tint={colors.cardButton} />
            ) : null}
            {block.kind === 'visualizer' && Platform.OS === 'web' ? (
              <HeaderButton icon={ArrowDownTrayIcon} label={t('blockDownload')} onPress={() => downloadHtml(html, 'moeai-visualizer.html')} color={muted} tint={colors.cardButton} />
            ) : null}
            <HeaderButton icon={ClipboardDocumentIcon} label={copied ? t('copied') : t('blockCopy')} onPress={copy} color={copied ? colors.accent : muted} tint={colors.cardButton} />
          </View>
        )}
      </View>
      {block.closed ? (
        <SandboxFrame key={attempt} ref={frame} html={html} frameId={frameId} height={height} onMessage={onMessage} title={title} />
      ) : (
        <View style={[styles.building, { minHeight: Math.min(160, meta.height) }]}>
          <View style={[styles.shimmer, { backgroundColor: colors.cardButton }]} />
          <View style={[styles.shimmer, styles.shimmerShort, { backgroundColor: colors.cardButton }]} />
          <Text style={[{ color: muted }, type(11, 'semiBold', 15)]}>{t('blockBuilding', { what: t(meta.label).toLowerCase() })}</Text>
        </View>
      )}
      {loadFailed && block.closed ? (
        <View style={styles.loadFailed}>
          <Text style={[{ color: muted, flex: 1 }, type(11, 'semiBold', 15)]}>{t('blockOffline')}</Text>
          <Pressable onPress={() => { setLoadFailed(false); setError(null); setAttempt((n) => n + 1); }} hitSlop={8} accessibilityRole="button">
            <Text style={[{ color: colors.accent }, type(11, 'bold', 15)]}>{t('tryAgain')}</Text>
          </Pressable>
        </View>
      ) : null}
      {error && !loadFailed && block.closed ? (
        <Text style={[styles.errorText, { color: colors.danger }, type(11, 'semiBold', 15)]} numberOfLines={2}>{error}</Text>
      ) : null}
      {expanded && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
          <View style={[styles.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <View style={[styles.fullHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.titleRow}><Icon size={18} color={colors.accent} /><Text style={[{ color: colors.textPrimary }, type(14, 'bold', 18)]}>{title}</Text></View>
              <Pressable onPress={() => setExpanded(false)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('close')}
                style={[styles.close, { backgroundColor: colors.cardButton }]}><XMarkIcon size={20} color={colors.textPrimary} /></Pressable>
            </View>
            <View style={styles.fullBody}>
              <SandboxFrame html={fullHtml} frameId={fullId} height="100%" onMessage={() => {}} title={title} style={{ flex: 1 }} />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { width: '100%', borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 999 },
  actionText: { fontSize: 11, fontWeight: '700' },
  building: { padding: 14, gap: 10, justifyContent: 'center' },
  shimmer: { height: 12, borderRadius: 6, width: '85%' },
  shimmerShort: { width: '55%' },
  errorText: { paddingHorizontal: 12, paddingBottom: 8 },
  loadFailed: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 10 },
  full: { flex: 1 },
  fullHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  fullBody: { flex: 1 },
});
